/**
 * Kaya CRM — قالب‌های شروع صنایع (داده، نه کد)
 * @file    backend/lib/industryTemplates.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 *
 * فایل‌های backend/data/industry-templates/*.json را می‌خواند و روی موتور عمومی اعمال می‌کند:
 * ماژول‌ها + فیلدها، فیلدهای مشتری/نوبت، خدمات قابل رزرو، واژگان و بخش‌های مخفی.
 * اعمال قالب idempotent است: چیزهایی که قبلاً با همان کلید هستند دوباره ساخته نمی‌شوند.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, '..', 'data', 'industry-templates');
const ORDER = ['exchange', 'beauty_clinic', 'hospital', 'tourism', 'health_tourism', 'retail'];

let cache = null;

function loadTemplates() {
    if (cache) return cache;
    const out = new Map();
    let files = [];
    try {
        files = fs.readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith('.json'));
    } catch (_) {
        files = [];
    }
    for (const f of files) {
        try {
            const raw = JSON.parse(fs.readFileSync(path.join(TEMPLATES_DIR, f), 'utf8'));
            if (raw && raw.key) out.set(String(raw.key), raw);
        } catch (e) {
            // فایل خراب — نادیده گرفته می‌شود تا سرور بالا بیاید
            // eslint-disable-next-line no-console
            console.warn('[industryTemplates] invalid template file', f, e.message);
        }
    }
    cache = out;
    return out;
}

function listTemplates() {
    const all = loadTemplates();
    const keys = [...ORDER.filter((k) => all.has(k)), ...[...all.keys()].filter((k) => !ORDER.includes(k))];
    return keys.map((k) => summarize(all.get(k)));
}

function getTemplate(key) {
    return loadTemplates().get(String(key || '').trim().toLowerCase()) || null;
}

function summarize(t) {
    return {
        key: t.key,
        labels: t.labels || {},
        description: t.description || {},
        icon: t.icon || 'grid',
        booking: !!(t.booking && t.booking.enabled),
        counts: {
            objects: Array.isArray(t.objects) ? t.objects.length : 0,
            customerFields: Array.isArray(t.customerFields) ? t.customerFields.length : 0,
            appointmentFields: Array.isArray(t.appointmentFields) ? t.appointmentFields.length : 0,
            bookableServices: Array.isArray(t.bookableServices) ? t.bookableServices.length : 0,
        },
        objects: (t.objects || []).map((o) => ({ key: o.key, labels: o.labels, icon: o.icon, color: o.color })),
        hiddenSections: t.hiddenSections || [],
    };
}

/**
 * اعمال قالب برای سازمان جاری (tenant context باید فعال باشد).
 * @param {string} key
 * @param {object} deps { models, moduleBuilder, getPanelSettingsKey }
 * @returns {Promise<object>} خلاصهٔ ساخته‌شده‌ها
 */
async function applyTemplate(key, deps) {
    const tpl = getTemplate(key);
    if (!tpl) {
        const err = new Error('قالب صنعت یافت نشد');
        err.status = 404;
        err.expose = true;
        throw err;
    }
    const { models, moduleBuilder, getPanelSettingsKey } = deps;
    const { PanelSetting, BookableService, sequelize } = models;
    const result = { key: tpl.key, objects: 0, fields: 0, customerFields: 0, appointmentFields: 0, bookableServices: 0 };

    await sequelize.transaction(async (transaction) => {
        for (const o of tpl.objects || []) {
            const r = await moduleBuilder.createObjectWithFields(o, { templateKey: tpl.key, transaction, skipIfExists: true });
            if (r.created) {
                result.objects += 1;
                result.fields += Array.isArray(o.fields) ? o.fields.length : 0;
            }
        }
        for (const f of tpl.customerFields || []) {
            const r = await moduleBuilder.createField({ ...f, entity: 'customer' }, { templateKey: tpl.key, transaction, skipIfExists: true });
            if (r.created) result.customerFields += 1;
        }
        for (const f of tpl.appointmentFields || []) {
            const r = await moduleBuilder.createField({ ...f, entity: 'appointment' }, { templateKey: tpl.key, transaction, skipIfExists: true });
            if (r.created) result.appointmentFields += 1;
        }
        for (let i = 0; i < (tpl.bookableServices || []).length; i++) {
            const s = tpl.bookableServices[i];
            const name = String(s.name || '').trim().slice(0, 120);
            if (!name) continue;
            const exists = await BookableService.findOne({ where: { name }, transaction });
            if (exists) continue;
            await BookableService.create({
                name,
                labels: s.labels || null,
                durationMin: Number(s.durationMin) > 0 ? Number(s.durationMin) : 30,
                bufferMin: Number(s.bufferMin) >= 0 ? Number(s.bufferMin) : 0,
                price: s.price != null ? s.price : null,
                currency: s.currency || null,
                color: s.color || null,
                sortOrder: i,
                templateKey: tpl.key,
            }, { transaction });
            result.bookableServices += 1;
        }

        // تنظیمات پنل: واژگان، بخش‌های مخفی، یادآوری نوبت، کلید صنعت
        const [row] = await PanelSetting.findOrCreate({ where: { id: getPanelSettingsKey() }, defaults: {}, transaction });
        const prev = row.industryKey ? getTemplate(row.industryKey) : null;

        let hidden = parseArr(row.hiddenSections);
        if (prev && Array.isArray(prev.hiddenSections)) hidden = hidden.filter((h) => !prev.hiddenSections.includes(h));
        for (const h of tpl.hiddenSections || []) if (!hidden.includes(h)) hidden.push(h);
        row.hiddenSections = hidden.length ? JSON.stringify(hidden) : null;

        const overrides = parseObj(row.labelOverrides);
        if (prev && prev.labelOverrides) for (const k of Object.keys(prev.labelOverrides)) delete overrides[k];
        Object.assign(overrides, tpl.labelOverrides || {});
        row.labelOverrides = Object.keys(overrides).length ? JSON.stringify(overrides) : null;

        if (tpl.booking && tpl.booking.enabled) {
            row.bookingReminderHours = Number(tpl.booking.reminderHours) >= 0 ? Number(tpl.booking.reminderHours) : 24;
        }
        row.industryKey = tpl.key;
        await row.save({ transaction });
        result.hiddenSections = hidden;
        result.labelOverrides = overrides;
    });
    return result;
}

function parseArr(v) {
    if (Array.isArray(v)) return [...v];
    if (!v) return [];
    try {
        const a = JSON.parse(v);
        return Array.isArray(a) ? a : [];
    } catch (_) {
        return [];
    }
}
function parseObj(v) {
    if (v && typeof v === 'object' && !Array.isArray(v)) return { ...v };
    if (!v) return {};
    try {
        const o = JSON.parse(v);
        return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
    } catch (_) {
        return {};
    }
}

/** فقط برای تست: پاک‌کردن کش */
function _resetCache() {
    cache = null;
}

module.exports = { listTemplates, getTemplate, applyTemplate, summarize, _resetCache, TEMPLATES_DIR };

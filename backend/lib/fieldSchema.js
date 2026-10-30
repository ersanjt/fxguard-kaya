/**
 * Kaya CRM — موتور عمومی: اعتبارسنجی/نرمال‌سازی داده طبق تعریف فیلدها
 * @file    backend/lib/fieldSchema.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 *
 * بدون DB — روی آرایهٔ FieldDefinition (plain) کار می‌کند تا در یونیت‌تست قابل استفاده باشد.
 */
'use strict';

const { FIELD_TYPES, FIELD_ENTITIES } = require('../models/FieldDefinition');

const KEY_RE = /^[a-z][a-z0-9_]{0,47}$/;
const LANGS = ['fa', 'en', 'tr'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/[^\s]+$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidKey(key) {
    return KEY_RE.test(String(key || ''));
}

/** { fa, en, tr } را تمیز می‌کند؛ حداقل یکی باید پر باشد */
function normalizeLabels(input, fallback) {
    const out = {};
    if (typeof input === 'string') {
        const s = input.trim();
        if (s) out.fa = s;
    } else if (input && typeof input === 'object') {
        for (const l of LANGS) {
            const v = input[l];
            if (v != null && String(v).trim()) out[l] = String(v).trim().slice(0, 120);
        }
    }
    if (!Object.keys(out).length && fallback) out.fa = String(fallback);
    return out;
}

function hasAnyLabel(labels) {
    return !!(labels && LANGS.some((l) => labels[l]));
}

function pickLabel(labels, lang) {
    if (!labels || typeof labels !== 'object') return '';
    return labels[lang] || labels.fa || labels.en || labels.tr || '';
}

/** گزینه‌های select/multiselect */
function normalizeOptions(input) {
    if (!Array.isArray(input)) return [];
    const seen = new Set();
    const out = [];
    for (const raw of input) {
        if (raw == null) continue;
        const value = typeof raw === 'object' ? String(raw.value ?? '').trim() : String(raw).trim();
        if (!value || seen.has(value) || value.length > 64) continue;
        seen.add(value);
        const labels = normalizeLabels(typeof raw === 'object' ? raw.labels ?? raw.label : null, value);
        const item = { value, labels };
        if (typeof raw === 'object' && raw.color) item.color = String(raw.color).slice(0, 20);
        out.push(item);
    }
    return out;
}

function normalizeStatuses(input) {
    if (!Array.isArray(input)) return null;
    const seen = new Set();
    const out = [];
    for (const raw of input) {
        if (!raw || typeof raw !== 'object') continue;
        const key = String(raw.key || '').trim().toLowerCase();
        if (!KEY_RE.test(key) || seen.has(key)) continue;
        seen.add(key);
        out.push({
            key,
            labels: normalizeLabels(raw.labels ?? raw.label, key),
            color: raw.color ? String(raw.color).slice(0, 20) : null,
            isFinal: !!raw.isFinal,
        });
    }
    return out.length ? out : null;
}

/**
 * تعریف فیلد ورودی (از API یا قالب) را تمیز می‌کند.
 * @returns {{ok:true, value:object}|{ok:false, error:string}}
 */
function normalizeFieldDefinition(input, { entity } = {}) {
    if (!input || typeof input !== 'object') return { ok: false, error: 'تعریف فیلد نامعتبر است' };
    const key = String(input.key || '').trim().toLowerCase();
    if (!isValidKey(key)) return { ok: false, error: 'کلید فیلد باید با حرف انگلیسی شروع شود و فقط a-z 0-9 _ باشد' };
    const type = String(input.type || 'text').trim();
    if (!FIELD_TYPES.includes(type)) return { ok: false, error: 'نوع فیلد نامعتبر است: ' + type };
    const ent = entity || input.entity;
    if (!FIELD_ENTITIES.includes(ent)) return { ok: false, error: 'entity فیلد نامعتبر است' };
    const labels = normalizeLabels(input.labels ?? input.label, null);
    if (!hasAnyLabel(labels)) return { ok: false, error: 'برچسب فیلد الزامی است' };

    const value = {
        entity: ent,
        key,
        type,
        labels,
        required: !!input.required,
        showInList: input.showInList === undefined ? true : !!input.showInList,
        searchable: !!input.searchable,
        isTitle: !!input.isTitle,
        sortOrder: Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : 0,
        isActive: input.isActive === undefined ? true : !!input.isActive,
        options: null,
        defaultValue: input.defaultValue === undefined ? null : input.defaultValue,
        placeholder: input.placeholder ? normalizeLabels(input.placeholder) : null,
        helpText: input.helpText ? normalizeLabels(input.helpText) : null,
        validation: null,
    };
    if (type === 'select' || type === 'multiselect') {
        value.options = normalizeOptions(input.options);
        if (!value.options.length) return { ok: false, error: 'فیلد انتخابی حداقل یک گزینه لازم دارد' };
    }
    if (input.validation && typeof input.validation === 'object') {
        const v = {};
        for (const k of ['min', 'max', 'minLength', 'maxLength']) {
            if (input.validation[k] !== undefined && input.validation[k] !== null && input.validation[k] !== '') {
                const n = Number(input.validation[k]);
                if (Number.isFinite(n)) v[k] = n;
            }
        }
        if (input.validation.pattern) {
            const p = String(input.validation.pattern).slice(0, 200);
            try {
                new RegExp(p); // eslint-disable-line no-new
                v.pattern = p;
            } catch (_) {
                return { ok: false, error: 'الگوی اعتبارسنجی (pattern) نامعتبر است' };
            }
        }
        if (input.validation.currency) v.currency = String(input.validation.currency).slice(0, 8).toUpperCase();
        value.validation = Object.keys(v).length ? v : null;
    }
    return { ok: true, value };
}

function fieldLabel(field, lang = 'fa') {
    return pickLabel(field.labels, lang) || field.key;
}

/**
 * یک مقدار را طبق نوع فیلد نرمال می‌کند.
 * @returns {{ok:true, value:any}|{ok:false, error:string}}
 */
function coerceValue(field, raw, lang = 'fa') {
    const label = fieldLabel(field, lang);
    const v = field.validation || {};
    const empty = raw === undefined || raw === null || raw === '' || (Array.isArray(raw) && raw.length === 0);
    if (empty) {
        if (field.required) return { ok: false, error: `«${label}» الزامی است` };
        return { ok: true, value: null };
    }
    switch (field.type) {
        case 'text':
        case 'textarea':
        case 'phone': {
            const s = String(raw).trim().slice(0, field.type === 'textarea' ? 10000 : 500);
            if (v.minLength != null && s.length < v.minLength) return { ok: false, error: `«${label}» حداقل ${v.minLength} کاراکتر` };
            if (v.maxLength != null && s.length > v.maxLength) return { ok: false, error: `«${label}» حداکثر ${v.maxLength} کاراکتر` };
            if (v.pattern && !new RegExp(v.pattern).test(s)) return { ok: false, error: `«${label}» با الگوی مجاز نمی‌خواند` };
            if (field.type === 'phone' && !/^[+\d][\d\s\-()]{4,24}$/.test(s)) return { ok: false, error: `«${label}» شمارهٔ معتبر نیست` };
            return { ok: true, value: s };
        }
        case 'email': {
            const s = String(raw).trim().toLowerCase().slice(0, 254);
            if (!EMAIL_RE.test(s)) return { ok: false, error: `«${label}» ایمیل معتبر نیست` };
            return { ok: true, value: s };
        }
        case 'url': {
            const s = String(raw).trim().slice(0, 2000);
            if (!URL_RE.test(s)) return { ok: false, error: `«${label}» باید با http(s):// شروع شود` };
            return { ok: true, value: s };
        }
        case 'number':
        case 'money': {
            const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/[,\s]/g, ''));
            if (!Number.isFinite(n)) return { ok: false, error: `«${label}» باید عدد باشد` };
            if (v.min != null && n < v.min) return { ok: false, error: `«${label}» حداقل ${v.min}` };
            if (v.max != null && n > v.max) return { ok: false, error: `«${label}» حداکثر ${v.max}` };
            return { ok: true, value: n };
        }
        case 'date': {
            const s = String(raw).trim().slice(0, 10);
            if (!DATE_RE.test(s) || Number.isNaN(Date.parse(s))) return { ok: false, error: `«${label}» تاریخ معتبر نیست (YYYY-MM-DD)` };
            return { ok: true, value: s };
        }
        case 'datetime': {
            const d = new Date(raw);
            if (Number.isNaN(d.getTime())) return { ok: false, error: `«${label}» زمان معتبر نیست` };
            return { ok: true, value: d.toISOString() };
        }
        case 'boolean': {
            if (typeof raw === 'boolean') return { ok: true, value: raw };
            const s = String(raw).trim().toLowerCase();
            if (['true', '1', 'yes', 'on'].includes(s)) return { ok: true, value: true };
            if (['false', '0', 'no', 'off'].includes(s)) return { ok: true, value: false };
            return { ok: false, error: `«${label}» باید بله/خیر باشد` };
        }
        case 'select': {
            const s = String(raw).trim();
            const allowed = (field.options || []).map((o) => o.value);
            if (!allowed.includes(s)) return { ok: false, error: `«${label}» گزینهٔ نامعتبر` };
            return { ok: true, value: s };
        }
        case 'multiselect': {
            const arr = Array.isArray(raw) ? raw : String(raw).split(',');
            const allowed = new Set((field.options || []).map((o) => o.value));
            const out = [];
            for (const item of arr) {
                const s = String(item).trim();
                if (!s) continue;
                if (!allowed.has(s)) return { ok: false, error: `«${label}» گزینهٔ نامعتبر: ${s}` };
                if (!out.includes(s)) out.push(s);
            }
            if (!out.length && field.required) return { ok: false, error: `«${label}» الزامی است` };
            return { ok: true, value: out };
        }
        case 'user':
        case 'customer': {
            const s = String(raw).trim();
            if (!UUID_RE.test(s)) return { ok: false, error: `«${label}» شناسهٔ معتبر نیست` };
            return { ok: true, value: s };
        }
        default:
            return { ok: false, error: `نوع فیلد ناشناخته: ${field.type}` };
    }
}

/**
 * کل بدنهٔ داده را طبق فیلدها اعتبارسنجی می‌کند.
 * @param {Array} fields   تعاریف فعال
 * @param {object} data    ورودی کاربر
 * @param {object} [opts]
 * @param {boolean} [opts.partial]  فقط کلیدهای موجود در data بررسی شوند (PATCH)
 * @param {object} [opts.existing]  دادهٔ فعلی برای ادغام در حالت partial
 * @param {string} [opts.lang]
 * @returns {{ok:true, value:object, title:string}|{ok:false, errors:string[]}}
 */
function validateData(fields, data, opts = {}) {
    const src = data && typeof data === 'object' ? data : {};
    const partial = !!opts.partial;
    const merged = { ...(opts.existing || {}) };
    const errors = [];
    const active = (fields || []).filter((f) => f.isActive !== false);
    for (const f of active) {
        const present = Object.prototype.hasOwnProperty.call(src, f.key);
        if (partial && !present) continue;
        const raw = present ? src[f.key] : f.defaultValue !== undefined && f.defaultValue !== null ? f.defaultValue : undefined;
        const r = coerceValue(f, raw, opts.lang);
        if (!r.ok) {
            errors.push(r.error);
            continue;
        }
        merged[f.key] = r.value;
    }
    // کلیدهای ناشناخته دور ریخته می‌شوند (فقط فیلدهای تعریف‌شده ذخیره می‌شوند)
    const known = new Set(active.map((f) => f.key));
    for (const k of Object.keys(merged)) if (!known.has(k)) delete merged[k];
    if (errors.length) return { ok: false, errors };
    const titleField = active.find((f) => f.isTitle) || active.find((f) => f.type === 'text');
    const title = titleField && merged[titleField.key] != null ? String(merged[titleField.key]).slice(0, 200) : '';
    return { ok: true, value: merged, title };
}

/** متن جست‌وجو از عنوان + فیلدهای searchable */
function buildSearchText(fields, data, title) {
    const parts = [title || ''];
    for (const f of fields || []) {
        if (!f.searchable) continue;
        const v = data ? data[f.key] : null;
        if (v == null) continue;
        parts.push(Array.isArray(v) ? v.join(' ') : String(v));
    }
    return parts.join(' ').toLowerCase().slice(0, 4000);
}

module.exports = {
    KEY_RE,
    LANGS,
    isValidKey,
    normalizeLabels,
    hasAnyLabel,
    pickLabel,
    normalizeOptions,
    normalizeStatuses,
    normalizeFieldDefinition,
    coerceValue,
    validateData,
    buildSearchText,
    fieldLabel,
};

/**
 * Kaya CRM — فیلدهای سفارشی مشتری با schema (FieldDefinition entity=customer)
 * @file    backend/lib/customerFields.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 *
 * Customer.customFields همچنان JSON آزاد است (سازگاری با دادهٔ قدیمی و import)؛
 * اما کلیدهایی که در فرم‌ساز تعریف شده‌اند طبق نوعشان اعتبارسنجی/نرمال می‌شوند
 * و کلیدهای داخلی سیستم (softDeleted*) از سمت کلاینت قابل تغییر نیستند.
 */
'use strict';

const { validateData } = require('./fieldSchema');

/** کلیدهایی که فقط سرور می‌نویسد */
const PROTECTED_KEYS = new Set(['softDeletedAt', 'softDeletedBy']);

/**
 * @param {Array} fields     تعاریف فعال (entity=customer) — plain
 * @param {object|null} existing   customFields فعلی
 * @param {object} incoming  customFields ارسالی کلاینت
 * @param {object} [opts]    { partial: true برای PUT }
 * @returns {{ok:true, value:object}|{ok:false, errors:string[]}}
 */
function mergeCustomerCustomFields(fields, existing, incoming, opts = {}) {
    const base = existing && typeof existing === 'object' ? { ...existing } : {};
    const src = incoming && typeof incoming === 'object' && !Array.isArray(incoming) ? { ...incoming } : {};
    for (const k of PROTECTED_KEYS) delete src[k];

    const defined = (fields || []).filter((f) => f.isActive !== false);
    const definedKeys = new Set(defined.map((f) => f.key));

    // کلیدهای تعریف‌شده → اعتبارسنجی؛ در حالت partial فقط کلیدهای ارسالی
    const schemaInput = {};
    for (const k of Object.keys(src)) if (definedKeys.has(k)) schemaInput[k] = src[k];
    const existingDefined = {};
    for (const k of Object.keys(base)) if (definedKeys.has(k)) existingDefined[k] = base[k];
    const v = validateData(defined, schemaInput, { partial: !!opts.partial, existing: existingDefined });
    if (!v.ok) return { ok: false, errors: v.errors };

    // کلیدهای آزاد (خارج از schema) — همان رفتار قبلی: جایگزینی مقدار
    const out = opts.partial ? { ...base } : {};
    if (!opts.partial) {
        for (const k of PROTECTED_KEYS) if (base[k] !== undefined) out[k] = base[k];
    }
    for (const k of Object.keys(src)) {
        if (definedKeys.has(k)) continue;
        const val = src[k];
        if (val === null || val === undefined || val === '') {
            if (opts.partial) delete out[k];
            continue;
        }
        out[k] = typeof val === 'string' ? val.slice(0, 2000) : val;
    }
    for (const k of Object.keys(v.value)) {
        if (v.value[k] === null || v.value[k] === undefined) delete out[k];
        else out[k] = v.value[k];
    }
    return { ok: true, value: out };
}

/** بارگذاری تعاریف فعال مشتری از DB (tenant-scoped) */
async function loadCustomerFields(models) {
    const { FieldDefinition } = models;
    if (!FieldDefinition) return [];
    const rows = await FieldDefinition.findAll({
        where: { entity: 'customer', objectId: null, isActive: true },
        order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
    });
    return rows.map((r) => r.get({ plain: true }));
}

module.exports = { mergeCustomerCustomFields, loadCustomerFields, PROTECTED_KEYS };

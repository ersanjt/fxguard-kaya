/**
 * Kaya CRM — موتور عمومی: سرویس ماژول‌ساز (شیء + فیلد)
 * @file    backend/services/moduleBuilder.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 *
 * توسط routes/customObjects.js، routes/fieldDefinitions.js و lib/industryTemplates استفاده می‌شود.
 * همهٔ کوئری‌ها tenant-scoped هستند (lib/tenantScope).
 */
'use strict';

const { CustomObject, FieldDefinition, CustomRecord, sequelize } = require('../models');
const {
    isValidKey,
    normalizeLabels,
    hasAnyLabel,
    normalizeStatuses,
    normalizeFieldDefinition,
} = require('../lib/fieldSchema');
const { isMainAdmin } = require('../lib/permissions');

const ICON_RE = /^[a-z0-9-]{1,32}$/;
const COLOR_RE = /^#[0-9a-fA-F]{3,8}$|^[a-z-]{1,20}$/;
const ROLES = ['owner', 'admin', 'manager', 'supervisor', 'agent'];
const MAX_OBJECTS_PER_TENANT = 60;
const MAX_FIELDS_PER_ENTITY = 80;

class BuilderError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
        this.expose = true;
    }
}

/** ورودی تعریف شیء را تمیز می‌کند (برای create و update) */
function normalizeObjectInput(input, { partial = false } = {}) {
    if (!input || typeof input !== 'object') throw new BuilderError('بدنهٔ درخواست نامعتبر است');
    const out = {};
    if (!partial || input.key !== undefined) {
        const key = String(input.key || '').trim().toLowerCase();
        if (!isValidKey(key)) throw new BuilderError('کلید ماژول باید با حرف انگلیسی شروع شود و فقط a-z 0-9 _ باشد');
        out.key = key;
    }
    if (!partial || input.labels !== undefined || input.label !== undefined) {
        const labels = normalizeLabels(input.labels ?? input.label, null);
        if (!hasAnyLabel(labels)) throw new BuilderError('نام ماژول الزامی است');
        out.labels = labels;
    }
    if (input.singularLabels !== undefined || input.singularLabel !== undefined) {
        const s = normalizeLabels(input.singularLabels ?? input.singularLabel, null);
        out.singularLabels = hasAnyLabel(s) ? s : null;
    }
    if (input.icon !== undefined) {
        const icon = String(input.icon || '').trim().toLowerCase();
        out.icon = icon && ICON_RE.test(icon) ? icon : 'grid';
    }
    if (input.color !== undefined) {
        const c = String(input.color || '').trim();
        out.color = c && COLOR_RE.test(c) ? c : null;
    }
    if (input.linkToCustomer !== undefined) out.linkToCustomer = !!input.linkToCustomer;
    if (input.hasAssignee !== undefined) out.hasAssignee = !!input.hasAssignee;
    if (input.showInMenu !== undefined) out.showInMenu = !!input.showInMenu;
    if (input.isActive !== undefined) out.isActive = !!input.isActive;
    if (input.sortOrder !== undefined) out.sortOrder = Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : 0;
    if (input.statuses !== undefined) out.statuses = normalizeStatuses(input.statuses);
    if (input.allowedRoles !== undefined) {
        if (input.allowedRoles === null || input.allowedRoles === '') out.allowedRoles = null;
        else if (Array.isArray(input.allowedRoles)) {
            const roles = input.allowedRoles.map((r) => String(r)).filter((r) => ROLES.includes(r));
            out.allowedRoles = roles.length ? roles : null;
        }
    }
    return out;
}

/**
 * ساخت شیء به‌همراه فیلدها (یک تراکنش).
 * @param {object} payload   { key, labels, ..., fields?: [] }
 * @param {object} [opts]    { templateKey, transaction, skipIfExists }
 */
async function createObjectWithFields(payload, opts = {}) {
    const data = normalizeObjectInput(payload);
    const fieldsIn = Array.isArray(payload.fields) ? payload.fields : [];
    const fieldRows = [];
    const seen = new Set();
    for (let i = 0; i < fieldsIn.length; i++) {
        const r = normalizeFieldDefinition({ ...fieldsIn[i], entity: 'record' }, { entity: 'record' });
        if (!r.ok) throw new BuilderError(`فیلد #${i + 1}: ${r.error}`);
        if (seen.has(r.value.key)) throw new BuilderError(`کلید فیلد تکراری: ${r.value.key}`);
        seen.add(r.value.key);
        if (fieldsIn[i].sortOrder === undefined) r.value.sortOrder = i;
        fieldRows.push(r.value);
    }
    if (fieldRows.length > MAX_FIELDS_PER_ENTITY) throw new BuilderError(`حداکثر ${MAX_FIELDS_PER_ENTITY} فیلد برای هر ماژول`);

    const run = async (transaction) => {
        const existing = await CustomObject.findOne({ where: { key: data.key }, transaction });
        if (existing) {
            if (opts.skipIfExists) return { object: existing, created: false };
            throw new BuilderError('ماژولی با این کلید قبلاً وجود دارد', 409);
        }
        const count = await CustomObject.count({ transaction });
        if (count >= MAX_OBJECTS_PER_TENANT) throw new BuilderError(`حداکثر ${MAX_OBJECTS_PER_TENANT} ماژول برای هر سازمان`);
        const object = await CustomObject.create(
            { ...data, templateKey: opts.templateKey || null },
            { transaction }
        );
        for (const f of fieldRows) {
            await FieldDefinition.create(
                { ...f, objectId: object.id, templateKey: opts.templateKey || null },
                { transaction }
            );
        }
        return { object, created: true };
    };
    if (opts.transaction) return run(opts.transaction);
    return sequelize.transaction(run);
}

/**
 * ایجاد فیلد برای هر entity؛ اگر همان کلید وجود دارد و skipIfExists → برگرداندن موجود.
 */
async function createField(payload, opts = {}) {
    const entity = payload.entity;
    const r = normalizeFieldDefinition(payload, { entity });
    if (!r.ok) throw new BuilderError(r.error);
    const objectId = entity === 'record' ? payload.objectId : null;
    if (entity === 'record') {
        if (!objectId) throw new BuilderError('objectId برای فیلد ماژول الزامی است');
        const obj = await CustomObject.findByPk(objectId, { transaction: opts.transaction });
        if (!obj) throw new BuilderError('ماژول یافت نشد', 404);
    }
    const where = { entity, objectId: objectId || null, key: r.value.key };
    const existing = await FieldDefinition.findOne({ where, transaction: opts.transaction });
    if (existing) {
        if (opts.skipIfExists) return { field: existing, created: false };
        throw new BuilderError('فیلدی با این کلید قبلاً وجود دارد', 409);
    }
    const count = await FieldDefinition.count({ where: { entity, objectId: objectId || null }, transaction: opts.transaction });
    if (count >= MAX_FIELDS_PER_ENTITY) throw new BuilderError(`حداکثر ${MAX_FIELDS_PER_ENTITY} فیلد`);
    const field = await FieldDefinition.create(
        { ...r.value, objectId: objectId || null, templateKey: opts.templateKey || null },
        { transaction: opts.transaction }
    );
    return { field, created: true };
}

/** ویرایش فیلد — کلید و entity قابل تغییر نیست (داده‌های قبلی به آن وابسته‌اند) */
async function updateField(field, input) {
    const merged = {
        ...field.get({ plain: true }),
        ...input,
        key: field.key,
        entity: field.entity,
    };
    const r = normalizeFieldDefinition(merged, { entity: field.entity });
    if (!r.ok) throw new BuilderError(r.error);
    const { entity: _e, key: _k, ...rest } = r.value; // eslint-disable-line no-unused-vars
    Object.assign(field, rest);
    await field.save();
    return field;
}

/** آیا کاربر به این شیء دسترسی دارد؟ (allowedRoles) */
function userCanSeeObject(user, object) {
    if (!user || !object) return false;
    if (isMainAdmin(user) || user.role === 'owner') return true;
    const roles = Array.isArray(object.allowedRoles) ? object.allowedRoles : null;
    if (!roles || !roles.length) return true;
    return roles.includes(user.role);
}

/** لیست فیلدهای فعال یک entity (به ترتیب) به‌صورت plain */
async function listFields(entity, objectId = null, { includeInactive = false } = {}) {
    const where = { entity, objectId: objectId || null };
    if (!includeInactive) where.isActive = true;
    const rows = await FieldDefinition.findAll({ where, order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']] });
    return rows.map((r) => r.get({ plain: true }));
}

/** حذف شیء: نرم (پیش‌فرض) یا سخت با همهٔ فیلدها/رکوردها */
async function deleteObject(object, { hard = false } = {}) {
    if (!hard) {
        object.isActive = false;
        await object.save();
        return { hard: false };
    }
    return sequelize.transaction(async (transaction) => {
        await CustomRecord.destroy({ where: { objectId: object.id }, transaction });
        await FieldDefinition.destroy({ where: { objectId: object.id }, transaction });
        await object.destroy({ transaction });
        return { hard: true };
    });
}

module.exports = {
    BuilderError,
    normalizeObjectInput,
    createObjectWithFields,
    createField,
    updateField,
    userCanSeeObject,
    listFields,
    deleteObject,
    MAX_OBJECTS_PER_TENANT,
    MAX_FIELDS_PER_ENTITY,
};

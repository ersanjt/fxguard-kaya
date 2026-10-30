/**
 * Kaya CRM — /api/objects — تعریف ماژول‌های سفارشی سازمان (ماژول‌ساز)
 * @file    backend/routes/customObjects.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 *
 * خواندن: دسترسی records. تعریف/ویرایش/حذف: manage_users (مالک/ادمین/مدیر).
 */
const express = require('express');
const router = express.Router();
const { CustomObject, FieldDefinition, CustomRecord } = require('../models');
const { isValidUUID } = require('../lib/validation');
const { canManageUsers } = require('../lib/permissions');
const builder = require('../services/moduleBuilder');

function requireBuilder(req, res) {
    if (!canManageUsers(req.user)) {
        res.status(403).json({ error: 'فقط مدیران می‌توانند ماژول تعریف یا ویرایش کنند' });
        return false;
    }
    return true;
}

function handleErr(err, res, next) {
    if (err && err.expose && err.status) return res.status(err.status).json({ error: err.message });
    if (err && err.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ error: 'کلید تکراری است' });
    return next(err);
}

function plainObject(obj, fields) {
    const o = obj.get ? obj.get({ plain: true }) : obj;
    if (fields) o.fields = fields;
    return o;
}

// لیست ماژول‌های قابل مشاهدهٔ کاربر (+ فیلدهای فعال) — برای منو و فرم‌ها
router.get('/', async (req, res, next) => {
    try {
        if (!req.canAccess('records')) return res.status(403).json({ error: 'دسترسی به ماژول‌های سازمان ندارید' });
        const all = String(req.query.all || '') === '1' && canManageUsers(req.user);
        const where = all ? {} : { isActive: true };
        const objects = await CustomObject.findAll({ where, order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']] });
        const visible = objects.filter((o) => all || builder.userCanSeeObject(req.user, o));
        const ids = visible.map((o) => o.id);
        const fields = ids.length
            ? await FieldDefinition.findAll({
                where: { entity: 'record', objectId: ids, ...(all ? {} : { isActive: true }) },
                order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
            })
            : [];
        const byObj = {};
        for (const f of fields) (byObj[f.objectId] = byObj[f.objectId] || []).push(f.get({ plain: true }));
        res.json({ data: visible.map((o) => plainObject(o, byObj[o.id] || [])) });
    } catch (err) {
        next(err);
    }
});

// ساخت ماژول (با فیلدهای اختیاری)
router.post('/', async (req, res, next) => {
    try {
        if (!requireBuilder(req, res)) return;
        const { object } = await builder.createObjectWithFields(req.body || {});
        const fields = await builder.listFields('record', object.id, { includeInactive: true });
        res.status(201).json(plainObject(object, fields));
    } catch (err) {
        handleErr(err, res, next);
    }
});

async function findObject(idOrKey) {
    if (isValidUUID(idOrKey)) return CustomObject.findByPk(idOrKey);
    return CustomObject.findOne({ where: { key: String(idOrKey || '').toLowerCase() } });
}

// یک ماژول با فیلدها (+ شمارش رکوردها)
router.get('/:idOrKey', async (req, res, next) => {
    try {
        if (!req.canAccess('records')) return res.status(403).json({ error: 'دسترسی به ماژول‌های سازمان ندارید' });
        const object = await findObject(req.params.idOrKey);
        if (!object || (!object.isActive && !canManageUsers(req.user))) return res.status(404).json({ error: 'ماژول یافت نشد' });
        if (!builder.userCanSeeObject(req.user, object)) return res.status(403).json({ error: 'دسترسی به این ماژول ندارید' });
        const fields = await builder.listFields('record', object.id, { includeInactive: canManageUsers(req.user) });
        const recordCount = await CustomRecord.count({ where: { objectId: object.id } });
        res.json({ ...plainObject(object, fields), recordCount });
    } catch (err) {
        next(err);
    }
});

// ویرایش ماژول (کلید تغییر نمی‌کند)
router.put('/:id', async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
    try {
        if (!requireBuilder(req, res)) return;
        const object = await CustomObject.findByPk(req.params.id);
        if (!object) return res.status(404).json({ error: 'ماژول یافت نشد' });
        const patch = builder.normalizeObjectInput({ ...req.body, key: undefined }, { partial: true });
        delete patch.key;
        Object.assign(object, patch);
        await object.save();
        const fields = await builder.listFields('record', object.id, { includeInactive: true });
        res.json(plainObject(object, fields));
    } catch (err) {
        handleErr(err, res, next);
    }
});

// ترتیب ماژول‌ها در منو
router.put('/reorder/all', async (req, res, next) => {
    try {
        if (!requireBuilder(req, res)) return;
        const ids = Array.isArray(req.body && req.body.ids) ? req.body.ids.filter(isValidUUID) : [];
        if (!ids.length) return res.status(400).json({ error: 'ids الزامی است' });
        const rows = await CustomObject.findAll({ where: { id: ids } });
        const byId = new Map(rows.map((r) => [r.id, r]));
        let i = 0;
        for (const id of ids) {
            const row = byId.get(id);
            if (!row) continue;
            row.sortOrder = i++;
            await row.save();
        }
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

// حذف: نرم (پیش‌فرض) / سخت با ?hard=1 (فیلدها و رکوردها هم پاک می‌شوند)
router.delete('/:id', async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
    try {
        if (!requireBuilder(req, res)) return;
        const object = await CustomObject.findByPk(req.params.id);
        if (!object) return res.status(404).json({ error: 'ماژول یافت نشد' });
        const hard = String(req.query.hard || '') === '1';
        if (hard && !['owner', 'admin'].includes(req.user.role) && !canManageUsers(req.user)) {
            return res.status(403).json({ error: 'حذف کامل فقط برای مالک/ادمین' });
        }
        const r = await builder.deleteObject(object, { hard });
        res.json({ ok: true, ...r });
    } catch (err) {
        handleErr(err, res, next);
    }
});

module.exports = router;

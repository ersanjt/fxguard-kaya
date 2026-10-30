/**
 * Kaya CRM — /api/records/:objectKey — رکوردهای ماژول‌های سفارشی
 * @file    backend/routes/records.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 *
 * داده طبق FieldDefinition (entity=record) اعتبارسنجی و فقط کلیدهای تعریف‌شده ذخیره می‌شود.
 */
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { CustomObject, CustomRecord, Customer, User, Branch } = require('../models');
const { isValidUUID, parsePagination, safeString } = require('../lib/validation');
const { canManageUsers, isMainAdmin } = require('../lib/permissions');
const { validateData, buildSearchText } = require('../lib/fieldSchema');
const builder = require('../services/moduleBuilder');

const includeList = [
    { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'], required: false },
    { model: User, as: 'assignee', attributes: ['id', 'name'], required: false },
    { model: User, as: 'creator', attributes: ['id', 'name'], required: false },
    { model: Branch, as: 'branch', attributes: ['id', 'name'], required: false },
];

async function loadObject(req, res) {
    if (!req.canAccess('records')) {
        res.status(403).json({ error: 'دسترسی به ماژول‌های سازمان ندارید' });
        return null;
    }
    const key = String(req.params.objectKey || '').toLowerCase();
    const object = await CustomObject.findOne({ where: { key, isActive: true } });
    if (!object) {
        res.status(404).json({ error: 'ماژول یافت نشد' });
        return null;
    }
    if (!builder.userCanSeeObject(req.user, object)) {
        res.status(403).json({ error: 'دسترسی به این ماژول ندارید' });
        return null;
    }
    return object;
}

function statusKeys(object) {
    return Array.isArray(object.statuses) ? object.statuses.map((s) => s.key) : [];
}

function canMutateRecord(req, record) {
    const u = req.user;
    if (isMainAdmin(u) || canManageUsers(u)) return true;
    return record.createdBy === u.id || record.assignedTo === u.id;
}

async function resolveRefs(req, res, object, body, record) {
    if (body.customerId !== undefined) {
        if (body.customerId === null || body.customerId === '') record.customerId = null;
        else {
            if (!object.linkToCustomer) return res.status(400).json({ error: 'این ماژول به مشتری وصل نمی‌شود' }), false;
            if (!isValidUUID(body.customerId)) return res.status(400).json({ error: 'شناسهٔ مشتری نامعتبر است' }), false;
            const c = await Customer.findByPk(body.customerId, { attributes: ['id'] });
            if (!c) return res.status(404).json({ error: 'مشتری یافت نشد' }), false;
            record.customerId = c.id;
        }
    }
    if (body.assignedTo !== undefined) {
        if (body.assignedTo === null || body.assignedTo === '') record.assignedTo = null;
        else {
            if (!isValidUUID(body.assignedTo)) return res.status(400).json({ error: 'شناسهٔ مسئول نامعتبر است' }), false;
            const u = await User.findByPk(body.assignedTo, { attributes: ['id'] });
            if (!u) return res.status(404).json({ error: 'کاربر یافت نشد' }), false;
            record.assignedTo = u.id;
        }
    }
    if (body.branchId !== undefined) {
        if (body.branchId === null || body.branchId === '') record.branchId = null;
        else {
            if (!isValidUUID(body.branchId)) return res.status(400).json({ error: 'شناسهٔ شعبه نامعتبر است' }), false;
            record.branchId = body.branchId;
        }
    }
    if (body.status !== undefined) {
        const keys = statusKeys(object);
        if (body.status === null || body.status === '') record.status = null;
        else if (!keys.includes(String(body.status))) return res.status(400).json({ error: 'وضعیت نامعتبر است' }), false;
        else record.status = String(body.status);
    }
    return true;
}

// همهٔ رکوردهای یک مشتری در همهٔ ماژول‌ها (پروندهٔ مشتری)
router.get('/by-customer/:customerId', async (req, res, next) => {
    try {
        if (!req.canAccess('records') || !req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی ندارید' });
        if (!isValidUUID(req.params.customerId)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const objects = (await CustomObject.findAll({ where: { isActive: true, linkToCustomer: true } }))
            .filter((o) => builder.userCanSeeObject(req.user, o));
        if (!objects.length) return res.json({ data: [] });
        const rows = await CustomRecord.findAll({
            where: { customerId: req.params.customerId, objectId: objects.map((o) => o.id) },
            order: [['createdAt', 'DESC']],
            limit: 200,
        });
        const objById = new Map(objects.map((o) => [o.id, o.get({ plain: true })]));
        res.json({
            data: rows.map((r) => {
                const p = r.get({ plain: true });
                const o = objById.get(p.objectId);
                p.object = o ? { id: o.id, key: o.key, labels: o.labels, singularLabels: o.singularLabels, icon: o.icon, color: o.color, statuses: o.statuses } : null;
                return p;
            }),
        });
    } catch (err) {
        next(err);
    }
});

// لیست رکوردهای یک ماژول
router.get('/:objectKey', async (req, res, next) => {
    try {
        const object = await loadObject(req, res);
        if (!object) return;
        const { page, limit, offset } = parsePagination(req.query.page, req.query.limit, 100);
        const where = { objectId: object.id };
        if (req.query.status) where.status = String(req.query.status);
        if (isValidUUID(req.query.customerId)) where.customerId = req.query.customerId;
        if (isValidUUID(req.query.assignedTo)) where.assignedTo = req.query.assignedTo;
        if (isValidUUID(req.query.branchId)) where.branchId = req.query.branchId;
        const q = safeString(req.query.q, 100);
        if (q) where.searchText = { [Op.like]: `%${q.toLowerCase()}%` };
        const { count, rows } = await CustomRecord.findAndCountAll({
            where,
            include: includeList,
            order: [['createdAt', 'DESC']],
            limit,
            offset,
            distinct: true,
        });
        res.json({ count, rows, page, limit });
    } catch (err) {
        next(err);
    }
});

router.get('/:objectKey/:id', async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
    try {
        const object = await loadObject(req, res);
        if (!object) return;
        const record = await CustomRecord.findOne({ where: { id: req.params.id, objectId: object.id }, include: includeList });
        if (!record) return res.status(404).json({ error: 'رکورد یافت نشد' });
        res.json(record);
    } catch (err) {
        next(err);
    }
});

router.post('/:objectKey', async (req, res, next) => {
    try {
        const object = await loadObject(req, res);
        if (!object) return;
        const body = req.body || {};
        const fields = await builder.listFields('record', object.id);
        const v = validateData(fields, body.data || {}, { lang: req.user.language });
        if (!v.ok) return res.status(400).json({ error: v.errors[0], errors: v.errors });
        const record = CustomRecord.build({
            objectId: object.id,
            createdBy: req.user.id,
            data: v.value,
            title: safeString(body.title, 200) || v.title || '',
        });
        const keys = statusKeys(object);
        record.status = keys[0] || null;
        if (!(await resolveRefs(req, res, object, body, record))) return;
        record.searchText = buildSearchText(fields, v.value, record.title);
        await record.save();
        const full = await CustomRecord.findByPk(record.id, { include: includeList });
        res.status(201).json(full);
    } catch (err) {
        next(err);
    }
});

router.put('/:objectKey/:id', async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
    try {
        const object = await loadObject(req, res);
        if (!object) return;
        const record = await CustomRecord.findOne({ where: { id: req.params.id, objectId: object.id } });
        if (!record) return res.status(404).json({ error: 'رکورد یافت نشد' });
        if (!canMutateRecord(req, record)) return res.status(403).json({ error: 'اجازهٔ ویرایش این رکورد را ندارید' });
        const body = req.body || {};
        const fields = await builder.listFields('record', object.id);
        if (body.data !== undefined) {
            const v = validateData(fields, body.data || {}, { partial: true, existing: record.data || {}, lang: req.user.language });
            if (!v.ok) return res.status(400).json({ error: v.errors[0], errors: v.errors });
            record.data = v.value;
            if (body.title === undefined && v.title) record.title = v.title;
        }
        if (body.title !== undefined) record.title = safeString(body.title, 200) || record.title;
        if (!(await resolveRefs(req, res, object, body, record))) return;
        record.searchText = buildSearchText(fields, record.data, record.title);
        await record.save();
        const full = await CustomRecord.findByPk(record.id, { include: includeList });
        res.json(full);
    } catch (err) {
        next(err);
    }
});

router.delete('/:objectKey/:id', async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
    try {
        const object = await loadObject(req, res);
        if (!object) return;
        const record = await CustomRecord.findOne({ where: { id: req.params.id, objectId: object.id } });
        if (!record) return res.status(404).json({ error: 'رکورد یافت نشد' });
        if (!canMutateRecord(req, record)) return res.status(403).json({ error: 'اجازهٔ حذف این رکورد را ندارید' });
        await record.destroy();
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

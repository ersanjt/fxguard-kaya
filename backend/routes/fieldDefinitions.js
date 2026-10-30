/**
 * Kaya CRM — /api/fields — فرم‌ساز: فیلدهای سفارشی (مشتری / ماژول / نوبت)
 * @file    backend/routes/fieldDefinitions.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 *
 * GET /api/fields?entity=customer            → فیلدهای مشتری
 * GET /api/fields?entity=record&objectId=…   → فیلدهای یک ماژول
 * GET /api/fields?entity=appointment         → فیلدهای نوبت
 */
const express = require('express');
const router = express.Router();
const { FieldDefinition } = require('../models');
const { FIELD_ENTITIES, FIELD_TYPES } = require('../models/FieldDefinition');
const { isValidUUID } = require('../lib/validation');
const { canManageUsers } = require('../lib/permissions');
const builder = require('../services/moduleBuilder');

const ENTITY_SECTION = { customer: 'customers', record: 'records', appointment: 'appointments' };

function entityOf(req, source) {
    const e = String((source || {}).entity || '').trim();
    return FIELD_ENTITIES.includes(e) ? e : null;
}

function handleErr(err, res, next) {
    if (err && err.expose && err.status) return res.status(err.status).json({ error: err.message });
    if (err && err.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ error: 'کلید فیلد تکراری است' });
    return next(err);
}

// انواع فیلد و entityها — برای UI فرم‌ساز
router.get('/meta', (req, res) => {
    res.json({ types: FIELD_TYPES, entities: FIELD_ENTITIES });
});

router.get('/', async (req, res, next) => {
    try {
        const entity = entityOf(req, req.query);
        if (!entity) return res.status(400).json({ error: 'entity نامعتبر است' });
        if (!req.canAccess(ENTITY_SECTION[entity])) return res.status(403).json({ error: 'دسترسی ندارید' });
        let objectId = null;
        if (entity === 'record') {
            if (!isValidUUID(req.query.objectId)) return res.status(400).json({ error: 'objectId الزامی است' });
            objectId = req.query.objectId;
        }
        const includeInactive = String(req.query.all || '') === '1' && canManageUsers(req.user);
        const data = await builder.listFields(entity, objectId, { includeInactive });
        res.json({ data });
    } catch (err) {
        next(err);
    }
});

router.post('/', async (req, res, next) => {
    try {
        if (!canManageUsers(req.user)) return res.status(403).json({ error: 'فقط مدیران می‌توانند فیلد تعریف کنند' });
        const entity = entityOf(req, req.body);
        if (!entity) return res.status(400).json({ error: 'entity نامعتبر است' });
        if (entity === 'record' && !isValidUUID(req.body.objectId)) return res.status(400).json({ error: 'objectId الزامی است' });
        const { field } = await builder.createField({ ...req.body, entity });
        res.status(201).json(field);
    } catch (err) {
        handleErr(err, res, next);
    }
});

router.put('/reorder', async (req, res, next) => {
    try {
        if (!canManageUsers(req.user)) return res.status(403).json({ error: 'دسترسی ندارید' });
        const ids = Array.isArray(req.body && req.body.ids) ? req.body.ids.filter(isValidUUID) : [];
        if (!ids.length) return res.status(400).json({ error: 'ids الزامی است' });
        const rows = await FieldDefinition.findAll({ where: { id: ids } });
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

router.put('/:id', async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
    try {
        if (!canManageUsers(req.user)) return res.status(403).json({ error: 'دسترسی ندارید' });
        const field = await FieldDefinition.findByPk(req.params.id);
        if (!field) return res.status(404).json({ error: 'فیلد یافت نشد' });
        await builder.updateField(field, req.body || {});
        res.json(field);
    } catch (err) {
        handleErr(err, res, next);
    }
});

// حذف = غیرفعال‌سازی (داده‌های قبلی در JSON می‌مانند)؛ ?hard=1 حذف تعریف
router.delete('/:id', async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
    try {
        if (!canManageUsers(req.user)) return res.status(403).json({ error: 'دسترسی ندارید' });
        const field = await FieldDefinition.findByPk(req.params.id);
        if (!field) return res.status(404).json({ error: 'فیلد یافت نشد' });
        if (String(req.query.hard || '') === '1') {
            await field.destroy();
            return res.json({ ok: true, hard: true });
        }
        field.isActive = false;
        await field.save();
        res.json({ ok: true, hard: false });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

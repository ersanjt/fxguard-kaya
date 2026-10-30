/**
 * Kaya CRM — /api/bookable-services — خدمات قابل رزرو (ویزیت، لیزر، تور، مشاوره، ...)
 * @file    backend/routes/bookableServices.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
const express = require('express');
const router = express.Router();
const { BookableService, Appointment } = require('../models');
const { isValidUUID, safeString } = require('../lib/validation');
const { canManageUsers } = require('../lib/permissions');
const { normalizeLabels, hasAnyLabel } = require('../lib/fieldSchema');

const COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;

function applyInput(row, body, { creating }) {
    if (creating || body.name !== undefined || body.labels !== undefined) {
        const labels = body.labels !== undefined ? normalizeLabels(body.labels) : row.labels;
        const name = safeString(body.name, 120) || (hasAnyLabel(labels) ? labels.fa || labels.en || labels.tr : null) || row.name;
        if (!name) return 'نام خدمت الزامی است';
        row.name = name;
        row.labels = hasAnyLabel(labels) ? labels : null;
    }
    if (body.description !== undefined) row.description = safeString(body.description, 2000);
    if (body.durationMin !== undefined) {
        const d = Number(body.durationMin);
        if (!Number.isFinite(d) || d < 5 || d > 24 * 60) return 'مدت باید بین ۵ دقیقه تا ۲۴ ساعت باشد';
        row.durationMin = Math.round(d);
    }
    if (body.bufferMin !== undefined) {
        const b = Number(body.bufferMin);
        if (!Number.isFinite(b) || b < 0 || b > 240) return 'بافر باید بین ۰ تا ۲۴۰ دقیقه باشد';
        row.bufferMin = Math.round(b);
    }
    if (body.price !== undefined) {
        if (body.price === null || body.price === '') row.price = null;
        else {
            const p = Number(String(body.price).replace(/[,\s]/g, ''));
            if (!Number.isFinite(p) || p < 0) return 'قیمت نامعتبر است';
            row.price = p;
        }
    }
    if (body.currency !== undefined) row.currency = body.currency ? String(body.currency).trim().toUpperCase().slice(0, 8) : null;
    if (body.color !== undefined) row.color = body.color && COLOR_RE.test(String(body.color)) ? String(body.color) : null;
    if (body.branchId !== undefined) row.branchId = isValidUUID(body.branchId) ? body.branchId : null;
    if (body.staffIds !== undefined) {
        row.staffIds = Array.isArray(body.staffIds) ? body.staffIds.filter(isValidUUID).slice(0, 200) : null;
        if (row.staffIds && !row.staffIds.length) row.staffIds = null;
    }
    if (body.sortOrder !== undefined) row.sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0;
    if (body.isActive !== undefined) row.isActive = !!body.isActive;
    return null;
}

router.get('/', async (req, res, next) => {
    try {
        if (!req.canAccess('appointments')) return res.status(403).json({ error: 'دسترسی به نوبت‌دهی ندارید' });
        const all = String(req.query.all || '') === '1' && canManageUsers(req.user);
        const rows = await BookableService.findAll({
            where: all ? {} : { isActive: true },
            order: [['sortOrder', 'ASC'], ['name', 'ASC']],
        });
        res.json({ data: rows });
    } catch (err) {
        next(err);
    }
});

router.post('/', async (req, res, next) => {
    try {
        if (!canManageUsers(req.user)) return res.status(403).json({ error: 'فقط مدیران می‌توانند خدمت تعریف کنند' });
        const row = BookableService.build({});
        const err = applyInput(row, req.body || {}, { creating: true });
        if (err) return res.status(400).json({ error: err });
        await row.save();
        res.status(201).json(row);
    } catch (err) {
        next(err);
    }
});

router.put('/:id', async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
    try {
        if (!canManageUsers(req.user)) return res.status(403).json({ error: 'دسترسی ندارید' });
        const row = await BookableService.findByPk(req.params.id);
        if (!row) return res.status(404).json({ error: 'خدمت یافت نشد' });
        const err = applyInput(row, req.body || {}, { creating: false });
        if (err) return res.status(400).json({ error: err });
        await row.save();
        res.json(row);
    } catch (err) {
        next(err);
    }
});

// حذف = غیرفعال‌سازی (نوبت‌های قبلی به آن ارجاع دارند)
router.delete('/:id', async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
    try {
        if (!canManageUsers(req.user)) return res.status(403).json({ error: 'دسترسی ندارید' });
        const row = await BookableService.findByPk(req.params.id);
        if (!row) return res.status(404).json({ error: 'خدمت یافت نشد' });
        const used = await Appointment.count({ where: { serviceId: row.id } });
        if (!used && String(req.query.hard || '') === '1') {
            await row.destroy();
            return res.json({ ok: true, hard: true });
        }
        row.isActive = false;
        await row.save();
        res.json({ ok: true, hard: false });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

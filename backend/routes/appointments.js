/**
 * Kaya CRM — /api/appointments — نوبت‌دهی / رزرو
 * @file    backend/routes/appointments.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 *
 * تداخل: همان کارمند (یا همان مشتری) در بازهٔ هم‌پوشان → 409 APPOINTMENT_CONFLICT
 * (مدیر می‌تواند با force=true رد کند).
 */
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Appointment, BookableService, Customer, User, Branch } = require('../models');
const { isValidUUID, safeString } = require('../lib/validation');
const { canManageUsers, isMainAdmin } = require('../lib/permissions');
const { validateData } = require('../lib/fieldSchema');
const builder = require('../services/moduleBuilder');
const booking = require('../services/booking');
const { tenantRoom } = require('../lib/tenantContext');

const includeList = [
    { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'profilePic'], required: false },
    { model: User, as: 'staff', attributes: ['id', 'name'], required: false },
    { model: User, as: 'creator', attributes: ['id', 'name'], required: false },
    { model: BookableService, as: 'service', attributes: ['id', 'name', 'labels', 'durationMin', 'color'], required: false },
    { model: Branch, as: 'branch', attributes: ['id', 'name'], required: false },
];

function handleErr(err, res, next) {
    if (err && err.expose && err.status) {
        const body = { error: err.message };
        if (err.code) body.code = err.code;
        if (err.extra) Object.assign(body, err.extra);
        return res.status(err.status).json(body);
    }
    return next(err);
}

function emitChange(req, type, appointment) {
    try {
        const io = req.app && req.app.get('io');
        if (!io) return;
        const payload = { type, id: appointment.id, startAt: appointment.startAt, staffId: appointment.staffId, status: appointment.status };
        const room = tenantRoom(req.user && req.user.tenantId);
        if (room) io.to(room).emit('appointment:changed', payload);
        else io.emit('appointment:changed', payload);
    } catch (_) {}
}

function canMutate(req, a) {
    const u = req.user;
    if (isMainAdmin(u) || canManageUsers(u)) return true;
    return a.createdBy === u.id || a.staffId === u.id;
}

async function checkConflicts(req, { staffId, customerId, start, end, excludeId, service }) {
    const force = String((req.body || {}).force || '') === 'true' || (req.body || {}).force === true;
    const conflicts = await booking.findConflicts({
        staffId,
        customerId,
        start,
        end,
        excludeId,
        bufferMin: service ? Number(service.bufferMin) || 0 : 0,
    });
    if (conflicts.length && !(force && canManageUsers(req.user))) {
        throw new booking.BookingError('در این بازه نوبت دیگری ثبت شده است', 409, 'APPOINTMENT_CONFLICT', {
            conflicts: conflicts.map((c) => ({ id: c.id, startAt: c.startAt, endAt: c.endAt, staffId: c.staffId, customerId: c.customerId })),
        });
    }
}

// لیست (تقویم): from/to الزامی‌اند مگر customerId داده شود
router.get('/', async (req, res, next) => {
    try {
        const where = {};
        const from = req.query.from ? new Date(req.query.from) : null;
        const to = req.query.to ? new Date(req.query.to) : null;
        if (isValidUUID(req.query.customerId)) where.customerId = req.query.customerId;
        if (from && !Number.isNaN(from.getTime()) && to && !Number.isNaN(to.getTime())) {
            if (to - from > 62 * 24 * 3600000) return res.status(400).json({ error: 'بازه حداکثر ۶۲ روز' });
            where.startAt = { [Op.lt]: to };
            where.endAt = { [Op.gt]: from };
        } else if (!where.customerId) {
            const now = new Date();
            const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            where.startAt = { [Op.lt]: new Date(dayStart.getTime() + 7 * 24 * 3600000) };
            where.endAt = { [Op.gt]: dayStart };
        }
        if (isValidUUID(req.query.staffId)) where.staffId = req.query.staffId;
        if (isValidUUID(req.query.branchId)) where.branchId = req.query.branchId;
        if (isValidUUID(req.query.serviceId)) where.serviceId = req.query.serviceId;
        if (req.query.status && booking.isValidStatus(req.query.status)) where.status = String(req.query.status);
        const rows = await Appointment.findAll({ where, include: includeList, order: [['startAt', 'ASC']], limit: 1000 });
        res.json({ data: rows });
    } catch (err) {
        next(err);
    }
});

// آمار سریع برای داشبورد/تب نوبت‌ها
router.get('/summary', async (req, res, next) => {
    try {
        const now = new Date();
        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dayEnd = new Date(dayStart.getTime() + 24 * 3600000);
        const [today, upcoming, unconfirmed] = await Promise.all([
            Appointment.count({ where: { startAt: { [Op.gte]: dayStart, [Op.lt]: dayEnd }, status: { [Op.in]: ['scheduled', 'confirmed', 'arrived', 'completed'] } } }),
            Appointment.count({ where: { startAt: { [Op.gte]: now }, status: { [Op.in]: ['scheduled', 'confirmed'] } } }),
            Appointment.count({ where: { startAt: { [Op.gte]: now, [Op.lt]: new Date(now.getTime() + 48 * 3600000) }, status: 'scheduled' } }),
        ]);
        res.json({ today, upcoming, unconfirmed });
    } catch (err) {
        next(err);
    }
});

// بازه‌های اشغال‌شدهٔ یک کارمند در یک روز (برای انتخاب ساعت)
router.get('/availability', async (req, res, next) => {
    try {
        const date = String(req.query.date || '');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date (YYYY-MM-DD) الزامی است' });
        const dayStart = new Date(`${date}T00:00:00`);
        const dayEnd = new Date(dayStart.getTime() + 24 * 3600000);
        const where = { status: { [Op.in]: ['scheduled', 'confirmed', 'arrived'] }, startAt: { [Op.lt]: dayEnd }, endAt: { [Op.gt]: dayStart } };
        if (isValidUUID(req.query.staffId)) where.staffId = req.query.staffId;
        const rows = await Appointment.findAll({ where, attributes: ['id', 'startAt', 'endAt', 'staffId'], order: [['startAt', 'ASC']] });
        res.json({ date, busy: rows });
    } catch (err) {
        next(err);
    }
});

router.get('/:id', async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
    try {
        const a = await Appointment.findByPk(req.params.id, { include: includeList });
        if (!a) return res.status(404).json({ error: 'نوبت یافت نشد' });
        res.json(a);
    } catch (err) {
        next(err);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const body = req.body || {};
        if (!isValidUUID(body.customerId)) return res.status(400).json({ error: 'مشتری الزامی است' });
        const staffId = isValidUUID(body.staffId) ? body.staffId : null;
        const conversationId = isValidUUID(body.conversationId) ? body.conversationId : null;
        await booking.assertRefs({ customerId: body.customerId, staffId, conversationId });
        const service = isValidUUID(body.serviceId) ? await booking.loadService(body.serviceId) : null;
        const { start, end } = booking.resolveWindow(body, service);
        const fields = await builder.listFields('appointment', null);
        const v = validateData(fields, body.data || {});
        if (!v.ok) return res.status(400).json({ error: v.errors[0], errors: v.errors });
        await checkConflicts(req, { staffId, customerId: body.customerId, start, end, service });
        const a = await Appointment.create({
            customerId: body.customerId,
            serviceId: service ? service.id : null,
            staffId,
            branchId: isValidUUID(body.branchId) ? body.branchId : service && service.branchId ? service.branchId : null,
            conversationId,
            startAt: start,
            endAt: end,
            status: body.status === 'confirmed' ? 'confirmed' : 'scheduled',
            confirmedAt: body.status === 'confirmed' ? new Date() : null,
            source: ['panel', 'whatsapp', 'web', 'import'].includes(body.source) ? body.source : conversationId ? 'whatsapp' : 'panel',
            notes: safeString(body.notes, 4000),
            data: v.value,
            createdBy: req.user.id,
        });
        const full = await Appointment.findByPk(a.id, { include: includeList });
        emitChange(req, 'created', full);
        res.status(201).json(full);
    } catch (err) {
        handleErr(err, res, next);
    }
});

router.put('/:id', async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
    try {
        const a = await Appointment.findByPk(req.params.id);
        if (!a) return res.status(404).json({ error: 'نوبت یافت نشد' });
        if (!canMutate(req, a)) return res.status(403).json({ error: 'اجازهٔ ویرایش این نوبت را ندارید' });
        if (['completed', 'cancelled', 'no_show'].includes(a.status) && !canManageUsers(req.user)) {
            return res.status(400).json({ error: 'نوبت بسته‌شده قابل ویرایش نیست' });
        }
        const body = req.body || {};
        const staffId = body.staffId === undefined ? a.staffId : isValidUUID(body.staffId) ? body.staffId : null;
        if (staffId && staffId !== a.staffId) await booking.assertRefs({ customerId: a.customerId, staffId });
        let service = null;
        if (body.serviceId !== undefined) service = isValidUUID(body.serviceId) ? await booking.loadService(body.serviceId) : null;
        else if (a.serviceId) service = await BookableService.findByPk(a.serviceId);

        let start = new Date(a.startAt);
        let end = new Date(a.endAt);
        if (body.startAt !== undefined || body.endAt !== undefined || body.durationMin !== undefined) {
            const w = booking.resolveWindow(
                {
                    startAt: body.startAt !== undefined ? body.startAt : a.startAt,
                    endAt: body.endAt !== undefined ? body.endAt : body.durationMin !== undefined ? undefined : body.startAt !== undefined ? undefined : a.endAt,
                    durationMin: body.durationMin,
                },
                service
            );
            start = w.start;
            end = w.end;
        }
        if (body.data !== undefined) {
            const fields = await builder.listFields('appointment', null);
            const v = validateData(fields, body.data || {}, { partial: true, existing: a.data || {} });
            if (!v.ok) return res.status(400).json({ error: v.errors[0], errors: v.errors });
            a.data = v.value;
        }
        const timeChanged = start.getTime() !== new Date(a.startAt).getTime() || end.getTime() !== new Date(a.endAt).getTime();
        if (timeChanged || staffId !== a.staffId) {
            await checkConflicts(req, { staffId, customerId: a.customerId, start, end, excludeId: a.id, service });
            if (timeChanged) a.reminderSentAt = null; // زمان جدید → یادآوری دوباره
        }
        a.staffId = staffId;
        a.startAt = start;
        a.endAt = end;
        if (body.serviceId !== undefined) a.serviceId = service ? service.id : null;
        if (body.branchId !== undefined) a.branchId = isValidUUID(body.branchId) ? body.branchId : null;
        if (body.notes !== undefined) a.notes = safeString(body.notes, 4000);
        await a.save();
        const full = await Appointment.findByPk(a.id, { include: includeList });
        emitChange(req, 'updated', full);
        res.json(full);
    } catch (err) {
        handleErr(err, res, next);
    }
});

// تغییر وضعیت: confirmed | arrived | completed | cancelled | no_show | scheduled (بازگشایی)
router.post('/:id/status', async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
    try {
        const a = await Appointment.findByPk(req.params.id);
        if (!a) return res.status(404).json({ error: 'نوبت یافت نشد' });
        if (!canMutate(req, a)) return res.status(403).json({ error: 'اجازهٔ تغییر این نوبت را ندارید' });
        const to = String((req.body || {}).status || '');
        if (!booking.isValidStatus(to)) return res.status(400).json({ error: 'وضعیت نامعتبر است' });
        if (!booking.canTransition(a.status, to)) return res.status(400).json({ error: `تغییر وضعیت از ${a.status} به ${to} مجاز نیست` });
        if (to === 'scheduled') {
            const { start, end } = { start: new Date(a.startAt), end: new Date(a.endAt) };
            await checkConflicts(req, { staffId: a.staffId, customerId: a.customerId, start, end, excludeId: a.id });
            a.cancelledAt = null;
            a.cancelReason = null;
        }
        a.status = to;
        if (to === 'confirmed') a.confirmedAt = new Date();
        if (to === 'cancelled') {
            a.cancelledAt = new Date();
            a.cancelReason = safeString((req.body || {}).reason, 300);
        }
        await a.save();
        const full = await Appointment.findByPk(a.id, { include: includeList });
        emitChange(req, 'status', full);
        res.json(full);
    } catch (err) {
        handleErr(err, res, next);
    }
});

// حذف = لغو؛ ?hard=1 فقط مالک/ادمین
router.delete('/:id', async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
    try {
        const a = await Appointment.findByPk(req.params.id);
        if (!a) return res.status(404).json({ error: 'نوبت یافت نشد' });
        if (!canMutate(req, a)) return res.status(403).json({ error: 'اجازهٔ حذف این نوبت را ندارید' });
        const hard = String(req.query.hard || '') === '1' && (isMainAdmin(req.user) || ['owner', 'admin'].includes(req.user.role));
        if (hard) {
            await a.destroy();
            emitChange(req, 'deleted', a);
            return res.json({ ok: true, hard: true });
        }
        if (a.status !== 'cancelled') {
            a.status = 'cancelled';
            a.cancelledAt = new Date();
            a.cancelReason = safeString(req.query.reason, 300);
            await a.save();
        }
        emitChange(req, 'status', a);
        res.json({ ok: true, hard: false });
    } catch (err) {
        handleErr(err, res, next);
    }
});

module.exports = router;

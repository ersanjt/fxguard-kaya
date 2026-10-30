/**
 * Kaya CRM — نوبت‌دهی: منطق تداخل، زمان‌بندی و یادآوری واتساپ
 * @file    backend/services/booking.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const { Op } = require('sequelize');
const models = require('../models');
const { Appointment, BookableService, Customer, Conversation, User } = models;
const { ACTIVE_STATUSES, APPOINTMENT_STATUSES } = require('../models/Appointment');
const { getPanelSettings } = require('./panelSettingsLoader');
const { pickLabel } = require('../lib/fieldSchema');

const DEFAULT_REMINDER_FA = 'سلام {name} عزیز، یادآوری نوبت شما: {service} در تاریخ {date} ساعت {time}{staff_line}. در صورت نیاز به تغییر، همین‌جا پیام دهید. — {org}';
const MAX_DURATION_MIN = 24 * 60;

class BookingError extends Error {
    constructor(message, status = 400, code = null, extra = null) {
        super(message);
        this.status = status;
        this.code = code;
        this.expose = true;
        if (extra) this.extra = extra;
    }
}

/** بازهٔ زمانی [start,end) را از ورودی می‌سازد */
function resolveWindow({ startAt, endAt, durationMin }, service) {
    const start = new Date(startAt);
    if (!startAt || Number.isNaN(start.getTime())) throw new BookingError('زمان شروع نامعتبر است');
    let end = endAt ? new Date(endAt) : null;
    if (end && Number.isNaN(end.getTime())) throw new BookingError('زمان پایان نامعتبر است');
    if (!end) {
        let dur = Number(durationMin);
        if (!Number.isFinite(dur) || dur <= 0) dur = service ? Number(service.durationMin) || 30 : 30;
        end = new Date(start.getTime() + dur * 60000);
    }
    if (end <= start) throw new BookingError('زمان پایان باید بعد از شروع باشد');
    if ((end - start) / 60000 > MAX_DURATION_MIN) throw new BookingError('مدت نوبت بیش از حد مجاز است');
    return { start, end };
}

/**
 * نوبت‌های فعالِ هم‌پوشان با همان کارمند (و در نبود کارمند: همان مشتری).
 * بافر خدمت (bufferMin) به انتهای نوبت‌های موجود اضافه می‌شود.
 */
async function findConflicts({ staffId, customerId, start, end, excludeId, bufferMin = 0 }) {
    const where = {
        status: { [Op.in]: ACTIVE_STATUSES },
        startAt: { [Op.lt]: new Date(end.getTime() + bufferMin * 60000) },
        endAt: { [Op.gt]: new Date(start.getTime() - bufferMin * 60000) },
    };
    if (excludeId) where.id = { [Op.ne]: excludeId };
    const or = [];
    if (staffId) or.push({ staffId });
    if (customerId) or.push({ customerId });
    if (!or.length) return [];
    where[Op.or] = or;
    return Appointment.findAll({
        where,
        attributes: ['id', 'startAt', 'endAt', 'staffId', 'customerId', 'status'],
        order: [['startAt', 'ASC']],
        limit: 10,
    });
}

async function loadService(serviceId) {
    if (!serviceId) return null;
    const s = await BookableService.findByPk(serviceId);
    if (!s || !s.isActive) throw new BookingError('خدمت یافت نشد یا غیرفعال است', 404);
    return s;
}

async function assertRefs({ customerId, staffId, conversationId }) {
    const c = await Customer.findByPk(customerId, { attributes: ['id', 'name', 'phone'] });
    if (!c) throw new BookingError('مشتری یافت نشد', 404);
    if (staffId) {
        const u = await User.findByPk(staffId, { attributes: ['id', 'isActive'] });
        if (!u || u.isActive === false) throw new BookingError('کارمند یافت نشد', 404);
    }
    if (conversationId) {
        const conv = await Conversation.findByPk(conversationId, { attributes: ['id', 'customerId'] });
        if (!conv) throw new BookingError('گفتگو یافت نشد', 404);
    }
    return c;
}

function isValidStatus(s) {
    return APPOINTMENT_STATUSES.includes(String(s || ''));
}

/** گذارهای مجاز وضعیت */
const TRANSITIONS = {
    scheduled: ['confirmed', 'arrived', 'completed', 'cancelled', 'no_show'],
    confirmed: ['arrived', 'completed', 'cancelled', 'no_show', 'scheduled'],
    arrived: ['completed', 'cancelled', 'no_show'],
    completed: [],
    cancelled: ['scheduled'],
    no_show: ['scheduled'],
};

function canTransition(from, to) {
    return Array.isArray(TRANSITIONS[from]) && TRANSITIONS[from].includes(to);
}

function pad(n) {
    return String(n).padStart(2, '0');
}

/** قالب یادآوری با متغیرها */
function renderReminder(template, ctx) {
    const tpl = String(template || DEFAULT_REMINDER_FA);
    const staffLine = ctx.staff ? ` با ${ctx.staff}` : '';
    return tpl
        .replace(/\{name\}/g, ctx.name || '')
        .replace(/\{service\}/g, ctx.service || 'نوبت')
        .replace(/\{date\}/g, ctx.date || '')
        .replace(/\{time\}/g, ctx.time || '')
        .replace(/\{staff_line\}/g, staffLine)
        .replace(/\{staff\}/g, ctx.staff || '')
        .replace(/\{org\}/g, ctx.org || '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

function formatDateTime(d, lang = 'fa') {
    try {
        const locale = lang === 'fa' ? 'fa-IR-u-ca-persian-nu-latn' : lang === 'tr' ? 'tr-TR' : 'en-GB';
        const date = new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long' }).format(d);
        const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
        return { date, time };
    } catch (_) {
        return { date: d.toISOString().slice(0, 10), time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
    }
}

/**
 * ارسال یادآوری برای نوبت‌های سررسیده در سازمان جاری (tenant context فعال).
 * @returns {Promise<{sent:number, skipped:number}>}
 */
async function sendDueRemindersForCurrentTenant(logger, deps = {}) {
    const settings = await getPanelSettings();
    const hours = Number(settings.bookingReminderHours);
    if (!Number.isFinite(hours) || hours <= 0) return { sent: 0, skipped: 0, disabled: true };
    const now = new Date();
    const horizon = new Date(now.getTime() + hours * 3600000);
    const due = await Appointment.findAll({
        where: {
            status: { [Op.in]: ['scheduled', 'confirmed'] },
            reminderSentAt: null,
            startAt: { [Op.gt]: now, [Op.lte]: horizon },
        },
        include: [
            { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'] },
            { model: User, as: 'staff', attributes: ['id', 'name'], required: false },
            { model: BookableService, as: 'service', attributes: ['id', 'name', 'labels'], required: false },
        ],
        order: [['startAt', 'ASC']],
        limit: 200,
    });
    const send = deps.sendToCustomer || defaultSendToCustomer;
    let sent = 0;
    let skipped = 0;
    for (const a of due) {
        if (!a.customer || !a.customer.phone) {
            skipped += 1;
            continue;
        }
        const lang = settings.defaultLanguage || 'fa';
        const { date, time } = formatDateTime(new Date(a.startAt), lang);
        const text = renderReminder(settings.bookingReminderTemplate, {
            name: a.customer.name || '',
            service: a.service ? pickLabel(a.service.labels, lang) || a.service.name : '',
            date,
            time,
            staff: a.staff ? a.staff.name : '',
            org: settings.siteName || '',
        });
        try {
            const ok = await send(a.customer, text, { appointment: a, conversationId: a.conversationId });
            if (ok) {
                a.reminderSentAt = new Date();
                await a.save();
                sent += 1;
            } else skipped += 1;
        } catch (err) {
            skipped += 1;
            if (logger) logger.warn('booking reminder send failed', { appointmentId: a.id, error: err.message });
        }
    }
    return { sent, skipped };
}

/** ارسال از طریق گفتگوی موجود مشتری (یا ساخت گفتگو) با همان مسیر پیام‌های خودکار */
async function defaultSendToCustomer(customer, text, { conversationId } = {}) {
    const autoMessages = require('./autoMessages');
    let conversation = null;
    if (conversationId) conversation = await Conversation.findByPk(conversationId);
    if (!conversation) {
        conversation = await Conversation.findOne({ where: { customerId: customer.id }, order: [['lastMessageAt', 'DESC']] });
    }
    if (!conversation) {
        conversation = await Conversation.create({ customerId: customer.id, status: 'open', lastMessageAt: new Date() });
    }
    return autoMessages.sendOutgoingAutoMessage(conversation, text);
}

module.exports = {
    BookingError,
    resolveWindow,
    findConflicts,
    loadService,
    assertRefs,
    isValidStatus,
    canTransition,
    TRANSITIONS,
    renderReminder,
    formatDateTime,
    sendDueRemindersForCurrentTenant,
    DEFAULT_REMINDER_FA,
};

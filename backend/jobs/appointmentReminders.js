/**
 * Kaya CRM — یادآوری واتساپ نوبت‌ها (همهٔ سازمان‌ها)
 * @file    backend/jobs/appointmentReminders.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 *
 * هر ۵ دقیقه: برای هر سازمان (tenant) در context خودش، نوبت‌های داخل افق
 * bookingReminderHours که هنوز یادآوری نگرفته‌اند را پیدا و پیام می‌فرستد.
 */
'use strict';

const logger = require('../config/logger');
const { runWithTenant } = require('../lib/tenantContext');
const { PLATFORM_SLUG } = require('../lib/tenantHost');

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
let _intervalId = null;
let _running = false;

async function listTenantsForJob() {
    const { Tenant } = require('../models');
    const { loadPlatformTenant, tenantShape } = require('../middleware/tenantContext');
    const out = [];
    try {
        out.push(await loadPlatformTenant());
        const rows = await Tenant.findAll({ where: { status: ['active', 'trial'] } });
        for (const r of rows) if (r.slug !== PLATFORM_SLUG) out.push(tenantShape(r));
    } catch (err) {
        logger.warn('appointmentReminders: tenant list failed', { error: err.message });
    }
    return out;
}

async function runOnce() {
    if (_running) return { skipped: true };
    _running = true;
    const { sendDueRemindersForCurrentTenant } = require('../services/booking');
    const totals = { sent: 0, skipped: 0, tenants: 0 };
    try {
        const tenants = await listTenantsForJob();
        for (const t of tenants) {
            try {
                const r = await runWithTenant(t, () => sendDueRemindersForCurrentTenant(logger));
                totals.tenants += 1;
                totals.sent += r.sent || 0;
                totals.skipped += r.skipped || 0;
            } catch (err) {
                logger.warn('appointmentReminders: tenant run failed', { tenant: t && t.slug, error: err.message });
            }
        }
        if (totals.sent) logger.info('appointmentReminders: sent', totals);
    } finally {
        _running = false;
    }
    return totals;
}

function startAppointmentRemindersJob() {
    if (process.env.NODE_ENV === 'test') return;
    if (_intervalId) return;
    _intervalId = setInterval(() => {
        runOnce().catch((err) => logger.warn('appointmentReminders:', err.message));
    }, CHECK_INTERVAL_MS);
    _intervalId.unref();
    setTimeout(() => runOnce().catch((err) => logger.warn('appointmentReminders on start:', err.message)), 20000).unref();
}

function stopAppointmentRemindersJob() {
    if (_intervalId) {
        clearInterval(_intervalId);
        _intervalId = null;
    }
}

module.exports = { startAppointmentRemindersJob, stopAppointmentRemindersJob, runOnce };

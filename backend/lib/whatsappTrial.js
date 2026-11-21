/**
 * Kaya CRM — آزمایش ۷روزه شماره واتساپ (قطع خودکار نشست غیررسمی)
 * @file    backend/lib/whatsappTrial.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */

'use strict';

const TRIAL_DAYS = 7;
const MS_DAY = 24 * 60 * 60 * 1000;
const STATUSES = ['none', 'active', 'converted', 'expired'];

function trialStatusOf(row) {
    const v = String((row && row.trialStatus) || '')
        .trim()
        .toLowerCase();
    if (STATUSES.indexOf(v) >= 0 && v !== 'none') return v;
    return 'none';
}

function asDate(value) {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

function computeEndsAt(startedAt, days) {
    const start = asDate(startedAt);
    if (!start) return null;
    return new Date(start.getTime() + (days || TRIAL_DAYS) * MS_DAY);
}

function serializeTrial(row, now) {
    const at = asDate(now) || new Date();
    const status = trialStatusOf(row);
    const startedAt = asDate(row && row.trialStartedAt);
    const endsAt = asDate(row && row.trialEndsAt) || (startedAt ? computeEndsAt(startedAt) : null);
    let remainingMs = null;
    if (status === 'active' && endsAt) {
        remainingMs = Math.max(0, endsAt.getTime() - at.getTime());
    }
    const remainingDays =
        remainingMs == null ? null : Math.max(0, Math.ceil(remainingMs / MS_DAY));
    return {
        status,
        startedAt: startedAt ? startedAt.toISOString() : null,
        endsAt: endsAt ? endsAt.toISOString() : null,
        remainingMs,
        remainingDays,
        canStart: status === 'none' || status === 'expired',
        canConvert: status === 'active',
        days: TRIAL_DAYS,
    };
}

function shouldExpire(row, now) {
    const at = asDate(now) || new Date();
    if (trialStatusOf(row) !== 'active') return false;
    const endsAt = asDate(row && row.trialEndsAt);
    if (!endsAt) return false;
    return endsAt.getTime() <= at.getTime();
}

function applyStart(row, now) {
    const at = asDate(now) || new Date();
    row.trialStatus = 'active';
    row.trialStartedAt = at;
    row.trialEndsAt = computeEndsAt(at);
    return serializeTrial(row, at);
}

function applyConvert(row) {
    row.trialStatus = 'converted';
    return serializeTrial(row, new Date());
}

function applyExpired(row, now) {
    row.trialStatus = 'expired';
    return serializeTrial(row, now || new Date());
}

async function loadTrialRow() {
    const { WhatsappConfig } = require('../models');
    const { requirePanelSettingsKey } = require('./tenantContext');
    const panelKey = requirePanelSettingsKey();
    const [cfg] = await WhatsappConfig.findOrCreate({
        where: { id: panelKey },
        defaults: { welcomeEnabled: true },
    });
    return cfg;
}

async function getTrialSnapshot() {
    const row = await loadTrialRow();
    return serializeTrial(row, new Date());
}

async function startWhatsappTrial() {
    const row = await loadTrialRow();
    const snap = serializeTrial(row, new Date());
    if (!snap.canStart) {
        const err = new Error('آزمایش فعال است یا شماره به حالت دائمی تبدیل شده است.');
        err.status = 400;
        err.code = 'TRIAL_NOT_STARTABLE';
        throw err;
    }
    applyStart(row, new Date());
    await row.save();
    return serializeTrial(row, new Date());
}

async function convertWhatsappTrial() {
    const row = await loadTrialRow();
    const snap = serializeTrial(row, new Date());
    if (!snap.canConvert) {
        const err = new Error('آزمایش فعالی برای تبدیل به خط دائمی نیست.');
        err.status = 400;
        err.code = 'TRIAL_NOT_CONVERTIBLE';
        throw err;
    }
    applyConvert(row);
    await row.save();
    return serializeTrial(row, new Date());
}

async function expireOneTrialRow(row, logger) {
    if (!shouldExpire(row, new Date())) return { expired: false, trial: serializeTrial(row) };

    let loggedOut = false;
    try {
        const { getWhatsappConnectionConfig, gatewayPost } = require('./gatewayClient');
        const cfg = await getWhatsappConnectionConfig();
        const cloudOk = !!(cfg.cloudEnabled && cfg.cloudAccessToken && cfg.cloudPhoneNumberId);
        const cloudOnly = cfg.connectionMode === 'cloud' && cloudOk;
        if (!cloudOnly) {
            await gatewayPost('/api/logout', {}, { timeout: 20000, cfg });
            loggedOut = true;
        }
    } catch (err) {
        if (logger && logger.warn) {
            logger.warn('WhatsApp trial expiry logout failed; will retry', {
                panelKey: row.id,
                error: err.message,
            });
        }
        return { expired: false, retry: true, trial: serializeTrial(row) };
    }

    applyExpired(row, new Date());
    await row.save();
    try {
        const { notifySystemEvent } = require('../services/systemEventNotifier');
        await notifySystemEvent('system', 'آزمایش ۷روزه واتساپ تمام شد', {
            وضعیت: 'منقضی',
            خروج_gateway: loggedOut ? 'بله' : 'Cloud-only — بدون QR',
        });
    } catch (_) {}
    return { expired: true, loggedOut, trial: serializeTrial(row), panelKey: row.id };
}

/**
 * همهٔ سازمان‌هایی که آزمایش واتساپ‌شان تمام شده را منقضی می‌کند.
 * job بدون context نباید فقط به default سکو محدود شود.
 */
async function expireDueWhatsappTrial(logger) {
    const { WhatsappConfig, Tenant } = require('../models');
    const { runWithTenant } = require('./tenantContext');
    const { tenantShape, loadPlatformTenant } = require('../middleware/tenantContext');
    const { Op } = require('sequelize');
    const now = new Date();
    const due = await WhatsappConfig.findAll({
        where: {
            trialStatus: 'active',
            trialEndsAt: { [Op.ne]: null, [Op.lte]: now },
        },
    });
    if (!due.length) return { expired: 0, results: [] };

    const results = [];
    for (const row of due) {
        let tenant = null;
        if (row.id === 'default') {
            tenant = await loadPlatformTenant();
        } else {
            const t = await Tenant.findOne({ where: { panelKey: row.id } });
            tenant = t ? tenantShape(t) : null;
        }
        if (!tenant) {
            if (logger && logger.warn) {
                logger.warn('WhatsApp trial expire: no tenant for panel key', { panelKey: row.id });
            }
            continue;
        }
        try {
            const r = await runWithTenant(tenant, () => expireOneTrialRow(row, logger));
            results.push(r);
        } catch (err) {
            if (logger && logger.warn) {
                logger.warn('WhatsApp trial expire tenant failed', {
                    panelKey: row.id,
                    error: err.message,
                });
            }
        }
    }
    return {
        expired: results.filter((r) => r && r.expired).length,
        results,
    };
}

module.exports = {
    TRIAL_DAYS,
    STATUSES,
    trialStatusOf,
    computeEndsAt,
    serializeTrial,
    shouldExpire,
    applyStart,
    applyConvert,
    applyExpired,
    getTrialSnapshot,
    startWhatsappTrial,
    convertWhatsappTrial,
    expireDueWhatsappTrial,
};

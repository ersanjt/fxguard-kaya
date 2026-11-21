/**
 * ارسال روزانه نرخ ارز در تلگرام — per-tenant
 * هر روز یک بار در ساعت مشخص (پیش‌فرض: ۹ صبح) اجرا می‌شود
 * متغیر محیطی: DAILY_RATES_HOUR (پیش‌فرض: 9) و DAILY_RATES_MINUTE (پیش‌فرض: 0)
 *
 * در PM2 cluster فقط instance 0 ارسال می‌کند تا پیام تکراری نرود.
 */

const logger = require('../config/logger');
const telegramService = require('../services/telegramService');
const { getRatesText } = require('../services/telegramBotService');
const { getPanelSettings, getPanelAlertConfig } = require('../services/panelSettingsLoader');
const { runWithTenant } = require('../lib/tenantContext');
const { PLATFORM_SLUG } = require('../lib/tenantHost');
const { isSkillEnabled } = require('../lib/tenantSkills');

const DAILY_RATES_HOUR = parseInt(process.env.DAILY_RATES_HOUR || '9', 10);
const DAILY_RATES_MINUTE = parseInt(process.env.DAILY_RATES_MINUTE || '0', 10);
const CHECK_INTERVAL_MS = 60 * 1000;

let _intervalId = null;
let _lastSentDate = null;

function shouldSkipDailyRatesForThisWorker() {
    if (process.env.DAILY_RATES_ALL_WORKERS === '1') return false;
    const inst = process.env.NODE_APP_INSTANCE;
    if (inst === undefined || inst === '') return false;
    return String(inst) !== '0';
}

async function listTenantsForDailyRates() {
    const { Tenant } = require('../models');
    const { loadPlatformTenant, tenantShape } = require('../middleware/tenantContext');
    const out = [];
    try {
        out.push(await loadPlatformTenant());
        const rows = await Tenant.findAll({ where: { status: ['active', 'trial'] } });
        for (const r of rows) if (r.slug !== PLATFORM_SLUG) out.push(tenantShape(r));
    } catch (err) {
        logger.warn('Daily rates: tenant list failed', { error: err.message });
    }
    return out;
}

async function broadcastRatesForTenant(tenant) {
    if (!isSkillEnabled(tenant, 'fx_rates')) return { skipped: true, reason: 'skill_off' };

    const text = await getRatesText();
    if (!text) return { skipped: true, reason: 'no_data' };

    const settings = await getPanelSettings();
    const alertCfg = getPanelAlertConfig(settings);
    const telegramConfig = alertCfg.telegramBotToken
        ? {
              botToken: alertCfg.telegramBotToken,
              chatIds: alertCfg.telegramChatIds,
              timeoutMs: alertCfg.telegramTimeoutMs,
          }
        : null;

    if (!telegramService.isEnabled(telegramConfig)) {
        return { skipped: true, reason: 'telegram_off' };
    }

    const siteName = (settings && settings.siteName) || (tenant && tenant.name) || 'CRM';
    const header = `📅 <b>نرخ روزانه · ${String(siteName).replace(/</g, '')}</b>\n`;
    const fullText = header + '\n' + text;
    const result = await telegramService.sendMessage(fullText, telegramConfig);
    return { ok: !!result.ok, error: result.error || null, slug: tenant && tenant.slug };
}

async function broadcastRates() {
    try {
        const tenants = await listTenantsForDailyRates();
        let sent = 0;
        for (const t of tenants) {
            try {
                const r = await runWithTenant(t, () => broadcastRatesForTenant(t));
                if (r && r.ok) sent += 1;
                else if (r && r.error) {
                    logger.warn('Daily rates broadcast failed', { tenant: t && t.slug, error: r.error });
                }
            } catch (err) {
                logger.warn('Daily rates tenant failed', { tenant: t && t.slug, error: err.message });
            }
        }
        if (sent) logger.info('Daily rates broadcast sent', { sent, tenants: tenants.length });
        else logger.info('Daily rates: nothing sent', { tenants: tenants.length });
    } catch (err) {
        logger.error('Daily rates broadcast error', { error: err.message });
    }
}

function shouldSendNow() {
    const now = new Date();
    const todayKey = now.toDateString();
    if (_lastSentDate === todayKey) return false;
    if (now.getHours() === DAILY_RATES_HOUR && now.getMinutes() === DAILY_RATES_MINUTE) {
        return true;
    }
    return false;
}

function startDailyRatesJob() {
    if (_intervalId) return;

    if (shouldSkipDailyRatesForThisWorker()) {
        logger.info('Daily rates job skipped on this worker (only instance 0 sends)');
        return;
    }

    logger.info(
        '📊 Daily rates job started — scheduled at ' +
            DAILY_RATES_HOUR +
            ':' +
            String(DAILY_RATES_MINUTE).padStart(2, '0') +
            ' daily'
    );

    _intervalId = setInterval(async () => {
        if (!shouldSendNow()) return;
        const todayKey = new Date().toDateString();
        _lastSentDate = todayKey;
        logger.info('Daily rates: sending broadcast...');
        try {
            await broadcastRates();
        } catch (err) {
            if (_lastSentDate === todayKey) _lastSentDate = null;
            logger.error('Daily rates broadcast threw', { error: err.message });
        }
    }, CHECK_INTERVAL_MS);

    if (_intervalId.unref) _intervalId.unref();
}

function stopDailyRatesJob() {
    if (_intervalId) {
        clearInterval(_intervalId);
        _intervalId = null;
    }
}

module.exports = {
    startDailyRatesJob,
    stopDailyRatesJob,
    broadcastRates,
    shouldSendNow,
};

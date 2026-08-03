/**
 * ارسال روزانه نرخ ارز در تلگرام
 * هر روز یک بار در ساعت مشخص (پیش‌فرض: ۹ صبح) اجرا می‌شود
 * متغیر محیطی: DAILY_RATES_HOUR (پیش‌فرض: 9) و DAILY_RATES_MINUTE (پیش‌فرض: 0)
 *
 * در PM2 cluster فقط instance 0 ارسال می‌کند تا پیام تکراری نرود.
 */

const logger = require('../config/logger');
const telegramService = require('../services/telegramService');
const { getRatesText } = require('../services/telegramBotService');
const { getPanelSettings, getPanelAlertConfig } = require('../services/panelSettingsLoader');

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

async function broadcastRates() {
    try {
        const text = await getRatesText();
        if (!text) {
            logger.warn('Daily rates: no data available, skipping broadcast');
            return;
        }

        const settings = await getPanelSettings();
        const alertCfg = getPanelAlertConfig(settings);
        const telegramConfig = alertCfg.telegramBotToken
            ? {
                botToken: alertCfg.telegramBotToken,
                chatIds: alertCfg.telegramChatIds,
                timeoutMs: alertCfg.telegramTimeoutMs
            }
            : null;

        if (!telegramService.isEnabled(telegramConfig)) {
            logger.info('Daily rates: Telegram not configured, skipping');
            return;
        }

        const siteName = (settings && settings.siteName) || 'کایا';
        const header = `📅 <b>نرخ روزانه · ${String(siteName).replace(/</g, '')}</b>\n`;
        // حذف هدر تکراری از getRatesText اگر وجود داشته باشد — متن کامل را نگه می‌داریم
        const fullText = header + '\n' + text;
        const result = await telegramService.sendMessage(fullText, telegramConfig);
        if (result.ok) {
            logger.info('Daily rates broadcast sent successfully');
        } else {
            logger.warn('Daily rates broadcast failed', { error: result.error });
        }
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

    logger.info(`📊 Daily rates job started — scheduled at ${DAILY_RATES_HOUR}:${String(DAILY_RATES_MINUTE).padStart(2, '0')} daily`);

    _intervalId = setInterval(async () => {
        if (shouldSendNow()) {
            const todayKey = new Date().toDateString();
            _lastSentDate = todayKey;
            logger.info('Daily rates: sending broadcast...');
            try {
                await broadcastRates();
            } catch (err) {
                if (_lastSentDate === todayKey) _lastSentDate = null;
                logger.error('Daily rates broadcast threw', { error: err.message });
            }
        }
    }, CHECK_INTERVAL_MS);

    _intervalId.unref();
}

function stopDailyRatesJob() {
    if (_intervalId) {
        clearInterval(_intervalId);
        _intervalId = null;
    }
}

module.exports = { startDailyRatesJob, stopDailyRatesJob, broadcastRates };

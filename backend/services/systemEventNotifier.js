const { getPanelSettings, getPanelAlertConfig } = require('./config/panelSettingsLoader');
const telegramService = require('./telegramService');
const logger = require('../config/logger');

const CACHE_TTL_MS = 10000;
let cachedConfig = null;
let cachedAt = 0;

function isCategoryEnabled(cfg, category) {
    if (!cfg || cfg.telegramNotifyAllEvents !== true) return false;
    if (category === 'api') return cfg.telegramNotifyApiRequests === true;
    if (category === 'auth') return cfg.telegramNotifyAuthEvents !== false;
    if (category === 'socket') return cfg.telegramNotifySocketEvents === true;
    if (category === 'message') return cfg.telegramNotifyIncomingMessages === true;
    if (category === 'system') return cfg.telegramNotifySystemEvents !== false;
    if (category === 'error') return cfg.telegramNotifyErrorEvents !== false;
    return false;
}

function formatPayload(category, title, payload) {
    const lines = [`🔔 ${title}`, `Category: ${category}`, `Time: ${new Date().toISOString()}`];
    const keys = Object.keys(payload || {});
    for (const k of keys) {
        let v = payload[k];
        if (v == null) continue;
        if (typeof v === 'object') v = JSON.stringify(v);
        const val = String(v).replace(/\s+/g, ' ').slice(0, 500);
        lines.push(`${k}: ${val}`);
    }
    return lines.join('\n');
}

async function getConfig() {
    const now = Date.now();
    if (cachedConfig && (now - cachedAt) < CACHE_TTL_MS) return cachedConfig;
    const settings = await getPanelSettings();
    const alertConfig = getPanelAlertConfig(settings);
    cachedConfig = {
        ...alertConfig,
        telegramNotifyAllEvents: settings.telegramNotifyAllEvents === true,
        telegramNotifyApiRequests: settings.telegramNotifyApiRequests === true,
        telegramNotifyAuthEvents: settings.telegramNotifyAuthEvents !== false,
        telegramNotifySocketEvents: settings.telegramNotifySocketEvents === true,
        telegramNotifyIncomingMessages: settings.telegramNotifyIncomingMessages === true,
        telegramNotifySystemEvents: settings.telegramNotifySystemEvents !== false,
        telegramNotifyErrorEvents: settings.telegramNotifyErrorEvents !== false
    };
    cachedAt = now;
    return cachedConfig;
}

async function notifySystemEvent(category, title, payload = {}) {
    try {
        const cfg = await getConfig();
        if (!isCategoryEnabled(cfg, category)) return { ok: false, skipped: true };
        const tgConfig = {
            botToken: cfg.telegramBotToken,
            chatIds: cfg.telegramChatIds,
            timeoutMs: cfg.telegramTimeoutMs
        };
        if (!telegramService.isEnabled(tgConfig)) return { ok: false, skipped: true, reason: 'telegram_not_configured' };
        const text = formatPayload(category, title, payload);
        return await telegramService.sendMessage(text, tgConfig);
    } catch (err) {
        logger.warn('system event notify failed', { error: err.message || String(err), category, title });
        return { ok: false, error: err.message || String(err) };
    }
}

module.exports = {
    notifySystemEvent
};


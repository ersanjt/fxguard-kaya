const { getPanelSettings, getPanelAlertConfig } = require('./config/panelSettingsLoader');
const telegramService = require('./telegramService');
const logger = require('../config/logger');
const { evaluateSystemEventTelegram, shouldSkipTelegramDedupe } = require('./incidentTelegramPolicy');

const CACHE_TTL_MS = 10000;
let cachedConfig = null;
let cachedAt = 0;

/** Legacy “notify all” gate for non-critical operational chatter (mostly unused after incident policy). */
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

function isTelegramCategoryAllowed(cfg, category, decision) {
    if (decision && decision.bypassCategory && decision.severity === 'CRITICAL') {
        return true;
    }
    if (decision && decision.bypassCategory) {
        if (category === 'error') return cfg.telegramNotifyErrorEvents !== false;
        if (category === 'system') return cfg.telegramNotifySystemEvents !== false;
        if (category === 'message') return cfg.telegramNotifyIncomingMessages !== false;
        return cfg.telegramNotifySystemEvents !== false;
    }
    return isCategoryEnabled(cfg, category);
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
        const decision = evaluateSystemEventTelegram(category, title, payload);
        if (decision.mode === 'skip') return { ok: false, skipped: true, reason: 'incident_policy' };

        if (decision.notifyMainAdmins && decision.text) {
            try {
                const { notifyMainAdminsIncident } = require('./mainAdminIncidentNotifier');
                await notifyMainAdminsIncident({
                    severity: decision.severity,
                    kind: `system_event:${String(title).slice(0, 120)}`,
                    title,
                    bodyText: decision.text,
                    correlationId: decision.correlationId || null,
                    dedupeKey: decision.mainAdminDedupeKey || null,
                    dedupeWindowMs: decision.mainAdminDedupeWindowMs
                });
            } catch (e) {
                logger.warn('main admin incident notify failed', {
                    error: e.message || String(e),
                    category,
                    title
                });
            }
        }

        const cfg = await getConfig();
        const tgConfig = {
            botToken: cfg.telegramBotToken,
            chatIds: cfg.telegramChatIds,
            timeoutMs: cfg.telegramTimeoutMs
        };
        if (!telegramService.isEnabled(tgConfig)) {
            return { ok: true, skipped: true, reason: 'telegram_not_configured' };
        }

        if (!isTelegramCategoryAllowed(cfg, category, decision)) {
            return { ok: false, skipped: true, reason: 'category_disabled' };
        }

        if (decision.mode === 'send' && decision.text) {
            if (
                decision.dedupeKey &&
                decision.severity !== 'CRITICAL' &&
                shouldSkipTelegramDedupe(decision.dedupeKey, decision.dedupeWindowMs)
            ) {
                return { ok: false, skipped: true, reason: 'telegram_deduped' };
            }
            return await telegramService.sendMessage(decision.text, tgConfig, { parse_mode: null });
        }

        return { ok: false, skipped: true, reason: 'no_telegram_body' };
    } catch (err) {
        logger.warn('system event notify failed', { error: err.message || String(err), category, title });
        return { ok: false, error: err.message || String(err) };
    }
}

module.exports = {
    notifySystemEvent
};

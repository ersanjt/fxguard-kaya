const axios = require('axios');
const logger = require('../config/logger');

function getBotToken(config = null) {
    if (config && config.botToken) return String(config.botToken).trim();
    return (process.env.TELEGRAM_BOT_TOKEN || '').trim();
}

function getChatIds(config = null) {
    const raw = config && config.chatIds != null ? config.chatIds : process.env.TELEGRAM_CHAT_IDS;
    if (Array.isArray(raw)) return raw.map(s => String(s).trim()).filter(Boolean);
    const str = String(raw || '').trim();
    if (!str) return [];
    return str
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
}

function getTimeoutMs(config = null) {
    const raw = config && config.timeoutMs != null ? config.timeoutMs : process.env.TELEGRAM_TIMEOUT_MS;
    const n = parseInt(String(raw || '12000'), 10);
    if (Number.isNaN(n)) return 12000;
    return Math.max(1000, n);
}

function isEnabled(config = null) {
    return !!(getBotToken(config) && getChatIds(config).length > 0);
}

async function sendMessage(text, config = null, opts = {}) {
    const token = getBotToken(config);
    const chatIds = getChatIds(config);
    if (!token || chatIds.length === 0) return { ok: false, error: 'Telegram not configured' };

    const payloadText = String(text || '');
    const timeoutMs = getTimeoutMs(config);
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const parseMode = opts.parse_mode || 'HTML';
    const results = await Promise.allSettled(
        chatIds.map(chat_id =>
            axios.post(
                url,
                {
                    chat_id,
                    text: payloadText,
                    parse_mode: parseMode,
                    disable_web_page_preview: true
                },
                { timeout: timeoutMs }
            )
        )
    );

    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
        logger.warn('Telegram notify partial failure', { failed: failed.length, total: results.length });
        return { ok: failed.length < results.length, error: failed[0].reason?.message || 'Telegram send failed' };
    }

    return { ok: true };
}

module.exports = {
    isEnabled,
    sendMessage
};

const axios = require('axios');
const logger = require('../config/logger');

const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;

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

    let payloadText = String(text || '');
    if (payloadText.length > TELEGRAM_MAX_MESSAGE_LENGTH) {
        logger.warn('Telegram sendMessage text truncated to API limit', { length: payloadText.length });
        payloadText = payloadText.slice(0, TELEGRAM_MAX_MESSAGE_LENGTH - 24) + '\n… (متن کوتاه شد)';
    }
    const timeoutMs = getTimeoutMs(config);
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const parseMode = opts.parse_mode || 'HTML';
    const results = await Promise.allSettled(
        chatIds.map(async chat_id => {
            const res = await axios.post(
                url,
                {
                    chat_id,
                    text: payloadText,
                    parse_mode: parseMode,
                    disable_web_page_preview: true
                },
                { timeout: timeoutMs }
            );
            const d = res.data;
            if (!d || d.ok !== true) {
                const msg = (d && d.description) || 'Telegram sendMessage not ok';
                throw new Error(msg);
            }
            return res;
        })
    );

    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
        logger.warn('Telegram notify partial failure', { failed: failed.length, total: results.length });
        const first = failed[0];
        const reasonMsg =
            first.status === 'rejected' && first.reason && first.reason.message
                ? first.reason.message
                : 'Telegram send failed';
        return { ok: failed.length < results.length, error: reasonMsg };
    }

    return { ok: true };
}

module.exports = {
    isEnabled,
    sendMessage
};

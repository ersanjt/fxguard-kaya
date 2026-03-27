const axios = require('axios');
const logger = require('../config/logger');

const TELEGRAM_TIMEOUT_MS = parseInt(process.env.TELEGRAM_TIMEOUT_MS || '12000', 10);

function getBotToken() {
    return (process.env.TELEGRAM_BOT_TOKEN || '').trim();
}

function getChatIds() {
    const raw = (process.env.TELEGRAM_CHAT_IDS || '').trim();
    if (!raw) return [];
    return raw
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
}

function isEnabled() {
    return !!(getBotToken() && getChatIds().length > 0);
}

function toSafeText(value) {
    return String(value == null ? '' : value)
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

async function sendMessage(text) {
    const token = getBotToken();
    const chatIds = getChatIds();
    if (!token || chatIds.length === 0) return { ok: false, error: 'Telegram not configured' };

    const payloadText = toSafeText(text || '');
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const results = await Promise.allSettled(
        chatIds.map(chat_id =>
            axios.post(
                url,
                {
                    chat_id,
                    text: payloadText,
                    parse_mode: 'HTML',
                    disable_web_page_preview: true
                },
                { timeout: TELEGRAM_TIMEOUT_MS }
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

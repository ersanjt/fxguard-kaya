/**
 * HTTP client for WhatsApp Gateway — تنظیمات از پنل یا .env
 * اگر WhatsApp Cloud API تنظیم شده باشد، ارسال پیام از طریق Meta انجام می‌شود
 */
const axios = require('axios');
const whatsappCloud = require('./whatsappCloudApi');
const { getWhatsappConnectionConfig } = require('./whatsappConnectionLoader');

/** برای سازگاری — مقدار پیش‌فرض env */
function getDefaultGatewayUrl() {
    return (process.env.GATEWAY_URL || 'http://localhost:3001').replace(/\/$/, '');
}

function getGatewayHeadersFromConfig(cfg) {
    const headers = { 'Content-Type': 'application/json' };
    const secret = (cfg?.gatewayApiSecret || '').trim();
    if (secret) headers['X-Gateway-Secret'] = secret;
    return headers;
}

async function gatewayGet(path, options = {}) {
    const cfg = await getWhatsappConnectionConfig();
    const url = (cfg.gatewayUrl || getDefaultGatewayUrl()).replace(/\/$/, '');
    return axios.get(url + path, {
        timeout: options.timeout || 5000,
        headers: getGatewayHeadersFromConfig(cfg),
        ...options,
    });
}

async function gatewayPost(path, data, options = {}) {
    const cfg = await getWhatsappConnectionConfig();
    const url = (cfg.gatewayUrl || getDefaultGatewayUrl()).replace(/\/$/, '');
    return axios.post(url + path, data, {
        timeout: options.timeout || 10000,
        headers: getGatewayHeadersFromConfig(cfg),
        ...options,
    });
}

/**
 * ارسال پیام واتساپ — بر اساس connectionMode و تنظیمات
 * cloud_only: فقط Cloud API | gateway_only: فقط Gateway | cloud_first: اول Cloud، وگرنه Gateway
 * @param {object} payload - { to, message, media?, replyTo? }
 * @returns {Promise<{data: {messageId: string}}>}
 */
async function sendWhatsAppMessage(payload, options = {}) {
    const cfg = await getWhatsappConnectionConfig();
    const cloudOk = cfg.cloudEnabled && cfg.cloudAccessToken && cfg.cloudPhoneNumberId;
    const mode = cfg.connectionMode || 'cloud_first';

    if (mode === 'gateway') {
        return gatewayPost('/api/send-message', payload, options);
    }
    if (mode === 'cloud_first') {
        if (cloudOk) {
            const res = await whatsappCloud.sendMessage(payload);
            return { data: { messageId: res.messageId } };
        }
        return gatewayPost('/api/send-message', payload, options);
    }
    if (mode === 'cloud') {
        if (cloudOk) {
            const res = await whatsappCloud.sendMessage(payload);
            return { data: { messageId: res.messageId } };
        }
        return gatewayPost('/api/send-message', payload, options);
    }
    return gatewayPost('/api/send-message', payload, options);
}

/** async — آیا Cloud API فعال است؟ */
async function isCloudApiConfigured() {
    return whatsappCloud.isConfigured();
}

/** برای سازگاری — GATEWAY_URL پیش‌فرض (sync) */
const GATEWAY_URL = getDefaultGatewayUrl();

module.exports = {
    GATEWAY_URL,
    getGatewayHeaders: (cfg) => getGatewayHeadersFromConfig(cfg || {}),
    gatewayGet,
    gatewayPost,
    sendWhatsAppMessage,
    isCloudApiConfigured,
    getWhatsappConnectionConfig,
};

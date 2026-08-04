/**
 * HTTP client for WhatsApp Gateway — تنظیمات از پنل یا .env
 * اگر WhatsApp Cloud API تنظیم شده باشد، ارسال پیام از طریق Meta انجام می‌شود
 * با چند شماره: زنجیره Failover از services/whatsappNumbers
 */
const axios = require('axios');
const whatsappCloud = require('./whatsappCloudApi');
const { getWhatsappConnectionConfig } = require('./whatsappConnectionLoader');
const {
    buildTemplatePayload,
    isMetaReengagementError,
} = require('./whatsappOutboundPolicy');
const { isLikelyWhatsAppLid, isGroupJid } = require('./phoneUtils');

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
    const cfg = options.cfg || (await getWhatsappConnectionConfig());
    const url = (cfg.gatewayUrl || getDefaultGatewayUrl()).replace(/\/$/, '');
    return axios.get(url + path, {
        timeout: options.timeout || 5000,
        headers: getGatewayHeadersFromConfig(cfg),
    });
}

async function gatewayPost(path, data, options = {}) {
    const cfg = options.cfg || (await getWhatsappConnectionConfig());
    const url = (cfg.gatewayUrl || getDefaultGatewayUrl()).replace(/\/$/, '');
    return axios.post(url + path, data, {
        timeout: options.timeout || 10000,
        headers: getGatewayHeadersFromConfig(cfg),
    });
}

async function sendCloudMessage(payload, cfg) {
    try {
        const res = await whatsappCloud.sendMessage(payload, cfg);
        return { data: { messageId: res.messageId, viaTemplate: !!payload.templateName } };
    } catch (err) {
        if (!payload.templateName && !payload.media && isMetaReengagementError(err)) {
            const tplPayload = buildTemplatePayload(payload, payload.message, cfg);
            if (tplPayload) {
                const res = await whatsappCloud.sendMessage(tplPayload, cfg);
                return { data: { messageId: res.messageId, viaTemplate: true, retriedAsTemplate: true } };
            }
        }
        throw err;
    }
}

/** PTT voice notes need Gateway (sendAudioAsVoice); Cloud API only sends plain audio files. */
function isVoiceOutboundPayload(payload) {
    const media = payload?.media;
    if (!media) return false;
    if (media.sendAsVoice) return true;
    const mime = String(media.mimetype || media.type || '').toLowerCase();
    return mime.startsWith('audio/') && (mime.includes('ogg') || mime.includes('opus') || media.type === 'audio');
}

/**
 * ارسال با یک کانفیگ مشخص (یک اسلات شماره)
 */
async function sendWhatsAppMessageWithConfig(payload, cfg, options = {}) {
    const cloudOk = cfg.cloudEnabled && cfg.cloudAccessToken && cfg.cloudPhoneNumberId;
    const mode = cfg.connectionMode || 'cloud_first';
    const wantsTemplate = !!(payload?.templateName);
    const gwOk = cfg.gatewayEnabled !== false && !!(cfg.gatewayUrl || getDefaultGatewayUrl());
    const isVoice = isVoiceOutboundPayload(payload);
    const toStr = String(payload?.to || '');
    const forceGateway = isGroupJid(toStr) || isLikelyWhatsAppLid(toStr) || /@lid\b/i.test(toStr);
    const gwOpts = { ...options, cfg };

    if (wantsTemplate) {
        if (!cloudOk) throw new Error('Cloud API template send requires Meta Cloud configuration');
        return sendCloudMessage(payload, cfg);
    }

    if ((isVoice || forceGateway) && gwOk && mode !== 'cloud') {
        return gatewayPost('/api/send-message', payload, gwOpts);
    }
    if (forceGateway && gwOk) {
        return gatewayPost('/api/send-message', payload, gwOpts);
    }
    if (forceGateway && !gwOk) {
        throw new Error('این مخاطب شناسهٔ واتساپ (LID/گروه) دارد و فقط از طریق Gateway قابل ارسال است');
    }

    if (mode === 'gateway') {
        return gatewayPost('/api/send-message', payload, gwOpts);
    }
    if (mode === 'cloud_first') {
        if (cloudOk) {
            try {
                return await sendCloudMessage(payload, cfg);
            } catch (cloudErr) {
                if (gwOk) {
                    return gatewayPost('/api/send-message', payload, gwOpts);
                }
                throw cloudErr;
            }
        }
        return gatewayPost('/api/send-message', payload, gwOpts);
    }
    if (mode === 'cloud') {
        if (cloudOk) {
            try {
                return await sendCloudMessage(payload, cfg);
            } catch (cloudErr) {
                if (gwOk) {
                    return gatewayPost('/api/send-message', payload, gwOpts);
                }
                throw cloudErr;
            }
        }
        if (gwOk) return gatewayPost('/api/send-message', payload, gwOpts);
        throw new Error('WhatsApp Cloud API not configured');
    }
    return gatewayPost('/api/send-message', payload, gwOpts);
}

/**
 * ارسال پیام واتساپ — بر اساس connectionMode و در صورت وجود، Failover چندشماره
 * @param {object} payload - { to, message, media?, replyTo? }
 * @param {object} [options]
 * @param {string} [options.preferredNumberId] - ترجیح اسلات خاص (sticky)
 * @returns {Promise<{data: {messageId: string, viaNumberId?: string, viaSlotKey?: string}}>}
 */
async function sendWhatsAppMessage(payload, options = {}) {
    let chain;
    let markResult = async () => {};
    try {
        const numbersSvc = require('../services/whatsappNumbers');
        chain = await numbersSvc.resolveOutboundNumberChain({
            preferredNumberId: options.preferredNumberId || payload?.preferredNumberId || null,
        });
        markResult = numbersSvc.markNumberResult;
    } catch (_) {
        const cfg = await getWhatsappConnectionConfig();
        chain = [{ cfg, number: null }];
    }

    let lastErr = null;
    for (let i = 0; i < chain.length; i += 1) {
        const entry = chain[i];
        const numberId = entry.number && entry.number.id;
        try {
            const result = await sendWhatsAppMessageWithConfig(payload, entry.cfg, options);
            await markResult(numberId, { ok: true });
            if (result && result.data) {
                result.data.viaNumberId = numberId || undefined;
                result.data.viaSlotKey = entry.cfg._slotKey || undefined;
                result.data.viaRole = entry.cfg._role || undefined;
                if (i > 0) result.data.failedOver = true;
            }
            return result;
        } catch (err) {
            lastErr = err;
            await markResult(numberId, { ok: false, error: err.message || String(err) });
        }
    }
    throw lastErr || new Error('WhatsApp send failed');
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
    sendWhatsAppMessageWithConfig,
    isCloudApiConfigured,
    getWhatsappConnectionConfig,
};

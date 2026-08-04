/**
 * WhatsApp Business Cloud API client
 * برای ارسال پیام و دریافت وب‌هوک از Meta
 * تنظیمات از پنل (DB) یا .env
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api
 */
const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const FormData = require('form-data');
const { getWhatsappConnectionConfig, isCloudApiConfigured: isCloudConfigured } = require('./whatsappConnectionLoader');

const API_BASE = 'https://graph.facebook.com/v18.0';

/** sync — برای سازگاری؛ فقط env چک می‌کند */
function isConfiguredSync() {
    const t = (process.env.WHATSAPP_CLOUD_ACCESS_TOKEN || '').trim();
    const p = (process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID || '').trim();
    return !!(t && p);
}

/** async — از پنل یا env؛ آیا Cloud API فعال و تنظیم است؟ */
async function isConfigured() {
    return isCloudConfigured();
}

/**
 * @param {object|null} [cfgOverride] — تنظیمات اسلات شماره (failover)
 */
async function _getConfig(cfgOverride) {
    if (cfgOverride && cfgOverride.cloudAccessToken && cfgOverride.cloudPhoneNumberId) {
        return {
            cloudEnabled: cfgOverride.cloudEnabled !== false,
            cloudAccessToken: cfgOverride.cloudAccessToken,
            cloudPhoneNumberId: cfgOverride.cloudPhoneNumberId,
            cloudVerifyToken: cfgOverride.cloudVerifyToken || '',
        };
    }
    const c = await getWhatsappConnectionConfig();
    if (!c.cloudEnabled || !c.cloudAccessToken || !c.cloudPhoneNumberId) return null;
    return c;
}

async function sendText(to, text, cfgOverride) {
    const cfg = await _getConfig(cfgOverride);
    if (!cfg) throw new Error('WhatsApp Cloud API not configured');
    const phone = String(to).replace(/\D/g, '').replace(/^0/, '');
    if (!phone) throw new Error('Invalid phone number');

    const res = await axios.post(
        `${API_BASE}/${cfg.cloudPhoneNumberId}/messages`,
        {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: phone,
            type: 'text',
            text: { body: text || '' },
        },
        {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${cfg.cloudAccessToken}`,
            },
            timeout: 15000,
        }
    );

    const msgId = res.data?.messages?.[0]?.id || null;
    if (!msgId) throw new Error('No message ID in response');
    return { messageId: msgId };
}

function normalizeCloudPhone(to) {
    const phone = String(to).replace(/\D/g, '').replace(/^0/, '');
    if (!phone) throw new Error('Invalid phone number');
    return phone;
}

/**
 * ارسال پیام قالب (Template) — برای ارسال انبوه و پیام‌های خارج از پنجره ۲۴ ساعته
 * @param {string} to
 * @param {string} templateName - نام قالب تأییدشده در Meta
 * @param {string} languageCode - مثلاً fa, en_US
 * @param {Array<{type:string, parameters:Array}>|null} components
 */
async function sendTemplate(to, templateName, languageCode = 'fa', components = null, cfgOverride) {
    const cfg = await _getConfig(cfgOverride);
    if (!cfg) throw new Error('WhatsApp Cloud API not configured');
    const name = String(templateName || '').trim();
    if (!name) throw new Error('Template name is required');
    const phone = normalizeCloudPhone(to);
    const lang = String(languageCode || 'fa').trim() || 'fa';

    const template = { name, language: { code: lang } };
    if (Array.isArray(components) && components.length) template.components = components;

    const res = await axios.post(
        `${API_BASE}/${cfg.cloudPhoneNumberId}/messages`,
        {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: phone,
            type: 'template',
            template,
        },
        {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${cfg.cloudAccessToken}`,
            },
            timeout: 20000,
        }
    );

    const msgId = res.data?.messages?.[0]?.id || null;
    if (!msgId) throw new Error('No message ID in response');
    return { messageId: msgId };
}

/** ساخت components.body از آرایه پارامترها */
function buildBodyTemplateComponents(bodyParams) {
    const params = (bodyParams || [])
        .map((p) => String(p ?? '').trim())
        .filter((p) => p.length > 0)
        .map((text) => ({ type: 'text', text }));
    if (!params.length) return null;
    return [{ type: 'body', parameters: params }];
}

/**
 * اعتبارسنجی Token و Phone Number ID با Meta Graph API
 */
async function verifyCredentials() {
    const cfg = await _getConfig();
    if (!cfg) {
        return { ok: false, error: 'not_configured', checks: { token: false, phoneId: false } };
    }
    try {
        const res = await axios.get(`${API_BASE}/${cfg.cloudPhoneNumberId}`, {
            headers: { Authorization: `Bearer ${cfg.cloudAccessToken}` },
            params: { fields: 'verified_name,display_phone_number,quality_rating' },
            timeout: 12000,
            validateStatus: () => true,
        });
        if (res.status >= 200 && res.status < 300) {
            return {
                ok: true,
                displayPhone: res.data?.display_phone_number || null,
                verifiedName: res.data?.verified_name || null,
                qualityRating: res.data?.quality_rating?.score || null,
                checks: { token: true, phoneId: true },
            };
        }
        const errMsg = res.data?.error?.message || `HTTP ${res.status}`;
        return { ok: false, error: errMsg, checks: { token: false, phoneId: false } };
    } catch (e) {
        return {
            ok: false,
            error: e.response?.data?.error?.message || e.message || 'verify_failed',
            checks: { token: false, phoneId: false },
        };
    }
}

function normalizeCloudMediaMime(mimetype) {
    const base = String(mimetype || '').split(';')[0].trim().toLowerCase();
    if (!base) return 'application/octet-stream';
    if (base === 'audio/ogg' || base.includes('opus')) return 'audio/ogg';
    return base;
}

/**
 * ارسال رسانه (تصویر، صوت، ویدئو، سند)
 * Meta Cloud API فقط URL عمومی را می‌پذیرد — برای base64 ابتدا در uploads ذخیره و BACKEND_PUBLIC_URL استفاده کنید
 */
async function sendMedia(to, media, caption = '', cfgOverride) {
    const cfg = await _getConfig(cfgOverride);
    if (!cfg) throw new Error('WhatsApp Cloud API not configured');
    const phone = String(to).replace(/\D/g, '').replace(/^0/, '');
    if (!phone) throw new Error('Invalid phone number');

    let mediaUrl = null;
    let mediaId = null;
    const baseUrl = (process.env.BACKEND_PUBLIC_URL || process.env.GATEWAY_URL || 'http://localhost:3002').replace(/\/$/, '');
    async function uploadBufferToCloud(buffer, opts = {}) {
        if (!buffer || !buffer.length) throw new Error('Empty media buffer');
        const form = new FormData();
        form.append('messaging_product', 'whatsapp');
        form.append('file', buffer, {
            filename: opts.filename || 'file',
            contentType: opts.mimetype || 'application/octet-stream',
        });
        if (opts.mimetype) form.append('type', opts.mimetype);
        const upRes = await axios.post(`${API_BASE}/${cfg.cloudPhoneNumberId}/media`, form, {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${cfg.cloudAccessToken}`,
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            timeout: 30000,
        });
        const id = upRes?.data?.id;
        if (!id) throw new Error('Cloud media upload failed: no media id');
        return id;
    }
    if (media?.url && (media.url.startsWith('http://') || media.url.startsWith('https://'))) {
        mediaUrl = media.url;
    } else if (media?.url && media.url.startsWith('/uploads/')) {
        // اولویت: آپلود مستقیم در Meta با media_id (پایدارتر از link)
        try {
            const uploadsDir = path.join(__dirname, '..', 'uploads');
            const rel = String(media.url).replace(/^\/uploads\/?/, '').replace(/^\/+/, '');
            const localPath = path.resolve(uploadsDir, rel);
            const root = path.resolve(uploadsDir);
            if (localPath.startsWith(root + path.sep) || localPath === root) {
                const buf = await fs.readFile(localPath);
                mediaId = await uploadBufferToCloud(buf, {
                    filename: media.filename || path.basename(localPath) || 'file',
                    mimetype: normalizeCloudMediaMime(media.mimetype),
                });
            } else {
                mediaUrl = baseUrl + media.url;
            }
        } catch (_e) {
            mediaUrl = baseUrl + media.url;
        }
    } else if (media?.data) {
        const buf = Buffer.from(media.data, 'base64');
        mediaId = await uploadBufferToCloud(buf, {
            filename: media.filename || 'file',
            mimetype: normalizeCloudMediaMime(media.mimetype),
        });
    }
    if (!mediaId && !mediaUrl) throw new Error('Media must have url or data');

    const normMime = normalizeCloudMediaMime(media?.mimetype);
    let type = 'document';
    if (normMime.startsWith('image/')) type = 'image';
    else if (normMime.startsWith('audio/') || media?.sendAsVoice) type = 'audio';
    else if (normMime.startsWith('video/')) type = 'video';

    const mediaPayload = mediaId ? { id: mediaId } : { link: mediaUrl };
    if (type === 'document' && media?.filename) mediaPayload.filename = media.filename;

    const cap = caption && String(caption).trim();
    if (cap && type !== 'audio') mediaPayload.caption = cap;

    const body = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type,
        [type]: mediaPayload,
    };

    const res = await axios.post(`${API_BASE}/${cfg.cloudPhoneNumberId}/messages`, body, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cfg.cloudAccessToken}`,
        },
        timeout: 20000,
    });

    const msgId = res.data?.messages?.[0]?.id || null;
    if (!msgId) throw new Error('No message ID in response');
    return { messageId: msgId };
}

/**
 * ارسال پیام (متن یا رسانه) — سازگار با gateway send-message
 * @param {object} payload - { to, message, media }
 * @param {object} [cfgOverride] - تنظیمات Cloud برای اسلات failover
 */
async function sendMessage(payload, cfgOverride) {
    const { to, message, media, templateName, templateLanguage, templateBodyParams, templateComponents } = payload || {};
    if (!to) throw new Error('Missing "to"');

    if (templateName) {
        const components = templateComponents || buildBodyTemplateComponents(
            templateBodyParams || (message ? [message] : [])
        );
        return sendTemplate(to, templateName, templateLanguage || 'fa', components, cfgOverride);
    }

    if (media && (media.url || media.data)) {
        const cap = media.sendAsVoice ? '' : (message || '');
        return sendMedia(to, media, cap, cfgOverride);
    }
    return sendText(to, message || '', cfgOverride);
}

/**
 * دانلود فایل رسانه از Cloud API
 */
async function downloadMedia(mediaId) {
    const cfg = await _getConfig();
    if (!cfg) throw new Error('WhatsApp Cloud API not configured');
    const urlRes = await axios.get(`${API_BASE}/${mediaId}`, {
        headers: { Authorization: `Bearer ${cfg.cloudAccessToken}` },
        timeout: 10000,
    });
    const url = urlRes.data?.url;
    if (!url) throw new Error('No media URL in response');
    const dataRes = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: { Authorization: `Bearer ${cfg.cloudAccessToken}` },
        timeout: 30000,
    });
    return {
        data: Buffer.from(dataRes.data).toString('base64'),
        mimetype: dataRes.headers['content-type'] || 'application/octet-stream',
    };
}

/**
 * تبدیل payload وب‌هوک Meta به فرمت داخلی (سازگار با processIncomingMessage)
 */
function transformCloudWebhookToInternal(entry) {
    const value = entry?.changes?.[0]?.value;
    if (!value || !value.messages) return [];

    const messages = value.messages || [];
    const contacts = (value.contacts || []).reduce((acc, c) => {
        if (c.wa_id) acc[c.wa_id] = c;
        return acc;
    }, {});

    return messages
        .filter((m) => {
            const t = (m.type || '').toLowerCase();
            return !['reaction', 'unsupported'].includes(t);
        })
        .map((m) => {
            const from = String(m.from || '');
            const contact = contacts[from] || {};
            const name = contact?.profile?.name || null;
            let body = '';
            let media = null;
            let hasMedia = false;
            let msgType = (m.type || 'text').toLowerCase();

            if (m.text) {
                body = m.text.body || '';
            }
            if (m.image || m.audio || m.video || m.document || m.voice) {
                hasMedia = true;
                const mediaObj = m.image || m.audio || m.video || m.document || m.voice;
                media = { id: mediaObj.id, mimetype: mediaObj.mime_type, caption: mediaObj.caption };
                if (mediaObj.caption) body = mediaObj.caption;
            }
            if (m.interactive) {
                const btn = m.interactive?.button_reply || m.interactive?.list_reply;
                body = btn?.title || btn?.description || JSON.stringify(m.interactive);
            }
            if (m.button) {
                body = m.button.text || '';
            }
            if (msgType === 'unknown') msgType = 'text';

            return {
                id: m.id,
                from: `${from}@c.us`,
                to: value.metadata?.phone_number_id ? `${value.metadata.phone_number_id}` : null,
                body,
                timestamp: parseInt(m.timestamp || '0', 10),
                hasMedia,
                type: msgType,
                isForwarded: !!m.forwarded,
                isStatus: false,
                fromMe: false,
                contact: { number: from, name },
                chat: { id: `${from}@c.us`, name, isGroup: false },
                author: null,
                authorName: null,
                media,
                _cloudMediaId: media?.id,
            };
        });
}

/** برای نمایش در UI — Phone Number ID (ممکن است از env باشد) */
async function getPhoneNumberId() {
    const cfg = await getWhatsappConnectionConfig();
    return cfg.cloudPhoneNumberId || '';
}

module.exports = {
    isConfigured,
    isConfiguredSync,
    sendText,
    sendTemplate,
    sendMedia,
    sendMessage,
    downloadMedia,
    transformCloudWebhookToInternal,
    getPhoneNumberId,
    verifyCredentials,
    buildBodyTemplateComponents,
    API_BASE,
};

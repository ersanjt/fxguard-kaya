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

async function _getConfig() {
    const c = await getWhatsappConnectionConfig();
    if (!c.cloudEnabled || !c.cloudAccessToken || !c.cloudPhoneNumberId) return null;
    return c;
}

/**
 * ارسال پیام متنی
 * @param {string} to - شماره بدون + (مثلاً 989121234567)
 * @param {string} text - متن پیام
 * @returns {Promise<{messageId: string}>}
 */
async function sendText(to, text) {
    const cfg = await _getConfig();
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

/**
 * ارسال رسانه (تصویر، صوت، ویدئو، سند)
 * Meta Cloud API فقط URL عمومی را می‌پذیرد — برای base64 ابتدا در uploads ذخیره و BACKEND_PUBLIC_URL استفاده کنید
 */
async function sendMedia(to, media, caption = '') {
    const cfg = await _getConfig();
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
                    mimetype: (media.mimetype || '').split(';')[0].trim() || 'application/octet-stream',
                });
            } else {
                mediaUrl = baseUrl + media.url;
            }
        } catch (_e) {
            mediaUrl = baseUrl + media.url;
        }
    } else if (media?.data) {
        const mime = (media.mimetype || 'application/octet-stream').split(';')[0].trim().toLowerCase();
        const buf = Buffer.from(media.data, 'base64');
        mediaId = await uploadBufferToCloud(buf, {
            filename: media.filename || 'file',
            mimetype: mime || 'application/octet-stream',
        });
    }
    if (!mediaId && !mediaUrl) throw new Error('Media must have url or data');

    const mime = (media?.mimetype || '').toLowerCase();
    let type = 'document';
    if (mime.startsWith('image/')) type = 'image';
    else if (mime.startsWith('audio/') || mime.includes('ogg') || mime.includes('opus')) type = 'audio';
    else if (mime.startsWith('video/')) type = 'video';

    const mediaPayload = mediaId ? { id: mediaId } : { link: mediaUrl };
    if (media?.filename) mediaPayload.filename = media.filename;

    const body = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type,
        [type]: mediaPayload,
    };
    if (caption && String(caption).trim()) body.caption = String(caption).trim();

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
 */
async function sendMessage(payload) {
    const { to, message, media } = payload || {};
    if (!to) throw new Error('Missing "to"');

    if (media && (media.url || media.data)) {
        return sendMedia(to, media, message || '');
    }
    return sendText(to, message || '');
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
    sendMedia,
    sendMessage,
    downloadMedia,
    transformCloudWebhookToInternal,
    getPhoneNumberId,
    API_BASE,
};

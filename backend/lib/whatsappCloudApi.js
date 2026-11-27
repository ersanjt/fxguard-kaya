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
const { describeCloudConfigGap } = require('./cloudConfigGap');

// Meta Graph API v18.0 از ژانویه ۲۰۲۶ منقضی شده؛ نسخه قابل تنظیم است.
const requestedGraphVersion = String(process.env.WHATSAPP_CLOUD_GRAPH_API_VERSION || '').trim();
const graphVersion = /^v\d+\.\d+$/.test(requestedGraphVersion) ? requestedGraphVersion : 'v26.0';
const API_BASE = `https://graph.facebook.com/${graphVersion}`;

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

const PHONE_VERIFY_FIELDS = [
    'verified_name',
    'display_phone_number',
    'quality_rating',
    'code_verification_status',
    'name_status',
    'messaging_limit_tier',
    'is_on_biz_app',
    'platform_type',
].join(',');

/** Meta کیفیت را رشته (GREEN/YELLOW/RED) برمی‌گرداند؛ شکل قدیمی آبجکت هم پذیرفته می‌شود. */
function readQualityRating(data) {
    const q = data?.quality_rating;
    if (q == null || q === '') return null;
    if (typeof q === 'string') return q;
    if (typeof q === 'object') return q.score || q.event || null;
    return null;
}

/**
 * اعتبارسنجی Token و Phone Number ID با Meta Graph API
 */
async function verifyCredentials() {
    const raw = await getWhatsappConnectionConfig();
    const gap = describeCloudConfigGap(raw);
    if (gap) return gap;
    const cfg = await _getConfig();
    if (!cfg) {
        return { ok: false, error: 'not_configured', checks: { token: false, phoneId: false } };
    }
    try {
        const res = await axios.get(`${API_BASE}/${cfg.cloudPhoneNumberId}`, {
            headers: { Authorization: `Bearer ${cfg.cloudAccessToken}` },
            params: { fields: PHONE_VERIFY_FIELDS },
            timeout: 12000,
            validateStatus: () => true,
        });
        if (res.status >= 200 && res.status < 300) {
            const data = res.data || {};
            const isOnBizApp = data.is_on_biz_app === true;
            const platformType = data.platform_type || null;
            return {
                ok: true,
                displayPhone: data.display_phone_number || null,
                verifiedName: data.verified_name || null,
                qualityRating: readQualityRating(data),
                codeVerificationStatus: data.code_verification_status || null,
                nameStatus: data.name_status || null,
                messagingLimitTier: data.messaging_limit_tier || null,
                isOnBizApp,
                platformType,
                coexistence: isOnBizApp,
                checks: { token: true, phoneId: true },
            };
        }
        const errMsg = res.data?.error?.message || `HTTP ${res.status}`;
        const errCode = res.data?.error?.code ?? null;
        return { ok: false, error: errMsg, code: errCode, checks: { token: false, phoneId: false } };
    } catch (e) {
        return {
            ok: false,
            error: e.response?.data?.error?.message || e.message || 'verify_failed',
            code: e.response?.data?.error?.code ?? null,
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
    if (type === 'audio' && media?.sendAsVoice) mediaPayload.voice = true;

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

function digitsOnly(value) {
    return String(value || '').replace(/\D/g, '');
}

function mapCloudMessageBody(m) {
    let body = '';
    let media = null;
    let hasMedia = false;
    let msgType = String(m?.type || 'text').toLowerCase();

    if (m?.text) body = m.text.body || '';
    if (m?.image || m?.audio || m?.video || m?.document || m?.voice || m?.sticker) {
        hasMedia = true;
        const mediaObj = m.image || m.audio || m.video || m.document || m.voice || m.sticker;
        media = { id: mediaObj.id, mimetype: mediaObj.mime_type, caption: mediaObj.caption };
        if (mediaObj.caption) body = mediaObj.caption;
    }
    if (m?.interactive) {
        const btn = m.interactive?.button_reply || m.interactive?.list_reply;
        body = btn?.title || btn?.description || JSON.stringify(m.interactive);
    }
    if (m?.button) body = m.button.text || '';
    if (msgType === 'media_placeholder') {
        body = body || '[media]';
        hasMedia = false;
        media = null;
    }
    if (msgType === 'unknown') msgType = 'text';

    return { body, media, hasMedia, msgType };
}

function buildInternalCloudMessage({
    m,
    peerPhone,
    contactName,
    phoneNumberId,
    fromMe,
    source,
}) {
    const peer = digitsOnly(peerPhone);
    if (!peer) return null;
    const t = String(m?.type || '').toLowerCase();
    if (['reaction', 'unsupported'].includes(t)) return null;

    const { body, media, hasMedia, msgType } = mapCloudMessageBody(m);
    const peerJid = `${peer}@c.us`;

    return {
        id: m.id,
        from: fromMe ? (phoneNumberId ? String(phoneNumberId) : 'me') : peerJid,
        to: fromMe ? peerJid : phoneNumberId ? String(phoneNumberId) : null,
        phoneNumberId: phoneNumberId ? String(phoneNumberId) : null,
        body,
        timestamp: parseInt(m.timestamp || '0', 10),
        hasMedia,
        type: msgType,
        isForwarded: !!m.forwarded,
        isStatus: false,
        fromMe: !!fromMe,
        contact: { number: peer, name: contactName || null },
        chat: { id: peerJid, name: contactName || null, isGroup: false },
        author: null,
        authorName: null,
        media,
        _cloudMediaId: media?.id || null,
        _cloudSource: source || 'messages',
    };
}

function contactsByWaId(value) {
    return (value?.contacts || []).reduce((acc, c) => {
        if (c.wa_id) acc[String(c.wa_id)] = c;
        return acc;
    }, {});
}

/** رسیدهای sent/delivered/read/failed داخل همان webhook فیلد messages */
function pushCloudStatusEvents(out, value, phoneNumberId) {
    for (const st of value?.statuses || []) {
        const whatsappId = String(st?.id || '').trim();
        const status = String(st?.status || '').trim().toLowerCase();
        if (!whatsappId || !status) continue;
        out.events.push({
            type: 'message_status',
            phoneNumberId,
            whatsappId,
            status,
            recipientId: st.recipient_id ? String(st.recipient_id) : null,
            timestamp: st.timestamp || null,
            errors: Array.isArray(st.errors) ? st.errors : null,
        });
    }
}

/**
 * تبدیل یک change وب‌هوک Cloud (شامل Coexistence) به رویدادهای داخلی
 * @returns {{ messages: object[], contacts: object[], events: object[] }}
 */
function transformCloudWebhookChange(change) {
    const field = String(change?.field || '').trim();
    const value = change?.value;
    const phoneNumberId = value?.metadata?.phone_number_id
        ? String(value.metadata.phone_number_id)
        : null;
    const businessPhone = digitsOnly(value?.metadata?.display_phone_number);
    const out = { messages: [], contacts: [], events: [] };
    if (!value) return out;

    if (field === 'messages' || (!field && (value.messages || value.statuses))) {
        const contacts = contactsByWaId(value);
        for (const m of value.messages || []) {
            const from = digitsOnly(m.from);
            const contact = contacts[from] || contacts[String(m.from || '')] || {};
            const mapped = buildInternalCloudMessage({
                m,
                peerPhone: from,
                contactName: contact?.profile?.name || null,
                phoneNumberId,
                fromMe: false,
                source: 'messages',
            });
            if (mapped) out.messages.push(mapped);
        }
        pushCloudStatusEvents(out, value, phoneNumberId);
        return out;
    }

    if (field === 'smb_message_echoes') {
        const contacts = contactsByWaId(value);
        for (const m of value.message_echoes || []) {
            const peer = digitsOnly(m.to) || digitsOnly(m.to_user_id);
            const contact = contacts[peer] || {};
            const mapped = buildInternalCloudMessage({
                m,
                peerPhone: peer,
                contactName: contact?.profile?.name || contact?.profile?.username || null,
                phoneNumberId,
                fromMe: true,
                source: 'smb_message_echoes',
            });
            if (mapped) out.messages.push(mapped);
        }
        return out;
    }

    if (field === 'history') {
        for (const chunk of value.history || []) {
            const errors = chunk?.errors || chunk?.metadata?.errors;
            if (Array.isArray(errors) && errors.length) {
                out.events.push({
                    type: 'history_error',
                    phoneNumberId,
                    errors,
                    progress: chunk?.metadata?.progress,
                });
                continue;
            }
            out.events.push({
                type: 'history_progress',
                phoneNumberId,
                phase: chunk?.metadata?.phase,
                chunkOrder: chunk?.metadata?.chunk_order,
                progress: chunk?.metadata?.progress,
            });
            for (const thread of chunk?.threads || []) {
                const threadPeer =
                    digitsOnly(thread.id) ||
                    digitsOnly(thread?.context?.wa_id) ||
                    digitsOnly(thread?.context?.user_id);
                for (const m of thread.messages || []) {
                    const fromDigits = digitsOnly(m.from);
                    const toDigits = digitsOnly(m.to);
                    const fromMe =
                        !!toDigits ||
                        (!!businessPhone && !!fromDigits && fromDigits === businessPhone);
                    const peer = fromMe
                        ? toDigits || threadPeer
                        : fromDigits || threadPeer;
                    const mapped = buildInternalCloudMessage({
                        m,
                        peerPhone: peer,
                        contactName: thread?.context?.username || null,
                        phoneNumberId,
                        fromMe,
                        source: 'history',
                    });
                    if (mapped) out.messages.push(mapped);
                }
            }
        }
        return out;
    }

    if (field === 'smb_app_state_sync') {
        for (const item of value.state_sync || []) {
            if (String(item?.type || '') !== 'contact') continue;
            const phone =
                digitsOnly(item?.contact?.phone_number) ||
                digitsOnly(item?.contact?.user_id);
            if (!phone) continue;
            out.contacts.push({
                phone,
                fullName: item?.contact?.full_name || null,
                firstName: item?.contact?.first_name || null,
                username: item?.contact?.username || null,
                action: String(item?.action || 'add').toLowerCase(),
                timestamp: parseInt(item?.metadata?.timestamp || '0', 10) || null,
                phoneNumberId,
            });
        }
        return out;
    }

    if (field === 'account_update') {
        out.events.push({
            type: 'account_update',
            phoneNumberId,
            event: value.event || value.phone_number || null,
            value,
        });
    }

    return out;
}

/**
 * تبدیل کل entry وب‌هوک Meta (همهٔ changes) به رویدادهای داخلی
 */
function transformCloudWebhookEntry(entry) {
    const aggregated = { messages: [], contacts: [], events: [] };
    for (const change of entry?.changes || []) {
        const part = transformCloudWebhookChange(change);
        aggregated.messages.push(...part.messages);
        aggregated.contacts.push(...part.contacts);
        aggregated.events.push(...part.events);
    }
    return aggregated;
}

/**
 * تبدیل payload وب‌هوک Meta به فرمت داخلی پیام (سازگار با processIncomingMessage)
 * شامل messages معمولی + echoهای Coexistence + history
 */
function transformCloudWebhookToInternal(entry) {
    return transformCloudWebhookEntry(entry).messages;
}

/**
 * درخواست همگام‌سازی مخاطبین یا تاریخچه بعد از onboarding Coexistence
 * @param {'smb_app_state_sync'|'history'} syncType
 */
async function requestSmbAppData(syncType, cfgOverride) {
    const cfg = await _getConfig(cfgOverride);
    if (!cfg) throw new Error('WhatsApp Cloud API not configured');
    const type = String(syncType || '').trim();
    if (type !== 'smb_app_state_sync' && type !== 'history') {
        throw new Error('syncType must be smb_app_state_sync or history');
    }
    const res = await axios.post(
        `${API_BASE}/${cfg.cloudPhoneNumberId}/smb_app_data`,
        {
            messaging_product: 'whatsapp',
            sync_type: type,
        },
        {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${cfg.cloudAccessToken}`,
            },
            timeout: 30000,
        }
    );
    return res.data || { success: true };
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
    transformCloudWebhookEntry,
    transformCloudWebhookChange,
    requestSmbAppData,
    getPhoneNumberId,
    verifyCredentials,
    readQualityRating,
    buildBodyTemplateComponents,
    API_BASE,
};

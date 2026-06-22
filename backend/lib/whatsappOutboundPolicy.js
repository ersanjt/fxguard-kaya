/**
 * سیاست ارسال Cloud API — پنجره ۲۴ ساعته و fallback به Template
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages
 */

const CLOUD_SESSION_MS =
    Math.max(1, parseInt(process.env.WHATSAPP_CLOUD_SESSION_HOURS || '24', 10) || 24) * 60 * 60 * 1000;

/** Meta error codes that mean «outside 24h window — use template» */
const META_REENGAGEMENT_ERROR_CODES = new Set([131047, 131051, 131052]);

function getOutboundTemplateName(cfg) {
    return String(
        cfg?.cloudBulkTemplateName
        || process.env.WHATSAPP_CLOUD_BULK_TEMPLATE_NAME
        || process.env.WHATSAPP_CLOUD_OUTBOUND_TEMPLATE_NAME
        || ''
    ).trim();
}

function getOutboundTemplateLanguage(cfg) {
    return String(
        cfg?.cloudBulkTemplateLanguage
        || process.env.WHATSAPP_CLOUD_BULK_TEMPLATE_LANGUAGE
        || 'fa'
    ).trim() || 'fa';
}

function isWithinCloudSessionWindow(conversation) {
    if (!conversation) return false;
    const lastIn = conversation.lastIncomingMessageAt;
    if (!lastIn) return false;
    return Date.now() - new Date(lastIn).getTime() < CLOUD_SESSION_MS;
}

/**
 * آیا برای این مکالمه باید از قالب Meta استفاده شود؟ (Cloud فعال، خارج از ۲۴h، بدون رسانه)
 */
function shouldSendViaTemplate(conversation, cfg, { hasMedia = false, forceTemplate = false } = {}) {
    if (forceTemplate) return !!getOutboundTemplateName(cfg);
    if (hasMedia) return false;
    const cloudOk = cfg?.cloudEnabled && cfg?.cloudAccessToken && cfg?.cloudPhoneNumberId;
    if (!cloudOk) return false;
    const mode = cfg.connectionMode || 'cloud_first';
    if (mode === 'gateway') return false;
    if (isWithinCloudSessionWindow(conversation)) return false;
    return !!getOutboundTemplateName(cfg);
}

function buildTemplatePayload(basePayload, text, cfg) {
    const templateName = getOutboundTemplateName(cfg);
    if (!templateName) return null;
    const bodyText = String(text || '').trim();
    return {
        ...basePayload,
        templateName,
        templateLanguage: getOutboundTemplateLanguage(cfg),
        templateBodyParams: bodyText ? [bodyText] : [],
        message: bodyText,
    };
}

function isMetaReengagementError(err) {
    const code = err?.response?.data?.error?.code ?? err?.metaErrorCode;
    if (code != null && META_REENGAGEMENT_ERROR_CODES.has(Number(code))) return true;
    const msg = String(err?.response?.data?.error?.message || err?.message || '').toLowerCase();
    return msg.includes('re-engagement') || msg.includes('24 hour') || msg.includes('template');
}

function outsideSessionErrorMessage(cfg) {
    const tpl = getOutboundTemplateName(cfg);
    if (tpl) return null;
    return 'مشتری بیش از ۲۴ ساعت پیام نداده — ارسال متن آزاد ممکن نیست. در #whatsapp نام قالب Meta (ارسال انبوه) را تنظیم کنید یا منتظر پیام مشتری بمانید.';
}

module.exports = {
    CLOUD_SESSION_MS,
    META_REENGAGEMENT_ERROR_CODES,
    getOutboundTemplateName,
    getOutboundTemplateLanguage,
    isWithinCloudSessionWindow,
    shouldSendViaTemplate,
    buildTemplatePayload,
    isMetaReengagementError,
    outsideSessionErrorMessage,
};

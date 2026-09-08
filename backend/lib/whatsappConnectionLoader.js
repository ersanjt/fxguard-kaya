/**
 * تنظیمات اتصال واتساپ — از پنل (DB) یا .env
 * اولویت: DB > ENV
 */
const { WhatsappConnection } = require('../models');
const { getPanelSettingsKey } = require('./tenantContext');

let _cache = new Map();
const CACHE_TTL_MS = 30000;

async function getWhatsappConnectionConfig() {
    const key = getPanelSettingsKey();
    const now = Date.now();
    const hit = _cache.get(key);
    if (hit && now - hit.ts < CACHE_TTL_MS) return hit.value;

    let row = null;
    try {
        row = await WhatsappConnection.findByPk(key);
    } catch (_) {
        // جدول وجود نداشته باشد
    }

    const useEnv = key === 'default';
    const env = {
        cloudAccessToken: (process.env.WHATSAPP_CLOUD_ACCESS_TOKEN || '').trim(),
        cloudPhoneNumberId: (process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID || '').trim(),
        cloudVerifyToken: (process.env.WHATSAPP_CLOUD_VERIFY_TOKEN || '').trim(),
        cloudBulkTemplateName: (process.env.WHATSAPP_CLOUD_BULK_TEMPLATE_NAME || '').trim(),
        cloudBulkTemplateLanguage: (process.env.WHATSAPP_CLOUD_BULK_TEMPLATE_LANGUAGE || 'fa').trim(),
        gatewayUrl: (process.env.GATEWAY_URL || 'http://localhost:3001').replace(/\/$/, ''),
        gatewayApiSecret: (typeof process.env.GATEWAY_API_SECRET === 'string'
            ? process.env.GATEWAY_API_SECRET.trim().replace(/^["']|["']$/g, '')
            : ''),
    };

    const mode = row?.connectionMode || (useEnv ? 'cloud_first' : 'cloud');
    const cloudEnabled = row?.cloudEnabled !== false;
    const gatewayEnabled = useEnv ? row?.gatewayEnabled !== false : row?.gatewayEnabled === true;

    const config = {
        connectionMode: mode,
        cloudEnabled,
        cloudAccessToken: (row?.cloudAccessToken || '').trim() || (useEnv ? env.cloudAccessToken : ''),
        cloudPhoneNumberId: (row?.cloudPhoneNumberId || '').trim() || (useEnv ? env.cloudPhoneNumberId : ''),
        cloudVerifyToken: (row?.cloudVerifyToken || '').trim() || (useEnv ? env.cloudVerifyToken : ''),
        cloudBulkTemplateName: (row?.cloudBulkTemplateName || '').trim() || (useEnv ? env.cloudBulkTemplateName : ''),
        cloudBulkTemplateLanguage:
            (row?.cloudBulkTemplateLanguage || '').trim() ||
            (useEnv ? env.cloudBulkTemplateLanguage : '') ||
            'fa',
        gatewayEnabled,
        gatewayUrl: (row?.gatewayUrl || '').trim() || (useEnv ? env.gatewayUrl : ''),
        gatewayApiSecret: (row?.gatewayApiSecret || '').trim() || (useEnv ? env.gatewayApiSecret : ''),
    };

    _cache.set(key, { ts: now, value: config });
    return config;
}

function invalidateCache() {
    _cache = new Map();
}

/** آیا Cloud API تنظیم و فعال است؟ */
async function isCloudApiConfigured() {
    const c = await getWhatsappConnectionConfig();
    return c.cloudEnabled && !!(c.cloudAccessToken && c.cloudPhoneNumberId);
}

/** آیا Gateway تنظیم و فعال است؟ */
async function isGatewayEnabled() {
    const c = await getWhatsappConnectionConfig();
    return c.gatewayEnabled;
}

/** Verify token برای وب‌هوک Meta */
async function getCloudVerifyToken() {
    const c = await getWhatsappConnectionConfig();
    return c.cloudVerifyToken || '';
}

module.exports = {
    getWhatsappConnectionConfig,
    invalidateCache,
    isCloudApiConfigured,
    isGatewayEnabled,
    getCloudVerifyToken,
};

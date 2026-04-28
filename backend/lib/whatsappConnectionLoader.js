/**
 * تنظیمات اتصال واتساپ — از پنل (DB) یا .env
 * اولویت: DB > ENV
 */
const { WhatsappConnection } = require('../models');

let _cache = null;
let _cacheTs = 0;
const CACHE_TTL_MS = 30000; // 30 ثانیه

async function getWhatsappConnectionConfig() {
    const now = Date.now();
    if (_cache && now - _cacheTs < CACHE_TTL_MS) return _cache;

    let row = null;
    try {
        row = await WhatsappConnection.findByPk('default');
    } catch (_) {
        // جدول وجود نداشته باشد
    }

    const env = {
        cloudAccessToken: (process.env.WHATSAPP_CLOUD_ACCESS_TOKEN || '').trim(),
        cloudPhoneNumberId: (process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID || '').trim(),
        cloudVerifyToken: (process.env.WHATSAPP_CLOUD_VERIFY_TOKEN || '').trim(),
        gatewayUrl: (process.env.GATEWAY_URL || 'http://localhost:3001').replace(/\/$/, ''),
        gatewayApiSecret: (typeof process.env.GATEWAY_API_SECRET === 'string'
            ? process.env.GATEWAY_API_SECRET.trim().replace(/^["']|["']$/g, '')
            : ''),
    };

    const mode = row?.connectionMode || 'cloud_first';
    const cloudEnabled = row?.cloudEnabled !== false;
    const gatewayEnabled = row?.gatewayEnabled !== false;

    const config = {
        connectionMode: mode,
        cloudEnabled,
        cloudAccessToken: (row?.cloudAccessToken || '').trim() || env.cloudAccessToken,
        cloudPhoneNumberId: (row?.cloudPhoneNumberId || '').trim() || env.cloudPhoneNumberId,
        cloudVerifyToken: (row?.cloudVerifyToken || '').trim() || env.cloudVerifyToken,
        gatewayEnabled,
        gatewayUrl: (row?.gatewayUrl || '').trim() || env.gatewayUrl,
        gatewayApiSecret: (row?.gatewayApiSecret || '').trim() || env.gatewayApiSecret,
    };

    _cache = config;
    _cacheTs = now;
    return config;
}

function invalidateCache() {
    _cache = null;
    _cacheTs = 0;
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

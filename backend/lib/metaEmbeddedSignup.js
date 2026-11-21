/**
 * Kaya CRM — Meta WhatsApp Embedded Signup (Tech Provider)
 * @file    backend/lib/metaEmbeddedSignup.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/META-TECH-PROVIDER-PLAN-FA.md
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const axios = require('axios');

function trimEnv(name) {
    return String(process.env[name] || '').trim();
}

function graphVersion() {
    const fromEs = trimEnv('META_EMBEDDED_SIGNUP_GRAPH_VERSION');
    if (/^v\d+\.\d+$/.test(fromEs)) return fromEs;
    const fromCloud = trimEnv('WHATSAPP_CLOUD_GRAPH_API_VERSION');
    if (/^v\d+\.\d+$/.test(fromCloud)) return fromCloud;
    return 'v21.0';
}

function metaAppId() {
    return trimEnv('META_APP_ID') || trimEnv('FACEBOOK_APP_ID');
}

function metaAppSecret() {
    return trimEnv('META_APP_SECRET') || trimEnv('WHATSAPP_CLOUD_APP_SECRET');
}

function embeddedSignupConfigId() {
    return trimEnv('META_EMBEDDED_SIGNUP_CONFIG_ID');
}

/**
 * آیا سکو برای دکمهٔ Embedded Signup پیکربندی شده؟
 */
function isEmbeddedSignupConfigured() {
    return !!(metaAppId() && metaAppSecret() && embeddedSignupConfigId());
}

/**
 * تنظیمات عمومی برای فرانت (بدون secret)
 */
function getPublicEmbeddedSignupConfig(opts = {}) {
    const configured = isEmbeddedSignupConfigured();
    const publicUrl = trimEnv('BACKEND_PUBLIC_URL').replace(/\/$/, '');
    return {
        enabled: configured,
        appId: configured ? metaAppId() : '',
        configId: configured ? embeddedSignupConfigId() : '',
        graphVersion: graphVersion(),
        partnerType: 'tech_provider',
        webhookCallbackUrl: publicUrl
            ? `${publicUrl}/api/webhook/whatsapp-cloud`
            : '',
        billingHintRequired: true,
        reason: configured
            ? null
            : 'missing_meta_env',
        ...(opts.extra || {}),
    };
}

/**
 * تعویض code یک‌بارمصرف Embedded Signup با business token
 * @param {string} code
 * @param {{ httpGet?: Function }} [deps]
 */
async function exchangeCodeForBusinessToken(code, deps = {}) {
    const raw = String(code || '').trim();
    if (!raw) {
        const err = new Error('کد Embedded Signup خالی است');
        err.code = 'ES_CODE_REQUIRED';
        err.status = 400;
        throw err;
    }
    const appId = metaAppId();
    const appSecret = metaAppSecret();
    if (!appId || !appSecret) {
        const err = new Error('META_APP_ID / META_APP_SECRET روی سرور تنظیم نشده است');
        err.code = 'ES_NOT_CONFIGURED';
        err.status = 503;
        throw err;
    }
    const httpGet = deps.httpGet || ((url, config) => axios.get(url, config));
    const url = `https://graph.facebook.com/${graphVersion()}/oauth/access_token`;
    let data;
    try {
        const res = await httpGet(url, {
            params: {
                client_id: appId,
                client_secret: appSecret,
                code: raw,
            },
            timeout: 30000,
            validateStatus: () => true,
        });
        data = res && res.data;
        if (!res || res.status >= 400) {
            const msg =
                (data && data.error && data.error.message) ||
                (data && data.error_message) ||
                `Meta token exchange failed (${res && res.status})`;
            const err = new Error(msg);
            err.code = 'ES_TOKEN_EXCHANGE_FAILED';
            err.status = 502;
            err.meta = data && data.error ? data.error : data;
            throw err;
        }
    } catch (e) {
        if (e.code === 'ES_TOKEN_EXCHANGE_FAILED') throw e;
        const err = new Error(e.message || 'Meta token exchange network error');
        err.code = 'ES_TOKEN_EXCHANGE_FAILED';
        err.status = 502;
        throw err;
    }
    const accessToken = String((data && data.access_token) || '').trim();
    if (!accessToken) {
        const err = new Error('Meta توکن دسترسی برنگرداند');
        err.code = 'ES_TOKEN_MISSING';
        err.status = 502;
        throw err;
    }
    return {
        accessToken,
        tokenType: (data && data.token_type) || null,
        expiresIn: data && data.expires_in != null ? Number(data.expires_in) : null,
    };
}

/**
 * Subscribe اپ سکو به webhookهای WABA مشتری
 */
async function subscribeAppToWaba(wabaId, accessToken, deps = {}) {
    const id = String(wabaId || '').trim();
    const token = String(accessToken || '').trim();
    if (!id || !token) {
        const err = new Error('wabaId و accessToken برای subscribe لازم است');
        err.code = 'ES_SUBSCRIBE_INPUT';
        err.status = 400;
        throw err;
    }
    const httpPost = deps.httpPost || ((url, body, config) => axios.post(url, body, config));
    const url = `https://graph.facebook.com/${graphVersion()}/${encodeURIComponent(id)}/subscribed_apps`;
    const res = await httpPost(
        url,
        {},
        {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 30000,
            validateStatus: () => true,
        }
    );
    const data = res && res.data;
    if (!res || res.status >= 400 || (data && data.success === false)) {
        const msg =
            (data && data.error && data.error.message) ||
            `Subscribe apps failed (${res && res.status})`;
        const err = new Error(msg);
        err.code = 'ES_SUBSCRIBE_FAILED';
        err.status = 502;
        err.meta = data && data.error ? data.error : data;
        throw err;
    }
    return data || { success: true };
}

/**
 * ثبت شماره برای Cloud API (اختیاری؛ coexistence معمولاً لازم ندارد)
 */
async function registerPhoneNumber(phoneNumberId, accessToken, pin, deps = {}) {
    const id = String(phoneNumberId || '').trim();
    const token = String(accessToken || '').trim();
    const pinStr = String(pin || '').trim();
    if (!id || !token) {
        const err = new Error('phoneNumberId و accessToken برای register لازم است');
        err.code = 'ES_REGISTER_INPUT';
        err.status = 400;
        throw err;
    }
    if (!/^\d{6}$/.test(pinStr)) {
        const err = new Error('PIN ثبت شماره باید ۶ رقم باشد');
        err.code = 'ES_PIN_INVALID';
        err.status = 400;
        throw err;
    }
    const httpPost = deps.httpPost || ((url, body, config) => axios.post(url, body, config));
    const url = `https://graph.facebook.com/${graphVersion()}/${encodeURIComponent(id)}/register`;
    const res = await httpPost(
        url,
        { messaging_product: 'whatsapp', pin: pinStr },
        {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 30000,
            validateStatus: () => true,
        }
    );
    const data = res && res.data;
    if (!res || res.status >= 400 || (data && data.success === false)) {
        const msg =
            (data && data.error && data.error.message) ||
            `Phone register failed (${res && res.status})`;
        const err = new Error(msg);
        err.code = 'ES_REGISTER_FAILED';
        err.status = 502;
        err.meta = data && data.error ? data.error : data;
        throw err;
    }
    return data || { success: true };
}

/**
 * اعتبارسنجی ورودی complete از فرانت
 */
function parseCompletePayload(body) {
    const code = String((body && body.code) || '').trim();
    const wabaId = String((body && (body.wabaId || body.waba_id)) || '').trim();
    const phoneNumberId = String(
        (body && (body.phoneNumberId || body.phone_number_id)) || ''
    ).trim();
    const pin = body && body.pin != null ? String(body.pin).trim() : '';
    const displayPhone = String(
        (body && (body.displayPhoneNumber || body.display_phone_number)) || ''
    ).trim();
    if (!code) {
        const err = new Error('code الزامی است');
        err.code = 'ES_CODE_REQUIRED';
        err.status = 400;
        throw err;
    }
    if (!wabaId || !/^\d{5,32}$/.test(wabaId)) {
        const err = new Error('wabaId نامعتبر است');
        err.code = 'ES_WABA_INVALID';
        err.status = 400;
        throw err;
    }
    if (!phoneNumberId || !/^\d{5,32}$/.test(phoneNumberId)) {
        const err = new Error('phoneNumberId نامعتبر است');
        err.code = 'ES_PHONE_INVALID';
        err.status = 400;
        throw err;
    }
    if (pin && !/^\d{6}$/.test(pin)) {
        const err = new Error('pin باید ۶ رقم باشد یا خالی بماند');
        err.code = 'ES_PIN_INVALID';
        err.status = 400;
        throw err;
    }
    return { code, wabaId, phoneNumberId, pin: pin || null, displayPhone: displayPhone || null };
}

/**
 * جریان کامل بعد از پنجرهٔ Meta — بدون ذخیرهٔ DB (برای تست)
 */
async function completeEmbeddedSignupFlow(body, deps = {}) {
    if (!isEmbeddedSignupConfigured()) {
        const err = new Error('Embedded Signup روی سرور پیکربندی نشده است');
        err.code = 'ES_NOT_CONFIGURED';
        err.status = 503;
        throw err;
    }
    const parsed = parseCompletePayload(body);
    const tokenInfo = await exchangeCodeForBusinessToken(parsed.code, deps);
    await subscribeAppToWaba(parsed.wabaId, tokenInfo.accessToken, deps);
    let registered = false;
    if (parsed.pin) {
        await registerPhoneNumber(parsed.phoneNumberId, tokenInfo.accessToken, parsed.pin, deps);
        registered = true;
    }
    return {
        accessToken: tokenInfo.accessToken,
        expiresIn: tokenInfo.expiresIn,
        wabaId: parsed.wabaId,
        phoneNumberId: parsed.phoneNumberId,
        displayPhone: parsed.displayPhone,
        subscribed: true,
        registered,
    };
}

module.exports = {
    graphVersion,
    metaAppId,
    metaAppSecret,
    embeddedSignupConfigId,
    isEmbeddedSignupConfigured,
    getPublicEmbeddedSignupConfig,
    exchangeCodeForBusinessToken,
    subscribeAppToWaba,
    registerPhoneNumber,
    parseCompletePayload,
    completeEmbeddedSignupFlow,
};

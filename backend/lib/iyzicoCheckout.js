/**
 * FXGuard — iyzico Checkout Form (کارت داخلی ترکیه + کارت خارجی در صورت تأیید iyzico)
 * @file    backend/lib/iyzicoCheckout.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 *
 * جریان: initialize (سرور) → صفحهٔ پرداخت iyzico → POST token به callback →
 * retrieve (سرور با کلید مخفی) → فعال‌سازی. هیچ دادهٔ کارت به سرور ما نمی‌رسد.
 */

'use strict';

const crypto = require('crypto');

const IYZICO_HOSTS = {
    sandbox: 'https://sandbox-api.iyzipay.com',
    production: 'https://api.iyzipay.com',
};
const INIT_PATH = '/payment/iyzipos/checkoutform/initialize/auth/ecom';
const DETAIL_PATH = '/payment/iyzipos/checkoutform/auth/ecom/detail';
const SUPPORTED_CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP'];
const DEFAULT_PERIOD_DAYS = 30;
const CONSENT_VERSION = '2026-10';
const CONVERSATION_RE = /^fxg_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_[0-9a-f]{12}$/i;

function iyzicoEnvironment(env) {
    const v = String((env && env.IYZICO_ENV) || '').trim().toLowerCase();
    return v === 'production' || v === 'live' ? 'production' : 'sandbox';
}

function iyzicoBaseUrl(env) {
    return IYZICO_HOSTS[iyzicoEnvironment(env)];
}

/** "1990.5" → کوچک‌ترین واحد (کوروش/سنت) به‌صورت عدد صحیح؛ جداکنندهٔ هزارگان پذیرفته نمی‌شود؛ نامعتبر → null */
function parseAmountToMinor(raw) {
    const s = String(raw == null ? '' : raw).trim();
    if (!/^\d{1,9}(\.\d{1,8})?$/.test(s)) return null;
    const [intPart, fracRaw = ''] = s.split('.');
    if (/[1-9]/.test(fracRaw.slice(2))) return null;
    const minor = Number(intPart) * 100 + Number((fracRaw + '00').slice(0, 2));
    return Number.isSafeInteger(minor) ? minor : null;
}

function minorToAmount(minor) {
    const m = Math.trunc(Number(minor) || 0);
    return Math.floor(m / 100) + '.' + String(m % 100).padStart(2, '0');
}

function iyzicoCurrency(env) {
    const c = String((env && env.IYZICO_CURRENCY) || 'TRY').trim().toUpperCase();
    return SUPPORTED_CURRENCIES.indexOf(c) >= 0 ? c : null;
}

function iyzicoPriceMinor(env) {
    const minor = parseAmountToMinor(env && env.IYZICO_PRICE_START);
    return minor && minor >= 100 ? minor : null;
}

function iyzicoPeriodDays(env) {
    const n = parseInt(String((env && env.IYZICO_PERIOD_DAYS) || ''), 10);
    return Number.isFinite(n) && n >= 1 && n <= 400 ? n : DEFAULT_PERIOD_DAYS;
}

function isIyzicoEnabled(env) {
    const src = env || {};
    const key = String(src.IYZICO_API_KEY || '').trim();
    const secret = String(src.IYZICO_SECRET_KEY || '').trim();
    return !!(key && secret && iyzicoCurrency(src) && iyzicoPriceMinor(src));
}

function publicIyzicoConfig(env) {
    if (!isIyzicoEnabled(env)) return { enabled: false };
    const minor = iyzicoPriceMinor(env);
    return {
        enabled: true,
        environment: iyzicoEnvironment(env),
        currency: iyzicoCurrency(env),
        amount: minorToAmount(minor),
        periodDays: iyzicoPeriodDays(env),
        consentVersion: CONSENT_VERSION,
    };
}

/** هدر احراز هویت IYZWSv2 (HMAC-SHA256 روی randomKey + uriPath + body) */
function iyzicoAuthHeaders(apiKey, secretKey, uriPath, bodyJson, randomKey) {
    const rnd = randomKey || String(Date.now()) + crypto.randomBytes(6).toString('hex');
    const signature = crypto
        .createHmac('sha256', String(secretKey))
        .update(rnd + uriPath + String(bodyJson || ''), 'utf8')
        .digest('hex');
    const auth = 'apiKey:' + apiKey + '&randomKey:' + rnd + '&signature:' + signature;
    return {
        Authorization: 'IYZWSv2 ' + Buffer.from(auth, 'utf8').toString('base64'),
        'x-iyzi-rnd': rnd,
        'Content-Type': 'application/json',
        Accept: 'application/json',
    };
}

function cleanText(raw, max) {
    let s = '';
    for (const ch of String(raw == null ? '' : raw)) {
        const code = ch.charCodeAt(0);
        s += code < 32 || code === 127 || ch === '<' || ch === '>' ? ' ' : ch;
    }
    return s
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max);
}

/**
 * اطلاعات صورتحساب خریدار (برای فاکتور e-Arşiv / e-Fatura و الزام iyzico)
 * @returns {{ ok: true, billing: object } | { ok: false, field: string }}
 */
function sanitizeBillingInfo(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const fullName = cleanText(src.fullName, 100);
    const country = cleanText(src.country, 60);
    const city = cleanText(src.city, 60);
    const address = cleanText(src.address, 250);
    const companyName = cleanText(src.companyName, 150);
    const taxOffice = cleanText(src.taxOffice, 80);
    const identityNumber = cleanText(src.identityNumber, 20).replace(/\s/g, '');
    const zipCode = cleanText(src.zipCode, 12);
    const gsmNumber = cleanText(src.gsmNumber, 20).replace(/[\s()-]/g, '');

    if (fullName.length < 3 || fullName.indexOf(' ') < 1) return { ok: false, field: 'fullName' };
    if (country.length < 2) return { ok: false, field: 'country' };
    if (city.length < 2) return { ok: false, field: 'city' };
    if (address.length < 5) return { ok: false, field: 'address' };
    if (identityNumber && !/^[0-9A-Za-z]{5,20}$/.test(identityNumber)) {
        return { ok: false, field: 'identityNumber' };
    }
    if (gsmNumber && !/^\+?\d{8,15}$/.test(gsmNumber)) return { ok: false, field: 'gsmNumber' };

    const parts = fullName.split(' ');
    const surname = parts.pop();
    return {
        ok: true,
        billing: {
            fullName,
            name: parts.join(' '),
            surname,
            country,
            city,
            address,
            companyName,
            taxOffice,
            identityNumber,
            zipCode,
            gsmNumber,
        },
    };
}

function newConversationId(tenantId) {
    return 'fxg_' + String(tenantId).toLowerCase() + '_' + crypto.randomBytes(6).toString('hex');
}

function tenantIdFromConversation(conversationId) {
    const m = CONVERSATION_RE.exec(String(conversationId || ''));
    return m ? m[1].toLowerCase() : '';
}

function buildInitializeRequest(env, opts) {
    const o = opts || {};
    const billing = o.billing;
    const price = minorToAmount(iyzicoPriceMinor(env));
    const identity =
        billing.identityNumber ||
        String((env && env.IYZICO_DEFAULT_IDENTITY_NUMBER) || '11111111111').trim();
    const buyer = {
        id: String(o.tenantId),
        name: billing.name,
        surname: billing.surname,
        email: o.email,
        identityNumber: identity,
        registrationAddress: billing.address,
        ip: cleanText(o.ip, 45) || '127.0.0.1',
        city: billing.city,
        country: billing.country,
    };
    if (billing.gsmNumber) buyer.gsmNumber = billing.gsmNumber;
    if (billing.zipCode) buyer.zipCode = billing.zipCode;
    const billingAddress = {
        contactName: billing.companyName || billing.fullName,
        city: billing.city,
        country: billing.country,
        address: billing.address,
    };
    if (billing.zipCode) billingAddress.zipCode = billing.zipCode;
    return {
        locale: o.locale === 'tr' ? 'tr' : 'en',
        conversationId: o.conversationId,
        price,
        paidPrice: price,
        currency: iyzicoCurrency(env),
        basketId: 'cloud-start-' + String(o.tenantId).slice(0, 8),
        paymentGroup: 'PRODUCT',
        callbackUrl: o.callbackUrl,
        enabledInstallments: [1],
        buyer,
        billingAddress,
        basketItems: [
            {
                id: 'fxguard-cloud-start',
                name: 'FXGuard Cloud Start — ' + iyzicoPeriodDays(env) + ' days',
                category1: 'Software',
                category2: 'SaaS subscription',
                itemType: 'VIRTUAL',
                price,
            },
        ],
    };
}

function iyzicoError(code, message, status) {
    const err = new Error(String(message || code).slice(0, 200));
    err.code = code;
    if (status) err.status = status;
    return err;
}

/**
 * @param {object} env
 * @param {object} opts tenantId, email, billing, ip, locale, callbackUrl
 * @param {(req: {url: string, headers: object, body: string}) => Promise<object>} postJson
 */
async function initializeCheckoutForm(env, opts, postJson) {
    if (!isIyzicoEnabled(env)) throw iyzicoError('IYZICO_DISABLED', 'IYZICO_DISABLED');
    const conversationId = newConversationId(opts.tenantId);
    const body = JSON.stringify(buildInitializeRequest(env, Object.assign({}, opts, { conversationId })));
    const headers = iyzicoAuthHeaders(
        String(env.IYZICO_API_KEY).trim(),
        String(env.IYZICO_SECRET_KEY).trim(),
        INIT_PATH,
        body
    );
    const data = await postJson({ url: iyzicoBaseUrl(env) + INIT_PATH, headers, body });
    if (!data || data.status !== 'success' || !data.token) {
        throw iyzicoError('IYZICO_INIT_FAILED', (data && (data.errorMessage || data.errorCode)) || 'init_failed');
    }
    const pageUrl = String(data.paymentPageUrl || '');
    if (pageUrl && !isIyzicoPaymentPageUrl(pageUrl)) {
        throw iyzicoError('IYZICO_INIT_FAILED', 'unexpected_payment_page');
    }
    return {
        token: String(data.token),
        paymentPageUrl: pageUrl,
        conversationId,
        tokenExpireTime: Number(data.tokenExpireTime) || null,
    };
}

function isIyzicoPaymentPageUrl(url) {
    try {
        const u = new URL(String(url));
        if (u.protocol !== 'https:') return false;
        return u.hostname === 'iyzipay.com' || u.hostname.endsWith('.iyzipay.com');
    } catch (_) {
        return false;
    }
}

function sanitizeToken(raw) {
    const t = String(raw || '').trim();
    return /^[A-Za-z0-9-]{8,128}$/.test(t) ? t : '';
}

async function retrieveCheckoutForm(env, token, postJson) {
    if (!isIyzicoEnabled(env)) throw iyzicoError('IYZICO_DISABLED', 'IYZICO_DISABLED');
    const clean = sanitizeToken(token);
    if (!clean) throw iyzicoError('IYZICO_BAD_TOKEN', 'bad_token', 400);
    const body = JSON.stringify({ locale: 'en', conversationId: 'retrieve', token: clean });
    const headers = iyzicoAuthHeaders(
        String(env.IYZICO_API_KEY).trim(),
        String(env.IYZICO_SECRET_KEY).trim(),
        DETAIL_PATH,
        body
    );
    return postJson({ url: iyzicoBaseUrl(env) + DETAIL_PATH, headers, body });
}

/**
 * نتیجهٔ retrieve را به رکورد پرداخت تأییدشده تبدیل می‌کند؛ هر ناسازگاری → { ok:false }.
 * fraudStatus=0 (بررسی دستی iyzico) فعال‌سازی نمی‌کند.
 */
function extractPaidIyzico(result, env) {
    const r = result || {};
    if (r.status !== 'success') return { ok: false, reason: 'api_failure' };
    if (String(r.paymentStatus || '').toUpperCase() !== 'SUCCESS') return { ok: false, reason: 'not_paid' };
    if (Number(r.fraudStatus) !== 1) return { ok: false, reason: 'fraud_review' };
    const tenantId = tenantIdFromConversation(r.conversationId);
    if (!tenantId) return { ok: false, reason: 'bad_conversation' };
    const currency = String(r.currency || '').toUpperCase();
    if (currency !== iyzicoCurrency(env)) return { ok: false, reason: 'currency_mismatch' };
    const paidMinor = parseAmountToMinor(r.paidPrice);
    const expectedMinor = iyzicoPriceMinor(env);
    if (paidMinor == null || expectedMinor == null || paidMinor < expectedMinor) {
        return { ok: false, reason: 'amount_mismatch' };
    }
    const paymentId = String(r.paymentId || '').trim();
    if (!/^[0-9A-Za-z-]{1,64}$/.test(paymentId)) return { ok: false, reason: 'bad_payment_id' };
    return {
        ok: true,
        paid: {
            provider: 'iyzico',
            paymentId,
            tenantId,
            amountMinor: paidMinor,
            currency,
            periodDays: iyzicoPeriodDays(env),
            conversationId: String(r.conversationId),
        },
    };
}

function iyzicoLeadMarker(paymentId) {
    return 'iyzico:' + String(paymentId || '').slice(0, 64);
}

module.exports = {
    IYZICO_HOSTS,
    INIT_PATH,
    DETAIL_PATH,
    CONSENT_VERSION,
    iyzicoEnvironment,
    iyzicoBaseUrl,
    parseAmountToMinor,
    minorToAmount,
    iyzicoCurrency,
    iyzicoPriceMinor,
    iyzicoPeriodDays,
    isIyzicoEnabled,
    publicIyzicoConfig,
    iyzicoAuthHeaders,
    sanitizeBillingInfo,
    newConversationId,
    tenantIdFromConversation,
    buildInitializeRequest,
    initializeCheckoutForm,
    isIyzicoPaymentPageUrl,
    sanitizeToken,
    retrieveCheckoutForm,
    extractPaidIyzico,
    iyzicoLeadMarker,
};

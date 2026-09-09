/**
 * Kaya CRM — چک‌اوت خودخدمت Cloud Start (Stripe، اختیاری)
 * @file    backend/lib/billingCheckout.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */

'use strict';

const crypto = require('crypto');

const START_AMOUNT_CENTS = 4900;
const START_PRODUCT_NAME = 'FXGuard Cloud Start';
const START_PRODUCT_NAME_LEGACY = 'Kaya CRM Cloud Start';
const DEFAULT_SITE_URL = 'https://app.fxguard.io';
const STRIPE_API = 'https://api.stripe.com/v1/checkout/sessions';

function publicSiteUrl(env) {
    const src = env || {};
    const raw = String(src.FRONTEND_URL || src.BACKEND_PUBLIC_URL || src.PUBLIC_SITE_URL || '')
        .trim()
        .replace(/\/$/, '');
    if (raw.indexOf('https://') === 0 || raw.indexOf('http://') === 0) return raw;
    return DEFAULT_SITE_URL;
}

function startProductName(env) {
    const host = String((env && env.TENANT_BASE_HOST) || '').toLowerCase();
    if (host.indexOf('app.fxguard.io') >= 0) return START_PRODUCT_NAME;
    if (String((env && env.SELF_SERVE_SIGNUP) || '').toLowerCase() === 'true' || (env && env.SELF_SERVE_SIGNUP) === '1') {
        return START_PRODUCT_NAME;
    }
    return START_PRODUCT_NAME_LEGACY;
}

function isAllowedPaymentLink(url) {
    try {
        const u = new URL(String(url || ''));
        if (u.protocol !== 'https:') return false;
        const host = u.hostname.toLowerCase();
        return host === 'buy.stripe.com' || host === 'checkout.stripe.com';
    } catch (_) {
        return false;
    }
}

function hasStripeSecret(env) {
    const key = String((env && env.STRIPE_SECRET_KEY) || '').trim();
    return key.indexOf('sk_test_') === 0 || key.indexOf('sk_live_') === 0;
}

function resolveBillingMode(env) {
    if (hasStripeSecret(env)) return 'checkout';
    if (isAllowedPaymentLink(env && env.STRIPE_PAYMENT_LINK_START)) return 'link';
    return 'off';
}

function publicBillingConfig(env) {
    const mode = resolveBillingMode(env);
    const amountUsd = Math.round(START_AMOUNT_CENTS / 100);
    if (mode === 'off') {
        return { enabled: false, mode: 'off', amountUsd, checkoutUrl: null };
    }
    if (mode === 'link') {
        return {
            enabled: true,
            mode: 'link',
            amountUsd,
            checkoutUrl: String(env.STRIPE_PAYMENT_LINK_START).trim(),
        };
    }
    return { enabled: true, mode: 'checkout', amountUsd, checkoutUrl: null };
}

function sanitizeCustomerEmail(raw) {
    const email = String(raw || '')
        .trim()
        .slice(0, 255);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '';
    return email;
}

function buildCheckoutForm(env, extras) {
    const params = new URLSearchParams();
    const site = publicSiteUrl(env);
    const tenantCheckout = !!(extras && extras.tenantId);
    params.set('mode', 'subscription');
    params.set(
        'success_url',
        site +
            '/billing/success?session_id={CHECKOUT_SESSION_ID}' +
            (tenantCheckout ? '&self=1' : '')
    );
    params.set('cancel_url', tenantCheckout ? site + '/dashboard' : site + '/pricing');
    params.set('metadata[plan]', 'start');
    params.set('metadata[product]', tenantCheckout ? 'fxguard-cloud' : 'kaya-crm');
    params.set('allow_promotion_codes', 'true');
    params.set('billing_address_collection', 'required');
    params.set('tax_id_collection[enabled]', 'true');
    params.set('subscription_data[metadata][plan]', 'start');
    const email = sanitizeCustomerEmail(extras && extras.email);
    if (email) params.set('customer_email', email);
    const tenantId = extras && extras.tenantId ? String(extras.tenantId).trim() : '';
    if (tenantId) {
        params.set('metadata[tenantId]', tenantId.slice(0, 64));
        params.set('subscription_data[metadata][tenantId]', tenantId.slice(0, 64));
    }
    const priceId = String((env && env.STRIPE_PRICE_ID_START) || '').trim();
    if (priceId.indexOf('price_') === 0) {
        params.set('line_items[0][price]', priceId);
        params.set('line_items[0][quantity]', '1');
    } else {
        params.set('line_items[0][quantity]', '1');
        params.set('line_items[0][price_data][currency]', 'usd');
        params.set('line_items[0][price_data][unit_amount]', String(START_AMOUNT_CENTS));
        params.set('line_items[0][price_data][recurring][interval]', 'month');
        params.set('line_items[0][price_data][product_data][name]', startProductName(env));
        params.set(
            'line_items[0][price_data][product_data][description]',
            '1 branch, up to 3 staff. Inbox, tickets, tasks. Hosted cloud.'
        );
    }
    return params;
}

function parseStripeSignatureHeader(header) {
    const timestamp = { t: '', v1: [] };
    String(header || '')
        .split(',')
        .forEach((part) => {
            const idx = part.indexOf('=');
            if (idx < 1) return;
            const k = part.slice(0, idx).trim();
            const v = part.slice(idx + 1).trim();
            if (k === 't') timestamp.t = v;
            if (k === 'v1' && v) timestamp.v1.push(v);
        });
    return timestamp;
}

function timingSafeEqualHex(a, b) {
    const aa = Buffer.from(String(a || ''), 'utf8');
    const bb = Buffer.from(String(b || ''), 'utf8');
    if (aa.length !== bb.length) {
        crypto.timingSafeEqual(aa, Buffer.alloc(aa.length));
        return false;
    }
    return crypto.timingSafeEqual(aa, bb);
}

function verifyStripeWebhook(rawBody, header, secret, nowSec, toleranceSec) {
    const whsec = String(secret || '').trim();
    if (!whsec) return { ok: false, error: 'missing_secret' };
    const parsed = parseStripeSignatureHeader(header);
    if (!parsed.t || !parsed.v1.length) return { ok: false, error: 'bad_header' };
    const ts = Number(parsed.t);
    if (!Number.isFinite(ts)) return { ok: false, error: 'bad_timestamp' };
    const now = Number.isFinite(nowSec) ? nowSec : Math.floor(Date.now() / 1000);
    const windowSec = Number.isFinite(toleranceSec) ? toleranceSec : 300;
    if (Math.abs(now - ts) > windowSec) return { ok: false, error: 'stale' };
    const signed = parsed.t + '.' + String(rawBody || '');
    const expected = crypto.createHmac('sha256', whsec).update(signed, 'utf8').digest('hex');
    const match = parsed.v1.some((sig) => timingSafeEqualHex(sig, expected));
    if (!match) return { ok: false, error: 'bad_signature' };
    try {
        return { ok: true, event: JSON.parse(String(rawBody || '')) };
    } catch (_) {
        return { ok: false, error: 'bad_json' };
    }
}

function extractPaidCheckout(event) {
    if (!event || event.type !== 'checkout.session.completed') return null;
    const session = event.data && event.data.object;
    if (!session || session.object !== 'checkout.session') return null;
    if (session.payment_status === 'unpaid') return null;
    const details = session.customer_details || {};
    return {
        sessionId: String(session.id || '').slice(0, 128),
        email: sanitizeCustomerEmail(details.email || session.customer_email),
        name: String(details.name || '').trim().slice(0, 200),
        plan: String((session.metadata && session.metadata.plan) || 'start').slice(0, 32),
        tenantId: String((session.metadata && session.metadata.tenantId) || '').slice(0, 64),
        amountTotal: Number(session.amount_total) || START_AMOUNT_CENTS,
        currency: String(session.currency || 'usd').slice(0, 8),
    };
}

function paidLeadMarker(sessionId) {
    return 'stripe:' + String(sessionId || '').slice(0, 128);
}

function paidLeadFields(paid) {
    const email = paid && paid.email ? paid.email : 'checkout@kaya.fxguard.io';
    const name = paid && paid.name ? paid.name : 'Cloud Start checkout';
    return {
        purpose: 'purchase',
        name,
        email,
        phone: null,
        message: paidLeadMarker(paid && paid.sessionId),
        source: 'stripe',
    };
}

async function createStartCheckoutSession(env, extras, postForm) {
    if (resolveBillingMode(env) !== 'checkout') {
        const err = new Error('BILLING_DISABLED');
        err.code = 'BILLING_DISABLED';
        throw err;
    }
    const key = String(env.STRIPE_SECRET_KEY).trim();
    const body = buildCheckoutForm(env, extras).toString();
    const data = await postForm({ url: STRIPE_API, auth: key, body });
    if (!data || !data.url || String(data.url).indexOf('https://') !== 0) {
        const err = new Error('STRIPE_SESSION_FAILED');
        err.code = 'STRIPE_SESSION_FAILED';
        throw err;
    }
    return { url: data.url, id: data.id || '' };
}

module.exports = {
    START_AMOUNT_CENTS,
    START_PRODUCT_NAME,
    START_PRODUCT_NAME_LEGACY,
    STRIPE_API,
    publicSiteUrl,
    startProductName,
    isAllowedPaymentLink,
    hasStripeSecret,
    resolveBillingMode,
    publicBillingConfig,
    sanitizeCustomerEmail,
    buildCheckoutForm,
    parseStripeSignatureHeader,
    verifyStripeWebhook,
    extractPaidCheckout,
    paidLeadMarker,
    paidLeadFields,
    createStartCheckoutSession,
};

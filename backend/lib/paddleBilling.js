/**
 * FXGuard — Paddle Billing (فروش بین‌المللی؛ Paddle = Merchant of Record و مالیات جهانی)
 * @file    backend/lib/paddleBilling.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 *
 * جریان: سرور تراکنش را با custom_data.tenantId می‌سازد (کلاینت نمی‌تواند سازمان را عوض کند) →
 * Paddle.js overlay با transactionId → webhook امضاشده → فعال‌سازی / تغییر وضعیت اشتراک.
 */

'use strict';

const crypto = require('crypto');

const PADDLE_HOSTS = {
    sandbox: 'https://sandbox-api.paddle.com',
    production: 'https://api.paddle.com',
};
const TENANT_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SUBSCRIPTION_STATUS_MAP = {
    active: 'active',
    trialing: 'active',
    past_due: 'past_due',
    paused: 'suspended',
    canceled: 'suspended',
};

function paddleClientToken(env) {
    const t = String((env && env.PADDLE_CLIENT_TOKEN) || '').trim();
    return /^(live|test)_[A-Za-z0-9]{10,64}$/.test(t) ? t : '';
}

function paddleEnvironment(env) {
    const explicit = String((env && env.PADDLE_ENV) || '').trim().toLowerCase();
    if (explicit === 'production' || explicit === 'live') return 'production';
    if (explicit === 'sandbox') return 'sandbox';
    return paddleClientToken(env).indexOf('live_') === 0 ? 'production' : 'sandbox';
}

function paddlePriceId(env) {
    const p = String((env && env.PADDLE_PRICE_ID_START) || '').trim();
    return /^pri_[a-z0-9]{10,40}$/.test(p) ? p : '';
}

function isPaddleEnabled(env) {
    const src = env || {};
    return !!(
        paddleClientToken(src) &&
        paddlePriceId(src) &&
        String(src.PADDLE_API_KEY || '').trim() &&
        String(src.PADDLE_WEBHOOK_SECRET || '').trim()
    );
}

/** فقط مقادیر عمومی — client token و price id طبق طراحی Paddle در مرورگر استفاده می‌شوند */
function publicPaddleConfig(env) {
    if (!isPaddleEnabled(env)) return { enabled: false };
    return {
        enabled: true,
        environment: paddleEnvironment(env),
        clientToken: paddleClientToken(env),
        priceId: paddlePriceId(env),
    };
}

function paddleError(code, message, status) {
    const err = new Error(String(message || code).slice(0, 200));
    err.code = code;
    if (status) err.status = status;
    return err;
}

function buildTransactionRequest(env, opts) {
    const o = opts || {};
    const body = {
        items: [{ price_id: paddlePriceId(env), quantity: 1 }],
        collection_mode: 'automatic',
        custom_data: { tenantId: String(o.tenantId), plan: 'start' },
    };
    if (o.consentVersion) body.custom_data.consentVersion = String(o.consentVersion).slice(0, 16);
    return body;
}

/**
 * @param {(req: {url: string, headers: object, body: string}) => Promise<object>} postJson
 */
async function createPaddleTransaction(env, opts, postJson) {
    if (!isPaddleEnabled(env)) throw paddleError('PADDLE_DISABLED', 'PADDLE_DISABLED');
    if (!TENANT_ID_RE.test(String((opts && opts.tenantId) || ''))) {
        throw paddleError('PADDLE_BAD_TENANT', 'bad_tenant', 400);
    }
    const body = JSON.stringify(buildTransactionRequest(env, opts));
    const data = await postJson({
        url: PADDLE_HOSTS[paddleEnvironment(env)] + '/transactions',
        headers: {
            Authorization: 'Bearer ' + String(env.PADDLE_API_KEY).trim(),
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body,
    });
    const txn = data && data.data;
    if (!txn || !/^txn_[a-z0-9]{10,40}$/.test(String(txn.id || ''))) {
        throw paddleError('PADDLE_TXN_FAILED', 'transaction_failed');
    }
    return { transactionId: String(txn.id) };
}

function parsePaddleSignatureHeader(header) {
    const out = { ts: '', h1: [] };
    String(header || '')
        .split(';')
        .forEach((part) => {
            const idx = part.indexOf('=');
            if (idx < 1) return;
            const k = part.slice(0, idx).trim();
            const v = part.slice(idx + 1).trim();
            if (k === 'ts') out.ts = v;
            if (k === 'h1' && v) out.h1.push(v);
        });
    return out;
}

function timingSafeEqualStr(a, b) {
    const aa = Buffer.from(String(a || ''), 'utf8');
    const bb = Buffer.from(String(b || ''), 'utf8');
    if (aa.length !== bb.length) {
        crypto.timingSafeEqual(aa, Buffer.alloc(aa.length));
        return false;
    }
    return crypto.timingSafeEqual(aa, bb);
}

/** امضای Paddle-Signature: HMAC-SHA256(secret, ts + ":" + rawBody) */
function verifyPaddleWebhook(rawBody, header, secret, nowSec, toleranceSec) {
    const key = String(secret || '').trim();
    if (!key) return { ok: false, error: 'missing_secret' };
    const parsed = parsePaddleSignatureHeader(header);
    if (!parsed.ts || !parsed.h1.length) return { ok: false, error: 'bad_header' };
    const ts = Number(parsed.ts);
    if (!Number.isFinite(ts)) return { ok: false, error: 'bad_timestamp' };
    const now = Number.isFinite(nowSec) ? nowSec : Math.floor(Date.now() / 1000);
    const windowSec = Number.isFinite(toleranceSec) ? toleranceSec : 300;
    if (Math.abs(now - ts) > windowSec) return { ok: false, error: 'stale' };
    const expected = crypto
        .createHmac('sha256', key)
        .update(parsed.ts + ':' + String(rawBody || ''), 'utf8')
        .digest('hex');
    if (!parsed.h1.some((sig) => timingSafeEqualStr(sig, expected))) {
        return { ok: false, error: 'bad_signature' };
    }
    try {
        return { ok: true, event: JSON.parse(String(rawBody || '')) };
    } catch (_) {
        return { ok: false, error: 'bad_json' };
    }
}

function tenantIdFromCustomData(customData) {
    const id = customData && typeof customData === 'object' ? String(customData.tenantId || '') : '';
    return TENANT_ID_RE.test(id) ? id.toLowerCase() : '';
}

function parseEventTime(raw) {
    const d = raw ? new Date(raw) : null;
    return d && Number.isFinite(d.getTime()) ? d : null;
}

/**
 * رویداد webhook → یکی از:
 *  { kind: 'paid', paid }   برای transaction.completed با price مورد انتظار
 *  { kind: 'status', ... }  برای subscription.*
 *  null                      برای بقیه
 */
function extractPaddleEvent(event, env) {
    if (!event || typeof event !== 'object') return null;
    const type = String(event.event_type || '');
    const data = event.data || {};
    const occurredAt = parseEventTime(event.occurred_at) || new Date();

    if (type === 'transaction.completed') {
        if (String(data.status || '') !== 'completed') return null;
        const txnId = String(data.id || '');
        if (!/^txn_[a-z0-9]{10,40}$/.test(txnId)) return null;
        const expectedPrice = paddlePriceId(env);
        const items = Array.isArray(data.items) ? data.items : [];
        const hasPlan = items.some((it) => {
            const pid = (it && it.price && it.price.id) || (it && it.price_id) || '';
            return pid === expectedPrice;
        });
        if (!hasPlan) return null;
        const totals = (data.details && data.details.totals) || {};
        const amountMinor = /^\d{1,15}$/.test(String(totals.grand_total || totals.total || ''))
            ? Number(totals.grand_total || totals.total)
            : 0;
        const period = data.billing_period || {};
        return {
            kind: 'paid',
            paid: {
                provider: 'paddle',
                paymentId: txnId,
                tenantId: tenantIdFromCustomData(data.custom_data),
                subscriptionId: String(data.subscription_id || '').slice(0, 64) || null,
                customerId: String(data.customer_id || '').slice(0, 64) || null,
                amountMinor,
                currency: String(data.currency_code || '').toUpperCase().slice(0, 3),
                periodEnd: parseEventTime(period.ends_at),
                consentVersion:
                    data.custom_data && data.custom_data.consentVersion
                        ? String(data.custom_data.consentVersion).slice(0, 16)
                        : null,
                occurredAt,
            },
        };
    }

    if (type.indexOf('subscription.') === 0) {
        const mapped = SUBSCRIPTION_STATUS_MAP[String(data.status || '')];
        const subscriptionId = String(data.id || '');
        if (!mapped || !/^sub_[a-z0-9]{10,40}$/.test(subscriptionId)) return null;
        return {
            kind: 'status',
            provider: 'paddle',
            subscriptionId,
            customerId: String(data.customer_id || '').slice(0, 64) || null,
            tenantId: tenantIdFromCustomData(data.custom_data),
            tenantStatus: mapped,
            occurredAt,
        };
    }

    return null;
}

function paddleLeadMarker(transactionId) {
    return 'paddle:' + String(transactionId || '').slice(0, 64);
}

module.exports = {
    PADDLE_HOSTS,
    paddleClientToken,
    paddleEnvironment,
    paddlePriceId,
    isPaddleEnabled,
    publicPaddleConfig,
    buildTransactionRequest,
    createPaddleTransaction,
    parsePaddleSignatureHeader,
    verifyPaddleWebhook,
    extractPaddleEvent,
    paddleLeadMarker,
};

/**
 * FXGuard — خرید خودخدمت Cloud Start (iyzico برای ترکیه، Paddle بین‌المللی، کریپتو، Stripe اختیاری)
 * @file    backend/routes/billing.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */

'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const { Op } = require('sequelize');
const { ContactLead, Tenant } = require('../models');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const { isMainAdmin } = require('../lib/permissions');
const {
    publicBillingConfig,
    sanitizeCustomerEmail,
    createStartCheckoutSession,
    verifyStripeWebhook,
    extractPaidCheckout,
    paidLeadMarker,
    paidLeadFields,
    publicSiteUrl,
} = require('../lib/billingCheckout');
const {
    isCryptoPayEnabled,
    assertValidNetwork,
    validateTxId,
    publicCryptoBillingConfig,
    mintConfirmToken,
    parseConfirmToken,
    txIdFingerprint,
    salesWhatsApp,
    AMOUNT_USDT,
} = require('../lib/cryptoBilling');
const {
    CONSENT_VERSION,
    isIyzicoEnabled,
    publicIyzicoConfig,
    sanitizeBillingInfo,
    initializeCheckoutForm,
    retrieveCheckoutForm,
    extractPaidIyzico,
    tenantIdFromConversation,
    sanitizeToken,
    minorToAmount,
    iyzicoLeadMarker,
} = require('../lib/iyzicoCheckout');
const {
    isPaddleEnabled,
    publicPaddleConfig,
    createPaddleTransaction,
    verifyPaddleWebhook,
    extractPaddleEvent,
    paddleLeadMarker,
} = require('../lib/paddleBilling');
const { tenantDashboardUrl } = require('../lib/tenantHost');

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const checkoutLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 8,
    message: { error: 'تعداد درخواست پرداخت زیاد است. کمی صبر کنید.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const cryptoClaimLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 12,
    message: { error: 'تعداد ثبت TXID زیاد است. کمی صبر کنید.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const gatewayReturnLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { error: 'too_many_requests' },
    standardHeaders: true,
    legacyHeaders: false,
});

async function stripePostForm({ url, auth, body }) {
    const r = await axios.post(url, body, {
        auth: { username: auth, password: '' },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 20000,
        validateStatus: () => true,
    });
    if (r.status >= 400) {
        const msg =
            (r.data && r.data.error && r.data.error.message) || 'stripe_error';
        const err = new Error(String(msg).slice(0, 200));
        err.code = 'STRIPE_SESSION_FAILED';
        err.status = r.status;
        throw err;
    }
    return r.data;
}

async function gatewayPostJson({ url, headers, body }) {
    const r = await axios.post(url, body, {
        headers,
        timeout: 20000,
        validateStatus: () => true,
        maxRedirects: 0,
    });
    if (r.status >= 400) {
        const detail =
            (r.data && r.data.error && (r.data.error.detail || r.data.error.code)) ||
            (r.data && r.data.errorMessage) ||
            'gateway_error';
        const err = new Error(String(detail).slice(0, 200));
        err.code = 'GATEWAY_HTTP_ERROR';
        err.status = r.status;
        throw err;
    }
    return r.data;
}

async function persistGatewayLead(paid, slug, logger) {
    const marker =
        paid.provider === 'iyzico' ? iyzicoLeadMarker(paid.paymentId) : paddleLeadMarker(paid.paymentId);
    try {
        await ContactLead.create({
            purpose: 'purchase',
            name: slug || paid.tenantId || 'Cloud Start ' + paid.provider,
            email: 'billing@fxguard.io',
            phone: null,
            message: marker,
            source: paid.provider,
        });
    } catch (err) {
        logger.warn('Gateway paid lead persist failed', { provider: paid.provider, error: err.message });
    }
}

async function notifyGatewayPayment(paid, result, logger) {
    const lines = [
        'FXGuard Cloud Start payment — ' + paid.provider,
        'Tenant: ' + ((result && result.slug) || paid.tenantId || 'not matched — check manually'),
        'Payment: ' + paid.paymentId,
        'Amount: ' + minorToAmount(paid.amountMinor) + ' ' + paid.currency,
        'Status: ' + (result && result.activated ? 'panel activated' : 'recorded, panel not activated'),
        paid.provider === 'iyzico'
            ? 'Invoice: issue e-Arşiv / e-Fatura to the buyer for this payment.'
            : 'Invoice: Paddle is merchant of record; ERST invoices Paddle per payout.',
    ];
    try {
        const emailService = require('../services/emailService');
        const { getPanelSettings, getPanelEmailConfig } = require('../services/panelSettingsLoader');
        const panelSettings = await getPanelSettings();
        const panelEmailConfig = getPanelEmailConfig(panelSettings);
        if (panelEmailConfig || emailService.isEnabled()) {
            await emailService.sendContactForm({
                purpose: 'purchase',
                name: (result && result.slug) || 'Gateway payment',
                email: 'billing@fxguard.io',
                phone: '',
                message: lines.join('\n'),
                emailConfig: panelEmailConfig,
            });
        }
    } catch (err) {
        logger.warn('Gateway payment email failed', { provider: paid.provider, error: err.message });
    }
    try {
        const telegramService = require('../services/telegramService');
        if (telegramService.isEnabled()) {
            await telegramService.sendMessage(lines.join('\n'), null, { parse_mode: false });
        }
    } catch (err) {
        logger.warn('Gateway payment telegram failed', { provider: paid.provider, error: err.message });
    }
}

/** ثبت پرداخت + اعلان فقط بار اول (callback و webhook هر دو ممکن است برسند) */
async function applyVerifiedPayment(paid, logger) {
    const { recordGatewayPayment } = require('../services/billingGateways');
    const result = await recordGatewayPayment(paid, logger);
    if (!result.duplicate) {
        logger.info('Gateway payment recorded', {
            provider: paid.provider,
            paymentId: paid.paymentId,
            tenantId: result.tenantId || paid.tenantId || null,
            activated: !!result.activated,
        });
        await persistGatewayLead(paid, result.slug, logger);
        await notifyGatewayPayment(paid, result, logger);
    }
    return result;
}

async function verifyIyzicoToken(token, logger) {
    const raw = await retrieveCheckoutForm(process.env, token, gatewayPostJson);
    const verdict = extractPaidIyzico(raw, process.env);
    const tenantId = tenantIdFromConversation(raw && raw.conversationId);
    if (!verdict.ok) {
        logger.warn('iyzico payment not accepted', {
            reason: verdict.reason,
            tenantId: tenantId || null,
            errorCode: raw && raw.errorCode ? String(raw.errorCode).slice(0, 32) : null,
        });
        return { ok: false, reason: verdict.reason, tenantId };
    }
    const paid = Object.assign({}, verdict.paid, {
        consentVersion: CONSENT_VERSION,
        consentAt: new Date(),
    });
    const result = await applyVerifiedPayment(paid, logger);
    return { ok: true, tenantId, result };
}

async function dashboardRedirectFor(tenantId, status) {
    let slug = '';
    if (tenantId) {
        const row = await Tenant.findByPk(tenantId).catch(() => null);
        if (row) slug = row.slug;
    }
    const base = slug ? tenantDashboardUrl(slug, process.env) : publicSiteUrl(process.env) + '/dashboard';
    return base + (base.indexOf('?') >= 0 ? '&' : '?') + 'billing=' + encodeURIComponent(status);
}

function requireCheckoutConsent(req, res) {
    if (req.body && req.body.acceptTerms === true) return true;
    res.status(400).json({
        error: 'برای پرداخت باید قرارداد فروش از راه دور و سیاست بازپرداخت را بپذیرید.',
        code: 'CONSENT_REQUIRED',
    });
    return false;
}

async function persistPaidLead(paid, logger) {
    if (!paid || !paid.sessionId) return { created: false };
    const marker = paidLeadMarker(paid.sessionId);
    try {
        const existing = await ContactLead.findOne({
            where: { source: 'stripe', message: marker },
        });
        if (existing) return { created: false };
        await ContactLead.create(paidLeadFields(paid));
        return { created: true };
    } catch (err) {
        logger.warn('Stripe paid lead persist failed', { error: err.message });
        return { created: false, error: err.message };
    }
}

async function notifyPaidLead(paid, logger) {
    try {
        const emailService = require('../services/emailService');
        const { getPanelSettings, getPanelEmailConfig } = require('../services/panelSettingsLoader');
        const panelSettings = await getPanelSettings();
        const panelEmailConfig = getPanelEmailConfig(panelSettings);
        if (!panelEmailConfig && !emailService.isEnabled()) return;
        await emailService.sendContactForm({
            purpose: 'purchase',
            name: paid.name || 'Cloud Start checkout',
            email: paid.email || 'checkout@kaya.fxguard.io',
            phone: '',
            message:
                'Stripe Cloud Start paid.\nSession: ' +
                paid.sessionId +
                '\nAmount: ' +
                (paid.amountTotal || 4900) +
                ' ' +
                (paid.currency || 'usd') +
                '\nProvision a Start tenant (1 branch / 3 staff). Do not change this instance PLAN_TIER.',
            emailConfig: panelEmailConfig,
        });
    } catch (err) {
        logger.warn('Stripe paid lead email failed', { error: err.message });
    }
}

async function persistCryptoLead(claim, logger) {
    const marker = 'crypto:' + String(claim.txId || '').slice(0, 128);
    try {
        const existing = await ContactLead.findOne({
            where: { source: 'crypto', message: marker },
        });
        if (existing) return { created: false };
        await ContactLead.create({
            purpose: 'purchase',
            name: claim.name || claim.slug || 'Crypto Cloud Start',
            email: claim.email || 'crypto@fxguard.io',
            phone: null,
            message: marker,
            source: 'crypto',
        });
        return { created: true };
    } catch (err) {
        logger.warn('Crypto paid lead persist failed', { error: err.message });
        return { created: false, error: err.message };
    }
}

async function notifyCryptoClaim(claim, logger) {
    const lines = [
        'FXGuard crypto payment claim',
        'Tenant: ' + (claim.slug || claim.tenantId),
        'Network: ' + (claim.network || ''),
        'TXID: ' + (claim.txId || ''),
        'Amount: ' + AMOUNT_USDT + ' USDT (or ≈$49)',
        'Status: ' + (claim.activated ? 'auto-activated' : 'pending manual confirm'),
        claim.confirmHint ? 'Confirm: ' + claim.confirmHint : '',
    ].filter(Boolean);

    try {
        const emailService = require('../services/emailService');
        const { getPanelSettings, getPanelEmailConfig } = require('../services/panelSettingsLoader');
        const panelSettings = await getPanelSettings();
        const panelEmailConfig = getPanelEmailConfig(panelSettings);
        if (panelEmailConfig || emailService.isEnabled()) {
            await emailService.sendContactForm({
                purpose: 'purchase',
                name: claim.name || claim.slug || 'Crypto claim',
                email: claim.email || 'crypto@fxguard.io',
                phone: '',
                message: lines.join('\n'),
                emailConfig: panelEmailConfig,
            });
        }
    } catch (err) {
        logger.warn('Crypto claim email failed', { error: err.message });
    }

    try {
        const telegramService = require('../services/telegramService');
        if (telegramService.isEnabled()) {
            await telegramService.sendMessage(lines.join('\n'), null, { parse_mode: false });
        }
    } catch (err) {
        logger.warn('Crypto claim telegram failed', { error: err.message });
    }
}

function requireTenantOwnerOrAdmin(req, res) {
    if (!req.user) {
        res.status(401).json({ error: 'ورود لازم است' });
        return false;
    }
    if (!req.tenant || req.tenant.isPlatform || !req.tenant.id) {
        res.status(400).json({ error: 'این درخواست فقط از داخل پنل مشتری است' });
        return false;
    }
    if (String(req.user.tenantId || '') !== String(req.tenant.id)) {
        res.status(403).json({ error: 'دسترسی به این پنل ندارید' });
        return false;
    }
    const role = String(req.user.role || '');
    if (role !== 'owner' && role !== 'admin' && !isMainAdmin(req.user)) {
        res.status(403).json({ error: 'فقط مالک یا ادمین پنل می‌تواند پرداخت را ثبت کند' });
        return false;
    }
    return true;
}

function createBillingRouter(logger) {
    const router = express.Router();

    router.get('/billing/config', (req, res) => {
        res.set('Cache-Control', 'no-store');
        res.json(
            Object.assign({}, publicBillingConfig(process.env), {
                gateways: {
                    iyzico: publicIyzicoConfig(process.env),
                    paddle: publicPaddleConfig(process.env),
                },
            })
        );
    });

    router.post('/billing/iyzico/checkout', checkoutLimiter, authMiddleware, async (req, res) => {
        if (!requireTenantOwnerOrAdmin(req, res)) return;
        if (!isIyzicoEnabled(process.env)) {
            return res.status(503).json({ error: 'پرداخت با iyzico هنوز فعال نیست.', code: 'IYZICO_DISABLED' });
        }
        if (!requireCheckoutConsent(req, res)) return;
        const email = sanitizeCustomerEmail(req.user && req.user.email);
        if (!email) {
            return res.status(400).json({ error: 'ایمیل حساب کاربری برای صدور فاکتور لازم است.' });
        }
        const checked = sanitizeBillingInfo(req.body && req.body.billing);
        if (!checked.ok) {
            return res.status(400).json({
                error: 'اطلاعات صورتحساب ناقص یا نامعتبر است.',
                code: 'BILLING_INFO_INVALID',
                field: checked.field,
            });
        }
        try {
            const callbackUrl = publicSiteUrl(process.env) + '/api/webhook/iyzico/callback';
            const session = await initializeCheckoutForm(
                process.env,
                {
                    tenantId: req.tenant.id,
                    email,
                    billing: checked.billing,
                    ip: req.ip,
                    locale: String((req.body && req.body.locale) || '').slice(0, 2),
                    callbackUrl,
                },
                gatewayPostJson
            );
            if (!session.paymentPageUrl) {
                return res.status(502).json({ error: 'صفحهٔ پرداخت iyzico ساخته نشد.' });
            }
            logger.info('iyzico checkout started', {
                tenantId: req.tenant.id,
                userId: req.user.id,
                conversationId: session.conversationId,
                consentVersion: CONSENT_VERSION,
            });
            res.json({ ok: true, provider: 'iyzico', url: session.paymentPageUrl });
        } catch (err) {
            logger.warn('iyzico checkout init failed', {
                tenantId: req.tenant && req.tenant.id,
                error: err && err.message,
                status: err && err.status,
            });
            res.status(502).json({ error: 'ساخت جلسهٔ پرداخت iyzico ناموفق بود. دوباره تلاش کنید.' });
        }
    });

    // مرورگر خریدار بعد از پرداخت از دامنهٔ iyzico به اینجا POST می‌شود؛ زیر /webhook/ تا CSRF گارد کوکی آن را رد نکند
    router.post(
        '/webhook/iyzico/callback',
        gatewayReturnLimiter,
        express.urlencoded({ extended: false, limit: '16kb' }),
        async (req, res) => {
            const token = sanitizeToken(req.body && req.body.token);
            if (!token) return res.redirect(303, await dashboardRedirectFor('', 'failed'));
            try {
                const out = await verifyIyzicoToken(token, logger);
                let status = 'error';
                if (out.ok) status = out.result && (out.result.activated || out.result.duplicate) ? 'success' : 'received';
                else if (out.reason === 'fraud_review') status = 'review';
                else if (out.reason === 'not_paid' || out.reason === 'api_failure') status = 'failed';
                res.redirect(303, await dashboardRedirectFor(out.tenantId, status));
            } catch (err) {
                logger.warn('iyzico callback failed', { error: err && err.message });
                res.redirect(303, await dashboardRedirectFor('', 'error'));
            }
        }
    );

    // اعلان سرور‌به‌سرور iyzico: بدنه فقط محرک است؛ نتیجه دوباره با کلید مخفی از API خوانده می‌شود
    router.post('/webhook/iyzico', gatewayReturnLimiter, express.json({ limit: '16kb' }), async (req, res) => {
        if (!isIyzicoEnabled(process.env)) return res.status(503).json({ error: 'disabled' });
        const token = sanitizeToken(req.body && req.body.token);
        if (!token) return res.status(200).json({ received: true, ignored: true });
        try {
            await verifyIyzicoToken(token, logger);
            res.json({ received: true });
        } catch (err) {
            logger.warn('iyzico webhook failed', { error: err && err.message });
            res.status(500).json({ error: 'processing_failed' });
        }
    });

    router.post('/billing/paddle/transaction', checkoutLimiter, authMiddleware, async (req, res) => {
        if (!requireTenantOwnerOrAdmin(req, res)) return;
        if (!isPaddleEnabled(process.env)) {
            return res.status(503).json({ error: 'پرداخت بین‌المللی (Paddle) هنوز فعال نیست.', code: 'PADDLE_DISABLED' });
        }
        if (!requireCheckoutConsent(req, res)) return;
        try {
            const txn = await createPaddleTransaction(
                process.env,
                { tenantId: req.tenant.id, consentVersion: CONSENT_VERSION },
                gatewayPostJson
            );
            logger.info('Paddle checkout started', {
                tenantId: req.tenant.id,
                userId: req.user.id,
                transactionId: txn.transactionId,
                consentVersion: CONSENT_VERSION,
            });
            const cfg = publicPaddleConfig(process.env);
            res.json({
                ok: true,
                provider: 'paddle',
                transactionId: txn.transactionId,
                clientToken: cfg.clientToken,
                environment: cfg.environment,
                email: sanitizeCustomerEmail(req.user && req.user.email) || null,
            });
        } catch (err) {
            logger.warn('Paddle transaction failed', {
                tenantId: req.tenant && req.tenant.id,
                error: err && err.message,
                status: err && err.status,
            });
            res.status(502).json({ error: 'ساخت تراکنش Paddle ناموفق بود. دوباره تلاش کنید.' });
        }
    });

    router.post('/webhook/paddle', express.raw({ type: 'application/json', limit: '256kb' }), async (req, res) => {
        const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body || '');
        const verified = verifyPaddleWebhook(raw, req.headers['paddle-signature'], process.env.PADDLE_WEBHOOK_SECRET);
        if (!verified.ok) {
            logger.warn('Paddle webhook rejected', { error: verified.error });
            return res.status(400).json({ error: 'invalid_signature' });
        }
        const evt = extractPaddleEvent(verified.event, process.env);
        if (!evt) return res.json({ received: true, ignored: true });
        try {
            if (evt.kind === 'paid') {
                await applyVerifiedPayment(evt.paid, logger);
            } else if (evt.kind === 'status') {
                const { applySubscriptionStatus } = require('../services/billingGateways');
                await applySubscriptionStatus(evt, logger);
            }
            res.json({ received: true });
        } catch (err) {
            logger.warn('Paddle webhook processing failed', { error: err && err.message });
            res.status(500).json({ error: 'processing_failed' });
        }
    });

    router.post('/billing/checkout', checkoutLimiter, optionalAuthMiddleware, async (req, res) => {
        try {
            if (isCryptoPayEnabled(process.env)) {
                const crypto = publicCryptoBillingConfig(process.env);
                return res.json({
                    ok: true,
                    mode: 'crypto',
                    crypto,
                    message: 'پرداخت با کریپتو انجام می‌شود؛ TXID را در پنل ثبت کنید.',
                });
            }
            const bodyEmail = sanitizeCustomerEmail(req.body && req.body.email);
            const userEmail = sanitizeCustomerEmail(req.user && req.user.email);
            const extras = { email: bodyEmail || userEmail };
            if (req.tenant && req.tenant.id && !req.tenant.isPlatform) {
                extras.tenantId = req.tenant.id;
            }
            const session = await createStartCheckoutSession(
                process.env,
                extras,
                stripePostForm
            );
            res.json({ ok: true, url: session.url, id: session.id, mode: 'checkout' });
        } catch (err) {
            if (err && err.code === 'BILLING_DISABLED') {
                return res.status(503).json({
                    error: 'پرداخت کارت هنوز فعال نیست. از کریپتو یا واتساپ استفاده کنید.',
                });
            }
            logger.warn('Stripe checkout session failed', {
                error: err && err.message,
                status: err && err.status,
            });
            res.status(502).json({
                error: 'ساخت جلسه پرداخت ناموفق بود. کریپتو یا واتساپ را امتحان کنید.',
            });
        }
    });

    router.post(
        '/billing/crypto/claim',
        cryptoClaimLimiter,
        authMiddleware,
        async (req, res) => {
            try {
                if (!isCryptoPayEnabled(process.env)) {
                    return res.status(503).json({ error: 'پرداخت کریپتو فعال نیست' });
                }
                if (!requireTenantOwnerOrAdmin(req, res)) return;

                const network = String((req.body && req.body.network) || '').trim();
                if (!assertValidNetwork(network)) {
                    return res.status(400).json({ error: 'شبکهٔ پرداخت نامعتبر است' });
                }
                const checked = validateTxId(network, req.body && req.body.txId);
                if (!checked.ok) {
                    return res.status(400).json({ error: checked.error });
                }

                const tenant = await Tenant.findByPk(req.tenant.id);
                if (!tenant) {
                    return res.status(404).json({ error: 'سازمان یافت نشد' });
                }
                if (tenant.status === 'active' && tenant.cryptoPaymentStatus === 'confirmed') {
                    return res.json({
                        ok: true,
                        alreadyActive: true,
                        status: 'active',
                        cryptoPaymentStatus: 'confirmed',
                    });
                }

                const dup = await Tenant.findOne({
                    where: {
                        cryptoTxId: checked.txId,
                        id: { [Op.ne]: tenant.id },
                    },
                });
                if (dup) {
                    return res.status(409).json({ error: 'این TXID قبلاً برای پنل دیگری ثبت شده است' });
                }

                // TXID خوش‌فرم اثبات زنجیره نیست. حتی اگر CRYPTO_PAY_AUTO_ACTIVATE روشن باشد،
                // پنل فقط با تأیید دستی ادمین (یا لینک یک‌بارمصرف) فعال می‌شود.
                const auto = false;
                const minted = mintConfirmToken(tenant.id, process.env.JWT_SECRET, {
                    txId: checked.txId,
                });
                await tenant.update({
                    cryptoTxId: checked.txId,
                    cryptoNetwork: network,
                    cryptoPaymentStatus: 'pending',
                    cryptoPaidAt: null,
                    cryptoConfirmJti: minted.jti,
                });

                const activated = false;
                const token = minted.token;
                const site = String(
                    process.env.FRONTEND_URL ||
                        process.env.BACKEND_PUBLIC_URL ||
                        'https://app.fxguard.io'
                ).replace(/\/$/, '');
                const confirmHint = auto
                    ? ''
                    : site + '/api/billing/crypto/confirm?token=' + encodeURIComponent(token);

                const claim = {
                    tenantId: tenant.id,
                    slug: tenant.slug,
                    network,
                    txId: checked.txId,
                    email: req.user.email,
                    name: req.user.name,
                    activated,
                    confirmHint,
                };
                await persistCryptoLead(claim, logger);
                await notifyCryptoClaim(claim, logger);

                const wa = salesWhatsApp(process.env);
                const waText =
                    'FXGuard Cloud crypto payment\nPanel: ' +
                    tenant.slug +
                    '\nNetwork: ' +
                    network +
                    '\nTXID: ' +
                    checked.txId;
                res.json({
                    ok: true,
                    activated,
                    status: activated ? 'active' : tenant.status,
                    cryptoPaymentStatus: auto ? 'confirmed' : 'pending',
                    autoActivate: auto,
                    whatsappUrl: 'https://wa.me/' + wa + '?text=' + encodeURIComponent(waText),
                    message: activated
                        ? 'پرداخت ثبت و پنل فعال شد.'
                        : 'TXID ثبت شد. پس از تأیید دستی پنل باز می‌شود.',
                });
            } catch (err) {
                logger.warn('Crypto claim failed', { error: err && err.message });
                res.status(500).json({ error: 'ثبت پرداخت ناموفق بود' });
            }
        }
    );

    router.get('/billing/crypto/pending', authMiddleware, async (req, res) => {
        if (!isMainAdmin(req.user)) {
            return res.status(403).json({ error: 'فقط ادمین اصلی پلتفرم' });
        }
        const rows = await Tenant.findAll({
            where: { cryptoPaymentStatus: 'pending' },
            order: [['updatedAt', 'DESC']],
            limit: 50,
            attributes: [
                'id',
                'slug',
                'name',
                'status',
                'cryptoTxId',
                'cryptoNetwork',
                'cryptoPaymentStatus',
                'updatedAt',
            ],
        });
        res.json({ ok: true, items: rows });
    });

    /**
     * @param {object} [opts]
     * @param {string} [opts.txIdFingerprint] اثر انگشت TXID داخل توکن — باید با TXID فعلی سازمان بخواند
     */
    async function confirmCryptoTenant(tenantId, logger, opts = {}) {
        const row = await Tenant.findByPk(tenantId);
        if (!row) return { ok: false, status: 404, error: 'سازمان یافت نشد' };
        if (!row.cryptoTxId) {
            return { ok: false, status: 400, error: 'TXID ثبت نشده است' };
        }
        if (opts.txIdFingerprint && opts.txIdFingerprint !== txIdFingerprint(row.cryptoTxId)) {
            return { ok: false, status: 400, error: 'این لینک برای TXID دیگری صادر شده است' };
        }
        if (opts.jti && (!row.cryptoConfirmJti || row.cryptoConfirmJti !== opts.jti)) {
            return { ok: false, status: 400, error: 'این لینک یک‌بارمصرف است و دیگر معتبر نیست' };
        }
        // یک‌بارمصرف: پرداخت تأییدشده دوباره فعال‌سازی/به‌روزرسانی نمی‌شود
        if (row.cryptoPaymentStatus === 'confirmed' && row.status === 'active') {
            if (opts.jti) await row.update({ cryptoConfirmJti: null });
            return { ok: true, activated: false, alreadyConfirmed: true, tenantId: row.id, slug: row.slug };
        }
        const { activateTenantFromPaid } = require('../services/tenantProvision');
        const result = await activateTenantFromPaid(
            {
                tenantId: row.id,
                cryptoTxId: row.cryptoTxId,
                cryptoNetwork: row.cryptoNetwork,
                cryptoPaidAt: new Date(),
            },
            logger
        );
        if (opts.jti) await row.update({ cryptoConfirmJti: null });
        return {
            ok: true,
            activated: !!(result && result.activated),
            tenantId: row.id,
            slug: row.slug,
        };
    }

    router.post('/billing/crypto/confirm', authMiddleware, async (req, res) => {
        try {
            if (!isMainAdmin(req.user)) {
                return res.status(403).json({ error: 'فقط ادمین اصلی پلتفرم' });
            }
            const tenantId = String((req.body && req.body.tenantId) || '').trim();
            if (!tenantId) {
                return res.status(400).json({ error: 'tenantId لازم است' });
            }
            const result = await confirmCryptoTenant(tenantId, logger);
            if (!result.ok) {
                return res.status(result.status || 400).json({ error: result.error });
            }
            res.json(result);
        } catch (err) {
            logger.warn('Crypto confirm failed', { error: err && err.message });
            res.status(500).json({ error: 'تأیید پرداخت ناموفق بود' });
        }
    });

    router.get('/billing/crypto/confirm', async (req, res) => {
        try {
            const parsed = parseConfirmToken(req.query && req.query.token, process.env.JWT_SECRET);
            if (!parsed) {
                return res
                    .status(400)
                    .type('html')
                    .send('<p>لینک تأیید نامعتبر یا منقضی است. از پنل ادمین تأیید کنید.</p>');
            }
            const result = await confirmCryptoTenant(parsed.tenantId, logger, {
                txIdFingerprint: parsed.txIdFingerprint,
                jti: parsed.jti,
            });
            if (!result.ok) {
                return res
                    .status(result.status || 400)
                    .type('html')
                    .send('<p>' + escapeHtml(String(result.error || 'خطا')) + '</p>');
            }
            const slug = escapeHtml(String(result.slug || ''));
            res
                .type('html')
                .send(
                    result.alreadyConfirmed
                        ? '<p>پنل <strong>' + slug + '</strong> قبلاً فعال شده بود؛ این لینک دیگر اثری ندارد.</p>'
                        : '<p>پنل <strong>' + slug + '</strong> با کریپتو فعال شد.</p>'
                );
        } catch (err) {
            logger.warn('Crypto confirm token failed', { error: err && err.message });
            res.status(500).type('html').send('<p>تأیید ناموفق بود.</p>');
        }
    });

    router.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
        const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body || '');
        const verified = verifyStripeWebhook(
            raw,
            req.headers['stripe-signature'],
            process.env.STRIPE_WEBHOOK_SECRET
        );
        if (!verified.ok) {
            logger.warn('Stripe webhook rejected', { error: verified.error });
            return res.status(400).json({ error: 'invalid_signature' });
        }
        const paid = extractPaidCheckout(verified.event);
        if (paid) {
            const saved = await persistPaidLead(paid, logger);
            if (saved.created) await notifyPaidLead(paid, logger);
            try {
                const { activateTenantFromPaid } = require('../services/tenantProvision');
                await activateTenantFromPaid(paid, logger);
            } catch (actErr) {
                logger.warn('Tenant activation from Stripe failed', { error: actErr.message });
            }
        }
        res.json({ received: true });
    });

    return router;
}

module.exports = { createBillingRouter };

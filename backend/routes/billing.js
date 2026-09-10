/**
 * FXGuard — خرید خودخدمت Cloud Start (کریپتو اول، Stripe اختیاری)
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
} = require('../lib/billingCheckout');
const {
    isCryptoPayEnabled,
    cryptoAutoActivate,
    assertValidNetwork,
    validateTxId,
    publicCryptoBillingConfig,
    confirmTokenForTenant,
    parseConfirmToken,
    salesWhatsApp,
    AMOUNT_USDT,
} = require('../lib/cryptoBilling');

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
        res.json(publicBillingConfig(process.env));
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

                const auto = cryptoAutoActivate(process.env);
                const now = new Date();
                await tenant.update({
                    cryptoTxId: checked.txId,
                    cryptoNetwork: network,
                    cryptoPaymentStatus: auto ? 'confirmed' : 'pending',
                    cryptoPaidAt: auto ? now : null,
                });

                let activated = false;
                if (auto) {
                    const { activateTenantFromPaid } = require('../services/tenantProvision');
                    const result = await activateTenantFromPaid(
                        {
                            tenantId: tenant.id,
                            email: req.user.email,
                            cryptoTxId: checked.txId,
                            cryptoNetwork: network,
                            cryptoPaidAt: now,
                        },
                        logger
                    );
                    activated = !!(result && result.activated);
                }

                const token = confirmTokenForTenant(tenant.id, process.env.JWT_SECRET);
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

    async function confirmCryptoTenant(tenantId, logger) {
        const row = await Tenant.findByPk(tenantId);
        if (!row) return { ok: false, status: 404, error: 'سازمان یافت نشد' };
        if (!row.cryptoTxId) {
            return { ok: false, status: 400, error: 'TXID ثبت نشده است' };
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
            const tenantId = parseConfirmToken(req.query && req.query.token, process.env.JWT_SECRET);
            if (!tenantId) {
                return res.status(400).type('html').send('<p>لینک تأیید نامعتبر است.</p>');
            }
            const result = await confirmCryptoTenant(tenantId, logger);
            if (!result.ok) {
                return res
                    .status(result.status || 400)
                    .type('html')
                    .send('<p>' + String(result.error || 'خطا') + '</p>');
            }
            res
                .type('html')
                .send(
                    '<p>پنل <strong>' +
                        String(result.slug || '') +
                        '</strong> با کریپتو فعال شد.</p>'
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

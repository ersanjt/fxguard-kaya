/**
 * Kaya CRM — خرید خودخدمت Cloud Start (Stripe)
 * @file    backend/routes/billing.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */

'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const { ContactLead } = require('../models');
const {
    publicBillingConfig,
    sanitizeCustomerEmail,
    createStartCheckoutSession,
    verifyStripeWebhook,
    extractPaidCheckout,
    paidLeadMarker,
    paidLeadFields,
} = require('../lib/billingCheckout');

const checkoutLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 8,
    message: { error: 'تعداد درخواست پرداخت زیاد است. کمی صبر کنید.' },
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

function createBillingRouter(logger) {
    const router = express.Router();

    router.get('/billing/config', (req, res) => {
        res.set('Cache-Control', 'no-store');
        res.json(publicBillingConfig(process.env));
    });

    router.post('/billing/checkout', checkoutLimiter, async (req, res) => {
        try {
            const email = sanitizeCustomerEmail(req.body && req.body.email);
            const session = await createStartCheckoutSession(
                process.env,
                { email },
                stripePostForm
            );
            res.json({ ok: true, url: session.url, id: session.id });
        } catch (err) {
            if (err && err.code === 'BILLING_DISABLED') {
                return res.status(503).json({
                    error: 'پرداخت کارت هنوز فعال نیست. از واتساپ استفاده کنید.',
                });
            }
            logger.warn('Stripe checkout session failed', {
                error: err && err.message,
                status: err && err.status,
            });
            res.status(502).json({
                error: 'ساخت جلسه پرداخت ناموفق بود. واتساپ را امتحان کنید.',
            });
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
        }
        res.json({ received: true });
    });

    return router;
}

module.exports = { createBillingRouter };

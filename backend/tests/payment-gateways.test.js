/**
 * Unit tests — iyzico Checkout Form + Paddle Billing + دفتر پرداخت idempotent
 * @file    backend/tests/payment-gateways.test.js
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * اجرا: node tests/payment-gateways.test.js  (بدون شبکه؛ DB = sqlite در حافظه)
 */
'use strict';

const assert = require('assert');
const crypto = require('crypto');
const { Sequelize } = require('sequelize');
const iyzico = require('../lib/iyzicoCheckout');
const paddle = require('../lib/paddleBilling');
const { extendPaidUntil, recordGatewayPayment, applySubscriptionStatus } = require('../services/billingGateways');
const { tenantAccessState } = require('../lib/tenantTrial');

let passed = 0;
let failed = 0;

async function test(name, fn) {
    try {
        await fn();
        passed++;
        console.log('  ✓', name);
    } catch (err) {
        failed++;
        console.error('  ✗', name, '→', err.message);
    }
}

const TENANT_ID = '3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e';
const IYZICO_ENV = {
    IYZICO_API_KEY: 'sandbox-test-api-key',
    IYZICO_SECRET_KEY: 'sandbox-test-secret',
    IYZICO_PRICE_START: '1990.00',
    IYZICO_CURRENCY: 'TRY',
};
const PADDLE_ENV = {
    PADDLE_CLIENT_TOKEN: 'test_0123456789abcdef0123',
    PADDLE_API_KEY: 'pdl_sdbx_apikey_test',
    PADDLE_PRICE_ID_START: 'pri_01hv0vax6rv18t4tamj848ne4d',
    PADDLE_WEBHOOK_SECRET: 'pdl_ntfset_test_secret',
};
const BILLING = {
    fullName: 'Ayşe Yılmaz',
    country: 'Turkey',
    city: 'İstanbul',
    address: 'Örnek Mah. 1. Sk. No: 1',
};

function paddleSignature(raw, secret, ts) {
    const h1 = crypto.createHmac('sha256', secret).update(ts + ':' + raw, 'utf8').digest('hex');
    return 'ts=' + ts + ';h1=' + h1;
}

async function makeDb() {
    const sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    const Tenant = sequelize.define(
        'Tenant',
        {
            id: { type: Sequelize.UUID, primaryKey: true },
            slug: Sequelize.STRING,
            status: Sequelize.STRING,
            billingProvider: Sequelize.STRING,
            billingCustomerId: Sequelize.STRING,
            billingSubscriptionId: Sequelize.STRING,
            billingPaidUntil: Sequelize.DATE,
            billingEventAt: Sequelize.DATE,
        },
        { tableName: 'tenants' }
    );
    const BillingPayment = require('../models/BillingPayment')(sequelize);
    await sequelize.sync();
    await Tenant.create({ id: TENANT_ID, slug: 'acme', status: 'trial' });
    return { sequelize, Tenant, BillingPayment };
}

async function run() {
    console.log('payment gateways unit tests\n');

    await test('amounts are parsed to integer minor units without floats', () => {
        assert.strictEqual(iyzico.parseAmountToMinor('1990.00'), 199000);
        assert.strictEqual(iyzico.parseAmountToMinor('1990.5'), 199050);
        assert.strictEqual(iyzico.parseAmountToMinor('0.1'), 10);
        assert.strictEqual(iyzico.parseAmountToMinor(19.9), 1990);
        assert.strictEqual(iyzico.parseAmountToMinor('1990.12000000'), 199012);
        assert.strictEqual(iyzico.parseAmountToMinor('1990.123'), null);
        assert.strictEqual(iyzico.parseAmountToMinor('1.990,00'), null);
        assert.strictEqual(iyzico.parseAmountToMinor('-5'), null);
        assert.strictEqual(iyzico.parseAmountToMinor(''), null);
        assert.strictEqual(iyzico.minorToAmount(199005), '1990.05');
    });

    await test('iyzico stays off until keys, price and a supported currency are set', () => {
        assert.strictEqual(iyzico.isIyzicoEnabled({}), false);
        assert.strictEqual(iyzico.isIyzicoEnabled({ ...IYZICO_ENV, IYZICO_PRICE_START: '' }), false);
        assert.strictEqual(iyzico.isIyzicoEnabled({ ...IYZICO_ENV, IYZICO_CURRENCY: 'BTC' }), false);
        assert.strictEqual(iyzico.isIyzicoEnabled(IYZICO_ENV), true);
        const cfg = iyzico.publicIyzicoConfig(IYZICO_ENV);
        assert.strictEqual(cfg.amount, '1990.00');
        assert.strictEqual(cfg.environment, 'sandbox');
        assert.ok(!JSON.stringify(cfg).includes('secret'));
    });

    await test('IYZWSv2 header signs randomKey + path + body with HMAC-SHA256', () => {
        const body = '{"a":1}';
        const h = iyzico.iyzicoAuthHeaders('key1', 'sec1', iyzico.INIT_PATH, body, 'rnd123');
        const expectedSig = crypto.createHmac('sha256', 'sec1').update('rnd123' + iyzico.INIT_PATH + body).digest('hex');
        assert.ok(h.Authorization.startsWith('IYZWSv2 '));
        const decoded = Buffer.from(h.Authorization.slice(8), 'base64').toString('utf8');
        assert.strictEqual(decoded, 'apiKey:key1&randomKey:rnd123&signature:' + expectedSig);
        assert.strictEqual(h['x-iyzi-rnd'], 'rnd123');
    });

    await test('billing info requires first + last name, country, city and address', () => {
        assert.strictEqual(iyzico.sanitizeBillingInfo({ ...BILLING, fullName: 'Ayşe' }).field, 'fullName');
        assert.strictEqual(iyzico.sanitizeBillingInfo({ ...BILLING, city: '' }).field, 'city');
        assert.strictEqual(iyzico.sanitizeBillingInfo({ ...BILLING, identityNumber: '12<3' }).field, 'identityNumber');
        const ok = iyzico.sanitizeBillingInfo({ ...BILLING, address: '<b>Örnek</b> Mah. 1' });
        assert.strictEqual(ok.ok, true);
        assert.strictEqual(ok.billing.name, 'Ayşe');
        assert.strictEqual(ok.billing.surname, 'Yılmaz');
        assert.ok(!/[<>]/.test(ok.billing.address));
    });

    await test('initialize sends a VIRTUAL basket bound to the tenant and returns the iyzico page', async () => {
        let sent = null;
        const out = await iyzico.initializeCheckoutForm(
            IYZICO_ENV,
            {
                tenantId: TENANT_ID,
                email: 'owner@example.com',
                billing: iyzico.sanitizeBillingInfo(BILLING).billing,
                ip: '203.0.113.5',
                locale: 'tr',
                callbackUrl: 'https://app.fxguard.io/api/webhook/iyzico/callback',
            },
            async (req) => {
                sent = req;
                return { status: 'success', token: 'tok-1234567890', paymentPageUrl: 'https://sandbox-cpp.iyzipay.com?token=x' };
            }
        );
        assert.strictEqual(sent.url, 'https://sandbox-api.iyzipay.com' + iyzico.INIT_PATH);
        const body = JSON.parse(sent.body);
        assert.strictEqual(body.price, '1990.00');
        assert.strictEqual(body.paidPrice, '1990.00');
        assert.strictEqual(body.currency, 'TRY');
        assert.strictEqual(body.basketItems[0].itemType, 'VIRTUAL');
        assert.strictEqual(body.basketItems[0].price, body.price);
        assert.deepStrictEqual(body.enabledInstallments, [1]);
        assert.strictEqual(iyzico.tenantIdFromConversation(body.conversationId), TENANT_ID);
        assert.strictEqual(out.paymentPageUrl, 'https://sandbox-cpp.iyzipay.com?token=x');
    });

    await test('initialize rejects a payment page outside iyzipay.com', async () => {
        await assert.rejects(
            iyzico.initializeCheckoutForm(
                IYZICO_ENV,
                { tenantId: TENANT_ID, email: 'o@example.com', billing: iyzico.sanitizeBillingInfo(BILLING).billing },
                async () => ({ status: 'success', token: 'tok-1234567890', paymentPageUrl: 'https://evil.example/pay' })
            ),
            /unexpected_payment_page/
        );
    });

    const goodRetrieve = {
        status: 'success',
        paymentStatus: 'SUCCESS',
        fraudStatus: 1,
        conversationId: 'fxg_' + TENANT_ID + '_a1b2c3d4e5f6',
        currency: 'TRY',
        paidPrice: 1990.0,
        paymentId: '22416035',
    };

    await test('retrieve result activates only when paid, fraud-clear, same currency and full amount', () => {
        const ok = iyzico.extractPaidIyzico(goodRetrieve, IYZICO_ENV);
        assert.strictEqual(ok.ok, true);
        assert.strictEqual(ok.paid.tenantId, TENANT_ID);
        assert.strictEqual(ok.paid.amountMinor, 199000);
        assert.strictEqual(iyzico.extractPaidIyzico({ ...goodRetrieve, fraudStatus: 0 }, IYZICO_ENV).reason, 'fraud_review');
        assert.strictEqual(iyzico.extractPaidIyzico({ ...goodRetrieve, paymentStatus: 'FAILURE' }, IYZICO_ENV).reason, 'not_paid');
        assert.strictEqual(iyzico.extractPaidIyzico({ ...goodRetrieve, currency: 'USD' }, IYZICO_ENV).reason, 'currency_mismatch');
        assert.strictEqual(iyzico.extractPaidIyzico({ ...goodRetrieve, paidPrice: '19.90' }, IYZICO_ENV).reason, 'amount_mismatch');
        assert.strictEqual(
            iyzico.extractPaidIyzico({ ...goodRetrieve, conversationId: 'fxg_other' }, IYZICO_ENV).reason,
            'bad_conversation'
        );
    });

    await test('Paddle public config exposes only the client token and price id', () => {
        assert.strictEqual(paddle.isPaddleEnabled({}), false);
        const cfg = paddle.publicPaddleConfig(PADDLE_ENV);
        assert.strictEqual(cfg.enabled, true);
        assert.strictEqual(cfg.environment, 'sandbox');
        const json = JSON.stringify(cfg);
        assert.ok(!json.includes(PADDLE_ENV.PADDLE_API_KEY));
        assert.ok(!json.includes(PADDLE_ENV.PADDLE_WEBHOOK_SECRET));
    });

    await test('Paddle transaction carries tenantId server-side', async () => {
        let sent = null;
        const out = await paddle.createPaddleTransaction(PADDLE_ENV, { tenantId: TENANT_ID }, async (req) => {
            sent = req;
            return { data: { id: 'txn_01hv8wptq8987qeep44cyrewp9' } };
        });
        assert.strictEqual(sent.url, 'https://sandbox-api.paddle.com/transactions');
        assert.strictEqual(sent.headers.Authorization, 'Bearer ' + PADDLE_ENV.PADDLE_API_KEY);
        const body = JSON.parse(sent.body);
        assert.strictEqual(body.custom_data.tenantId, TENANT_ID);
        assert.strictEqual(body.items[0].price_id, PADDLE_ENV.PADDLE_PRICE_ID_START);
        assert.strictEqual(out.transactionId, 'txn_01hv8wptq8987qeep44cyrewp9');
        await assert.rejects(paddle.createPaddleTransaction(PADDLE_ENV, { tenantId: 'x' }, async () => ({})), /bad_tenant/);
    });

    const txnEvent = {
        event_id: 'evt_01',
        event_type: 'transaction.completed',
        occurred_at: '2026-10-30T10:00:00.000Z',
        data: {
            id: 'txn_01hv8wptq8987qeep44cyrewp9',
            status: 'completed',
            customer_id: 'ctm_01hv6y1jedq4p1n0yqn5ba3ky4',
            subscription_id: 'sub_01hv8x29kz0t586xy6zn1a62ny',
            currency_code: 'USD',
            custom_data: { tenantId: TENANT_ID, plan: 'start' },
            items: [{ price: { id: PADDLE_ENV.PADDLE_PRICE_ID_START }, quantity: 1 }],
            details: { totals: { total: '4900', grand_total: '4900' } },
            billing_period: { starts_at: '2026-10-30T10:00:00Z', ends_at: '2026-11-30T10:00:00Z' },
        },
    };

    await test('Paddle webhook signature: valid, tampered, stale and missing secret', () => {
        const raw = JSON.stringify(txnEvent);
        const ts = 1700000000;
        const header = paddleSignature(raw, PADDLE_ENV.PADDLE_WEBHOOK_SECRET, ts);
        const ok = paddle.verifyPaddleWebhook(raw, header, PADDLE_ENV.PADDLE_WEBHOOK_SECRET, ts + 10);
        assert.strictEqual(ok.ok, true);
        assert.strictEqual(ok.event.event_type, 'transaction.completed');
        assert.strictEqual(
            paddle.verifyPaddleWebhook(raw.replace('4900', '1'), header, PADDLE_ENV.PADDLE_WEBHOOK_SECRET, ts).error,
            'bad_signature'
        );
        assert.strictEqual(paddle.verifyPaddleWebhook(raw, header, PADDLE_ENV.PADDLE_WEBHOOK_SECRET, ts + 3600).error, 'stale');
        assert.strictEqual(paddle.verifyPaddleWebhook(raw, header, '', ts).error, 'missing_secret');
        assert.strictEqual(paddle.verifyPaddleWebhook(raw, 'garbage', PADDLE_ENV.PADDLE_WEBHOOK_SECRET, ts).error, 'bad_header');
    });

    await test('Paddle events map to paid / subscription status; other prices are ignored', () => {
        const paid = paddle.extractPaddleEvent(txnEvent, PADDLE_ENV);
        assert.strictEqual(paid.kind, 'paid');
        assert.strictEqual(paid.paid.tenantId, TENANT_ID);
        assert.strictEqual(paid.paid.amountMinor, 4900);
        assert.strictEqual(paid.paid.currency, 'USD');
        const otherPrice = JSON.parse(JSON.stringify(txnEvent));
        otherPrice.data.items[0].price.id = 'pri_01other0000000000000000';
        assert.strictEqual(paddle.extractPaddleEvent(otherPrice, PADDLE_ENV), null);
        const canceled = paddle.extractPaddleEvent(
            {
                event_type: 'subscription.canceled',
                occurred_at: '2026-12-01T00:00:00Z',
                data: { id: 'sub_01hv8x29kz0t586xy6zn1a62ny', status: 'canceled', custom_data: { tenantId: TENANT_ID } },
            },
            PADDLE_ENV
        );
        assert.strictEqual(canceled.kind, 'status');
        assert.strictEqual(canceled.tenantStatus, 'suspended');
        assert.strictEqual(paddle.extractPaddleEvent({ event_type: 'customer.created', data: {} }, PADDLE_ENV), null);
    });

    await test('paid period extends from the current end when renewing early', () => {
        const now = new Date('2026-10-30T00:00:00Z');
        assert.strictEqual(extendPaidUntil(null, 30, now).toISOString(), '2026-11-29T00:00:00.000Z');
        assert.strictEqual(
            extendPaidUntil(new Date('2026-11-10T00:00:00Z'), 30, now).toISOString(),
            '2026-12-10T00:00:00.000Z'
        );
        assert.strictEqual(
            extendPaidUntil(new Date('2026-10-01T00:00:00Z'), 30, now).toISOString(),
            '2026-11-29T00:00:00.000Z'
        );
    });

    await test('active tenant locks after paid period + 3 day grace', () => {
        const paidUntil = new Date('2026-11-29T00:00:00Z');
        const tenant = { id: TENANT_ID, status: 'active', billingPaidUntil: paidUntil };
        assert.strictEqual(tenantAccessState(tenant, new Date('2026-12-01T00:00:00Z')).ok, true);
        const late = tenantAccessState(tenant, new Date('2026-12-03T00:00:01Z'));
        assert.strictEqual(late.ok, false);
        assert.strictEqual(late.code, 'PAYMENT_REQUIRED');
        assert.strictEqual(tenantAccessState({ id: TENANT_ID, status: 'active' }, new Date('2030-01-01')).ok, true);
    });

    await test('iyzico payment is recorded once: callback + webhook do not double-extend', async () => {
        const db = await makeDb();
        const now = new Date('2026-10-30T00:00:00Z');
        const paid = { ...iyzico.extractPaidIyzico(goodRetrieve, IYZICO_ENV).paid, consentVersion: '2026-10' };
        const first = await recordGatewayPayment(paid, null, { models: db, now });
        assert.strictEqual(first.activated, true);
        const second = await recordGatewayPayment(paid, null, { models: db, now });
        assert.strictEqual(second.duplicate, true);
        const row = await db.Tenant.findByPk(TENANT_ID);
        assert.strictEqual(row.status, 'active');
        assert.strictEqual(row.billingProvider, 'iyzico');
        assert.strictEqual(new Date(row.billingPaidUntil).toISOString(), '2026-11-29T00:00:00.000Z');
        assert.strictEqual(await db.BillingPayment.count(), 1);
        const ledger = await db.BillingPayment.findOne();
        assert.strictEqual(Number(ledger.amountMinor), 199000);
        assert.strictEqual(ledger.consentVersion, '2026-10');
        await db.sequelize.close();
    });

    await test('Paddle: payment activates, stale events are ignored, later cancel suspends', async () => {
        const db = await makeDb();
        const paidEvt = paddle.extractPaddleEvent(txnEvent, PADDLE_ENV).paid;
        const res = await recordGatewayPayment(paidEvt, null, { models: db });
        assert.strictEqual(res.activated, true);
        let row = await db.Tenant.findByPk(TENANT_ID);
        assert.strictEqual(row.billingSubscriptionId, 'sub_01hv8x29kz0t586xy6zn1a62ny');
        assert.strictEqual(row.billingPaidUntil, null);

        const stale = await applySubscriptionStatus(
            {
                provider: 'paddle',
                subscriptionId: 'sub_01hv8x29kz0t586xy6zn1a62ny',
                tenantId: TENANT_ID,
                tenantStatus: 'past_due',
                occurredAt: new Date('2026-10-29T00:00:00Z'),
            },
            null,
            { models: db }
        );
        assert.strictEqual(stale.reason, 'stale_event');

        const other = await applySubscriptionStatus(
            {
                provider: 'paddle',
                subscriptionId: 'sub_01other000000000000000000',
                tenantId: TENANT_ID,
                tenantStatus: 'suspended',
                occurredAt: new Date('2026-12-01T00:00:00Z'),
            },
            null,
            { models: db }
        );
        assert.strictEqual(other.reason, 'other_subscription');

        const cancel = await applySubscriptionStatus(
            {
                provider: 'paddle',
                subscriptionId: 'sub_01hv8x29kz0t586xy6zn1a62ny',
                tenantId: '',
                tenantStatus: 'suspended',
                occurredAt: new Date('2026-12-01T00:00:00Z'),
            },
            null,
            { models: db }
        );
        assert.strictEqual(cancel.applied, true);
        row = await db.Tenant.findByPk(TENANT_ID);
        assert.strictEqual(row.status, 'suspended');
        await db.sequelize.close();
    });

    console.log('\n' + passed + ' passed, ' + failed + ' failed');
    if (failed > 0) process.exit(1);
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});

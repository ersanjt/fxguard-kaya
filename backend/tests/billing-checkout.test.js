/**
 * Unit tests for optional Stripe Cloud Start checkout
 */
const assert = require('assert');
const crypto = require('crypto');
const {
    START_AMOUNT_CENTS,
    resolveBillingMode,
    publicBillingConfig,
    isAllowedPaymentLink,
    buildCheckoutForm,
    verifyStripeWebhook,
    extractPaidCheckout,
    paidLeadFields,
    paidLeadMarker,
    sanitizeCustomerEmail,
    createStartCheckoutSession,
    publicSiteUrl,
} = require('../lib/billingCheckout');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        const ret = fn();
        if (ret && typeof ret.then === 'function') {
            return ret
                .then(() => {
                    passed++;
                    console.log('  ✓', name);
                })
                .catch((err) => {
                    failed++;
                    console.error('  ✗', name, '→', err.message);
                });
        }
        passed++;
        console.log('  ✓', name);
    } catch (err) {
        failed++;
        console.error('  ✗', name, '→', err.message);
    }
    return Promise.resolve();
}

console.log('billingCheckout unit tests\n');

async function run() {
    await test('billing is off without keys or payment link', () => {
        assert.strictEqual(resolveBillingMode({}), 'off');
        const cfg = publicBillingConfig({});
        assert.strictEqual(cfg.enabled, false);
        assert.strictEqual(cfg.amountUsd, 49);
        assert.strictEqual(START_AMOUNT_CENTS, 4900);
    });

    await test('payment link must be Stripe HTTPS host', () => {
        assert.strictEqual(isAllowedPaymentLink('https://evil.example/pay'), false);
        assert.strictEqual(isAllowedPaymentLink('http://buy.stripe.com/x'), false);
        assert.strictEqual(isAllowedPaymentLink('https://buy.stripe.com/test_abc'), true);
        assert.strictEqual(resolveBillingMode({ STRIPE_PAYMENT_LINK_START: 'https://buy.stripe.com/test_abc' }), 'link');
        const cfg = publicBillingConfig({ STRIPE_PAYMENT_LINK_START: 'https://buy.stripe.com/test_abc' });
        assert.strictEqual(cfg.enabled, true);
        assert.strictEqual(cfg.mode, 'link');
        assert.strictEqual(cfg.checkoutUrl, 'https://buy.stripe.com/test_abc');
    });

    await test('secret key enables checkout mode over a payment link', () => {
        assert.strictEqual(
            resolveBillingMode({
                STRIPE_SECRET_KEY: 'sk_test_abc',
                STRIPE_PAYMENT_LINK_START: 'https://buy.stripe.com/test_abc',
            }),
            'checkout'
        );
        assert.strictEqual(resolveBillingMode({ STRIPE_SECRET_KEY: 'pk_live_nope' }), 'off');
    });

    await test('checkout form is $49/mo Start and does not auto-provision this instance', () => {
        const form = buildCheckoutForm(
            { BACKEND_PUBLIC_URL: 'https://kaya.fxguard.io' },
            { email: 'buyer@example.com' }
        );
        assert.strictEqual(form.get('line_items[0][price_data][unit_amount]'), '4900');
        assert.strictEqual(form.get('line_items[0][price_data][recurring][interval]'), 'month');
        assert.strictEqual(form.get('metadata[plan]'), 'start');
        assert.strictEqual(form.get('customer_email'), 'buyer@example.com');
        assert.ok(form.get('success_url').indexOf('/billing/success') >= 0);
        assert.ok(form.get('cancel_url').indexOf('/pricing') >= 0);
        assert.strictEqual(publicSiteUrl({}), 'https://kaya.fxguard.io');
    });

    await test('price id replaces inline price_data', () => {
        const form = buildCheckoutForm({ STRIPE_PRICE_ID_START: 'price_123' }, {});
        assert.strictEqual(form.get('line_items[0][price]'), 'price_123');
        assert.strictEqual(form.get('line_items[0][price_data][unit_amount]'), null);
    });

    await test('invalid email is dropped', () => {
        assert.strictEqual(sanitizeCustomerEmail('not-an-email'), '');
        assert.strictEqual(sanitizeCustomerEmail('ok@desk.example'), 'ok@desk.example');
    });

    await test('webhook signature rejects tamper and accepts valid payload', () => {
        const secret = 'whsec_test_secret';
        const payload = JSON.stringify({
            type: 'checkout.session.completed',
            data: { object: { object: 'checkout.session', id: 'cs_1', payment_status: 'paid' } },
        });
        const ts = 1700000000;
        const sig = crypto.createHmac('sha256', secret).update(ts + '.' + payload, 'utf8').digest('hex');
        const header = 't=' + ts + ',v1=' + sig;
        const bad = verifyStripeWebhook(payload, header, secret, ts + 999, 300);
        assert.strictEqual(bad.ok, false);
        const ok = verifyStripeWebhook(payload, header, secret, ts, 300);
        assert.strictEqual(ok.ok, true);
        assert.strictEqual(ok.event.type, 'checkout.session.completed');
        const forged = verifyStripeWebhook(payload, 't=' + ts + ',v1=' + '00'.repeat(32), secret, ts, 300);
        assert.strictEqual(forged.ok, false);
    });

    await test('paid checkout becomes a purchase lead without touching PLAN_TIER', () => {
        const paid = extractPaidCheckout({
            type: 'checkout.session.completed',
            data: {
                object: {
                    object: 'checkout.session',
                    id: 'cs_test_1',
                    payment_status: 'paid',
                    customer_email: 'desk@example.com',
                    customer_details: { name: 'Istanbul Desk', email: 'desk@example.com' },
                    metadata: { plan: 'start' },
                    amount_total: 4900,
                    currency: 'usd',
                },
            },
        });
        assert.strictEqual(paid.email, 'desk@example.com');
        assert.strictEqual(paid.plan, 'start');
        const fields = paidLeadFields(paid);
        assert.strictEqual(fields.purpose, 'purchase');
        assert.strictEqual(fields.source, 'stripe');
        assert.strictEqual(fields.message, paidLeadMarker('cs_test_1'));
        assert.strictEqual(extractPaidCheckout({ type: 'ping' }), null);
    });

    await test('createStartCheckoutSession no-ops without secret and returns Stripe URL when posted', async () => {
        let threw = false;
        try {
            await createStartCheckoutSession({}, {}, async () => ({ url: 'https://checkout.stripe.com/c/pay/x' }));
        } catch (err) {
            threw = err.code === 'BILLING_DISABLED';
        }
        assert.strictEqual(threw, true);
        const session = await createStartCheckoutSession(
            { STRIPE_SECRET_KEY: 'sk_test_abc', BACKEND_PUBLIC_URL: 'https://kaya.fxguard.io' },
            {},
            async ({ url, auth, body }) => {
                assert.strictEqual(url.indexOf('https://api.stripe.com/') === 0, true);
                assert.strictEqual(auth, 'sk_test_abc');
                assert.ok(String(body).indexOf('unit_amount%5D=4900') >= 0);
                return { url: 'https://checkout.stripe.com/c/pay/cs_test', id: 'cs_test' };
            }
        );
        assert.strictEqual(session.url, 'https://checkout.stripe.com/c/pay/cs_test');
    });

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

run();

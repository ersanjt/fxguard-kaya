/**
 * Unit tests — crypto Cloud Start billing
 */
'use strict';

const assert = require('assert');
const {
    isCryptoPayEnabled,
    cryptoAutoActivate,
    publicCryptoBillingConfig,
    validateTxId,
    assertValidNetwork,
    confirmTokenForTenant,
    parseConfirmToken,
    DEFAULT_WALLETS,
    AMOUNT_USDT,
} = require('../lib/cryptoBilling');
const { publicBillingConfig, resolveBillingMode } = require('../lib/billingCheckout');

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

console.log('cryptoBilling unit tests\n');

async function run() {
    await test('default wallets enable crypto without env', () => {
        assert.strictEqual(isCryptoPayEnabled({}), true);
        assert.strictEqual(AMOUNT_USDT, 49);
        assert.ok(DEFAULT_WALLETS.usdt_trc20);
        const cfg = publicCryptoBillingConfig({});
        assert.strictEqual(cfg.enabled, true);
        assert.ok(cfg.wallets.length >= 3);
        assert.strictEqual(cfg.autoActivate, true);
    });

    await test('CRYPTO_PAY_DISABLED turns crypto off', () => {
        assert.strictEqual(isCryptoPayEnabled({ CRYPTO_PAY_DISABLED: 'true' }), false);
        const billing = publicBillingConfig({ CRYPTO_PAY_DISABLED: '1' });
        assert.strictEqual(billing.mode, 'off');
        assert.strictEqual(billing.enabled, false);
    });

    await test('publicBillingConfig prefers crypto over Stripe', () => {
        const cfg = publicBillingConfig({
            STRIPE_SECRET_KEY: 'sk_test_abc',
        });
        assert.strictEqual(cfg.mode, 'crypto');
        assert.strictEqual(cfg.enabled, true);
        assert.strictEqual(cfg.stripeAvailable, true);
        assert.strictEqual(resolveBillingMode({ STRIPE_SECRET_KEY: 'sk_test_abc' }), 'checkout');
    });

    await test('auto activate can be disabled', () => {
        assert.strictEqual(cryptoAutoActivate({ CRYPTO_PAY_AUTO_ACTIVATE: 'false' }), false);
        assert.strictEqual(cryptoAutoActivate({}), true);
    });

    await test('txid validation per network', () => {
        assert.strictEqual(assertValidNetwork('usdt_trc20'), true);
        assert.strictEqual(assertValidNetwork('nope'), false);
        const tron = validateTxId('usdt_trc20', 'a'.repeat(64));
        assert.strictEqual(tron.ok, true);
        const bad = validateTxId('usdt_trc20', 'short');
        assert.strictEqual(bad.ok, false);
        const evm = validateTxId('usdt_bep20', '0x' + 'b'.repeat(64));
        assert.strictEqual(evm.ok, true);
    });

    await test('confirm token round-trip', () => {
        const secret = 'test-jwt-secret-for-crypto';
        const token = confirmTokenForTenant('tenant-uuid-1', secret);
        assert.ok(token);
        assert.strictEqual(parseConfirmToken(token, secret), 'tenant-uuid-1');
        assert.strictEqual(parseConfirmToken(token, 'other'), null);
    });

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

run();

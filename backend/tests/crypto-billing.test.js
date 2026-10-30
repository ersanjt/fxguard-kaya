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
    txIdFingerprint,
    confirmTokenTtlMs,
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
        assert.strictEqual(cfg.autoActivate, false);
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

    await test('auto activate is opt-in (default off — TXID is not verified on-chain)', () => {
        assert.strictEqual(cryptoAutoActivate({}), false);
        assert.strictEqual(cryptoAutoActivate({ CRYPTO_PAY_AUTO_ACTIVATE: '' }), false);
        assert.strictEqual(cryptoAutoActivate({ CRYPTO_PAY_AUTO_ACTIVATE: 'false' }), false);
        assert.strictEqual(cryptoAutoActivate({ CRYPTO_PAY_AUTO_ACTIVATE: 'true' }), true);
        assert.strictEqual(cryptoAutoActivate({ CRYPTO_PAY_AUTO_ACTIVATE: '1' }), true);
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

    await test('confirm token round-trip is bound to tenant + TXID', () => {
        const secret = 'test-jwt-secret-for-crypto';
        const token = confirmTokenForTenant('tenant-uuid-1', secret, { txId: 'a'.repeat(64) });
        assert.ok(token);
        const parsed = parseConfirmToken(token, secret);
        assert.ok(parsed);
        assert.strictEqual(parsed.tenantId, 'tenant-uuid-1');
        assert.strictEqual(parsed.txIdFingerprint, txIdFingerprint('A'.repeat(64)), 'fingerprint is case-insensitive');
        assert.notStrictEqual(parsed.txIdFingerprint, txIdFingerprint('b'.repeat(64)));
        assert.ok(parsed.expiresAt > Date.now());
        assert.strictEqual(parseConfirmToken(token, 'other'), null);
    });

    await test('confirm token expires and rejects tampering', () => {
        const secret = 'test-jwt-secret-for-crypto';
        const now = 1_800_000_000_000;
        const token = confirmTokenForTenant('tenant-uuid-1', secret, { txId: 'x', now });
        assert.ok(parseConfirmToken(token, secret, { now: now + 1000 }));
        assert.strictEqual(
            parseConfirmToken(token, secret, { now: now + confirmTokenTtlMs() + 1 }),
            null,
            'token past TTL must be rejected'
        );
        const raw = Buffer.from(token, 'base64url').toString('utf8').split('.');
        raw[0] = 'tenant-uuid-2';
        const forged = Buffer.from(raw.join('.')).toString('base64url');
        assert.strictEqual(parseConfirmToken(forged, secret, { now }), null, 'tenant swap must fail');
        raw[0] = 'tenant-uuid-1';
        raw[1] = String(Number(raw[1]) + 999999999);
        const extended = Buffer.from(raw.join('.')).toString('base64url');
        assert.strictEqual(parseConfirmToken(extended, secret, { now }), null, 'expiry extension must fail');
        // فرمت قدیمی (tenantId.sig) دیگر پذیرفته نمی‌شود
        const legacy = Buffer.from('tenant-uuid-1.deadbeef').toString('base64url');
        assert.strictEqual(parseConfirmToken(legacy, secret), null);
    });

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

run();

/**
 * CORS credential vs public origin split.
 */
const assert = require('assert');
const { buildCorsConfig, isApexMarketingOrigin } = require('../config/cors');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log('  ✓', name);
    } catch (err) {
        failed++;
        console.error('  ✗', name, '→', err.message);
    }
}

console.log('CORS origin unit tests\n');

test('apex marketing hosts are detected', () => {
    assert.strictEqual(isApexMarketingOrigin('https://fxguard.io'), true);
    assert.strictEqual(isApexMarketingOrigin('https://www.fxguard.io'), true);
    assert.strictEqual(isApexMarketingOrigin('https://kaya.fxguard.io'), false);
    assert.strictEqual(isApexMarketingOrigin('https://app.fxguard.io'), false);
});

test('production strips marketing from credential origins', () => {
    const cfg = buildCorsConfig({
        NODE_ENV: 'production',
        CORS_ORIGINS: 'https://kaya.fxguard.io,https://fxguard.io,https://www.fxguard.io'
    });
    assert.ok(cfg.allowedOrigins.includes('https://kaya.fxguard.io'));
    assert.ok(cfg.allowedOrigins.includes('https://fxguard.io'));
    assert.ok(cfg.credentialOrigins.includes('https://kaya.fxguard.io'));
    assert.ok(!cfg.credentialOrigins.includes('https://fxguard.io'));
    assert.ok(!cfg.credentialOrigins.includes('https://www.fxguard.io'));
});

test('CORS_PUBLIC_ORIGINS are allowed without joining credentials', () => {
    const cfg = buildCorsConfig({
        NODE_ENV: 'production',
        CORS_ORIGINS: 'https://kaya.fxguard.io',
        CORS_PUBLIC_ORIGINS: 'https://fxguard.io'
    });
    assert.ok(cfg.allowedOrigins.includes('https://fxguard.io'));
    assert.ok(!cfg.credentialOrigins.includes('https://fxguard.io'));
});

test('dev extras stay in credential list', () => {
    const cfg = buildCorsConfig({
        NODE_ENV: 'development',
        CORS_ORIGINS: 'http://localhost:3002'
    });
    assert.ok(cfg.credentialOrigins.includes('http://localhost:3002'));
    assert.ok(cfg.credentialOrigins.includes('http://localhost:5173'));
});

test('self-serve tenant origins are credential-capable', () => {
    const { isAllowedOrigin, isCredentialOrigin } = require('../config/cors');
    const prev = process.env.TENANT_BASE_HOST;
    process.env.TENANT_BASE_HOST = 'app.fxguard.io';
    try {
        assert.strictEqual(isAllowedOrigin('https://desk.app.fxguard.io'), true);
        assert.strictEqual(isCredentialOrigin('https://desk.app.fxguard.io'), true);
        assert.strictEqual(isAllowedOrigin('https://evil.example'), false);
    } finally {
        if (prev == null) delete process.env.TENANT_BASE_HOST;
        else process.env.TENANT_BASE_HOST = prev;
    }
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

/**
 * Unit tests for staff API rate-limit key + skip rules (no HTTP / DB).
 */
'use strict';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-32-chars-minimum!!';

const assert = require('assert');
const jwt = require('jsonwebtoken');
const {
    apiRateLimitKey,
    shouldSkipStaffApiRateLimit,
    normalizeApiPath,
    resolveApiRateMax,
    DEFAULT_API_RATE_MAX
} = require('../lib/apiRateLimit');

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

function reqWith(overrides) {
    const headers = Object.assign({ 'user-agent': 'Chrome/KayaTest' }, overrides.headers || {});
    return {
        method: overrides.method || 'GET',
        path: overrides.path || '/customers',
        originalUrl: overrides.originalUrl,
        url: overrides.url,
        ip: overrides.ip || '203.0.113.10',
        cookies: overrides.cookies || {},
        headers: headers,
        get: function (name) {
            return headers[String(name).toLowerCase()];
        }
    };
}

console.log('apiRateLimit unit tests\n');

test('unauthenticated requests share an IP bucket', () => {
    const key = apiRateLimitKey(reqWith({ ip: '198.51.100.7' }));
    assert.strictEqual(key, 'ip:198.51.100.7');
});

test('authenticated cookie uses a per-user key, not the office IP', () => {
    const token = jwt.sign({ id: 'user-42' }, process.env.JWT_SECRET);
    const key = apiRateLimitKey(reqWith({
        ip: '198.51.100.7',
        cookies: { crm_token: token }
    }));
    assert.ok(key.indexOf('u:user-42') === 0, key);
    assert.ok(key.indexOf('ip:') === -1, key);
});

test('two browsers on the same account get separate buckets', () => {
    const token = jwt.sign({ id: 'admin-1' }, process.env.JWT_SECRET);
    const a = apiRateLimitKey(reqWith({
        cookies: { crm_token: token },
        headers: { 'user-agent': 'Chrome/Office-A' }
    }));
    const b = apiRateLimitKey(reqWith({
        cookies: { crm_token: token },
        headers: { 'user-agent': 'Firefox/Office-B' }
    }));
    assert.notStrictEqual(a, b);
});

test('expired staff JWT still keys by user id (office NAT fallback avoided)', () => {
    const token = jwt.sign({ id: 'user-9', exp: Math.floor(Date.now() / 1000) - 30 }, process.env.JWT_SECRET);
    const key = apiRateLimitKey(reqWith({
        ip: '198.51.100.7',
        cookies: { crm_token: token }
    }));
    assert.ok(key.indexOf('u:user-9') === 0, key);
});

test('signed-in GET /customers is skipped so five agents can open the list', () => {
    const token = jwt.sign({ id: 'user-7' }, process.env.JWT_SECRET);
    assert.strictEqual(shouldSkipStaffApiRateLimit(reqWith({
        method: 'GET',
        path: '/customers',
        cookies: { crm_token: token }
    })), true);
});

test('anonymous GET /customers is not skipped', () => {
    assert.strictEqual(shouldSkipStaffApiRateLimit(reqWith({
        method: 'GET',
        path: '/customers'
    })), false);
});

test('signed-in POST is not skipped', () => {
    const token = jwt.sign({ id: 'user-7' }, process.env.JWT_SECRET);
    assert.strictEqual(shouldSkipStaffApiRateLimit(reqWith({
        method: 'POST',
        path: '/customers',
        cookies: { crm_token: token }
    })), false);
});

test('mounted /api/analytics/dashboard GET is skipped when a staff cookie is present', () => {
    const token = jwt.sign({ id: 'user-7' }, process.env.JWT_SECRET);
    assert.strictEqual(normalizeApiPath({
        originalUrl: '/api/analytics/dashboard?x=1',
        path: '/analytics/dashboard'
    }), '/analytics/dashboard');
    assert.strictEqual(shouldSkipStaffApiRateLimit(reqWith({
        method: 'GET',
        path: '/analytics/dashboard',
        originalUrl: '/api/analytics/dashboard',
        cookies: { crm_token: token }
    })), true);
});

test('dashboard GET is not skipped for a forged cookie', () => {
    assert.strictEqual(shouldSkipStaffApiRateLimit(reqWith({
        method: 'GET',
        path: '/analytics/dashboard',
        originalUrl: '/api/analytics/dashboard',
        cookies: { crm_token: 'not-a-valid-jwt' }
    })), false);
});

test('default staff API ceiling is high enough for a small office', () => {
    const prev = process.env.API_RATE_LIMIT_MAX;
    delete process.env.API_RATE_LIMIT_MAX;
    assert.ok(resolveApiRateMax() >= 8000);
    assert.strictEqual(resolveApiRateMax(), DEFAULT_API_RATE_MAX);
    if (prev != null) process.env.API_RATE_LIMIT_MAX = prev;
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);

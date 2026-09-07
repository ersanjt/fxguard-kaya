/**
 * Staff-app vs browser login token.
 */
const assert = require('assert');
const { wantsBearerToken } = require('../lib/staffAppClient');

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

function fakeReq(headers) {
    const h = headers || {};
    return {
        get(name) {
            const key = String(name || '').toLowerCase();
            if (key === 'x-kaya-client') return h['x-kaya-client'] || h['X-Kaya-Client'] || '';
            if (key === 'user-agent') return h['user-agent'] || h['User-Agent'] || '';
            return '';
        }
    };
}

console.log('staff app client unit tests\n');

test('browser has no bearer token', () => {
    assert.strictEqual(wantsBearerToken(fakeReq({ 'user-agent': 'Mozilla/5.0 Chrome' })), false);
    assert.strictEqual(wantsBearerToken(fakeReq({})), false);
});

test('X-Kaya-Client staff-app requests a token', () => {
    assert.strictEqual(wantsBearerToken(fakeReq({ 'x-kaya-client': 'staff-app' })), true);
    assert.strictEqual(wantsBearerToken(fakeReq({ 'x-kaya-client': 'android' })), true);
    assert.strictEqual(wantsBearerToken(fakeReq({ 'x-kaya-client': 'ios' })), true);
});

test('KayaStaff User-Agent requests a token', () => {
    assert.strictEqual(wantsBearerToken(fakeReq({ 'user-agent': 'KayaStaff-Android/1.0' })), true);
    assert.strictEqual(wantsBearerToken(fakeReq({ 'user-agent': 'KayaStaff-iOS/1.0' })), true);
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

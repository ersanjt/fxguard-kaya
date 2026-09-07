/**
 * Navasan URL helpers — HTTPS only (no API key in test output beyond encoded dummy).
 */
const assert = require('assert');
const { navasanLatestUrl, navasanUsageUrl, normalizeNavasanApiKey } = require('../lib/navasanApiKey');

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

console.log('navasan URL unit tests\n');

test('latest and usage URLs use https', () => {
    const latest = navasanLatestUrl('dummy-key');
    const usage = navasanUsageUrl('dummy-key');
    assert.ok(latest.startsWith('https://api.navasan.tech/latest/'));
    assert.ok(usage.startsWith('https://api.navasan.tech/usage/'));
    assert.ok(!latest.startsWith('http://'));
    assert.ok(!usage.startsWith('http://'));
});

test('empty key yields no URL', () => {
    assert.strictEqual(navasanLatestUrl(''), null);
    assert.strictEqual(navasanUsageUrl('   '), null);
});

test('normalize strips pasted query api_key', () => {
    assert.strictEqual(
        normalizeNavasanApiKey('https://api.navasan.tech/latest/?api_key=abc123'),
        'abc123'
    );
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

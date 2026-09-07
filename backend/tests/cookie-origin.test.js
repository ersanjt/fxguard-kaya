/**
 * Cookie mutation Origin guard.
 */
const assert = require('assert');
const { originFromReferer } = require('../lib/cookieOriginGuard');

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

console.log('cookie origin helper unit tests\n');

test('originFromReferer extracts origin', () => {
    assert.strictEqual(originFromReferer('https://kaya.fxguard.io/dashboard#rates'), 'https://kaya.fxguard.io');
    assert.strictEqual(originFromReferer('not-a-url'), '');
    assert.strictEqual(originFromReferer(''), '');
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

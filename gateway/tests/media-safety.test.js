'use strict';

const assert = require('assert');
const { isSafeMediaUrl, isBlockedIp, isSafeMediaUrlResolved } = require('../src/mediaSafety');

let failed = 0;

function test(name, fn) {
    return Promise.resolve()
        .then(fn)
        .then(() => console.log('  ✓', name))
        .catch((err) => {
            failed++;
            console.error('  ✗', name, '→', err.message);
        });
}

(async () => {
    console.log('gateway media safety\n');
    await test('blocks cloud metadata and private IPs', () => {
        assert.strictEqual(isBlockedIp('169.254.169.254'), true);
        assert.strictEqual(isBlockedIp('10.1.2.3'), true);
        assert.strictEqual(isBlockedIp('8.8.8.8'), false);
        assert.strictEqual(isSafeMediaUrl('http://169.254.169.254/latest'), false);
        assert.strictEqual(isSafeMediaUrl('http://metadata.google.internal/'), false);
        assert.strictEqual(isSafeMediaUrl('https://example.com/a.jpg'), true);
    });
    await test('resolved public host stays allowed', async () => {
        const ok = await isSafeMediaUrlResolved('https://example.com/');
        assert.strictEqual(ok, true);
    });
    console.log(failed ? `\n${failed} failed` : '\nok');
    process.exit(failed ? 1 : 0);
})();

/**
 * نگاشت Cloud phone_number_id و verify token به سازمان
 */
'use strict';

const assert = require('assert');
const { matchesCloudVerifyToken } = require('../lib/whatsappConnectionLoader');

let passed = 0;
let failed = 0;

async function test(name, fn) {
    try {
        await fn();
        console.log('  ✓', name);
        passed++;
    } catch (err) {
        console.error('  ✗', name);
        console.error('    →', err.message);
        failed++;
    }
}

async function main() {
    console.log('tenant inbound cloud mapping tests\n');

    await test('empty verify token is rejected', async () => {
        assert.strictEqual(await matchesCloudVerifyToken(''), false);
        assert.strictEqual(await matchesCloudVerifyToken(null), false);
    });

    await test('env verify token is accepted when set', async () => {
        const prev = process.env.WHATSAPP_CLOUD_VERIFY_TOKEN;
        process.env.WHATSAPP_CLOUD_VERIFY_TOKEN = 'unit-env-verify-token';
        try {
            assert.strictEqual(await matchesCloudVerifyToken('unit-env-verify-token'), true);
            assert.strictEqual(await matchesCloudVerifyToken('wrong-token'), false);
        } finally {
            if (prev == null) delete process.env.WHATSAPP_CLOUD_VERIFY_TOKEN;
            else process.env.WHATSAPP_CLOUD_VERIFY_TOKEN = prev;
        }
    });

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

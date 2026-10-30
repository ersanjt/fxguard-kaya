/**
 * Unit tests — امضای HMAC پیام‌های صف outgoing_messages
 * @file    backend/tests/outgoing-queue.test.js
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * اجرا: node tests/outgoing-queue.test.js  (بدون DB / RabbitMQ)
 */
'use strict';

const assert = require('assert');
const {
    OUTGOING_QUEUE,
    SIGNATURE_HEADER,
    signOutgoingPayload,
    verifyOutgoingSignature,
    publishOutgoingMessage,
} = require('../lib/outgoingQueue');

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

console.log('outgoingQueue unit tests\n');

const SECRET = 'gateway-secret-for-tests-at-least-32-chars!!';

function fakeChannel() {
    const calls = [];
    return {
        calls,
        sendToQueue(queue, buf, opts) {
            calls.push({ queue, buf, opts });
            return true;
        },
    };
}

test('sign/verify round-trip; tampered body or wrong key fails', () => {
    const buf = Buffer.from(JSON.stringify({ to: '905551112233', message: 'سلام' }));
    const sig = signOutgoingPayload(buf, SECRET);
    assert.ok(/^[0-9a-f]{64}$/.test(sig));
    assert.strictEqual(verifyOutgoingSignature(buf, sig, SECRET), true);
    assert.strictEqual(verifyOutgoingSignature(Buffer.from('{"to":"x"}'), sig, SECRET), false);
    assert.strictEqual(verifyOutgoingSignature(buf, sig, 'other-secret'), false);
    assert.strictEqual(verifyOutgoingSignature(buf, '', SECRET), false);
    assert.strictEqual(verifyOutgoingSignature(buf, sig, ''), false, 'no secret = never valid');
});

test('publishOutgoingMessage attaches signature header when secret is set', () => {
    const prev = process.env.GATEWAY_API_SECRET;
    process.env.GATEWAY_API_SECRET = SECRET;
    try {
        const ch = fakeChannel();
        const ok = publishOutgoingMessage(ch, { to: '1', message: 'hi', conversationId: 'c1' });
        assert.strictEqual(ok, true);
        assert.strictEqual(ch.calls.length, 1);
        const { queue, buf, opts } = ch.calls[0];
        assert.strictEqual(queue, OUTGOING_QUEUE);
        assert.strictEqual(opts.persistent, true);
        assert.ok(opts.headers[SIGNATURE_HEADER]);
        assert.strictEqual(verifyOutgoingSignature(buf, opts.headers[SIGNATURE_HEADER], SECRET), true);
        assert.deepStrictEqual(JSON.parse(buf.toString()), { to: '1', message: 'hi', conversationId: 'c1' });
    } finally {
        if (prev === undefined) delete process.env.GATEWAY_API_SECRET;
        else process.env.GATEWAY_API_SECRET = prev;
    }
});

test('publishOutgoingMessage without secret publishes unsigned (dev) and null without channel', () => {
    const prev = process.env.GATEWAY_API_SECRET;
    delete process.env.GATEWAY_API_SECRET;
    try {
        const ch = fakeChannel();
        publishOutgoingMessage(ch, { to: '1', message: 'hi' });
        assert.strictEqual(ch.calls[0].opts.headers[SIGNATURE_HEADER], undefined);
        assert.strictEqual(publishOutgoingMessage(null, { to: '1' }), null);
    } finally {
        if (prev !== undefined) process.env.GATEWAY_API_SECRET = prev;
    }
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

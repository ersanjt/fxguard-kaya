'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { SendRateLimiter, createSendRateLimiter } = require('../src/sendRateLimiter');
const { decryptWhatsAppEnc, downloadAndDecryptWhatsAppMedia } = require('../src/waMediaDecrypt');
const { startOutgoingCall } = require('../src/waCalls');

test('send limiter accepts concurrent events up to its configured maximum', async () => {
    const limiter = createSendRateLimiter(1000, 2);
    assert.ok(limiter instanceof SendRateLimiter);

    await Promise.all([limiter.acquire(), limiter.acquire()]);

    assert.equal(limiter.events.length, 2);
    assert.ok(limiter.events.every(Number.isFinite));
});

test('media decryption rejects missing or undersized input before crypto work', () => {
    assert.throws(() => decryptWhatsAppEnc(Buffer.alloc(64), '', 'image'), {
        message: 'media_key_missing',
    });
    assert.throws(
        () => decryptWhatsAppEnc(Buffer.alloc(8), Buffer.alloc(32).toString('base64'), 'image'),
        { message: 'media_key_or_body_too_small' }
    );
});

test('media download fails closed when no media key is supplied', async () => {
    assert.deepEqual(await downloadAndDecryptWhatsAppMedia({ url: 'https://example.test/file' }), {
        error: 'no_media_key',
    });
});

test('outgoing calls reject an empty recipient without touching WhatsApp', async () => {
    await assert.rejects(
        startOutgoingCall({}, '', false, { info() {}, warn() {} }),
        (error) => error.message === 'invalid_recipient' && error.statusCode === 400
    );
});

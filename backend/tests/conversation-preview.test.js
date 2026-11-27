/**
 * Unit tests for inbox last-message preview sanitization (no HTTP / DB)
 */
const assert = require('assert');
const {
    looksLikeBareMediaFilename,
    looksLikeEmbeddedMediaPayload,
    inboxPreviewFromIncoming,
    inboxPreviewFromOutgoing,
} = require('../lib/conversationPreview');

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

console.log('conversationPreview unit tests\n');

test('treats voice.ogg as a bare media filename', () => {
    assert.strictEqual(looksLikeBareMediaFilename('voice.ogg'), true);
    assert.strictEqual(looksLikeBareMediaFilename('voice.webm'), true);
    assert.strictEqual(looksLikeBareMediaFilename('سلام'), false);
});

test('incoming ptt with only filename becomes voice placeholder', () => {
    assert.strictEqual(
        inboxPreviewFromIncoming({
            body: '',
            filename: 'voice.ogg',
            rawType: 'ptt',
            hasMedia: true,
        }),
        '🎤 پیام صوتی'
    );
});

test('incoming body filename is not leaked as preview', () => {
    assert.strictEqual(
        inboxPreviewFromIncoming({
            body: 'voice.ogg',
            filename: 'voice.ogg',
            msgType: 'audio',
            hasMedia: true,
        }),
        '🎤 پیام صوتی'
    );
});

test('keeps real incoming text', () => {
    assert.strictEqual(
        inboxPreviewFromIncoming({ body: 'نرخ امروز؟', rawType: 'chat' }),
        'نرخ امروز؟'
    );
});

test('outgoing voice without caption uses voice placeholder', () => {
    assert.strictEqual(
        inboxPreviewFromOutgoing({
            text: '',
            hasMedia: true,
            isVoice: true,
            msgType: 'audio',
            filename: 'voice.ogg',
        }),
        '🎤 پیام صوتی'
    );
});

test('jpeg base64 is not a caption or inbox preview', () => {
    const jpeg = '/9j/' + 'A'.repeat(300);
    assert.strictEqual(looksLikeEmbeddedMediaPayload(jpeg), true);
    assert.strictEqual(looksLikeEmbeddedMediaPayload('نرخ امروز؟'), false);
    assert.strictEqual(
        inboxPreviewFromIncoming({
            body: jpeg,
            caption: 'فاکتور',
            filename: 'image.jpg',
            rawType: 'image',
            hasMedia: true,
        }),
        'فاکتور'
    );
    assert.strictEqual(
        inboxPreviewFromIncoming({
            body: jpeg,
            filename: 'image.jpg',
            rawType: 'image',
            hasMedia: true,
        }),
        '📷 تصویر'
    );
});

test('outgoing text still wins', () => {
    assert.strictEqual(
        inboxPreviewFromOutgoing({ text: 'ارسال شد', hasMedia: false }),
        'ارسال شد'
    );
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

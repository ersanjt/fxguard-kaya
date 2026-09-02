/**
 * Unit tests for inbox last-message preview sanitization (no HTTP / DB)
 */
const assert = require('assert');
const {
    looksLikeBareMediaFilename,
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

test('outgoing text still wins', () => {
    assert.strictEqual(
        inboxPreviewFromOutgoing({ text: 'ارسال شد', hasMedia: false }),
        'ارسال شد'
    );
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

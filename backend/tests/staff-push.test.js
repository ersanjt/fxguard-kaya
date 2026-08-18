/**
 * Unit tests for staff push targeting (no HTTP / FCM)
 */
'use strict';

const assert = require('assert');
const {
    notificationsEnabled,
    shouldNotifyIncomingWhatsapp,
    messagePreview,
    pickWhatsappRecipientIds,
} = require('../lib/staffPushTargets');

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

console.log('staffPush unit tests\n');

test('outgoing / fromMe WhatsApp is not pushed', () => {
    assert.strictEqual(shouldNotifyIncomingWhatsapp({ isFromMe: true, direction: 'incoming' }), false);
    assert.strictEqual(shouldNotifyIncomingWhatsapp({ isFromMe: false, direction: 'outgoing' }), false);
    assert.strictEqual(shouldNotifyIncomingWhatsapp({ isFromMe: false, direction: 'incoming' }), true);
});

test('settings.notifications false disables push', () => {
    assert.strictEqual(notificationsEnabled({ settings: { notifications: false } }), false);
    assert.strictEqual(notificationsEnabled({ settings: { notifications: true } }), true);
    assert.strictEqual(notificationsEnabled({}), true);
});

test('message preview prefers text then media glyph', () => {
    assert.strictEqual(messagePreview({ content: 'hello world' }), 'hello world');
    assert.strictEqual(messagePreview({ type: 'image' }), '📷');
    assert.strictEqual(messagePreview({ type: 'audio' }, 'پیام جدید'), '🎤');
});

test('assigned conversation notifies only assignee', () => {
    const ids = pickWhatsappRecipientIds(
        { assignedTo: 'u-agent', departmentId: 'd1', isHiddenFromStaff: false, status: 'open' },
        [{ id: 'u-other', role: 'agent', departmentId: 'd1', settings: {} }]
    );
    assert.deepStrictEqual(ids, ['u-agent']);
});

test('unassigned department conversation notifies department staff with inbox access', () => {
    const conv = { assignedTo: null, departmentId: 'd1', isHiddenFromStaff: false, status: 'open' };
    const ids = pickWhatsappRecipientIds(conv, [
        { id: 'u1', role: 'agent', departmentId: 'd1', settings: {} },
        { id: 'u2', role: 'agent', departmentId: 'd2', settings: {} },
        { id: 'u3', role: 'agent', departmentId: 'd1', settings: { notifications: false } },
    ]);
    assert.deepStrictEqual(ids, ['u1']);
});

test('unassigned department conversation still notifies admins without a department', () => {
    const conv = { assignedTo: null, departmentId: 'd1', isHiddenFromStaff: false, status: 'open' };
    const ids = pickWhatsappRecipientIds(conv, [
        { id: 'u-admin', role: 'admin', departmentId: null, settings: {} },
        { id: 'u1', role: 'agent', departmentId: 'd1', settings: {} },
    ]);
    assert.deepStrictEqual(ids, ['u-admin', 'u1']);
});

test('excludeUserId is omitted', () => {
    const ids = pickWhatsappRecipientIds(
        { assignedTo: 'u-me', status: 'open', isHiddenFromStaff: false },
        [],
        'u-me'
    );
    assert.deepStrictEqual(ids, []);
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

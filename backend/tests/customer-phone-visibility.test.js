/**
 * Unit tests for customer phone redaction
 */
const assert = require('assert');
const {
    looksLikePhoneValue,
    redactCustomerPhone,
    redactConversationPhones,
    redactMessagePhones,
    publicCustomerSocketPayload,
} = require('../lib/customerPhoneVisibility');

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

console.log('customerPhoneVisibility unit tests\n');

const agent = { role: 'agent', permissions: {} };
const admin = { role: 'admin', permissions: { view_customer_phone: true } };

test('formatted E.164 name is treated as a phone', () => {
    assert.strictEqual(looksLikePhoneValue('+98 930 588 0135'), true);
    assert.strictEqual(looksLikePhoneValue('989305880135'), true);
    assert.strictEqual(looksLikePhoneValue('مشتری 989305880135'), true);
});

test('real names are not treated as phones', () => {
    assert.strictEqual(looksLikePhoneValue('علی محمدی'), false);
    assert.strictEqual(looksLikePhoneValue('Sevil'), false);
});

test('group JID is not a personal phone', () => {
    assert.strictEqual(looksLikePhoneValue('120363888000111555@g.us'), false);
});

test('agent does not receive phone or phone-like name', () => {
    const out = redactCustomerPhone(
        { id: '1', name: '+98 930 588 0135', phone: '989305880135', profilePic: 'x' },
        agent
    );
    assert.strictEqual(out.phone, null);
    assert.strictEqual(out.name, '');
    assert.strictEqual(out.profilePic, 'x');
});

test('agent keeps a real customer name', () => {
    const out = redactCustomerPhone(
        { id: '1', name: 'علی محمدی', phone: '989305880135' },
        agent
    );
    assert.strictEqual(out.phone, null);
    assert.strictEqual(out.name, 'علی محمدی');
});

test('admin still sees phone and name', () => {
    const out = redactCustomerPhone(
        { id: '1', name: 'علی', phone: '989305880135' },
        admin
    );
    assert.strictEqual(out.phone, '989305880135');
    assert.strictEqual(out.name, 'علی');
});

test('group JID stays visible for group detection', () => {
    const jid = '120363888000111555@g.us';
    const out = redactCustomerPhone({ id: '1', name: 'گروه تست', phone: jid }, agent);
    assert.strictEqual(out.phone, jid);
    assert.strictEqual(out.name, 'گروه تست');
});

test('conversation nested customer is redacted', () => {
    const out = redactConversationPhones(
        { id: 'c1', customer: { id: '1', name: '989305880135', phone: '989305880135' } },
        agent
    );
    assert.strictEqual(out.customer.phone, null);
    assert.strictEqual(out.customer.name, '');
});

test('group sender ids are stripped from messages for agents', () => {
    const out = redactMessagePhones(
        {
            id: 'm1',
            metadata: { senderId: '989121234567@c.us', senderName: '989121234567' },
        },
        agent
    );
    assert.strictEqual(out.metadata.senderId, undefined);
    assert.strictEqual(out.metadata.senderName, null);
});

test('socket payload never includes phone and hides phone-like names', () => {
    const out = publicCustomerSocketPayload({
        id: '1',
        name: '+98 910 290 3680',
        phone: '989102903680',
        profilePic: 'pic',
    });
    assert.strictEqual(out.phone, null);
    assert.strictEqual(out.name, '');
    assert.strictEqual(out.profilePic, 'pic');
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

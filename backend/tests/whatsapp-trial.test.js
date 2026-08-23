/**
 * Unit tests for WhatsApp trial timer and contact-lead purposes
 */
const assert = require('assert');
const {
    TRIAL_DAYS,
    serializeTrial,
    shouldExpire,
    applyStart,
    applyConvert,
    applyExpired,
} = require('../lib/whatsappTrial');
const {
    CONTACT_PURPOSES,
    normalizeContactPurpose,
    tallyPurposeCounts,
} = require('../lib/contactLead');

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

console.log('whatsappTrial + contactLead unit tests\n');

test('empty row is not a trial and never auto-expires', () => {
    const snap = serializeTrial({}, new Date('2026-08-18T00:00:00Z'));
    assert.strictEqual(snap.status, 'none');
    assert.strictEqual(snap.canStart, true);
    assert.strictEqual(snap.canConvert, false);
    assert.strictEqual(shouldExpire({}, new Date()), false);
    assert.strictEqual(TRIAL_DAYS, 7);
});

test('start sets a 7-day window', () => {
    const row = {};
    const start = new Date('2026-08-18T12:00:00Z');
    const snap = applyStart(row, start);
    assert.strictEqual(snap.status, 'active');
    assert.strictEqual(snap.canConvert, true);
    assert.strictEqual(snap.remainingDays, 7);
    assert.strictEqual(shouldExpire(row, start), false);
    assert.strictEqual(shouldExpire(row, new Date('2026-08-25T12:00:00Z')), true);
    assert.strictEqual(shouldExpire(row, new Date('2026-08-25T11:59:59Z')), false);
});

test('converted and expired rows are not disconnected again', () => {
    const row = {};
    applyStart(row, new Date('2026-08-01T00:00:00Z'));
    applyConvert(row);
    assert.strictEqual(shouldExpire(row, new Date('2026-08-20T00:00:00Z')), false);
    applyExpired(row);
    assert.strictEqual(serializeTrial(row).status, 'expired');
    assert.strictEqual(serializeTrial(row).canStart, true);
    assert.strictEqual(shouldExpire(row, new Date()), false);
});

test('contact purposes include demo and trial', () => {
    assert.ok(CONTACT_PURPOSES.indexOf('demo') >= 0);
    assert.ok(CONTACT_PURPOSES.indexOf('trial') >= 0);
    assert.strictEqual(normalizeContactPurpose('GUIDED'), 'other');
    assert.strictEqual(normalizeContactPurpose('trial'), 'trial');
    const counts = tallyPurposeCounts([{ purpose: 'demo', n: 2 }, { purpose: 'quote', n: 1 }]);
    assert.strictEqual(counts.demo, 2);
    assert.strictEqual(counts.quote, 1);
    assert.strictEqual(counts.purchase, 0);
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

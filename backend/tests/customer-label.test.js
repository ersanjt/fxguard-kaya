'use strict';

const assert = require('assert');
const {
    looksLikeTechnicalWhatsAppLabel,
    displayableWhatsAppPhone,
    prettyWhatsAppPhone,
} = require('../lib/phoneUtils');

function test(name, fn) {
    try {
        fn();
        console.log('  ✓ ' + name);
    } catch (err) {
        console.error('  ✗ ' + name);
        throw err;
    }
}

console.log('customer label unit tests');

test('rejects lid@ and c.us@ labels', () => {
    assert.strictEqual(looksLikeTechnicalWhatsAppLabel('lid@249331944788048'), true);
    assert.strictEqual(looksLikeTechnicalWhatsAppLabel('c.us@989144098041'), true);
    assert.strictEqual(looksLikeTechnicalWhatsAppLabel('مشتری lid@249331944788048'), true);
    assert.strictEqual(looksLikeTechnicalWhatsAppLabel('Unknown user'), true);
    assert.strictEqual(looksLikeTechnicalWhatsAppLabel('Ersan J. Tabrizi'), false);
    assert.strictEqual(looksLikeTechnicalWhatsAppLabel(''), false);
});

test('hides LID digits and keeps real E.164 phones', () => {
    assert.strictEqual(displayableWhatsAppPhone('lid@249331944788048'), '');
    assert.strictEqual(displayableWhatsAppPhone('201206702071899@lid'), '');
    assert.strictEqual(displayableWhatsAppPhone('989305880135@c.us'), '989305880135');
    assert.strictEqual(displayableWhatsAppPhone('00989305880135'), '989305880135');
    assert.strictEqual(displayableWhatsAppPhone('c.us@989144098041'), '989144098041');
    assert.strictEqual(displayableWhatsAppPhone('985010676486'), '905010676486');
    assert.strictEqual(displayableWhatsAppPhone('909305880135'), '989305880135');
});

test('formats Iran and Turkey mobiles for staff UI', () => {
    assert.strictEqual(prettyWhatsAppPhone('989305880135@c.us'), '+98 930 588 0135');
    assert.strictEqual(prettyWhatsAppPhone('00989305880135'), '+98 930 588 0135');
    assert.strictEqual(prettyWhatsAppPhone('905010676486'), '+90 501 067 6486');
    assert.strictEqual(prettyWhatsAppPhone('lid@249331944788048'), '');
});

console.log('\nResults: 3 passed, 0 failed');

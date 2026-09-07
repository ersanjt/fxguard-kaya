'use strict';

const assert = require('assert');
const {
    looksLikeTechnicalWhatsAppLabel,
    displayableWhatsAppPhone,
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
});

console.log('\nResults: 2 passed, 0 failed');

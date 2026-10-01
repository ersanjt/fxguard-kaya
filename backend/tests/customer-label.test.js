'use strict';

const assert = require('assert');
const {
    looksLikeTechnicalWhatsAppLabel,
    displayableWhatsAppPhone,
    prettyWhatsAppPhone,
    getCustomerSendTarget,
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

test('a stored LID that looks like a real number is sent as @lid', () => {
    const lid = '33182279072894';
    assert.strictEqual(getCustomerSendTarget({ phone: lid, customFields: { whatsappLid: lid } }), lid + '@lid');
    assert.strictEqual(getCustomerSendTarget({ phone: lid }, { metadata: { whatsappLid: lid } }), lid + '@lid');
    assert.strictEqual(
        getCustomerSendTarget({ phone: '989305880135', customFields: { whatsappLid: lid } }),
        '989305880135'
    );
    assert.strictEqual(getCustomerSendTarget({ phone: '120363000000000000@g.us' }), '120363000000000000@g.us');
});

test('link preview keeps only safe fields and inline thumbnails', () => {
    const { sanitizeLinkPreview } = require('../lib/linkPreview');
    const ok = sanitizeLinkPreview({
        url: 'https://www.instagram.com/reel/abc/',
        title: 'Dr. on Instagram',
        description: 'desc',
        thumbnail: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
    });
    assert.strictEqual(ok.title, 'Dr. on Instagram');
    assert.strictEqual(ok.thumbnail, 'data:image/jpeg;base64,/9j/4AAQSkZJRg==');
    const remoteThumb = sanitizeLinkPreview({ url: 'https://x.test', title: 't', thumbnail: 'https://evil.test/a.jpg' });
    assert.strictEqual(remoteThumb.thumbnail, '');
    assert.strictEqual(sanitizeLinkPreview({ url: 'javascript:alert(1)', title: 't' }), null);
    assert.strictEqual(sanitizeLinkPreview({ url: 'https://x.test' }), null);
});

console.log('\nResults: 5 passed, 0 failed');

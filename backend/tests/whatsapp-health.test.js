/**
 * سلامت واتساپ: Cloud آماده نباید به‌خاطر QR بودن Gateway خراب شود.
 */
const assert = require('assert');
const { resolveWhatsappChannel } = require('../services/systemHealth');
const { getCloudAppSecret, isCloudAppSecretConfigured } = require('../lib/cloudAppSecret');

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

console.log('WhatsApp health decision tests\n');

const qrGateway = { ready: false, status: 'starting', phase: 'qr', usable: false, detail: 'starting' };

test('cloud_first with a ready Cloud channel ignores a QR gateway', () => {
    const row = resolveWhatsappChannel({
        mode: 'cloud_first',
        cloudConfigured: true,
        appSecretSet: true,
        gateway: null,
    });
    assert.strictEqual(row.status, 'ok');
    assert.strictEqual(row.channel, 'cloud');
    assert.strictEqual(row.whatsapp, true);
});

test('cloud mode without an app secret is degraded', () => {
    const row = resolveWhatsappChannel({
        mode: 'cloud',
        cloudConfigured: true,
        appSecretSet: false,
        gateway: null,
    });
    assert.strictEqual(row.status, 'degraded');
    assert.strictEqual(row.channel, 'cloud');
    assert.strictEqual(row.whatsapp, false);
    assert.match(row.detail, /APP_SECRET/);
});

test('cloud_first without a secret and with a dead gateway names the secret', () => {
    const row = resolveWhatsappChannel({
        mode: 'cloud_first',
        cloudConfigured: true,
        appSecretSet: false,
        gateway: qrGateway,
    });
    assert.strictEqual(row.status, 'degraded');
    assert.strictEqual(row.channel, 'cloud');
    assert.strictEqual(row.phase, 'qr');
    assert.match(row.detail, /APP_SECRET/);
});

test('cloud_first without Cloud still reports the gateway', () => {
    const row = resolveWhatsappChannel({
        mode: 'cloud_first',
        cloudConfigured: false,
        appSecretSet: false,
        gateway: qrGateway,
    });
    assert.strictEqual(row.channel, 'gateway');
    assert.strictEqual(row.status, 'starting');
});

test('a connected gateway is healthy when Cloud is not configured', () => {
    const row = resolveWhatsappChannel({
        mode: 'gateway',
        cloudConfigured: false,
        appSecretSet: false,
        gateway: { ready: true, status: 'ready', usable: true, detail: 'ready' },
    });
    assert.strictEqual(row.status, 'ok');
    assert.strictEqual(row.channel, 'gateway');
});

test('META_APP_SECRET counts as the Cloud app secret', () => {
    const prevCloud = process.env.WHATSAPP_CLOUD_APP_SECRET;
    const prevMeta = process.env.META_APP_SECRET;
    delete process.env.WHATSAPP_CLOUD_APP_SECRET;
    process.env.META_APP_SECRET = 'meta-secret';
    try {
        assert.strictEqual(getCloudAppSecret(), 'meta-secret');
        assert.strictEqual(isCloudAppSecretConfigured(), true);
    } finally {
        if (prevCloud == null) delete process.env.WHATSAPP_CLOUD_APP_SECRET;
        else process.env.WHATSAPP_CLOUD_APP_SECRET = prevCloud;
        if (prevMeta == null) delete process.env.META_APP_SECRET;
        else process.env.META_APP_SECRET = prevMeta;
    }
});

if (failed) {
    console.error(`\n${failed} failed, ${passed} passed`);
    process.exit(1);
}
console.log(`\n${passed} passed`);

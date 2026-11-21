/**
 * مسیر آپلود و جداسازی پاسخ خودکار بین سازمان‌ها
 */
'use strict';

const assert = require('assert');
const path = require('path');
const {
    sanitizePanelKey,
    panelKeyFromUploadUrlPath,
    tenantUploadUrl,
    customerIdFromUploadPath,
    assertUploadPathBelongsToCurrentTenant,
    publicUrlFromAbsolutePath,
    UPLOADS_ROOT,
} = require('../lib/tenantUploads');
const { runWithTenant } = require('../lib/tenantContext');

let passed = 0;
let failed = 0;

async function test(name, fn) {
    try {
        await fn();
        console.log('  ✓', name);
        passed++;
    } catch (err) {
        console.error('  ✗', name);
        console.error('    →', err.message);
        failed++;
    }
}

async function main() {
    console.log('tenant uploads / panel path tests\n');

    await test('panel keys are sanitized', () => {
        assert.strictEqual(sanitizePanelKey('t-Acme!!'), 't-acme');
        assert.strictEqual(sanitizePanelKey(''), 'default');
    });

    await test('upload URL embeds the company panel key', async () => {
        await runWithTenant(
            { id: 'a1', slug: 'acme', panelKey: 't-acme', isPlatform: false },
            () => {
                assert.strictEqual(
                    tenantUploadUrl('1710000000000-file.png'),
                    '/uploads/tenants/t-acme/1710000000000-file.png'
                );
            }
        );
        await runWithTenant(
            { id: 'b1', slug: 'beta', panelKey: 't-beta', isPlatform: false },
            () => {
                assert.strictEqual(
                    tenantUploadUrl('1710000000000-file.png'),
                    '/uploads/tenants/t-beta/1710000000000-file.png'
                );
            }
        );
    });

    await test('path parser reads company key from upload URL', () => {
        assert.strictEqual(
            panelKeyFromUploadUrlPath('/uploads/tenants/t-acme/x.png'),
            't-acme'
        );
        assert.strictEqual(panelKeyFromUploadUrlPath('/uploads/legacy.png'), null);
    });

    await test('customer id is parsed from upload path', () => {
        const id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
        assert.strictEqual(
            customerIdFromUploadPath('/uploads/tenants/t-acme/customers/' + id + '/passport.jpg'),
            id
        );
        assert.strictEqual(customerIdFromUploadPath('/uploads/tenants/t-acme/media/x.png'), null);
    });

    await test('upload path belongs only to current company', async () => {
        await runWithTenant(
            { id: 'a1', slug: 'acme', panelKey: 't-acme', isPlatform: false },
            () => {
                assert.strictEqual(
                    assertUploadPathBelongsToCurrentTenant('/uploads/tenants/t-acme/x.png'),
                    true
                );
                assert.strictEqual(
                    assertUploadPathBelongsToCurrentTenant('/uploads/tenants/t-beta/x.png'),
                    false
                );
            }
        );
    });

    await test('customer document URL embeds company key', async () => {
        await runWithTenant(
            { id: 'a1', slug: 'acme', panelKey: 't-acme', isPlatform: false },
            () => {
                assert.strictEqual(
                    tenantUploadUrl('doc.pdf', 'customers/cid-1'),
                    '/uploads/tenants/t-acme/customers/cid-1/doc.pdf'
                );
            }
        );
    });

    await test('absolute voice path keeps tenant folder in public URL', () => {
        const abs = path.join(UPLOADS_ROOT, 'tenants', 't-acme', 'voice_voice.ogg');
        assert.strictEqual(
            publicUrlFromAbsolutePath(abs),
            '/uploads/tenants/t-acme/voice_voice.ogg'
        );
        assert.strictEqual(publicUrlFromAbsolutePath(path.join(UPLOADS_ROOT, '..', 'secret.txt')), null);
    });

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

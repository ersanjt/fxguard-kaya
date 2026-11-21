/**
 * لوگوی عمومی پنل نباید پشت احراز هویت پیوست چت بماند.
 */
const assert = require('assert');
const {
    isSensitiveUploadPath,
    isListedPublicBrandingPath,
} = require('../middleware/protectedUploads');

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

console.log('Public branding upload tests\n');

const logo = '/uploads/1776024463009-kaya-logo.png';

test('timestamp chat uploads stay private', () => {
    assert.strictEqual(isSensitiveUploadPath('/1712345678901-voice.ogg'), true);
    assert.strictEqual(isSensitiveUploadPath('/customers/x.jpg'), true);
    assert.strictEqual(isSensitiveUploadPath('/branding/logo.png'), false);
    assert.strictEqual(isListedPublicBrandingPath('/1712345678901-voice.ogg', [logo]), false);
});

test('configured login logo is public even with a timestamp name', () => {
    assert.strictEqual(isListedPublicBrandingPath('/1776024463009-kaya-logo.png', [logo]), true);
    assert.strictEqual(isListedPublicBrandingPath(logo, [logo, '/uploads/other.png']), true);
});

test('a timestamp file that is not the panel logo stays private', () => {
    assert.strictEqual(
        isListedPublicBrandingPath('/1776024463009-passport.png', [logo]),
        false
    );
});

test('customer and import paths cannot be published as a logo', () => {
    assert.strictEqual(
        isListedPublicBrandingPath('/customers/secret.png', ['/uploads/customers/secret.png']),
        false
    );
    assert.strictEqual(
        isListedPublicBrandingPath('/import/list.png', ['/uploads/import/list.png']),
        false
    );
    assert.strictEqual(
        isListedPublicBrandingPath('/tenants/default/../customers/secret.png', [
            '/uploads/tenants/default/../customers/secret.png',
        ]),
        false
    );
});

test('tenant branding image can be public when it is the configured logo', () => {
    const tenantLogo = '/uploads/tenants/default/1776024463009-logo.png';
    assert.strictEqual(isSensitiveUploadPath('/tenants/default/1776024463009-logo.png'), true);
    assert.strictEqual(isListedPublicBrandingPath(tenantLogo, [tenantLogo]), true);
});

if (failed) {
    console.error(`\n${failed} failed, ${passed} passed`);
    process.exit(1);
}
console.log(`\n${passed} passed`);

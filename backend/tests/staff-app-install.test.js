/**
 * مسیر پیش‌فرض نصب اپ کارکنان و لینک مدیریت‌شده.
 */
'use strict';

const assert = require('assert');
const {
    ANDROID_REL,
    IOS_REL,
    isManagedInstallUrl,
    applyStaffAppUrlFallbacks,
    getAndroidUpdateSource
} = require('../lib/staffAppInstall');

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

console.log('staff app install unit tests\n');

test('empty URL is managed (safe to fill from disk)', () => {
    assert.strictEqual(isManagedInstallUrl('', 'android'), true);
    assert.strictEqual(isManagedInstallUrl(null, 'ios'), true);
});

test('default releases path is managed', () => {
    assert.strictEqual(isManagedInstallUrl(ANDROID_REL, 'android'), true);
    assert.strictEqual(isManagedInstallUrl('https://kaya.fxguard.io/uploads/releases/kaya-staff.apk', 'android'), true);
    assert.strictEqual(isManagedInstallUrl(IOS_REL, 'ios'), true);
});

test('Play Store / App Store URLs are not managed', () => {
    assert.strictEqual(isManagedInstallUrl('https://play.google.com/store/apps/details?id=io.fxguard.kaya.staff', 'android'), false);
    assert.strictEqual(isManagedInstallUrl('https://apps.apple.com/app/id123', 'ios'), false);
});

test('first-party /uploads APK links are replaced by the CI file', () => {
    assert.strictEqual(isManagedInstallUrl('/uploads/mobile-builds/app-1.apk', 'android'), true);
    assert.strictEqual(
        isManagedInstallUrl('https://kaya.fxguard.io/uploads/mobile-builds/app-1.apk', 'android'),
        true
    );
});

test('fallback fills Android when APK exists and URL is empty', () => {
    const out = applyStaffAppUrlFallbacks({ androidAppUrl: null, iosAppUrl: null }, {
        androidExists: true,
        iosExists: false
    });
    assert.strictEqual(out.androidAppUrl, ANDROID_REL);
    assert.strictEqual(out.iosAppUrl, null);
});

test('fallback fills iOS only when IPA exists', () => {
    const out = applyStaffAppUrlFallbacks({ androidAppUrl: '', iosAppUrl: '' }, {
        androidExists: false,
        iosExists: true
    });
    assert.strictEqual(out.androidAppUrl, null);
    assert.strictEqual(out.iosAppUrl, IOS_REL);
});

test('custom store URL is preserved even if APK exists', () => {
    const play = 'https://play.google.com/store/apps/details?id=io.fxguard.kaya.staff';
    const out = applyStaffAppUrlFallbacks({ androidAppUrl: play, iosAppUrl: 'https://apps.apple.com/app/id1' }, {
        androidExists: true,
        iosExists: true
    });
    assert.strictEqual(out.androidAppUrl, play);
    assert.strictEqual(out.iosAppUrl, 'https://apps.apple.com/app/id1');
});

test('managed URL becomes null when the file is missing', () => {
    const out = applyStaffAppUrlFallbacks({ androidAppUrl: ANDROID_REL, iosAppUrl: IOS_REL }, {
        androidExists: false,
        iosExists: false
    });
    assert.strictEqual(out.androidAppUrl, null);
    assert.strictEqual(out.iosAppUrl, null);
});

test('getAndroidUpdateSource uses env URL when set', () => {
    const prev = {
        url: process.env.ANDROID_APP_APK_URL,
        code: process.env.ANDROID_APP_VERSION_CODE,
        name: process.env.ANDROID_APP_VERSION_NAME
    };
    process.env.ANDROID_APP_APK_URL = '/uploads/releases/kaya-staff.apk';
    process.env.ANDROID_APP_VERSION_CODE = '9';
    process.env.ANDROID_APP_VERSION_NAME = '9.0.0';
    try {
        const src = getAndroidUpdateSource();
        assert.strictEqual(src.rawUrl, '/uploads/releases/kaya-staff.apk');
        assert.strictEqual(src.versionCode, 9);
        assert.strictEqual(src.versionName, '9.0.0');
    } finally {
        if (prev.url == null) delete process.env.ANDROID_APP_APK_URL;
        else process.env.ANDROID_APP_APK_URL = prev.url;
        if (prev.code == null) delete process.env.ANDROID_APP_VERSION_CODE;
        else process.env.ANDROID_APP_VERSION_CODE = prev.code;
        if (prev.name == null) delete process.env.ANDROID_APP_VERSION_NAME;
        else process.env.ANDROID_APP_VERSION_NAME = prev.name;
    }
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

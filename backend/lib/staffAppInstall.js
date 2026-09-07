/**
 * مسیر پیش‌فرض APK/IPA کارکنان روی دیسک سرور و تشخیص لینک مدیریت‌شده.
 * @file    backend/lib/staffAppInstall.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md · docs/MOBILE-APP.md
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ANDROID_REL = '/uploads/releases/kaya-staff.apk';
const IOS_REL = '/uploads/releases/kaya-staff.ipa';
const RELEASES_DIR = path.join(__dirname, '..', 'uploads', 'releases');
const ANDROID_FILE = path.join(RELEASES_DIR, 'kaya-staff.apk');
const IOS_FILE = path.join(RELEASES_DIR, 'kaya-staff.ipa');
const VERSION_FILE = path.join(RELEASES_DIR, 'android-version.json');

function fileExists(p) {
    try {
        return fs.existsSync(p) && fs.statSync(p).isFile();
    } catch (_e) {
        return false;
    }
}

function androidApkExists() {
    return fileExists(ANDROID_FILE);
}

function iosIpaExists() {
    return fileExists(IOS_FILE);
}

function isFirstPartyUploadUrl(url) {
    const s = String(url || '').trim();
    if (!s) return false;
    if (s.startsWith('/uploads/')) return true;
    try {
        const u = new URL(s);
        const host = String(u.hostname || '')
            .replace(/^www\./i, '')
            .toLowerCase();
        if (host !== 'kaya.fxguard.io') return false;
        return String(u.pathname || '').startsWith('/uploads/');
    } catch (_e) {
        return false;
    }
}

function isManagedInstallUrl(url, kind) {
    const s = String(url || '').trim();
    if (!s) return true;
    if (kind === 'ios') {
        return isFirstPartyUploadUrl(s) && /\.ipa(\?|#|$)/i.test(s);
    }
    return isFirstPartyUploadUrl(s);
}

function applyStaffAppUrlFallbacks(settings, opts) {
    const out = Object.assign({}, settings || {});
    const androidExists =
        opts && typeof opts.androidExists === 'boolean' ? opts.androidExists : androidApkExists();
    const iosExists = opts && typeof opts.iosExists === 'boolean' ? opts.iosExists : iosIpaExists();
    if (isManagedInstallUrl(out.androidAppUrl, 'android')) {
        out.androidAppUrl = androidExists ? ANDROID_REL : null;
    } else if (!String(out.androidAppUrl || '').trim()) {
        out.androidAppUrl = null;
    }
    if (isManagedInstallUrl(out.iosAppUrl, 'ios')) {
        out.iosAppUrl = iosExists ? IOS_REL : null;
    } else if (!String(out.iosAppUrl || '').trim()) {
        out.iosAppUrl = null;
    }
    return out;
}

function readDeployedAndroidVersion() {
    try {
        const j = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
        const versionCode = parseInt(String(j.versionCode || ''), 10);
        const versionName = String(j.versionName || '').trim();
        if (!Number.isFinite(versionCode) || versionCode < 1 || !versionName) return null;
        return { versionCode, versionName };
    } catch (_e) {
        return null;
    }
}

function getAndroidUpdateSource() {
    const envCode = parseInt(String(process.env.ANDROID_APP_VERSION_CODE || '').trim(), 10);
    const envName = String(process.env.ANDROID_APP_VERSION_NAME || '').trim();
    const envUrl = String(process.env.ANDROID_APP_APK_URL || '').trim();
    const disk = readDeployedAndroidVersion();
    const versionCode =
        Number.isFinite(envCode) && envCode >= 1 ? envCode : disk && disk.versionCode;
    const versionName = envName || (disk && disk.versionName) || '';
    let rawUrl = envUrl;
    if (!rawUrl && androidApkExists()) rawUrl = ANDROID_REL;
    return {
        versionCode: Number.isFinite(versionCode) && versionCode >= 1 ? versionCode : null,
        versionName,
        rawUrl
    };
}

module.exports = {
    ANDROID_REL,
    IOS_REL,
    RELEASES_DIR,
    ANDROID_FILE,
    VERSION_FILE,
    androidApkExists,
    iosIpaExists,
    isManagedInstallUrl,
    applyStaffAppUrlFallbacks,
    readDeployedAndroidVersion,
    getAndroidUpdateSource
};

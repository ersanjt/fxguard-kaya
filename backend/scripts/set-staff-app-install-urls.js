#!/usr/bin/env node
/**
 * بعد از کپی APK روی سرور: ANDROID_APP_* در .env و androidAppUrl ظاهر پنل را هم‌تراز می‌کند.
 * لینک فروشگاه سفارشی را بازنویسی نمی‌کند.
 * @file    backend/scripts/set-staff-app-install-urls.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const {
    ANDROID_REL,
    ANDROID_FILE,
    androidApkExists,
    isManagedInstallUrl,
    readDeployedAndroidVersion
} = require('../lib/staffAppInstall');

function upsertEnv(key, value) {
    const r = spawnSync(
        process.execPath,
        [path.join(__dirname, 'upsert-dotenv.js'), path.join(__dirname, '..', '.env'), key, String(value)],
        { stdio: 'inherit' }
    );
    if (r.status !== 0) {
        throw new Error('upsert-dotenv failed for ' + key);
    }
}

async function main() {
    if (!androidApkExists()) {
        console.log('set-staff-app-install-urls: no APK at', ANDROID_FILE);
        return;
    }

    const envUrl = String(process.env.ANDROID_APP_APK_URL || '').trim();
    if (isManagedInstallUrl(envUrl, 'android')) {
        upsertEnv('ANDROID_APP_APK_URL', ANDROID_REL);
        const ver = readDeployedAndroidVersion();
        if (ver) {
            upsertEnv('ANDROID_APP_VERSION_CODE', String(ver.versionCode));
            upsertEnv('ANDROID_APP_VERSION_NAME', ver.versionName);
        }
        console.log('set-staff-app-install-urls: env ANDROID_APP_APK_URL=', ANDROID_REL);
    } else {
        console.log('set-staff-app-install-urls: kept custom ANDROID_APP_APK_URL');
    }

    try {
        const models = require('../models');
        const [row] = await models.PanelSetting.findOrCreate({
            where: { id: 'default' },
            defaults: { id: 'default' }
        });
        if (isManagedInstallUrl(row.androidAppUrl, 'android')) {
            await row.update({ androidAppUrl: ANDROID_REL });
            console.log('set-staff-app-install-urls: panel androidAppUrl=', ANDROID_REL);
        } else {
            console.log('set-staff-app-install-urls: kept custom panel androidAppUrl');
        }
    } catch (e) {
        console.error('set-staff-app-install-urls: panel DB skipped:', e.message);
    }
}

main()
    .catch((err) => {
        console.error('set-staff-app-install-urls:', err && err.message ? err.message : err);
    })
    .finally(() => process.exit(0));

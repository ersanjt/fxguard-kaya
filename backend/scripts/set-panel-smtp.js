#!/usr/bin/env node
/**
 * تنظیم SMTP در دیتابیس پنل
 * استفاده: node scripts/set-panel-smtp.js
 */
require('dotenv').config();
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const models = require('../models');
const { PanelSetting } = models;

async function main() {
    const [row] = await PanelSetting.findOrCreate({
        where: { id: 'default' },
        defaults: { id: 'default' }
    });
    await row.update({
        smtpHost: process.env.SMTP_HOST || '143.182.205.92.host.secureserver.net',
        smtpPort: process.env.SMTP_PORT || '465',
        smtpUser: process.env.SMTP_USER || 'noreply@fxguard.io',
        smtpPass: process.env.SMTP_PASS || '',
        smtpFrom: process.env.SMTP_FROM || 'noreply@fxguard.io',
        smtpFromName: process.env.SMTP_FROM_NAME || 'پورتال کارکنان',
        smtpSecure: process.env.SMTP_PORT === '465' || process.env.SMTP_SECURE === 'true'
    });
    console.log('✓ تنظیمات SMTP در پنل ذخیره شد.');
    console.log('  Host:', row.smtpHost, '| Port:', row.smtpPort, '| User:', row.smtpUser);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
}).finally(() => process.exit(0));

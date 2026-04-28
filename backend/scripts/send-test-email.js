#!/usr/bin/env node
/**
 * ارسال ایمیل تست — از متغیرهای محیط (.env) استفاده می‌کند
 * استفاده: node scripts/send-test-email.js [email]
 */
require('dotenv').config();
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const emailService = require('../services/emailService');

const to = process.argv[2] || process.env.TEST_EMAIL || 'ersanjahedtabrizi@gmail.com';

const HOSTS_TO_TRY = ['143.182.205.92.host.secureserver.net', 'smtpout.secureserver.net', 'mail.fxguard.io'];
const PORTS_TO_TRY = [
    { port: 465, secure: true },
    { port: 587, secure: false }
];

async function main() {
    console.log('ارسال ایمیل تست به:', to);
    const config = {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 465,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        fromName: process.env.SMTP_FROM_NAME,
        secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465'
    };
    if (!config.host || !config.port || !config.user || !config.pass) {
        console.error('خطا: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS را در .env قرار دهید.');
        process.exit(1);
    }
    const mailOpts = {
        to,
        subject: 'Test email — Kaya CRM',
        text: 'This message was sent to verify your SMTP settings.',
        html: emailService.baseHtml('Test email — Kaya CRM', '<p>This message was sent to verify your SMTP settings. If you received it, outbound email is working.</p>')
    };
    for (const host of HOSTS_TO_TRY) {
        for (const { port, secure } of PORTS_TO_TRY) {
            const cfg = { ...config, host, port: String(port), secure, allowSelfSigned: host.includes('host.secureserver.net') };
            console.log('امتحان Host:', host, 'Port:', port);
            const r = await emailService.sendMailWithConfigDetailed(cfg, mailOpts);
            if (r.ok) {
                console.log('✓ ایمیل با موفقیت ارسال شد (Host: ' + host + ', Port: ' + port + '). صندوق ورودی را بررسی کنید.');
                return;
            }
            console.log('  خطا:', r.error);
        }
    }
    console.error('✗ ارسال با هیچ Host موفق نشد.');
    process.exit(1);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});

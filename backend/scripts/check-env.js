/**
 * بررسی متغیرهای محیطی — اجرا: node scripts/check-env.js
 */
require('dotenv').config();

const checks = [
    {
        key: 'JWT_SECRET',
        required: true,
        minLength: 64,
        desc: 'کلید رمزنگاری توکن‌های JWT'
    },
    {
        key: 'WEBHOOK_SECRET',
        required: process.env.NODE_ENV === 'production',
        minLength: 32,
        desc: 'کلید احراز هویت webhook واتساپ'
    },
    {
        key: 'ENCRYPT_SECRET',
        required: false,
        minLength: 32,
        desc: 'کلید رمزنگاری رمزهای ایمیل شرکتی'
    },
    {
        key: 'NODE_ENV',
        required: true,
        expected: 'production',
        desc: 'محیط اجرا (باید production باشد)'
    },
    {
        key: 'MAIN_ADMIN_EMAIL',
        required: true,
        desc: 'ایمیل ادمین اصلی'
    },
    {
        key: 'MAIN_ADMIN_PASSWORD',
        required: true,
        minLength: 8,
        desc: 'رمز ادمین اصلی'
    },
    {
        key: 'DATABASE_URL',
        required: false,
        desc: 'آدرس پایگاه داده PostgreSQL'
    },
    {
        key: 'REDIS_URL',
        required: false,
        desc: 'آدرس Redis (اختیاری)'
    },
    {
        key: 'RABBITMQ_URL',
        required: false,
        desc: 'آدرس RabbitMQ (اختیاری)'
    }
];

console.log('\n══════════════════════════════════════════');
console.log('   بررسی متغیرهای محیطی (Environment)   ');
console.log('══════════════════════════════════════════\n');

let hasError = false;
let hasWarning = false;

for (const check of checks) {
    const val = process.env[check.key];
    const exists = val !== undefined && val !== '';
    const len = val ? val.length : 0;

    let status = '';
    let note = '';

    if (!exists) {
        if (check.required) {
            status = '❌ نیست';
            note = 'الزامی است!';
            hasError = true;
        } else {
            status = '⚠️  نیست';
            note = 'اختیاری';
            hasWarning = true;
        }
    } else {
        if (check.minLength && len < check.minLength) {
            status = '⚠️  کوتاه';
            note = `${len} کاراکتر — باید حداقل ${check.minLength} کاراکتر باشد`;
            hasWarning = true;
        } else if (check.expected && val !== check.expected) {
            status = '⚠️  اشتباه';
            note = `مقدار فعلی: "${val}" — باید "${check.expected}" باشد`;
            hasWarning = true;
        } else {
            status = '✅ تنظیم شده';
            // نمایش چند کاراکتر اول برای تأیید (نه کل مقدار)
            if (check.key.toLowerCase().includes('secret') || check.key.toLowerCase().includes('password')) {
                note = `${len} کاراکتر (${val.slice(0, 4)}***)`;
            } else {
                note = val.length > 40 ? val.slice(0, 40) + '...' : val;
            }
        }
    }

    console.log(`${status.padEnd(18)} ${check.key}`);
    console.log(`                   └─ ${check.desc}`);
    if (note) console.log(`                   └─ ${note}`);
    console.log('');
}

console.log('══════════════════════════════════════════');
if (hasError) {
    console.log('❌ خطا: برخی متغیرهای الزامی تنظیم نشده‌اند!');
    console.log('   سرور در production درست کار نخواهد کرد.\n');
} else if (hasWarning) {
    console.log('⚠️  هشدار: برخی متغیرها نیاز به بررسی دارند.');
    console.log('   سرور کار می‌کند اما ممکن است ناامن باشد.\n');
} else {
    console.log('✅ همه متغیرها درست تنظیم شده‌اند!\n');
}

// تولید مقادیر پیشنهادی برای متغیرهای ضعیف یا نبود
const crypto = require('crypto');
const missing = checks.filter(c => {
    const val = process.env[c.key];
    return c.key.includes('SECRET') && (!val || val.length < (c.minLength || 32));
});

if (missing.length > 0) {
    console.log('══════════════════════════════════════════');
    console.log('   مقادیر پیشنهادی برای .env               ');
    console.log('══════════════════════════════════════════\n');
    for (const m of missing) {
        const suggested = crypto.randomBytes(48).toString('hex');
        console.log(`${m.key}=${suggested}`);
    }
    console.log('');
}

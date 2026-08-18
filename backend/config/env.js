/**
 * اعتبارسنجی متغیرهای محیطی — در صورت نبودن مقادیر ضروری، سرور متوقف می‌شود
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function validateEnv() {
    const MAIN_ADMIN_EMAIL = process.env.MAIN_ADMIN_EMAIL;
    const MAIN_ADMIN_PASSWORD = process.env.MAIN_ADMIN_PASSWORD;

    if (!MAIN_ADMIN_EMAIL || !MAIN_ADMIN_PASSWORD) {
        console.error('❌ MAIN_ADMIN_EMAIL و MAIN_ADMIN_PASSWORD باید در فایل .env تنظیم شوند');
        process.exit(1);
    }
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        console.error('❌ JWT_SECRET باید در .env تنظیم شود و حداقل ۳۲ کاراکتر باشد');
        process.exit(1);
    }
    if (!process.env.ENCRYPT_SECRET || process.env.ENCRYPT_SECRET.length < 32) {
        console.error('❌ ENCRYPT_SECRET باید در .env تنظیم شود و حداقل ۳۲ کاراکتر باشد (برای رمزنگاری رمز ایمیل‌های شرکتی)');
        process.exit(1);
    }
    if (process.env.ENCRYPT_SECRET === process.env.JWT_SECRET) {
        console.error('❌ ENCRYPT_SECRET نباید با JWT_SECRET یکسان باشد — از یک مقدار تصادفی جداگانه استفاده کنید');
        process.exit(1);
    }
    if (process.env.NODE_ENV === 'production' && (!process.env.WEBHOOK_SECRET || process.env.WEBHOOK_SECRET.length < 16)) {
        console.error('❌ در production، WEBHOOK_SECRET باید در .env تنظیم شود (حداقل ۱۶ کاراکتر)');
        process.exit(1);
    }
    if (process.env.NODE_ENV === 'production' && process.env.DISABLE_RATE_LIMIT === 'true') {
        console.error('❌ DISABLE_RATE_LIMIT در production مجاز نیست');
        process.exit(1);
    }

    return { MAIN_ADMIN_EMAIL, MAIN_ADMIN_PASSWORD };
}

module.exports = { validateEnv };

/**
 * اعتبارسنجی متغیرهای محیطی — در صورت نبودن مقادیر ضروری، سرور متوقف می‌شود
 */
require('dotenv').config();

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
    if (process.env.NODE_ENV === 'production' && (!process.env.WEBHOOK_SECRET || process.env.WEBHOOK_SECRET.length < 16)) {
        console.error('❌ در production، WEBHOOK_SECRET باید در .env تنظیم شود (حداقل ۱۶ کاراکتر)');
        process.exit(1);
    }

    return { MAIN_ADMIN_EMAIL, MAIN_ADMIN_PASSWORD };
}

module.exports = { validateEnv };

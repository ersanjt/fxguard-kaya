/**
 * احراز هویت webhook — فقط Gateway با secret صحیح مجاز است
 * در production حتماً WEBHOOK_SECRET باید تنظیم شود
 * secret فقط از header خوانده می‌شود (نه query) تا در لاگ‌ها لو نرود
 */
const crypto = require('crypto');

function timingSafeEqual(a, b) {
    try {
        const bufA = Buffer.from(String(a));
        const bufB = Buffer.from(String(b));
        if (bufA.length !== bufB.length) {
            crypto.timingSafeEqual(bufA, bufA);
            return false;
        }
        return crypto.timingSafeEqual(bufA, bufB);
    } catch (_) {
        return false;
    }
}

function createWebhookAuth(logger) {
    const isProduction = process.env.NODE_ENV === 'production';
    return function webhookAuth(req, res, next) {
        const secret = process.env.WEBHOOK_SECRET;
        if (!secret) {
            if (isProduction) {
                logger.error('WEBHOOK_SECRET در production تنظیم نشده — webhook مسدود است');
                return res.status(503).json({ error: 'Webhook temporarily unavailable' });
            }
            logger.warn('⚠️ WEBHOOK_SECRET تنظیم نشده — webhook بدون احراز هویت در دسترس است (فقط development)');
            return next();
        }
        const provided = req.headers['x-webhook-secret'];
        if (!provided || !timingSafeEqual(provided, secret)) {
            logger.warn('Webhook auth failed — invalid or missing secret', { ip: req.ip });
            return res.status(401).json({ error: 'Unauthorized' });
        }
        next();
    };
}

/**
 * قبل از express.json با حد بالا — جلوگیری از ارسال بدنهٔ حجیم بدون secret معتبر
 * @returns {boolean} true ادامهٔ زنجیره، false اگر res ارسال شده
 */
function assertWebhookSecretBeforeBody(req, res, logger) {
    const isProduction = process.env.NODE_ENV === 'production';
    const secret = process.env.WEBHOOK_SECRET;
    if (!secret) {
        if (isProduction) {
            logger.error('WEBHOOK_SECRET در production تنظیم نشده — webhook مسدود است');
            res.status(503).json({ error: 'Webhook temporarily unavailable' });
            return false;
        }
        return true;
    }
    const provided = req.headers['x-webhook-secret'];
    if (!provided || !timingSafeEqual(provided, secret)) {
        logger.warn('Webhook auth failed — invalid or missing secret', { ip: req.ip });
        res.status(401).json({ error: 'Unauthorized' });
        return false;
    }
    return true;
}

module.exports = { createWebhookAuth, assertWebhookSecretBeforeBody };

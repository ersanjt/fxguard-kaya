/**
 * احراز هویت webhook — فقط Gateway با secret صحیح مجاز است
 * در production حتماً WEBHOOK_SECRET باید تنظیم شود
 * secret فقط از header خوانده می‌شود (نه query) تا در لاگ‌ها لو نرود
 */
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
        if (!provided || provided !== secret) {
            logger.warn('Webhook auth failed — invalid or missing secret', { ip: req.ip });
            return res.status(401).json({ error: 'Unauthorized' });
        }
        next();
    };
}

module.exports = { createWebhookAuth };

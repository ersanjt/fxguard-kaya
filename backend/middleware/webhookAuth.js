/**
 * احراز هویت webhook — فقط Gateway با secret صحیح مجاز است
 * در production حتماً WEBHOOK_SECRET باید تنظیم شود
 * secret فقط از header خوانده می‌شود (نه query) تا در لاگ‌ها لو نرود
 * Gateway اختصاصی سازمان شناسهٔ سازمان را در x-gateway-tenant می‌فرستد و فقط secret مشتق‌شدهٔ
 * همان سازمان را دارد؛ پس نمی‌تواند پیامی به نام سکو یا سازمان دیگر ثبت کند.
 */
const crypto = require('crypto');
const { GATEWAY_TENANT_HEADER, tenantWebhookSecret } = require('../lib/tenantGateway');

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

function gatewayTenantIdFromHeaders(req) {
    const raw = req && req.headers && req.headers[GATEWAY_TENANT_HEADER];
    const id = String(raw || '').trim();
    return id || null;
}

/** secret وب‌هوکِ درخواستی که از Gateway سازمان آمده، با secret مشتق‌شدهٔ همان سازمان می‌خواند؟ */
function isValidTenantWebhook(req) {
    const tenantId = gatewayTenantIdFromHeaders(req);
    if (!tenantId) return false;
    const expected = tenantWebhookSecret(tenantId);
    const provided = req.headers['x-webhook-secret'];
    return !!(expected && provided && timingSafeEqual(provided, expected));
}

/**
 * @returns {{ ok: boolean, status?: number, error?: string }}
 */
function checkWebhookSecret(req, logger) {
    const isProduction = process.env.NODE_ENV === 'production';
    const tenantId = gatewayTenantIdFromHeaders(req);
    if (tenantId) {
        const tenantMatches = !req.tenant || String(req.tenant.id || '') === tenantId;
        if (isValidTenantWebhook(req) && tenantMatches) return { ok: true };
        logger.warn('Tenant gateway webhook auth failed', { ip: req.ip, tenantId });
        return { ok: false, status: 401, error: 'Unauthorized' };
    }
    const secret = process.env.WEBHOOK_SECRET;
    if (!secret) {
        if (isProduction) {
            logger.error('WEBHOOK_SECRET در production تنظیم نشده — webhook مسدود است');
            return { ok: false, status: 503, error: 'Webhook temporarily unavailable' };
        }
        logger.warn('⚠️ WEBHOOK_SECRET تنظیم نشده — webhook بدون احراز هویت در دسترس است (فقط development)');
        return { ok: true };
    }
    const provided = req.headers['x-webhook-secret'];
    if (!provided || !timingSafeEqual(provided, secret)) {
        logger.warn('Webhook auth failed — invalid or missing secret', { ip: req.ip });
        return { ok: false, status: 401, error: 'Unauthorized' };
    }
    return { ok: true };
}

function createWebhookAuth(logger) {
    return function webhookAuth(req, res, next) {
        const result = checkWebhookSecret(req, logger);
        if (!result.ok) return res.status(result.status).json({ error: result.error });
        next();
    };
}

/**
 * قبل از express.json با حد بالا — جلوگیری از ارسال بدنهٔ حجیم بدون secret معتبر
 * @returns {boolean} true ادامهٔ زنجیره، false اگر res ارسال شده
 */
function assertWebhookSecretBeforeBody(req, res, logger) {
    const result = checkWebhookSecret(req, logger);
    if (!result.ok) {
        res.status(result.status).json({ error: result.error });
        return false;
    }
    return true;
}

module.exports = {
    createWebhookAuth,
    assertWebhookSecretBeforeBody,
    isValidTenantWebhook,
    gatewayTenantIdFromHeaders,
};

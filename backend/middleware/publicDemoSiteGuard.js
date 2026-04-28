/**
 * دامنهٔ PUBLIC_APP_HOST (مثل kaya.fxguard.io) فقط برای دمو فروش/تست است.
 * با وجود یک بک‌اند مشترک، هر توکن غیرِ دمو و هر عملیات حساس روی این Host رد می‌شود
 * تا دادهٔ مشتری (مثلاً kaya.fxguard.io) از مسیر دمو در دسترس نباشد.
 */
const jwt = require('jsonwebtoken');
const { COOKIE_NAME } = require('../lib/authCookie');
const { isDemoModeEnabled, isPublicAppRequest } = require('../lib/demoAuth');

/**
 * مسیرهای بدون توکن یا با دوفکتوی استاندارد که باید روی سایت دمو باز بمانند.
 * بقیهٔ درخواست‌ها اگر Bearer/cookie مربوط به کاربر واقعی باشد → 403
 */
function publicDemoSiteApiGuard(req, res, next) {
    if (!isPublicAppRequest(req)) return next();

    const pathOnly = (req.path || '').toLowerCase();
    const method = (req.method || 'GET').toUpperCase();

    if (pathOnly.includes('/webhook/')) return next();
    if (method === 'GET' && (pathOnly === '/ping' || pathOnly === '/config')) return next();
    if (method === 'GET' && pathOnly.startsWith('/panel-settings/public/')) return next();
    if (method === 'POST' && pathOnly === '/contact') return next();
    if (method === 'POST' && pathOnly === '/client-errors') return next();
    if (method === 'POST' && pathOnly === '/auth/login') return next();

    if (method === 'POST' && (pathOnly === '/auth/forgot-password' || pathOnly === '/auth/reset-password')) {
        return res.status(403).json({
            error: 'بازیابی رمز فقط از آدرس اختصاصی پنل سازمان شما انجام می‌شود، نه از دامنهٔ دمو.'
        });
    }
    if (method === 'POST' && pathOnly === '/auth/totp/verify-login') {
        return res.status(403).json({
            error: 'ورود با حساب واقعی فقط از پنل اختصاصی سازمان شما امکان‌پذیر است.'
        });
    }

    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) token = authHeader.split(' ')[1];
    else if (req.cookies && req.cookies[COOKIE_NAME]) token = req.cookies[COOKIE_NAME];

    if (!token) return next();

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!isDemoModeEnabled()) {
            return res.status(503).json({ error: 'حساب دمو روی این دامنه غیرفعال است.' });
        }
        if (decoded && decoded.isDemo) return next();
    } catch (_) {
        return next();
    }

    return res.status(403).json({
        error: 'دسترسی به دادهٔ واقعی از این دامنه (دمو) ممکن نیست. از آدرس اختصاصی پنل سازمان خود استفاده کنید.'
    });
}

module.exports = { publicDemoSiteApiGuard };

/**
 * مدیریت کوکی احراز هویت — httpOnly برای امنیت در برابر XSS
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md §۶
 */
const COOKIE_NAME = 'crm_token';
const COOKIE_MAX_AGE_DAYS = 7;

function cookieSecure() {
    if (process.env.COOKIE_SECURE === 'true') return true;
    if (process.env.COOKIE_SECURE === 'false') return false;
    return process.env.NODE_ENV === 'production';
}

function setAuthCookie(res, token) {
    const secure = cookieSecure();
    const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure,
        // lax: survives top-level redirect after login (strict can drop cookie in some CF/browser paths)
        sameSite: 'lax',
        maxAge,
        path: '/'
    });
}

function clearAuthCookie(res) {
    const secure = cookieSecure();
    res.clearCookie(COOKIE_NAME, {
        path: '/',
        httpOnly: true,
        secure,
        sameSite: 'lax'
    });
}

module.exports = { COOKIE_NAME, setAuthCookie, clearAuthCookie };

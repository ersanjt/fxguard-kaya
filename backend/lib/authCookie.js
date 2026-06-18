/**
 * مدیریت کوکی احراز هویت — httpOnly برای امنیت در برابر XSS
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md §۶
 */
const COOKIE_NAME = 'crm_token';
const COOKIE_MAX_AGE_DAYS = 7;

function setAuthCookie(res, token) {
    const isProduction = process.env.NODE_ENV === 'production';
    const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        maxAge,
        path: '/'
    });
}

function clearAuthCookie(res) {
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie(COOKIE_NAME, {
        path: '/',
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax'
    });
}

module.exports = { COOKIE_NAME, setAuthCookie, clearAuthCookie };

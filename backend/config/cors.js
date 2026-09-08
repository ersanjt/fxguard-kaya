/**
 * CORS: پنل کارکنان با کوکی؛ ویترین مارکتینگ بدون credentials.
 * @file    backend/config/cors.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */

function parseList(raw) {
    return String(raw || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

function hostnameOf(origin) {
    try {
        return new URL(origin).hostname.toLowerCase();
    } catch (_) {
        return '';
    }
}

/** ساب‌دامین apex مارکتینگ — SameSite=Lax کوکی پنل را روی این‌ها هم می‌فرستد */
function isApexMarketingOrigin(origin) {
    const host = hostnameOf(origin);
    return host === 'fxguard.io' || host === 'www.fxguard.io';
}

function buildCorsConfig(env = process.env) {
    const fromEnv = parseList(env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3002');
    const publicOrigins = parseList(env.CORS_PUBLIC_ORIGINS || '');
    const extraMarketing = parseList(env.CORS_MARKETING_ORIGINS || '');
    const devExtras = parseList(
        env.CORS_ORIGINS_EXTRA ||
            'http://127.0.0.1:3000,http://127.0.0.1:3002,http://localhost:5173,http://127.0.0.1:5173'
    );

    const listed =
        env.NODE_ENV === 'production'
            ? [...fromEnv]
            : [...new Set([...fromEnv, ...devExtras])];

    const allowedOrigins = [...new Set([...listed, ...publicOrigins, ...extraMarketing])];

    const credentialExplicit = parseList(env.CORS_CREDENTIAL_ORIGINS);
    const credentialSource = credentialExplicit.length ? credentialExplicit : listed;
    const credentialOrigins = credentialSource.filter((o) => !isApexMarketingOrigin(o));

    return {
        allowedOrigins: [...new Set([...allowedOrigins, ...credentialOrigins])],
        credentialOrigins
    };
}

const { allowedOrigins, credentialOrigins } = buildCorsConfig();

function isAllowedOrigin(origin) {
    if (!origin) return false;
    if (allowedOrigins.includes(origin)) return true;
    try {
        const { isSelfServeStaffOrigin } = require('../lib/tenantHost');
        if (isSelfServeStaffOrigin(origin, process.env)) return true;
    } catch (_) {}
    return false;
}

function isCredentialOrigin(origin) {
    if (!origin) return false;
    if (credentialOrigins.includes(origin)) return true;
    try {
        const { isSelfServeStaffOrigin } = require('../lib/tenantHost');
        if (isSelfServeStaffOrigin(origin, process.env)) return true;
    } catch (_) {}
    return false;
}

module.exports = {
    allowedOrigins,
    credentialOrigins,
    buildCorsConfig,
    isAllowedOrigin,
    isCredentialOrigin,
    isApexMarketingOrigin
};

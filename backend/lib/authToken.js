/**
 * Kaya CRM — صدور و اعتبارسنجی JWT نشست
 * @file    lib/authToken.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
const jwt = require('jsonwebtoken');
const { COOKIE_NAME } = require('./authCookie');
const { getStore } = require('../services/tenancy/context');

const JWT_OPTIONS = { expiresIn: process.env.JWT_EXPIRES_IN || '7d' };

function currentTenantClaim() {
    const store = getStore();
    const tenant = store && store.tenant;
    if (!tenant || tenant.legacy || !tenant.slug) return null;
    return String(tenant.slug);
}

function issueToken(user) {
    const tv = user && user.tokenVersion != null ? Number(user.tokenVersion) : 0;
    const payload = { id: user.id, email: user.email, tv: Number.isFinite(tv) ? tv : 0 };
    const tn = currentTenantClaim();
    if (tn) payload.tn = tn;
    return jwt.sign(payload, process.env.JWT_SECRET, JWT_OPTIONS);
}

function tokenTenantMatches(decoded) {
    const claimed = decoded && decoded.tn ? String(decoded.tn) : null;
    const slug = currentTenantClaim();
    if (slug && claimed && claimed !== slug) return false;
    if (!slug && claimed) return false;
    return true;
}

function tokenVersionOf(user) {
    if (!user || user.tokenVersion == null) return 0;
    const n = Number(user.tokenVersion);
    return Number.isFinite(n) ? n : 0;
}

function claimTokenVersion(decoded) {
    if (!decoded || decoded.tv == null) return 0;
    const n = Number(decoded.tv);
    return Number.isFinite(n) ? n : 0;
}

function isTokenVersionValid(decoded, user) {
    return claimTokenVersion(decoded) === tokenVersionOf(user);
}

/** افزایش نسخه → همه JWTهای قبلی (کوکی/Bearer) باطل می‌شوند */
async function bumpUserTokenVersion(user) {
    if (!user) return 0;
    const next = tokenVersionOf(user) + 1;
    await user.update({ tokenVersion: next });
    user.tokenVersion = next;
    return next;
}

function parseCookieValue(cookieHeader, name) {
    if (!cookieHeader || !name) return null;
    const parts = String(cookieHeader).split(';');
    for (let i = 0; i < parts.length; i++) {
        const p = parts[i].trim();
        if (!p) continue;
        const eq = p.indexOf('=');
        if (eq <= 0) continue;
        const k = p.slice(0, eq).trim();
        if (k !== name) continue;
        try {
            return decodeURIComponent(p.slice(eq + 1).trim());
        } catch (_) {
            return p.slice(eq + 1).trim();
        }
    }
    return null;
}

/** توکن از handshake سوکت: auth.token یا Authorization یا کوکی httpOnly */
function getTokenFromSocketHandshake(handshake) {
    if (!handshake) return null;
    const authToken = handshake.auth && handshake.auth.token;
    if (authToken) return String(authToken);
    const authHeader = handshake.headers && handshake.headers.authorization;
    if (authHeader && String(authHeader).startsWith('Bearer ')) {
        return String(authHeader).slice(7).trim();
    }
    const cookieHeader = handshake.headers && handshake.headers.cookie;
    return parseCookieValue(cookieHeader, COOKIE_NAME);
}

module.exports = {
    issueToken,
    tokenTenantMatches,
    bumpUserTokenVersion,
    isTokenVersionValid,
    tokenVersionOf,
    claimTokenVersion,
    parseCookieValue,
    getTokenFromSocketHandshake,
    COOKIE_NAME
};

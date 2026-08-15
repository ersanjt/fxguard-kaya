'use strict';

/**
 * Staff API rate-limit key + skip rules.
 * Per-user buckets (not office NAT) so several agents can work at once.
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { COOKIE_NAME } = require('./authCookie');

const DEFAULT_API_RATE_MAX = 12000;
const DEFAULT_API_RATE_WINDOW_MS = 15 * 60 * 1000;

const STAFF_READ_SKIP_PATHS = new Set([
    '/customers',
    '/conversations',
    '/analytics/dashboard',
    '/rates',
    '/rates/ticker-config',
    '/panel-settings/public/branding',
    '/panel-settings/public/languages',
    '/whatsapp/connection',
    '/whatsapp/overview',
    '/gateway/status',
    '/gateway/qr',
    '/announcements/for-me',
    '/tickets/stats',
    '/tickets',
    '/users',
    '/users/me',
    '/departments',
    '/branches',
    '/config'
]);

function extractApiBearerOrCookie(req) {
    const authHeader = req && req.headers && req.headers.authorization;
    if (authHeader && String(authHeader).startsWith('Bearer ')) {
        return String(authHeader).slice(7).trim() || null;
    }
    if (req && req.cookies && req.cookies[COOKIE_NAME]) {
        return String(req.cookies[COOKIE_NAME]);
    }
    return null;
}

function userIdFromToken(token) {
    if (!token) return null;
    const secret = process.env.JWT_SECRET;
    let decoded = null;
    if (secret) {
        try {
            decoded = jwt.verify(token, secret);
        } catch (_) {
            try {
                decoded = jwt.decode(token);
            } catch (__) {
                decoded = null;
            }
        }
    } else {
        try {
            decoded = jwt.decode(token);
        } catch (_) {
            decoded = null;
        }
    }
    if (decoded && decoded.id && !decoded.totpStep) return String(decoded.id);
    return null;
}

function userIdFromRequest(req) {
    return userIdFromToken(extractApiBearerOrCookie(req));
}

function clientBucketSuffix(req) {
    const ua = String((req && req.get && req.get('user-agent')) || (req && req.headers && req.headers['user-agent']) || '');
    const al = String((req && req.get && req.get('accept-language')) || (req && req.headers && req.headers['accept-language']) || '');
    if (!ua && !al) return '';
    return crypto.createHash('sha1').update(ua + '|' + al).digest('hex').slice(0, 8);
}

function requestIp(req) {
    return String((req && req.ip) || (req && req.socket && req.socket.remoteAddress) || 'unknown');
}

/** Per authenticated browser when possible — shared office IP no longer exhausts one bucket. */
function apiRateLimitKey(req) {
    const userId = userIdFromRequest(req);
    if (userId) {
        const suffix = clientBucketSuffix(req);
        return suffix ? 'u:' + userId + ':' + suffix : 'u:' + userId;
    }
    return 'ip:' + requestIp(req);
}

function normalizeApiPath(req) {
    try {
        let u = String((req && (req.originalUrl || req.url || req.path)) || '');
        u = u.split('?')[0].replace(/\/+/g, '/');
        if (u.length > 1 && u.endsWith('/')) u = u.slice(0, -1);
        if (u.indexOf('/api/') === 0) u = u.slice(4);
        else if (u === '/api') u = '/';
        return u;
    } catch (_) {
        return '';
    }
}

function hasStaffCredential(req) {
    return Boolean(extractApiBearerOrCookie(req));
}

function shouldSkipStaffApiRateLimit(req) {
    if (!req || String(req.method || '').toUpperCase() !== 'GET') return false;
    if (!STAFF_READ_SKIP_PATHS.has(normalizeApiPath(req))) return false;
    // Cookie/Bearer present is enough — do not require a verifiable user id.
    // JWT_SECRET mismatch or an expired token must not send KPI GETs into the write bucket.
    return hasStaffCredential(req) || Boolean(userIdFromRequest(req));
}

function resolveApiRateMax() {
    const n = parseInt(process.env.API_RATE_LIMIT_MAX || String(DEFAULT_API_RATE_MAX), 10);
    return Math.max(500, n || DEFAULT_API_RATE_MAX);
}

function resolveApiRateWindowMs() {
    const n = parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || String(DEFAULT_API_RATE_WINDOW_MS), 10);
    return Math.max(60 * 1000, n || DEFAULT_API_RATE_WINDOW_MS);
}

module.exports = {
    DEFAULT_API_RATE_MAX,
    DEFAULT_API_RATE_WINDOW_MS,
    STAFF_READ_SKIP_PATHS,
    extractApiBearerOrCookie,
    userIdFromToken,
    userIdFromRequest,
    apiRateLimitKey,
    normalizeApiPath,
    shouldSkipStaffApiRateLimit,
    resolveApiRateMax,
    resolveApiRateWindowMs
};

/**
 * جلوی CSRF ساب‌دامین هم‌سایت: mutation با کوکی فقط از origin پنل.
 * @file    backend/lib/cookieOriginGuard.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const { COOKIE_NAME } = require('./authCookie');
const { isCredentialOrigin } = require('../config/cors');

function originFromReferer(referer) {
    if (!referer) return '';
    try {
        return new URL(referer).origin;
    } catch (_) {
        return '';
    }
}

function cookieOriginGuard(req, res, next) {
    const token = req.cookies && req.cookies[COOKIE_NAME];
    if (!token) return next();
    const method = String(req.method || 'GET').toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next();

    const path = String(req.originalUrl || req.url || req.path || '').split('?')[0];
    if (/\/webhook\//i.test(path)) return next();

    const origin = String(req.headers.origin || '').trim();
    if (origin) {
        if (isCredentialOrigin(origin)) return next();
        return res.status(403).json({ error: 'درخواست از این مبدأ مجاز نیست' });
    }

    const refOrigin = originFromReferer(req.headers.referer || req.headers.referrer);
    if (refOrigin && isCredentialOrigin(refOrigin)) return next();

    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'درخواست نامعتبر' });
    }
    return next();
}

module.exports = { cookieOriginGuard, originFromReferer };

'use strict';

/** مسیرهای حساس uploads که بدون ورود نباید عمومی باشند */
const SENSITIVE_PREFIXES = ['/customers/', '/mobile-builds/', '/file-templates/'];

function isSensitiveUploadPath(urlPath) {
    const p = String(urlPath || '')
        .replace(/\\/g, '/')
        .toLowerCase();
    if (SENSITIVE_PREFIXES.some((prefix) => p.includes(prefix))) return true;
    const last = (p.split('/').filter(Boolean).pop() || '');
    // پیوست چت: 1712345678901-filename.ext
    return /^\d{10,}-/.test(last);
}

function protectSensitiveUploads(req, res, next) {
    if (!isSensitiveUploadPath(req.path)) return next();
    // lazy require — جلوگیری از circular dependency و فراخوانی اشتباه کل exports
    const { authMiddleware } = require('./auth');
    if (typeof authMiddleware !== 'function') {
        return res.status(401).json({ error: 'توکن یافت نشد' });
    }
    return authMiddleware(req, res, next);
}

module.exports = { protectSensitiveUploads, isSensitiveUploadPath };

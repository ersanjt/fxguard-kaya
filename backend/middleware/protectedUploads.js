'use strict';

const path = require('path');
const {
    panelKeyFromUploadUrlPath,
    assertUploadPathBelongsToCurrentTenant,
    customerIdFromUploadPath,
} = require('../lib/tenantUploads');

/** مسیرهای حساس uploads که بدون ورود نباید عمومی باشند */
const SENSITIVE_PREFIXES = ['/customers/', '/mobile-builds/', '/file-templates/', '/tenants/', '/import/'];

/** حتی اگر در تنظیمات پنل به‌اشتباه به‌عنوان لوگو ثبت شده باشند، عمومی نمی‌شوند */
const BRANDING_BLOCKED_PREFIXES = ['/customers/', '/mobile-builds/', '/file-templates/', '/import/'];
const PUBLIC_BRANDING_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg']);
const BRANDING_FIELDS = ['logoUrl', 'faviconUrl', 'loginLogoUrl'];
const BRANDING_TTL_MS = 15000;

let brandingCache = { at: 0, paths: null };

function isSensitiveUploadPath(urlPath) {
    const p = String(urlPath || '')
        .replace(/\\/g, '/')
        .toLowerCase();
    if (SENSITIVE_PREFIXES.some((prefix) => p.includes(prefix))) return true;
    const last = (p.split('/').filter(Boolean).pop() || '');
    // پیوست چت: 1712345678901-filename.ext
    return /^\d{10,}-/.test(last);
}

/** مسیر داخل mount مربوط به /uploads، مثلاً /1776-logo.png */
function toMountedUploadPath(url) {
    if (url == null) return '';
    let s = String(url).trim().split('?')[0].replace(/\\/g, '/');
    if (!s) return '';
    try {
        s = decodeURIComponent(s);
    } catch (_) {}
    const idx = s.toLowerCase().indexOf('/uploads/');
    if (idx >= 0) s = s.slice(idx + '/uploads'.length);
    if (!s.startsWith('/')) s = '/' + s;
    if (s.includes('..')) return '';
    const normalized = path.posix.normalize(s);
    if (!normalized.startsWith('/') || normalized.includes('..')) return '';
    return normalized;
}

function isSafePublicBrandingRel(rel) {
    if (!rel || rel === '/' || rel.includes('..')) return false;
    const lower = rel.toLowerCase();
    if (BRANDING_BLOCKED_PREFIXES.some((prefix) => lower.includes(prefix))) return false;
    return PUBLIC_BRANDING_EXTS.has(path.posix.extname(lower));
}

function isListedPublicBrandingPath(requestPath, brandingUrls) {
    const rel = toMountedUploadPath(requestPath);
    if (!isSafePublicBrandingRel(rel)) return false;
    return (brandingUrls || []).some((url) => toMountedUploadPath(url) === rel);
}

function invalidatePublicBrandingCache() {
    brandingCache = { at: 0, paths: null };
}

async function loadPublicBrandingPaths() {
    const now = Date.now();
    if (brandingCache.paths && now - brandingCache.at < BRANDING_TTL_MS) return brandingCache.paths;
    const { PanelSetting } = require('../models');
    const rows = await PanelSetting.findAll({
        attributes: BRANDING_FIELDS,
        raw: true,
    });
    const paths = new Set();
    for (const row of rows || []) {
        for (const key of BRANDING_FIELDS) {
            const rel = toMountedUploadPath(row && row[key]);
            if (isSafePublicBrandingRel(rel)) paths.add(rel);
        }
    }
    brandingCache = { at: now, paths };
    return paths;
}

async function isConfiguredPublicBrandingPath(requestPath) {
    const rel = toMountedUploadPath(requestPath);
    if (!isSafePublicBrandingRel(rel)) return false;
    const paths = await loadPublicBrandingPaths();
    return paths.has(rel);
}

function protectSensitiveUploads(req, res, next) {
    if (!isSensitiveUploadPath(req.path)) return next();
    isConfiguredPublicBrandingPath(req.path)
        .then((isPublic) => {
            if (isPublic) return next();
            return continueProtectedUpload(req, res, next);
        })
        .catch(() => continueProtectedUpload(req, res, next));
}

function continueProtectedUpload(req, res, next) {
    const { authMiddleware } = require('./auth');
    if (typeof authMiddleware !== 'function') {
        return res.status(401).json({ error: 'توکن یافت نشد' });
    }
    return authMiddleware(req, res, async (err) => {
        if (err) return next(err);
        try {
            const pathKey = panelKeyFromUploadUrlPath(req.path);
            if (pathKey && !assertUploadPathBelongsToCurrentTenant(req.path)) {
                return res.status(403).json({
                    error: 'دسترسی به فایل این سازمان ندارید',
                    code: 'UPLOAD_TENANT_MISMATCH',
                });
            }
            const customerId = customerIdFromUploadPath(req.path);
            if (customerId) {
                const { Customer } = require('../models');
                const row = await Customer.findByPk(customerId, { attributes: ['id'] });
                if (!row) {
                    return res.status(404).json({ error: 'فایل یافت نشد', code: 'UPLOAD_CUSTOMER_NOT_FOUND' });
                }
            }
            return next();
        } catch (e) {
            return next(e);
        }
    });
}

module.exports = {
    protectSensitiveUploads,
    isSensitiveUploadPath,
    toMountedUploadPath,
    isListedPublicBrandingPath,
    invalidatePublicBrandingCache,
};

/**
 * مسیر فایل هر سازمان جدا از بقیه است: uploads/tenants/<panelKey>/...
 * بدون زمینهٔ سازمان، فقط پوشهٔ سکو (default) نوشته می‌شود.
 */
'use strict';

const path = require('path');
const fs = require('fs');
const { getPanelSettingsKey, isPlatformTenant, getCurrentTenant } = require('./tenantContext');

const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');
const TENANTS_SEGMENT = 'tenants';

function sanitizePanelKey(raw) {
    const s = String(raw || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '')
        .slice(0, 32);
    return s || 'default';
}

function currentPanelKey() {
    const key = getPanelSettingsKey();
    if (key) return sanitizePanelKey(key);
    const tenant = getCurrentTenant();
    if (tenant && isPlatformTenant(tenant)) return 'default';
    return null;
}

/** پوشهٔ مطلق فایل‌های سازمان جاری؛ null اگر سازمان نامشخص باشد. */
function tenantUploadDir(subPath) {
    const key = currentPanelKey();
    if (!key) return null;
    const parts = [UPLOADS_ROOT, TENANTS_SEGMENT, key];
    if (subPath) {
        String(subPath)
            .split(/[/\\]+/)
            .filter(Boolean)
            .forEach((p) => {
                if (p === '..' || p === '.') return;
                parts.push(p);
            });
    }
    return path.join.apply(path, parts);
}

function ensureTenantUploadDir(subPath) {
    const dir = tenantUploadDir(subPath);
    if (!dir) {
        const err = new Error('سازمان پنل برای آپلود مشخص نیست');
        err.code = 'TENANT_UPLOAD_CONTEXT';
        throw err;
    }
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
}

/** URL عمومی نسبی برای فایل ذخیره‌شده در پوشهٔ سازمان */
function tenantUploadUrl(fileName, subPath) {
    const key = currentPanelKey();
    if (!key) return null;
    const safe = String(fileName || '')
        .replace(/\\/g, '/')
        .replace(/^\/+/, '');
    if (!safe || safe.includes('..')) return null;
    const mid = subPath
        ? String(subPath)
              .replace(/\\/g, '/')
              .replace(/^\/+|\/+$/g, '')
              .split('/')
              .filter((p) => p && p !== '..')
              .join('/')
        : '';
    return '/uploads/' + TENANTS_SEGMENT + '/' + key + (mid ? '/' + mid : '') + '/' + safe;
}

function panelKeyFromUploadUrlPath(urlPath) {
    const p = String(urlPath || '')
        .replace(/\\/g, '/')
        .toLowerCase();
    const m = p.match(/(?:^|\/)tenants\/([^/]+)\//);
    return m ? sanitizePanelKey(m[1]) : null;
}

function assertUploadPathBelongsToCurrentTenant(urlPath) {
    const pathKey = panelKeyFromUploadUrlPath(urlPath);
    if (!pathKey) return true;
    const mine = currentPanelKey();
    if (!mine) return false;
    if (mine === pathKey) return true;
    const tenant = getCurrentTenant();
    return !!(tenant && isPlatformTenant(tenant) && pathKey === 'default');
}

/** شناسهٔ مشتری از مسیر /uploads/.../customers/<uuid>/... */
function customerIdFromUploadPath(urlPath) {
    const p = String(urlPath || '').replace(/\\/g, '/');
    const m = p.match(/\/customers\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i);
    return m ? m[1] : null;
}

/** مسیر مطلق داخل uploads → URL عمومی نسبی؛ null اگر خارج از ریشه باشد. */
function publicUrlFromAbsolutePath(absPath) {
    if (!absPath) return null;
    const root = path.resolve(UPLOADS_ROOT) + path.sep;
    const resolved = path.resolve(String(absPath));
    if (resolved !== path.resolve(UPLOADS_ROOT) && !resolved.startsWith(root)) return null;
    const rel = path.relative(UPLOADS_ROOT, resolved).replace(/\\/g, '/');
    if (!rel || rel.startsWith('..')) return null;
    return '/uploads/' + rel;
}

module.exports = {
    UPLOADS_ROOT,
    TENANTS_SEGMENT,
    sanitizePanelKey,
    currentPanelKey,
    tenantUploadDir,
    ensureTenantUploadDir,
    tenantUploadUrl,
    panelKeyFromUploadUrlPath,
    assertUploadPathBelongsToCurrentTenant,
    customerIdFromUploadPath,
    publicUrlFromAbsolutePath,
};

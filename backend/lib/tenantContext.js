/**
 * Kaya CRM — زمینهٔ سازمان جاری (AsyncLocalStorage)
 * @file    backend/lib/tenantContext.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const { AsyncLocalStorage } = require('async_hooks');
const { PLATFORM_SLUG } = require('./tenantHost');

const tenantAls = new AsyncLocalStorage();

let platformTenantCache = null;

function getStore() {
    return tenantAls.getStore() || null;
}

function getCurrentTenant() {
    const store = getStore();
    return (store && store.tenant) || null;
}

function getCurrentTenantId() {
    const t = getCurrentTenant();
    return t && t.id ? t.id : null;
}

function getPanelSettingsKey() {
    const store = getStore();
    if (store) {
        const t = store.tenant;
        if (t && t.panelKey) return String(t.panelKey);
        if (t && isPlatformTenant(t)) return 'default';
        // زمینهٔ درخواست بدون سازمان نباید به ردیف سکو (رمز SMTP و توکن‌ها) بیفتد
        return null;
    }
    return 'default';
}

/** کلید پنل سازمان جاری؛ اگر نامشخص باشد خطا می‌دهد تا هیچ‌وقت به default سکو نیفتد. */
function requirePanelSettingsKey() {
    const key = getPanelSettingsKey();
    if (!key) {
        const err = new Error('سازمان پنل مشخص نیست');
        err.code = 'PANEL_KEY_REQUIRED';
        err.status = 400;
        throw err;
    }
    return key;
}

function isPlatformTenant(tenant) {
    if (!tenant) return true;
    if (tenant.isPlatform) return true;
    return tenant.slug === PLATFORM_SLUG;
}

function setPlatformTenantCache(tenant) {
    platformTenantCache = tenant || null;
}

function getCachedPlatformTenant() {
    return platformTenantCache;
}

function runWithTenant(tenant, fn) {
    return tenantAls.run({ tenant: tenant || null }, fn);
}

function normalizeTenantId(value) {
    if (value == null || value === '') return null;
    return String(value);
}

/**
 * null/undefined و شناسهٔ سازمان سکو هر دو «سکو» محسوب می‌شوند
 * (ردیف‌های legacy قبل از backfill tenantId ندارند).
 */
function isPlatformTenantId(value) {
    const v = normalizeTenantId(value);
    if (v === null) return true;
    const platform = getCachedPlatformTenant();
    return !!(platform && platform.id && String(platform.id) === v);
}

/** آیا دو رکورد/کاربر به یک سازمان تعلق دارند؟ مرز سخت بین سازمان‌های self-serve. */
function sameTenant(a, b) {
    const x = normalizeTenantId(a);
    const y = normalizeTenantId(b);
    if (x === y) return true;
    return isPlatformTenantId(x) && isPlatformTenantId(y);
}

/** نام room سوکت برای پخش رویدادهای سازمانی (به‌جای io.emit سراسری). */
function tenantRoom(tenantId) {
    const v = normalizeTenantId(tenantId);
    return 'tenant_' + (isPlatformTenantId(v) ? 'platform' : v);
}

/** room دپارتمان با پیشوند سازمان تا رویداد یک شرکت به دپارتمان شرکت دیگر نرود. */
function departmentRoom(tenantId, departmentId) {
    if (!departmentId) return null;
    const tenantPart = isPlatformTenantId(tenantId) ? 'platform' : normalizeTenantId(tenantId) || 'platform';
    return 'department_' + tenantPart + '_' + String(departmentId);
}

function bindSocketTenant(socket) {
    if (!socket || typeof socket.on !== 'function') return socket;
    const origOn = socket.on.bind(socket);
    socket.on = function tenantAwareOn(event, listener) {
        if (typeof listener !== 'function') return origOn(event, listener);
        return origOn(event, function tenantAwareListener() {
            const tenant = socket.tenant || null;
            const args = arguments;
            const self = this;
            return runWithTenant(tenant, () => listener.apply(self, args));
        });
    };
    return socket;
}

module.exports = {
    tenantAls,
    getCurrentTenant,
    getCurrentTenantId,
    getPanelSettingsKey,
    requirePanelSettingsKey,
    isPlatformTenant,
    setPlatformTenantCache,
    getCachedPlatformTenant,
    runWithTenant,
    bindSocketTenant,
    normalizeTenantId,
    isPlatformTenantId,
    sameTenant,
    tenantRoom,
    departmentRoom,
};

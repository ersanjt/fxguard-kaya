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
    const t = getCurrentTenant();
    if (t && t.panelKey) return String(t.panelKey);
    return 'default';
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
    isPlatformTenant,
    setPlatformTenantCache,
    getCachedPlatformTenant,
    runWithTenant,
    bindSocketTenant,
};

/**
 * یک پروسهٔ Gateway فقط به سازمانِ GATEWAY_TENANT_SLUG جواب می‌دهد.
 * اگر متغیر خالی باشد (گیت‌وی سکو) محدودیتی اعمال نمی‌شود.
 */
'use strict';

function boundTenantSlug(env) {
    const src = env || process.env;
    return String(src.GATEWAY_TENANT_SLUG || '')
        .trim()
        .toLowerCase();
}

function claimedFromHeaders(headers) {
    if (!headers) return '';
    const raw = headers['x-tenant-slug'];
    const value = Array.isArray(raw) ? raw[0] : raw;
    return String(value || '')
        .trim()
        .toLowerCase();
}

function tenantBindError(claimed, env) {
    const bound = boundTenantSlug(env);
    if (!bound) return null;
    const slug = String(claimed || '')
        .trim()
        .toLowerCase();
    if (!slug || slug !== bound) return 'tenant_mismatch';
    return null;
}

module.exports = {
    boundTenantSlug,
    claimedFromHeaders,
    tenantBindError,
};

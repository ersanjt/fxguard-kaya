/**
 * Kaya CRM — برند محصول FXGuard روی میز فروش خودخدمت (نه برند کایا)
 * @file    backend/lib/selfServeBranding.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const { isSelfServeEnabled, isKayaStaffHost, parseTenantSlugFromHost } = require('./tenantHost');

const FXGUARD_LOGO = '/brand/fxguard-logo.svg';
const FXGUARD_NAME = 'FXGuard';

function looksLikeKayaBrand(s) {
    const blob = [
        s && s.siteName,
        s && s.loginTitle,
        s && s.pageTitle,
        s && s.logoUrl,
        s && s.loginLogoUrl,
        s && s.faviconUrl,
    ]
        .join(' ')
        .toLowerCase();
    return /kaya/.test(blob);
}

function fxguardProductBranding(base) {
    const src = base && typeof base === 'object' ? base : {};
    const keepTitle = (v) => {
        const t = String(v || '').trim();
        if (!t || /kaya/i.test(t)) return '';
        return t;
    };
    return Object.assign({}, src, {
        siteName: FXGUARD_NAME,
        loginTitle: keepTitle(src.loginTitle) || 'ورود به FXGuard',
        pageTitle: keepTitle(src.pageTitle) || 'ورود | FXGuard',
        logoUrl: FXGUARD_LOGO,
        loginLogoUrl: FXGUARD_LOGO,
        faviconUrl: FXGUARD_LOGO,
    });
}

/**
 * Apex فروش (app.fxguard.io) نباید لوگوی کپی‌شدهٔ Kaya Holding را نشان دهد.
 * ساب‌دامین مشتری و kaya.fxguard.io دست‌نخورده می‌مانند.
 */
function overlaySelfServePlatformBranding(branding, opts) {
    const host = opts && opts.host;
    const env = (opts && opts.env) || process.env;
    if (!isSelfServeEnabled(env, host)) return branding;
    if (isKayaStaffHost(host)) return branding;
    const tenant = opts && opts.tenant;
    if (tenant && !tenant.isPlatform && tenant.slug && tenant.slug !== 'platform' && !tenant.missing) {
        return branding;
    }
    const parsed = parseTenantSlugFromHost(host, env);
    if (!parsed || parsed.kind !== 'platform') return branding;
    const src = branding && typeof branding === 'object' ? branding : {};
    if (!looksLikeKayaBrand(src) && src.logoUrl) return src;
    return fxguardProductBranding(src);
}

module.exports = {
    overlaySelfServePlatformBranding,
    fxguardProductBranding,
    looksLikeKayaBrand,
    FXGUARD_LOGO,
    FXGUARD_NAME,
};

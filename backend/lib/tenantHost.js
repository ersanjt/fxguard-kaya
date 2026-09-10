/**
 * Kaya CRM — ساب‌دامین، دامنهٔ سفارشی و پرچم ثبت‌نام خودخدمت
 * @file    backend/lib/tenantHost.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const PLATFORM_SLUG = 'platform';
const DEFAULT_BASE_HOST = 'app.fxguard.io';
const DEFAULT_TRIAL_DAYS = 7;

const RESERVED_SLUGS = {
    www: 1,
    app: 1,
    api: 1,
    kaya: 1,
    login: 1,
    dashboard: 1,
    admin: 1,
    mail: 1,
    ftp: 1,
    default: 1,
    platform: 1,
    staging: 1,
    demo: 1,
    static: 1,
    assets: 1,
    cdn: 1,
    webhook: 1,
    billing: 1,
    signup: 1,
    status: 1,
    health: 1,
    metrics: 1,
    support: 1,
    help: 1,
    test: 1,
    fxguard: 1,
    owner: 1,
    staff: 1,
    www2: 1,
    ns: 1,
    smtp: 1,
    imap: 1,
    pop: 1,
};

function envFlagOn(raw) {
    const v = String(raw || '')
        .trim()
        .toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
}

function tenantBaseHost(env) {
    const src = env || process.env;
    return String(src.TENANT_BASE_HOST || DEFAULT_BASE_HOST)
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .replace(/:\d+$/, '');
}

function trialDays(env) {
    const n = parseInt(String((env || process.env).TENANT_TRIAL_DAYS || DEFAULT_TRIAL_DAYS), 10);
    if (!Number.isFinite(n) || n < 1) return DEFAULT_TRIAL_DAYS;
    return Math.min(30, n);
}

function isKayaStaffHost(host) {
    const h = String(host || '')
        .trim()
        .toLowerCase()
        .replace(/:\d+$/, '');
    return h === 'kaya.fxguard.io' || h.endsWith('.kaya.fxguard.io');
}

function isSelfServeEnabled(env, host) {
    const src = env || process.env;
    if (!envFlagOn(src.SELF_SERVE_SIGNUP)) return false;
    if (isKayaStaffHost(host)) return false;
    return true;
}

function hostnameOfOrigin(origin) {
    try {
        return new URL(origin).hostname.toLowerCase();
    } catch (_) {
        return '';
    }
}

function isSelfServeStaffOrigin(origin, env) {
    const host = hostnameOfOrigin(origin);
    const base = tenantBaseHost(env);
    if (!host || !base) return false;
    if (host === base) return true;
    if (host.endsWith('.' + base)) return true;
    return false;
}

function normalizeHostname(raw) {
    return String(raw || '')
        .trim()
        .toLowerCase()
        .split(',')[0]
        .trim()
        .replace(/:\d+$/, '')
        .replace(/\.$/, '');
}

function requestHostname(req) {
    if (!req) return '';
    const xf = req.headers && (req.headers['x-forwarded-host'] || req.headers['x-forwarded-hostname']);
    const host = xf || (req.headers && req.headers.host) || '';
    return normalizeHostname(host);
}

function normalizeSlug(raw) {
    return String(raw || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 24);
}

function slugError(slug) {
    const s = String(slug || '');
    if (s.length < 3) return 'شناسه باید حداقل ۳ کاراکتر باشد';
    if (s.length > 24) return 'شناسه حداکثر ۲۴ کاراکتر است';
    if (!/^[a-z0-9]([a-z0-9-]{0,22}[a-z0-9])?$/.test(s)) {
        return 'فقط حروف انگلیسی کوچک، عدد و خط تیره؛ ابتدا و انتها حرف یا عدد';
    }
    if (RESERVED_SLUGS[s]) return 'این شناسه رزرو شده است';
    return null;
}

function isReservedSlug(slug) {
    return !!RESERVED_SLUGS[normalizeSlug(slug)];
}

function panelKeyForSlug(slug) {
    const s = normalizeSlug(slug);
    if (!s || s === PLATFORM_SLUG) return 'default';
    return ('t-' + s).slice(0, 32);
}

function parseTenantSlugFromHost(host, env) {
    const h = normalizeHostname(host);
    const base = tenantBaseHost(env);
    if (!h || !base) return { kind: 'platform', slug: null, host: h };
    if (h === base) return { kind: 'platform', slug: null, host: h };
    if (isKayaStaffHost(h)) return { kind: 'platform', slug: null, host: h };
    if (h.endsWith('.' + base)) {
        const sub = h.slice(0, h.length - (base.length + 1));
        if (!sub || sub.indexOf('.') >= 0) return { kind: 'custom', slug: null, host: h };
        const slug = normalizeSlug(sub);
        if (!slug || slugError(slug)) return { kind: 'unknown', slug: null, host: h };
        return { kind: 'subdomain', slug, host: h };
    }
    if (h === 'localhost' || h === '127.0.0.1' || h.endsWith('.localhost')) {
        return { kind: 'platform', slug: null, host: h };
    }
    return { kind: 'custom', slug: null, host: h };
}

function tenantWildcardDnsReady(env) {
    return envFlagOn((env || process.env).TENANT_WILDCARD_DNS);
}

function tenantLoginUrl(slug, env, proto) {
    const s = normalizeSlug(slug);
    const src = env || process.env;
    const base = tenantBaseHost(src);
    const scheme = proto === 'http' ? 'http' : 'https';
    if (!s) return scheme + '://' + base + '/login';
    if (tenantWildcardDnsReady(src)) {
        return scheme + '://' + s + '.' + base + '/login';
    }
    return scheme + '://' + base + '/login?panel=' + encodeURIComponent(s);
}

function tenantDashboardUrl(slug, env, proto) {
    const s = normalizeSlug(slug);
    const src = env || process.env;
    const base = tenantBaseHost(src);
    const scheme = proto === 'http' ? 'http' : 'https';
    if (!s) return scheme + '://' + base + '/dashboard';
    if (tenantWildcardDnsReady(src)) {
        return scheme + '://' + s + '.' + base + '/dashboard';
    }
    return scheme + '://' + base + '/dashboard?panel=' + encodeURIComponent(s);
}

function readApexPanelSlug(req) {
    if (!req) return '';
    const q = req.query || {};
    const raw = q.panel || q.desk || '';
    const slug = normalizeSlug(raw);
    if (!slug || slug === PLATFORM_SLUG || slugError(slug)) return '';
    return slug;
}

function isSelfServeSignupPath(req) {
    const p = String((req && (req.originalUrl || req.url)) || '').split('?')[0];
    return (
        p === '/signup' ||
        p.indexOf('/api/tenants/signup') === 0 ||
        p.indexOf('/api/tenants/check-slug') === 0
    );
}

function publicSelfServeConfig(env, host) {
    const src = env || process.env;
    const enabled = isSelfServeEnabled(src, host);
    return {
        enabled,
        trialDays: trialDays(src),
        parentHost: tenantBaseHost(src),
        signupPath: '/signup',
        wildcardDns: tenantWildcardDnsReady(src),
        panelQuery: 'panel',
    };
}

module.exports = {
    PLATFORM_SLUG,
    DEFAULT_BASE_HOST,
    DEFAULT_TRIAL_DAYS,
    RESERVED_SLUGS,
    envFlagOn,
    tenantBaseHost,
    trialDays,
    isKayaStaffHost,
    isSelfServeEnabled,
    isSelfServeStaffOrigin,
    hostnameOfOrigin,
    normalizeHostname,
    requestHostname,
    normalizeSlug,
    slugError,
    isReservedSlug,
    panelKeyForSlug,
    parseTenantSlugFromHost,
    tenantLoginUrl,
    tenantDashboardUrl,
    tenantWildcardDnsReady,
    readApexPanelSlug,
    isSelfServeSignupPath,
    publicSelfServeConfig,
};

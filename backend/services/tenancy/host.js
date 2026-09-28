/**
 * معنی Host را به پنل شرکت، سایت پلتفرم، یا حالت تک‌دیتابیس محلی ترجمه می‌کند.
 *
 * fxguard.io و app.fxguard.io پنل مشتری نیستند.
 * nika.fxguard.io شرکت production است.
 * nika.app.fxguard.io شرکت تست است.
 * nika.localhost شرکت روی رایانهٔ توسعه است.
 * kaya.fxguard.io در production همان دیتابیس فعلی سرور است.
 */

const RESERVED = new Set([
    'www',
    'app',
    'api',
    'mail',
    'admin',
    'platform',
    'static',
    'cdn',
    'ftp',
    'smtp',
    'imap',
    'webmail',
    'ns1',
    'ns2'
]);

function apexDomain() {
    return String(process.env.PRODUCT_APEX_DOMAIN || 'fxguard.io').trim().toLowerCase();
}

function hostnameOf(hostHeader) {
    const raw = String(hostHeader || '').trim().toLowerCase();
    if (!raw) return '';
    if (raw.startsWith('[')) {
        const end = raw.indexOf(']');
        return end > 1 ? raw.slice(1, end) : raw;
    }
    const firstColon = raw.indexOf(':');
    const lastColon = raw.lastIndexOf(':');
    if (firstColon > -1 && firstColon === lastColon) return raw.slice(0, firstColon);
    return raw;
}

function legacySlug() {
    if (process.env.LEGACY_TENANT_SLUG !== undefined) {
        return String(process.env.LEGACY_TENANT_SLUG).trim().toLowerCase();
    }
    return process.env.NODE_ENV === 'production' ? 'kaya' : '';
}

function legacyEnvironment() {
    return String(process.env.LEGACY_TENANT_ENV || 'production').trim().toLowerCase();
}

function isLegacyTenant(slug, environment) {
    const legacy = legacySlug();
    if (!legacy || !slug) return false;
    return slug === legacy && environment === legacyEnvironment();
}

function isReservedSlug(slug) {
    return RESERVED.has(String(slug || '').toLowerCase());
}

function resolveHost(hostHeader) {
    const host = hostnameOf(hostHeader);
    const apex = apexDomain();
    if (!host || host === 'localhost' || host === '127.0.0.1' || host === '::1') {
        return { kind: 'legacy', host: host || 'localhost' };
    }
    if (host.endsWith('.localhost')) {
        const slug = host.slice(0, -'.localhost'.length);
        if (!slug || slug.includes('.') || isReservedSlug(slug)) {
            return { kind: 'unknown', host };
        }
        return { kind: 'tenant', slug, environment: 'local', host };
    }
    if (host === apex || host === `www.${apex}`) {
        return { kind: 'platform', host, environment: 'production' };
    }
    if (host === `app.${apex}`) {
        return { kind: 'platform', host, environment: 'test' };
    }
    const testSuffix = `.app.${apex}`;
    if (host.endsWith(testSuffix)) {
        const slug = host.slice(0, -testSuffix.length);
        if (!slug || slug.includes('.') || isReservedSlug(slug)) {
            return { kind: 'unknown', host };
        }
        return { kind: 'tenant', slug, environment: 'test', host };
    }
    const prodSuffix = `.${apex}`;
    if (host.endsWith(prodSuffix)) {
        const slug = host.slice(0, -prodSuffix.length);
        if (!slug || slug.includes('.') || isReservedSlug(slug)) {
            return { kind: 'unknown', host };
        }
        return { kind: 'tenant', slug, environment: 'production', host };
    }
    return { kind: 'unknown', host };
}

function panelUrl(slug, environment) {
    const apex = apexDomain();
    if (environment === 'local') {
        const port = String(process.env.PORT || '3002');
        return `http://${slug}.localhost:${port}`;
    }
    if (environment === 'test') return `https://${slug}.app.${apex}`;
    return `https://${slug}.${apex}`;
}

function allowedEnvironments() {
    const raw = process.env.PLATFORM_ENVIRONMENTS;
    if (raw != null && String(raw).trim()) {
        return String(raw)
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);
    }
    if (process.env.NODE_ENV === 'production') return ['production', 'test'];
    return ['local'];
}

module.exports = {
    RESERVED,
    apexDomain,
    hostnameOf,
    legacySlug,
    isLegacyTenant,
    isReservedSlug,
    resolveHost,
    panelUrl,
    allowedEnvironments
};

/**
 * Kaya CRM — تشخیص سازمان از Host
 * @file    backend/middleware/tenantContext.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const { Op } = require('sequelize');
const {
    PLATFORM_SLUG,
    requestHostname,
    parseTenantSlugFromHost,
    panelKeyForSlug,
    normalizeSlug,
} = require('../lib/tenantHost');
const { runWithTenant, setPlatformTenantCache, getCachedPlatformTenant } = require('../lib/tenantContext');

function platformShape(row) {
    if (row) {
        return {
            id: row.id,
            slug: row.slug || PLATFORM_SLUG,
            name: row.name || 'Platform',
            status: row.status || 'active',
            planTier: row.planTier || 'legacy',
            trialEndsAt: row.trialEndsAt || null,
            panelKey: row.panelKey || 'default',
            customDomain: row.customDomain || null,
            isPlatform: true,
        };
    }
    return {
        id: null,
        slug: PLATFORM_SLUG,
        name: 'Platform',
        status: 'active',
        planTier: 'legacy',
        trialEndsAt: null,
        panelKey: 'default',
        customDomain: null,
        isPlatform: true,
    };
}

function tenantShape(row, extra) {
    const base = {
        id: row.id,
        slug: row.slug,
        name: row.name,
        status: row.status,
        planTier: row.planTier,
        trialEndsAt: row.trialEndsAt,
        panelKey: row.panelKey || panelKeyForSlug(row.slug),
        customDomain: row.customDomain || null,
        isPlatform: row.slug === PLATFORM_SLUG,
        stripeCustomerId: row.stripeCustomerId || null,
        stripeSubscriptionId: row.stripeSubscriptionId || null,
    };
    return extra ? Object.assign(base, extra) : base;
}

async function loadPlatformTenant() {
    const cached = getCachedPlatformTenant();
    if (cached && cached.id) return cached;
    try {
        const { Tenant } = require('../models');
        const row = await Tenant.findOne({ where: { slug: PLATFORM_SLUG } });
        const shaped = platformShape(row);
        if (row) setPlatformTenantCache(shaped);
        return shaped;
    } catch (_) {
        return platformShape(null);
    }
}

async function resolveTenantFromRequest(req) {
    const host = requestHostname(req);
    const parsed = parseTenantSlugFromHost(host);

    if (process.env.NODE_ENV === 'test') {
        const headerSlug = req.headers && req.headers['x-tenant-slug'];
        const q = req.query && req.query.tenant;
        const override = normalizeSlug(headerSlug || q || '');
        if (override && override !== PLATFORM_SLUG) {
            try {
                const { Tenant } = require('../models');
                const row = await Tenant.findOne({ where: { slug: override } });
                if (row) return tenantShape(row, { host });
            } catch (_) {}
        }
    }

    if (parsed.kind === 'subdomain' && parsed.slug) {
        try {
            const { Tenant } = require('../models');
            const row = await Tenant.findOne({ where: { slug: parsed.slug } });
            if (row) return tenantShape(row, { host });
        } catch (_) {}
        return tenantShape(
            {
                id: null,
                slug: parsed.slug,
                name: parsed.slug,
                status: 'unknown',
                planTier: 'start',
                trialEndsAt: null,
                panelKey: panelKeyForSlug(parsed.slug),
                customDomain: null,
            },
            { host, missing: true, isPlatform: false }
        );
    }

    if (parsed.kind === 'custom' && parsed.host) {
        try {
            const { Tenant } = require('../models');
            const row = await Tenant.findOne({
                where: { customDomain: { [Op.eq]: parsed.host } },
            });
            if (row) return tenantShape(row, { host: parsed.host });
        } catch (_) {}
    }

    const platform = await loadPlatformTenant();
    platform.host = host;
    return platform;
}

function tenantContextMiddleware(req, res, next) {
    resolveTenantFromRequest(req)
        .then((tenant) => {
            req.tenant = tenant;
            runWithTenant(tenant, () => next());
        })
        .catch(() => {
            const fallback = platformShape(null);
            req.tenant = fallback;
            runWithTenant(fallback, () => next());
        });
}

module.exports = {
    tenantContextMiddleware,
    resolveTenantFromRequest,
    loadPlatformTenant,
    platformShape,
    tenantShape,
};

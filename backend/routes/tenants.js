/**
 * Kaya CRM — ثبت‌نام خودخدمت و دامنهٔ اختصاصی
 * @file    backend/routes/tenants.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const {
    isSelfServeEnabled,
    requestHostname,
    normalizeSlug,
    slugError,
    tenantBaseHost,
    tenantLoginUrl,
} = require('../lib/tenantHost');
const { provisionSelfServeTenant, setTenantCustomDomain } = require('../services/tenantProvision');
const { publicTenantPayload } = require('../lib/tenantTrial');
const { Tenant, User } = require('../models');
const { setAuthCookie } = require('../lib/authCookie');
const { issueStaffToken } = require('../lib/staffSession');
const { getPermissions } = require('../lib/permissions');

function createTenantsRouter(logger) {
    const router = express.Router();

    router.get('/tenants/check-slug', async (req, res) => {
        if (!isSelfServeEnabled(process.env, requestHostname(req))) {
            return res.status(404).json({ error: 'not_found' });
        }
        const slug = normalizeSlug(req.query && req.query.slug);
        const invalid = slugError(slug);
        if (invalid) return res.json({ ok: false, available: false, error: invalid });
        const taken = await Tenant.findOne({ where: { slug }, attributes: ['id'] });
        if (taken) return res.json({ ok: false, available: false, error: 'این شناسه قبلاً گرفته شده است' });
        const base = tenantBaseHost();
        return res.json({
            ok: true,
            available: true,
            slug,
            host: slug + '.' + base,
            loginUrl: tenantLoginUrl(slug, process.env, 'https'),
        });
    });

    router.post('/tenants/signup', async (req, res) => {
        if (!isSelfServeEnabled(process.env, requestHostname(req))) {
            return res.status(404).json({ error: 'ثبت‌نام عمومی در این پنل فعال نیست' });
        }
        try {
            const body = req.body || {};
            const result = await provisionSelfServeTenant(body, process.env);
            let session = null;
            try {
                const ownerId = result.owner && result.owner.id;
                const owner =
                    (ownerId && (await User.findByPk(ownerId, { skipTenantScope: true }))) ||
                    (await User.findOne({
                        where: { email: String((result.owner && result.owner.email) || body.email || '')
                            .trim()
                            .toLowerCase() },
                        skipTenantScope: true,
                    }));
                if (owner && owner.isActive) {
                    const token = issueStaffToken(owner);
                    setAuthCookie(res, token);
                    session = {
                        user: {
                            id: owner.id,
                            email: owner.email,
                            name: owner.name,
                            role: owner.role,
                            permissions: getPermissions(owner),
                        },
                    };
                }
            } catch (sessErr) {
                if (logger && logger.warn) {
                    logger.warn('Tenant signup session skipped', { error: sessErr.message });
                }
            }
            const { owner, ...publicResult } = result;
            return res.status(201).json({
                ok: true,
                ...publicResult,
                owner: owner ? { email: owner.email, name: owner.name } : undefined,
                session,
            });
        } catch (err) {
            const status = err && err.status ? err.status : 500;
            if (status >= 500 && logger && logger.warn) {
                logger.warn('Tenant signup failed', { error: err.message, code: err.code });
            }
            return res.status(status).json({ error: err.message || 'ثبت‌نام ناموفق بود', code: err.code || null });
        }
    });

    router.get('/tenants/me', authMiddleware, async (req, res) => {
        try {
            const tenant = req.tenant;
            if (!tenant || tenant.isPlatform || !tenant.id) {
                return res.json({ ok: true, tenant: null, platform: true });
            }
            const row = await Tenant.findByPk(tenant.id, {
                attributes: ['id', 'slug', 'name', 'status', 'planTier', 'trialEndsAt', 'customDomain', 'panelKey'],
            });
            const shaped = row
                ? {
                    id: row.id,
                    slug: row.slug,
                    name: row.name,
                    status: row.status,
                    planTier: row.planTier,
                    trialEndsAt: row.trialEndsAt,
                    customDomain: row.customDomain,
                    panelKey: row.panelKey,
                    isPlatform: false,
                }
                : tenant;
            const payload = publicTenantPayload(shaped);
            return res.json({
                ok: true,
                tenant: payload,
                host: payload && payload.slug ? payload.slug + '.' + tenantBaseHost() : tenantBaseHost(),
            });
        } catch (err) {
            const status = err && err.status ? err.status : 500;
            return res.status(status).json({ error: err.message || 'خواندن پنل ناموفق بود' });
        }
    });

    router.post('/tenants/custom-domain', authMiddleware, async (req, res) => {
        try {
            const tenant = req.tenant;
            if (!tenant || tenant.isPlatform || !tenant.id) {
                return res.status(400).json({ error: 'دامنهٔ اختصاصی فقط برای پنل خودخدمت است' });
            }
            if (!req.user || (req.user.role !== 'owner' && req.user.role !== 'admin')) {
                return res.status(403).json({ error: 'فقط مالک پنل می‌تواند دامنه وصل کند' });
            }
            const domain = req.body && (req.body.domain || req.body.customDomain);
            const result = await setTenantCustomDomain(tenant.id, domain);
            return res.json({
                ok: true,
                ...result,
                dns: {
                    type: 'CNAME',
                    host: result.customDomain,
                    target: tenant.slug + '.' + tenantBaseHost(),
                    note: 'پس از ست شدن DNS، گواهی HTTPS روی سرور باید برای این دامنه صادر شود.',
                },
            });
        } catch (err) {
            const status = err && err.status ? err.status : 500;
            return res.status(status).json({ error: err.message || 'ثبت دامنه ناموفق بود' });
        }
    });

    return router;
}

module.exports = { createTenantsRouter };

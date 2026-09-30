/**
 * Kaya CRM — ثبت‌نام خودخدمت و دامنهٔ اختصاصی
 * @file    backend/routes/tenants.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const express = require('express');
const { Op } = require('sequelize');
const { authMiddleware } = require('../middleware/auth');
const { isPlatformTenant } = require('../lib/tenantContext');
const {
    PLATFORM_SLUG,
    isSelfServeEnabled,
    requestHostname,
    normalizeSlug,
    slugError,
    tenantBaseHost,
    tenantLoginUrl,
} = require('../lib/tenantHost');
const {
    provisionSelfServeTenant,
    setTenantCustomDomain,
    updateTenantSkills,
} = require('../services/tenantProvision');
const {
    normalizeIndustry,
    parseSkillsColumn,
    LEGACY_SKILLS,
    publicCatalog,
} = require('../lib/tenantSkills');
const { invalidatePlanCache } = require('../lib/planLimits');
const { publicTenantPayload, tenantAccessState } = require('../lib/tenantTrial');
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
                const sameTenant = owner && String(owner.tenantId || '') === String(result.tenantId || '');
                if (owner && owner.isActive && sameTenant) {
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
                attributes: [
                    'id',
                    'slug',
                    'name',
                    'status',
                    'planTier',
                    'trialEndsAt',
                    'customDomain',
                    'panelKey',
                    'industry',
                    'enabledSkills',
                    'gatewayEnabled',
                ],
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
                    industry: normalizeIndustry(row.industry),
                    enabledSkills: parseSkillsColumn(row.enabledSkills),
                    gatewayEnabled: row.gatewayEnabled === true,
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

    router.get('/tenants/catalog', (req, res) => {
        res.set('Cache-Control', 'public, max-age=300');
        return res.json({ ok: true, ...publicCatalog() });
    });

    router.get('/tenants/skills', authMiddleware, async (req, res) => {
        try {
            const tenant = req.tenant;
            if (!tenant || tenant.isPlatform || !tenant.id) {
                return res.json({ ok: true, platform: true, ...publicCatalog() });
            }
            const row = await Tenant.findByPk(tenant.id, { attributes: ['id', 'industry', 'enabledSkills'] });
            const industry = row ? normalizeIndustry(row.industry) : null;
            const stored = row ? parseSkillsColumn(row.enabledSkills) : null;
            return res.json({
                ok: true,
                platform: false,
                industry,
                enabledSkills: stored || LEGACY_SKILLS.slice(),
                ...publicCatalog(),
            });
        } catch (err) {
            const status = err && err.status ? err.status : 500;
            return res.status(status).json({ error: err.message || 'خواندن اسکیل‌ها ناموفق بود' });
        }
    });

    router.put('/tenants/skills', authMiddleware, async (req, res) => {
        try {
            const tenant = req.tenant;
            if (!tenant || tenant.isPlatform || !tenant.id) {
                return res.status(400).json({ error: 'مدیریت اسکیل‌ها فقط برای پنل خودخدمت است' });
            }
            if (!req.user || (req.user.role !== 'owner' && req.user.role !== 'admin')) {
                return res.status(403).json({ error: 'فقط مالک پنل می‌تواند اسکیل‌ها را تغییر دهد' });
            }
            const body = req.body || {};
            const result = await updateTenantSkills(tenant.id, {
                industry: body.industry,
                enabledSkills: body.enabledSkills,
            });
            invalidatePlanCache();
            return res.json({ ok: true, ...result });
        } catch (err) {
            const status = err && err.status ? err.status : 500;
            return res.status(status).json({ error: err.message || 'ذخیره اسکیل‌ها ناموفق بود' });
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

    /** فقط مدیر پنل سکو روی سروری که ثبت‌نام خودخدمت دارد (app) — نه پنل مشتری، نه kaya. */
    function requirePlatformAdmin(req, res, next) {
        if (!isSelfServeEnabled(process.env, requestHostname(req)) || !isPlatformTenant(req.tenant)) {
            return res.status(404).json({ error: 'not_found' });
        }
        if (!req.user || (req.user.role !== 'owner' && req.user.role !== 'admin')) {
            return res.status(403).json({ error: 'فقط مدیر سکو' });
        }
        next();
    }

    function sendAdminError(res, err, fallback) {
        const status = err && err.status ? err.status : 500;
        if (status >= 500 && logger && logger.warn) logger.warn(fallback, { error: err && err.message });
        return res.status(status).json({ error: (err && err.message) || fallback, code: (err && err.code) || null });
    }

    router.get('/tenants/admin/list', authMiddleware, requirePlatformAdmin, async (req, res) => {
        try {
            const { probeTenantGateway } = require('../services/tenantGatewaySupervisor');
            const rows = await Tenant.findAll({
                where: { slug: { [Op.ne]: PLATFORM_SLUG } },
                order: [['createdAt', 'DESC']],
            });
            const owners = await User.findAll({
                where: { tenantId: rows.map((r) => r.id), role: 'owner' },
                attributes: ['tenantId', 'email'],
                skipTenantScope: true,
            });
            const ownerEmail = new Map(owners.map((u) => [String(u.tenantId), u.email]));
            const tenants = await Promise.all(rows.map(async (row) => ({
                id: row.id,
                slug: row.slug,
                name: row.name,
                industry: normalizeIndustry(row.industry),
                status: row.status,
                planTier: row.planTier,
                trialEndsAt: row.trialEndsAt,
                createdAt: row.createdAt,
                access: tenantAccessState(row).code || 'ok',
                payment: {
                    status: row.cryptoPaymentStatus || null,
                    network: row.cryptoNetwork || null,
                    txId: row.cryptoTxId || null,
                    paidAt: row.cryptoPaidAt || null,
                },
                ownerEmail: ownerEmail.get(String(row.id)) || null,
                loginUrl: tenantLoginUrl(row.slug, process.env, process.env.SELF_SERVE_PUBLIC_PROTO),
                gatewayEnabled: row.gatewayEnabled === true,
                gatewayPort: row.gatewayPort || null,
                gateway: row.gatewayEnabled && row.gatewayPort ? await probeTenantGateway(row, 1500) : null,
            })));
            return res.json({ ok: true, tenants });
        } catch (err) {
            return sendAdminError(res, err, 'خواندن سازمان‌ها ناموفق بود');
        }
    });

    router.post('/tenants/admin/:id/gateway', authMiddleware, requirePlatformAdmin, async (req, res) => {
        try {
            const { enableTenantGateway, disableTenantGateway } = require('../services/tenantGatewaySupervisor');
            const enabled = !!(req.body && req.body.enabled === true);
            const result = enabled
                ? await enableTenantGateway(req.params.id, logger)
                : await disableTenantGateway(req.params.id, logger);
            if (logger && logger.info) {
                logger.info('Tenant gateway toggled by platform admin', {
                    tenantId: req.params.id,
                    enabled,
                    by: req.user && req.user.email,
                });
            }
            return res.json({ ok: true, ...result });
        } catch (err) {
            return sendAdminError(res, err, 'تغییر Gateway ناموفق بود');
        }
    });

    /** رمز موقت برای مالک سازمان (پشتیبانی)؛ نشست‌های قبلی او باطل می‌شود و رمز فقط همین یک بار نمایش داده می‌شود. */
    router.post('/tenants/admin/:id/owner-password', authMiddleware, requirePlatformAdmin, async (req, res) => {
        try {
            const tenant = await Tenant.findByPk(req.params.id);
            if (!tenant || tenant.slug === PLATFORM_SLUG) return res.status(404).json({ error: 'سازمان پیدا نشد' });
            const owner = await User.findOne({
                where: { tenantId: tenant.id, role: 'owner' },
                order: [['createdAt', 'ASC']],
                skipTenantScope: true,
            });
            if (!owner) return res.status(404).json({ error: 'مالک این سازمان پیدا نشد' });
            const password = 'Fx' + require('crypto').randomBytes(9).toString('base64url') + '7';
            owner.password = password;
            owner.isActive = true;
            await owner.save();
            await require('../lib/staffSession').revokeStaffSessions(owner, null);
            if (logger && logger.info) {
                logger.info('Tenant owner password reset by platform admin', {
                    tenantId: tenant.id,
                    owner: owner.email,
                    by: req.user && req.user.email,
                });
            }
            return res.json({
                ok: true,
                email: owner.email,
                password,
                loginUrl: tenantLoginUrl(tenant.slug, process.env, process.env.SELF_SERVE_PUBLIC_PROTO),
            });
        } catch (err) {
            return sendAdminError(res, err, 'بازنشانی رمز مالک ناموفق بود');
        }
    });

    router.post('/tenants/admin/:id/gateway/restart', authMiddleware, requirePlatformAdmin, async (req, res) => {
        try {
            const { restartTenantGateway } = require('../services/tenantGatewaySupervisor');
            return res.json({ ok: true, ...(await restartTenantGateway(req.params.id, logger)) });
        } catch (err) {
            return sendAdminError(res, err, 'راه‌اندازی مجدد Gateway ناموفق بود');
        }
    });

    return router;
}

module.exports = { createTenantsRouter };

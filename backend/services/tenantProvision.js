/**
 * Kaya CRM — ساخت سازمان خودخدمت + مالک + تنظیمات پنل
 * @file    backend/services/tenantProvision.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const { Op } = require('sequelize');
const models = require('../models');
const { runWithTenant } = require('../lib/tenantContext');
const {
    normalizeSlug,
    slugError,
    panelKeyForSlug,
    tenantLoginUrl,
    trialDays,
} = require('../lib/tenantHost');
const { trialEndsAtFromNow } = require('../lib/tenantTrial');
const { DEFAULT_DEPARTMENTS } = require('./config/defaultDepartments');
const { invalidatePlanCache } = require('../lib/planLimits');

async function provisionSelfServeTenant(input, env) {
    const src = env || process.env;
    const slug = normalizeSlug(input && input.slug);
    const err = slugError(slug);
    if (err) {
        const e = new Error(err);
        e.code = 'SLUG_INVALID';
        e.status = 400;
        throw e;
    }

    const email = String((input && input.email) || '')
        .trim()
        .toLowerCase();
    if (!email || email.indexOf('@') < 1) {
        const e = new Error('ایمیل معتبر وارد کنید');
        e.code = 'EMAIL_INVALID';
        e.status = 400;
        throw e;
    }

    const password = String((input && input.password) || '');
    const { validatePassword } = require('../lib/passwordValidation');
    const pw = validatePassword(password);
    if (!pw.valid) {
        const e = new Error(pw.message);
        e.code = 'PASSWORD_INVALID';
        e.status = 400;
        throw e;
    }

    const companyName = String((input && (input.companyName || input.name)) || slug)
        .trim()
        .slice(0, 120) || slug;
    const ownerName = String((input && input.ownerName) || email.split('@')[0])
        .trim()
        .slice(0, 120) || email.split('@')[0];

    const { Tenant, User, PanelSetting, WhatsappConnection, WhatsappConfig, Branch, Department, sequelize } =
        models;

    const taken = await Tenant.findOne({ where: { slug } });
    if (taken) {
        const e = new Error('این شناسه قبلاً گرفته شده است');
        e.code = 'SLUG_TAKEN';
        e.status = 409;
        throw e;
    }

    const emailTaken = await User.findOne({
        where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), email),
        skipTenantScope: true,
    });
    if (emailTaken) {
        const e = new Error('این ایمیل قبلاً ثبت شده است');
        e.code = 'EMAIL_TAKEN';
        e.status = 409;
        throw e;
    }

    const panelKey = panelKeyForSlug(slug);
    const days = trialDays(src);
    const trialEndsAt = trialEndsAtFromNow(days);

    const tenant = await Tenant.create({
        slug,
        name: companyName,
        status: 'trial',
        planTier: 'start',
        trialEndsAt,
        panelKey,
        customDomain: null,
    });

    const shaped = {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        status: tenant.status,
        planTier: tenant.planTier,
        trialEndsAt: tenant.trialEndsAt,
        panelKey: tenant.panelKey,
        customDomain: null,
        isPlatform: false,
    };

    let ownerUser = null;
    await runWithTenant(shaped, async () => {
        await PanelSetting.create({
            id: panelKey,
            siteName: companyName,
            loginTitle: companyName,
            pageTitle: companyName,
            footerText: companyName,
            showFooter: true,
            planTier: 'start',
            languageMode: 'trilingual',
            defaultLanguage: 'fa',
        });

        await WhatsappConnection.create({
            id: panelKey,
            connectionMode: 'cloud',
            cloudEnabled: true,
            gatewayEnabled: false,
        });

        try {
            await WhatsappConfig.create({ id: panelKey });
        } catch (_) {}

        const branch = await Branch.create({
            name: companyName,
            city: '',
            country: '',
            isActive: true,
        });

        let defaultDeptId = null;
        for (const dept of DEFAULT_DEPARTMENTS) {
            const row = await Department.create({
                name: dept.name,
                description: dept.description,
                keywords: dept.keywords,
                color: dept.color,
                isDefault: !!dept.isDefault,
                isActive: true,
                branchId: branch.id,
            });
            if (dept.isDefault) defaultDeptId = row.id;
        }

        const owner = await User.create({
            name: ownerName,
            username: null,
            email,
            password,
            role: 'owner',
            branchId: branch.id,
            departmentId: defaultDeptId,
            isActive: true,
            tenantId: tenant.id,
        });
        ownerUser = owner;
    });

    invalidatePlanCache();

    const proto = String(src.SELF_SERVE_PUBLIC_PROTO || 'https').toLowerCase() === 'http' ? 'http' : 'https';
    const loginUrl = tenantLoginUrl(slug, src, proto);
    const base = String(loginUrl).replace(/\/login(\?.*)?$/, '');
    return {
        tenantId: tenant.id,
        slug,
        name: companyName,
        status: 'trial',
        trialEndsAt,
        trialDays: days,
        loginUrl,
        dashboardUrl: base + '/dashboard',
        panelKey,
        owner: ownerUser
            ? { id: ownerUser.id, email: ownerUser.email, name: ownerUser.name, role: ownerUser.role }
            : { email, name: ownerName, role: 'owner' },
    };
}

async function activateTenantFromPaid(paid, logger) {
    const { Tenant } = models;
    const tenantId = paid && paid.tenantId ? String(paid.tenantId).trim() : '';
    let row = null;
    if (tenantId) {
        row = await Tenant.findByPk(tenantId);
    }
    if (!row && paid && paid.email) {
        const { User } = models;
        const owner = await User.findOne({
            where: { email: String(paid.email).trim().toLowerCase() },
            skipTenantScope: true,
        });
        if (owner && owner.tenantId) {
            row = await Tenant.findByPk(owner.tenantId);
        }
    }
    if (!row) return { activated: false };
    const updates = { status: 'active' };
    if (paid && paid.sessionId) updates.stripeSubscriptionId = String(paid.sessionId).slice(0, 64);
    if (paid && paid.cryptoTxId) {
        updates.cryptoTxId = String(paid.cryptoTxId).slice(0, 128);
        updates.cryptoNetwork = paid.cryptoNetwork ? String(paid.cryptoNetwork).slice(0, 32) : null;
        updates.cryptoPaymentStatus = 'confirmed';
        updates.cryptoPaidAt = paid.cryptoPaidAt || new Date();
    }
    await row.update(updates);
    if (logger && logger.info) {
        logger.info('Self-serve tenant activated', {
            slug: row.slug,
            tenantId: row.id,
            via: paid && paid.cryptoTxId ? 'crypto' : 'stripe',
        });
    }
    return { activated: true, tenantId: row.id, slug: row.slug };
}

async function setTenantCustomDomain(tenantId, domainRaw) {
    const host = String(domainRaw || '')
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .replace(/:\d+$/, '');
    if (!host || host.length < 4 || host.indexOf('.') < 1) {
        const e = new Error('دامنه نامعتبر است');
        e.status = 400;
        throw e;
    }
    if (!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(host)) {
        const e = new Error('دامنه نامعتبر است');
        e.status = 400;
        throw e;
    }
    const { Tenant } = models;
    const clash = await Tenant.findOne({
        where: { customDomain: host, id: { [Op.ne]: tenantId } },
    });
    if (clash) {
        const e = new Error('این دامنه قبلاً ثبت شده است');
        e.status = 409;
        throw e;
    }
    const row = await Tenant.findByPk(tenantId);
    if (!row) {
        const e = new Error('سازمان یافت نشد');
        e.status = 404;
        throw e;
    }
    await row.update({ customDomain: host });
    return { customDomain: host };
}

module.exports = {
    provisionSelfServeTenant,
    activateTenantFromPaid,
    setTenantCustomDomain,
};

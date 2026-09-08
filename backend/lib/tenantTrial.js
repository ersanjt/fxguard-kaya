/**
 * Kaya CRM — وضعیت آزمایش ۷روزه و قفل پس از انقضا
 * @file    backend/lib/tenantTrial.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const { isPlatformTenant } = require('./tenantContext');

function trialEndsAtFromNow(days, now) {
    const d = Number(days) || 7;
    const t = now instanceof Date ? now.getTime() : Date.now();
    return new Date(t + d * 24 * 60 * 60 * 1000);
}

function tenantAccessState(tenant, now) {
    if (!tenant || isPlatformTenant(tenant)) {
        return { ok: true, code: null, status: tenant && tenant.status ? tenant.status : 'active' };
    }
    const status = String(tenant.status || 'trial').toLowerCase();
    if (status === 'suspended') {
        return { ok: false, code: 'TENANT_SUSPENDED', status };
    }
    if (status === 'active') {
        return { ok: true, code: null, status };
    }
    if (status === 'past_due') {
        return { ok: false, code: 'PAYMENT_REQUIRED', status };
    }
    const ends = tenant.trialEndsAt ? new Date(tenant.trialEndsAt).getTime() : 0;
    const t = now instanceof Date ? now.getTime() : Date.now();
    if (status === 'trial' && ends && t > ends) {
        return { ok: false, code: 'TRIAL_EXPIRED', status: 'trial' };
    }
    if (status === 'trial') {
        return { ok: true, code: null, status };
    }
    return { ok: false, code: 'PAYMENT_REQUIRED', status };
}

function isTrialGateExemptPath(method, path) {
    const p = String(path || '').split('?')[0];
    const m = String(method || 'GET').toUpperCase();
    if (p === '/api/ping' || p === '/health') return true;
    if (p === '/api/config') return true;
    if (p.indexOf('/api/panel-settings/public/') === 0) return true;
    if (p.indexOf('/api/billing/') === 0) return true;
    if (p.indexOf('/api/webhook/') === 0) return true;
    if (p.indexOf('/api/tenants/signup') === 0) return true;
    if (p.indexOf('/api/tenants/check-slug') === 0) return true;
    if (m === 'GET' && (p === '/api/tenants/me' || p.indexOf('/api/tenants/me?') === 0)) return true;
    if (p.indexOf('/api/auth/') === 0) return true;
    if (m === 'OPTIONS') return true;
    return false;
}

function trialErrorPayload(state) {
    const code = (state && state.code) || 'PAYMENT_REQUIRED';
    const messages = {
        TRIAL_EXPIRED: 'دورهٔ آزمایش ۷روزه تمام شده است. برای ادامه اشتراک را فعال کنید.',
        PAYMENT_REQUIRED: 'برای ادامه باید اشتراک را پرداخت کنید.',
        TENANT_SUSPENDED: 'این پنل تعلیق شده است. با پشتیبانی تماس بگیرید.',
    };
    return {
        error: messages[code] || messages.PAYMENT_REQUIRED,
        code,
        checkoutPath: '/api/billing/checkout',
    };
}

function remainingTrialDays(tenant, now) {
    if (!tenant || !tenant.trialEndsAt) return null;
    const t = now instanceof Date ? now.getTime() : Date.now();
    const ends = new Date(tenant.trialEndsAt).getTime();
    if (!Number.isFinite(ends)) return null;
    return Math.max(0, Math.ceil((ends - t) / (24 * 60 * 60 * 1000)));
}

function publicTenantPayload(tenant, now) {
    if (!tenant || tenant.isPlatform || tenant.missing || !tenant.id) return null;
    const state = tenantAccessState(tenant, now);
    return {
        slug: tenant.slug,
        name: tenant.name || tenant.slug,
        status: tenant.status,
        planTier: tenant.planTier || 'start',
        trialEndsAt: tenant.trialEndsAt || null,
        customDomain: tenant.customDomain || null,
        remainingDays: remainingTrialDays(tenant, now),
        locked: !state.ok,
        lockCode: state.code,
        panelHost: tenant.host || null,
    };
}

module.exports = {
    trialEndsAtFromNow,
    tenantAccessState,
    isTrialGateExemptPath,
    trialErrorPayload,
    remainingTrialDays,
    publicTenantPayload,
};

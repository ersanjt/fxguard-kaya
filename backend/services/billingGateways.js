/**
 * FXGuard — اعمال پرداخت درگاه‌ها روی سازمان (iyzico / Paddle)
 * @file    backend/services/billingGateways.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 *
 * ثبت در دفتر BillingPayment و تغییر وضعیت سازمان در یک تراکنش DB انجام می‌شود؛
 * اگر ثبت دفتر به خاطر تکراری بودن شکست بخورد، سازمان دوباره تمدید نمی‌شود.
 */
'use strict';

const DAY_MS = 24 * 60 * 60 * 1000;

function isUniqueViolation(err) {
    if (!err) return false;
    return err.name === 'SequelizeUniqueConstraintError' || !!(err.parent && err.parent.code === '23505');
}

async function findTenantForPayment(Tenant, ref, transaction) {
    const opts = transaction ? { transaction, lock: transaction.LOCK.UPDATE } : {};
    if (ref.tenantId) {
        const row = await Tenant.findByPk(ref.tenantId, opts);
        if (row) return row;
    }
    if (ref.subscriptionId) {
        return Tenant.findOne(Object.assign({ where: { billingSubscriptionId: ref.subscriptionId } }, opts));
    }
    return null;
}

/** پایان دورهٔ جدید: از پایان دورهٔ فعلی (اگر هنوز نگذشته) یا از الان */
function extendPaidUntil(currentPaidUntil, periodDays, now) {
    const t = now instanceof Date ? now.getTime() : Date.now();
    const cur = currentPaidUntil ? new Date(currentPaidUntil).getTime() : 0;
    const base = Number.isFinite(cur) && cur > t ? cur : t;
    return new Date(base + Math.max(1, Number(periodDays) || 30) * DAY_MS);
}

/**
 * @param {object} paid provider, paymentId, tenantId?, subscriptionId?, customerId?, amountMinor, currency,
 *                      periodDays? (iyzico), periodEnd? (paddle), consentVersion?, consentAt?, occurredAt?
 * @param {object} [logger]
 * @param {{ now?: Date, models?: object }} [opts]
 * @returns {Promise<{ ok: boolean, duplicate?: boolean, activated?: boolean, tenantId?: string, slug?: string, reason?: string }>}
 */
async function recordGatewayPayment(paid, logger, opts) {
    const o = opts || {};
    const { Tenant, BillingPayment, sequelize } = o.models || require('../models');
    const at = o.now instanceof Date ? o.now : new Date();
    try {
        return await sequelize.transaction(async (transaction) => {
            const tenant = await findTenantForPayment(Tenant, paid, transaction);
            await BillingPayment.create(
                {
                    tenantId: tenant ? tenant.id : null,
                    provider: paid.provider,
                    providerPaymentId: paid.paymentId,
                    subscriptionId: paid.subscriptionId || null,
                    customerId: paid.customerId || null,
                    amountMinor: paid.amountMinor,
                    currency: paid.currency,
                    periodEnd: paid.periodEnd || null,
                    consentVersion: paid.consentVersion || null,
                    consentAt: paid.consentAt || null,
                },
                { transaction }
            );
            if (!tenant) return { ok: true, activated: false, reason: 'tenant_not_found' };

            const updates = { billingProvider: paid.provider };
            if (paid.customerId) updates.billingCustomerId = paid.customerId;
            if (paid.provider === 'iyzico') {
                const paidUntil = extendPaidUntil(tenant.billingPaidUntil, paid.periodDays, at);
                updates.billingPaidUntil = paidUntil;
                updates.status = 'active';
                await BillingPayment.update(
                    { periodEnd: paidUntil },
                    { where: { provider: paid.provider, providerPaymentId: paid.paymentId }, transaction }
                );
            } else {
                // اشتراک خودکار: پایان دوره را webhookهای Paddle مدیریت می‌کنند
                updates.billingPaidUntil = null;
                if (paid.subscriptionId) updates.billingSubscriptionId = paid.subscriptionId;
                const occurred = paid.occurredAt instanceof Date ? paid.occurredAt : at;
                const last = tenant.billingEventAt ? new Date(tenant.billingEventAt).getTime() : 0;
                if (!last || occurred.getTime() >= last) {
                    updates.status = 'active';
                    updates.billingEventAt = occurred;
                }
            }
            await tenant.update(updates, { transaction });
            return { ok: true, activated: updates.status === 'active', tenantId: tenant.id, slug: tenant.slug };
        });
    } catch (err) {
        if (isUniqueViolation(err)) return { ok: true, duplicate: true };
        if (logger && logger.error) {
            logger.error('Gateway payment record failed', {
                provider: paid && paid.provider,
                error: err && err.message,
            });
        }
        throw err;
    }
}

/**
 * وضعیت اشتراک Paddle (past_due / canceled / active ...) — رویداد قدیمی‌تر یا اشتراک دیگر نادیده گرفته می‌شود.
 */
async function applySubscriptionStatus(evt, logger, opts) {
    const { Tenant, sequelize } = (opts && opts.models) || require('../models');
    return sequelize.transaction(async (transaction) => {
        const tenant = await findTenantForPayment(Tenant, evt, transaction);
        if (!tenant) return { applied: false, reason: 'tenant_not_found' };
        if (tenant.billingSubscriptionId && tenant.billingSubscriptionId !== evt.subscriptionId) {
            return { applied: false, reason: 'other_subscription' };
        }
        const last = tenant.billingEventAt ? new Date(tenant.billingEventAt).getTime() : 0;
        if (last && evt.occurredAt.getTime() < last) return { applied: false, reason: 'stale_event' };
        const updates = {
            status: evt.tenantStatus,
            billingProvider: evt.provider,
            billingSubscriptionId: evt.subscriptionId,
            billingEventAt: evt.occurredAt,
            billingPaidUntil: null,
        };
        if (evt.customerId) updates.billingCustomerId = evt.customerId;
        await tenant.update(updates, { transaction });
        if (logger && logger.info) {
            logger.info('Tenant subscription status updated', {
                tenantId: tenant.id,
                slug: tenant.slug,
                provider: evt.provider,
                status: evt.tenantStatus,
            });
        }
        return { applied: true, tenantId: tenant.id, slug: tenant.slug };
    });
}

module.exports = {
    isUniqueViolation,
    extendPaidUntil,
    recordGatewayPayment,
    applySubscriptionStatus,
};

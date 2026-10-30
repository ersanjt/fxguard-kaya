/**
 * Kaya CRM — تعیین سازمان برای پیام ورودی واتساپ (قبل از persist)
 * @file    backend/lib/inboundTenant.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 *
 * یک پروسهٔ Gateway = یک نشست واتساپ = یک سازمان. Gateway سازمانش را با
 * هدر `x-tenant-slug` (HTTP) یا فیلد `tenantSlug` (RabbitMQ) اعلام می‌کند؛
 * fallback: WHATSAPP_GATEWAY_TENANT_SLUG در env بک‌اند، سپس سازمانِ Host درخواست، سپس سکو.
 * slug ناشناخته رد می‌شود تا پیام هرگز در سازمان اشتباه ذخیره نشود.
 */
'use strict';

const { PLATFORM_SLUG, normalizeSlug } = require('./tenantHost');
const { runWithTenant } = require('./tenantContext');

const TENANT_SLUG_HEADER = 'x-tenant-slug';

function pickHeaderSlug(headers) {
    if (!headers) return '';
    const raw = headers[TENANT_SLUG_HEADER];
    if (Array.isArray(raw)) return String(raw[0] || '');
    return raw == null ? '' : String(raw);
}

/**
 * @param {object} opts
 * @param {string} [opts.headerSlug]  مقدار هدر x-tenant-slug
 * @param {string} [opts.payloadSlug] فیلد tenantSlug داخل پیام (صف)
 * @param {object} [opts.reqTenant]   req.tenant که middleware از Host ساخته
 * @returns {Promise<{ok:true,tenant:object}|{ok:false,error:string,slug:string}>}
 */
async function findTenantByCloudPhoneNumberId(phoneNumberId) {
    const id = String(phoneNumberId || '').trim();
    if (!id) return null;
    const { WhatsappNumber, WhatsappConnection, Tenant } = require('../models');
    const { tenantShape } = require('../middleware/tenantContext');
    const num = await WhatsappNumber.findOne({
        where: { cloudPhoneNumberId: id },
        skipTenantScope: true,
    });
    let tenantId = num && num.tenantId;
    if (!tenantId) {
        const conn = await WhatsappConnection.findOne({
            where: { cloudPhoneNumberId: id },
            skipTenantScope: true,
        });
        tenantId = conn && conn.tenantId;
    }
    if (!tenantId) return null;
    const row = await Tenant.findByPk(tenantId);
    return row ? tenantShape(row) : null;
}

async function resolveInboundTenant(opts = {}) {
    if (opts.phoneNumberId) {
        const mapped = await findTenantByCloudPhoneNumberId(opts.phoneNumberId);
        if (mapped) return { ok: true, tenant: mapped };
        const { Tenant } = require('../models');
        const many = (await Tenant.count()) > 1;
        if (many) {
            return { ok: false, error: 'unknown_phone_number', slug: String(opts.phoneNumberId) };
        }
    }
    const explicit = normalizeSlug(
        opts.headerSlug || opts.payloadSlug || process.env.WHATSAPP_GATEWAY_TENANT_SLUG || ''
    );
    const { loadPlatformTenant, tenantShape } = require('../middleware/tenantContext');

    if (explicit && explicit !== PLATFORM_SLUG) {
        const { Tenant } = require('../models');
        const row = await Tenant.findOne({ where: { slug: explicit } });
        if (!row) return { ok: false, error: 'unknown_tenant', slug: explicit };
        return { ok: true, tenant: tenantShape(row) };
    }

    const fromHost = opts.reqTenant;
    if (fromHost && fromHost.id && !fromHost.isPlatform && !fromHost.missing) {
        return { ok: true, tenant: fromHost };
    }

    return { ok: true, tenant: await loadPlatformTenant() };
}

/** اجرای پردازش پیام ورودی داخل زمینهٔ سازمان (stampTenantId + tenant scope فعال می‌شوند) */
function runInboundWithTenant(tenant, fn) {
    return runWithTenant(tenant, fn);
}

module.exports = {
    TENANT_SLUG_HEADER,
    pickHeaderSlug,
    findTenantByCloudPhoneNumberId,
    resolveInboundTenant,
    runInboundWithTenant,
};

/**
 * Kaya CRM — Gateway اختصاصی هر سازمان (اتصال QR)
 * @file    backend/lib/tenantGateway.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 *
 * آدرس و secretهای Gateway سازمان را فقط سرور تعیین می‌کند (نه تنظیمات پنل)،
 * تا سازمان نتواند سرور را به آدرس دلخواه یا Gateway سازمان دیگر وصل کند.
 */
'use strict';

const crypto = require('crypto');
const { isPlatformTenant } = require('./tenantContext');

const GATEWAY_TENANT_HEADER = 'x-gateway-tenant';

function secretRoot() {
    return String(process.env.TENANT_GATEWAY_SECRET || process.env.JWT_SECRET || '').trim();
}

function derive(label, tenantId) {
    const root = secretRoot();
    if (!root || !tenantId) return '';
    return crypto.createHmac('sha256', root).update(label + ':' + String(tenantId)).digest('hex');
}

/** secret فراخوانی Backend → Gateway سازمان */
function tenantGatewayApiSecret(tenantId) {
    return derive('gateway-api', tenantId);
}

/** secret وب‌هوک Gateway سازمان → Backend */
function tenantWebhookSecret(tenantId) {
    return derive('gateway-webhook', tenantId);
}

function tenantGatewayHost() {
    return String(process.env.TENANT_GATEWAY_HOST || '127.0.0.1').trim() || '127.0.0.1';
}

function tenantGatewayUrl(port) {
    const n = Number(port);
    if (!Number.isInteger(n) || n <= 0) return '';
    return 'http://' + tenantGatewayHost() + ':' + n;
}

/** سکو Gateway خودش را از .env دارد؛ سازمان فقط وقتی مدیر سکو روشن کرده باشد. */
function isTenantGatewayAllowed(tenant) {
    if (isPlatformTenant(tenant)) return true;
    return !!(tenant && tenant.id && tenant.gatewayEnabled === true && tenant.gatewayPort);
}

function isSelfServeTenant(tenant) {
    return !!(tenant && tenant.id && !isPlatformTenant(tenant));
}

module.exports = {
    GATEWAY_TENANT_HEADER,
    tenantGatewayApiSecret,
    tenantWebhookSecret,
    tenantGatewayUrl,
    isTenantGatewayAllowed,
    isSelfServeTenant,
};

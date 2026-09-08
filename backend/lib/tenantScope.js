/**
 * Kaya CRM — هوک Sequelize برای جداسازی دادهٔ سازمان
 * @file    backend/lib/tenantScope.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const { getCurrentTenantId, getCachedPlatformTenant } = require('./tenantContext');

function stampTenantId(instance) {
    if (!instance || instance.tenantId) return;
    const tid = getCurrentTenantId() || (getCachedPlatformTenant() && getCachedPlatformTenant().id);
    if (tid) instance.tenantId = tid;
}

function applyTenantScope(model) {
    if (!model || typeof model.addHook !== 'function') return model;

    model.addHook('beforeFind', (options) => {
        if (!options || options.skipTenantScope) return;
        const tid = getCurrentTenantId();
        if (!tid) return;
        options.where = options.where || {};
        if (options.where.tenantId === undefined) {
            options.where.tenantId = tid;
        }
    });

    model.addHook('beforeCreate', (instance) => {
        stampTenantId(instance);
    });

    model.addHook('beforeBulkCreate', (instances) => {
        if (!Array.isArray(instances)) return;
        instances.forEach(stampTenantId);
    });

    return model;
}

const TENANT_SCOPED_MODELS = [
    'User',
    'Customer',
    'Conversation',
    'Message',
    'Ticket',
    'Task',
    'Branch',
    'Department',
];

function applyTenantScopeToModels(models) {
    TENANT_SCOPED_MODELS.forEach((name) => {
        if (models[name]) applyTenantScope(models[name]);
    });
}

module.exports = {
    stampTenantId,
    applyTenantScope,
    applyTenantScopeToModels,
    TENANT_SCOPED_MODELS,
};

/**
 * Kaya CRM — هوک Sequelize برای جداسازی دادهٔ سازمان
 * @file    backend/lib/tenantScope.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const { Op } = require('sequelize');
const { getCurrentTenantId, getCachedPlatformTenant } = require('./tenantContext');

function stampTenantId(instance) {
    if (!instance || instance.tenantId) return;
    const tid = getCurrentTenantId() || (getCachedPlatformTenant() && getCachedPlatformTenant().id);
    if (tid) instance.tenantId = tid;
}

function mergeTenantWhere(options) {
    if (!options || options.skipTenantScope) return options;
    const tid = getCurrentTenantId();
    if (!tid) return options;
    const where = options.where;
    if (!where) {
        options.where = { tenantId: tid };
        return options;
    }
    if (Array.isArray(where)) {
        options.where = where.concat([{ tenantId: tid }]);
        return options;
    }
    if (typeof where !== 'object') return options;
    if (where.tenantId !== undefined) return options;
    options.where = { [Op.and]: [where, { tenantId: tid }] };
    return options;
}

function applyTenantScope(model) {
    if (!model || typeof model.addHook !== 'function') return model;

    const constrain = (options) => {
        mergeTenantWhere(options);
    };

    model.addHook('beforeFind', constrain);
    model.addHook('beforeCount', constrain);
    model.addHook('beforeBulkUpdate', constrain);
    model.addHook('beforeBulkDestroy', constrain);

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
    mergeTenantWhere,
    applyTenantScope,
    applyTenantScopeToModels,
    TENANT_SCOPED_MODELS,
};

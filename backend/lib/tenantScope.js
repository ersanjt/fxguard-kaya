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

function platformTenantId() {
    const platform = getCachedPlatformTenant();
    return (platform && platform.id) || null;
}

function stampTenantId(instance) {
    if (!instance || instance.tenantId) return;
    const tid = getCurrentTenantId() || platformTenantId();
    if (tid) instance.tenantId = tid;
}

/**
 * سازمانِ ردیف را از ردیف والد پیدا می‌کند (برای نوشتن بدون context درخواست، مثل وب‌هوک).
 * owner.on = [ستون والد, ستون همین ردیف]
 */
async function resolveOwnerTenantId(model, owners, instance, options) {
    for (const owner of owners) {
        const [parentCol, childCol] = owner.on;
        const value = instance.get ? instance.get(childCol) : instance[childCol];
        const Parent = model.sequelize.models[owner.model];
        if (!value || !Parent) continue;
        const parent = await Parent.findOne({
            where: { [parentCol]: value },
            attributes: ['tenantId'],
            transaction: options && options.transaction,
            skipTenantScope: true,
        });
        if (parent && parent.tenantId) return parent.tenantId;
    }
    return null;
}

/** سازمان سکو (kaya) هم یک مشتری است؛ ردیفِ بی‌صاحب به آن داده نمی‌شود و بی‌صاحب (نامرئی) می‌ماند. */
async function stampTenantIdFromOwners(model, owners, instance, options) {
    if (!instance || instance.tenantId) return;
    const tid = getCurrentTenantId() || (await resolveOwnerTenantId(model, owners, instance, options));
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

/** owners فقط برای جدول‌های وابسته (TENANT_OWNED_MODELS) داده می‌شود، حتی اگر خالی باشد. */
function applyTenantScope(model, owners) {
    if (!model || typeof model.addHook !== 'function') return model;

    const constrain = (options) => {
        mergeTenantWhere(options);
    };

    model.addHook('beforeFind', constrain);
    model.addHook('beforeCount', constrain);
    model.addHook('beforeBulkUpdate', constrain);
    model.addHook('beforeBulkDestroy', constrain);

    // sum/min/max از aggregate می‌گذرند و Sequelize برایشان هوکی ندارد
    const aggregate = model.aggregate;
    model.aggregate = function scopedAggregate(field, fn, options) {
        return aggregate.call(this, field, fn, mergeTenantWhere({ ...(options || {}) }));
    };

    if (!Array.isArray(owners)) {
        model.addHook('beforeCreate', (instance) => {
            stampTenantId(instance);
        });
        model.addHook('beforeBulkCreate', (instances) => {
            if (!Array.isArray(instances)) return;
            instances.forEach(stampTenantId);
        });
        return model;
    }

    model.addHook('beforeCreate', (instance, options) =>
        stampTenantIdFromOwners(model, owners, instance, options));
    model.addHook('beforeBulkCreate', async (instances, options) => {
        if (!Array.isArray(instances)) return;
        for (const instance of instances) {
            await stampTenantIdFromOwners(model, owners, instance, options);
        }
    });
    return model;
}

/** جدول‌های ریشه که tenantId از ابتدا در آن‌ها بود. */
const TENANT_SCOPED_MODELS = [
    'User',
    'Customer',
    'Conversation',
    'Message',
    'Ticket',
    'Task',
    'Branch',
    'Department',
    'ClinicDoctor',
    'ClinicPatient',
    'ClinicTreatmentPackage',
    'ClinicAppointment',
];

const byUser = (column) => ({ model: 'User', on: ['id', column] });
const byParent = (model, column) => ({ model, on: ['id', column] });

/**
 * جدول‌های وابسته: مالک هر ردیف از روی والد مشخص می‌شود.
 * ترتیب مهم است: والد قبل از فرزند (backfill به همین ترتیب اجرا می‌شود).
 */
const TENANT_OWNED_MODELS = [
    { model: 'Announcement', owners: [byUser('fromUserId')] },
    { model: 'AnnouncementRead', owners: [byParent('Announcement', 'announcementId'), byUser('userId')] },
    { model: 'InternalThreadParticipant', owners: [byUser('userId')] },
    {
        model: 'InternalThread',
        owners: [byUser('createdById'), { model: 'InternalThreadParticipant', on: ['threadId', 'id'] }],
    },
    { model: 'InternalMessage', owners: [byParent('InternalThread', 'threadId'), byUser('fromUserId')] },
    { model: 'ProcessInstance', owners: [byUser('createdBy')] },
    { model: 'ProcessInstanceStep', owners: [byParent('ProcessInstance', 'instanceId')] },
    { model: 'ProcessTemplate', owners: [{ model: 'ProcessInstance', on: ['templateId', 'id'] }] },
    { model: 'Template', owners: [] },
    { model: 'Tag', owners: [] },
    { model: 'ExchangeService', owners: [] },
    { model: 'FileTemplate', owners: [byUser('uploadedBy')] },
    { model: 'CompanyEmail', owners: [byUser('assignedUserId')] },
    { model: 'StaffResourceGrant', owners: [byUser('userId'), byUser('grantedBy')] },
    { model: 'Attendance', owners: [byUser('userId')] },
    { model: 'ActivityLog', owners: [byUser('userId'), byParent('Customer', 'customerId')] },
    { model: 'TicketReply', owners: [byParent('Ticket', 'ticketId'), byUser('userId')] },
    { model: 'TaskUpdate', owners: [byParent('Task', 'taskId'), byUser('userId')] },
    { model: 'CustomerNote', owners: [byParent('Customer', 'customerId'), byUser('userId')] },
    { model: 'CustomerDocument', owners: [byParent('Customer', 'customerId'), byUser('uploadedBy')] },
    { model: 'CashBox', owners: [byParent('Branch', 'branchId')] },
    { model: 'BankAccount', owners: [byParent('Branch', 'branchId')] },
    {
        model: 'Transaction',
        owners: [
            byUser('userId'),
            byParent('Customer', 'customerId'),
            byParent('Branch', 'branchId'),
            byParent('CashBox', 'fromCashBoxId'),
            byParent('CashBox', 'toCashBoxId'),
            byParent('BankAccount', 'fromBankAccountId'),
            byParent('BankAccount', 'toBankAccountId'),
        ],
    },
];

function applyTenantScopeToModels(models) {
    TENANT_SCOPED_MODELS.forEach((name) => {
        if (models[name]) applyTenantScope(models[name]);
    });
    TENANT_OWNED_MODELS.forEach(({ model, owners }) => {
        if (models[model]) applyTenantScope(models[model], owners);
    });
}

module.exports = {
    stampTenantId,
    mergeTenantWhere,
    applyTenantScope,
    applyTenantScopeToModels,
    TENANT_SCOPED_MODELS,
    TENANT_OWNED_MODELS,
};

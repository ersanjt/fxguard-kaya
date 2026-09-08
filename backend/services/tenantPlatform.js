/**
 * Kaya CRM — سازمان سکوی پیش‌فرض و backfill tenantId
 * @file    backend/services/tenantPlatform.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const { PLATFORM_SLUG } = require('../lib/tenantHost');
const { setPlatformTenantCache } = require('../lib/tenantContext');

async function ensurePlatformTenant(logger) {
    const { Tenant, User, Customer, Conversation, Message, Ticket, Task, Branch, Department } =
        require('../models');

    const [row] = await Tenant.findOrCreate({
        where: { slug: PLATFORM_SLUG },
        defaults: {
            slug: PLATFORM_SLUG,
            name: 'Platform',
            status: 'active',
            planTier: 'legacy',
            trialEndsAt: null,
            panelKey: 'default',
        },
    });

    const shaped = {
        id: row.id,
        slug: row.slug,
        name: row.name,
        status: row.status || 'active',
        planTier: row.planTier || 'legacy',
        trialEndsAt: row.trialEndsAt,
        panelKey: row.panelKey || 'default',
        customDomain: row.customDomain || null,
        isPlatform: true,
    };
    setPlatformTenantCache(shaped);

    const tables = [
        { model: User, name: 'Users' },
        { model: Customer, name: 'Customers' },
        { model: Conversation, name: 'Conversations' },
        { model: Message, name: 'Messages' },
        { model: Ticket, name: 'Tickets' },
        { model: Task, name: 'Tasks' },
        { model: Branch, name: 'Branches' },
        { model: Department, name: 'Departments' },
    ];

    for (const t of tables) {
        try {
            await t.model.update(
                { tenantId: row.id },
                { where: { tenantId: null }, skipTenantScope: true }
            );
        } catch (err) {
            if (logger && logger.warn) {
                logger.warn('tenantId backfill skipped for ' + t.name, { error: err.message });
            }
        }
    }

    return shaped;
}

async function addTenantIdColumns(sequelize, logger) {
    const qi = sequelize.getQueryInterface();
    const { DataTypes } = require('sequelize');
    const tables = [
        'Users',
        'Customers',
        'Conversations',
        'Messages',
        'Tickets',
        'Tasks',
        'Branches',
        'Departments',
    ];
    for (const table of tables) {
        try {
            const desc = await qi.describeTable(table);
            if (desc && desc.tenantId === undefined) {
                await qi.addColumn(table, 'tenantId', { type: DataTypes.UUID, allowNull: true });
                if (logger && logger.info) logger.info('✅ ' + table + ': tenantId column added');
            }
        } catch (_) {
            /* table may not exist yet */
        }
    }
}

module.exports = { ensurePlatformTenant, addTenantIdColumns };

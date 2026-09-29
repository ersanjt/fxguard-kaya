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
const { TENANT_OWNED_MODELS } = require('../lib/tenantScope');

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

    await backfillOwnedTenantIds(User.sequelize, row.id, logger);

    return shaped;
}

/** زمان ثبت اولین سازمانِ غیر از سکو؛ قبل از آن سکو تنها مشتری بود. */
async function firstCustomerSignupAt(sequelize, platformId) {
    const Tenant = sequelize.models.Tenant;
    if (!Tenant) return null;
    const { Op } = require('sequelize');
    return Tenant.min('createdAt', { where: { id: { [Op.ne]: platformId } } });
}

/**
 * ردیف‌های قدیمیِ جدول‌های وابسته را به سازمانِ والدشان می‌دهد (به ترتیب TENANT_OWNED_MODELS).
 * سکو (kaya) هم یک مشتری است: ردیفی که صاحبش معلوم نیست فقط وقتی به سکو می‌رسد که
 * قبل از ثبت اولین سازمان دیگر ساخته شده باشد؛ بقیه بی‌صاحب (برای همه نامرئی) می‌مانند.
 */
async function backfillOwnedTenantIds(sequelize, platformId, logger) {
    const { Op } = require('sequelize');
    const qg = sequelize.getQueryInterface().queryGenerator;
    const tenantCol = qg.quoteIdentifier('tenantId');
    const cutoff = await firstCustomerSignupAt(sequelize, platformId);

    for (const { model: name, owners } of TENANT_OWNED_MODELS) {
        const model = sequelize.models[name];
        if (!model) continue;
        const table = qg.quoteTable(model.getTableName());
        try {
            for (const owner of owners) {
                const parent = sequelize.models[owner.model];
                if (!parent) continue;
                const parentTable = qg.quoteTable(parent.getTableName());
                const parentCol = qg.quoteIdentifier(owner.on[0]);
                const childCol = qg.quoteIdentifier(owner.on[1]);
                await sequelize.query(
                    `UPDATE ${table} SET ${tenantCol} = (` +
                        `SELECT src.${tenantCol} FROM ${parentTable} src ` +
                        `WHERE src.${parentCol} = ${table}.${childCol} AND src.${tenantCol} IS NOT NULL LIMIT 1` +
                    `) WHERE ${tenantCol} IS NULL AND ${childCol} IS NOT NULL`
                );
            }
            if (!cutoff) {
                await model.update({ tenantId: platformId }, { where: { tenantId: null }, skipTenantScope: true });
            } else if (model.rawAttributes.createdAt) {
                await model.update(
                    { tenantId: platformId },
                    { where: { tenantId: null, createdAt: { [Op.lt]: cutoff } }, skipTenantScope: true }
                );
            }
            const left = await model.count({ where: { tenantId: null }, skipTenantScope: true });
            if (left > 0 && logger && logger.warn) {
                logger.warn(name + ': rows without a known company left unassigned', { count: left });
            }
        } catch (err) {
            if (logger && logger.warn) {
                logger.warn('tenantId backfill skipped for ' + name, { error: err.message });
            }
        }
    }
}

function indexHasTenantId(idx) {
    const fields = (idx && (idx.fields || idx.columns)) || [];
    return fields.some((field) => {
        if (!field) return false;
        if (typeof field === 'string') return field === 'tenantId';
        return field.attribute === 'tenantId' || field.name === 'tenantId';
    });
}

async function ensureTenantIdIndex(qi, table, logger) {
    let indexes = [];
    try {
        indexes = await qi.showIndex(table);
    } catch (_) {
        return;
    }
    if ((indexes || []).some(indexHasTenantId)) return;
    try {
        await qi.addIndex(table, ['tenantId'], { name: 'idx_' + table + '_tenantId' });
        if (logger && logger.info) logger.info('✅ ' + table + ': tenantId index added');
    } catch (err) {
        const msg = String((err && err.message) || '');
        if (msg.includes('already exists') || msg.includes('duplicate')) return;
        if (logger && logger.warn) logger.warn(table + ' tenantId index', { error: msg });
    }
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
            if (desc) await ensureTenantIdIndex(qi, table, logger);
        } catch (_) {
            /* table may not exist yet */
        }
    }

    // ایندکس tenantId این جدول‌ها در خود مدل تعریف شده و sync آن را می‌سازد؛ اینجا فقط ستون لازم است
    const models = sequelize.models;
    for (const { model: name } of TENANT_OWNED_MODELS) {
        if (!models[name]) continue;
        const table = models[name].getTableName();
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

    // این ستون‌ها حالا در هر سازمان یکتا هستند (tenantId + ستون)؛ قید سراسری قدیمی باید برداشته شود
    await dropGlobalColumnUnique(sequelize, 'Tags', 'name', logger);
    await dropGlobalColumnUnique(sequelize, 'whatsapp_numbers', 'slotKey', logger);
}

async function dropGlobalColumnUnique(sequelize, table, column, logger) {
    try {
        const dialect = sequelize.getDialect();
        if (dialect === 'postgres') await dropPostgresColumnUnique(sequelize, table, column);
        else if (dialect === 'sqlite') await dropSqliteColumnUnique(sequelize, table, column, logger);
    } catch (err) {
        if (logger && logger.warn) {
            logger.warn(table + '.' + column + ' global unique', { error: String((err && err.message) || err) });
        }
    }
}

async function dropPostgresColumnUnique(sequelize, table, column) {
    const { QueryTypes } = require('sequelize');
    const rows = await sequelize.query(
        'SELECT con.conname AS name FROM pg_constraint con ' +
            'JOIN pg_class rel ON rel.oid = con.conrelid ' +
            'JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = con.conkey[1] ' +
            "WHERE rel.relname = :table AND con.contype = 'u' AND array_length(con.conkey, 1) = 1 " +
            'AND att.attname = :column',
        { replacements: { table, column }, type: QueryTypes.SELECT }
    );
    for (const row of rows) {
        await sequelize.query(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${row.name}"`);
    }
}

/**
 * SQLite قید UNIQUE ستونی را با ALTER برنمی‌دارد؛ جدول طبق روال رسمی SQLite بازسازی می‌شود
 * (ساخت جدول جدید، کپی داده، حذف قدیمی، تغییر نام، ساخت دوبارهٔ ایندکس‌ها).
 */
async function dropSqliteColumnUnique(sequelize, table, column, logger) {
    const { QueryTypes } = require('sequelize');
    const tables = await sequelize.query(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?",
        { replacements: [table], type: QueryTypes.SELECT }
    );
    const createSql = tables[0] && tables[0].sql;
    if (!createSql) return;
    const columnUnique = new RegExp('(`' + column + '`[^,]*?)\\s+UNIQUE\\b', 'i');
    if (!columnUnique.test(createSql)) return;

    const tmp = table + '__rebuild';
    const rebuiltSql = createSql
        .replace(columnUnique, '$1')
        .replace(/^CREATE TABLE\s+(`[^`]+`|"[^"]+"|\S+)/i, 'CREATE TABLE `' + tmp + '`');
    const singleColumnUnique = new RegExp('^CREATE UNIQUE INDEX[\\s\\S]*\\(\\s*`' + column + '`\\s*\\)\\s*$', 'i');
    const indexes = (await sequelize.query(
        "SELECT sql FROM sqlite_master WHERE type = 'index' AND tbl_name = ? AND sql IS NOT NULL",
        { replacements: [table], type: QueryTypes.SELECT }
    )).filter((idx) => !singleColumnUnique.test(idx.sql));

    await sequelize.query('PRAGMA foreign_keys = OFF');
    try {
        await sequelize.transaction(async (transaction) => {
            await sequelize.query('DROP TABLE IF EXISTS `' + tmp + '`', { transaction });
            await sequelize.query(rebuiltSql, { transaction });
            await sequelize.query('INSERT INTO `' + tmp + '` SELECT * FROM `' + table + '`', { transaction });
            await sequelize.query('DROP TABLE `' + table + '`', { transaction });
            await sequelize.query('ALTER TABLE `' + tmp + '` RENAME TO `' + table + '`', { transaction });
            for (const idx of indexes) await sequelize.query(idx.sql, { transaction });
        });
    } finally {
        await sequelize.query('PRAGMA foreign_keys = ON');
    }
    if (logger && logger.info) logger.info('✅ ' + table + '.' + column + ': global unique removed');
}

/** ستون‌های جدید tenants باید قبل از اولین کوئری روی Tenant (ensurePlatformTenant) وجود داشته باشند. */
async function ensureTenantTableColumns(sequelize, logger) {
    const qi = sequelize.getQueryInterface();
    const { DataTypes } = require('sequelize');
    const desc = await qi.describeTable('tenants').catch(() => null);
    if (!desc) return;
    const columns = [
        ['stripeCustomerId', { type: DataTypes.STRING(64), allowNull: true }],
        ['stripeSubscriptionId', { type: DataTypes.STRING(64), allowNull: true }],
        ['cryptoTxId', { type: DataTypes.STRING(128), allowNull: true }],
        ['cryptoNetwork', { type: DataTypes.STRING(32), allowNull: true }],
        ['cryptoPaymentStatus', { type: DataTypes.STRING(32), allowNull: true }],
        ['cryptoPaidAt', { type: DataTypes.DATE, allowNull: true }],
        ['industry', { type: DataTypes.STRING(32), allowNull: true }],
        ['enabledSkills', { type: DataTypes.TEXT, allowNull: true }],
        ['gatewayEnabled', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }],
        ['gatewayPort', { type: DataTypes.INTEGER, allowNull: true }],
    ];
    for (const [name, def] of columns) {
        if (desc[name] !== undefined) continue;
        try {
            await qi.addColumn('tenants', name, def);
            if (logger && logger.info) logger.info('✅ tenants.' + name + ' column added (auto-migration)');
        } catch (e) {
            const msg = String((e && e.message) || '');
            if (!msg.includes('already exists') && !msg.includes('duplicate') && logger && logger.warn) {
                logger.warn('tenants.' + name, msg);
            }
        }
    }
}

module.exports = {
    ensurePlatformTenant,
    addTenantIdColumns,
    backfillOwnedTenantIds,
    ensureTenantTableColumns,
    dropGlobalColumnUnique,
};

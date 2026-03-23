/**
 * مایگریشن‌هایی که باید قبل از sequelize.sync() اجرا شوند.
 */
const { DataTypes } = require('sequelize');

async function runPreSync(sequelize, logger) {
    const qi = sequelize.getQueryInterface();

    try {
        const tableDesc = await qi.describeTable('Transactions');
        if (!tableDesc || !tableDesc.customerId) {
            await qi.addColumn('Transactions', 'customerId', {
                type: DataTypes.UUID,
                allowNull: true,
                references: { model: 'Customers', key: 'id' },
            });
            logger.info('✅ Transactions.customerId column added (auto-migration)');
        }
    } catch (migErr) {
        logger.warn('Transactions customerId migration:', migErr.message);
    }

    try {
        const txDesc = await qi.describeTable('Transactions');
        const colsToAdd = [];
        if (!txDesc || !txDesc.status) colsToAdd.push(['status', { type: DataTypes.STRING(20), allowNull: true, defaultValue: 'pending' }]);
        if (!txDesc || !txDesc.approvedBy) colsToAdd.push(['approvedBy', { type: DataTypes.UUID, allowNull: true, references: { model: 'Users', key: 'id' } }]);
        if (!txDesc || !txDesc.approvedAt) colsToAdd.push(['approvedAt', { type: DataTypes.DATE, allowNull: true }]);
        if (!txDesc || !txDesc.rejectedBy) colsToAdd.push(['rejectedBy', { type: DataTypes.UUID, allowNull: true, references: { model: 'Users', key: 'id' } }]);
        if (!txDesc || !txDesc.rejectedAt) colsToAdd.push(['rejectedAt', { type: DataTypes.DATE, allowNull: true }]);
        if (!txDesc || !txDesc.metadata) colsToAdd.push(['metadata', { type: DataTypes.JSON, allowNull: true, defaultValue: {} }]);
        for (const [name, def] of colsToAdd) {
            await qi.addColumn('Transactions', name, def);
            logger.info('✅ Transactions.' + name + ' column added (auto-migration)');
        }
    } catch (migErr) {
        logger.warn('Transactions status/approval migration:', migErr.message);
    }

    try {
        const tableName = 'Conversations';
        const tableDesc = await qi.describeTable(tableName).catch(() => null);
        if (!tableDesc || !tableDesc.branchId) {
            await qi.addColumn(tableName, 'branchId', {
                type: DataTypes.UUID,
                allowNull: true,
                references: { model: 'Branches', key: 'id' },
            });
            logger.info('✅ Conversations.branchId column added (auto-migration)');
        }
    } catch (migErr) {
        logger.warn('Conversations branchId migration:', migErr.message);
    }

    if (sequelize.getDialect() === 'postgres') {
        try {
            await sequelize.query('ALTER TYPE "enum_Tickets_status" ADD VALUE IF NOT EXISTS \'archived\';');
            logger.info('✅ Ticket status archived added (auto-migration)');
        } catch (e) {
            if (!String(e.message || '').includes('already exists')) logger.warn('Ticket archived migration:', e.message);
        }
        try {
            await sequelize.query('ALTER TYPE "enum_Conversations_status" ADD VALUE IF NOT EXISTS \'archived\';');
            logger.info('✅ Conversation status archived added (auto-migration)');
        } catch (e) {
            if (!String(e.message || '').includes('already exists')) logger.warn('Conversation archived migration:', e.message);
        }
    }

    try {
        let convDesc;
        try {
            convDesc = await qi.describeTable('Conversations');
        } catch (_) {
            convDesc = null;
        }
        if (convDesc) {
            const convCols = [
                ['metadata', { type: DataTypes.JSON, allowNull: true }],
                ['lastOutgoingMessageAt', { type: DataTypes.DATE, allowNull: true }],
                ['firstReplyAt', { type: DataTypes.DATE, allowNull: true }],
                ['lastMessagePreview', { type: DataTypes.STRING(500), allowNull: true }],
                ['unansweredAlertSentAt', { type: DataTypes.DATE, allowNull: true }],
                ['escalatedAt', { type: DataTypes.DATE, allowNull: true }],
                ['lastIncomingMessageAt', { type: DataTypes.DATE, allowNull: true }],
                ['lastOutgoingIsAutoReply', { type: DataTypes.BOOLEAN, allowNull: true }],
            ];
            for (const [col, def] of convCols) {
                if (!convDesc[col]) {
                    await qi.addColumn('Conversations', col, def).catch(e => {
                        if (!String(e.message || '').includes('already exists') && !String(e.message || '').includes('duplicate'))
                            logger.warn(`Conversations.${col} migration:`, e.message);
                    });
                    logger.info(`✅ Conversations.${col} column added (auto-migration)`);
                }
            }
        }
    } catch (e) {
        logger.warn('Conversations new columns migration:', e.message);
    }

    try {
        const isPg = sequelize.getDialect() === 'postgres';
        let custDesc;
        try {
            custDesc = await qi.describeTable('Customers');
        } catch (_) {
            custDesc = null;
        }
        if (custDesc) {
            const newCols = [
                ['birthDate', { type: DataTypes.DATEONLY, allowNull: true }],
                ['nationalId', { type: DataTypes.STRING, allowNull: true }],
                ['nationality', { type: DataTypes.STRING, allowNull: true }],
                ['occupation', { type: DataTypes.STRING, allowNull: true }],
                ['companyName', { type: DataTypes.STRING, allowNull: true }],
                ['address', { type: DataTypes.TEXT, allowNull: true }],
                ['city', { type: DataTypes.STRING, allowNull: true }],
                ['country', { type: DataTypes.STRING, allowNull: true }],
                ['postalCode', { type: DataTypes.STRING, allowNull: true }],
                ['loyaltyPoints', { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 }],
                ['referredBy', { type: DataTypes.UUID, allowNull: true }],
                ['instagram', { type: DataTypes.STRING, allowNull: true }],
                ['telegram', { type: DataTypes.STRING, allowNull: true }],
                ['website', { type: DataTypes.STRING, allowNull: true }],
            ];
            for (const [col, def] of newCols) {
                if (!custDesc[col]) {
                    await qi.addColumn('Customers', col, def).catch(e => {
                        if (!String(e.message || '').includes('already exists')) logger.warn(`Customers.${col} migration:`, e.message);
                    });
                }
            }
            if (isPg) {
                if (!custDesc.gender) {
                    await sequelize
                        .query(
                            `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_Customers_gender') THEN CREATE TYPE "enum_Customers_gender" AS ENUM ('male', 'female', 'other'); END IF; END $$;`
                        )
                        .catch(() => {});
                    await sequelize
                        .query('ALTER TABLE "Customers" ADD COLUMN IF NOT EXISTS "gender" "enum_Customers_gender";')
                        .catch(e => {
                            if (!String(e.message || '').includes('already exists')) logger.warn('Customers.gender migration:', e.message);
                        });
                }
                if (!custDesc.loyaltyTier) {
                    await sequelize
                        .query(
                            `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_Customers_loyaltyTier') THEN CREATE TYPE "enum_Customers_loyaltyTier" AS ENUM ('bronze', 'silver', 'gold', 'platinum'); END IF; END $$;`
                        )
                        .catch(() => {});
                    await sequelize
                        .query('ALTER TABLE "Customers" ADD COLUMN IF NOT EXISTS "loyaltyTier" "enum_Customers_loyaltyTier" DEFAULT \'bronze\';')
                        .catch(e => {
                            if (!String(e.message || '').includes('already exists')) logger.warn('Customers.loyaltyTier migration:', e.message);
                        });
                }
            }
        }
    } catch (e) {
        logger.warn('Customers profile fields pre-sync migration:', e.message);
    }
}

module.exports = { runPreSync };

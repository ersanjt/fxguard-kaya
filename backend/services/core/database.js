const models = require('../../models');
const { sequelize, RateCurrency } = models;
const mongoose = require('mongoose');

async function connectDatabases(logger) {
    try {
        await sequelize.authenticate();
        if (sequelize.getDialect() === 'sqlite') {
            await sequelize.query('PRAGMA journal_mode=WAL;');
            await sequelize.query('PRAGMA synchronous=NORMAL;');
        }

        // Auto-migrate: add customerId to Transactions
        try {
            const { DataTypes } = require('sequelize');
            const qi = sequelize.getQueryInterface();
            const tableDesc = await qi.describeTable('Transactions');
            if (!tableDesc || !tableDesc.customerId) {
                await qi.addColumn('Transactions', 'customerId', {
                    type: DataTypes.UUID,
                    allowNull: true,
                    references: { model: 'Customers', key: 'id' }
                });
                logger.info('✅ Transactions.customerId column added (auto-migration)');
            }
        } catch (migErr) {
            logger.warn('Transactions customerId migration:', migErr.message);
        }

        // Auto-migrate: add status, approvedBy, etc. to Transactions
        try {
            const { DataTypes } = require('sequelize');
            const qi = sequelize.getQueryInterface();
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

        // Auto-migrate: add branchId to Conversations
        try {
            const qi = sequelize.getQueryInterface();
            const tableName = 'Conversations';
            const tableDesc = await qi.describeTable(tableName).catch(() => null);
            if (!tableDesc || !tableDesc.branchId) {
                await qi.addColumn(tableName, 'branchId', {
                    type: require('sequelize').DataTypes.UUID,
                    allowNull: true,
                    references: { model: 'Branches', key: 'id' }
                });
                logger.info('✅ Conversations.branchId column added (auto-migration)');
            }
        } catch (migErr) {
            logger.warn('Conversations branchId migration:', migErr.message);
        }

        // Auto-migrate: firstReplyAt, metadata for Conversations
        try {
            const convDesc = await sequelize.getQueryInterface().describeTable('Conversations').catch(() => null);
            if (!convDesc || !convDesc.firstReplyAt) {
                await sequelize.getQueryInterface().addColumn('Conversations', 'firstReplyAt', { type: require('sequelize').DataTypes.DATE, allowNull: true });
                logger.info('✅ Conversations.firstReplyAt column added (auto-migration)');
            }
            if (!convDesc || !convDesc.metadata) {
                await sequelize.getQueryInterface().addColumn('Conversations', 'metadata', { type: require('sequelize').DataTypes.JSON, allowNull: true });
                logger.info('✅ Conversations.metadata column added (auto-migration)');
            }
        } catch (migErr) {
            logger.warn('Conversations firstReplyAt migration:', migErr.message);
        }

        if (sequelize.getDialect() === 'postgres') {
            try {
                await sequelize.query("ALTER TYPE \"enum_Tickets_status\" ADD VALUE IF NOT EXISTS 'archived';");
                logger.info('✅ Ticket status archived added (auto-migration)');
            } catch (e) {
                if (!String(e.message || '').includes('already exists')) logger.warn('Ticket archived migration:', e.message);
            }
            try {
                await sequelize.query("ALTER TYPE \"enum_Conversations_status\" ADD VALUE IF NOT EXISTS 'archived';");
                logger.info('✅ Conversation status archived added (auto-migration)');
            } catch (e) {
                if (!String(e.message || '').includes('already exists')) logger.warn('Conversation archived migration:', e.message);
            }
        }

        // Auto-migrate Conversations: new columns (lastOutgoingMessageAt, firstReplyAt, lastMessagePreview, unansweredAlertSentAt, escalatedAt)
        try {
            const { DataTypes } = require('sequelize');
            const qi = sequelize.getQueryInterface();
            let convDesc;
            try { convDesc = await qi.describeTable('Conversations'); } catch (_) { convDesc = null; }
            if (convDesc) {
                const convCols = [
                    ['lastOutgoingMessageAt', { type: DataTypes.DATE, allowNull: true }],
                    ['firstReplyAt',          { type: DataTypes.DATE, allowNull: true }],
                    ['lastMessagePreview',    { type: DataTypes.STRING(500), allowNull: true }],
                    ['unansweredAlertSentAt', { type: DataTypes.DATE, allowNull: true }],
                    ['escalatedAt',           { type: DataTypes.DATE, allowNull: true }],
                    ['lastIncomingMessageAt', { type: DataTypes.DATE, allowNull: true }],
                    ['lastOutgoingIsAutoReply', { type: DataTypes.BOOLEAN, allowNull: true }],
                ];
                for (const [col, def] of convCols) {
                    if (!convDesc[col]) {
                        await qi.addColumn('Conversations', col, def).catch(e => {
                            if (!String(e.message || '').includes('already exists') && !String(e.message || '').includes('duplicate')) logger.warn(`Conversations.${col} migration:`, e.message);
                        });
                        logger.info(`✅ Conversations.${col} column added (auto-migration)`);
                    }
                }
            }
        } catch (e) {
            logger.warn('Conversations new columns migration:', e.message);
        }

        // Auto-migrate Customers: new profile fields (v2.0) — must run BEFORE sequelize.sync()
        // so that sync() can create indexes on the already-existing columns
        try {
            const { DataTypes } = require('sequelize');
            const qi = sequelize.getQueryInterface();
            const isPg = sequelize.getDialect() === 'postgres';
            let custDesc;
            try { custDesc = await qi.describeTable('Customers'); } catch (_) { custDesc = null; }
            if (custDesc) {
                const newCols = [
                    ['birthDate',     { type: DataTypes.DATEONLY, allowNull: true }],
                    ['nationalId',    { type: DataTypes.STRING, allowNull: true }],
                    ['nationality',   { type: DataTypes.STRING, allowNull: true }],
                    ['occupation',    { type: DataTypes.STRING, allowNull: true }],
                    ['companyName',   { type: DataTypes.STRING, allowNull: true }],
                    ['address',       { type: DataTypes.TEXT, allowNull: true }],
                    ['city',          { type: DataTypes.STRING, allowNull: true }],
                    ['country',       { type: DataTypes.STRING, allowNull: true }],
                    ['postalCode',    { type: DataTypes.STRING, allowNull: true }],
                    ['loyaltyPoints', { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 }],
                    ['referredBy',    { type: DataTypes.UUID, allowNull: true }],
                    ['instagram',     { type: DataTypes.STRING, allowNull: true }],
                    ['telegram',      { type: DataTypes.STRING, allowNull: true }],
                    ['website',       { type: DataTypes.STRING, allowNull: true }],
                ];
                for (const [col, def] of newCols) {
                    if (!custDesc[col]) {
                        await qi.addColumn('Customers', col, def).catch(e => {
                            if (!String(e.message || '').includes('already exists')) logger.warn(`Customers.${col} migration:`, e.message);
                        });
                    }
                }
                // ENUM columns for PostgreSQL (SQLite handles them via sync())
                if (isPg) {
                    if (!custDesc.gender) {
                        await sequelize.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_Customers_gender') THEN CREATE TYPE "enum_Customers_gender" AS ENUM ('male', 'female', 'other'); END IF; END $$;`).catch(() => {});
                        await sequelize.query(`ALTER TABLE "Customers" ADD COLUMN IF NOT EXISTS "gender" "enum_Customers_gender";`).catch(e => { if (!String(e.message || '').includes('already exists')) logger.warn('Customers.gender migration:', e.message); });
                    }
                    if (!custDesc.loyaltyTier) {
                        await sequelize.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_Customers_loyaltyTier') THEN CREATE TYPE "enum_Customers_loyaltyTier" AS ENUM ('bronze', 'silver', 'gold', 'platinum'); END IF; END $$;`).catch(() => {});
                        await sequelize.query(`ALTER TABLE "Customers" ADD COLUMN IF NOT EXISTS "loyaltyTier" "enum_Customers_loyaltyTier" DEFAULT 'bronze';`).catch(e => { if (!String(e.message || '').includes('already exists')) logger.warn('Customers.loyaltyTier migration:', e.message); });
                    }
                }
            }
        } catch (e) {
            logger.warn('Customers profile fields pre-sync migration:', e.message);
        }

        await sequelize.sync();
        logger.info(process.env.USE_SQLITE ? '✅ SQLite Connected (WAL)' : '✅ PostgreSQL Connected');

        // Auto-migrate panel_settings
        try {
            const { DataTypes } = require('sequelize');
            const qi = sequelize.getQueryInterface();
            const desc = await qi.describeTable('panel_settings');
            if (desc && !desc.smtpHost) {
                const cols = [
                    ['smtpHost', { type: DataTypes.STRING(255), allowNull: true }],
                    ['smtpPort', { type: DataTypes.STRING(20), allowNull: true }],
                    ['smtpUser', { type: DataTypes.STRING(255), allowNull: true }],
                    ['smtpPass', { type: DataTypes.TEXT, allowNull: true }],
                    ['smtpFrom', { type: DataTypes.STRING(255), allowNull: true }],
                    ['smtpFromName', { type: DataTypes.STRING(255), allowNull: true }],
                    ['smtpSecure', { type: DataTypes.BOOLEAN, allowNull: true }],
                    ['emailLoginNotification', { type: DataTypes.BOOLEAN, allowNull: true }],
                    ['hiddenSections', { type: DataTypes.TEXT, allowNull: true }]
                ];
                for (const [name, def] of cols) {
                    try {
                        await qi.addColumn('panel_settings', name, def);
                    } catch (e) {
                        if (!String(e.message || '').includes('already exists') && !String(e.message || '').includes('duplicate')) logger.warn('panel_settings.' + name, e.message);
                    }
                }
                logger.info('✅ panel_settings: email & visibility columns added (auto-migration)');
            }
            if (desc && !desc.languageMode) {
                try {
                    await qi.addColumn('panel_settings', 'languageMode', { type: require('sequelize').DataTypes.STRING(20), allowNull: true });
                    logger.info('✅ panel_settings: languageMode column added (auto-migration)');
                } catch (e) {
                    if (!String(e.message || '').includes('already exists') && !String(e.message || '').includes('duplicate')) logger.warn('panel_settings.languageMode', e.message);
                }
            }
            if (desc && desc.showFooter === undefined) {
                try {
                    await qi.addColumn('panel_settings', 'showFooter', { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true });
                    logger.info('✅ panel_settings: showFooter column added (auto-migration)');
                } catch (e) {
                    if (!String(e.message || '').includes('already exists') && !String(e.message || '').includes('duplicate')) logger.warn('panel_settings.showFooter', e.message);
                }
            }
            if (desc && desc.defaultLanguage === undefined) {
                try {
                    await qi.addColumn('panel_settings', 'defaultLanguage', { type: DataTypes.STRING(10), allowNull: true });
                    logger.info('✅ panel_settings: defaultLanguage column added (auto-migration)');
                } catch (e) {
                    if (!String(e.message || '').includes('already exists') && !String(e.message || '').includes('duplicate')) logger.warn('panel_settings.defaultLanguage', e.message);
                }
            }
            if (desc && desc.footerStyle === undefined) {
                try {
                    await qi.addColumn('panel_settings', 'footerStyle', { type: DataTypes.STRING(32), allowNull: true });
                    logger.info('✅ panel_settings: footerStyle column added (auto-migration)');
                } catch (e) {
                    if (!String(e.message || '').includes('already exists') && !String(e.message || '').includes('duplicate')) logger.warn('panel_settings.footerStyle', e.message);
                }
            }
            const newThemeCols = [
                ['primaryColor', { type: DataTypes.STRING(20), allowNull: true }],
                ['fontFamily', { type: DataTypes.STRING(64), allowNull: true }],
                ['fontSize', { type: DataTypes.STRING(20), allowNull: true }],
                ['fontWeight', { type: DataTypes.STRING(20), allowNull: true }],
                ['uiTheme', { type: DataTypes.STRING(32), allowNull: true }],
                ['sidebarOrder', { type: DataTypes.TEXT, allowNull: true }]
            ];
            for (const [name, def] of newThemeCols) {
                if (desc && desc[name] === undefined) {
                    try {
                        await qi.addColumn('panel_settings', name, def);
                        logger.info('✅ panel_settings: ' + name + ' column added (auto-migration)');
                    } catch (e) {
                        if (!String(e.message || '').includes('already exists') && !String(e.message || '').includes('duplicate')) logger.warn('panel_settings.' + name, e.message);
                    }
                }
            }
        } catch (e) {
            logger.warn('panel_settings migration:', e.message);
        }

        // Auto-migrate Users: position
        try {
            const qi = sequelize.getQueryInterface();
            const userDesc = await qi.describeTable('Users');
            if (userDesc && !userDesc.position) {
                await qi.addColumn('Users', 'position', { type: require('sequelize').DataTypes.STRING, allowNull: true });
                logger.info('✅ Users: position column added (auto-migration)');
            }
        } catch (e) {
            if (!String(e.message || '').includes('already exists') && !String(e.message || '').includes('duplicate')) logger.warn('Users position migration:', e.message);
        }

        const defaultRateCurrencies = require('../../lib/defaultRateCurrencies');
        const rateCurrencyCount = await RateCurrency.count();
        if (rateCurrencyCount === 0 && defaultRateCurrencies.length > 0) {
            await RateCurrency.bulkCreate(defaultRateCurrencies);
            logger.info('✅ ارزهای پیش‌فرض نرخ (RateCurrency) ثبت شدند');
        }

        if (!process.env.USE_SQLITE) {
            try {
                await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/whatsapp_crm', {
                    useNewUrlParser: true,
                    useUnifiedTopology: true
                });
                if (!mongoose.models.MessageLog) {
                    const messageLogSchema = new mongoose.Schema({
                        conversationId: String,
                        customerId: String,
                        messageId: String,
                        content: String,
                        timestamp: Date,
                        metadata: Object
                    }, { strict: false });
                    mongoose.model('MessageLog', messageLogSchema);
                }
                logger.info('✅ MongoDB Connected');
            } catch (mongoErr) {
                logger.warn('⚠️ MongoDB not available - continuing without analytics log');
            }
        }
    } catch (error) {
        logger.error('❌ Database Connection Error:', error);
        process.exit(1);
    }
}

module.exports = { connectDatabases };

/**
 * مایگریشن و seed بعد از sequelize.sync()
 */
const { DataTypes } = require('sequelize');
const mongoose = require('mongoose');

async function runPostSync(sequelize, logger, { RateCurrency }) {
    const qi = sequelize.getQueryInterface();

    try {
        const desc = await qi.describeTable('panel_settings');
        if (desc) {
            const cols = [
                ['smtpHost', { type: DataTypes.STRING(255), allowNull: true }],
                ['smtpPort', { type: DataTypes.STRING(20), allowNull: true }],
                ['smtpUser', { type: DataTypes.STRING(255), allowNull: true }],
                ['smtpPass', { type: DataTypes.TEXT, allowNull: true }],
                ['smtpFrom', { type: DataTypes.STRING(255), allowNull: true }],
                ['smtpFromName', { type: DataTypes.STRING(255), allowNull: true }],
                ['smtpSecure', { type: DataTypes.BOOLEAN, allowNull: true }],
                ['emailLoginNotification', { type: DataTypes.BOOLEAN, allowNull: true }],
                ['adminAlertsEnabled', { type: DataTypes.BOOLEAN, allowNull: true }],
                ['adminAlertEmails', { type: DataTypes.TEXT, allowNull: true }],
                ['telegramBotToken', { type: DataTypes.TEXT, allowNull: true }],
                ['telegramChatIds', { type: DataTypes.TEXT, allowNull: true }],
                ['telegramTimeoutMs', { type: DataTypes.INTEGER, allowNull: true }],
                ['clientErrorReportingEnabled', { type: DataTypes.BOOLEAN, allowNull: true }],
                ['hiddenSections', { type: DataTypes.TEXT, allowNull: true }],
            ];
            for (const [name, def] of cols) {
                if (desc[name] !== undefined) continue;
                try {
                    await qi.addColumn('panel_settings', name, def);
                    logger.info('✅ panel_settings: ' + name + ' column added (auto-migration)');
                } catch (e) {
                    if (!String(e.message || '').includes('already exists') && !String(e.message || '').includes('duplicate'))
                        logger.warn('panel_settings.' + name, e.message);
                }
            }
        }
        if (desc && !desc.languageMode) {
            try {
                await qi.addColumn('panel_settings', 'languageMode', { type: DataTypes.STRING(20), allowNull: true });
                logger.info('✅ panel_settings: languageMode column added (auto-migration)');
            } catch (e) {
                if (!String(e.message || '').includes('already exists') && !String(e.message || '').includes('duplicate'))
                    logger.warn('panel_settings.languageMode', e.message);
            }
        }
        if (desc && desc.showFooter === undefined) {
            try {
                await qi.addColumn('panel_settings', 'showFooter', { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true });
                logger.info('✅ panel_settings: showFooter column added (auto-migration)');
            } catch (e) {
                if (!String(e.message || '').includes('already exists') && !String(e.message || '').includes('duplicate'))
                    logger.warn('panel_settings.showFooter', e.message);
            }
        }
        if (desc && desc.defaultLanguage === undefined) {
            try {
                await qi.addColumn('panel_settings', 'defaultLanguage', { type: DataTypes.STRING(10), allowNull: true });
                logger.info('✅ panel_settings: defaultLanguage column added (auto-migration)');
            } catch (e) {
                if (!String(e.message || '').includes('already exists') && !String(e.message || '').includes('duplicate'))
                    logger.warn('panel_settings.defaultLanguage', e.message);
            }
        }
        if (desc && desc.footerStyle === undefined) {
            try {
                await qi.addColumn('panel_settings', 'footerStyle', { type: DataTypes.STRING(32), allowNull: true });
                logger.info('✅ panel_settings: footerStyle column added (auto-migration)');
            } catch (e) {
                if (!String(e.message || '').includes('already exists') && !String(e.message || '').includes('duplicate'))
                    logger.warn('panel_settings.footerStyle', e.message);
            }
        }
        const newThemeCols = [
            ['primaryColor', { type: DataTypes.STRING(20), allowNull: true }],
            ['fontFamily', { type: DataTypes.STRING(64), allowNull: true }],
            ['fontSize', { type: DataTypes.STRING(20), allowNull: true }],
            ['fontWeight', { type: DataTypes.STRING(20), allowNull: true }],
            ['uiTheme', { type: DataTypes.STRING(32), allowNull: true }],
            ['sidebarOrder', { type: DataTypes.TEXT, allowNull: true }],
        ];
        for (const [name, def] of newThemeCols) {
            if (desc && desc[name] === undefined) {
                try {
                    await qi.addColumn('panel_settings', name, def);
                    logger.info('✅ panel_settings: ' + name + ' column added (auto-migration)');
                } catch (e) {
                    if (!String(e.message || '').includes('already exists') && !String(e.message || '').includes('duplicate'))
                        logger.warn('panel_settings.' + name, e.message);
                }
            }
        }
    } catch (e) {
        logger.warn('panel_settings migration:', e.message);
    }

    try {
        const userDesc = await qi.describeTable('Users');
        if (userDesc && !userDesc.position) {
            await qi.addColumn('Users', 'position', { type: DataTypes.STRING, allowNull: true });
            logger.info('✅ Users: position column added (auto-migration)');
        }
    } catch (e) {
        if (!String(e.message || '').includes('already exists') && !String(e.message || '').includes('duplicate'))
            logger.warn('Users position migration:', e.message);
    }

    const defaultRateCurrencies = require('../../../lib/defaultRateCurrencies');
    const rateCurrencyCount = await RateCurrency.count();
    if (rateCurrencyCount === 0 && defaultRateCurrencies.length > 0) {
        await RateCurrency.bulkCreate(defaultRateCurrencies);
        logger.info('✅ ارزهای پیش‌فرض نرخ (RateCurrency) ثبت شدند');
    }

    if (!process.env.USE_SQLITE) {
        try {
            await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/whatsapp_crm', {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
            if (!mongoose.models.MessageLog) {
                const messageLogSchema = new mongoose.Schema(
                    {
                        conversationId: String,
                        customerId: String,
                        messageId: String,
                        content: String,
                        timestamp: Date,
                        metadata: Object,
                    },
                    { strict: false }
                );
                mongoose.model('MessageLog', messageLogSchema);
            }
            logger.info('✅ MongoDB Connected');
        } catch (mongoErr) {
            logger.warn('⚠️ MongoDB not available - continuing without analytics log');
        }
    }
}

module.exports = { runPostSync };

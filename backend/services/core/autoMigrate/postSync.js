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
                ['telegramNotifyAllEvents', { type: DataTypes.BOOLEAN, allowNull: true }],
                ['telegramNotifyApiRequests', { type: DataTypes.BOOLEAN, allowNull: true }],
                ['telegramNotifyAuthEvents', { type: DataTypes.BOOLEAN, allowNull: true }],
                ['telegramNotifySocketEvents', { type: DataTypes.BOOLEAN, allowNull: true }],
                ['telegramNotifyIncomingMessages', { type: DataTypes.BOOLEAN, allowNull: true }],
                ['telegramNotifySystemEvents', { type: DataTypes.BOOLEAN, allowNull: true }],
                ['telegramNotifyErrorEvents', { type: DataTypes.BOOLEAN, allowNull: true }],
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
            ['iosAppUrl', { type: DataTypes.TEXT, allowNull: true }],
            ['androidAppUrl', { type: DataTypes.TEXT, allowNull: true }],
            ['loginLogoUrl', { type: DataTypes.TEXT, allowNull: true }],
            ['navasanApiKey', { type: DataTypes.TEXT, allowNull: true }],
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
        const waDesc = await qi.describeTable('whatsapp_configs');
        if (waDesc && waDesc.conversationEndedMessage === undefined) {
            try {
                await qi.addColumn('whatsapp_configs', 'conversationEndedMessage', { type: DataTypes.TEXT, allowNull: true });
                logger.info('✅ whatsapp_configs: conversationEndedMessage column added (auto-migration)');
            } catch (e) {
                if (!String(e.message || '').includes('already exists') && !String(e.message || '').includes('duplicate'))
                    logger.warn('whatsapp_configs.conversationEndedMessage', e.message);
            }
        }
    } catch (e) {
        if (!String(e.message || '').includes('does not exist') && !String(e.message || '').includes('no such table'))
            logger.warn('whatsapp_configs migration:', e.message);
    }

    try {
        const connDesc = await qi.describeTable('whatsapp_connections');
        if (connDesc) {
            const connCols = [
                ['cloudBulkTemplateName', { type: DataTypes.STRING(128), allowNull: true }],
                ['cloudBulkTemplateLanguage', { type: DataTypes.STRING(16), allowNull: true, defaultValue: 'fa' }],
                ['numberFailoverEnabled', { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true }],
            ];
            for (const [name, def] of connCols) {
                if (connDesc[name] !== undefined) continue;
                try {
                    await qi.addColumn('whatsapp_connections', name, def);
                    logger.info('✅ whatsapp_connections: ' + name + ' column added (auto-migration)');
                } catch (e) {
                    if (!String(e.message || '').includes('already exists') && !String(e.message || '').includes('duplicate'))
                        logger.warn('whatsapp_connections.' + name, e.message);
                }
            }
            if (connDesc.lastLinkedGatewayNumber === undefined) {
                try {
                    await qi.addColumn('whatsapp_connections', 'lastLinkedGatewayNumber', {
                        type: DataTypes.STRING(32),
                        allowNull: true,
                    });
                    logger.info('✅ whatsapp_connections: lastLinkedGatewayNumber column added (auto-migration)');
                } catch (e) {
                    if (!String(e.message || '').includes('already exists') && !String(e.message || '').includes('duplicate'))
                        logger.warn('whatsapp_connections.lastLinkedGatewayNumber', e.message);
                }
            }
            if (connDesc.legacyLockdownAt === undefined) {
                try {
                    await qi.addColumn('whatsapp_connections', 'legacyLockdownAt', {
                        type: DataTypes.DATE,
                        allowNull: true,
                    });
                    logger.info('✅ whatsapp_connections: legacyLockdownAt column added (auto-migration)');
                } catch (e) {
                    if (!String(e.message || '').includes('already exists') && !String(e.message || '').includes('duplicate'))
                        logger.warn('whatsapp_connections.legacyLockdownAt', e.message);
                }
            }
        }
    } catch (e) {
        if (!String(e.message || '').includes('does not exist') && !String(e.message || '').includes('no such table'))
            logger.warn('whatsapp_connections migration:', e.message);
    }

    try {
        const custDesc = await qi.describeTable('Customers');
        if (custDesc && custDesc.isRestrictedFromStaff === undefined) {
            await qi.addColumn('Customers', 'isRestrictedFromStaff', {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            });
            logger.info('✅ Customers: isRestrictedFromStaff column added (auto-migration)');
        }
    } catch (e) {
        if (!String(e.message || '').includes('does not exist') && !String(e.message || '').includes('no such table'))
            logger.warn('Customers isRestrictedFromStaff migration:', e.message);
    }

    try {
        const dialect = sequelize.getDialect();
        if (dialect === 'postgres') {
            await sequelize.query(
                'CREATE UNIQUE INDEX IF NOT EXISTS messages_whatsapp_id_unique ON "Messages" ("whatsappId") WHERE "whatsappId" IS NOT NULL AND "whatsappId" <> \'\''
            );
            logger.info('✅ Messages: partial unique index on whatsappId ensured');
        } else if (dialect === 'sqlite') {
            await sequelize.query(
                'CREATE UNIQUE INDEX IF NOT EXISTS messages_whatsapp_id_unique ON Messages (whatsappId) WHERE whatsappId IS NOT NULL AND whatsappId <> \'\''
            );
            logger.info('✅ Messages: partial unique index on whatsappId ensured');
        }
    } catch (e) {
        logger.warn('Messages whatsappId unique index:', e.message);
    }

    try {
        const userDesc = await qi.describeTable('Users');
        if (userDesc && !userDesc.position) {
            await qi.addColumn('Users', 'position', { type: DataTypes.STRING, allowNull: true });
            logger.info('✅ Users: position column added (auto-migration)');
        }
        if (userDesc && !userDesc.lastSeenAt) {
            await qi.addColumn('Users', 'lastSeenAt', { type: DataTypes.DATE, allowNull: true });
            logger.info('✅ Users: lastSeenAt column added (auto-migration)');
        }
    } catch (e) {
        if (!String(e.message || '').includes('already exists') && !String(e.message || '').includes('duplicate'))
            logger.warn('Users position migration:', e.message);
    }

    try {
        const thDesc = await qi.describeTable('InternalThreads');
        if (thDesc && !thDesc.name) {
            await qi.addColumn('InternalThreads', 'name', { type: DataTypes.STRING(120), allowNull: true });
            logger.info('✅ InternalThreads: name column added');
        }
        if (thDesc && !thDesc.type) {
            await qi.addColumn('InternalThreads', 'type', {
                type: DataTypes.STRING(16),
                allowNull: false,
                defaultValue: 'dm'
            });
            logger.info('✅ InternalThreads: type column added');
        }
        if (thDesc && !thDesc.createdById) {
            await qi.addColumn('InternalThreads', 'createdById', { type: DataTypes.UUID, allowNull: true });
            logger.info('✅ InternalThreads: createdById column added');
        }
    } catch (e) {
        if (!String(e.message || '').includes('No description') && !String(e.message || '').includes('does not exist'))
            logger.warn('InternalThreads migration:', e.message);
    }

    try {
        const tpDesc = await qi.describeTable('InternalThreadParticipants');
        if (tpDesc && !tpDesc.lastReadAt) {
            await qi.addColumn('InternalThreadParticipants', 'lastReadAt', { type: DataTypes.DATE, allowNull: true });
            logger.info('✅ InternalThreadParticipants: lastReadAt column added');
        }
    } catch (e) {
        if (!String(e.message || '').includes('No description') && !String(e.message || '').includes('does not exist'))
            logger.warn('InternalThreadParticipants migration:', e.message);
    }

    try {
        const npDesc = await qi.describeTable('notification_preferences');
        const npCols = [
            ['accountLifecycleEmailEnabled', { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true }],
            ['accountLifecycleWhatsappEnabled', { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true }],
            ['accountLifecycleTelegramEnabled', { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true }],
        ];
        for (const [name, def] of npCols) {
            if (npDesc && npDesc[name] === undefined) {
                try {
                    await qi.addColumn('notification_preferences', name, def);
                    logger.info('✅ notification_preferences: ' + name + ' column added (auto-migration)');
                } catch (e) {
                    if (!String(e.message || '').includes('already exists') && !String(e.message || '').includes('duplicate'))
                        logger.warn('notification_preferences.' + name, e.message);
                }
            }
        }
    } catch (e) {
        if (!String(e.message || '').includes('No description') && !String(e.message || '').includes('does not exist'))
            logger.warn('notification_preferences migration:', e.message);
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

/**
 * Kaya CRM — نقطه ورود سرور API
 * @file    server.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 *
 * راه‌اندازی: DB، RabbitMQ، Socket.IO، cron — پیکربندی Express در app/configureExpress.js
 */
const { validateEnv } = require('./config/env');
const { MAIN_ADMIN_EMAIL, MAIN_ADMIN_PASSWORD } = validateEnv();

require('express-async-errors');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');

const logger = require('./config/logger');
const { allowedOrigins } = require('./config/cors');
const { connectDatabases } = require('./services/database');
const { ensureAdminUser } = require('./services/seed');
const { connectRabbitMQ, getRabbitChannel } = require('./services/rabbitmq');
const { checkUnansweredConversations } = require('./jobs/unansweredConversations');
const { startDailyRatesJob, stopDailyRatesJob } = require('./jobs/dailyRates');
const { startScheduledBackupJob, stopScheduledBackupJob } = require('./jobs/scheduledBackup');
const telegramBotService = require('./services/telegramBotService');
const { getPanelSettings, getPanelAlertConfig } = require('./services/panelSettingsLoader');
const models = require('./models');
const { sequelize } = models;
const { sendAdminSecurityAlert } = require('./services/adminAlertService');
const { notifySystemEvent } = require('./services/systemEventNotifier');
const { setMainAdminIncidentIo } = require('./services/mainAdminIncidentNotifier');
const { configureExpress } = require('./app/configureExpress');

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

const io = socketIo(server, {
    cors: {
        origin: (origin, cb) => {
            if (!origin) return cb(null, true);
            if (allowedOrigins.includes(origin)) return cb(null, true);
            cb(new Error(`CORS: origin not allowed: ${origin}`));
        },
        credentials: true,
        methods: ['GET', 'POST']
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
    allowUpgrades: true
});

const { redisClient } = configureExpress({ app, io, getRabbitChannel, logger, sequelize });
setMainAdminIncidentIo(io);

let unansweredInterval = null;
let isShuttingDown = false;

async function startServer() {
    try {
        await connectDatabases(logger);
        const { ensureDefaultDepartments } = require('./services/defaultDepartments');
        await ensureDefaultDepartments();
        await ensureAdminUser(MAIN_ADMIN_EMAIL, MAIN_ADMIN_PASSWORD, logger);

        try {
            const { ensureLegacyCutover } = require('./services/legacyCrmLockdown');
            const cut = await ensureLegacyCutover(null, { reason: 'startup' });
            if (cut && cut.changed) {
                logger.warn('Startup legacy CRM cutover applied', cut);
            }
        } catch (cutErr) {
            logger.warn('Startup legacy cutover skipped', { error: cutErr.message });
        }

        if (!String(process.env.WHATSAPP_MOBILE_USER_ID || '').trim()
            && !String(process.env.WHATSAPP_MOBILE_USER_EMAIL || '').trim()) {
            logger.warn(
                'WHATSAPP_MOBILE_USER_EMAIL is not set — mobile WhatsApp messages may be attributed to the wrong user (e.g. technical admin instead of business owner).'
            );
        }

        await connectRabbitMQ({ io, redisClient, logger });

        unansweredInterval = setInterval(() => checkUnansweredConversations(io, logger), 60000);

        try {
            const panelSettings = await getPanelSettings();
            const mergedToken = (getPanelAlertConfig(panelSettings).telegramBotToken || '').trim();
            const tgConfig = mergedToken ? { botToken: mergedToken } : null;
            await telegramBotService.startPolling(models, tgConfig);
        } catch (tgErr) {
            logger.warn('Telegram bot startup warning:', tgErr.message);
        }

        startDailyRatesJob();
        startScheduledBackupJob();

        const PORT = process.env.PORT || 3002;
        await new Promise((resolve, reject) => {
            server.listen(PORT, () => {
                logger.info(`🚀 CRM Backend running on port ${PORT}`);
                notifySystemEvent('system', 'Backend Started', { port: PORT, pid: process.pid }).catch(() => {});
                resolve();
            });
            server.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    logger.error(`❌ پورت ${PORT} در حال استفاده است. یک پروسه دیگر روی این پورت اجرا می‌شود.`);
                    logger.error('برای رفع: lsof -ti:' + PORT + ' | xargs kill -9');
                } else {
                    logger.error('Server error:', err);
                }
                if (process.env.NODE_ENV !== 'test') process.exit(1);
                reject(err);
            });
        });
    } catch (error) {
        logger.error('Server startup error:', error);
        if (process.env.NODE_ENV !== 'test') process.exit(1);
        throw error;
    }
}

const _startPromise = startServer();

async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`${signal} received — shutting down gracefully...`);
    notifySystemEvent('system', 'Backend Shutdown', { signal }).catch(() => {});

    if (unansweredInterval) {
        clearInterval(unansweredInterval);
        unansweredInterval = null;
    }
    telegramBotService.stopPolling();
    stopDailyRatesJob();
    stopScheduledBackupJob();

    const forceExitTimer = setTimeout(() => {
        logger.warn('Graceful shutdown timed out — forcing exit');
        process.exit(1);
    }, 15000);
    forceExitTimer.unref();

    server.close(async () => {
        try {
            await sequelize.close();
            if (mongoose.connection.readyState === 1) await mongoose.connection.close().catch(() => {});
            if (redisClient && !redisClient.isStub) redisClient.quit().catch(() => {});
            logger.info('All connections closed. Exiting.');
        } catch (e) {
            logger.error('Error during shutdown:', e);
        }
        clearTimeout(forceExitTimer);
        process.exit(0);
    });
}
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    notifySystemEvent('error', 'Uncaught Exception', { error: err.message, where: 'process:uncaughtException' }).catch(() => {});
    setImmediate(async () => {
        try {
            await sendAdminSecurityAlert('backend_error', {
                path: 'process:uncaughtException',
                errorMessage: `${err.message || 'uncaughtException'}\n${err.stack || ''}`
            });
        } catch (_) {}
    });
    gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason: String(reason) });
    notifySystemEvent('error', 'Unhandled Rejection', { reason: String(reason) }).catch(() => {});
    setImmediate(async () => {
        try {
            const msg = reason && reason.stack ? `${reason.message || 'Unhandled rejection'}\n${reason.stack}` : String(reason);
            await sendAdminSecurityAlert('backend_error', {
                path: 'process:unhandledRejection',
                errorMessage: msg
            });
        } catch (_) {}
    });
});

module.exports = { app, server, io, getRabbitChannel, ready: _startPromise };

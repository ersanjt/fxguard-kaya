/**
 * نقطه ورود سرور CRM — بارگذاری ماژول‌ها و راه‌اندازی
 */
const { validateEnv } = require('./config/env');
const { MAIN_ADMIN_EMAIL, MAIN_ADMIN_PASSWORD } = validateEnv();

require('express-async-errors');
const express = require('express');
const path = require('path');
const http = require('http');
const cookieParser = require('cookie-parser');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const mongoose = require('mongoose');

const logger = require('./config/logger');
const { allowedOrigins } = require('./config/cors');
const crypto = require('crypto');
const { createRedisClient } = require('./services/redis');
const { connectDatabases } = require('./services/database');
const { ensureAdminUser } = require('./services/seed');
const { connectRabbitMQ, getRabbitChannel } = require('./services/rabbitmq');
const { checkUnansweredConversations } = require('./jobs/unansweredConversations');
const { startDailyRatesJob, stopDailyRatesJob } = require('./jobs/dailyRates');
const telegramBotService = require('./services/telegramBotService');
const { getPanelSettings } = require('./services/panelSettingsLoader');
const { createApiRouter } = require('./routes/api');
const { setupSocketHandlers } = require('./socket/handlers');
const socketAuth = require('./middleware/socketAuth');
const models = require('./models');
const { sequelize } = models;
const errorHandler = require('./middleware/errorHandler');
const { sendAdminSecurityAlert } = require('./services/adminAlertService');
const { assertWebhookSecretBeforeBody } = require('./middleware/webhookAuth');
const { notifySystemEvent } = require('./services/systemEventNotifier');

// ==================== Express Setup ====================
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

// ==================== Middleware ====================
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "'unsafe-eval'",
                "https://cdnjs.cloudflare.com",
                "https://cdn.jsdelivr.net",
                "https://unpkg.com",
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://cdnjs.cloudflare.com",
                "https://cdn.jsdelivr.net",
                "https://fonts.googleapis.com",
            ],
            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com",
                "https://cdnjs.cloudflare.com",
            ],
            imgSrc: ["'self'", "data:", "blob:", "https:", "https://cdn.jsdelivr.net", "https://s3.iranserver.com"],
            mediaSrc: ["'self'", "blob:", "data:"],
            connectSrc: ["'self'", "wss:", "ws:"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
    },
    crossOriginEmbedderPolicy: false,
}));
app.use(cors({
    origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`CORS: origin not allowed: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(compression());
app.use(cookieParser());

/** مسیر یکتا برای تطبیق دیپلوی (با یا بدون پیشوند، اسلش تکراری) */
function normalizedRequestPath(req) {
    try {
        let u = String(req.originalUrl || req.url || req.path || '');
        u = u.split('?')[0].replace(/\/+/g, '/');
        if (u.length > 1 && u.endsWith('/')) u = u.slice(0, -1);
        return u;
    } catch (_) {
        return '';
    }
}
function isPostIncomingMessageWebhook(req) {
    return req.method === 'POST' && /\/webhook\/incoming-message$/i.test(normalizedRequestPath(req));
}
/** سقف بدنه وب‌هوک؛ حداکثر 50mb تا سوءاستفاده کمتر شود */
function resolveWebhookIncomingBodyLimit() {
    const raw = String(process.env.WEBHOOK_BODY_LIMIT || '25mb').trim().toLowerCase();
    const m = raw.match(/^(\d+)\s*mb$/);
    if (!m) return '25mb';
    const n = Math.min(50, Math.max(1, parseInt(m[1], 10)));
    return `${n}mb`;
}
const webhookIncomingBodyLimit = resolveWebhookIncomingBodyLimit();

// وب‌هوک پیام Gateway — احراز هویت قبل از پارس بدنه؛ سپس JSON تا 25mb (قابل تنظیم)
app.use((req, res, next) => {
    if (!isPostIncomingMessageWebhook(req)) return next();
    if (!assertWebhookSecretBeforeBody(req, res, logger)) return;
    return express.json({ limit: webhookIncomingBodyLimit })(req, res, next);
});
// Webhookهای دیگر در api.js — اینجا از json سراسری عبور می‌کنند
// بقیهٔ مسیرها 512kb
app.use((req, res, next) => {
    if (req.path && req.path.includes('/webhook/')) {
        return next();
    }
    express.json({ limit: '512kb' })(req, res, next);
});
app.use((req, res, next) => {
    if (req.path && req.path.includes('/webhook/')) {
        return next();
    }
    express.urlencoded({ extended: true, limit: '512kb' })(req, res, next);
});

// Request Correlation ID
app.use((req, res, next) => {
    req.id = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('X-Request-Id', req.id);
    next();
});

// ==================== Redis ====================
const redisClient = createRedisClient(logger);

// Rate Limiting — اگر Redis در دسترس باشد از Redis store استفاده می‌شود (multi-process safe)
// در غیر این صورت به in-memory fallback می‌رود
// لوکال بدون Redis: از حافظه استفاده کن تا timeout نشود
function buildRedisStore(prefix) {
    if (redisClient.isStub || process.env.USE_SQLITE === 'true') return undefined;
    try {
        const { RedisStore } = require('rate-limit-redis');
        return new RedisStore({
            sendCommand: (...args) => redisClient.sendCommand(args),
            prefix
        });
    } catch (_) {
        return undefined;
    }
}

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1500,
    message: { error: 'تعداد درخواست‌ها زیاد است. چند دقیقه صبر کنید.' },
    standardHeaders: true,
    legacyHeaders: false,
    store: buildRedisStore('rl:api:')
});
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'تعداد تلاش‌های ورود زیاد است. ۱۵ دقیقه صبر کنید.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    store: buildRedisStore('rl:login:')
});
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { error: 'تعداد درخواست‌های بازیابی رمز زیاد است. یک ساعت دیگر تلاش کنید.' },
    standardHeaders: true,
    legacyHeaders: false,
    store: buildRedisStore('rl:pwreset:')
});
app.use('/api/', (req, res, next) => {
    if (process.env.DISABLE_RATE_LIMIT === 'true') return next();
    const p = req.path || '';
    if (p.endsWith('/ping')) return next();
    if (p.endsWith('/auth/login') || p.endsWith('/auth/totp/verify-login')) return loginLimiter(req, res, next);
    if (p.endsWith('/auth/forgot-password') || p.endsWith('/auth/reset-password')) return passwordResetLimiter(req, res, next);
    return limiter(req, res, next);
});

// ==================== Socket.IO ====================
app.set('io', io);
app.set('redisClient', redisClient);
io.use(socketAuth);
setupSocketHandlers(io, getRabbitChannel, logger);

// ==================== API Routes ====================
app.use('/api', (req, res, next) => {
    const startedAt = Date.now();
    res.on('finish', () => {
        setImmediate(() => {
            const status = res.statusCode || 0;
            const category = status >= 500 ? 'error' : 'api';
            notifySystemEvent(category, 'API Request', {
                method: req.method,
                path: req.originalUrl || req.url,
                status,
                durationMs: Date.now() - startedAt,
                userId: req.user && req.user.id ? req.user.id : null,
                ip: (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim()
            }).catch(() => {});
        });
    });
    next();
});
app.use('/api', createApiRouter(io, getRabbitChannel, redisClient, logger));

// ==================== Static & Pages ====================
app.get('/health', async (req, res) => {
    const checks = {};
    let overallOk = true;

    // DB check
    try {
        await sequelize.authenticate();
        checks.database = { status: 'ok' };
    } catch (e) {
        checks.database = { status: 'error', error: 'DB unreachable' };
        overallOk = false;
    }

    // Redis check
    try {
        if (redisClient && !redisClient.isStub) {
            await redisClient.ping();
            checks.redis = { status: 'ok' };
        } else {
            checks.redis = { status: 'disabled' };
        }
    } catch (e) {
        checks.redis = { status: 'error', error: 'Redis unreachable' };
    }

    // RabbitMQ check (channel presence)
    const rabbitOk = !!getRabbitChannel();
    checks.rabbitmq = { status: rabbitOk ? 'ok' : 'disconnected' };

    const statusCode = overallOk ? 200 : 503;
    res.status(statusCode).json({
        status: overallOk ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        checks
    });
});

const REDIRECT_ROOT_TO_DASHBOARD_HOSTS = (process.env.REDIRECT_ROOT_TO_DASHBOARD_HOSTS || 'kaya.fxguard.io').split(',').map(h => h.trim().toLowerCase()).filter(Boolean);
app.get('/', (req, res) => {
    const host = (req.hostname || req.get('host') || '').toLowerCase();
    if (REDIRECT_ROOT_TO_DASHBOARD_HOSTS.some(h => host === h || host.endsWith('.' + h))) {
        return res.redirect(302, '/dashboard');
    }
    res.set('Cache-Control', 'public, max-age=300');
    res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});
app.get('/dashboard', (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});
app.get('/dashboard/', (req, res) => res.redirect('/dashboard'));
app.get('/dashboard.html', (req, res) => res.redirect('/dashboard'));
app.get('/contact', (req, res) => {
    res.set('Cache-Control', 'public, max-age=300');
    res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', (req, res, next) => {
    const ext = path.extname(req.path).toLowerCase();
    const inlineExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.mp4', '.webm', '.ogg', '.oga', '.opus', '.mp3', '.wav', '.aac', '.m4a', '.pdf'];
    const isInline = inlineExts.includes(ext);
    res.setHeader('Content-Disposition', isInline ? 'inline' : 'attachment');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
}, express.static(path.join(__dirname, 'uploads')));

// Centralized error handler — handles Sequelize, JWT, Multer, and generic errors
app.use(errorHandler);

// ==================== Startup ====================
let unansweredInterval = null;
let isShuttingDown = false;

async function startServer() {
    try {
        await connectDatabases(logger);
        const { ensureDefaultDepartments } = require('./services/defaultDepartments');
        await ensureDefaultDepartments();
        await ensureAdminUser(MAIN_ADMIN_EMAIL, MAIN_ADMIN_PASSWORD, logger);
        await connectRabbitMQ({ io, redisClient, logger });

        unansweredInterval = setInterval(() => checkUnansweredConversations(io, logger), 60000);

        // راه‌اندازی بات تلگرام
        try {
            const panelSettings = await getPanelSettings();
            const tgConfig = panelSettings && panelSettings.telegramBotToken
                ? { botToken: panelSettings.telegramBotToken }
                : null;
            await telegramBotService.startPolling(models, tgConfig);
        } catch (tgErr) {
            logger.warn('Telegram bot startup warning:', tgErr.message);
        }

        // راه‌اندازی job ارسال روزانه نرخ ارز
        startDailyRatesJob();

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

// Graceful shutdown — stop accepting new requests, finish in-flight, close connections
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

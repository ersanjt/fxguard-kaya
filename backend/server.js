/**
 * نقطه ورود سرور CRM — بارگذاری ماژول‌ها و راه‌اندازی
 */
const { validateEnv } = require('./config/env');
const { MAIN_ADMIN_EMAIL, MAIN_ADMIN_PASSWORD } = validateEnv();

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
const { createApiRouter } = require('./routes/api');
const { setupSocketHandlers } = require('./socket/handlers');
const socketAuth = require('./middleware/socketAuth');
const models = require('./models');
const { sequelize } = models;

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
            imgSrc: ["'self'", "data:", "blob:", "https:"],
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
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

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
function buildRedisStore(prefix) {
    if (redisClient.isStub) return undefined;
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
    const p = req.path || '';
    if (p.endsWith('/ping')) return next();
    if (p.endsWith('/auth/login') || p.endsWith('/auth/totp/verify-login')) return loginLimiter(req, res, next);
    if (p.endsWith('/auth/forgot-password') || p.endsWith('/auth/reset-password')) return passwordResetLimiter(req, res, next);
    return limiter(req, res, next);
});

// ==================== Socket.IO ====================
app.set('io', io);
io.use(socketAuth);
setupSocketHandlers(io, getRabbitChannel, logger);

// ==================== API Routes ====================
app.use('/api', createApiRouter(io, getRabbitChannel, redisClient, logger));

// ==================== Static & Pages ====================
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date(), uptime: process.uptime() });
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
    res.setHeader('Content-Disposition', 'attachment');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
}, express.static(path.join(__dirname, 'uploads')));

// Error handling — در production جزئیات خطا لو نمی‌رود
app.use((err, req, res, next) => {
    const isDev = process.env.NODE_ENV === 'development';
    logger.error('Unhandled error', { error: err.message, stack: isDev ? err.stack : undefined });
    if (res.headersSent) return next(err);
    res.status(500).json({
        error: 'خطای داخلی سرور',
        ...(isDev && { message: err.message })
    });
});

// ==================== Startup ====================
async function startServer() {
    try {
        await connectDatabases(logger);
        const { ensureDefaultDepartments } = require('./services/defaultDepartments');
        await ensureDefaultDepartments();
        await ensureAdminUser(MAIN_ADMIN_EMAIL, MAIN_ADMIN_PASSWORD, logger);
        await connectRabbitMQ({ io, redisClient, logger });

        setInterval(() => checkUnansweredConversations(io, logger), 60000);

        const PORT = process.env.PORT || 3002;
        server.listen(PORT, () => {
            logger.info(`🚀 CRM Backend running on port ${PORT}`);
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                logger.error(`❌ پورت ${PORT} در حال استفاده است. یک پروسه دیگر روی این پورت اجرا می‌شود.`);
                logger.error('برای رفع: lsof -ti:' + PORT + ' | xargs kill -9');
            } else {
                logger.error('Server error:', err);
            }
            process.exit(1);
        });
    } catch (error) {
        logger.error('Server startup error:', error);
        process.exit(1);
    }
}

startServer();

// Graceful shutdown
async function gracefulShutdown(signal) {
    logger.info(`${signal} received — shutting down gracefully...`);
    server.close(async () => {
        try {
            await sequelize.close();
            if (mongoose.connection.readyState === 1) await mongoose.connection.close().catch(() => {});
            redisClient.quit().catch(() => {});
            logger.info('All connections closed. Exiting.');
        } catch (e) {
            logger.error('Error during shutdown:', e);
        }
        process.exit(0);
    });
    setTimeout(() => {
        logger.warn('Graceful shutdown timed out — forcing exit');
        process.exit(1);
    }, 10000);
}
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = { io, getRabbitChannel };

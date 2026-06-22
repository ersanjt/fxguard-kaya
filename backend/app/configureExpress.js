'use strict';

/**
 * پیکربندی کامل پشتهٔ HTTP: میان‌افزار، API، استاتیک و هندلر خطا.
 * منطق از server.js جدا شده تا نقطهٔ ورود فقط راه‌اندازی و خاموشی را داشته باشد.
 */
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const crypto = require('crypto');

const { allowedOrigins } = require('../config/cors');
const { createRedisClient } = require('../services/redis');
const { createApiRouter } = require('../routes/api');
const { setupSocketHandlers } = require('../socket/handlers');
const socketAuth = require('../middleware/socketAuth');
const errorHandler = require('../middleware/errorHandler');
const { protectSensitiveUploads } = require('../middleware/protectedUploads');
const { assertWebhookSecretBeforeBody } = require('../middleware/webhookAuth');
const { onApiResponseFinished, deliverIncidentTelegram } = require('../services/incidentTelegramPolicy');

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

function resolveWebhookIncomingBodyLimit() {
    const raw = String(process.env.WEBHOOK_BODY_LIMIT || '25mb').trim().toLowerCase();
    const m = raw.match(/^(\d+)\s*mb$/);
    if (!m) return '25mb';
    const n = Math.min(50, Math.max(1, parseInt(m[1], 10)));
    return `${n}mb`;
}

/**
 * @param {object} deps
 * @param {import('express').Application} deps.app
 * @param {import('socket.io').Server} deps.io
 * @param {() => import('amqplib').Channel | null} deps.getRabbitChannel
 * @param {import('winston').Logger} deps.logger
 * @param {import('sequelize').Sequelize} deps.sequelize
 * @returns {{ redisClient: object }}
 */
function configureExpress({ app, io, getRabbitChannel, logger, sequelize }) {
    const webhookIncomingBodyLimit = resolveWebhookIncomingBodyLimit();

    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: [
                        "'self'",
                        "'unsafe-inline'",
                        'https://cdnjs.cloudflare.com',
                        'https://cdn.jsdelivr.net',
                        'https://unpkg.com',
                        'https://static.cloudflareinsights.com'
                    ],
                    // داشبورد فعلی هنوز onclick روی HTML تزریق‌شده دارد؛ بدون این، CSP سطح ۳ رویدادهای inline را مسدود می‌کند
                    scriptSrcAttr: ["'unsafe-inline'"],
                    styleSrc: [
                        "'self'",
                        "'unsafe-inline'",
                        'https://cdnjs.cloudflare.com',
                        'https://cdn.jsdelivr.net',
                        'https://fonts.googleapis.com'
                    ],
                    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
                    imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'https://cdn.jsdelivr.net', 'https://s3.iranserver.com'],
                    mediaSrc: ["'self'", 'blob:', 'data:'],
                    connectSrc: ["'self'", 'wss:', 'ws:', 'https://cdn.jsdelivr.net', 'https://static.cloudflareinsights.com'],
                    frameSrc: ["'none'"],
                    objectSrc: ["'none'"],
                    upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
                }
            },
            crossOriginEmbedderPolicy: false
        })
    );
    app.use(
        cors({
            origin: (origin, cb) => {
                if (!origin) return cb(null, true);
                if (allowedOrigins.includes(origin)) return cb(null, true);
                cb(new Error(`CORS: origin not allowed: ${origin}`));
            },
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
        })
    );
    app.use(compression());
    app.use(cookieParser());

    app.use((req, res, next) => {
        if (!isPostIncomingMessageWebhook(req)) return next();
        if (!assertWebhookSecretBeforeBody(req, res, logger)) return;
        return express.json({ limit: webhookIncomingBodyLimit })(req, res, next);
    });
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

    app.use((req, res, next) => {
        req.id = req.headers['x-request-id'] || crypto.randomUUID();
        res.setHeader('X-Request-Id', req.id);
        next();
    });

    const redisClient = createRedisClient(logger);

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
    const clientErrorLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 12,
        message: { error: 'تعداد گزارش خطا زیاد است. کمی صبر کنید.' },
        standardHeaders: true,
        legacyHeaders: false,
        store: buildRedisStore('rl:clienterr:')
    });
    app.use('/api/', (req, res, next) => {
        if (process.env.DISABLE_RATE_LIMIT === 'true') return next();
        const p = req.path || '';
        if (p.endsWith('/ping')) return next();
        if (p.endsWith('/auth/login') || p.endsWith('/auth/totp/verify-login')) return loginLimiter(req, res, next);
        if (p.endsWith('/auth/forgot-password') || p.endsWith('/auth/reset-password')) {
            return passwordResetLimiter(req, res, next);
        }
        if (p.endsWith('/client-errors') && req.method === 'POST') {
            return clientErrorLimiter(req, res, next);
        }
        return limiter(req, res, next);
    });

    app.set('io', io);
    app.set('redisClient', redisClient);
    io.use(socketAuth);
    setupSocketHandlers(io, getRabbitChannel, logger);

    app.use('/api', (req, res, next) => {
        const startedAt = Date.now();
        res.on('finish', () => {
            setImmediate(() => {
                try {
                    const status = res.statusCode || 0;
                    const hit = onApiResponseFinished({
                        method: req.method,
                        path: req.originalUrl || req.url,
                        status,
                        durationMs: Date.now() - startedAt,
                        userId: req.user && req.user.id ? req.user.id : null,
                        ip: (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim()
                    });
                    if (hit && hit.text) {
                        deliverIncidentTelegram(hit.text, hit.kind, hit.meta || {}).catch(() => {});
                    }
                } catch (_) {}
            });
        });
        next();
    });
    app.use('/api', createApiRouter(io, getRabbitChannel, redisClient, logger));

    app.get('/health', async (req, res) => {
        const checks = {};
        let dbOk = true;
        let degraded = false;

        try {
            await sequelize.authenticate();
            checks.database = { status: 'ok' };
        } catch (e) {
            checks.database = { status: 'error', error: 'DB unreachable' };
            dbOk = false;
        }

        try {
            if (redisClient && !redisClient.isStub) {
                await redisClient.ping();
                checks.redis = { status: 'ok' };
            } else {
                checks.redis = { status: 'disabled' };
            }
        } catch (e) {
            checks.redis = { status: 'error', error: 'Redis unreachable' };
            degraded = true;
        }

        const rabbitOk = !!getRabbitChannel();
        const rabbitConfigured = !!process.env.RABBITMQ_URL;
        checks.rabbitmq = { status: rabbitOk ? 'ok' : rabbitConfigured ? 'disconnected' : 'disabled' };
        if (!rabbitOk && rabbitConfigured) degraded = true;

        const statusCode = dbOk ? 200 : 503;
        const overallStatus = !dbOk ? 'error' : degraded ? 'degraded' : 'ok';
        res.status(statusCode).json({
            status: overallStatus,
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()),
            checks
        });
    });

    function serveLogin(req, res) {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
    }
    app.get('/', serveLogin);
    app.get('/login', serveLogin);
    app.get('/login/', (req, res) => res.redirect('/login'));

    app.use((req, res, next) => {
        const p = String(req.path || '').toLowerCase();
        if ((p === '/dashboard' || p === '/dashboard/') && req.query.reset === '1' && req.query.token) {
            return res.redirect(302, '/login?reset=1&token=' + encodeURIComponent(String(req.query.token)));
        }
        next();
    });

    app.get('/dashboard', (req, res) => {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
    });
    // Legacy deep-links like /dashboard/settings should open SPA sections via hash.
    app.get('/dashboard/:legacyPage', (req, res) => {
        const rawPage = String(req.params.legacyPage || '').trim().toLowerCase();
        const pageAlias = {
            settings: 'panel-settings',
            panel: 'panel-settings',
            ratescharts: 'rates-charts',
            rateschartsv2: 'rates-charts',
            internalchat: 'internal-chat',
            staffactivity: 'staff-activity'
        };
        const page = pageAlias[rawPage] || rawPage;
        const validPages = new Set([
            'dashboard',
            'conversations',
            'customers',
            'departments',
            'users',
            'tickets',
            'tasks',
            'processes',
            'whatsapp',
            'message-templates',
            'branches',
            'supervision',
            'staff-activity',
            'profile',
            'announcements',
            'internal-chat',
            'rates',
            'rates-charts',
            'services',
            'panel-settings'
        ]);
        return res.redirect(validPages.has(page) ? `/dashboard#${page}` : '/dashboard');
    });
    app.get('/dashboard/', (req, res) => res.redirect('/dashboard'));
    app.get('/dashboard.html', (req, res) => res.redirect('/dashboard'));
    app.get('/crm-build.json', (req, res) => {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.sendFile(path.join(__dirname, '..', 'public', 'crm-build.json'));
    });
    app.get('/contact', (req, res) => {
        res.set('Cache-Control', 'public, max-age=300');
        res.sendFile(path.join(__dirname, '..', 'public', 'contact.html'));
    });
    const publicDir = path.join(__dirname, '..', 'public');
    app.use(
        '/uploads',
        protectSensitiveUploads,
        (req, res, next) => {
            const ext = path.extname(req.path).toLowerCase();
            const inlineExts = [
                '.jpg',
                '.jpeg',
                '.png',
                '.gif',
                '.webp',
                '.mp4',
                '.webm',
                '.ogg',
                '.oga',
                '.opus',
                '.mp3',
                '.wav',
                '.aac',
                '.m4a',
                '.pdf'
            ];
            const isInline = inlineExts.includes(ext);
            res.setHeader('Content-Disposition', isInline ? 'inline' : 'attachment');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            next();
        },
        express.static(path.join(__dirname, '..', 'uploads'))
    );
    app.use(
        express.static(publicDir, {
            etag: true,
            lastModified: true,
            setHeaders: (res, filePath) => {
                const rel = path.relative(publicDir, filePath).replace(/\\/g, '/');
                if (rel.endsWith('.html')) {
                    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
                    res.setHeader('Pragma', 'no-cache');
                    return;
                }
                if (rel === 'crm-build.json') {
                    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
                    return;
                }
                if (/\.(js|css)$/.test(rel)) {
                    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
                    return;
                }
                if (/\.(png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf)$/.test(rel)) {
                    res.setHeader('Cache-Control', 'public, max-age=86400');
                }
            }
        })
    );

    app.use(errorHandler);

    return { redisClient };
}

module.exports = { configureExpress };

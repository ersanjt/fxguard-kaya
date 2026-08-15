/**
 * Kaya CRM — WhatsApp Gateway
 * @file    gateway/src/index.js
 * @layer   gateway
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const express = require('express');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
const amqp = require('amqplib');
const redis = require('redis');
const winston = require('winston');
const multer = require('multer');
const axios = require('axios');
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const { execFileSync } = require('child_process');
const { startOutgoingCall } = require('./waCalls');
const { createSendRateLimiter } = require('./sendRateLimiter');
require('dotenv').config();

// ==================== Config ====================
const CONFIG = {
    // امنیت
    gatewayApiSecret: process.env.GATEWAY_API_SECRET || '',
    secretMinLength: 32,

    // Rate limiting
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 200,
    sendLimitWindowMs: parseInt(process.env.SEND_LIMIT_WINDOW_MS) || 60 * 1000,
    sendLimitMax: parseInt(process.env.SEND_LIMIT_MAX) || 60,

    // اتصال مجدد خودکار — تأخیر اولیه طولانی‌تر تا واتساپ «الان نمی‌شود دستگاه وصل شود» نزند (rate limit)
    autoReconnect: process.env.WHATSAPP_AUTO_RECONNECT !== 'false',
    reconnectDelayMs: Math.max(10000, parseInt(process.env.WHATSAPP_RECONNECT_DELAY_MS) || 90000),
    reconnectMaxRetries: Math.max(1, parseInt(process.env.WHATSAPP_RECONNECT_MAX_RETRIES) || 10),
    reconnectBackoffMultiplier: parseFloat(process.env.WHATSAPP_RECONNECT_BACKOFF) || 1.5,

    // وب‌هوک Backend
    backendWebhookRetries: parseInt(process.env.BACKEND_WEBHOOK_RETRIES) || 5,
    backendWebhookRetryDelayMs: parseInt(process.env.BACKEND_WEBHOOK_RETRY_DELAY_MS) || 2000,

    // Media URL — whitelist اختیاری (خالی = فقط SSRF block)
    mediaUrlWhitelist: (process.env.MEDIA_URL_WHITELIST || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    // اجازه localhost برای رسانه (توسعه یا وقتی backend و gateway روی یک ماشین هستند)
    mediaAllowLocalhost:
        process.env.MEDIA_ALLOW_LOCALHOST === 'true' || process.env.NODE_ENV !== 'production',
};

let reconnectAttemptCount = 0;
let healthCheckFailCount = 0;

/** چند مبدأ با ویرگول — برای Vite (5173) و پنل روی بک‌اند (3002) */
function socketCorsOrigins() {
    const raw =
        process.env.FRONTEND_URL ||
        'http://localhost:3000,http://localhost:3002,http://localhost:5173,http://127.0.0.1:5173';
    const list = raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    if (list.length === 0) return 'http://localhost:3000';
    return list.length === 1 ? list[0] : list;
}

// ==================== App / Server ====================
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: socketCorsOrigins(),
        methods: ['GET', 'POST'],
    },
});

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Rate limiting (configurable) — وضعیت و QR برای پولینگ پنل محدود نمی‌شوند
// توجه: با app.use('/api/', limiter) مقدار req.path اینجا «بعد از mount» است → /status نه /api/status
function skipPanelPollingPaths(req) {
    const p = (req.path || '').split('?')[0];
    return p === '/status' || p === '/qr' || p === '/api/status' || p === '/api/qr';
}
const apiLimiter = rateLimit({
    windowMs: CONFIG.rateLimitWindowMs,
    max: CONFIG.rateLimitMax,
    message: { error: 'Too many requests' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => skipPanelPollingPaths(req),
});
app.use('/api/', apiLimiter);

/** Shared with RabbitMQ outgoing consumer — HTTP and queue share one send budget */
const outboundSendLimiter = createSendRateLimiter(CONFIG.sendLimitWindowMs, CONFIG.sendLimitMax);

async function sendRateLimitMiddleware(req, res, next) {
    try {
        await outboundSendLimiter.acquire();
        next();
    } catch (e) {
        res.status(429).json({ error: 'Rate limit exceeded' });
    }
}

// ✅ TEST ROUTE (must always work) — health check
app.get('/test', (req, res) => {
    res.status(200).json({ ok: true, ts: Date.now() });
});

// Uploads folder
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
const upload = multer({ dest: path.join(UPLOADS_DIR, 'tmp') });

const WHATSAPP_VOICE_MIME = 'audio/ogg; codecs=opus';
const WHATSAPP_VOICE_FILENAME = 'audio.ogg';
/** message IDs we sent via API — skip message_create echo to backend (avoids duplicate CRM rows) */
const recentGatewaySentIds = new Map();
/** during API sendMessage, message_create fires before we have the id — skip echo processing */
let outboundApiSendDepth = 0;

function markGatewaySentMessage(waMsgId) {
    if (!waMsgId) return;
    recentGatewaySentIds.set(String(waMsgId), Date.now() + 180000);
    if (recentGatewaySentIds.size > 400) {
        const now = Date.now();
        for (const [id, exp] of recentGatewaySentIds) {
            if (exp <= now) recentGatewaySentIds.delete(id);
        }
    }
}

/** Skip duplicate inbound events (message + message_create) before queue/webhook */
async function isDuplicateIncomingGatewayMessage(msgId) {
    if (!msgId || !redisClient?.isReady) return false;
    try {
        const key = `gateway:incoming:${String(msgId)}`;
        const ok = await redisClient.set(key, '1', { NX: true, EX: 172800 });
        return !ok;
    } catch (_) {
        return false;
    }
}

function isGatewaySentEcho(waMsgId) {
    if (!waMsgId) return false;
    const key = String(waMsgId);
    const exp = recentGatewaySentIds.get(key);
    if (!exp) return false;
    if (exp <= Date.now()) {
        recentGatewaySentIds.delete(key);
        return false;
    }
    recentGatewaySentIds.delete(key);
    return true;
}

function isVoiceMediaPayload(media) {
    if (!media) return false;
    const mime = String(media.mimetype || '')
        .split(';')[0]
        .trim()
        .toLowerCase();
    return !!(media.sendAsVoice || /^audio\/(ogg|opus)/i.test(mime));
}

async function buildOutboundMessageMedia(media, message) {
    if (!media?.data) return null;
    const mime = media.mimetype || 'application/octet-stream';
    const asVoice = isVoiceMediaPayload(media);
    if (asVoice) {
        const buf = Buffer.from(media.data, 'base64');
        if (!buf.length || buf.length < 64) {
            throw new Error('Voice payload empty or too small');
        }
        const tmpDir = path.join(UPLOADS_DIR, 'tmp');
        await ensureDir(tmpDir);
        const tmpPath = path.join(
            tmpDir,
            `ptt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.ogg`
        );
        await fs.writeFile(tmpPath, buf);
        const mediaObj = MessageMedia.fromFilePath(tmpPath);
        mediaObj.mimetype = WHATSAPP_VOICE_MIME;
        mediaObj.filename = WHATSAPP_VOICE_FILENAME;
        return { mediaObj, asVoice: true, tmpPath, mime: WHATSAPP_VOICE_MIME };
    }
    const mediaObj = new MessageMedia(mime, media.data, media.filename || null);
    return { mediaObj, asVoice: false, tmpPath: null, mime };
}

async function cleanupTempMedia(tmpPath) {
    if (!tmpPath) return;
    try {
        await fs.unlink(tmpPath);
    } catch (_) {}
}

// ==================== Logger ====================
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.Console(),
    ],
});

// ==================== Security ====================
const crypto = require('crypto');

function timingSafeEqual(a, b) {
    try {
        const bufA = Buffer.from(String(a));
        const bufB = Buffer.from(String(b));
        if (bufA.length !== bufB.length) {
            crypto.timingSafeEqual(bufA, bufA);
            return false;
        }
        return crypto.timingSafeEqual(bufA, bufB);
    } catch (_) {
        return false;
    }
}

function requireGatewaySecret(req, res, next) {
    if (!CONFIG.gatewayApiSecret) {
        if (process.env.NODE_ENV === 'production') {
            logger.error('GATEWAY_API_SECRET not set in production — blocking all API requests');
            return res.status(503).json({ error: 'Service unavailable' });
        }
        logger.warn('⚠️ GATEWAY_API_SECRET not set — API open (development only)');
        return next();
    }
    const secret =
        req.headers['x-gateway-secret'] || req.headers['authorization']?.replace(/^Bearer\s+/i, '');
    if (!secret || !timingSafeEqual(secret, CONFIG.gatewayApiSecret)) {
        logger.warn('Gateway API: unauthorized request', { ip: req.ip });
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

// Socket.IO: همان secret HTTP — بدون auth در production اتصال رد می‌شود
io.use((socket, next) => {
    if (!CONFIG.gatewayApiSecret) {
        if (process.env.NODE_ENV === 'production') {
            return next(new Error('Unauthorized'));
        }
        return next();
    }
    const secret =
        socket.handshake.auth?.secret ||
        socket.handshake.auth?.token ||
        socket.handshake.headers['x-gateway-secret'];
    if (secret && timingSafeEqual(secret, CONFIG.gatewayApiSecret)) {
        return next();
    }
    logger.warn('Gateway Socket: unauthorized connection', { ip: socket.handshake.address });
    next(new Error('Unauthorized'));
});

// ==================== Redis ====================
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', () => {});
redisClient
    .connect()
    .then(() => logger.info('✅ Redis connected'))
    .catch(() => logger.warn('⚠️ Redis not available - gateway continues'));

// ==================== RabbitMQ ====================
let rabbitChannel = null;
const INCOMING_QUEUE = process.env.RABBITMQ_INCOMING_QUEUE || 'whatsapp_messages';
const OUTGOING_QUEUE = process.env.RABBITMQ_OUTGOING_QUEUE || 'outgoing_messages';

async function connectRabbitMQ() {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
        rabbitChannel = await connection.createChannel();

        await rabbitChannel.assertQueue(INCOMING_QUEUE, { durable: true });
        await rabbitChannel.assertQueue(OUTGOING_QUEUE, { durable: true });

        logger.info('✅ Connected to RabbitMQ');
        if (String(process.env.INCOMING_VIA || 'http').toLowerCase() !== 'rabbit') {
            logger.info(
                '📥 Incoming messages use HTTP webhook (default). Set INCOMING_VIA=rabbit only if Backend consumes the queue.'
            );
        }

        const OUTGOING_DLQ = OUTGOING_QUEUE + '_dead';
        await rabbitChannel.assertQueue(OUTGOING_DLQ, { durable: true });

        rabbitChannel.consume(OUTGOING_QUEUE, async (msg) => {
            if (!msg) return;
            const retryCount =
                (msg.properties.headers && msg.properties.headers['x-retry-count']) || 0;
            const MAX_RETRIES = 3;
            try {
                await outboundSendLimiter.acquire();
                const data = JSON.parse(msg.content.toString());
                await sendWhatsAppMessage(data);
                rabbitChannel.ack(msg);
            } catch (e) {
                logger.error('Outgoing consume error', { error: e?.message, retryCount });
                if (retryCount < MAX_RETRIES) {
                    const delay = Math.pow(2, retryCount) * 2000;
                    setTimeout(() => {
                        try {
                            rabbitChannel.sendToQueue(OUTGOING_QUEUE, msg.content, {
                                persistent: true,
                                headers: { 'x-retry-count': retryCount + 1 },
                            });
                        } catch (_) {}
                    }, delay);
                    rabbitChannel.ack(msg);
                } else {
                    logger.error('Outgoing message failed after max retries — moving to DLQ', {
                        retryCount,
                    });
                    rabbitChannel.sendToQueue(OUTGOING_DLQ, msg.content, { persistent: true });
                    rabbitChannel.ack(msg);
                }
            }
        });
    } catch (error) {
        logger.warn('⚠️ RabbitMQ not available - gateway continues');
        rabbitChannel = null;
    }
}

// ==================== WhatsApp Client State ====================
let client = null;
let isClientReady = false;
let isClientStarting = false;
/** آخرین زمانی که رویداد ready آمد — برای soft-ready کوتاه‌مدت */
let lastReadyAt = 0;
/** عملیات سنگین روی صفحهٔ واتساپ (لیست گروه/…) — health check را موقتاً آرام کن */
let waOpsBusy = 0;

let lastQrImageDataUrl = null;
let lastAccountInfo = null;
let lastAuthFailureMessage = null;
/** وضعیت اتصال برای نمایش در پنل: qr | authenticated (اسکن شد، در حال همگام‌سازی) | ready | auth_failure */
let connectionPhase = null;

function beginWaOps() {
    waOpsBusy += 1;
}
function endWaOps() {
    waOpsBusy = Math.max(0, waOpsBusy - 1);
}

/**
 * آیا کلاینت برای عملیات (گروه/ارسال) قابل استفاده است؟
 * گاهی isClientReady لحظه‌ای false می‌شود در حالی که pupPage هنوز زنده است.
 * تا وقتی phase=ready و صفحهٔ کروم زنده است، usable می‌ماند (نه فقط ۹۰ثانیه).
 */
function isWhatsAppUsable() {
    if (client && isClientReady) return true;
    if (client && client.pupPage && lastReadyAt > 0 && connectionPhase === 'ready') {
        // بازیابی پرچم — جلوی 503های کاذب بعد از فلیکر isClientReady
        isClientReady = true;
        return true;
    }
    return false;
}

/** اگر سشن هنوز CONNECTED است، پرچم‌های ready را دوباره ست کن */
async function tryRestoreWhatsAppReady() {
    if (!client || !client.pupPage) return false;
    if (isClientReady && connectionPhase === 'ready') return true;
    try {
        const state = await Promise.race([
            client.getState(),
            new Promise((_, rej) => setTimeout(() => rej(new Error('restore_timeout')), 8000)),
        ]);
        if (state === 'CONNECTED') {
            isClientReady = true;
            isClientStarting = false;
            lastReadyAt = Date.now();
            connectionPhase = 'ready';
            healthCheckFailCount = 0;
            redisClient.set('whatsapp:status', 'ready').catch(() => {});
            logger.info('✅ WhatsApp ready restored via getState(CONNECTED)');
            return true;
        }
    } catch (e) {
        logger.warn('tryRestoreWhatsAppReady failed', { error: e?.message });
    }
    return false;
}

function getWhatsAppSessionPath() {
    return path.resolve(
        process.env.WHATSAPP_SESSION_PATH || path.join(process.cwd(), '.wwebjs_auth')
    );
}

/**
 * بعد از pm2 restart گاهی Chromium یتیم می‌ماند و userDataDir را قفل می‌کند
 * → حلقهٔ کرش «browser is already running». قفل و پروسهٔ یتیم را پاک کن.
 */
async function prepareChromeUserDataDir(sessionPath) {
    const root = sessionPath || getWhatsAppSessionPath();
    const userDataDir = path.join(root, 'session');
    const lockNames = ['SingletonLock', 'SingletonCookie', 'SingletonSocket'];

    async function unlinkLocks() {
        for (const name of lockNames) {
            try {
                await fs.unlink(path.join(userDataDir, name));
            } catch (_) {
                /* ignore */
            }
        }
    }

    await unlinkLocks();

    if (process.platform === 'linux') {
        const patterns = [
            userDataDir,
            root,
            // مسیر نسبی/مطلق در cmdline کروم
            'kayaCRM-kaya/gateway/sessions',
        ];
        for (const pattern of patterns) {
            try {
                execFileSync('pkill', ['-9', '-f', pattern], { stdio: 'ignore', timeout: 8000 });
                logger.warn('Killed orphan Chromium holding WhatsApp session profile', { pattern });
            } catch (_) {
                // pkill exit 1 = هیچ پروسه‌ای نبود
            }
        }
        await new Promise((r) => setTimeout(r, 1500));
        await unlinkLocks();
    }
}

function formatGatewayError(err) {
    if (!err) return 'unknown_error';
    if (typeof err === 'string' && err.trim()) return err.trim();
    const msg = err.message || err.originalMessage || err.name;
    if (msg && String(msg).trim().length > 1) return String(msg).trim();
    // خطاهای تک‌حرفی puppeteer («t»/«r») — از stack استفاده کن
    if (err.stack) {
        const line = String(err.stack).split('\n')[0];
        if (line && line.trim().length > 1) return line.trim();
    }
    try {
        const s = String(err);
        if (s && s !== '[object Object]' && s.length > 1) return s;
    } catch (_) {}
    return 'unknown_error';
}

function buildClient() {
    const sessionPath = getWhatsAppSessionPath();
    logger.info('WhatsApp session path', { sessionPath });

    const puppeteerArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--no-first-run',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-blink-features=AutomationControlled',
    ];
    const extraArgs = (process.env.PUPPETEER_ARGS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    if (extraArgs.length) puppeteerArgs.push(...extraArgs);

    // زمان بیشتر برای اسکن و همگام‌سازی (پیش‌فرض ۵ دقیقه؛ با env تا ۱۵ دقیقه قابل افزایش است)
    const authTimeoutMs = Math.max(
        120000,
        parseInt(process.env.WHATSAPP_AUTH_TIMEOUT_MS) || 300000
    );

    const clientOptions = {
        authStrategy: new LocalAuth({ dataPath: sessionPath }),
        authTimeout: authTimeoutMs,
        puppeteer: {
            headless: true,
            args: puppeteerArgs,
            // جلوگیری از Runtime.callFunctionOn timed out روی سشن‌های سنگین
            protocolTimeout: Math.max(
                120000,
                parseInt(process.env.PUPPETEER_PROTOCOL_TIMEOUT_MS, 10) || 180000
            ),
        },
    };
    if (process.env.WHATSAPP_WEB_VERSION_CACHE === 'none') {
        clientOptions.webVersionCache = { type: 'none' };
    }

    const c = new Client(clientOptions);

    attachClientEvents(c);
    return c;
}

function attachClientEvents(c) {
    c.on('qr', async (qr) => {
        try {
            logger.info('📱 QR Code Generated');

            qrcode.generate(qr, { small: true });

            const qrImage = await QRCode.toDataURL(qr);
            lastQrImageDataUrl = qrImage;

            io.emit('qr', { qr: qrImage });

            // cache in redis
            redisClient.set('whatsapp:qr', qrImage, { EX: 60 }).catch(() => {});
            redisClient.set('whatsapp:status', 'qr').catch(() => {});
            connectionPhase = 'qr';
        } catch (e) {
            logger.error('QR event error', { error: e?.message });
        }
    });

    c.on('authenticated', () => {
        lastAuthFailureMessage = null;
        connectionPhase = 'authenticated';
        logger.info('✅ WhatsApp Authenticated – syncing…');
        io.emit('authenticated', { status: 'success' });
        redisClient.set('whatsapp:status', 'authenticated').catch(() => {});
    });

    c.on('auth_failure', (msg) => {
        lastAuthFailureMessage = msg || 'unknown';
        connectionPhase = 'auth_failure';
        logger.error('❌ WhatsApp Auth Failure', { message: lastAuthFailureMessage });
        isClientStarting = false;
        io.emit('auth_failure', { message: lastAuthFailureMessage });
        redisClient.set('whatsapp:status', 'auth_failure').catch(() => {});
        redisClient
            .set('whatsapp:auth_failure_message', lastAuthFailureMessage, { EX: 300 })
            .catch(() => {});
    });

    c.on('ready', () => {
        isClientReady = true;
        isClientStarting = false;
        lastReadyAt = Date.now();
        reconnectAttemptCount = 0;
        lastAuthFailureMessage = null;
        connectionPhase = 'ready';

        logger.info('✅ WhatsApp Client Ready');
        io.emit('ready', { status: 'connected' });

        redisClient.set('whatsapp:status', 'ready').catch(() => {});

        try {
            const info = c.info;
            lastAccountInfo = {
                name: info?.pushname || null,
                number: info?.wid?.user || null,
                platform: info?.platform || null,
            };
            io.emit('account_info', lastAccountInfo);
            notifyBackendStatus('ready', null, {
                number: lastAccountInfo.number,
                name: lastAccountInfo.name,
            }).catch(() => {});
        } catch (_) {
            notifyBackendStatus('ready', null, {}).catch(() => {});
        }
    });

    c.on('disconnected', async (reason) => {
        const reasonStr = String(reason || '');
        logger.warn('⚠️ WhatsApp Disconnected', { reason: reasonStr });

        isClientReady = false;
        isClientStarting = false;
        connectionPhase = null;
        client = null;

        io.emit('disconnected', { reason: reasonStr });
        redisClient.set('whatsapp:status', 'disconnected').catch(() => {});

        // اطلاع به بکند برای ارسال هشدار ادمین
        notifyBackendStatus('disconnected', reasonStr).catch(() => {});

        if (reasonStr === 'stopped_by_api') {
            reconnectAttemptCount = 0;
            return;
        }

        if (reasonStr === 'logged_out') {
            // واتساپ سشن را باطل کرده — فولدر سشن را پاک کن تا QR جدید بگیری
            logger.warn('🔑 WhatsApp logged out — clearing session for fresh QR scan');
            try {
                const sessionPath = path.resolve(
                    process.env.WHATSAPP_SESSION_PATH || path.join(process.cwd(), '.wwebjs_auth')
                );
                await fs
                    .rm(path.join(sessionPath, 'session'), { recursive: true, force: true })
                    .catch(() => {});
            } catch (_) {}
            reconnectAttemptCount = 0;
            // ۱۰ ثانیه صبر کن بعد restart برای QR جدید
            setTimeout(() => {
                if (isClientReady || isClientStarting) return;
                logger.info('🔄 Restarting WhatsApp after logout — scan new QR in dashboard');
                startWhatsApp().catch((e) =>
                    logger.error('Restart after logout failed', { error: e?.message })
                );
            }, 10000);
            return;
        }

        // سایر دلایل (قطع شبکه، CONFLICT، ...) — اتصال مجدد خودکار
        if (CONFIG.autoReconnect) {
            scheduleReconnect();
        } else {
            reconnectAttemptCount = 0;
        }
    });

    c.on('message', async (msg) => {
        healthCheckFailCount = 0;
        try {
            const waIncomingId = msg?.id?.id;
            if (await isDuplicateIncomingGatewayMessage(waIncomingId)) return;
            const chat = await msg.getChat();
            // پیام خروجی چت مستقیم از message_create پردازش می‌شود — اینجا دوباره نفرست (echo دوبل در CRM)
            if (msg.fromMe && !chat?.isGroup) return;
            // برای گروه: getContact() با author فرستنده را برمی‌گرداند؛ برای چت مستقیم: contact فرستنده است
            const contact = await msg.getContact();
            let authorId = null;
            let authorName = null;
            if (chat?.isGroup && !msg.fromMe) {
                // چند منبع برای شناسه فرستنده (وابسته به نسخه whatsapp-web.js و پروتکل)
                let rawAuthor =
                    msg.author ||
                    msg._data?.participant ||
                    msg._data?.key?.participant ||
                    (msg.id && typeof msg.id === 'object' && (msg.id.participant || msg.id.from)) ||
                    (msg._data?.key &&
                        typeof msg._data.key === 'object' &&
                        msg._data.key.participant);
                // fallback: استخراج participant از _serialized (مثلاً false_groupId@g.us_msgId_98xxx@c.us)
                if (!rawAuthor && msg.id && typeof msg.id === 'object' && msg.id._serialized) {
                    const parts = String(msg.id._serialized).split('_');
                    // آخرین بخشی که شبیه JID کاربر است (نه گروه @g.us)
                    const jidPart = [...parts]
                        .reverse()
                        .find((p) => /@(c\.us|s\.whatsapp\.net|lid)$/.test(p));
                    if (jidPart) rawAuthor = jidPart;
                }
                authorId = rawAuthor
                    ? typeof rawAuthor === 'string'
                        ? rawAuthor
                        : rawAuthor?._serialized || rawAuthor?.id || rawAuthor
                    : null;
                if (authorId) {
                    try {
                        const authorContact = await client.getContactById(authorId);
                        authorName =
                            authorContact?.name ||
                            authorContact?.pushname ||
                            authorContact?.shortName ||
                            null;
                    } catch (_) {}
                }
                // fallback: نام فرستنده از پروتکل واتساپ
                if (!authorName && msg._data) {
                    authorName =
                        msg._data.notify ||
                        msg._data.pushName ||
                        msg._data.pushname ||
                        msg._data.senderName ||
                        null;
                    if (authorName) authorName = String(authorName).trim() || null;
                }
            }

            let contactNumber = contact?.number || null;
            let contactLid = null;
            try {
                const ser = contact?.id?._serialized || contact?.id || '';
                if (typeof ser === 'string' && /@lid$/i.test(ser)) {
                    contactLid = ser;
                    if (!contactNumber) contactNumber = null;
                } else if (
                    !contactNumber &&
                    typeof ser === 'string' &&
                    /@(c\.us|s\.whatsapp\.net)$/i.test(ser)
                ) {
                    contactNumber = String(ser).replace(/@(c\.us|s\.whatsapp\.net)$/i, '');
                }
            } catch (_) {}

            const messageData = {
                id: msg?.id?.id,
                from: msg.from,
                to: msg.to,
                body: msg.body,
                timestamp: msg.timestamp,
                hasMedia: msg.hasMedia,
                type: msg.type,
                isForwarded: msg.isForwarded,
                isStatus: msg.isStatus,
                isStarred: msg.isStarred,
                fromMe: msg.fromMe,
                contact: {
                    number: contactNumber,
                    lid: contactLid,
                    name: contact?.name || contact?.pushname || null,
                    isMyContact: contact?.isMyContact,
                    profilePicUrl: await contact.getProfilePicUrl().catch(() => null),
                },
                chat: {
                    id: chat?.id?._serialized,
                    name: chat?.name || chat?.subject || chat?.formattedTitle || null,
                    isGroup: chat?.isGroup || false,
                },
                author: authorId,
                authorName: authorName,
            };

            if (msg.hasMedia) {
                try {
                    const media = await msg.downloadMedia();
                    if (media) {
                        // برای نمایش در پنل: بک‌اند باید فایل را داشته باشد. ارسال data (base64) تا بک‌اند در uploads ذخیره و mediaData.url بگذارد.
                        messageData.media = {
                            mimetype: media.mimetype,
                            filename: media.filename || null,
                            data: media.data,
                        };
                    }
                } catch (error) {
                    logger.error('Media download/save error', { error: error?.message });
                }
            }

            // Send to backend (HTTP by default — see deliverIncomingMessage)
            await deliverIncomingMessage(messageData);

            // realtime dashboard
            io.emit('new_message', messageData);

            // short cache
            redisClient
                .hSet(`message:${messageData.id}`, 'data', JSON.stringify(messageData))
                .catch(() => {});
            redisClient.expire(`message:${messageData.id}`, 86400).catch(() => {});

            logger.info('📨 Message received', { from: contact?.number });
        } catch (error) {
            logger.error('Error processing message', {
                error: formatGatewayError(error),
                stack: error?.stack?.slice?.(0, 300),
            });
        }
    });

    c.on('message_ack', (msg, ack) => {
        const status = ['error', 'pending', 'server', 'device', 'read', 'played'];
        const statusStr = status[ack] || 'unknown';
        io.emit('message_status', { messageId: msg?.id?.id, status: statusStr });
        const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:3002';
        const secret = process.env.GATEWAY_API_SECRET || '';
        const webhookSecret = process.env.WEBHOOK_SECRET || '';
        axios
            .post(
                backendUrl + '/api/webhook/message-status',
                { messageId: msg?.id?.id, status: statusStr },
                {
                    headers: {
                        ...(secret ? { 'X-Gateway-Secret': secret } : {}),
                        ...(webhookSecret ? { 'x-webhook-secret': webhookSecret } : {}),
                    },
                    timeout: 5000,
                    validateStatus: () => true,
                }
            )
            .catch(() => {});
    });

    // پیام‌هایی که از موبایل یا دستگاه دیگر ارسال می‌شوند (fromMe)
    c.on('message_create', async (msg) => {
        try {
            if (!msg.fromMe) return; // فقط پیام‌های ارسالی خودمان
            const waEchoId = msg?.id?.id;
            // ارسال از API: echo قبل از markGatewaySentMessage می‌آید — فقط id را ثبت کن
            if (outboundApiSendDepth > 0) {
                markGatewaySentMessage(waEchoId);
                return;
            }
            if (isGatewaySentEcho(waEchoId)) {
                return;
            }
            if (await isDuplicateIncomingGatewayMessage(waEchoId)) return;
            const chat = await msg.getChat();
            if (chat?.isGroup) return; // گروه‌ها را نادیده بگیر
            let contact = null;
            try {
                contact = await chat.getContact();
            } catch (_) {
                /* LID / privacy: getContact گاهی fail می‌کند */
            }

            const messageData = {
                id: msg?.id?.id,
                from: msg.from,
                to: msg.to,
                body: msg.body,
                timestamp: msg.timestamp,
                hasMedia: msg.hasMedia,
                type: msg.type,
                isForwarded: msg.isForwarded,
                isStatus: msg.isStatus,
                fromMe: true,
                contact: {
                    number: contact?.number || null,
                    name: contact?.name || contact?.pushname || null,
                    isMyContact: contact?.isMyContact,
                    profilePicUrl: contact
                        ? await contact.getProfilePicUrl().catch(() => null)
                        : null,
                },
                chat: {
                    id: chat?.id?._serialized,
                    name: chat?.name || null,
                    isGroup: false,
                },
            };

            if (msg.hasMedia) {
                try {
                    const media = await msg.downloadMedia();
                    if (media) {
                        messageData.media = {
                            mimetype: media.mimetype,
                            filename: media.filename || null,
                            data: media.data,
                        };
                    }
                } catch (error) {
                    logger.error('message_create media download error', {
                        error: formatGatewayError(error),
                    });
                }
            }

            await deliverIncomingMessage(messageData);

            io.emit('new_message', messageData);
            logger.info('📤 Outgoing message from mobile captured', {
                to: contact?.number || msg.to || null,
            });
        } catch (error) {
            logger.error('Error processing message_create', {
                error: formatGatewayError(error),
                stack: error?.stack?.slice?.(0, 300),
            });
        }
    });
}

// ==================== Helpers ====================
async function ensureDir(dir) {
    try {
        await fs.mkdir(dir, { recursive: true });
    } catch (_) {}
}

async function sendToBackendWithRetry(messageData) {
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:3002';
    const webhookSecret = process.env.WEBHOOK_SECRET || '';
    const maxRetries = CONFIG.backendWebhookRetries;
    const baseDelay = CONFIG.backendWebhookRetryDelayMs;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const res = await axios.post(
                `${backendUrl}/api/webhook/incoming-message`,
                messageData,
                {
                    timeout: 15000,
                    validateStatus: () => true,
                    headers: webhookSecret ? { 'x-webhook-secret': webhookSecret } : {},
                }
            );
            if (res.status >= 200 && res.status < 300) return;
            logger.warn('Backend webhook rejected', {
                attempt: i + 1,
                status: res.status,
                error: res.data?.error || null,
            });
        } catch (err) {
            logger.warn('Backend webhook attempt failed', { attempt: i + 1, error: err?.message });
        }
        if (i < maxRetries - 1) await sleep(baseDelay * (i + 1));
    }
    logger.error('Backend webhook failed after retries – message may be lost', {
        from: messageData?.from,
    });
}

/**
 * تحویل پیام ورودی به Backend.
 * پیش‌فرض HTTP است — اگر Gateway به Rabbit وصل باشد ولی Backend consumer نداشته باشد
 * (health: rabbitmq disabled) پیام‌ها در صف گم می‌شوند. فقط با INCOMING_VIA=rabbit صف استفاده شود.
 */
async function deliverIncomingMessage(messageData) {
    const via = String(process.env.INCOMING_VIA || 'http').toLowerCase();
    if (via === 'rabbit' && rabbitChannel) {
        try {
            rabbitChannel.sendToQueue(INCOMING_QUEUE, Buffer.from(JSON.stringify(messageData)), {
                persistent: true,
            });
            return;
        } catch (e) {
            logger.warn('Rabbit incoming publish failed — falling back to HTTP', {
                error: e?.message,
            });
        }
    }
    await sendToBackendWithRetry(messageData);
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** اطلاع‌رسانی به بکند هنگام قطع/وصل شدن واتساپ */
async function notifyBackendStatus(event, reason, extra = {}) {
    try {
        const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:3002';
        const webhookSecret = process.env.WEBHOOK_SECRET || '';
        await axios.post(
            `${backendUrl}/api/webhook/gateway-status`,
            {
                event,
                reason: reason || null,
                number: extra.number || null,
                name: extra.name || null,
                timestamp: new Date().toISOString(),
            },
            {
                timeout: 5000,
                validateStatus: () => true,
                headers: webhookSecret ? { 'x-webhook-secret': webhookSecret } : {},
            }
        );
    } catch (_) {}
}

/** زمانبندی اتصال مجدد با exponential backoff — بی‌نهایت تلاش می‌کند */
function scheduleReconnect() {
    if (isClientReady || isClientStarting) return;

    const maxBeforeLongWait = CONFIG.reconnectMaxRetries;
    if (reconnectAttemptCount >= maxBeforeLongWait) {
        // بعد از ۱۰ تلاش، هر ۱۰ دقیقه یکبار ادامه می‌دهد
        logger.warn('🔄 Max quick retries reached — switching to 10-min interval retry', {
            attempts: reconnectAttemptCount,
        });
        reconnectAttemptCount = 0;
        setTimeout(
            () => {
                if (isClientReady || isClientStarting) return;
                logger.info('🔄 Long-interval reconnect attempt...');
                client = null;
                startWhatsApp().catch((e) =>
                    logger.error('Long-interval reconnect failed', { error: e?.message })
                );
            },
            10 * 60 * 1000
        );
        return;
    }

    const delay = Math.min(
        CONFIG.reconnectDelayMs *
            Math.pow(CONFIG.reconnectBackoffMultiplier, reconnectAttemptCount),
        300000
    );
    reconnectAttemptCount++;
    logger.info('🔄 Auto-reconnect scheduled', {
        attempt: reconnectAttemptCount,
        delayMs: Math.round(delay),
    });
    setTimeout(() => {
        if (isClientReady || isClientStarting) return;
        logger.info('🔄 Attempting auto-reconnect...');
        startWhatsApp()
            .then(() => {
                reconnectAttemptCount = 0;
            })
            .catch((e) => logger.error('Auto-reconnect failed', { error: e?.message }));
    }, delay);
}

function normalizePhoneToChatId(phoneOrJid) {
    if (!phoneOrJid || typeof phoneOrJid !== 'string') return null;
    const v = phoneOrJid.trim();
    if (!v) return null;
    if (v.includes('@g.us') || v.includes('@s.whatsapp.net')) return v;

    // رقم‌ها را از JID هم بگیر؛ ۰۰ بین‌المللی / صفر محلی را بردار تا «۰۰۹۸…@lid» ساخته نشود
    let digits = v.replace(/\D/g, '');
    while (digits.startsWith('00')) digits = digits.slice(2);
    if (/^0\d{9,11}$/.test(digits)) digits = digits.slice(1);
    if (!digits) return null;
    if (digits.length <= 10 && !digits.startsWith('98') && /^9\d{9}$/.test(digits)) {
        digits = '98' + digits;
    }

    // پیش‌شماره‌های رایج → شماره واقعی؛ در غیر این صورت LID واتساپ
    const phoneLike =
        /^989\d{9}$/.test(digits) ||
        /^90\d{10}$/.test(digits) ||
        /^971\d{8,9}$/.test(digits) ||
        /^(1|7|20|27|30|31|32|33|34|39|44|45|46|47|48|49|61|62|63|65|66|81|82|84|86|91|92|93|94|966|964|994)\d{8,12}$/.test(
            digits
        );
    if (phoneLike) return `${digits}@c.us`;
    // فقط LID واقعی (نه شمارهٔ اشتباه‌تگ‌شده با @lid)
    if (/@lid$/i.test(v) || !/@c\.us$/i.test(v)) return `${digits}@lid`;
    return `${digits}@c.us`;
}

/**
 * Resolve outbound chat id; try getNumberId for phone-like targets.
 */
async function resolveOutboundChatId(to) {
    const base = normalizePhoneToChatId(String(to || ''));
    if (!base) return null;
    if (base.includes('@g.us') || base.includes('@lid')) return base;
    if (!client || !isClientReady) return base;
    const digits = base.replace(/@c\.us$/i, '').replace(/\D/g, '');
    if (!digits) return base;
    try {
        const numberId = await client.getNumberId(digits);
        if (numberId && (numberId._serialized || numberId.user)) {
            return numberId._serialized || `${numberId.user}@c.us`;
        }
    } catch (_) {}
    return base;
}

// SSRF protection + optional whitelist
function isSafeMediaUrl(url) {
    if (!url || typeof url !== 'string') return false;
    try {
        const u = new URL(url.trim());
        if (!['http:', 'https:'].includes(u.protocol)) return false;
        const host = u.hostname.toLowerCase();

        if (CONFIG.mediaUrlWhitelist.length > 0) {
            const allowed = CONFIG.mediaUrlWhitelist.some(
                (d) => host === d || host.endsWith('.' + d)
            );
            return allowed;
        }

        // localhost مجاز وقتی MEDIA_ALLOW_LOCALHOST=true یا در محیط توسعه (برای ارسال ویس و رسانه)
        if (CONFIG.mediaAllowLocalhost && (host === 'localhost' || host === '127.0.0.1'))
            return true;
        if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) return false;
        if (
            host.startsWith('10.') ||
            host.startsWith('172.16.') ||
            host.startsWith('172.17.') ||
            host.startsWith('172.18.') ||
            host.startsWith('172.19.') ||
            host.startsWith('172.2') ||
            host.startsWith('172.30.') ||
            host.startsWith('172.31.') ||
            host.startsWith('192.168.')
        )
            return false;
        if (host === '0.0.0.0' || host === '::1') return false;
        return true;
    } catch (_) {
        return false;
    }
}

// ==================== WhatsApp Controls ====================
async function startWhatsApp() {
    if (isClientReady) return { ok: true, status: 'already_ready' };
    if (isClientStarting) return { ok: true, status: 'starting' };

    // اگر صفحهٔ کروم هنوز زنده است، اول بازیابی کن — initialize مجدد سشن آماده را خراب می‌کند
    if (client?.pupPage) {
        const restored = await tryRestoreWhatsAppReady();
        if (restored) return { ok: true, status: 'already_ready' };
    }

    isClientStarting = true;
    isClientReady = false;
    lastAuthFailureMessage = null;
    connectionPhase = null;

    try {
        const sessionPath = getWhatsAppSessionPath();
        await ensureDir(sessionPath);
        await prepareChromeUserDataDir(sessionPath);

        if (!client) {
            client = buildClient();
        } else if (client.pupPage) {
            // کلاینت نیمه‌جان — قبل از initialize دوباره، اول destroy تمیز
            try {
                await Promise.race([
                    client.destroy(),
                    new Promise((_, rej) =>
                        setTimeout(() => rej(new Error('destroy_timeout')), 12000)
                    ),
                ]);
            } catch (_) {}
            client = null;
            client = buildClient();
        }

        redisClient.set('whatsapp:status', 'starting').catch(() => {});
        await Promise.resolve(client.initialize());
        return { ok: true, status: 'initializing' };
    } catch (e) {
        isClientStarting = false;
        const msg = e?.message || 'start_failed';
        logger.error('Start WhatsApp error', { error: msg });
        if (/browser is already running/i.test(msg)) {
            try {
                await prepareChromeUserDataDir(getWhatsAppSessionPath());
            } catch (_) {}
            try {
                resetClientState();
            } catch (_) {}
            scheduleReconnect();
            return { ok: false, error: msg, recovering: true };
        }
        return { ok: false, error: msg };
    }
}

async function stopWhatsApp() {
    const toDestroy = client;
    if (!toDestroy) return { ok: true, status: 'already_stopped' };

    isClientReady = false;
    isClientStarting = false;
    connectionPhase = null;
    client = null;
    lastQrImageDataUrl = null;

    redisClient.set('whatsapp:status', 'stopping').catch(() => {});
    io.emit('disconnected', { reason: 'stopped_by_api' });

    try {
        const destroyTimeout = 15000;
        await Promise.race([
            toDestroy.destroy(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('destroy_timeout')), destroyTimeout)
            ),
        ]);
    } catch (e) {
        logger.warn('Stop WhatsApp: destroy finished with error (client cleared)', {
            error: e?.message,
        });
    }

    redisClient.set('whatsapp:status', 'stopped').catch(() => {});
    return { ok: true, status: 'stopped' };
}

// ==================== API Endpoints ====================
// All /api/* (except /test) require secret when GATEWAY_API_SECRET is set
app.use('/api/', requireGatewaySecret);

// /api/status: بدون await Redis — همیشه سریع پاسخ بده؛ در صورت auth_failure پیام خطا برگردانده می‌شود
app.get('/api/status', async (req, res) => {
    let usable = isWhatsAppUsable();
    // اگر phase=ready ولی usable لحظه‌ای false است، یک‌بار از getState بازیابی کن
    if (!usable && client && connectionPhase === 'ready') {
        usable = await tryRestoreWhatsAppReady();
    }
    const status = usable ? 'ready' : isClientStarting ? 'starting' : 'disconnected';
    const body = {
        whatsapp: usable,
        starting: isClientStarting,
        redis: redisClient?.isReady || false,
        rabbitmq: !!rabbitChannel,
        status,
        usable,
    };
    if ((usable || connectionPhase === 'ready') && lastAccountInfo) {
        body.pushname = lastAccountInfo.name;
        body.number = lastAccountInfo.number;
    }
    if (lastAuthFailureMessage) body.authFailure = lastAuthFailureMessage;
    else if (redisClient?.isReady) {
        try {
            const cached = await redisClient.get('whatsapp:auth_failure_message');
            if (cached) body.authFailure = cached;
        } catch (_) {}
    }
    if (connectionPhase) body.phase = connectionPhase;
    res.json(body);
});

// /api/qr: اول از memory، بعد Redis با timeout
app.get('/api/qr', async (req, res) => {
    if (lastQrImageDataUrl) return res.json({ qr: lastQrImageDataUrl });

    let qr = null;
    if (redisClient?.isReady) {
        try {
            qr = await Promise.race([
                redisClient.get('whatsapp:qr'),
                new Promise((_, rj) => setTimeout(() => rj(new Error('timeout')), 1500)),
            ]);
        } catch (_) {}
    }

    if (qr) return res.json({ qr });
    return res.status(404).json({ error: 'QR not available' });
});

app.post('/api/start', async (req, res) => {
    const result = await startWhatsApp();
    if (!result.ok) return res.status(500).json(result);
    return res.json(result);
});

app.post('/api/stop', async (req, res) => {
    const result = await stopWhatsApp();
    if (!result.ok) return res.status(500).json(result);
    return res.json(result);
});

app.post('/api/logout', async (req, res) => {
    try {
        if (client) {
            isClientReady = false;
            isClientStarting = false;

            await client.logout().catch(() => {});
            await client.destroy().catch(() => {});
            client = null;
        }

        const sessionPath = path.resolve(
            process.env.WHATSAPP_SESSION_PATH || path.join(process.cwd(), '.wwebjs_auth')
        );
        const fs = require('fs');
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            logger.info('Session folder deleted for fresh QR', { sessionPath });
        }

        redisClient.set('whatsapp:status', 'logged_out').catch(() => {});
        redisClient.del('whatsapp:qr').catch(() => {});

        lastQrImageDataUrl = null;
        connectionPhase = null;
        lastAuthFailureMessage = null;

        io.emit('disconnected', { reason: 'logged_out' });
        res.json({ ok: true, status: 'logged_out' });
    } catch (e) {
        logger.error('Logout error', { error: e?.message });
        res.status(500).json({ ok: false, error: e?.message || 'logout_failed' });
    }
});

app.post('/api/send-message', sendRateLimitMiddleware, async (req, res) => {
    let tmpMediaPath = null;
    let chatId;
    try {
        if (!isWhatsAppUsable()) return res.status(503).json({ error: 'WhatsApp not ready' });

        const { to, message, media, replyTo } = req.body || {};
        if (!to || (!message && !media)) return res.status(400).json({ error: 'Invalid payload' });

        chatId = await resolveOutboundChatId(to);
        if (!chatId) return res.status(400).json({ error: 'Invalid recipient' });

        let sentMsg;
        const sendOpts = replyTo ? { quotedMessageId: replyTo } : {};
        const doSend = async (targetChatId) => {
            if (media?.data) {
                const built = await buildOutboundMessageMedia(media, message);
                if (!built) {
                    const err = new Error('Invalid media payload');
                    err.statusCode = 400;
                    throw err;
                }
                tmpMediaPath = built.tmpPath;
                if (built.asVoice) {
                    sendOpts.sendAudioAsVoice = true;
                } else {
                    sendOpts.caption = message || '';
                }
                logger.info('📎 Sending media (data)', {
                    to: targetChatId,
                    mime: built.mime,
                    asVoice: built.asVoice,
                    dataLen: (media.data || '').length,
                });
                return client.sendMessage(targetChatId, built.mediaObj, sendOpts);
            }
            if (media?.url) {
                if (!isSafeMediaUrl(media.url)) {
                    const err = new Error('Invalid or unsafe media URL');
                    err.statusCode = 400;
                    throw err;
                }
                const mediaObj = await MessageMedia.fromUrl(media.url);
                const asVoice = !!(
                    media.sendAsVoice ||
                    (media.mimetype && /^audio\/(ogg|opus)/i.test(media.mimetype))
                );
                if (asVoice) {
                    sendOpts.sendAudioAsVoice = true;
                } else {
                    sendOpts.caption = message || '';
                }
                logger.info('📎 Sending media (url)', {
                    to: targetChatId,
                    mime: mediaObj?.mimetype,
                    asVoice,
                });
                return client.sendMessage(targetChatId, mediaObj, sendOpts);
            }
            return client.sendMessage(targetChatId, message || '', sendOpts);
        };

        outboundApiSendDepth += 1;
        try {
            sentMsg = await Promise.race([
                doSend(chatId),
                new Promise((_, reject) =>
                    setTimeout(() => {
                        const err = new Error('send_timeout');
                        err.statusCode = 503;
                        reject(err);
                    }, 45000)
                ),
            ]);
        } finally {
            outboundApiSendDepth = Math.max(0, outboundApiSendDepth - 1);
        }

        markGatewaySentMessage(sentMsg?.id?.id);
        logger.info('✉️ Message sent', {
            to: chatId,
            messageId: sentMsg?.id?.id,
            hasMedia: !!media,
        });
        return res.json({ success: true, messageId: sentMsg?.id?.id, chatId });
    } catch (error) {
        let status = error?.statusCode || 500;
        let errMsg = formatGatewayError(error);
        const protocolLike =
            /send_timeout|timeout|ProtocolError|Target closed|Session closed|Runtime\.callFunctionOn|Execution context was destroyed|Navigating frame was detached|^Error:\s*[a-z]$/i.test(
                errMsg
            ) || /^[a-z]$/i.test(String(error?.message || '').trim());
        if (protocolLike) {
            status = 503;
            if (/send_timeout/i.test(errMsg)) {
                errMsg = 'WhatsApp send timed out — browser session may be stuck; restart gateway';
            }
            // ready اما صفحه مرده — reconnect تا CRM گیر نکند
            isClientReady = false;
            scheduleReconnect();
        }
        logger.error('Send message error', {
            error: errMsg,
            status,
            to: req.body?.to,
            chatId,
            stack: error?.stack?.slice?.(0, 500),
        });
        return res.status(status).json({ error: errMsg || 'send_failed' });
    } finally {
        await cleanupTempMedia(tmpMediaPath);
    }
});

// تماس صوتی/تصویری — از طریق UI واتساپ وب یا ارسال لینک تماس
app.post('/api/calls/start', sendRateLimitMiddleware, async (req, res) => {
    try {
        if (!isWhatsAppUsable()) return res.status(503).json({ error: 'WhatsApp not ready' });

        const { to, type, introText } = req.body || {};
        if (!to) return res.status(400).json({ error: 'to is required' });
        const isVideo = type === 'video';
        const chatId = normalizePhoneToChatId(String(to)) || String(to).trim();
        if (!chatId) return res.status(400).json({ error: 'Invalid recipient' });

        const result = await startOutgoingCall(client, chatId, isVideo, logger, { introText });
        return res.json({ success: true, ...result });
    } catch (error) {
        const msg = formatGatewayError(error);
        const status = error?.statusCode || 500;
        if (status === 400 || /invalid_recipient|to is required/i.test(msg)) {
            return res.status(400).json({ error: msg });
        }
        if (
            status === 503 ||
            /call_link_failed|not ready|timeout|Protocol|Target closed|Session closed|^[a-z]$/i.test(
                msg
            )
        ) {
            return res.status(503).json({
                error:
                    msg === 'call_link_failed'
                        ? 'امکان ایجاد لینک تماس وجود ندارد. نسخه واتساپ وب را بررسی کنید.'
                        : msg || 'WhatsApp call unavailable',
            });
        }
        logger.error('Start call error', { error: msg, stack: error?.stack?.slice?.(0, 400) });
        return res.status(503).json({ error: msg || 'call_failed' });
    }
});

// لیست گروه‌های واتساپ — برای همگام‌سازی با CRM
/** آخرین لیست موفق گروه‌ها (fallback وقتی getChats سنگین/خراب است) */
let lastGroupsCache = { at: 0, groups: [] };
/** آخرین لیست موفق همهٔ چت‌ها (خصوصی + گروه) */
let lastChatsCache = { at: 0, chats: [] };

async function listWhatsAppGroupsFromStore() {
    if (!client?.pupPage) throw new Error('pupPage_unavailable');
    return client.pupPage.evaluate(() => {
        // runs inside WhatsApp Web Chromium page
        // eslint-disable-next-line no-undef
        const store = window.Store;
        if (!store) return [];

        function collectModels(collection) {
            if (!collection) return [];
            try {
                if (typeof collection.getModelsArray === 'function') {
                    return collection.getModelsArray() || [];
                }
            } catch (_) {}
            try {
                if (Array.isArray(collection.models)) return collection.models;
            } catch (_) {}
            try {
                if (collection._models) return Object.values(collection._models);
            } catch (_) {}
            try {
                if (typeof collection.map === 'function') {
                    const arr = [];
                    collection.map(function (m) {
                        arr.push(m);
                    });
                    return arr;
                }
            } catch (_) {}
            return [];
        }

        function jidOf(model) {
            if (!model) return null;
            const id = model.id;
            if (!id) return null;
            if (id._serialized) return String(id._serialized);
            if (id.user && id.server) return String(id.user) + '@' + String(id.server);
            return null;
        }

        const seen = Object.create(null);
        const out = [];

        function pushGroup(ser, name) {
            if (!ser || !String(ser).endsWith('@g.us')) return;
            if (seen[ser]) {
                if (name && !seen[ser].name) seen[ser].name = String(name);
                return;
            }
            const row = { id: String(ser), name: name ? String(name) : null };
            seen[ser] = row;
            out.push(row);
        }

        // ۱) همهٔ گروه‌هایی که حساب عضو آن‌هاست (حتی بدون پیام اخیر در Chat list)
        const metas = collectModels(store.GroupMetadata);
        for (let i = 0; i < metas.length; i++) {
            const m = metas[i];
            const ser = jidOf(m);
            const name = (m && (m.subject || m.name || m.formattedTitle)) || null;
            pushGroup(ser, name);
        }

        // ۲) گروه‌های حاضر در لیست چت (نام ممکن است بهتر باشد)
        const chats = collectModels(store.Chat);
        for (let i = 0; i < chats.length; i++) {
            const c = chats[i];
            const ser = jidOf(c);
            if (!ser || !String(ser).endsWith('@g.us')) continue;
            const name =
                (c &&
                    (c.name ||
                        c.formattedTitle ||
                        c.verifiedName ||
                        (c.contact && (c.contact.name || c.contact.pushname)) ||
                        (c.groupMetadata && c.groupMetadata.subject))) ||
                null;
            pushGroup(ser, name);
        }

        return out;
    });
}

async function listWhatsAppGroups() {
    if (!isWhatsAppUsable()) {
        const restored = await tryRestoreWhatsAppReady();
        if (!restored) {
            const err = new Error('WhatsApp not ready');
            err.statusCode = 503;
            throw err;
        }
    }

    // مسیر سبک: فقط گروه‌ها از Store — getChats() روی سشن‌های بزرگ timeout/«r» می‌دهد
    try {
        const fromStore = await Promise.race([
            listWhatsAppGroupsFromStore(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('getGroups_store_timeout')), 15000)
            ),
        ]);
        if (Array.isArray(fromStore) && fromStore.length > 0) {
            lastGroupsCache = { at: Date.now(), groups: fromStore };
            logger.info('WhatsApp groups listed from Store', { count: fromStore.length });
            return fromStore;
        }
        if (Array.isArray(fromStore) && fromStore.length === 0) {
            logger.info('Store returned 0 groups — trying getChats fallback');
        }
    } catch (storeErr) {
        logger.warn('Group list via Store failed — falling back to getChats', {
            error: formatGatewayError(storeErr),
        });
    }

    try {
        const chats = await Promise.race([
            client.getChats(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('getChats_timeout')), 25000)
            ),
        ]);
        const list = Array.isArray(chats) ? chats : [];
        const groups = list
            .filter((c) => c && c.isGroup)
            .map((c) => ({
                id: (c.id && (c.id._serialized || c.id)) || null,
                name: c.name || c.subject || c.formattedTitle || null,
            }))
            .filter((g) => g.id);
        lastGroupsCache = { at: Date.now(), groups };
        return groups;
    } catch (chatsErr) {
        const age = Date.now() - (lastGroupsCache.at || 0);
        if (lastGroupsCache.groups?.length && age < 30 * 60 * 1000) {
            logger.warn('getChats failed — serving cached groups', {
                error: formatGatewayError(chatsErr),
                cached: lastGroupsCache.groups.length,
                ageMs: age,
            });
            return lastGroupsCache.groups;
        }
        throw chatsErr;
    }
}

app.get('/api/chats/groups', async (req, res) => {
    beginWaOps();
    try {
        if (!isWhatsAppUsable()) {
            let restored = await tryRestoreWhatsAppReady();
            if (!restored && client?.pupPage && lastReadyAt > 0) {
                // soft-ready: پرچم را برگردان و لیست را امتحان کن
                isClientReady = true;
                connectionPhase = 'ready';
                restored = true;
            }
            if (!restored) {
                await startWhatsApp().catch(() => {});
                const deadline = Date.now() + 20000;
                while (Date.now() < deadline && !isWhatsAppUsable()) {
                    await new Promise((r) => setTimeout(r, 1500));
                    if (await tryRestoreWhatsAppReady()) break;
                }
            }
            if (!isWhatsAppUsable()) {
                return res.status(503).json({
                    error: 'WhatsApp not ready',
                    phase: connectionPhase || (isClientStarting ? 'starting' : 'disconnected'),
                    starting: !!isClientStarting,
                });
            }
        }
        const groups = await listWhatsAppGroups();
        return res.json({ success: true, groups, count: groups.length });
    } catch (error) {
        const msg = formatGatewayError(error);
        logger.error('Get groups error', { error: msg, stack: error?.stack?.slice?.(0, 400) });
        const age = Date.now() - (lastGroupsCache.at || 0);
        if (lastGroupsCache.groups?.length && age < 30 * 60 * 1000) {
            return res.json({
                success: true,
                groups: lastGroupsCache.groups,
                count: lastGroupsCache.groups.length,
                stale: true,
            });
        }
        if (
            /timeout|not ready|Session closed|Target closed|Protocol|getChats|getGroups/i.test(
                msg
            ) ||
            /^[a-z]$/i.test(String(error?.message || '').trim())
        ) {
            return res.status(503).json({
                error: msg,
                phase: connectionPhase || null,
            });
        }
        return res.status(503).json({ error: msg, phase: connectionPhase || null });
    } finally {
        endWaOps();
    }
});

/** همهٔ چت‌های واتساپ (خصوصی + گروه) از Store */
async function listWhatsAppAllChatsFromStore() {
    if (!client?.pupPage) throw new Error('pupPage_unavailable');
    return client.pupPage.evaluate(() => {
        // runs inside WhatsApp Web Chromium page
        // eslint-disable-next-line no-undef
        const store = window.Store;
        if (!store) return [];

        function collectModels(collection) {
            if (!collection) return [];
            try {
                if (typeof collection.getModelsArray === 'function') {
                    return collection.getModelsArray() || [];
                }
            } catch (_) {}
            try {
                if (Array.isArray(collection.models)) return collection.models;
            } catch (_) {}
            try {
                if (collection._models) return Object.values(collection._models);
            } catch (_) {}
            try {
                if (typeof collection.map === 'function') {
                    const arr = [];
                    collection.map(function (m) {
                        arr.push(m);
                    });
                    return arr;
                }
            } catch (_) {}
            return [];
        }

        function jidOf(model) {
            if (!model) return null;
            const id = model.id;
            if (!id) return null;
            if (id._serialized) return String(id._serialized);
            if (id.user && id.server) return String(id.user) + '@' + String(id.server);
            return null;
        }

        const seen = Object.create(null);
        const out = [];

        function pushChat(ser, name, isGroup, preview, ts) {
            if (!ser) return;
            const s = String(ser);
            if (!s.includes('@')) return;
            // status / broadcast را رد کن
            if (s === 'status@broadcast' || s.endsWith('@broadcast')) return;
            if (seen[s]) {
                if (name && !seen[s].name) seen[s].name = String(name);
                return;
            }
            const row = {
                id: s,
                name: name ? String(name) : null,
                isGroup: !!isGroup || s.endsWith('@g.us'),
                lastPreview: preview ? String(preview).slice(0, 120) : null,
                timestamp: ts || null,
            };
            seen[s] = row;
            out.push(row);
        }

        const chats = collectModels(store.Chat);
        for (let i = 0; i < chats.length; i++) {
            const c = chats[i];
            const ser = jidOf(c);
            if (!ser) continue;
            const isGroup = !!(c && (c.isGroup || String(ser).endsWith('@g.us')));
            const name =
                (c &&
                    (c.name ||
                        c.formattedTitle ||
                        c.verifiedName ||
                        (c.contact && (c.contact.name || c.contact.pushname)) ||
                        (c.groupMetadata && c.groupMetadata.subject))) ||
                null;
            let preview = null;
            let ts = null;
            try {
                const lm = c.lastReceivedKey || c.lastMessage || c.msgs;
                if (c.lastMessage) {
                    preview =
                        c.lastMessage.body ||
                        c.lastMessage.caption ||
                        (c.lastMessage.type ? '[' + c.lastMessage.type + ']' : null);
                    ts = c.lastMessage.t || c.lastMessage.timestamp || null;
                } else if (typeof c.t === 'number') {
                    ts = c.t;
                }
                if (!preview && c.previewMessage) {
                    preview = c.previewMessage.body || c.previewMessage.caption || null;
                }
                void lm;
            } catch (_) {}
            pushChat(ser, name, isGroup, preview, ts);
        }

        // گروه‌هایی که در Chat نیستند ولی در GroupMetadata هستند
        const metas = collectModels(store.GroupMetadata);
        for (let i = 0; i < metas.length; i++) {
            const m = metas[i];
            const ser = jidOf(m);
            const name = (m && (m.subject || m.name || m.formattedTitle)) || null;
            pushChat(ser, name, true, null, null);
        }

        return out;
    });
}

async function listWhatsAppAllChats() {
    if (!isWhatsAppUsable()) {
        const restored = await tryRestoreWhatsAppReady();
        if (!restored) {
            const err = new Error('WhatsApp not ready');
            err.statusCode = 503;
            throw err;
        }
    }

    try {
        const fromStore = await Promise.race([
            listWhatsAppAllChatsFromStore(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('getChats_store_timeout')), 18000)
            ),
        ]);
        if (Array.isArray(fromStore) && fromStore.length > 0) {
            lastChatsCache = { at: Date.now(), chats: fromStore };
            const groupsOnly = fromStore.filter((c) => c.isGroup);
            if (groupsOnly.length) lastGroupsCache = { at: Date.now(), groups: groupsOnly };
            logger.info('WhatsApp chats listed from Store', {
                count: fromStore.length,
                groups: groupsOnly.length,
            });
            return fromStore;
        }
    } catch (storeErr) {
        logger.warn('Chat list via Store failed — falling back to getChats', {
            error: formatGatewayError(storeErr),
        });
    }

    try {
        const chats = await Promise.race([
            client.getChats(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('getChats_timeout')), 25000)
            ),
        ]);
        const list = Array.isArray(chats) ? chats : [];
        const mapped = list
            .map((c) => {
                const id = (c.id && (c.id._serialized || c.id)) || null;
                if (!id) return null;
                return {
                    id: String(id),
                    name: c.name || c.subject || c.formattedTitle || null,
                    isGroup: !!c.isGroup,
                    lastPreview: c.lastMessage
                        ? String(c.lastMessage.body || c.lastMessage.caption || '').slice(0, 120)
                        : null,
                    timestamp: c.timestamp || null,
                };
            })
            .filter(Boolean);
        lastChatsCache = { at: Date.now(), chats: mapped };
        const groupsOnly = mapped.filter((c) => c.isGroup);
        if (groupsOnly.length) lastGroupsCache = { at: Date.now(), groups: groupsOnly };
        return mapped;
    } catch (chatsErr) {
        const age = Date.now() - (lastChatsCache.at || 0);
        if (lastChatsCache.chats?.length && age < 30 * 60 * 1000) {
            logger.warn('getChats failed — serving cached chats', {
                error: formatGatewayError(chatsErr),
                cached: lastChatsCache.chats.length,
            });
            return lastChatsCache.chats;
        }
        throw chatsErr;
    }
}

app.get('/api/chats', async (req, res) => {
    beginWaOps();
    try {
        if (!isWhatsAppUsable()) {
            let restored = await tryRestoreWhatsAppReady();
            if (!restored && client?.pupPage && lastReadyAt > 0) {
                isClientReady = true;
                connectionPhase = 'ready';
                restored = true;
            }
            if (!restored) {
                await startWhatsApp().catch(() => {});
                const deadline = Date.now() + 20000;
                while (Date.now() < deadline && !isWhatsAppUsable()) {
                    await new Promise((r) => setTimeout(r, 1500));
                    if (await tryRestoreWhatsAppReady()) break;
                }
            }
            if (!isWhatsAppUsable()) {
                return res.status(503).json({
                    error: 'WhatsApp not ready',
                    phase: connectionPhase || (isClientStarting ? 'starting' : 'disconnected'),
                });
            }
        }
        const chats = await listWhatsAppAllChats();
        return res.json({ success: true, chats, count: chats.length });
    } catch (error) {
        const msg = formatGatewayError(error);
        logger.error('Get chats error', { error: msg });
        const age = Date.now() - (lastChatsCache.at || 0);
        if (lastChatsCache.chats?.length && age < 30 * 60 * 1000) {
            return res.json({
                success: true,
                chats: lastChatsCache.chats,
                count: lastChatsCache.chats.length,
                stale: true,
            });
        }
        return res.status(503).json({ error: msg, phase: connectionPhase || null });
    } finally {
        endWaOps();
    }
});

// اعضای گروه — برای نمایش نام فرستنده‌ها در چت گروهی (وقتی senderName ذخیره نشده)
app.get('/api/chats/groups/:groupId/participants', async (req, res) => {
    try {
        if (!isWhatsAppUsable()) return res.status(503).json({ error: 'WhatsApp not ready' });
        const groupId = (req.params.groupId || '').trim();
        if (!groupId) return res.status(400).json({ error: 'groupId required' });
        const chatId = groupId.includes('@g.us') ? groupId : `${groupId}@g.us`;
        const chat = await client.getChatById(chatId);
        if (!chat || !chat.isGroup) return res.status(404).json({ error: 'Group not found' });
        const participants = chat.participants || [];
        const list = await Promise.all(
            participants.map(async (p) => {
                const id = typeof p === 'object' && p?.id ? p.id._serialized || p.id : String(p);
                let name = '';
                try {
                    const c = await client.getContactById(id);
                    name = (c?.name || c?.pushname || c?.shortName || '').toString().trim();
                } catch (_) {}
                return { id, name: name || null };
            })
        );
        return res.json({ success: true, participants: list });
    } catch (error) {
        logger.error('Get group participants error', { error: error?.message });
        return res.status(500).json({ error: error?.message || 'get_participants_failed' });
    }
});

// دریافت عکس پروفایل مخاطب (برای مواقعی که در رویداد پیام null می‌آید)
app.get('/api/contacts/profile-pic', async (req, res) => {
    try {
        if (!client) return res.status(503).json({ error: 'WhatsApp client not initialized' });
        const q = String(req.query.phone || req.query.chatId || req.query.jid || '').trim();
        const chatId = normalizePhoneToChatId(q);
        if (!chatId) return res.status(400).json({ error: 'phone/chatId/jid is required' });

        let profilePicUrl = null;
        try {
            profilePicUrl = await client.getProfilePicUrl(chatId);
        } catch (_) {}
        if (!profilePicUrl) {
            try {
                const c = await client.getContactById(chatId);
                if (c && typeof c.getProfilePicUrl === 'function') {
                    profilePicUrl = await c.getProfilePicUrl().catch(() => null);
                }
            } catch (_) {}
        }
        return res.json({ ok: true, chatId, profilePicUrl: profilePicUrl || null });
    } catch (error) {
        logger.error('Get contact profile pic error', { error: error?.message });
        return res.status(500).json({ error: error?.message || 'get_profile_pic_failed' });
    }
});

// Optional upload
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        await ensureDir(UPLOADS_DIR);
        res.json({ ok: true, file: req.file });
    } catch (e) {
        res.status(500).json({ ok: false, error: e?.message });
    }
});

// ==================== RabbitMQ outgoing helper ====================
async function sendWhatsAppMessage(data) {
    if (!isWhatsAppUsable()) throw new Error('WhatsApp not ready');

    const { to, message, media, replyTo } = data || {};
    if (!to) throw new Error('Missing "to"');

    const chatId = to.includes('@c.us') || to.includes('@g.us') ? to : `${to}@c.us`;

    const sendOpts = replyTo ? { quotedMessageId: replyTo } : {};
    let tmpMediaPath = null;

    try {
        if (media?.data) {
            const built = await buildOutboundMessageMedia(media, message);
            if (!built) throw new Error('Invalid media payload');
            tmpMediaPath = built.tmpPath;
            if (built.asVoice) {
                sendOpts.sendAudioAsVoice = true;
            } else {
                sendOpts.caption = message || '';
            }
            const sent = await client.sendMessage(chatId, built.mediaObj, sendOpts);
            markGatewaySentMessage(sent?.id?.id);
            return sent;
        }

        if (media?.url) {
            if (!isSafeMediaUrl(media.url)) throw new Error('Invalid or unsafe media URL');
            const mediaObj = await MessageMedia.fromUrl(media.url);
            if (isVoiceMediaPayload(media)) {
                sendOpts.sendAudioAsVoice = true;
            } else {
                sendOpts.caption = message || '';
            }
            const sent = await client.sendMessage(chatId, mediaObj, sendOpts);
            markGatewaySentMessage(sent?.id?.id);
            return sent;
        }

        const sent = await client.sendMessage(chatId, message || '', sendOpts);
        markGatewaySentMessage(sent?.id?.id);
        return sent;
    } finally {
        await cleanupTempMedia(tmpMediaPath);
    }
}

// ==================== Startup ====================
function resolveGatewayPort() {
    const raw = process.env.PORT;
    let p = raw != null && String(raw).trim() !== '' ? parseInt(String(raw), 10) : 3001;
    if (!Number.isFinite(p) || p < 1 || p > 65535) p = 3001;
    return p;
}

function startServer() {
    const PORT = resolveGatewayPort();
    const isProd = process.env.NODE_ENV === 'production';

    if (isProd && PORT === 3002) {
        logger.error(
            '❌ Gateway نباید روی پورت ۳۰۰۲ گوش دهد (پورت پیش‌فرض Backend). در gateway/.env مقدار PORT=3001 بگذارید.'
        );
        process.exit(1);
    }

    if (isProd) {
        if (!CONFIG.gatewayApiSecret || CONFIG.gatewayApiSecret.length < CONFIG.secretMinLength) {
            logger.error(
                '❌ GATEWAY_API_SECRET must be set and at least 32 characters in production. Aborting.'
            );
            process.exit(1);
        }
    } else {
        if (!CONFIG.gatewayApiSecret) {
            logger.warn(
                '⚠️ GATEWAY_API_SECRET not set — API is unprotected. Set it in production!'
            );
        } else if (CONFIG.gatewayApiSecret.length < CONFIG.secretMinLength) {
            logger.warn('⚠️ GATEWAY_API_SECRET should be at least 32 characters for security');
        }
    }

    server.listen(PORT, () => {
        logger.info(`🚀 WhatsApp Gateway running on port ${PORT}`, {
            autoReconnect: CONFIG.autoReconnect,
            maxRetries: CONFIG.reconnectMaxRetries,
            rateLimit: CONFIG.rateLimitMax,
            sendLimit: CONFIG.sendLimitMax,
        });

        // ✅ after server is up, start background services
        setTimeout(async () => {
            try {
                await ensureDir(UPLOADS_DIR);
            } catch (_) {}

            connectRabbitMQ().catch(() => {});
            // auto-start WhatsApp (optional)
            startWhatsApp().catch(() => {});
        }, 300);

        // ✅ Health check هر ۵ دقیقه — تشخیص قطع بی‌صدا و راه‌اندازی مجدد
        cron.schedule('*/5 * * * *', async () => {
            try {
                if (isClientStarting) return; // در حال اتصال است — دست نزن
                if (waOpsBusy > 0) return; // لیست گروه/عملیات سنگین — ping کاذب timeout ندهد

                if (!isClientReady) {
                    // قبل از reconnect: شاید فقط پرچم فلیکر کرده
                    if (client?.pupPage && (await tryRestoreWhatsAppReady())) return;
                    logger.warn('💉 Health check: WhatsApp not connected — scheduling reconnect');
                    scheduleReconnect();
                    return;
                }

                // تست ping به واتساپ با timeout ده ثانیه
                const state = await Promise.race([
                    client ? client.getState() : Promise.reject(new Error('no_client')),
                    new Promise((_, rej) =>
                        setTimeout(() => rej(new Error('ping_timeout')), 10000)
                    ),
                ]);

                if (state === 'CONNECTED') {
                    healthCheckFailCount = 0;
                    isClientReady = true;
                    lastReadyAt = Date.now();
                    connectionPhase = 'ready';
                } else {
                    healthCheckFailCount++;
                    logger.warn('💉 Health check: unexpected state', {
                        state,
                        failCount: healthCheckFailCount,
                    });
                    // هرگز client را بدون destroy صفر نکن (Chrome یتیم + browser already running)
                    if (healthCheckFailCount >= 3) {
                        healthCheckFailCount = 0;
                        const restored = await tryRestoreWhatsAppReady();
                        if (!restored) {
                            try {
                                await stopWhatsApp();
                            } catch (_) {
                                resetClientState();
                            }
                            scheduleReconnect();
                        }
                    }
                }
            } catch (e) {
                healthCheckFailCount++;
                logger.warn('💉 Health check ping failed', {
                    error: e?.message,
                    failCount: healthCheckFailCount,
                });
                if (healthCheckFailCount >= 3) {
                    healthCheckFailCount = 0;
                    if (waOpsBusy > 0) return;
                    const restored = await tryRestoreWhatsAppReady().catch(() => false);
                    if (!restored) {
                        try {
                            await stopWhatsApp();
                        } catch (_) {
                            resetClientState();
                        }
                        scheduleReconnect();
                    }
                }
            }
        });
    });
}

startServer();

// جلوگیری از کرش کل پروسه با خطاهای غیرمنتظره (قطع/اتصال مجدد یا عوض کردن خط)
function resetClientState() {
    isClientReady = false;
    isClientStarting = false;
    connectionPhase = null;
    lastAuthFailureMessage = null;
    lastQrImageDataUrl = null;
    client = null;
    redisClient.set('whatsapp:status', 'disconnected').catch(() => {});
}

process.on('uncaughtException', (err) => {
    logger.error('uncaughtException — exiting for clean restart', {
        error: err?.message,
        stack: err?.stack,
    });
    try {
        resetClientState();
    } catch (_) {}
    setTimeout(() => process.exit(1), 500);
});

function isRecoverablePuppeteerRejection(reason) {
    const msg = reason && reason.message ? String(reason.message) : String(reason || '');
    return (
        /Execution context was destroyed/i.test(msg) ||
        /Target closed/i.test(msg) ||
        /detached Frame/i.test(msg) ||
        /Protocol error.*Target closed/i.test(msg) ||
        /Navigation failed/i.test(msg) ||
        /browser is already running/i.test(msg)
    );
}

process.on('unhandledRejection', (reason) => {
    const msg = reason && reason.message ? String(reason.message) : String(reason || '');
    if (/browser is already running/i.test(msg)) {
        logger.warn(
            'unhandledRejection (Chrome profile lock) — clearing orphans and reconnecting',
            { reason: msg }
        );
        prepareChromeUserDataDir(getWhatsAppSessionPath())
            .catch(() => {})
            .finally(() => {
                try {
                    resetClientState();
                } catch (_) {}
                scheduleReconnect();
            });
        return;
    }
    if (isRecoverablePuppeteerRejection(reason)) {
        logger.warn(
            'unhandledRejection (Puppeteer/WhatsApp — recoverable) — scheduling reconnect',
            {
                reason: msg,
            }
        );
        try {
            resetClientState();
        } catch (_) {}
        scheduleReconnect();
        return;
    }
    logger.error('unhandledRejection — exiting for clean restart', { reason: String(reason) });
    try {
        resetClientState();
    } catch (_) {}
    setTimeout(() => process.exit(1), 500);
});

async function gracefulShutdown(signal) {
    logger.info('Shutting down gracefully...', { signal });
    try {
        await stopWhatsApp();
    } catch (_) {}
    try {
        await prepareChromeUserDataDir(getWhatsAppSessionPath());
    } catch (_) {}
    redisClient.quit().catch(() => {});
    process.exit(0);
}

process.on('SIGINT', () => {
    gracefulShutdown('SIGINT');
});
process.on('SIGTERM', () => {
    gracefulShutdown('SIGTERM');
});

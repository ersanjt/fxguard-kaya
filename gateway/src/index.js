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
const { startOutgoingCall } = require('./waCalls');
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

const sendLimiter = rateLimit({
    windowMs: CONFIG.sendLimitWindowMs,
    max: CONFIG.sendLimitMax,
    message: { error: 'Rate limit exceeded' },
    standardHeaders: true,
    legacyHeaders: false,
});

// ✅ TEST ROUTE (must always work) — health check
app.get('/test', (req, res) => {
    res.status(200).json({ ok: true, ts: Date.now() });
});

// Uploads folder
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
const upload = multer({ dest: path.join(UPLOADS_DIR, 'tmp') });

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

        const OUTGOING_DLQ = OUTGOING_QUEUE + '_dead';
        await rabbitChannel.assertQueue(OUTGOING_DLQ, { durable: true });

        rabbitChannel.consume(OUTGOING_QUEUE, async (msg) => {
            if (!msg) return;
            const retryCount =
                (msg.properties.headers && msg.properties.headers['x-retry-count']) || 0;
            const MAX_RETRIES = 3;
            try {
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

let lastQrImageDataUrl = null;
let lastAccountInfo = null;
let lastAuthFailureMessage = null;
/** وضعیت اتصال برای نمایش در پنل: qr | authenticated (اسکن شد، در حال همگام‌سازی) | ready | auth_failure */
let connectionPhase = null;

function buildClient() {
    const sessionPath = path.resolve(
        process.env.WHATSAPP_SESSION_PATH || path.join(process.cwd(), '.wwebjs_auth')
    );
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
        } catch (_) {}
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
                    number: contact?.number,
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

            // Send to backend (persistent: RabbitMQ keeps message if backend down)
            if (rabbitChannel) {
                rabbitChannel.sendToQueue(
                    INCOMING_QUEUE,
                    Buffer.from(JSON.stringify(messageData)),
                    {
                        persistent: true,
                    }
                );
            } else {
                await sendToBackendWithRetry(messageData);
            }

            // realtime dashboard
            io.emit('new_message', messageData);

            // short cache
            redisClient
                .hSet(`message:${messageData.id}`, 'data', JSON.stringify(messageData))
                .catch(() => {});
            redisClient.expire(`message:${messageData.id}`, 86400).catch(() => {});

            logger.info('📨 Message received', { from: contact?.number });
        } catch (error) {
            logger.error('Error processing message', { error: error?.message });
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
            const chat = await msg.getChat();
            if (chat?.isGroup) return; // گروه‌ها را نادیده بگیر
            const contact = await chat.getContact();

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
                    number: contact?.number,
                    name: contact?.name || contact?.pushname || null,
                    isMyContact: contact?.isMyContact,
                    profilePicUrl: await contact.getProfilePicUrl().catch(() => null),
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
                    logger.error('message_create media download error', { error: error?.message });
                }
            }

            if (rabbitChannel) {
                rabbitChannel.sendToQueue(
                    INCOMING_QUEUE,
                    Buffer.from(JSON.stringify(messageData)),
                    { persistent: true }
                );
            } else {
                await sendToBackendWithRetry(messageData);
            }

            io.emit('new_message', messageData);
            logger.info('📤 Outgoing message from mobile captured', { to: contact?.number });
        } catch (error) {
            logger.error('Error processing message_create', { error: error?.message });
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
        } catch (err) {
            logger.warn('Backend webhook attempt failed', { attempt: i + 1, error: err?.message });
        }
        if (i < maxRetries - 1) await sleep(baseDelay * (i + 1));
    }
    logger.error('Backend webhook failed after retries – message may be lost', {
        from: messageData?.from,
    });
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** اطلاع‌رسانی به بکند هنگام قطع/وصل شدن واتساپ */
async function notifyBackendStatus(event, reason) {
    try {
        const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:3002';
        const webhookSecret = process.env.WEBHOOK_SECRET || '';
        await axios.post(
            `${backendUrl}/api/webhook/gateway-status`,
            { event, reason: reason || null, timestamp: new Date().toISOString() },
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
    if (v.includes('@c.us') || v.includes('@g.us') || v.includes('@s.whatsapp.net')) return v;
    const digits = v.replace(/\D/g, '');
    if (!digits) return null;
    return `${digits}@c.us`;
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

    isClientStarting = true;
    isClientReady = false;
    lastAuthFailureMessage = null;
    connectionPhase = null;

    if (!client) {
        const sessionPath = path.resolve(
            process.env.WHATSAPP_SESSION_PATH || path.join(process.cwd(), '.wwebjs_auth')
        );
        await ensureDir(sessionPath);
        client = buildClient();
    }

    try {
        redisClient.set('whatsapp:status', 'starting').catch(() => {});
        client.initialize();
        return { ok: true, status: 'initializing' };
    } catch (e) {
        isClientStarting = false;
        logger.error('Start WhatsApp error', { error: e?.message });
        return { ok: false, error: e?.message || 'start_failed' };
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
    const status = isClientReady ? 'ready' : isClientStarting ? 'starting' : 'disconnected';
    const body = {
        whatsapp: isClientReady,
        starting: isClientStarting,
        redis: redisClient?.isReady || false,
        rabbitmq: !!rabbitChannel,
        status,
    };
    if (isClientReady && lastAccountInfo) {
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

app.post('/api/send-message', sendLimiter, async (req, res) => {
    try {
        if (!isClientReady || !client) return res.status(503).json({ error: 'WhatsApp not ready' });

        const { to, message, media, replyTo } = req.body || {};
        if (!to || (!message && !media)) return res.status(400).json({ error: 'Invalid payload' });

        const chatId = to.includes('@c.us') || to.includes('@g.us') ? to : `${to}@c.us`;

        let sentMsg;
        const sendOpts = replyTo ? { quotedMessageId: replyTo } : {};
        if (media?.data) {
            const mime = media.mimetype || 'application/octet-stream';
            const mediaObj = new MessageMedia(mime, media.data, media.filename || null);
            const asVoice = !!(media.sendAsVoice || /^audio\/(ogg|opus)/i.test(mime));
            if (asVoice) {
                // Voice notes (PTT) must not carry a caption — adding one can
                // produce a message the recipient is unable to download.
                sendOpts.sendAudioAsVoice = true;
            } else {
                sendOpts.caption = message || '';
            }
            logger.info('📎 Sending media (data)', {
                to,
                mime,
                asVoice,
                dataLen: (media.data || '').length,
            });
            sentMsg = await client.sendMessage(chatId, mediaObj, sendOpts);
        } else if (media?.url) {
            if (!isSafeMediaUrl(media.url)) {
                return res.status(400).json({ error: 'Invalid or unsafe media URL' });
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
            logger.info('📎 Sending media (url)', { to, mime: mediaObj?.mimetype, asVoice });
            sentMsg = await client.sendMessage(chatId, mediaObj, sendOpts);
        } else {
            sentMsg = await client.sendMessage(chatId, message || '', sendOpts);
        }

        logger.info('✉️ Message sent', { to, messageId: sentMsg?.id?.id, hasMedia: !!media });
        return res.json({ success: true, messageId: sentMsg?.id?.id });
    } catch (error) {
        logger.error('Send message error', { error: error?.message });
        return res.status(500).json({ error: error?.message || 'send_failed' });
    }
});

// تماس صوتی/تصویری — از طریق UI واتساپ وب یا ارسال لینک تماس
app.post('/api/calls/start', sendLimiter, async (req, res) => {
    try {
        if (!isClientReady || !client) return res.status(503).json({ error: 'WhatsApp not ready' });

        const { to, type, introText } = req.body || {};
        if (!to) return res.status(400).json({ error: 'to is required' });
        const isVideo = type === 'video';

        const result = await startOutgoingCall(client, to, isVideo, logger, { introText });
        return res.json({ success: true, ...result });
    } catch (error) {
        const msg = error?.message || 'call_failed';
        if (msg === 'call_link_failed') {
            return res.status(503).json({
                error: 'امکان ایجاد لینک تماس وجود ندارد. نسخه واتساپ وب را بررسی کنید.',
            });
        }
        logger.error('Start call error', { error: msg });
        return res.status(500).json({ error: msg });
    }
});

// لیست گروه‌های واتساپ — برای همگام‌سازی با CRM
app.get('/api/chats/groups', async (req, res) => {
    try {
        if (!isClientReady || !client) return res.status(503).json({ error: 'WhatsApp not ready' });
        const chats = await client.getChats();
        const groups = chats
            .filter((c) => c.isGroup)
            .map((c) => ({
                id: c.id?._serialized || c.id,
                name: c.name || c.subject || c.formattedTitle || null,
            }));
        return res.json({ success: true, groups });
    } catch (error) {
        logger.error('Get groups error', { error: error?.message });
        return res.status(500).json({ error: error?.message || 'get_groups_failed' });
    }
});

// اعضای گروه — برای نمایش نام فرستنده‌ها در چت گروهی (وقتی senderName ذخیره نشده)
app.get('/api/chats/groups/:groupId/participants', async (req, res) => {
    try {
        if (!isClientReady || !client) return res.status(503).json({ error: 'WhatsApp not ready' });
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
    if (!isClientReady || !client) throw new Error('WhatsApp not ready');

    const { to, message, media, replyTo } = data || {};
    if (!to) throw new Error('Missing "to"');

    const chatId = to.includes('@c.us') || to.includes('@g.us') ? to : `${to}@c.us`;

    const sendOpts = replyTo ? { quotedMessageId: replyTo } : {};

    if (media?.data) {
        const mime = media.mimetype || 'application/octet-stream';
        const mediaObj = new MessageMedia(mime, media.data, media.filename || null);
        if (media.sendAsVoice || /^audio\/(ogg|opus)/i.test(mime)) {
            sendOpts.sendAudioAsVoice = true;
        } else {
            sendOpts.caption = message || '';
        }
        return client.sendMessage(chatId, mediaObj, sendOpts);
    }

    if (media?.url) {
        if (!isSafeMediaUrl(media.url)) throw new Error('Invalid or unsafe media URL');
        const mediaObj = await MessageMedia.fromUrl(media.url);
        if (media.sendAsVoice || (media.mimetype && /^audio\/(ogg|opus)/i.test(media.mimetype))) {
            sendOpts.sendAudioAsVoice = true;
        } else {
            sendOpts.caption = message || '';
        }
        return client.sendMessage(chatId, mediaObj, sendOpts);
    }

    return client.sendMessage(chatId, message || '', sendOpts);
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

                if (!isClientReady) {
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
                } else {
                    healthCheckFailCount++;
                    logger.warn('💉 Health check: unexpected state', {
                        state,
                        failCount: healthCheckFailCount,
                    });
                    if (healthCheckFailCount >= 2) {
                        healthCheckFailCount = 0;
                        isClientReady = false;
                        client = null;
                        scheduleReconnect();
                    }
                }
            } catch (e) {
                healthCheckFailCount++;
                logger.warn('💉 Health check ping failed', {
                    error: e?.message,
                    failCount: healthCheckFailCount,
                });
                if (healthCheckFailCount >= 2) {
                    healthCheckFailCount = 0;
                    isClientReady = false;
                    client = null;
                    scheduleReconnect();
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
        /Navigation failed/i.test(msg)
    );
}

process.on('unhandledRejection', (reason) => {
    if (isRecoverablePuppeteerRejection(reason)) {
        logger.warn(
            'unhandledRejection (Puppeteer/WhatsApp — recoverable) — scheduling reconnect',
            {
                reason: reason && reason.message ? reason.message : String(reason),
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

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Shutting down gracefully...');
    try {
        await stopWhatsApp();
    } catch (_) {}
    redisClient.quit().catch(() => {});
    process.exit(0);
});

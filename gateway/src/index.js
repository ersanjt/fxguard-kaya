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

async function clearIncomingGatewayDedupe(msgId) {
    if (!msgId || !redisClient?.isReady) return;
    try {
        await redisClient.del(`gateway:incoming:${String(msgId)}`);
    } catch (_) {}
}

function serializedJid(val) {
    if (val == null || val === '') return '';
    if (typeof val === 'string') return val.trim();
    if (typeof val === 'object') {
        if (val._serialized) return String(val._serialized).trim();
        if (val.user && val.server) return `${val.user}@${val.server}`;
        if (val.id) return serializedJid(val.id);
    }
    return '';
}

function isWhatsAppGroupChat(chat, msg) {
    if (chat && chat.isGroup) return true;
    const ids = [
        chat && chat.id && (chat.id._serialized || chat.id),
        msg && msg.from,
        msg && msg.to,
        msg && msg.id && msg.id.remote,
        msg && msg._data && msg._data.key && msg._data.key.remoteJid,
    ];
    return ids.some((v) => {
        const s = serializedJid(v) || (typeof v === 'string' ? v : '');
        return /@g\.us$/i.test(s);
    });
}

function digitsOnly(val) {
    return String(val || '').replace(/\D/g, '');
}

function isOwnAccountJid(ser) {
    const own = digitsOnly(lastAccountInfo && lastAccountInfo.number);
    const got = digitsOnly(ser);
    if (!own || !got || got.length < 8) return false;
    return own === got || own.endsWith(got) || got.endsWith(own);
}

/** فقط طرف مقابل — from/to خودِ خط کایا را مشتری حساب نکن */
function collectPeerJids(msg, chat, contact, isFromMe) {
    const peer = isFromMe ? msg && msg.to : msg && msg.from;
    const dataPeer = isFromMe
        ? msg && msg._data && msg._data.to
        : msg && msg._data && msg._data.from;
    return [
        serializedJid(contact && contact.id),
        serializedJid(chat && chat.id),
        serializedJid(peer),
        serializedJid(msg && msg.id && msg.id.remote),
        serializedJid(dataPeer),
        serializedJid(msg && msg._data && msg._data.key && msg._data.key.remoteJid),
    ].filter((ser) => ser && !isOwnAccountJid(ser));
}

async function tryResolvePhoneFromLid(waClient, lidJid) {
    const jid = serializedJid(lidJid);
    if (!jid || !/@lid$/i.test(jid) || !waClient) return null;
    if (typeof waClient.getContactLidAndPhone === 'function') {
        try {
            const mapped = await Promise.race([
                waClient.getContactLidAndPhone([jid]),
                timeoutReject(2000, 'lid_map_timeout'),
            ]);
            const row = Array.isArray(mapped) ? mapped[0] : mapped;
            const pn = (row && (row.pn || row.phone || row.number || row._serialized)) || null;
            const digits = String(pn || '')
                .replace(/@(c\.us|s\.whatsapp\.net)$/i, '')
                .replace(/\D/g, '');
            if (digits.length >= 8) return digits;
        } catch (_) {}
    }
    if (!waClient.pupPage) return null;
    try {
        const phone = await Promise.race([
            waClient.pupPage.evaluate(async (rawJid) => {
                const store = window.Store;
                if (!store) return null;
                try {
                    const wid =
                        store.WidFactory && store.WidFactory.createWid
                            ? store.WidFactory.createWid(rawJid)
                            : rawJid;
                    if (store.LidUtils && typeof store.LidUtils.getPhoneNumber === 'function') {
                        const pn = await store.LidUtils.getPhoneNumber(wid);
                        return (pn && (pn.user || pn._serialized)) || null;
                    }
                    if (store.lidChange && typeof store.lidChange.findPNForLID === 'function') {
                        const pn = store.lidChange.findPNForLID(wid);
                        return (pn && (pn.user || pn._serialized)) || null;
                    }
                } catch (_) {}
                return null;
            }, jid),
            timeoutReject(2000, 'lid_store_timeout'),
        ]);
        const digits = String(phone || '')
            .replace(/@(c\.us|s\.whatsapp\.net)$/i, '')
            .replace(/\D/g, '');
        return digits.length >= 8 ? digits : null;
    } catch (_) {
        return null;
    }
}

async function resolveInboundContactIds(waClient, msg, contact, chat, isFromMe) {
    let contactNumber = null;
    let contactLid = null;
    const contactId = serializedJid(contact && contact.id);
    const ids = collectPeerJids(msg, chat, contact, isFromMe);
    for (const ser of ids) {
        if (/@lid$/i.test(ser) && !contactLid) contactLid = ser;
        if (!contactNumber && /@(c\.us|s\.whatsapp\.net)$/i.test(ser)) {
            contactNumber = String(ser).replace(/@(c\.us|s\.whatsapp\.net)$/i, '');
        }
    }
    if (
        !contactNumber &&
        contact &&
        contact.number &&
        !/@lid$/i.test(contactId) &&
        !isOwnAccountJid(contact.number)
    ) {
        const n = digitsOnly(contact.number);
        if (n.length >= 8) contactNumber = n;
    }
    if (contactNumber && isOwnAccountJid(contactNumber)) contactNumber = null;
    if (!contactNumber && contactLid) {
        const mapped = await tryResolvePhoneFromLid(waClient, contactLid);
        if (mapped && !isOwnAccountJid(mapped)) contactNumber = mapped;
    }
    return { contactNumber: contactNumber || null, contactLid };
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

async function buildOutboundMessageMedia(media, _message) {
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

function defaultMediaMeta(type) {
    const t = String(type || '').toLowerCase();
    if (t === 'ptt' || t === 'audio') {
        return { mimetype: 'audio/ogg; codecs=opus', filename: 'voice.ogg' };
    }
    if (t === 'sticker') return { mimetype: 'image/webp', filename: 'sticker.webp' };
    if (t === 'image') return { mimetype: 'image/jpeg', filename: 'image.jpg' };
    if (t === 'video') return { mimetype: 'video/mp4', filename: 'video.mp4' };
    return { mimetype: 'application/octet-stream', filename: 'file.bin' };
}

function isMediaMessageType(type, hasMedia) {
    const t = String(type || '').toLowerCase();
    return (
        !!hasMedia ||
        t === 'ptt' ||
        t === 'audio' ||
        t === 'sticker' ||
        t === 'image' ||
        t === 'video' ||
        t === 'document'
    );
}

async function downloadMediaViaStore(waClient, msg) {
    if (!waClient?.pupPage || !msg) return null;
    const serializedId =
        (msg.id && (msg.id._serialized || serializedJid(msg.id))) ||
        (typeof msg.id === 'string' ? msg.id : '') ||
        '';
    const shortId = (msg.id && msg.id.id) || '';
    const msgType = String(msg.type || '').toLowerCase();
    if (!serializedId && !shortId) return null;
    try {
        const result = await Promise.race([
            waClient.pupPage.evaluate(
                async (serializedId, shortId, msgType) => {
                    function toB64(input) {
                        if (!input) return '';
                        if (typeof input === 'string') return input;
                        let bytes;
                        if (input instanceof ArrayBuffer) bytes = new Uint8Array(input);
                        else if (input.buffer && input.byteLength != null) {
                            bytes = new Uint8Array(
                                input.buffer,
                                input.byteOffset,
                                input.byteLength
                            );
                        } else if (Array.isArray(input)) bytes = new Uint8Array(input);
                        else return '';
                        const chunk = 0x8000;
                        let bin = '';
                        for (let i = 0; i < bytes.length; i += chunk) {
                            bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
                        }
                        return btoa(bin);
                    }
                    function guessMime(type, given) {
                        if (given && typeof given === 'string') return given;
                        if (type === 'ptt' || type === 'audio') return 'audio/ogg; codecs=opus';
                        if (type === 'sticker') return 'image/webp';
                        if (type === 'image') return 'image/jpeg';
                        if (type === 'video') return 'video/mp4';
                        return 'application/octet-stream';
                    }
                    function findMsg() {
                        const store = window.Store;
                        if (!store || !store.Msg) return null;
                        try {
                            if (typeof store.Msg.get === 'function') {
                                const hit =
                                    store.Msg.get(serializedId) ||
                                    (shortId ? store.Msg.get(shortId) : null);
                                if (hit) return hit;
                            }
                        } catch (_) {}
                        try {
                            const models =
                                typeof store.Msg.getModelsArray === 'function'
                                    ? store.Msg.getModelsArray()
                                    : store.Msg.models || [];
                            for (let i = 0; i < models.length; i++) {
                                const id = models[i] && models[i].id;
                                if (!id) continue;
                                if (id._serialized === serializedId || id.id === shortId)
                                    return models[i];
                            }
                        } catch (_) {}
                        return null;
                    }

                    if (window.WWebJS && typeof window.WWebJS.downloadMedia === 'function') {
                        try {
                            const viaLib = await window.WWebJS.downloadMedia(serializedId);
                            if (viaLib && (viaLib.data || viaLib.body)) {
                                return {
                                    data: viaLib.data || viaLib.body,
                                    mimetype: viaLib.mimetype || guessMime(msgType),
                                    filename: viaLib.filename || null,
                                };
                            }
                        } catch (_) {}
                    }

                    let storeMsg = findMsg();
                    if (!storeMsg) {
                        await new Promise((r) => setTimeout(r, 800));
                        storeMsg = findMsg();
                    }
                    if (!storeMsg) return { error: 'msg_not_found' };
                    const mediaData = storeMsg.mediaData || {};
                    const type = String(storeMsg.type || msgType || '').toLowerCase();

                    try {
                        const blob =
                            (mediaData.mediaBlob &&
                                (mediaData.mediaBlob._blob || mediaData.mediaBlob)) ||
                            mediaData.previewBlob;
                        if (blob && typeof blob.arrayBuffer === 'function') {
                            const buf = await blob.arrayBuffer();
                            if (buf && buf.byteLength > 32) {
                                return {
                                    data: toB64(buf),
                                    mimetype: guessMime(
                                        type,
                                        storeMsg.mimetype || mediaData.mimetype
                                    ),
                                    filename: storeMsg.filename || mediaData.filename || null,
                                };
                            }
                        }
                    } catch (_) {}

                    const dm = window.Store && window.Store.DownloadManager;
                    const directPath = storeMsg.directPath || mediaData.directPath;
                    const mediaKey = storeMsg.mediaKey || mediaData.mediaKey;
                    if (
                        dm &&
                        typeof dm.downloadAndMaybeDecrypt === 'function' &&
                        directPath &&
                        mediaKey
                    ) {
                        const downloaded = await dm.downloadAndMaybeDecrypt({
                            directPath,
                            encFilehash: storeMsg.encFilehash || mediaData.encFilehash,
                            filehash: storeMsg.filehash || mediaData.filehash,
                            mediaKey,
                            mediaKeyTimestamp:
                                storeMsg.mediaKeyTimestamp || mediaData.mediaKeyTimestamp,
                            type: type === 'ptt' ? 'audio' : type,
                            signal: new AbortController().signal,
                        });
                        if (downloaded) {
                            let buf = downloaded;
                            if (downloaded.arrayBuffer) buf = await downloaded.arrayBuffer();
                            else if (downloaded.buffer) buf = downloaded.buffer;
                            const data = toB64(buf);
                            if (data) {
                                return {
                                    data,
                                    mimetype: guessMime(
                                        type,
                                        storeMsg.mimetype || mediaData.mimetype
                                    ),
                                    filename: storeMsg.filename || mediaData.filename || null,
                                };
                            }
                        }
                    }
                    return { error: 'download_failed' };
                },
                serializedId,
                shortId,
                msgType
            ),
            timeoutReject(12000, 'store_media_timeout'),
        ]);
        if (result && result.data) {
            const fallback = defaultMediaMeta(msgType);
            return {
                mimetype: result.mimetype || fallback.mimetype,
                filename: result.filename || fallback.filename,
                data: result.data,
            };
        }
        if (result && result.error) {
            logger.warn('Store media download missed', {
                error: result.error,
                type: msgType,
            });
        }
    } catch (err) {
        logger.warn('Store media download failed', {
            error: formatGatewayError(err),
            type: msgType,
        });
    }
    return null;
}

async function attachMediaToMessageData(messageData, msg) {
    if (!isMediaMessageType(msg && msg.type, msg && msg.hasMedia)) return;
    let media = null;
    if (msg && typeof msg.downloadMedia === 'function') {
        try {
            media = await Promise.race([
                msg.downloadMedia(),
                timeoutReject(8000, 'downloadMedia_timeout'),
            ]);
        } catch (error) {
            logger.warn('downloadMedia failed — trying Store', {
                error: formatGatewayError(error),
                type: msg && msg.type,
            });
        }
    }
    if (!media || !media.data) {
        media = await downloadMediaViaStore(
            client,
            msg || { id: messageData.id, type: messageData.type }
        );
    }
    if (media && media.data) {
        const fallback = defaultMediaMeta(messageData.type || (msg && msg.type));
        messageData.hasMedia = true;
        messageData.media = {
            mimetype: media.mimetype || fallback.mimetype,
            filename: media.filename || fallback.filename,
            data: media.data,
        };
    }
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
/** وقتی رویداد message/message_create شلیک نشود، Store و unread را می‌خوانیم */
let inboundPollTimer = null;
let inboundPollBusy = false;

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

function chromeLockFiles(userDataDir) {
    return ['SingletonLock', 'SingletonCookie', 'SingletonSocket'].map((name) =>
        path.join(userDataDir, name)
    );
}

/** pkill همگام — PM2 بعد از ~۱٫۶ثانیه SIGKILL می‌دهد؛ destroy واتساپ برای آن دیر است. */
function killOrphanChromeSync(sessionPath) {
    const root = sessionPath || getWhatsAppSessionPath();
    const userDataDir = path.join(root, 'session');
    if (process.platform !== 'linux') return;
    // فقط Chrome با همین user-data-dir — الگوی مسیر sessions اسکریپت SSH/دیپلوی را هم match می‌کند
    const chromeFlag = `--user-data-dir=${userDataDir}`;
    try {
        execFileSync('pkill', ['-9', '-f', chromeFlag], { stdio: 'ignore', timeout: 5000 });
    } catch (_) {
        /* exit 1 = هیچ پروسه‌ای نبود */
    }
    try {
        execFileSync('fuser', ['-k', '-9', path.join(userDataDir, 'SingletonLock')], {
            stdio: 'ignore',
            timeout: 5000,
        });
    } catch (_) {}
    for (const lockFile of chromeLockFiles(userDataDir)) {
        try {
            execFileSync('rm', ['-f', lockFile], { stdio: 'ignore', timeout: 3000 });
        } catch (_) {}
    }
}

/**
 * بعد از pm2 restart گاهی Chromium یتیم می‌ماند و userDataDir را قفل می‌کند
 * → حلقهٔ کرش «browser is already running». قفل و پروسهٔ یتیم را پاک کن.
 */
async function prepareChromeUserDataDir(sessionPath) {
    const root = sessionPath || getWhatsAppSessionPath();
    const userDataDir = path.join(root, 'session');

    async function unlinkLocks() {
        for (const lockFile of chromeLockFiles(userDataDir)) {
            try {
                await fs.unlink(lockFile);
            } catch (_) {
                /* ignore */
            }
        }
    }

    killOrphanChromeSync(root);
    await unlinkLocks();
    await new Promise((r) => setTimeout(r, 2500));
    await unlinkLocks();
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
        const warmChats = (delayMs) => {
            setTimeout(() => {
                hookChatCollectionObserver()
                    .catch(() => {})
                    .then(() => hookIncomingMessageObserver().catch(() => {}))
                    .finally(() => {
                        listWhatsAppAllChats()
                            .then((chats) => {
                                logger.info('WhatsApp chats warmed after ready', {
                                    delayMs,
                                    count: Array.isArray(chats) ? chats.length : 0,
                                    groups: Array.isArray(chats)
                                        ? chats.filter((x) => x && x.isGroup).length
                                        : 0,
                                });
                            })
                            .catch((e) =>
                                logger.warn('Warm chat list after ready failed', {
                                    delayMs,
                                    error: formatGatewayError(e),
                                })
                            );
                    });
            }, delayMs);
        };
        startInboundPoll();
        warmChats(4000);
        warmChats(15000);
        warmChats(40000);
    });

    c.on('disconnected', async (reason) => {
        const reasonStr = String(reason || '');
        logger.warn('⚠️ WhatsApp Disconnected', { reason: reasonStr });

        isClientReady = false;
        isClientStarting = false;
        connectionPhase = null;
        stopInboundPoll();
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

    async function forwardWhatsAppEventToBackend(msg) {
        const isFromMe = !!msg.fromMe;
        const waMsgId = msg?.id?.id;
        if (isFromMe) {
            if (outboundApiSendDepth > 0) {
                markGatewaySentMessage(waMsgId);
                return;
            }
            if (isGatewaySentEcho(waMsgId)) return;
        }

        let chat = null;
        try {
            chat = await Promise.race([msg.getChat(), timeoutReject(2500, 'getChat_timeout')]);
        } catch (err) {
            logger.warn('getChat failed — continuing with message JIDs', {
                error: formatGatewayError(err),
                from: serializedJid(msg?.from),
                fromMe: isFromMe,
            });
        }
        const isGroup = isWhatsAppGroupChat(chat, msg);
        let contact = null;
        try {
            const contactPromise =
                isFromMe && !isGroup && chat && typeof chat.getContact === 'function'
                    ? chat.getContact()
                    : !isFromMe
                      ? msg.getContact()
                      : null;
            if (contactPromise) {
                contact = await Promise.race([
                    contactPromise,
                    timeoutReject(2500, 'getContact_timeout'),
                ]);
            }
        } catch (_) {
            /* گروه / LID: getContact گاهی fail می‌کند */
        }

        let authorId = null;
        let authorName = null;
        if (isGroup && !isFromMe) {
            let rawAuthor =
                msg.author ||
                msg._data?.participant ||
                msg._data?.key?.participant ||
                (msg.id && typeof msg.id === 'object' && (msg.id.participant || msg.id.from)) ||
                (msg._data?.key && typeof msg._data.key === 'object' && msg._data.key.participant);
            if (!rawAuthor && msg.id && typeof msg.id === 'object' && msg.id._serialized) {
                const parts = String(msg.id._serialized).split('_');
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
                    const authorContact = await c.getContactById(authorId);
                    authorName =
                        authorContact?.name ||
                        authorContact?.pushname ||
                        authorContact?.shortName ||
                        null;
                } catch (_) {}
            }
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

        const { contactNumber, contactLid } = await resolveInboundContactIds(
            c,
            msg,
            contact,
            chat,
            isFromMe
        );
        const peerJid = serializedJid(isFromMe ? msg.to : msg.from);
        let chatId =
            serializedJid(chat && chat.id) ||
            (isGroup
                ? serializedJid(msg.from) || serializedJid(msg.to)
                : serializedJid(msg.id && msg.id.remote) || peerJid);
        let chatName = chat?.name || chat?.subject || chat?.formattedTitle || null;
        const cachedChat =
            lookupCachedChat(chatId) ||
            lookupCachedChat(peerJid) ||
            lookupCachedChat(contactLid) ||
            lookupCachedChat(contactNumber);
        if (cachedChat) {
            if (!chatId) chatId = serializedJid(cachedChat.id) || chatId;
            if (!chatName) chatName = cachedChat.name || null;
        }

        const messageData = {
            id: waMsgId,
            from: serializedJid(msg.from) || (typeof msg.from === 'string' ? msg.from : '') || '',
            to: serializedJid(msg.to) || (typeof msg.to === 'string' ? msg.to : '') || '',
            body: msg.body,
            timestamp: msg.timestamp,
            hasMedia: msg.hasMedia,
            type: msg.type,
            isForwarded: msg.isForwarded,
            isStatus: msg.isStatus,
            isStarred: msg.isStarred,
            fromMe: isFromMe,
            contact: {
                number: contactNumber,
                lid: contactLid,
                name: contact?.name || contact?.pushname || null,
                isMyContact: contact?.isMyContact,
                profilePicUrl: usableProfilePicUrl(cachedChat && cachedChat.profilePicUrl) || null,
            },
            chat: {
                id: chatId || (isGroup ? serializedJid(msg.from) : null),
                name: chatName,
                isGroup: isGroup || !!(cachedChat && cachedChat.isGroup),
                profilePicUrl: usableProfilePicUrl(cachedChat && cachedChat.profilePicUrl) || null,
            },
            author: authorId,
            authorName: authorName,
        };

        await attachMediaToMessageData(messageData, msg);

        if (await isDuplicateIncomingGatewayMessage(waMsgId)) return;

        rememberSeenChat(
            messageData.chat && messageData.chat.id,
            messageData.chat && messageData.chat.name,
            messageData.chat && messageData.chat.isGroup,
            messageData.body,
            messageData.timestamp
        );

        try {
            await deliverIncomingMessage(messageData);
        } catch (deliverErr) {
            await clearIncomingGatewayDedupe(waMsgId);
            throw deliverErr;
        }

        io.emit('new_message', messageData);
        if (messageData.id) {
            redisClient
                .hSet(`message:${messageData.id}`, 'data', JSON.stringify(messageData))
                .catch(() => {});
            redisClient.expire(`message:${messageData.id}`, 86400).catch(() => {});
        }
        if (isFromMe) {
            logger.info('📤 Outgoing message from mobile captured', {
                to: isGroup
                    ? messageData.chat.id || msg.to || null
                    : contactNumber || msg.to || null,
                isGroup,
            });
        } else {
            logger.info('📨 Message received', {
                from: contactNumber || contactLid || msg.from,
                lid: contactLid || null,
                to: serializedJid(msg.to) || null,
            });
        }
    }

    c.on('message', async (msg) => {
        healthCheckFailCount = 0;
        try {
            // پیام خروجی (fromMe) فقط از message_create می‌آید
            if (msg.fromMe) return;
            await forwardWhatsAppEventToBackend(msg);
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

    // پیام‌های خروجی موبایل (fromMe) و ورودی وقتی رویداد message شلیک نشود
    c.on('message_create', async (msg) => {
        try {
            await forwardWhatsAppEventToBackend(msg);
        } catch (error) {
            logger.error('Error processing message_create', {
                error: formatGatewayError(error),
                stack: error?.stack?.slice?.(0, 300),
            });
        }
    });

    // اضافه شدن این شماره به گروه — مکالمه را همان لحظه در CRM بساز
    c.on('group_join', async (notification) => {
        try {
            const chat = await notification.getChat().catch(() => null);
            const groupId =
                (chat && chat.id && (chat.id._serialized || chat.id)) ||
                notification?.chatId ||
                notification?.id?.remote ||
                null;
            if (!groupId || !/@g\.us$/i.test(String(groupId))) return;
            const joinId =
                notification?.id?.id || (notification?.id && notification.id._serialized) || null;
            if (joinId && (await isDuplicateIncomingGatewayMessage(joinId))) return;
            const groupName =
                (chat && (chat.name || chat.subject || chat.formattedTitle)) ||
                notification?.body ||
                null;
            const messageData = {
                id: joinId || `group_join_${String(groupId)}_${Date.now()}`,
                from: String(groupId),
                to: String(groupId),
                body: groupName
                    ? `فعالیت در گروه «${String(groupName).trim()}»`
                    : 'این شماره به گروه واتساپ اضافه شد',
                timestamp: notification?.timestamp || Math.floor(Date.now() / 1000),
                hasMedia: false,
                type: 'gp2',
                fromMe: false,
                contact: { number: null, name: groupName || null },
                chat: {
                    id: String(groupId),
                    name: groupName ? String(groupName).trim() : null,
                    isGroup: true,
                },
            };
            rememberSeenChat(
                String(groupId),
                groupName,
                true,
                messageData.body,
                messageData.timestamp
            );
            await deliverIncomingMessage(messageData);
            io.emit('new_message', messageData);
            logger.info('👥 Group join captured', { groupId: String(groupId), name: groupName });
        } catch (error) {
            logger.warn('group_join handling failed', { error: formatGatewayError(error) });
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
    throw new Error('backend_webhook_failed');
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

function usableProfilePicUrl(u) {
    if (!u || typeof u !== 'string') return null;
    const s = String(u).trim();
    if (!s || /nopicture/i.test(s)) return null;
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith('//') && /whatsapp\.net/i.test(s)) return `https:${s}`;
    if (/^data:image\//i.test(s) && s.length >= 64 && s.length < 900000) return s;
    return null;
}

function lidDigitsOf(val) {
    const s = String(val || '').trim();
    if (!s) return '';
    if (/@lid$/i.test(s)) return s.replace(/\D/g, '');
    const d = s.replace(/\D/g, '');
    if (d && d === s.replace(/\D/g, '') && !/@/.test(s) && d.length >= 14) return d;
    return '';
}

function realPhoneDigitsOf(id, phone) {
    const jid = String(id || '').trim();
    const raw = String(phone || '').trim();
    const fromPhone = raw.replace(/\D/g, '');
    const fromId = jid.replace(/\D/g, '');
    if (/@g\.us$/i.test(jid) || /@lid$/i.test(jid)) {
        if (fromPhone.length >= 8 && fromPhone !== fromId) return fromPhone;
        return '';
    }
    if (fromPhone.length >= 8 && fromPhone !== lidDigitsOf(jid)) return fromPhone;
    if (fromId.length >= 8 && !/@lid$/i.test(jid)) return fromId;
    return '';
}

function mergeTwoChatRows(prev, next) {
    const leftIsPhone = /@(c\.us|s\.whatsapp\.net)$/i.test(String(prev.id || ''));
    const rightIsPhone = /@(c\.us|s\.whatsapp\.net)$/i.test(String(next.id || ''));
    const id =
        leftIsPhone && !rightIsPhone
            ? prev.id
            : rightIsPhone && !leftIsPhone
              ? next.id
              : next.id || prev.id;
    return {
        id,
        name: next.name || prev.name,
        isGroup: !!(next.isGroup || prev.isGroup),
        lastPreview: next.lastPreview || prev.lastPreview,
        timestamp: next.timestamp || prev.timestamp,
        profilePicUrl: next.profilePicUrl || prev.profilePicUrl || null,
        phone: next.phone || prev.phone || null,
        lid: next.lid || prev.lid || null,
    };
}

function mergeChatRows(a, b) {
    const map = new Map();
    for (const row of [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]) {
        if (!row || row.id == null) continue;
        const id = String(row.id).trim();
        if (!id || !id.includes('@') || id.endsWith('@broadcast') || id === 'status@broadcast') {
            continue;
        }
        const phoneDigits = realPhoneDigitsOf(id, row.phone);
        const lidDigits = lidDigitsOf(row.lid) || (/@lid$/i.test(id) ? id.replace(/\D/g, '') : '');
        const next = {
            id,
            name: row.name ? String(row.name) : null,
            isGroup: !!row.isGroup || /@g\.us$/i.test(id),
            lastPreview: row.lastPreview ? String(row.lastPreview).slice(0, 120) : null,
            timestamp: row.timestamp || null,
            profilePicUrl: usableProfilePicUrl(row.profilePicUrl),
            phone: phoneDigits && phoneDigits.length >= 8 ? phoneDigits : null,
            lid: lidDigits && lidDigits.length >= 8 ? lidDigits : null,
        };
        const prev = map.get(id);
        map.set(id, prev ? mergeTwoChatRows(prev, next) : next);
    }
    const byId = [...map.values()];
    const groups = [];
    const keyToGroup = new Map();
    const rowKeys = (row) => {
        const keys = [`id:${String(row.id).toLowerCase()}`];
        if (row.phone) keys.push(`p:${row.phone}`);
        if (row.lid) keys.push(`l:${row.lid}`);
        return keys;
    };
    const addKeys = (group, row) => {
        for (const key of rowKeys(row)) keyToGroup.set(key, group);
    };
    const dropGroup = (group) => {
        group.dropped = true;
        for (const [key, mapped] of keyToGroup) {
            if (mapped === group) keyToGroup.delete(key);
        }
    };
    for (const row of byId) {
        if (row.isGroup || /@g\.us$/i.test(String(row.id))) {
            groups.push(row);
            continue;
        }
        const matched = [];
        const seenGroups = new Set();
        for (const key of rowKeys(row)) {
            const hit = keyToGroup.get(key);
            if (hit && !hit.dropped && !seenGroups.has(hit)) {
                seenGroups.add(hit);
                matched.push(hit);
            }
        }
        let group = matched[0] || null;
        if (!group) {
            group = { row, dropped: false };
            groups.push(group);
        } else {
            group.row = mergeTwoChatRows(group.row, row);
            for (let i = 1; i < matched.length; i++) {
                group.row = mergeTwoChatRows(group.row, matched[i].row);
                dropGroup(matched[i]);
            }
        }
        addKeys(group, group.row);
    }
    return groups.filter((g) => !g.dropped).map((g) => (g.row ? g.row : g));
}

function seenChatsFilePath() {
    return path.join(getWhatsAppSessionPath(), 'kaya-seen-chats.json');
}

let persistSeenTimer = null;
function persistSeenChatsSoon() {
    if (persistSeenTimer) return;
    persistSeenTimer = setTimeout(() => {
        persistSeenTimer = null;
        const payload = JSON.stringify({
            at: lastChatsCache.at || Date.now(),
            chats: (lastChatsCache.chats || []).slice(0, 2000).map((c) => ({
                ...c,
                profilePicUrl:
                    c && c.profilePicUrl && String(c.profilePicUrl).startsWith('data:')
                        ? null
                        : c.profilePicUrl || null,
            })),
        });
        fs.writeFile(seenChatsFilePath(), payload, 'utf8').catch(() => {});
    }, 400);
}

async function loadPersistedSeenChats() {
    try {
        const raw = await fs.readFile(seenChatsFilePath(), 'utf8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.chats) && data.chats.length) {
            lastChatsCache = {
                at: Number(data.at) || Date.now(),
                chats: data.chats,
            };
            const groupsOnly = data.chats
                .filter((c) => c && c.isGroup)
                .map((c) => ({ id: c.id, name: c.name }));
            if (groupsOnly.length) lastGroupsCache = { at: lastChatsCache.at, groups: groupsOnly };
            logger.info('Loaded persisted WhatsApp chat cache', { count: data.chats.length });
        }
    } catch (_) {}
}

function rememberChatRows(rows) {
    const merged = mergeChatRows(lastChatsCache.chats, rows);
    lastChatsCache = { at: Date.now(), chats: merged };
    const groupsOnly = merged
        .filter((c) => c && c.isGroup)
        .map((c) => ({ id: c.id, name: c.name }));
    if (groupsOnly.length) lastGroupsCache = { at: Date.now(), groups: groupsOnly };
    persistSeenChatsSoon();
    return merged;
}

function rememberSeenChat(id, name, isGroup, preview, ts, profilePicUrl, phone, lid) {
    rememberChatRows([
        {
            id,
            name,
            isGroup,
            lastPreview: preview,
            timestamp: ts,
            profilePicUrl: profilePicUrl || null,
            phone: phone || null,
            lid: lid || null,
        },
    ]);
}

async function waitForWhatsAppStore(maxMs = 18000) {
    if (!client?.pupPage) return false;
    const started = Date.now();
    while (Date.now() - started < maxMs) {
        try {
            const ok = await client.pupPage.evaluate(() => {
                if (window.Store && (window.Store.Chat || window.Store.GroupMetadata)) return true;
                try {
                    if (typeof window.require === 'function') {
                        const cols = window.require('WAWebCollections');
                        if (
                            cols &&
                            (cols.ChatCollection || cols.Chat || cols.GroupMetadataCollection)
                        ) {
                            return true;
                        }
                    }
                } catch (_) {}
                return !!(window.WWebJS && window.WWebJS.getChats);
            });
            if (ok) return true;
        } catch (_) {}
        await sleep(700);
    }
    return false;
}

async function hookChatCollectionObserver() {
    if (!client?.pupPage) return;
    try {
        await client.pupPage.exposeFunction(
            '__kayaRememberChat',
            (id, name, isGroup, preview, ts, profilePicUrl, phone) => {
                rememberSeenChat(id, name, isGroup, preview, ts, profilePicUrl, phone);
            }
        );
    } catch (_) {
        /* already exposed for this page */
    }
    try {
        await client.pupPage.evaluate(() => {
            function attach(Chat) {
                if (!Chat || typeof Chat.on !== 'function') return false;
                if (Chat.__kayaHooked) return true;
                Chat.__kayaHooked = true;
                Chat.on('add', (c) => {
                    try {
                        const id = c && c.id && (c.id._serialized || c.id);
                        if (!id || typeof window.__kayaRememberChat !== 'function') return;
                        let pic = null;
                        try {
                            const t =
                                (c && c.profilePicThumb) ||
                                (c && c.contact && c.contact.profilePicThumb);
                            const u = t && (t.eurl || t.imgFull || t.img);
                            if (u && typeof u === 'string' && !/nopicture/i.test(u)) pic = u;
                        } catch (_) {}
                        let phone = null;
                        try {
                            const num =
                                c &&
                                c.contact &&
                                (c.contact.number || c.contact.phoneNumber || c.contact.userid);
                            const d = num ? String(num).replace(/\D/g, '') : '';
                            if (d.length >= 8) phone = d;
                        } catch (_) {}
                        window.__kayaRememberChat(
                            String(id),
                            c.name || c.formattedTitle || c.subject || null,
                            !!(c.isGroup || String(id).endsWith('@g.us')),
                            null,
                            c.t || null,
                            pic,
                            phone
                        );
                    } catch (_) {}
                });
                return true;
            }
            if (attach(window.Store && window.Store.Chat)) return true;
            try {
                if (typeof window.require === 'function') {
                    const cols = window.require('WAWebCollections');
                    if (attach(cols && (cols.ChatCollection || cols.Chat))) return true;
                    const chatCol = window.require('WAWebChatCollection');
                    if (attach(chatCol && (chatCol.ChatCollection || chatCol.default || chatCol))) {
                        return true;
                    }
                }
            } catch (_) {}
            return false;
        });
    } catch (e) {
        logger.warn('Chat collection observer hook failed', { error: formatGatewayError(e) });
    }
}

function startInboundPoll() {
    stopInboundPoll();
    inboundPollTimer = setInterval(() => {
        pollUnreadIncomingMessages().catch((e) =>
            logger.warn('Inbound poll failed', { error: formatGatewayError(e) })
        );
    }, 12000);
    setTimeout(() => {
        pollUnreadIncomingMessages().catch(() => {});
    }, 8000);
}

function stopInboundPoll() {
    if (inboundPollTimer) {
        clearInterval(inboundPollTimer);
        inboundPollTimer = null;
    }
    inboundPollBusy = false;
}

async function ingestStoreInboundMessage(raw, via) {
    if (!raw || raw.fromMe) return false;
    const waMsgId = raw.id ? String(raw.id).trim() : '';
    if (!waMsgId) return false;
    if (await isDuplicateIncomingGatewayMessage(waMsgId)) return false;

    const from = serializedJid(raw.from);
    const to = serializedJid(raw.to);
    const chatId = serializedJid(raw.chatId) || from;
    const isGroup = /@g\.us$/i.test(chatId) || /@g\.us$/i.test(from);
    const contactLid = serializedJid(raw.contactLid) || (/@lid$/i.test(from) ? from : '') || '';
    let contactNumber = raw.contactNumber ? digitsOnly(raw.contactNumber) : '';
    if (contactNumber && isOwnAccountJid(contactNumber)) contactNumber = '';
    if (!contactNumber && contactLid) {
        const mapped = await tryResolvePhoneFromLid(client, contactLid);
        if (mapped && !isOwnAccountJid(mapped)) contactNumber = mapped;
    }

    const messageData = {
        id: waMsgId,
        from: from || chatId,
        to: to || '',
        body: raw.body || '',
        timestamp: raw.timestamp || Math.floor(Date.now() / 1000),
        hasMedia: !!raw.hasMedia,
        type: raw.type || 'chat',
        fromMe: false,
        contact: {
            number: contactNumber || null,
            lid: contactLid || null,
            name: raw.notifyName || raw.chatName || null,
        },
        chat: {
            id: chatId || from,
            name: raw.chatName || raw.notifyName || null,
            isGroup,
        },
        author: raw.author || null,
        authorName: raw.authorName || raw.notifyName || null,
    };

    if (raw.media && raw.media.data) {
        const fallback = defaultMediaMeta(raw.type);
        messageData.hasMedia = true;
        messageData.media = {
            mimetype: raw.media.mimetype || fallback.mimetype,
            filename: raw.media.filename || fallback.filename,
            data: raw.media.data,
        };
    } else if (isMediaMessageType(raw.type, raw.hasMedia)) {
        let waMsg = null;
        if (raw.serializedId && client && typeof client.getMessageById === 'function') {
            try {
                waMsg = await Promise.race([
                    client.getMessageById(raw.serializedId),
                    timeoutReject(4000, 'getMessageById_timeout'),
                ]);
            } catch (_) {}
        }
        await attachMediaToMessageData(
            messageData,
            waMsg || {
                id: { _serialized: raw.serializedId || '', id: raw.id },
                type: raw.type,
            }
        );
    }

    try {
        await deliverIncomingMessage(messageData);
    } catch (err) {
        await clearIncomingGatewayDedupe(waMsgId);
        throw err;
    }
    logger.info('📨 Message received', {
        from: contactNumber || contactLid || from,
        lid: contactLid || null,
        to: to || null,
        via: via || 'store',
        type: messageData.type || null,
        hasMediaBytes: !!(messageData.media && messageData.media.data),
    });
    return true;
}

async function hookIncomingMessageObserver() {
    if (!client?.pupPage) return;
    try {
        await client.pupPage.exposeFunction('__kayaInboundMessage', (raw) => {
            ingestStoreInboundMessage(raw, 'store_hook').catch((e) =>
                logger.warn('Store inbound ingest failed', { error: formatGatewayError(e) })
            );
        });
    } catch (_) {
        /* already exposed for this page */
    }
    try {
        const hooked = await client.pupPage.evaluate(() => {
            function jidOf(v) {
                if (!v) return '';
                if (typeof v === 'string') return v;
                if (v._serialized) return String(v._serialized);
                if (v.user && v.server) return `${v.user}@${v.server}`;
                return '';
            }
            function toB64(input) {
                if (!input) return '';
                if (typeof input === 'string') return input;
                let bytes;
                if (input instanceof ArrayBuffer) bytes = new Uint8Array(input);
                else if (input.buffer && input.byteLength != null) {
                    bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
                } else if (Array.isArray(input)) bytes = new Uint8Array(input);
                else return '';
                const chunk = 0x8000;
                let bin = '';
                for (let i = 0; i < bytes.length; i += chunk) {
                    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
                }
                return btoa(bin);
            }
            function guessMime(type, given) {
                if (given && typeof given === 'string') return given;
                if (type === 'ptt' || type === 'audio') return 'audio/ogg; codecs=opus';
                if (type === 'sticker') return 'image/webp';
                if (type === 'image') return 'image/jpeg';
                if (type === 'video') return 'video/mp4';
                return 'application/octet-stream';
            }
            async function extractMediaFromStoreMsg(m, type) {
                if (!m) return null;
                const mediaData = m.mediaData || {};
                const blobOf = (b) => (b && (b._blob || b)) || null;
                for (let i = 0; i < 8; i++) {
                    try {
                        const blob = blobOf(mediaData.mediaBlob) || blobOf(mediaData.previewBlob);
                        if (blob && typeof blob.arrayBuffer === 'function') {
                            const buf = await blob.arrayBuffer();
                            if (buf && buf.byteLength > 32) {
                                return {
                                    data: toB64(buf),
                                    mimetype: guessMime(type, m.mimetype || mediaData.mimetype),
                                    filename: m.filename || mediaData.filename || null,
                                };
                            }
                        }
                    } catch (_) {}
                    if (typeof mediaData.downloadMedia === 'function') {
                        try {
                            await mediaData.downloadMedia();
                        } catch (_) {}
                    }
                    if (i < 7) await new Promise((r) => setTimeout(r, 250));
                }
                const dm = window.Store && window.Store.DownloadManager;
                const directPath = m.directPath || mediaData.directPath;
                const mediaKey = m.mediaKey || mediaData.mediaKey;
                const decrypt =
                    dm && (dm.downloadAndMaybeDecrypt || dm.downloadAndDecrypt || dm.downloadMedia);
                if (decrypt && directPath && mediaKey) {
                    try {
                        const downloaded = await decrypt.call(dm, {
                            directPath,
                            encFilehash: m.encFilehash || mediaData.encFilehash,
                            filehash: m.filehash || mediaData.filehash,
                            mediaKey,
                            mediaKeyTimestamp: m.mediaKeyTimestamp || mediaData.mediaKeyTimestamp,
                            type: type === 'ptt' ? 'audio' : type,
                            signal: new AbortController().signal,
                        });
                        if (downloaded) {
                            let buf = downloaded;
                            if (downloaded.arrayBuffer) buf = await downloaded.arrayBuffer();
                            else if (downloaded.buffer) buf = downloaded.buffer;
                            const data = toB64(buf);
                            if (data) {
                                return {
                                    data,
                                    mimetype: guessMime(type, m.mimetype || mediaData.mimetype),
                                    filename: m.filename || mediaData.filename || null,
                                };
                            }
                        }
                    } catch (_) {}
                }
                return null;
            }
            function packMsg(m) {
                if (!m) return null;
                const idObj = m.id || {};
                if (idObj.fromMe || m.fromMe) return null;
                const type = String(m.type || 'chat');
                if (m.isStatusV3 || m.broadcast) return null;
                if (
                    type === 'e2e_notification' ||
                    type === 'protocol' ||
                    type === 'ciphertext' ||
                    type === 'notification_template'
                ) {
                    return null;
                }
                const from = jidOf(m.from) || jidOf(idObj.remote);
                const to = jidOf(m.to);
                const chatId = jidOf(idObj.remote) || from;
                const lid = /@lid$/i.test(from) ? from : /@lid$/i.test(chatId) ? chatId : '';
                let contactNumber = '';
                try {
                    const c = m.senderObj || m.contact;
                    const n = c && (c.number || c.phoneNumber);
                    const d = n ? String(n).replace(/\D/g, '') : '';
                    if (d.length >= 8 && d.length <= 15) contactNumber = d;
                } catch (_) {}
                return {
                    id: idObj.id || '',
                    serializedId: idObj._serialized || '',
                    from,
                    to,
                    chatId,
                    body: m.body || m.caption || '',
                    timestamp: m.t || 0,
                    type,
                    hasMedia: !!(
                        m.hasMedia ||
                        ['image', 'video', 'ptt', 'audio', 'document', 'sticker'].indexOf(type) >= 0
                    ),
                    notifyName: m.notifyName || m.verifiedName || '',
                    chatName: '',
                    contactNumber,
                    contactLid: lid,
                    author: jidOf(m.author) || jidOf(idObj.participant) || '',
                    fromMe: false,
                };
            }
            function attach(Msg) {
                if (!Msg || typeof Msg.on !== 'function') return false;
                if (Msg.__kayaInboundHooked) return true;
                Msg.__kayaInboundHooked = true;
                Msg.on('add', (m) => {
                    (async () => {
                        const packed = packMsg(m);
                        if (!packed || !packed.id) return;
                        const now = Math.floor(Date.now() / 1000);
                        if (packed.timestamp && packed.timestamp < now - 180) return;
                        if (packed.hasMedia) {
                            try {
                                packed.media = await extractMediaFromStoreMsg(m, packed.type);
                            } catch (_) {}
                        }
                        if (typeof window.__kayaInboundMessage === 'function') {
                            window.__kayaInboundMessage(packed);
                        }
                    })().catch(() => {});
                });
                return true;
            }
            if (attach(window.Store && window.Store.Msg)) return true;
            try {
                if (typeof window.require === 'function') {
                    const cols = window.require('WAWebCollections');
                    if (attach(cols && (cols.MsgCollection || cols.Msg))) return true;
                    const msgCol = window.require('WAWebMsgCollection');
                    if (attach(msgCol && (msgCol.MsgCollection || msgCol.default || msgCol))) {
                        return true;
                    }
                }
            } catch (_) {}
            return false;
        });
        if (hooked) logger.info('Store inbound message hook attached');
        else logger.warn('Store inbound message hook not attached — poller remains active');
    } catch (e) {
        logger.warn('Incoming message observer hook failed', { error: formatGatewayError(e) });
    }
}

async function pollUnreadIncomingMessages() {
    if (inboundPollBusy || !client?.pupPage || !isWhatsAppUsable()) return;
    inboundPollBusy = true;
    beginWaOps();
    try {
        const rows = await Promise.race([
            client.pupPage.evaluate(() => {
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
                    return [];
                }
                function jidOf(v) {
                    if (!v) return '';
                    if (typeof v === 'string') return v;
                    if (v._serialized) return String(v._serialized);
                    if (v.user && v.server) return `${v.user}@${v.server}`;
                    return '';
                }
                function packMsg(m) {
                    if (!m) return null;
                    const idObj = m.id || {};
                    if (idObj.fromMe || m.fromMe) return null;
                    const type = String(m.type || 'chat');
                    if (m.isStatusV3 || m.broadcast) return null;
                    if (
                        type === 'e2e_notification' ||
                        type === 'protocol' ||
                        type === 'ciphertext' ||
                        type === 'notification_template'
                    ) {
                        return null;
                    }
                    const from = jidOf(m.from) || jidOf(idObj.remote);
                    const to = jidOf(m.to);
                    const chatId = jidOf(idObj.remote) || from;
                    const lid = /@lid$/i.test(from) ? from : /@lid$/i.test(chatId) ? chatId : '';
                    let contactNumber = '';
                    try {
                        const c = m.senderObj || m.contact;
                        const n = c && (c.number || c.phoneNumber);
                        const d = n ? String(n).replace(/\D/g, '') : '';
                        if (d.length >= 8 && d.length <= 15) contactNumber = d;
                    } catch (_) {}
                    return {
                        id: idObj.id || '',
                        serializedId: idObj._serialized || '',
                        from,
                        to,
                        chatId,
                        body: m.body || m.caption || '',
                        timestamp: m.t || 0,
                        type,
                        hasMedia: !!(
                            m.hasMedia ||
                            ['image', 'video', 'ptt', 'audio', 'document', 'sticker'].indexOf(
                                type
                            ) >= 0
                        ),
                        notifyName: m.notifyName || m.verifiedName || '',
                        chatName: '',
                        contactNumber,
                        contactLid: lid,
                        author: jidOf(m.author) || jidOf(idObj.participant) || '',
                        fromMe: false,
                    };
                }
                const now = Math.floor(Date.now() / 1000);
                const out = [];
                const seen = Object.create(null);
                const store = window.Store || {};
                const models = collectModels(store.Msg);
                for (let i = 0; i < models.length; i++) {
                    const packed = packMsg(models[i]);
                    if (!packed || !packed.id || seen[packed.id]) continue;
                    if (packed.timestamp && packed.timestamp < now - 180) continue;
                    seen[packed.id] = true;
                    out.push(packed);
                    if (out.length >= 40) break;
                }
                const chats = collectModels(store.Chat);
                for (let i = 0; i < chats.length; i++) {
                    const chat = chats[i];
                    if (!chat || !(Number(chat.unreadCount) > 0)) continue;
                    const msgs = collectModels(chat.msgs);
                    const start = Math.max(0, msgs.length - 8);
                    for (let j = start; j < msgs.length; j++) {
                        const packed = packMsg(msgs[j]);
                        if (!packed || !packed.id || seen[packed.id]) continue;
                        if (packed.timestamp && packed.timestamp < now - 600) continue;
                        seen[packed.id] = true;
                        packed.chatName = chat.name || chat.formattedTitle || chat.subject || '';
                        out.push(packed);
                    }
                }
                return out;
            }),
            timeoutReject(5000, 'inbound_poll_timeout'),
        ]);
        if (!Array.isArray(rows) || !rows.length) return;
        let accepted = 0;
        for (const raw of rows) {
            try {
                if (await ingestStoreInboundMessage(raw, 'store_poll')) accepted += 1;
            } catch (e) {
                logger.warn('Inbound poll item failed', { error: formatGatewayError(e) });
            }
        }
        if (accepted) {
            logger.info('Inbound poll delivered messages', { accepted, scanned: rows.length });
        }
    } catch (e) {
        if (String(e && e.message) !== 'inbound_poll_timeout') {
            logger.warn('Inbound poll evaluate failed', { error: formatGatewayError(e) });
        }
    } finally {
        endWaOps();
        inboundPollBusy = false;
    }
}

/** استخراج چت/گروه از صفحهٔ واتساپ وب (Store + ماژول‌های جدید + WWebJS) */
async function attachPaneAvatars(rows) {
    if (!client?.pupPage || !Array.isArray(rows)) return rows || [];
    try {
        const extras = await Promise.race([
            client.pupPage.evaluate(async () => {
                function jidFrom(raw) {
                    const m = String(raw || '').match(
                        /([0-9]+(?:-[0-9]+)?@(?:c\.us|g\.us|lid|s\.whatsapp\.net))/i
                    );
                    return m ? m[1] : null;
                }
                function toDataUrl(buf, ct) {
                    const bytes = new Uint8Array(buf);
                    const chunk = 0x8000;
                    let bin = '';
                    for (let i = 0; i < bytes.length; i += chunk) {
                        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
                    }
                    return 'data:' + (ct || 'image/jpeg') + ';base64,' + btoa(bin);
                }
                const nodes = document.querySelectorAll(
                    '#pane-side [data-id], [data-testid="cell-phone-wrapper"][data-id], #pane-side [role="listitem"] [data-id], #pane-side [role="row"]'
                );
                const out = [];
                const seen = Object.create(null);
                for (let i = 0; i < nodes.length; i++) {
                    const el = nodes[i];
                    const raw =
                        el.getAttribute('data-id') ||
                        (el.querySelector && el.querySelector('[data-id]')
                            ? el.querySelector('[data-id]').getAttribute('data-id')
                            : '');
                    const id = jidFrom(raw);
                    if (!id || seen[id]) continue;
                    const img = el.querySelector && el.querySelector('img');
                    if (!img) continue;
                    const src = String(img.currentSrc || img.src || img.getAttribute('src') || '');
                    if (/^https?:\/\//i.test(src) && !/nopicture/i.test(src)) {
                        seen[id] = true;
                        out.push({ id, url: src });
                        continue;
                    }
                    if (!/^blob:/i.test(src)) continue;
                    try {
                        const res = await fetch(src);
                        const buf = await res.arrayBuffer();
                        if (!buf || buf.byteLength < 32 || buf.byteLength > 400000) continue;
                        const headerCt =
                            (res.headers && res.headers.get && res.headers.get('content-type')) ||
                            'image/jpeg';
                        seen[id] = true;
                        out.push({ id, url: toDataUrl(buf, String(headerCt).split(';')[0]) });
                    } catch (_) {}
                }
                return out;
            }),
            timeoutReject(4000, 'pane_avatar_timeout'),
        ]);
        if (!Array.isArray(extras) || !extras.length) return rows;
        const map = new Map();
        for (const x of extras) {
            if (x && x.id && x.url) map.set(String(x.id), x.url);
        }
        const seenId = new Set();
        const merged = rows.map((r) => {
            if (!r || !r.id) return r;
            seenId.add(String(r.id));
            if (r.profilePicUrl) return r;
            const u = map.get(String(r.id));
            return u ? { ...r, profilePicUrl: u } : r;
        });
        map.forEach((url, id) => {
            if (seenId.has(id)) return;
            merged.push({
                id,
                name: null,
                isGroup: /@g\.us$/i.test(id),
                lastPreview: null,
                timestamp: null,
                profilePicUrl: url,
                phone: null,
            });
        });
        return merged;
    } catch (_) {
        return rows;
    }
}

async function extractWhatsAppChatsInBrowser() {
    if (!client?.pupPage) throw new Error('pupPage_unavailable');
    const out = await client.pupPage.evaluate(() => {
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
            if (typeof id === 'string' && id.includes('@')) return id;
            return null;
        }

        function usablePic(u) {
            if (!u || typeof u !== 'string') return null;
            const s = String(u).trim();
            if (!s || /nopicture/i.test(s)) return null;
            if (/^https?:\/\//i.test(s)) return s;
            if (s.indexOf('//') === 0 && /whatsapp\.net/i.test(s)) return 'https:' + s;
            if (/^data:image\//i.test(s) && s.length >= 64 && s.length < 900000) return s;
            return null;
        }
        function fromThumb(t) {
            if (!t) return null;
            try {
                if (typeof t === 'string') return usablePic(t);
                const named =
                    usablePic(t.eurl) ||
                    usablePic(t.__x_eurl) ||
                    usablePic(t.imgFull) ||
                    usablePic(t.__x_imgFull) ||
                    usablePic(t.img) ||
                    usablePic(t.__x_img) ||
                    usablePic(t.previewEurl) ||
                    usablePic(t.__x_previewEurl) ||
                    usablePic(t.preview) ||
                    usablePic(t.__x_preview) ||
                    (t.attributes ? fromThumb(t.attributes) : null);
                if (named) return named;
                const keys = Object.keys(t);
                for (let i = 0; i < Math.min(keys.length, 40); i++) {
                    const p = usablePic(t[keys[i]]);
                    if (p) return p;
                }
            } catch (_) {}
            return null;
        }
        function picOf(model) {
            if (!model) return null;
            return (
                fromThumb(model.profilePicThumb) ||
                usablePic(model.profilePicUrl) ||
                usablePic(model.imgUrl) ||
                (model.contact &&
                    (fromThumb(model.contact.profilePicThumb) ||
                        usablePic(model.contact.profilePicUrl))) ||
                (model.groupMetadata && fromThumb(model.groupMetadata.profilePicThumb))
            );
        }
        function picFromStoreByJid(jid) {
            const store = window.Store;
            if (!store || !jid) return null;
            let wid = jid;
            try {
                if (store.WidFactory && typeof store.WidFactory.createWid === 'function') {
                    wid = store.WidFactory.createWid(jid);
                }
            } catch (_) {}
            const cols = [store.ProfilePicThumb, store.ProfilePic];
            for (let i = 0; i < cols.length; i++) {
                const col = cols[i];
                if (!col) continue;
                try {
                    if (typeof col.get === 'function') {
                        const m = col.get(wid) || col.get(jid);
                        const p = fromThumb(m);
                        if (p) return p;
                    }
                } catch (_) {}
                try {
                    if (col._index) {
                        const m =
                            col._index[jid] || col._index[String(jid)] || col._index[String(wid)];
                        const p = fromThumb(m);
                        if (p) return p;
                    }
                } catch (_) {}
            }
            return null;
        }

        const seen = Object.create(null);
        const out = [];

        function pushChat(ser, name, isGroup, preview, ts, profilePicUrl, phone, lid) {
            if (!ser) return;
            const s = String(ser);
            if (!s.includes('@')) return;
            if (s === 'status@broadcast' || s.endsWith('@broadcast')) return;
            const pic = usablePic(profilePicUrl);
            const idDigits = s.replace(/\D/g, '');
            let phoneDigits = phone ? String(phone).replace(/\D/g, '') : '';
            if (s.indexOf('@lid') !== -1 && phoneDigits === idDigits) phoneDigits = '';
            let lidDigits = lid ? String(lid).replace(/\D/g, '') : '';
            if (!lidDigits && s.indexOf('@lid') !== -1) lidDigits = idDigits;
            if (seen[s]) {
                if (name && !seen[s].name) seen[s].name = String(name);
                if (isGroup) seen[s].isGroup = true;
                if (preview && !seen[s].lastPreview)
                    seen[s].lastPreview = String(preview).slice(0, 120);
                if (ts && !seen[s].timestamp) seen[s].timestamp = ts;
                if (pic && !seen[s].profilePicUrl) seen[s].profilePicUrl = pic;
                if (phoneDigits.length >= 8 && !seen[s].phone) seen[s].phone = phoneDigits;
                if (lidDigits.length >= 8 && !seen[s].lid) seen[s].lid = lidDigits;
                return;
            }
            const row = {
                id: s,
                name: name ? String(name) : null,
                isGroup: !!isGroup || s.endsWith('@g.us'),
                lastPreview: preview ? String(preview).slice(0, 120) : null,
                timestamp: ts || null,
                profilePicUrl: pic,
                phone: phoneDigits.length >= 8 ? phoneDigits : null,
                lid: lidDigits.length >= 8 ? lidDigits : null,
            };
            seen[s] = row;
            out.push(row);
        }

        function ingestCollection(collection, forceGroup) {
            const models = collectModels(collection);
            for (let i = 0; i < models.length; i++) {
                const c = models[i];
                const ser = jidOf(c);
                if (!ser) continue;
                const isGroup = !!(forceGroup || (c && c.isGroup) || String(ser).endsWith('@g.us'));
                const name =
                    (c &&
                        (c.name ||
                            c.subject ||
                            c.formattedTitle ||
                            c.verifiedName ||
                            (c.contact && (c.contact.name || c.contact.pushname)) ||
                            (c.groupMetadata && c.groupMetadata.subject))) ||
                    null;
                let preview = null;
                let ts = null;
                try {
                    if (c && c.lastMessage) {
                        preview =
                            c.lastMessage.body ||
                            c.lastMessage.caption ||
                            (c.lastMessage.type ? '[' + c.lastMessage.type + ']' : null);
                        ts = c.lastMessage.t || c.lastMessage.timestamp || null;
                    } else if (c && typeof c.t === 'number') {
                        ts = c.t;
                    }
                    if (!preview && c && c.previewMessage) {
                        preview = c.previewMessage.body || c.previewMessage.caption || null;
                    }
                } catch (_) {}
                const pic = picOf(c) || picFromStoreByJid(ser);
                let phoneDigits = null;
                let lidDigits = null;
                if (!isGroup) {
                    try {
                        const contact = c && c.contact;
                        const rawLid =
                            (contact && (contact.lid || contact.lidUser || contact.lidJid)) || null;
                        if (rawLid) {
                            const lidSer =
                                rawLid._serialized ||
                                (rawLid.user && rawLid.server
                                    ? String(rawLid.user) + '@' + String(rawLid.server)
                                    : rawLid);
                            const ld = String(lidSer || '').replace(/\D/g, '');
                            if (ld.length >= 8) lidDigits = ld;
                        }
                        const num =
                            (contact &&
                                (contact.number || contact.phoneNumber || contact.userid)) ||
                            (c && c.formattedNumber);
                        const numStr = num ? String(num) : '';
                        const d = numStr.replace(/\D/g, '');
                        if (d.length >= 8 && numStr.indexOf('@lid') === -1 && d !== lidDigits) {
                            phoneDigits = d;
                        }
                    } catch (_) {}
                }
                pushChat(ser, name, isGroup, preview, ts, pic, phoneDigits, lidDigits);
            }
        }

        function ingestStore(store) {
            if (!store) return;
            ingestCollection(store.Chat || store.ChatCollection, false);
            ingestCollection(store.GroupMetadata || store.GroupMetadataCollection, true);
        }

        ingestStore(window.Store);

        const reqNames = [
            'WAWebCollections',
            'WAWebChatCollection',
            'WAWebGroupMetadataCollection',
            'WAWebGroupChatCollection',
        ];
        if (typeof window.require === 'function') {
            for (let i = 0; i < reqNames.length; i++) {
                try {
                    const mod = window.require(reqNames[i]);
                    if (!mod) continue;
                    ingestStore(mod);
                    ingestCollection(mod.ChatCollection || mod.Chat || mod.default, false);
                    ingestCollection(mod.GroupMetadataCollection || mod.GroupMetadata, true);
                } catch (_) {}
            }
        }

        try {
            if (window.WWebJS && typeof window.WWebJS.getChats === 'function') {
                const wchats = window.WWebJS.getChats();
                ingestCollection(Array.isArray(wchats) ? wchats : collectModels(wchats), false);
            }
        } catch (_) {}

        try {
            const cache = window.require && (window.require.c || window.require.cache);
            if (cache) {
                const keys = Object.keys(cache);
                const max = Math.min(keys.length, 2500);
                for (let i = 0; i < max; i++) {
                    const mod = cache[keys[i]];
                    const exp = mod && (mod.exports || mod);
                    if (!exp || typeof exp !== 'object') continue;
                    const col =
                        exp.ChatCollection ||
                        exp.GroupMetadataCollection ||
                        (exp.getModelsArray || exp.models ? exp : null);
                    if (!col) continue;
                    const looksGroup =
                        !!(exp.GroupMetadataCollection || exp.GroupMetadata) ||
                        (typeof exp.name === 'string' && /group/i.test(exp.name));
                    ingestCollection(col, looksGroup);
                }
            }
        } catch (_) {}

        try {
            const chatStore = window.Store && window.Store.Chat;
            if (chatStore && chatStore._index) {
                Object.keys(chatStore._index).forEach((id) => {
                    const model = chatStore._index[id];
                    if (model) ingestCollection([model], false);
                    else if (String(id).includes('@')) {
                        pushChat(id, null, /@g\.us$/i.test(String(id)), null, null);
                    }
                });
            }
        } catch (_) {}

        try {
            const nodes = document.querySelectorAll(
                '#pane-side [data-id], [data-testid="cell-phone-wrapper"][data-id], #pane-side [role="listitem"] [data-id], #pane-side [role="row"]'
            );
            nodes.forEach((el) => {
                const raw = String(
                    el.getAttribute('data-id') ||
                        (el.querySelector && el.querySelector('[data-id]')
                            ? el.querySelector('[data-id]').getAttribute('data-id')
                            : '') ||
                        ''
                );
                const m = raw.match(/([0-9]+(?:-[0-9]+)?@(?:c\.us|g\.us|lid|s\.whatsapp\.net))/i);
                if (!m) return;
                const id = m[1];
                let name = '';
                const t = el.querySelector && el.querySelector('span[title], [title]');
                if (t) name = t.getAttribute('title') || t.textContent || '';
                let pic = null;
                try {
                    const img = el.querySelector && el.querySelector('img');
                    const src = img && (img.currentSrc || img.src || img.getAttribute('src'));
                    pic = usablePic(src);
                } catch (_) {}
                pushChat(id, String(name).trim() || null, /@g\.us$/i.test(id), null, null, pic);
            });
        } catch (_) {}

        try {
            const pane =
                document.querySelector('#pane-side') ||
                document.querySelector('[data-testid="chat-list"]');
            const html = pane
                ? String(pane.innerHTML || '')
                : String(document.body.innerHTML || '');
            const re = /([0-9]+(?:-[0-9]+)?@(?:c\.us|g\.us|lid|s\.whatsapp\.net))/gi;
            let m;
            while ((m = re.exec(html))) {
                pushChat(m[1], null, /@g\.us$/i.test(m[1]), null, null);
            }
        } catch (_) {}

        try {
            const thumbs =
                (window.Store && (window.Store.ProfilePicThumb || window.Store.ProfilePic)) || null;
            const thumbModels = collectModels(thumbs);
            for (let i = 0; i < thumbModels.length; i++) {
                const m = thumbModels[i];
                const ser = jidOf(m);
                const pic = fromThumb(m);
                if (ser && pic) pushChat(ser, null, /@g\.us$/i.test(ser), null, null, pic, null);
            }
            if (thumbs && thumbs._index) {
                Object.keys(thumbs._index).forEach((id) => {
                    const pic = fromThumb(thumbs._index[id]);
                    if (pic && String(id).includes('@')) {
                        pushChat(id, null, /@g\.us$/i.test(String(id)), null, null, pic, null);
                    }
                });
            }
        } catch (_) {}

        return out;
    });
    return attachPaneAvatars(Array.isArray(out) ? out : []);
}

async function hydrateWhatsAppChatList() {
    if (!client?.pupPage) return;
    try {
        await client.pupPage
            .waitForSelector('#pane-side, [data-testid="chat-list"], [data-testid="chatlist"]', {
                timeout: 8000,
            })
            .catch(() => null);
        const n = await client.pupPage.evaluate(async () => {
            const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
            const pane =
                document.querySelector('#pane-side') ||
                document.querySelector('[data-testid="chat-list"]') ||
                document.querySelector('[data-testid="chatlist"]');
            if (!pane) return 0;
            const max = Math.max(Number(pane.scrollHeight) || 0, 4000);
            for (let i = 0; i <= 10; i++) {
                pane.scrollTop = (max * i) / 10;
                await sleep(250);
            }
            pane.scrollTop = 0;
            await sleep(400);
            return pane.querySelectorAll('[data-id], [role="listitem"], [role="row"]').length;
        });
        logger.info('hydrated WhatsApp chat list pane', { nodes: n });
    } catch (e) {
        logger.warn('hydrate WhatsApp chat list failed', { error: e.message });
    }
}

async function listWhatsAppGroupsFromStore() {
    const all = await extractWhatsAppChatsInBrowser();
    return (Array.isArray(all) ? all : [])
        .filter((c) => c && (c.isGroup || String(c.id || '').endsWith('@g.us')))
        .map((c) => ({ id: c.id, name: c.name || null }));
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
            const merged = rememberChatRows(
                fromStore.map((g) => ({
                    id: g.id,
                    name: g.name,
                    isGroup: true,
                }))
            );
            const groups = merged.filter((c) => c.isGroup).map((c) => ({ id: c.id, name: c.name }));
            logger.info('WhatsApp groups listed from Store', { count: groups.length });
            return groups;
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
    return extractWhatsAppChatsInBrowser();
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

    await waitForWhatsAppStore(12000).catch(() => false);
    await hookChatCollectionObserver().catch(() => {});
    await hydrateWhatsAppChatList();

    const remember = (rows) => rememberChatRows(rows);

    try {
        const fromStore = await Promise.race([
            listWhatsAppAllChatsFromStore(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('getChats_store_timeout')), 12000)
            ),
        ]);
        if (Array.isArray(fromStore) && fromStore.length > 0) {
            const merged = remember(fromStore);
            logger.info('WhatsApp chats listed from Store', {
                count: merged.length,
                fromStore: fromStore.length,
                groups: merged.filter((c) => c.isGroup).length,
                withPic: merged.filter((c) => c.profilePicUrl).length,
            });
            return merged;
        }
    } catch (storeErr) {
        logger.warn('Chat list via Store failed', {
            error: formatGatewayError(storeErr),
        });
    }

    try {
        const chats = await Promise.race([
            client.getChats(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('getChats_timeout')), 20000)
            ),
        ]);
        const list = Array.isArray(chats) ? chats : [];
        const mapped = list
            .map((c) => {
                const id = (c && c.id && (c.id._serialized || c.id)) || null;
                if (!id) return null;
                return {
                    id: String(id),
                    name: c.name || c.subject || c.formattedTitle || null,
                    isGroup: !!c.isGroup || /@g\.us$/i.test(String(id)),
                    lastPreview: c.lastMessage
                        ? String(c.lastMessage.body || c.lastMessage.caption || '').slice(0, 120)
                        : null,
                    timestamp: Number(c.timestamp) || null,
                };
            })
            .filter(Boolean);
        if (mapped.length) {
            const merged = remember(mapped);
            logger.info('WhatsApp chats listed via getChats', {
                count: merged.length,
                groups: merged.filter((c) => c.isGroup).length,
            });
            return merged;
        }
    } catch (chatsErr) {
        logger.warn('getChats fallback failed', {
            error: formatGatewayError(chatsErr),
        });
    }

    if (lastChatsCache.chats?.length) {
        logger.warn('Serving cached WhatsApp chats', {
            cached: lastChatsCache.chats.length,
            ageMs: Date.now() - (lastChatsCache.at || 0),
        });
        return lastChatsCache.chats;
    }
    logger.warn('WhatsApp chat list empty after hydrate + store + getChats');
    return [];
}

function resolveIdVariants(id) {
    const s = String(id || '').trim();
    if (!s) return [];
    const out = new Set([s]);
    const digits = s.replace(/\D/g, '');
    if (/@g\.us$/i.test(s)) {
        out.add(s.toLowerCase());
        return [...out];
    }
    if (digits.length >= 10 && digits.length <= 15) {
        out.add(digits);
        out.add(`${digits}@c.us`);
        out.add(`${digits}@s.whatsapp.net`);
    }
    if (/@lid$/i.test(s)) out.add(s);
    return [...out];
}

function timeoutReject(ms, label) {
    return new Promise((_, reject) => setTimeout(() => reject(new Error(label)), ms));
}

async function chatHasHistory(chat) {
    if (!chat) return false;
    if (chat.lastMessage) return true;
    if (Number(chat.timestamp) > 0) return true;
    try {
        const msgs = await Promise.race([
            chat.fetchMessages({ limit: 1 }),
            timeoutReject(2500, 'history_timeout'),
        ]);
        return Array.isArray(msgs) && msgs.length > 0;
    } catch (_) {
        return false;
    }
}

async function lookupChatOnSession(raw) {
    const variants = resolveIdVariants(raw);
    for (const id of variants) {
        try {
            const chat = await Promise.race([
                client.getChatById(id),
                timeoutReject(3000, 'resolve_timeout'),
            ]);
            if (chat && (await chatHasHistory(chat))) return chat;
        } catch (_) {}
    }
    const digits = String(raw || '').replace(/\D/g, '');
    const numberCandidates = [];
    if (digits.length >= 10 && digits.length <= 15) numberCandidates.push(digits);
    if (/^9\d{9}$/.test(digits)) numberCandidates.push('98' + digits);
    if (/^0\d{10}$/.test(digits)) numberCandidates.push('98' + digits.slice(1));
    if (/^5\d{9}$/.test(digits)) numberCandidates.push('90' + digits);
    if (typeof client.getNumberId === 'function') {
        for (const num of [...new Set(numberCandidates)]) {
            try {
                const wid = await Promise.race([
                    client.getNumberId(num),
                    timeoutReject(3000, 'numberid_timeout'),
                ]);
                const ser =
                    (wid && (wid._serialized || (wid.id && wid.id._serialized))) ||
                    (wid && wid.user && wid.server ? `${wid.user}@${wid.server}` : null);
                if (!ser) continue;
                const chat = await Promise.race([
                    client.getChatById(ser),
                    timeoutReject(3000, 'resolve_timeout'),
                ]);
                if (chat && (await chatHasHistory(chat))) return chat;
            } catch (_) {}
        }
    }
    return null;
}

function lookupCachedChat(raw) {
    const key = String(raw || '').trim();
    if (!key) return null;
    const rows = lastChatsCache.chats || [];
    return rows.find((row) => listedChatMatchesRequest(row, key)) || null;
}

function listedChatMatchesRequest(row, raw) {
    const id = String((row && row.id) || '').toLowerCase();
    const req = String(raw || '')
        .trim()
        .toLowerCase();
    if (!id || !req) return false;
    if (id === req) return true;
    const a = id.replace(/\D/g, '');
    const b = req.replace(/\D/g, '');
    if (b.length >= 10 && a.length >= 10 && (a === b || a.endsWith(b) || b.endsWith(a)))
        return true;
    const rowPhone = String((row && row.phone) || '').replace(/\D/g, '');
    if (
        b.length >= 10 &&
        rowPhone.length >= 10 &&
        (rowPhone === b || rowPhone.endsWith(b) || b.endsWith(rowPhone))
    ) {
        return true;
    }
    return false;
}

let lastStorePicRefreshAt = 0;
let storePicRefreshInflight = null;

async function refreshStoreProfilePicsOnce() {
    if (storePicRefreshInflight) return storePicRefreshInflight;
    if (Date.now() - lastStorePicRefreshAt < 15000 && (lastChatsCache.chats || []).length) {
        return;
    }
    lastStorePicRefreshAt = Date.now();
    storePicRefreshInflight = Promise.race([
        listWhatsAppAllChatsFromStore(),
        timeoutReject(8000, 'store_pic_list_timeout'),
    ])
        .then((rows) => {
            if (Array.isArray(rows) && rows.length) rememberChatRows(rows);
        })
        .catch(() => {})
        .finally(() => {
            storePicRefreshInflight = null;
        });
    return storePicRefreshInflight;
}

async function tryStoreProfilePicUrl(jid) {
    if (!client?.pupPage || !jid) return null;
    try {
        const url = await Promise.race([
            client.pupPage.evaluate((rawJid) => {
                function usable(u) {
                    if (!u || typeof u !== 'string') return null;
                    const s = String(u).trim();
                    if (!s || /nopicture/i.test(s)) return null;
                    if (/^https?:\/\//i.test(s)) return s;
                    if (s.indexOf('//') === 0 && /whatsapp\.net/i.test(s)) return 'https:' + s;
                    if (/^data:image\//i.test(s) && s.length >= 64 && s.length < 900000) return s;
                    return null;
                }
                function fromThumb(t) {
                    if (!t) return null;
                    try {
                        if (typeof t === 'string') return usable(t);
                        const named =
                            usable(t.eurl) ||
                            usable(t.__x_eurl) ||
                            usable(t.imgFull) ||
                            usable(t.__x_imgFull) ||
                            usable(t.img) ||
                            usable(t.__x_img) ||
                            usable(t.previewEurl) ||
                            usable(t.preview);
                        if (named) return named;
                        const keys = Object.keys(t);
                        for (let i = 0; i < Math.min(keys.length, 40); i++) {
                            const p = usable(t[keys[i]]);
                            if (p) return p;
                        }
                    } catch (_) {}
                    return null;
                }
                const store = window.Store;
                let wid = rawJid;
                try {
                    if (
                        store &&
                        store.WidFactory &&
                        typeof store.WidFactory.createWid === 'function'
                    ) {
                        wid = store.WidFactory.createWid(rawJid);
                    }
                } catch (_) {}
                const getFrom = (col) => {
                    if (!col) return null;
                    try {
                        if (typeof col.get === 'function') {
                            return col.get(wid) || col.get(rawJid) || null;
                        }
                    } catch (_) {}
                    try {
                        if (col._index) {
                            return col._index[rawJid] || (wid && col._index[String(wid)]) || null;
                        }
                    } catch (_) {}
                    return null;
                };
                let pic = fromThumb(getFrom(store && store.ProfilePicThumb));
                if (pic) return pic;
                pic = fromThumb(getFrom(store && store.ProfilePic));
                if (pic) return pic;
                const chat = getFrom(store && (store.Chat || store.ChatCollection));
                if (chat) {
                    pic =
                        fromThumb(chat.profilePicThumb) ||
                        fromThumb(chat.contact && chat.contact.profilePicThumb) ||
                        fromThumb(chat.groupMetadata && chat.groupMetadata.profilePicThumb);
                    if (pic) return pic;
                }
                const contact = getFrom(store && store.Contact);
                if (contact) {
                    pic = fromThumb(contact.profilePicThumb) || usable(contact.profilePicUrl);
                    if (pic) return pic;
                }
                return null;
            }, String(jid)),
            timeoutReject(2500, 'store_pic_timeout'),
        ]);
        return usableProfilePicUrl(url);
    } catch (_) {
        return null;
    }
}

/**
 * چت‌هایی که روی همین نشست واتساپ دیده می‌شوند.
 * بودن در لیست زندهٔ همین شماره کافی است؛ fetchMessages اجباری نیست.
 * شمارهٔ قبلی معمولاً در سایدبار این نشست نیست و وارد لیست عادی نمی‌شود.
 */
async function resolveChatsOnCurrentSession(ids) {
    if (!client || !isWhatsAppUsable()) return [];
    const list = Array.isArray(ids) ? ids.map((id) => String(id || '').trim()).filter(Boolean) : [];
    const unique = [];
    const seenIn = new Set();
    for (const id of list.slice(0, 120)) {
        const key = id.toLowerCase();
        if (seenIn.has(key)) continue;
        seenIn.add(key);
        unique.push(id);
    }
    let listed = [];
    try {
        const cacheAge = Date.now() - (lastChatsCache.at || 0);
        if (lastChatsCache.chats?.length && cacheAge < 60000) {
            listed = lastChatsCache.chats;
        } else {
            listed = await listWhatsAppAllChats();
        }
    } catch (_) {
        listed = lastChatsCache.chats || [];
    }
    const found = [];
    const foundIds = new Set();
    const remaining = [];
    for (const raw of unique) {
        const hit = (listed || []).find((row) => listedChatMatchesRequest(row, raw));
        if (!hit) {
            remaining.push(raw);
            continue;
        }
        const ser = String(hit.id);
        if (foundIds.has(ser.toLowerCase())) continue;
        foundIds.add(ser.toLowerCase());
        found.push({
            id: ser,
            requested: raw,
            phone: realPhoneDigitsOf(ser, hit.phone || raw) || null,
            lid: hit.lid || lidDigitsOf(ser) || null,
            name: hit.name || null,
            isGroup: !!hit.isGroup || /@g\.us$/i.test(ser),
            lastPreview: hit.lastPreview || null,
            timestamp: hit.timestamp || null,
        });
    }
    const deadline = Date.now() + 45000;
    let cursor = 0;
    const worker = async () => {
        while (cursor < remaining.length && Date.now() < deadline) {
            const raw = remaining[cursor++];
            try {
                const chat = await lookupChatOnSession(raw);
                if (!chat) continue;
                const ser = String((chat.id && (chat.id._serialized || chat.id)) || raw);
                if (!ser.includes('@') || ser.endsWith('@broadcast')) continue;
                if (foundIds.has(ser.toLowerCase())) continue;
                foundIds.add(ser.toLowerCase());
                let phone = realPhoneDigitsOf(ser, raw) || null;
                let lid = /@lid$/i.test(ser) ? ser.replace(/\D/g, '') : null;
                try {
                    const contact = await chat.getContact();
                    if (
                        contact &&
                        contact.number &&
                        String(contact.number).indexOf('@lid') === -1
                    ) {
                        const d = String(contact.number).replace(/\D/g, '');
                        if (d.length >= 8 && d !== lid) phone = d;
                    }
                    const rawLid = contact && (contact.lid || contact.lidUser);
                    if (rawLid) {
                        const lidSer = rawLid._serialized || rawLid;
                        const ld = String(lidSer || '').replace(/\D/g, '');
                        if (ld.length >= 8) lid = ld;
                    }
                } catch (_) {}
                const ts =
                    Number(chat.timestamp) ||
                    Number(
                        chat.lastMessage && (chat.lastMessage.timestamp || chat.lastMessage.t)
                    ) ||
                    null;
                const row = {
                    id: ser,
                    requested: raw,
                    phone: phone || null,
                    lid: lid || null,
                    name: chat.name || chat.subject || chat.formattedTitle || null,
                    isGroup: !!chat.isGroup || /@g\.us$/i.test(ser),
                    lastPreview: chat.lastMessage
                        ? String(chat.lastMessage.body || chat.lastMessage.caption || '').slice(
                              0,
                              120
                          )
                        : null,
                    timestamp: ts,
                };
                found.push(row);
                rememberSeenChat(
                    row.id,
                    row.name,
                    row.isGroup,
                    row.lastPreview,
                    row.timestamp,
                    null,
                    row.phone,
                    row.lid
                );
            } catch (_) {}
        }
    };
    if (remaining.length) {
        const n = Math.min(6, Math.max(1, remaining.length));
        await Promise.all(Array.from({ length: n }, () => worker()));
    }
    for (const hit of listed || []) {
        const ser = String((hit && hit.id) || '');
        if (!ser.includes('@') || ser.endsWith('@broadcast')) continue;
        if (foundIds.has(ser.toLowerCase())) continue;
        foundIds.add(ser.toLowerCase());
        found.push({
            id: ser,
            requested: null,
            phone: realPhoneDigitsOf(ser, hit.phone) || null,
            lid: hit.lid || lidDigitsOf(ser) || null,
            name: hit.name || null,
            isGroup: !!hit.isGroup || /@g\.us$/i.test(ser),
            lastPreview: hit.lastPreview || null,
            timestamp: hit.timestamp || null,
            profilePicUrl: hit.profilePicUrl || null,
        });
    }
    logger.info('Resolved chats on current WhatsApp session', {
        asked: unique.length,
        found: found.length,
        fromList: (listed || []).length,
    });
    return found;
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
        const groups = (chats || []).filter((c) => c && c.isGroup).length;
        return res.json({
            success: true,
            chats: chats || [],
            count: (chats || []).length,
            groups,
            incomplete: (chats || []).length < 8,
        });
    } catch (error) {
        const msg = formatGatewayError(error);
        logger.error('Get chats error', { error: msg });
        if (lastChatsCache.chats?.length) {
            return res.json({
                success: true,
                chats: lastChatsCache.chats,
                count: lastChatsCache.chats.length,
                stale: true,
            });
        }
        return res.json({ success: true, chats: [], count: 0, groups: 0, incomplete: true });
    } finally {
        endWaOps();
    }
});

// تطبیق شناسه چت با نشست فعلی واتساپ
app.post('/api/chats/resolve', async (req, res) => {
    beginWaOps();
    try {
        if (!isWhatsAppUsable()) {
            const restored = await tryRestoreWhatsAppReady();
            if (!restored) {
                return res.status(503).json({
                    error: 'WhatsApp not ready',
                    phase: connectionPhase || (isClientStarting ? 'starting' : 'disconnected'),
                });
            }
        }
        const ids = (req.body && (req.body.ids || req.body.chatIds)) || [];
        const chats = await resolveChatsOnCurrentSession(ids);
        return res.json({
            success: true,
            chats,
            count: chats.length,
            source: 'resolve',
        });
    } catch (error) {
        const msg = formatGatewayError(error);
        logger.error('Resolve chats error', { error: msg });
        return res.status(503).json({ error: msg, phase: connectionPhase || null });
    } finally {
        endWaOps();
    }
});

app.get('/api/chats/groups/:groupId/participants', async (req, res) => {
    // اعضای گروه — برای نمایش نام فرستنده‌ها در چت گروهی (وقتی senderName ذخیره نشده)
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
        if (!chatId && !q) return res.status(400).json({ error: 'phone/chatId/jid is required' });

        const candidates = [];
        const addId = (id) => {
            const s = serializedJid(id) || String(id || '').trim();
            if (!s) return;
            if (!candidates.includes(s)) candidates.push(s);
        };
        addId(q);
        addId(chatId);
        if (/@lid$/i.test(q) === false && /^\d{8,20}$/.test(q.replace(/\D/g, ''))) {
            addId(`${String(q).replace(/\D/g, '')}@lid`);
        }
        const cachedEarly = lookupCachedChat(q) || lookupCachedChat(chatId);
        if (cachedEarly) addId(cachedEarly.id);
        if (cachedEarly && cachedEarly.profilePicUrl) {
            return res.json({
                ok: true,
                chatId: cachedEarly.id,
                profilePicUrl: cachedEarly.profilePicUrl,
            });
        }

        await Promise.race([
            refreshStoreProfilePicsOnce(),
            new Promise((resolve) => setTimeout(resolve, 3200)),
        ]);
        const cached = lookupCachedChat(q) || lookupCachedChat(chatId) || cachedEarly;
        if (cached) addId(cached.id);
        if (cached && cached.profilePicUrl) {
            return res.json({
                ok: true,
                chatId: cached.id,
                profilePicUrl: cached.profilePicUrl,
            });
        }

        let profilePicUrl = null;
        let usedId = chatId || q;
        for (const id of candidates) {
            usedId = id;
            profilePicUrl = await tryStoreProfilePicUrl(id);
            if (profilePicUrl) {
                rememberSeenChat(
                    id,
                    cached && cached.name,
                    /@g\.us$/i.test(id),
                    null,
                    null,
                    profilePicUrl
                );
                break;
            }
        }
        if (!profilePicUrl && candidates.length) {
            const id = candidates[0];
            usedId = id;
            try {
                profilePicUrl = await Promise.race([
                    client.getProfilePicUrl(id),
                    timeoutReject(2000, 'profile_pic_timeout'),
                ]);
                profilePicUrl = usableProfilePicUrl(profilePicUrl);
            } catch (_) {
                profilePicUrl = null;
            }
        }
        return res.json({ ok: true, chatId: usedId, profilePicUrl: profilePicUrl || null });
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
            loadPersistedSeenChats().catch(() => {});
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
    // اول Chromium را بکش — PM2 معمولاً قبل از اتمام client.destroy سیگنال SIGKILL می‌دهد
    try {
        killOrphanChromeSync(getWhatsAppSessionPath());
    } catch (_) {}
    try {
        isClientReady = false;
        isClientStarting = false;
        client = null;
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

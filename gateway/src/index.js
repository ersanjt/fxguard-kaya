'use strict';

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const amqp = require('amqplib');
const redis = require('redis');
const winston = require('winston');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// ==================== App / Server ====================
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// ✅ TEST ROUTE (must always work)
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

    rabbitChannel.consume(OUTGOING_QUEUE, async (msg) => {
      if (!msg) return;
      try {
        const data = JSON.parse(msg.content.toString());
        await sendWhatsAppMessage(data);
      } catch (e) {
        logger.error('Outgoing consume error', { error: e?.message });
      } finally {
        // ack always, so queue won't get stuck
        rabbitChannel.ack(msg);
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

let qrCodeData = null;
let lastQrImageDataUrl = null;

function buildClient() {
  const sessionPath = process.env.WHATSAPP_SESSION_PATH || path.join(process.cwd(), '.wwebjs_auth');
  const c = new Client({
    authStrategy: new LocalAuth({ dataPath: sessionPath }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  });

  attachClientEvents(c);
  return c;
}

function attachClientEvents(c) {
  c.on('qr', async (qr) => {
    try {
      logger.info('📱 QR Code Generated');
      qrCodeData = qr;

      qrcode.generate(qr, { small: true });

      const qrImage = await QRCode.toDataURL(qr);
      lastQrImageDataUrl = qrImage;

      io.emit('qr', { qr: qrImage });

      // cache in redis
      redisClient.set('whatsapp:qr', qrImage, { EX: 60 }).catch(() => {});
      redisClient.set('whatsapp:status', 'qr').catch(() => {});
    } catch (e) {
      logger.error('QR event error', { error: e?.message });
    }
  });

  c.on('authenticated', () => {
    logger.info('✅ WhatsApp Authenticated');
    io.emit('authenticated', { status: 'success' });
    redisClient.set('whatsapp:status', 'authenticated').catch(() => {});
  });

  c.on('ready', () => {
    isClientReady = true;
    isClientStarting = false;

    logger.info('✅ WhatsApp Client Ready');
    io.emit('ready', { status: 'connected' });

    redisClient.set('whatsapp:status', 'ready').catch(() => {});

    try {
      const info = c.info;
      io.emit('account_info', {
        name: info?.pushname || null,
        number: info?.wid?.user || null,
        platform: info?.platform || null,
      });
    } catch (_) {}
  });

  c.on('disconnected', (reason) => {
    logger.warn('⚠️ WhatsApp Disconnected', { reason });

    isClientReady = false;
    isClientStarting = false;

    io.emit('disconnected', { reason });
    redisClient.set('whatsapp:status', 'disconnected').catch(() => {});
  });

  c.on('message', async (msg) => {
    try {
      const contact = await msg.getContact();
      const chat = await msg.getChat();

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
          name: chat?.name || null,
          isGroup: chat?.isGroup || false,
        },
      };

      if (msg.hasMedia) {
        try {
          await ensureDir(UPLOADS_DIR);
          const media = await msg.downloadMedia();
          if (media) {
            const safeName = (media.filename || 'file').replace(/[^\w.\-]/g, '_');
            const filename = `${Date.now()}_${safeName}`;
            const filepath = path.join(UPLOADS_DIR, filename);

            await fs.writeFile(filepath, media.data, 'base64');

            messageData.media = {
              mimetype: media.mimetype,
              filename: media.filename || null,
              filepath,
            };
          }
        } catch (error) {
          logger.error('Media download/save error', { error: error?.message });
        }
      }

      // Send to backend (persistent: RabbitMQ keeps message if backend down)
      if (rabbitChannel) {
        rabbitChannel.sendToQueue(INCOMING_QUEUE, Buffer.from(JSON.stringify(messageData)), {
          persistent: true,
        });
      } else {
        await sendToBackendWithRetry(messageData);
      }

      // realtime dashboard
      io.emit('new_message', messageData);

      // short cache
      redisClient.hSet(`message:${messageData.id}`, 'data', JSON.stringify(messageData)).catch(() => {});
      redisClient.expire(`message:${messageData.id}`, 86400).catch(() => {});

      logger.info('📨 Message received', { from: contact?.number });
    } catch (error) {
      logger.error('Error processing message', { error: error?.message });
    }
  });

  c.on('message_ack', (msg, ack) => {
    const status = ['error', 'pending', 'server', 'device', 'read', 'played'];
    io.emit('message_status', {
      messageId: msg?.id?.id,
      status: status[ack] || 'unknown',
    });
  });
}

// ==================== Helpers ====================
async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (_) {}
}

async function sendToBackendWithRetry(messageData, maxRetries = 3) {
  const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:3002';
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await axios.post(`${backendUrl}/api/webhook/incoming-message`, messageData, {
        timeout: 15000,
        validateStatus: () => true,
      });
      if (res.status >= 200 && res.status < 300) return;
    } catch (err) {
      logger.warn('Backend webhook attempt failed', { attempt: i + 1, error: err?.message });
    }
    if (i < maxRetries - 1) await sleep(2000 * (i + 1));
  }
  logger.error('Backend webhook failed after retries – message may be lost', { from: messageData?.from });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ==================== WhatsApp Controls ====================
async function startWhatsApp() {
  if (isClientReady) return { ok: true, status: 'already_ready' };
  if (isClientStarting) return { ok: true, status: 'starting' };

  isClientStarting = true;
  isClientReady = false;

  if (!client) client = buildClient();

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
  try {
    if (!client) return { ok: true, status: 'already_stopped' };

    isClientReady = false;
    isClientStarting = false;

    redisClient.set('whatsapp:status', 'stopping').catch(() => {});
    await client.destroy();
    client = null;

    redisClient.set('whatsapp:status', 'stopped').catch(() => {});
    io.emit('disconnected', { reason: 'stopped_by_api' });

    return { ok: true, status: 'stopped' };
  } catch (e) {
    logger.error('Stop WhatsApp error', { error: e?.message });
    return { ok: false, error: e?.message || 'stop_failed' };
  }
}

// ==================== API Endpoints ====================
// /api/status: بدون await Redis — همیشه سریع پاسخ بده
app.get('/api/status', (req, res) => {
  const status = isClientReady ? 'ready' : isClientStarting ? 'starting' : 'disconnected';
  res.json({
    whatsapp: isClientReady,
    starting: isClientStarting,
    redis: redisClient?.isReady || false,
    rabbitmq: !!rabbitChannel,
    status,
  });
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
    if (!client) return res.json({ ok: true, status: 'no_client' });

    isClientReady = false;
    isClientStarting = false;

    await client.logout().catch(() => {});
    await client.destroy().catch(() => {});
    client = null;

    redisClient.set('whatsapp:status', 'logged_out').catch(() => {});
    redisClient.del('whatsapp:qr').catch(() => {});

    qrCodeData = null;
    lastQrImageDataUrl = null;

    io.emit('disconnected', { reason: 'logged_out' });
    res.json({ ok: true, status: 'logged_out' });
  } catch (e) {
    logger.error('Logout error', { error: e?.message });
    res.status(500).json({ ok: false, error: e?.message || 'logout_failed' });
  }
});

app.post('/api/send-message', async (req, res) => {
  try {
    if (!isClientReady || !client) return res.status(503).json({ error: 'WhatsApp not ready' });

    const { to, message, media } = req.body || {};
    if (!to || (!message && !media)) return res.status(400).json({ error: 'Invalid payload' });

    const chatId = to.includes('@c.us') || to.includes('@g.us') ? to : `${to}@c.us`;

    let sentMsg;
    if (media?.url) {
      const mediaObj = await MessageMedia.fromUrl(media.url);
      sentMsg = await client.sendMessage(chatId, mediaObj, { caption: message || '' });
    } else {
      sentMsg = await client.sendMessage(chatId, message);
    }

    logger.info('✉️ Message sent', { to });
    return res.json({ success: true, messageId: sentMsg?.id?.id });
  } catch (error) {
    logger.error('Send message error', { error: error?.message });
    return res.status(500).json({ error: error?.message || 'send_failed' });
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

  if (media?.url) {
    const mediaObj = await MessageMedia.fromUrl(media.url);
    return client.sendMessage(chatId, mediaObj, {
      caption: message || '',
      quotedMessageId: replyTo,
    });
  }

  return client.sendMessage(chatId, message || '', { quotedMessageId: replyTo });
}

// ==================== Startup ====================
function startServer() {
  const PORT = process.env.PORT || 3001;

  server.listen(PORT, () => {
    logger.info(`🚀 WhatsApp Gateway running on port ${PORT}`);

    // ✅ after server is up, start background services
    setTimeout(async () => {
      try {
        await ensureDir(UPLOADS_DIR);
      } catch (_) {}

      connectRabbitMQ().catch(() => {});
      // auto-start WhatsApp (optional)
      startWhatsApp().catch(() => {});
    }, 300);
  });
}

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  try {
    await stopWhatsApp();
  } catch (_) {}
  redisClient.quit().catch(() => {});
  process.exit(0);
});

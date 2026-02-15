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

// ==================== تنظیمات ====================
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
    }
});

const upload = multer({ dest: 'uploads/' });
app.use(express.json());

// ==================== Logger ====================
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.Console()
    ]
});

// ==================== Redis Client ====================
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', () => {});
redisClient.connect().catch(() => logger.warn('⚠️ Redis not available - gateway continues'));

// ==================== RabbitMQ Connection ====================
let rabbitChannel;
const QUEUE_NAME = 'whatsapp_messages';

async function connectRabbitMQ() {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
        rabbitChannel = await connection.createChannel();
        await rabbitChannel.assertQueue(QUEUE_NAME, { durable: true });
        logger.info('✅ Connected to RabbitMQ');
        
        // مصرف پیام‌های ارسالی از CRM
        rabbitChannel.consume('outgoing_messages', async (msg) => {
            if (msg) {
                const data = JSON.parse(msg.content.toString());
                await sendWhatsAppMessage(data);
                rabbitChannel.ack(msg);
            }
        });
    } catch (error) {
        logger.warn('⚠️ RabbitMQ not available - gateway continues');
        rabbitChannel = null;
    }
}

// ==================== WhatsApp Client ====================
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'enterprise-crm'
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

let isClientReady = false;
let qrCodeData = null;
let lastQrImageDataUrl = null; // fallback when Redis unavailable

// ==================== WhatsApp Events ====================

client.on('qr', async (qr) => {
    logger.info('📱 QR Code Generated');
    qrCodeData = qr;
    
    // نمایش QR در ترمینال
    qrcode.generate(qr, { small: true });
    
    const qrImage = await QRCode.toDataURL(qr);
    lastQrImageDataUrl = qrImage;
    io.emit('qr', { qr: qrImage });
    
    redisClient.set('whatsapp:qr', qrImage, { EX: 60 }).catch(() => {});
});

client.on('authenticated', () => {
    logger.info('✅ WhatsApp Authenticated');
    io.emit('authenticated', { status: 'success' });
});

client.on('ready', async () => {
    isClientReady = true;
    logger.info('✅ WhatsApp Client Ready');
    io.emit('ready', { status: 'connected' });
    
    redisClient.set('whatsapp:status', 'ready').catch(() => {});
    
    // ارسال اطلاعات حساب
    const info = client.info;
    io.emit('account_info', {
        name: info.pushname,
        number: info.wid.user,
        platform: info.platform
    });
});

client.on('disconnected', async (reason) => {
    logger.warn('⚠️ WhatsApp Disconnected:', reason);
    isClientReady = false;
    io.emit('disconnected', { reason });
    redisClient.set('whatsapp:status', 'disconnected').catch(() => {});
});

// دریافت پیام‌های ورودی
client.on('message', async (msg) => {
    try {
        const contact = await msg.getContact();
        const chat = await msg.getChat();
        
        const messageData = {
            id: msg.id.id,
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
                number: contact.number,
                name: contact.name || contact.pushname,
                isMyContact: contact.isMyContact,
                profilePicUrl: await contact.getProfilePicUrl().catch(() => null)
            },
            chat: {
                id: chat.id._serialized,
                name: chat.name,
                isGroup: chat.isGroup
            }
        };
        
        // دانلود مدیا اگر وجود داشت
        if (msg.hasMedia) {
            try {
                const media = await msg.downloadMedia();
                messageData.media = {
                    mimetype: media.mimetype,
                    data: media.data,
                    filename: media.filename
                };
                
                // ذخیره فایل
                const filename = `${Date.now()}_${media.filename || 'file'}`;
                const filepath = path.join(__dirname, '../uploads', filename);
                await fs.writeFile(filepath, media.data, 'base64');
                messageData.media.filepath = filepath;
            } catch (error) {
                logger.error('Media download error:', error);
            }
        }
        
        // ارسال به Backend: RabbitMQ یا HTTP
        if (rabbitChannel) {
            rabbitChannel.sendToQueue(
                QUEUE_NAME,
                Buffer.from(JSON.stringify(messageData)),
                { persistent: true }
            );
        } else {
            const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:3002';
            axios.post(backendUrl + '/api/webhook/incoming-message', messageData, { timeout: 10000 }).catch(err => logger.error('Backend webhook error:', err.message));
        }
        
        // ارسال به Dashboard به صورت Real-time
        io.emit('new_message', messageData);
        
        redisClient.hSet(`message:${msg.id.id}`, 'data', JSON.stringify(messageData)).catch(() => {});
        redisClient.expire(`message:${msg.id.id}`, 86400).catch(() => {});
        
        logger.info(`📨 Message received from ${contact.number}`);
        
    } catch (error) {
        logger.error('Error processing message:', error);
    }
});

// دریافت وضعیت پیام (خوانده شده، دریافت شده)
client.on('message_ack', async (msg, ack) => {
    const status = ['error', 'pending', 'server', 'device', 'read', 'played'];
    io.emit('message_status', {
        messageId: msg.id.id,
        status: status[ack]
    });
});

// ==================== API Endpoints ====================

app.get('/api/status', async (req, res) => {
    let status = null;
    try { status = await redisClient.get('whatsapp:status'); } catch (_) {}
    res.json({
        whatsapp: isClientReady,
        redis: redisClient.isReady,
        rabbitmq: !!rabbitChannel,
        status: status || 'disconnected'
    });
});

app.get('/api/qr', async (req, res) => {
    let qr = null;
    try { qr = await redisClient.get('whatsapp:qr'); } catch (_) {}
    if (!qr && lastQrImageDataUrl) qr = lastQrImageDataUrl;
    if (qr) res.json({ qr });
    else res.status(404).json({ error: 'QR not available' });
});

// ارسال پیام تکی
app.post('/api/send-message', async (req, res) => {
    try {
        if (!isClientReady) {
            return res.status(503).json({ error: 'WhatsApp not ready' });
        }
        
        const { to, message, media } = req.body;
        
        // فرمت شماره
        const chatId = to.includes('@c.us') ? to : `${to}@c.us`;
        
        let sentMsg;
        if (media) {
            const mediaObj = await MessageMedia.fromUrl(media.url);
            sentMsg = await client.sendMessage(chatId, mediaObj, { caption: message });
        } else {
            sentMsg = await client.sendMessage(chatId, message);
        }
        
        logger.info(`✉️ Message sent to ${to}`);
        res.json({ success: true, messageId: sentMsg.id.id });
        
    } catch (error) {
        logger.error('Send message error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ارسال پیام انبوه (Bulk Messaging)
app.post('/api/send-bulk', async (req, res) => {
    try {
        if (!isClientReady) {
            return res.status(503).json({ error: 'WhatsApp not ready' });
        }
        
        const { recipients, message, delay = 3000, media } = req.body;
        
        if (!Array.isArray(recipients) || recipients.length === 0) {
            return res.status(400).json({ error: 'Invalid recipients' });
        }
        
        // شروع پردازش در پس‌زمینه
        const bulkId = `bulk_${Date.now()}`;
        res.json({ 
            success: true, 
            bulkId,
            total: recipients.length,
            message: 'Bulk sending started'
        });
        
        // ارسال به صورت Async
        processBulkMessages(bulkId, recipients, message, delay, media);
        
    } catch (error) {
        logger.error('Bulk send error:', error);
        res.status(500).json({ error: error.message });
    }
});

async function processBulkMessages(bulkId, recipients, message, delay, media) {
    const results = {
        total: recipients.length,
        sent: 0,
        failed: 0,
        errors: []
    };
    
    for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        
        try {
            const chatId = recipient.includes('@c.us') ? recipient : `${recipient}@c.us`;
            
            // شخصی‌سازی پیام
            let personalizedMsg = message.replace(/\{name\}/g, recipient.name || recipient);
            
            if (media) {
                const mediaObj = await MessageMedia.fromUrl(media.url);
                await client.sendMessage(chatId, mediaObj, { caption: personalizedMsg });
            } else {
                await client.sendMessage(chatId, personalizedMsg);
            }
            
            results.sent++;
            logger.info(`📤 Bulk message sent to ${recipient} (${i + 1}/${recipients.length})`);
            
            // وضعیت ارسال
            io.emit('bulk_progress', {
                bulkId,
                progress: Math.round(((i + 1) / recipients.length) * 100),
                sent: results.sent,
                failed: results.failed
            });
            
            // تاخیر بین پیام‌ها برای جلوگیری از بن
            if (i < recipients.length - 1) {
                await sleep(delay);
            }
            
        } catch (error) {
            results.failed++;
            results.errors.push({ recipient, error: error.message });
            logger.error(`❌ Failed to send to ${recipient}:`, error.message);
        }
    }
    
    // ذخیره نتیجه نهایی
    redisClient.hSet(`bulk:${bulkId}`, 'results', JSON.stringify(results)).catch(() => {});
    redisClient.expire(`bulk:${bulkId}`, 86400).catch(() => {});
    io.emit('bulk_complete', { bulkId, results });
    logger.info(`✅ Bulk sending completed: ${results.sent}/${results.total} sent`);
}

// دریافت مخاطبین
app.get('/api/contacts', async (req, res) => {
    try {
        if (!isClientReady) {
            return res.status(503).json({ error: 'WhatsApp not ready' });
        }
        
        const contacts = await client.getContacts();
        const contactList = await Promise.all(
            contacts.map(async (contact) => ({
                id: contact.id._serialized,
                number: contact.number,
                name: contact.name || contact.pushname,
                isMyContact: contact.isMyContact,
                isGroup: contact.isGroup,
                profilePicUrl: await contact.getProfilePicUrl().catch(() => null)
            }))
        );
        
        res.json(contactList);
    } catch (error) {
        logger.error('Get contacts error:', error);
        res.status(500).json({ error: error.message });
    }
});

// دریافت چت‌ها
app.get('/api/chats', async (req, res) => {
    try {
        if (!isClientReady) {
            return res.status(503).json({ error: 'WhatsApp not ready' });
        }
        
        const chats = await client.getChats();
        const chatList = chats.map(chat => ({
            id: chat.id._serialized,
            name: chat.name,
            isGroup: chat.isGroup,
            unreadCount: chat.unreadCount,
            timestamp: chat.timestamp
        }));
        
        res.json(chatList);
    } catch (error) {
        logger.error('Get chats error:', error);
        res.status(500).json({ error: error.message });
    }
});

// دریافت پیام‌های یک چت
app.get('/api/messages/:chatId', async (req, res) => {
    try {
        if (!isClientReady) {
            return res.status(503).json({ error: 'WhatsApp not ready' });
        }
        
        const { chatId } = req.params;
        const { limit = 50 } = req.query;
        
        const chat = await client.getChatById(chatId);
        const messages = await chat.fetchMessages({ limit: parseInt(limit) });
        
        res.json(messages);
    } catch (error) {
        logger.error('Get messages error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Logout
app.post('/api/logout', async (req, res) => {
    try {
        await client.logout();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== Helper Functions ====================

async function sendWhatsAppMessage(data) {
    try {
        const { to, message, media, replyTo } = data;
        const chatId = to.includes('@c.us') ? to : `${to}@c.us`;
        
        let sentMsg;
        if (media) {
            const mediaObj = await MessageMedia.fromUrl(media.url);
            sentMsg = await client.sendMessage(chatId, mediaObj, { 
                caption: message,
                quotedMessageId: replyTo
            });
        } else {
            sentMsg = await client.sendMessage(chatId, message, {
                quotedMessageId: replyTo
            });
        }
        
        return sentMsg;
    } catch (error) {
        logger.error('Send WhatsApp message error:', error);
        throw error;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== Server Startup ====================

async function startServer() {
    try {
        connectRabbitMQ().catch(() => {});
        client.initialize();
        
        const PORT = process.env.PORT || 3001;
        server.listen(PORT, () => {
            logger.info(`🚀 WhatsApp Gateway running on port ${PORT}`);
        });
        
    } catch (error) {
        logger.error('Server startup error:', error);
        process.exit(1);
    }
}

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Shutting down gracefully...');
    await client.destroy();
    redisClient.quit().catch(() => {});
    process.exit(0);
});

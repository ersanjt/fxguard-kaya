require("dotenv").config();

const MAIN_ADMIN_EMAIL = process.env.MAIN_ADMIN_EMAIL || 'admin@kaya.local';
const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const amqp = require('amqplib');
let redis;
try { redis = require('redis'); } catch (e) { redis = null; }
const winston = require('winston');
const axios = require('axios');

// Import Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const conversationRoutes = require('./routes/conversations');
const messageRoutes = require('./routes/messages');
const departmentRoutes = require('./routes/departments');
const analyticsRoutes = require('./routes/analytics');
const bulkRoutes = require('./routes/bulk');
const customerRoutes = require('./routes/customers');
const branchRoutes = require('./routes/branches');
const supervisionRoutes = require('./routes/supervision');
const taskRoutes = require('./routes/tasks');
const processRoutes = require('./routes/processes');
 
// Database
const models = require('./models');
const { sequelize, Customer, Conversation, Message, User, Department, AutoResponse, WhatsappConfig, RateCurrency } = models;
const { Op } = require('sequelize');

const mongoose = require('mongoose');

// ==================== Express Setup ====================
const app = express();
app.set("trust proxy", 1);
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true
    }
});

// ==================== Middleware ====================
app.use(helmet({ contentSecurityPolicy: false })); // اجازه اسکریپت داخل داشبورد
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3002').split(',').map(s => s.trim());
app.use(cors({
    origin: (origin, cb) => { if (!origin || allowedOrigins.includes(origin)) cb(null, true); else cb(null, allowedOrigins[0]); },
    credentials: true
}));
app.use(compression());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقیقه
    max: 1500, // حداکثر ۱۵۰۰ درخواست در ۱۵ دقیقه (~۱۰۰/دقیقه)
    message: { error: 'تعداد درخواست‌ها زیاد است. چند دقیقه صبر کنید.' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', (req, res, next) => {
  if (req.path === '/auth/login' || req.path === '/ping') return next();
  return limiter(req, res, next);
});

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

// ==================== Redis (optional) ====================
let redisClient = { quit: () => Promise.resolve(), connect: () => Promise.resolve() };
if (redis) {
    try {
        redisClient = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
        redisClient.on('error', () => {});
        redisClient.connect().catch(() => { logger.warn('⚠️ Redis not available - continuing without cache'); });
    } catch (e) {
        logger.warn('⚠️ Redis init failed:', e.message);
    }
} else {
    logger.warn('⚠️ Redis module not found - continuing without cache');
}

// ==================== RabbitMQ ====================
let rabbitChannel;

async function connectRabbitMQ() {
    try {
        const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error('RabbitMQ connect timeout')), ms));
        const connection = await Promise.race([
            amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost'),
            timeout(10000)
        ]);
        rabbitChannel = await connection.createChannel();
        require('./services/autoMessages').setRabbitChannel(rabbitChannel);
        
        await rabbitChannel.assertQueue('whatsapp_messages', { durable: true });
        await rabbitChannel.assertQueue('outgoing_messages', { durable: true });
        
        logger.info('✅ Connected to RabbitMQ');
        
        // مصرف پیام‌های دریافتی از WhatsApp Gateway — nack در صورت خطا تا پیام دوباره در صف قرار گیرد
        rabbitChannel.consume('whatsapp_messages', async (msg) => {
            if (!msg) return;
            try {
                const messageData = JSON.parse(msg.content.toString());
                await processIncomingMessage(messageData);
                rabbitChannel.ack(msg);
            } catch (err) {
                logger.error('processIncomingMessage failed, message requeued', { error: err?.message });
                rabbitChannel.nack(msg, false, true);
            }
        });
        
    } catch (error) {
        logger.warn('⚠️ RabbitMQ not available - continuing without queue');
        rabbitChannel = null;
        try { require('./services/autoMessages').setRabbitChannel(null); } catch (_) {}
        if (!process.env.USE_SQLITE) setTimeout(connectRabbitMQ, 5000);
    }
}

// ==================== Database Connections ====================
async function connectDatabases() {
    try {
        await sequelize.authenticate();
        if (sequelize.getDialect() === 'sqlite') {
            await sequelize.query('PRAGMA journal_mode=WAL;');
            await sequelize.query('PRAGMA synchronous=NORMAL;');
        }
        // Auto-migrate: add customerId to Transactions BEFORE sync (sync creates index on customerId)
        try {
            const { DataTypes } = require('sequelize');
            const qi = sequelize.getQueryInterface();
            const tableDesc = await qi.describeTable('Transactions');
            if (!tableDesc || !tableDesc.customerId) {
                await qi.addColumn('Transactions', 'customerId', {
                    type: DataTypes.UUID,
                    allowNull: true,
                    references: { model: 'Customers', key: 'id' }
                });
                logger.info('✅ Transactions.customerId column added (auto-migration)');
            }
        } catch (migErr) {
            logger.warn('Transactions customerId migration:', migErr.message);
        }
        if (sequelize.getDialect() === 'postgres') {
            try {
                await sequelize.query("ALTER TYPE \"enum_Tickets_status\" ADD VALUE IF NOT EXISTS 'archived';");
                logger.info('✅ Ticket status archived added (auto-migration)');
            } catch (e) {
                if (!String(e.message || '').includes('already exists')) logger.warn('Ticket archived migration:', e.message);
            }
        }
        await sequelize.sync();
        logger.info(process.env.USE_SQLITE ? '✅ SQLite Connected (WAL)' : '✅ PostgreSQL Connected');

        // Auto-migrate panel_settings: add email & visibility columns if missing
        try {
            const { DataTypes } = require('sequelize');
            const qi = sequelize.getQueryInterface();
            const desc = await qi.describeTable('panel_settings');
            if (desc && !desc.smtpHost) {
                const cols = [
                    ['smtpHost', { type: DataTypes.STRING(255), allowNull: true }],
                    ['smtpPort', { type: DataTypes.STRING(20), allowNull: true }],
                    ['smtpUser', { type: DataTypes.STRING(255), allowNull: true }],
                    ['smtpPass', { type: DataTypes.TEXT, allowNull: true }],
                    ['smtpFrom', { type: DataTypes.STRING(255), allowNull: true }],
                    ['smtpFromName', { type: DataTypes.STRING(255), allowNull: true }],
                    ['smtpSecure', { type: DataTypes.BOOLEAN, allowNull: true }],
                    ['emailLoginNotification', { type: DataTypes.BOOLEAN, allowNull: true }],
                    ['hiddenSections', { type: DataTypes.TEXT, allowNull: true }]
                ];
                for (const [name, def] of cols) {
                    try {
                        await qi.addColumn('panel_settings', name, def);
                    } catch (e) {
                        if (!String(e.message || '').includes('already exists') && !String(e.message || '').includes('duplicate')) logger.warn('panel_settings.' + name, e.message);
                    }
                }
                logger.info('✅ panel_settings: email & visibility columns added (auto-migration)');
            }
            if (desc && !desc.languageMode) {
                try {
                    await qi.addColumn('panel_settings', 'languageMode', { type: require('sequelize').DataTypes.STRING(20), allowNull: true });
                    logger.info('✅ panel_settings: languageMode column added (auto-migration)');
                } catch (e) {
                    if (!String(e.message || '').includes('already exists') && !String(e.message || '').includes('duplicate')) logger.warn('panel_settings.languageMode', e.message);
                }
            }
        } catch (e) {
            logger.warn('panel_settings migration:', e.message);
        }

        const defaultRateCurrencies = require('./lib/defaultRateCurrencies');
        const rateCurrencyCount = await RateCurrency.count();
        if (rateCurrencyCount === 0 && defaultRateCurrencies.length > 0) {
            await RateCurrency.bulkCreate(defaultRateCurrencies);
            logger.info('✅ ارزهای پیش‌فرض نرخ (RateCurrency) ثبت شدند');
        }

        if (!process.env.USE_SQLITE) {
            try {
                await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/whatsapp_crm', {
                    useNewUrlParser: true,
                    useUnifiedTopology: true
                });
                if (!mongoose.models.MessageLog) {
                    const messageLogSchema = new mongoose.Schema({
                        conversationId: String,
                        customerId: String,
                        messageId: String,
                        content: String,
                        timestamp: Date,
                        metadata: Object
                    }, { strict: false });
                    mongoose.model('MessageLog', messageLogSchema);
                }
                logger.info('✅ MongoDB Connected');
            } catch (mongoErr) {
                logger.warn('⚠️ MongoDB not available - continuing without analytics log');
            }
        }
    } catch (error) {
        logger.error('❌ Database Connection Error:', error);
        process.exit(1);
    }
}

// ایجاد کاربر ادمین اصلی (بالاترین سطح دسترسی) اگر وجود نداشته باشد؛ اگر وجود داشت همیشه نقش owner و فعال است
const MAIN_ADMIN_EMAIL_LOWER = MAIN_ADMIN_EMAIL.toLowerCase();
async function ensureAdminUser() {
    try {
        let dept = await Department.findOne({ where: { isDefault: true } });
        if (!dept) {
            dept = await Department.create({
                name: 'پشتیبانی',
                description: 'دپارتمان پیش‌فرض',
                keywords: 'پشتیبانی,مشکل,راهنما',
                isDefault: true,
                isActive: true,
                color: '#3498db'
            });
            logger.info('✅ دپارتمان پیش‌فرض ایجاد شد');
        }
        let existing = await User.findOne({
            where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), MAIN_ADMIN_EMAIL_LOWER)
        });
        if (!existing) {
            await User.create({
                name: 'مالک شرکت',
                email: MAIN_ADMIN_EMAIL_LOWER,
                password: '20231030',
                role: 'owner',
                branchId: null,
                departmentId: dept.id,
                isActive: true
            });
            logger.info('✅ کاربر مالک (ادمین اصلی) ایجاد شد: ' + MAIN_ADMIN_EMAIL_LOWER);
        } else {
            // این کاربر همیشه بالاترین دسترسی دارد — نقش و وضعیت را ثابت نگه می‌داریم
            let changed = false;
            if (existing.role !== 'owner') { existing.role = 'owner'; changed = true; }
            if (!existing.isActive) { existing.isActive = true; changed = true; }
            if (changed) {
                await existing.save();
                logger.info('✅ ادمین اصلی به نقش owner و وضعیت فعال به‌روز شد: ' + existing.email);
            }
        }
    } catch (err) {
        logger.warn('⚠️ ensureAdminUser:', err.message);
    }
}

// ==================== Process Incoming Messages ====================
function normalizePhone(val) {
    if (val == null) return '';
    let s = String(val).replace(/@c\.us$/i, '').replace(/\D/g, '').trim();
    if (s && !s.startsWith('98') && s.length <= 10) s = '98' + s;
    return s;
}

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch (_) {}

/** اگر media.url یک آدرس http باشد، فایل را دانلود و در uploads ذخیره می‌کند و آدرس نسبی برمی‌گرداند. اگر مسیر نسبی مثل /uploads/... باشد همان را برمی‌گرداند. در صورت خطا فقط filename/mimetype برمی‌گرداند تا URL موقت در فرانت شکسته نشود. */
async function resolveIncomingMedia(media) {
    if (!media || !media.url) return media;
    const url = (media.url || '').trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (url.startsWith('/') && (url.startsWith('/uploads/') || url.includes('uploads')))
            return { url: url, filename: media.filename || media.caption, mimetype: media.mimetype };
        return media;
    }
    try {
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 30000,
            maxContentLength: 20 * 1024 * 1024,
            maxRedirects: 5,
            headers: { 'User-Agent': 'KayaCRM-Backend/1.0', 'Accept': 'image/*,video/*,audio/*,*/*' }
        });
        if (!res.data || (res.status !== 200 && res.status !== 206)) throw new Error('Bad response ' + res.status);
        const buf = Buffer.from(res.data);
        const ct = (res.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
        const suggestedName = media.filename || media.caption || 'file';
        let ext = (path.extname(suggestedName) || '').toLowerCase();
        if (!ext && ct) {
            if (ct.includes('image/jpeg') || ct.includes('image/jpg')) ext = '.jpg';
            else if (ct.includes('image/png')) ext = '.png';
            else if (ct.includes('image/gif')) ext = '.gif';
            else if (ct.includes('image/webp')) ext = '.webp';
            else if (ct.includes('video/')) ext = '.mp4';
            else if (ct.includes('audio/')) ext = '.mp3';
            else if (ct.includes('pdf')) ext = '.pdf';
            else ext = '.bin';
        }
        if (!ext) ext = '.bin';
        const safeName = (Date.now() + '-' + suggestedName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100)) + (ext.startsWith('.') ? ext : '.' + ext);
        const filePath = path.join(uploadsDir, safeName);
        fs.writeFileSync(filePath, buf);
        return { url: '/uploads/' + safeName, filename: media.filename || suggestedName, mimetype: media.mimetype || ct || null };
    } catch (err) {
        logger.warn('resolveIncomingMedia download failed', { url: url.slice(0, 80), error: err.message });
        return { url: null, filename: media.filename || media.caption || 'file', mimetype: media.mimetype };
    }
}

/** اگر media.data (base64) داشته باشد، فایل را در uploads ذخیره و آدرس نسبی برمی‌گرداند (مثلاً وقتی گیت‌وی رسانه را به صورت base64 می‌فرستد). */
function resolveIncomingMediaFromBase64(media) {
    if (!media || !media.data) return media;
    try {
        const buf = Buffer.from(media.data, 'base64');
        const suggestedName = media.filename || media.caption || 'file';
        const ct = (media.mimetype || '').split(';')[0].trim().toLowerCase();
        let ext = (path.extname(suggestedName) || '').toLowerCase();
        if (!ext && ct) {
            if (ct.includes('image/jpeg') || ct.includes('image/jpg')) ext = '.jpg';
            else if (ct.includes('image/png')) ext = '.png';
            else if (ct.includes('image/gif')) ext = '.gif';
            else if (ct.includes('image/webp')) ext = '.webp';
            else if (ct.includes('video/')) ext = '.mp4';
            else if (ct.includes('audio/')) ext = '.mp3';
            else if (ct.includes('pdf')) ext = '.pdf';
            else ext = '.bin';
        }
        if (!ext) ext = '.bin';
        const safeName = (Date.now() + '-' + suggestedName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100)) + (ext.startsWith('.') ? ext : '.' + ext);
        const filePath = path.join(uploadsDir, safeName);
        fs.writeFileSync(filePath, buf);
        return { url: '/uploads/' + safeName, filename: media.filename || suggestedName, mimetype: media.mimetype || ct || null };
    } catch (err) {
        logger.warn('resolveIncomingMediaFromBase64 failed', { error: err.message });
        return media;
    }
}

function inferMessageTypeFromMedia(media) {
    if (!media) return 'text';
    const mime = (media.mimetype || '').toLowerCase();
    const name = (media.filename || media.caption || '').toLowerCase();
    if (mime.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp)$/i.test(name)) return 'image';
    if (mime.startsWith('video/') || /\.(mp4|webm|mov|avi)$/i.test(name)) return 'video';
    if (mime.startsWith('audio/') || /\.(mp3|ogg|wav|m4a)$/i.test(name)) return 'audio';
    if (mime || name) return 'document';
    return 'text';
}

async function processIncomingMessage(messageData) {
    try {
        if (messageData.isStatus) return;
        const { body, contact, from, timestamp, hasMedia, media } = messageData;
        const rawPhone = (contact && contact.number != null) ? contact.number : from;
        if (rawPhone == null || rawPhone === '') return;
        const phone = normalizePhone(rawPhone) || normalizePhone(from);
        if (!phone) return;
        const rawType = (messageData.type || '').toLowerCase();
        if (rawType === 'reaction' || rawType === 'read_receipt' || rawType === 'delivery' || rawType === 'update') return;
        const hasText = body != null && String(body).trim().length > 0;
        const hasUsableMedia = hasMedia && media && (media.url || (media.filename && String(media.filename).trim()) || (media.caption && String(media.caption).trim()));
        if (!hasText && !hasUsableMedia) return;
        
        let resolvedMedia = media || null;
        let msgType = messageData.type || 'text';
        if (hasMedia && media) {
            if (media.url && (String(media.url).trim().startsWith('http://') || String(media.url).trim().startsWith('https://'))) {
                resolvedMedia = await resolveIncomingMedia(media);
            } else if (media.data) {
                resolvedMedia = resolveIncomingMediaFromBase64(media);
            }
            if (resolvedMedia && (resolvedMedia.url || resolvedMedia.filename)) msgType = inferMessageTypeFromMedia(resolvedMedia);
        }
        
        // 1. پیدا کردن یا ایجاد مشتری
        let customer = await Customer.findOne({ 
            where: { phone } 
        });
        
        if (!customer) {
            const contactName = (contact && (contact.name || contact.pushname)) || `مشتری ${phone}`;
            const profilePic = (contact && contact.profilePicUrl) || null;
            customer = await Customer.create({
                phone,
                name: contactName,
                profilePic: profilePic,
                source: 'whatsapp'
            });
            logger.info(`✨ New customer created: ${phone}`);
        } else {
            const tsContact = timestamp ? new Date((timestamp < 1e12 ? timestamp * 1000 : timestamp)) : new Date();
            const contactName = (contact && (contact.name || contact.pushname)) || null;
            const updates = { lastContactAt: tsContact };
            if (contactName && String(contactName).trim() && String(customer.name || '').trim() !== String(contactName).trim()) updates.name = String(contactName).trim();
            if (contact && contact.profilePicUrl && contact.profilePicUrl !== customer.profilePic) updates.profilePic = contact.profilePicUrl;
            await customer.update(updates);
        }
        
        // 2. پیدا کردن یا ایجاد مکالمه
        const { Op } = require('sequelize');
        let conversation = await Conversation.findOne({
            where: { 
                customerId: customer.id,
                status: { [Op.ne]: 'closed' }
            }
        });
        
        if (!conversation) {
            conversation = await Conversation.create({
                customerId: customer.id,
                status: 'open',
                priority: 'normal',
                source: 'whatsapp'
            });
        }
        
        // بروزرسانی آخرین پیام
        const ts = timestamp ? new Date((timestamp < 1e12 ? timestamp * 1000 : timestamp)) : new Date();
        var preview = (body || '').slice(0, 120);
        if ((body || '').length > 120) preview += '…';
        await conversation.update({
            lastMessageAt: ts,
            lastIncomingMessageAt: ts,
            lastMessagePreview: preview,
            unreadCount: (conversation.unreadCount || 0) + 1
        });
        
        const newMessage = await Message.create({
            conversationId: conversation.id,
            customerId: customer.id,
            whatsappId: messageData.id || null,
            direction: 'incoming',
            content: body || (resolvedMedia && (resolvedMedia.filename || resolvedMedia.caption)) || '',
            type: msgType,
            hasMedia: !!(hasMedia && resolvedMedia),
            mediaData: resolvedMedia || null,
            timestamp: ts
        });
        
        // 3.5. پاسخ خودکار به اولین پیام (خوش‌آمدگویی)
        const incomingCount = await Message.count({ where: { customerId: customer.id, direction: 'incoming' } });
        if (incomingCount === 1) {
            await sendFirstMessageWelcome(conversation, customer);
        }
        
        // 4. بررسی Auto-Response Rules
        await checkAutoResponse(conversation, newMessage);
        
        // 5. تخصیص خودکار به دپارتمان/کارمند
        if (!conversation.assignedTo) {
            await autoAssignment(conversation, body || '');
        }
        
        // 6. ارسال Notification به Dashboard
        io.emit('new_message', {
            conversationId: conversation.id,
            customerId: customer.id,
            message: newMessage,
            customer: {
                id: customer.id,
                name: customer.name,
                phone: customer.phone,
                profilePic: customer.profilePic
            }
        });
        
        // 7. اطلاع‌رسانی به کارمند مسئول
        if (conversation.assignedTo) {
            io.to(`user_${conversation.assignedTo}`).emit('assigned_message', {
                conversationId: conversation.id,
                message: newMessage
            });
        }
        
        if (mongoose.connection.readyState === 1 && mongoose.models.MessageLog) {
            await mongoose.model('MessageLog').create({
                conversationId: conversation.id,
                customerId: customer.id,
                messageId: newMessage.id,
                content: body,
                timestamp: new Date(timestamp * 1000),
                metadata: messageData
            });
        }
        
        logger.info(`📩 Message processed: ${phone}`);
        
    } catch (error) {
        logger.error('Error processing incoming message:', error);
    }
}

// ==================== First Message Welcome ====================
async function sendFirstMessageWelcome(conversation, customer) {
    try {
        const [cfg] = await WhatsappConfig.findOrCreate({
            where: { id: 'default' },
            defaults: { welcomeMessage: null, welcomeEnabled: true }
        });
        if (!cfg.welcomeEnabled || !cfg.welcomeMessage || !String(cfg.welcomeMessage).trim()) return;
        await sendAutoReply(conversation, String(cfg.welcomeMessage).trim());
        logger.info(`👋 Welcome message sent to ${customer.phone} (first contact)`);
    } catch (error) {
        logger.error('First message welcome error:', error);
    }
}

// ==================== Auto-Response ====================
async function checkAutoResponse(conversation, message) {
    try {
        const responses = await AutoResponse.findAll({
            where: { isActive: true }
        });
        
        for (const rule of responses) {
            const keywords = rule.keywords.split(',').map(k => k.trim().toLowerCase());
            const messageText = message.content.toLowerCase();
            
            if (keywords.some(keyword => messageText.includes(keyword))) {
                // ارسال پاسخ خودکار
                await sendAutoReply(conversation, rule.response);
                break;
            }
        }
    } catch (error) {
        logger.error('Auto-response error:', error);
    }
}

async function sendAutoReply(conversation, responseText) {
    try {
        const customer = await Customer.findByPk(conversation.customerId);
        
        if (rabbitChannel) {
            rabbitChannel.sendToQueue('outgoing_messages', Buffer.from(JSON.stringify({
                to: customer.phone, message: responseText, conversationId: conversation.id
            })), { persistent: true });
        } else {
            gatewayPost('/api/send-message', { to: customer.phone, message: responseText }, { timeout: 10000 }).catch(err => logger.error('Gateway send error:', err.message));
        }
        
        // ذخیره پیام در دیتابیس
        await Message.create({
            conversationId: conversation.id,
            customerId: customer.id,
            direction: 'outgoing',
            content: responseText,
            type: 'text',
            isAutoReply: true,
            timestamp: new Date()
        });
        var preview = (responseText || '').slice(0, 120);
        if ((responseText || '').length > 120) preview += '…';
        const now = new Date();
        await conversation.update({ lastMessageAt: now, lastOutgoingMessageAt: now, lastMessagePreview: preview, unansweredAlertSentAt: null, escalatedAt: null });
        logger.info(`🤖 Auto-reply sent to ${customer.phone}`);
    } catch (error) {
        logger.error('Send auto-reply error:', error);
    }
}

const { sendDeptAssignedMessage, maybeSendEmployeeIntro } = require('./services/autoMessages');

// ==================== Auto Assignment ====================
async function autoAssignment(conversation, messageContent) {
    try {
        const { Op } = require('sequelize');
        // پیدا کردن دپارتمان مناسب بر اساس کلمات کلیدی
        const departments = await Department.findAll({
            where: { isActive: true }
        });
        
        let assignedDepartment = null;
        for (const dept of departments) {
            if (dept.keywords) {
                const keywords = dept.keywords.split(',').map(k => k.trim().toLowerCase());
                if (keywords.some(keyword => messageContent.toLowerCase().includes(keyword))) {
                    assignedDepartment = dept;
                    break;
                }
            }
        }
        
        // اگر دپارتمان پیدا نشد، دپارتمان پیش‌فرض
        if (!assignedDepartment) {
            assignedDepartment = await Department.findOne({
                where: { isDefault: true }
            });
        }
        
        if (assignedDepartment) {
            // پیدا کردن کارمند با کمترین بار کاری
            const users = await User.findAll({
                where: { 
                    departmentId: assignedDepartment.id,
                    isActive: true,
                    role: { [Op.ne]: 'admin' }
                },
                include: [{
                    model: Conversation,
                    as: 'conversations',
                    where: { status: { [Op.ne]: 'closed' } },
                    required: false
                }]
            });
            
            // کارمند با کمترین مکالمه باز
            const selectedUser = users.reduce((prev, current) => {
                const prevCount = prev.conversations ? prev.conversations.length : 0;
                const currentCount = current.conversations ? current.conversations.length : 0;
                return currentCount < prevCount ? current : prev;
            });
            
            if (selectedUser) {
                await conversation.update({
                    departmentId: assignedDepartment.id,
                    assignedTo: selectedUser.id,
                    assignedAt: new Date()
                });
                logger.info(`👤 Conversation assigned to ${selectedUser.name} (${assignedDepartment.name})`);
                await sendDeptAssignedMessage(conversation, assignedDepartment);
            }
        }
        
    } catch (error) {
        logger.error('Auto-assignment error:', error);
    }
}

// ==================== Socket.IO ====================
const socketAuth = require('./middleware/socketAuth');

// اتاق‌های تماس گروهی: { threadId: { participants: Set<userId>, type: 'voice'|'video' } }
const callRooms = {};

app.set('io', io);
io.use(socketAuth);

io.on('connection', (socket) => {
    logger.info(`🔌 User connected: ${socket.userId}`);
    
    // اتصال کاربر به روم شخصی
    socket.join(`user_${socket.userId}`);
    
    // اتصال به روم دپارتمان
    if (socket.departmentId) {
        socket.join(`department_${socket.departmentId}`);
    }
    
    // ارسال پیام از CRM
    socket.on('send_message', async (data) => {
        try {
            const { conversationId, content, type, media } = data;
            
            const conversation = await Conversation.findByPk(conversationId, {
                include: ['customer', { model: Department, as: 'department', required: false }]
            });
            
            if (!conversation) {
                return socket.emit('error', { message: 'Conversation not found' });
            }
            
            // معرفی کارمند قبل از اولین پاسخ او
            if (socket.userId) {
                const user = await User.findByPk(socket.userId, { include: [{ model: Department, as: 'department', required: false }] });
                const dept = conversation.department || (user && user.department) || null;
                await maybeSendEmployeeIntro(conversation, socket.userId, user, dept);
            }
            
            // ذخیره پیام
            const newMessage = await Message.create({
                conversationId: conversation.id,
                customerId: conversation.customerId,
                userId: socket.userId,
                direction: 'outgoing',
                content: content,
                type: type || 'text',
                timestamp: new Date()
            });
            
            if (rabbitChannel) {
                rabbitChannel.sendToQueue('outgoing_messages', Buffer.from(JSON.stringify({
                    to: conversation.customer.phone, message: content, media: media, conversationId: conversation.id
                })), { persistent: true });
            } else {
                gatewayPost('/api/send-message', { to: conversation.customer.phone, message: content, media: media || null }, { timeout: 10000 }).catch(err => logger.error('Gateway send error:', err.message));
            }
            
            // بروزرسانی مکالمه
            const now = new Date();
            await conversation.update({
                lastMessageAt: now,
                lastOutgoingMessageAt: now,
                unreadCount: 0,
                unansweredAlertSentAt: null,
                escalatedAt: null
            });
            
            // اطلاع‌رسانی به همه کاربران
            io.emit('message_sent', {
                conversationId: conversation.id,
                message: newMessage
            });
            
            logger.info(`📤 Message sent by user ${socket.userId}`);
            
        } catch (error) {
            logger.error('Send message error:', error);
            socket.emit('error', { message: error.message });
        }
    });
    
    // سیگنالینگ تماس تصویری/صوتی چت داخلی
    socket.on('call_offer', (data) => {
        const { toUserId, threadId, type, sdp } = data;
        if (!toUserId || !threadId || !sdp) return;
        if (!callRooms[threadId]) callRooms[threadId] = { participants: new Set(), type: type || 'voice' };
        callRooms[threadId].participants.add(String(socket.userId));
        io.to(`user_${toUserId}`).emit('call_offer', { fromUserId: socket.userId, threadId, type: type || 'voice', sdp });
    });
    socket.on('call_answer', (data) => {
        const { toUserId, threadId, sdp } = data;
        if (!toUserId || !threadId || !sdp) return;
        if (callRooms[threadId]) callRooms[threadId].participants.add(String(socket.userId));
        io.to(`user_${toUserId}`).emit('call_answer', { fromUserId: socket.userId, threadId, sdp });
    });
    socket.on('call_ice', (data) => {
        const { toUserId, threadId, candidate } = data;
        if (!toUserId || !threadId) return;
        io.to(`user_${toUserId}`).emit('call_ice', { fromUserId: socket.userId, threadId, candidate });
    });
    socket.on('call_end', (data) => {
        const { threadId } = data;
        if (!threadId) return;
        const room = callRooms[threadId];
        if (room) {
            room.participants.delete(String(socket.userId));
            room.participants.forEach(uid => io.to(`user_${uid}`).emit('call_participant_left', { userId: socket.userId, threadId }));
            if (room.participants.size === 0) delete callRooms[threadId];
        }
    });
    socket.on('call_reject', (data) => {
        const { toUserId, threadId } = data;
        if (!toUserId || !threadId) return;
        io.to(`user_${toUserId}`).emit('call_reject', { fromUserId: socket.userId, threadId });
    });
    socket.on('call_invite', async (data) => {
        const { toUserId, threadId, type, participantIds } = data;
        if (!toUserId || !threadId) return;
        const room = callRooms[threadId];
        if (!room || !room.participants.has(String(socket.userId))) return;
        const fromUser = await User.findByPk(socket.userId, { attributes: ['name', 'email'] });
        const fromUserName = (fromUser && (fromUser.name || fromUser.email)) || '';
        io.to(`user_${toUserId}`).emit('call_invite', { fromUserId: socket.userId, fromUserName, threadId, type: type || room.type, participantIds: participantIds || Array.from(room.participants) });
    });
    socket.on('call_invite_accept', (data) => {
        const { threadId, type } = data;
        if (!threadId) return;
        const room = callRooms[threadId];
        if (!room) return;
        const participants = Array.from(room.participants);
        room.participants.add(String(socket.userId));
        participants.forEach(uid => io.to(`user_${uid}`).emit('call_participant_joined', { userId: socket.userId, threadId }));
        io.to(`user_${socket.userId}`).emit('call_room_info', { threadId, participantIds: participants, type: type || room.type });
    });
    socket.on('call_invite_reject', async (data) => {
        const { fromUserId, threadId } = data;
        if (!fromUserId || !threadId) return;
        const rejecter = await User.findByPk(socket.userId, { attributes: ['name', 'email'] });
        const userName = (rejecter && (rejecter.name || rejecter.email)) || '';
        io.to(`user_${fromUserId}`).emit('call_invite_reject', { userId: socket.userId, userName, threadId });
    });

    // تغییر وضعیت کاربر
    socket.on('status_change', async (status) => {
        await User.update(
            { status: status },
            { where: { id: socket.userId } }
        );
        
        io.emit('user_status', {
            userId: socket.userId,
            status: status
        });
    });
    
    socket.on('disconnect', async () => {
        logger.info(`🔌 User disconnected: ${socket.userId}`);
        Object.keys(callRooms).forEach(threadId => {
            const room = callRooms[threadId];
            if (room && room.participants.has(String(socket.userId))) {
                room.participants.delete(String(socket.userId));
                room.participants.forEach(uid => io.to(`user_${uid}`).emit('call_participant_left', { userId: socket.userId, threadId }));
                if (room.participants.size === 0) delete callRooms[threadId];
            }
        });
        if (socket.userId) {
            try {
                const user = await User.findByPk(socket.userId);
                if (user) {
                    await user.update({ status: 'offline' });
                    const { logActivity } = require('./services/activityLog');
                    await logActivity({
                        userId: user.id,
                        branchId: user.branchId || null,
                        departmentId: user.departmentId || null,
                        action: 'user_logout',
                        entityType: 'user',
                        entityId: user.id,
                        summary: 'خروج از پورتال (قطع اتصال)',
                        metadata: { email: user.email }
                    });
                }
                io.emit('user_status', { userId: socket.userId, status: 'offline' });
            } catch (e) { logger.warn('Disconnect status update:', e.message); }
        }
    });
});

const { authMiddleware } = require('./middleware/auth');
const { spawn } = require('child_process');

// ==================== API Router (همه /api فقط از این مسیر — هرگز به static نمی‌رسد) ====================
const apiRouter = express.Router();

// همه پاسخ‌های API حتماً JSON
apiRouter.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
});

// تست در دسترس بودن API بدون احراز هویت
apiRouter.get('/ping', (req, res) => {
    res.json({ ok: true, message: 'API در دسترس است' });
});

// تنظیمات عمومی (timezone، پشتیبانی و غیره) — بدون احراز هویت
apiRouter.get('/config', (req, res) => {
    const supportUrl = process.env.SUPPORT_URL || null;
    const supportEmail = process.env.SUPPORT_EMAIL || null;
    const defaultEmail = process.env.MAIN_ADMIN_EMAIL || 'admin@kaya.local';
    const supportLink = supportUrl || (supportEmail ? 'mailto:' + supportEmail : 'mailto:' + defaultEmail);
    res.json({
        timezone: process.env.APP_TIMEZONE || 'Europe/Istanbul',
        supportUrl: supportLink
    });
});

const { gatewayGet, gatewayPost, GATEWAY_URL: gatewayUrl } = require('./lib/gatewayClient');
let gatewayProcess = null;

apiRouter.get('/gateway/status', authMiddleware, (req, res) => {
    gatewayGet('/api/status', { timeout: 5000 })
        .then(r => res.json(r.data))
        .catch(() => res.status(503).json({ whatsapp: false, status: 'disconnected', error: 'Gateway در دسترس نیست' }));
});

apiRouter.get('/gateway/qr', authMiddleware, (req, res) => {
    gatewayGet('/api/qr', { timeout: 5000 })
        .then(r => res.json(r.data))
        .catch(() => res.status(503).json({ error: 'Gateway در دسترس نیست' }));
});

// پراکسی شروع واتساپ به Gateway (وقتی Gateway در دسترس است)
apiRouter.post('/gateway/start', authMiddleware, (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'owner') return res.status(403).json({ error: 'فقط ادمین یا مالک' });
    gatewayPost('/api/start', {}, { timeout: 10000 })
        .then(r => res.json(r.data))
        .catch(e => res.status(503).json({ error: e.response?.data?.error || 'Gateway در دسترس نیست' }));
});

// قطع دستی اتصال واتساپ (بدون خروج از حساب)
apiRouter.post('/gateway/stop', authMiddleware, (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'owner') return res.status(403).json({ error: 'فقط ادمین یا مالک' });
    gatewayPost('/api/stop', {}, { timeout: 10000 })
        .then(r => res.json(r.data))
        .catch(e => res.status(503).json({ error: e.response?.data?.error || 'Gateway در دسترس نیست' }));
});

apiRouter.post('/admin/start-gateway', authMiddleware, (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'owner') return res.status(403).json({ error: 'فقط ادمین یا مالک' });
    if (gatewayProcess) return res.json({ message: 'Gateway از قبل در حال اجراست' });
    try {
        const gatewayPath = path.join(__dirname, '..', 'gateway');
        gatewayProcess = spawn('node', ['src/index.js'], { cwd: gatewayPath, stdio: 'ignore', detached: true });
        gatewayProcess.unref();
        gatewayProcess = true;
        setTimeout(() => { gatewayProcess = null; }, 1000);
        res.json({ message: 'Gateway در حال بالا آمدن است. چند ثانیه صبر کنید و QR را در تنظیمات واتساپ ببینید.' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', authMiddleware, userRoutes);
apiRouter.use('/conversations', authMiddleware, conversationRoutes);
apiRouter.use('/messages', messageRoutes);
apiRouter.use('/departments', authMiddleware, departmentRoutes);
apiRouter.use('/analytics', authMiddleware, analyticsRoutes);
apiRouter.use('/bulk', authMiddleware, bulkRoutes);
apiRouter.use('/customers', authMiddleware, customerRoutes);
apiRouter.use('/tickets', authMiddleware, require('./routes/tickets')(io));
apiRouter.use('/branches', authMiddleware, branchRoutes);
apiRouter.use('/supervision', authMiddleware, supervisionRoutes);
apiRouter.use('/tasks', authMiddleware, taskRoutes);
apiRouter.use('/processes', authMiddleware, processRoutes);
apiRouter.use('/upload', authMiddleware, require('./routes/upload'));
apiRouter.use('/rates', authMiddleware, require('./routes/rates'));
apiRouter.use('/services', authMiddleware, require('./routes/services'));
apiRouter.use('/exchange', authMiddleware, require('./routes/exchange'));
apiRouter.use('/whatsapp', authMiddleware, require('./routes/whatsapp'));
const announcementRoutes = require('./routes/announcements');
const internalRoutes = require('./routes/internal');
apiRouter.use('/announcements', authMiddleware, announcementRoutes);
apiRouter.use('/internal', authMiddleware, internalRoutes(io));
apiRouter.use('/panel-settings', require('./routes/panelSettings'));

// وب‌هوک پیام ورودی واتساپ. بدنه: from/contact, body, timestamp, hasMedia, type؟, media؟
// رسانه: اگر media.url با http/https باشد → دانلود و ذخیره در uploads و mediaData.url نسبی؛ اگر media.data (base64) باشد → ذخیره در uploads و mediaData.url. نوع پیام از mimetype/filename استنتاج می‌شود.
apiRouter.post('/webhook/incoming-message', (req, res) => {
    processIncomingMessage(req.body).then(() => res.json({ ok: true })).catch(err => {
        logger.error('Webhook process error:', err);
        res.status(500).json({ error: err.message });
    });
});

// هر مسیر /api که جایی جواب نگرفت → 404 به صورت JSON
apiRouter.use((req, res) => {
    res.status(404).json({ error: 'مسیر API یافت نشد', path: req.path });
});

app.use('/api', apiRouter);

// Health (خارج از /api)
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date(), uptime: process.uptime() });
});

// ساختار لینک‌ها: / → پنل (https://kaya.fxguard.io/)، /dashboard و /dashboard.html → ریدایرکت به /
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/dashboard.html', (req, res) => res.redirect('/'));
app.get('/dashboard', (req, res) => res.redirect('/'));
app.get('/dashboard/', (req, res) => res.redirect('/'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Error handling
app.use((err, req, res, next) => {
    logger.error('Server error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ==================== Unanswered Conversations: Alert & Escalation ====================
async function checkUnansweredConversations() {
    try {
        const [cfg] = await WhatsappConfig.findOrCreate({
            where: { id: 'default' },
            defaults: { alertUnansweredAfterMinutes: 5, escalateUnansweredAfterMinutes: 15 }
        });
        const alertMin = cfg.alertUnansweredAfterMinutes ?? 5;
        const escalateMin = cfg.escalateUnansweredAfterMinutes ?? 15;
        const escalationDeptId = cfg.escalationDepartmentId;

        let targetDeptCache = null;
        if (escalationDeptId) {
            targetDeptCache = await Department.findByPk(escalationDeptId);
        }
        if (!targetDeptCache) targetDeptCache = await Department.findOne({ where: { isDefault: true } });

        const now = new Date();
        const alertThreshold = new Date(now.getTime() - alertMin * 60000);
        const escalateThreshold = new Date(now.getTime() - escalateMin * 60000);

        const unanswered = await Conversation.findAll({
            where: {
                status: { [Op.in]: ['open', 'pending'] },
                lastIncomingMessageAt: { [Op.ne]: null },
                [Op.or]: [
                    { lastOutgoingMessageAt: null },
                    sequelize.where(sequelize.col('lastIncomingMessageAt'), Op.gt, sequelize.col('lastOutgoingMessageAt'))
                ]
            },
            include: [
                { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'] },
                { model: User, as: 'assignee', attributes: ['id', 'name'] },
                { model: Department, as: 'department', attributes: ['id', 'name'] }
            ]
        });

        for (const conv of unanswered) {
            const lastIn = conv.lastIncomingMessageAt ? new Date(conv.lastIncomingMessageAt) : null;
            if (!lastIn) continue;
            const minsWaiting = Math.floor((now - lastIn) / 60000);

            // Escalation: برگرداندن به دپارتمان پشتیبانی
            if (lastIn < escalateThreshold && (!conv.escalatedAt || new Date(conv.escalatedAt) < lastIn)) {
                if (targetDeptCache) {
                    await conv.update({
                        departmentId: targetDeptCache.id,
                        assignedTo: null,
                        escalatedAt: now
                    });
                    io.emit('conversation_escalated', {
                        conversationId: conv.id,
                        customer: conv.customer,
                        department: targetDeptCache.name,
                        minutesWaiting: minsWaiting
                    });
                    logger.info(`⬆️ Escalated conversation ${conv.id} to ${targetDeptCache.name} (${minsWaiting} min unanswered)`);
                }
            }
            // Alert: اعلان به مسئول/دپارتمان
            else if (lastIn < alertThreshold && (!conv.unansweredAlertSentAt || new Date(conv.unansweredAlertSentAt) < lastIn)) {
                const payload = {
                    conversationId: conv.id,
                    customer: conv.customer,
                    minutesWaiting: minsWaiting,
                    assignee: conv.assignee,
                    department: conv.department
                };
                if (conv.assignedTo) {
                    io.to(`user_${conv.assignedTo}`).emit('unanswered_alert', payload);
                }
                if (conv.departmentId) {
                    io.to(`department_${conv.departmentId}`).emit('unanswered_alert', payload);
                }
                await conv.update({ unansweredAlertSentAt: now });
                logger.info(`🔔 Unanswered alert sent for conversation ${conv.id} (${minsWaiting} min)`);
            }
        }
    } catch (err) {
        logger.error('checkUnansweredConversations:', err.message);
    }
}

// ==================== Server Startup ====================
async function startServer() {
    try {
        await connectDatabases();
        await ensureAdminUser();
        await connectRabbitMQ();

        setInterval(checkUnansweredConversations, 60000);
        
        const PORT = process.env.PORT || 3002;
        server.listen(PORT, () => {
            logger.info(`🚀 CRM Backend running on port ${PORT}`);
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
    await sequelize.close();
    if (mongoose.connection.readyState === 1) await mongoose.connection.close().catch(() => {});
    redisClient.quit().catch(() => {});
    process.exit(0);
});

module.exports = { io, rabbitChannel };

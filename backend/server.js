require("dotenv").config();

const MAIN_ADMIN_EMAIL = process.env.MAIN_ADMIN_EMAIL;
const MAIN_ADMIN_PASSWORD = process.env.MAIN_ADMIN_PASSWORD;
if (!MAIN_ADMIN_EMAIL || !MAIN_ADMIN_PASSWORD) {
    console.error('❌ MAIN_ADMIN_EMAIL و MAIN_ADMIN_PASSWORD باید در فایل .env تنظیم شوند');
    process.exit(1);
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('❌ JWT_SECRET باید در .env تنظیم شود و حداقل ۳۲ کاراکتر باشد');
    process.exit(1);
}
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
const departmentRoutes = require('./routes/departments');
const analyticsRoutes = require('./routes/analytics');
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

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3002').split(',').map(s => s.trim());

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
                "'unsafe-inline'",   // فرانت‌اند vanilla JS inline scripts
                "'unsafe-eval'",     // برخی کتابخانه‌های CDN
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
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Rate Limiting — عمومی
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1500,
    message: { error: 'تعداد درخواست‌ها زیاد است. چند دقیقه صبر کنید.' },
    standardHeaders: true,
    legacyHeaders: false
});
// Rate Limiting — لاگین: حداکثر ۱۰ تلاش در ۱۵ دقیقه به ازای هر IP
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'تعداد تلاش‌های ورود زیاد است. ۱۵ دقیقه صبر کنید.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
});
app.use('/api/', (req, res, next) => {
  const p = req.path || '';
  if (p.endsWith('/ping')) return next();
  if (p.endsWith('/auth/login')) return loginLimiter(req, res, next);
  return limiter(req, res, next);
});

// Rate limit برای فرم تماس عمومی — ۵ درخواست در ۱۵ دقیقه به ازای هر IP
const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'تعداد ارسال فرم زیاد است. چند دقیقه صبر کنید.' },
    standardHeaders: true,
    legacyHeaders: false
});

// ==================== Logger ====================
let DailyRotateFile;
try { DailyRotateFile = require('winston-daily-rotate-file'); } catch (_) {}

const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
);

const logTransports = [new winston.transports.Console()];

if (DailyRotateFile) {
    const logsDir = process.env.LOG_DIR || './logs';
    logTransports.push(new DailyRotateFile({
        filename: `${logsDir}/error-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '14d',
        zippedArchive: true,
    }));
    logTransports.push(new DailyRotateFile({
        filename: `${logsDir}/combined-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        maxSize: '50m',
        maxFiles: '30d',
        zippedArchive: true,
    }));
} else {
    logTransports.push(new winston.transports.File({ filename: 'error.log', level: 'error' }));
    logTransports.push(new winston.transports.File({ filename: 'combined.log' }));
}

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports: logTransports,
});

// ==================== Redis (optional) ====================
let redisClient = { quit: () => Promise.resolve(), connect: () => Promise.resolve() };
if (redis) {
    try {
        redisClient = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
        redisClient.on('error', (err) => { logger.warn('Redis error:', err?.message || err); });
        redisClient.connect().catch((err) => { logger.warn('⚠️ Redis not available - continuing without cache:', err?.message || err); });
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
        
        // Dead-letter queue برای پیام‌های خراب (poison messages)
        await rabbitChannel.assertQueue('whatsapp_messages_dead', { durable: true });
        await rabbitChannel.assertQueue('whatsapp_messages', {
            durable: true,
            arguments: {
                'x-dead-letter-exchange': '',
                'x-dead-letter-routing-key': 'whatsapp_messages_dead',
                'x-message-ttl': 60000,
            }
        });
        await rabbitChannel.assertQueue('outgoing_messages', { durable: true });

        logger.info('✅ Connected to RabbitMQ');

        // مصرف پیام‌های دریافتی — بعد از ۳ بار شکست به dead-letter می‌رود
        rabbitChannel.consume('whatsapp_messages', async (msg) => {
            if (!msg) return;
            const retryCount = (msg.properties.headers?.['x-retry-count'] || 0);
            const MAX_RETRIES = 3;
            try {
                const messageData = JSON.parse(msg.content.toString());
                await processIncomingMessage(messageData);
                rabbitChannel.ack(msg);
            } catch (err) {
                logger.error('processIncomingMessage failed', { error: err?.message, retryCount });
                if (retryCount >= MAX_RETRIES) {
                    logger.error('Message moved to dead-letter queue after max retries', { retryCount });
                    rabbitChannel.nack(msg, false, false); // به dead-letter می‌رود
                } else {
                    // requeue با شمارنده retry
                    rabbitChannel.nack(msg, false, false);
                    setTimeout(() => {
                        rabbitChannel.sendToQueue('whatsapp_messages', msg.content, {
                            persistent: true,
                            headers: { 'x-retry-count': retryCount + 1 }
                        });
                    }, Math.min(1000 * Math.pow(2, retryCount), 30000)); // exponential backoff
                }
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
        // Auto-migrate: add status, approvedBy, approvedAt, rejectedBy, rejectedAt to Transactions
        try {
            const { DataTypes } = require('sequelize');
            const qi = sequelize.getQueryInterface();
            const txDesc = await qi.describeTable('Transactions');
            const colsToAdd = [];
            if (!txDesc || !txDesc.status) colsToAdd.push(['status', { type: DataTypes.STRING(20), allowNull: true, defaultValue: 'pending' }]);
            if (!txDesc || !txDesc.approvedBy) colsToAdd.push(['approvedBy', { type: DataTypes.UUID, allowNull: true, references: { model: 'Users', key: 'id' } }]);
            if (!txDesc || !txDesc.approvedAt) colsToAdd.push(['approvedAt', { type: DataTypes.DATE, allowNull: true }]);
            if (!txDesc || !txDesc.rejectedBy) colsToAdd.push(['rejectedBy', { type: DataTypes.UUID, allowNull: true, references: { model: 'Users', key: 'id' } }]);
            if (!txDesc || !txDesc.rejectedAt) colsToAdd.push(['rejectedAt', { type: DataTypes.DATE, allowNull: true }]);
            if (!txDesc || !txDesc.metadata) colsToAdd.push(['metadata', { type: DataTypes.JSON, allowNull: true, defaultValue: {} }]);
            for (const [name, def] of colsToAdd) {
                await qi.addColumn('Transactions', name, def);
                logger.info('✅ Transactions.' + name + ' column added (auto-migration)');
            }
        } catch (migErr) {
            logger.warn('Transactions status/approval migration:', migErr.message);
        }
        // Auto-migrate: add branchId to Conversations BEFORE sync (sync creates index on branchId)
        try {
            const qi = sequelize.getQueryInterface();
            const tableName = sequelize.getDialect() === 'postgres' ? 'Conversations' : 'Conversations';
            const tableDesc = await qi.describeTable(tableName).catch(() => null);
            if (!tableDesc || !tableDesc.branchId) {
                await qi.addColumn(tableName, 'branchId', {
                    type: require('sequelize').DataTypes.UUID,
                    allowNull: true,
                    references: { model: 'Branches', key: 'id' }
                });
                logger.info('✅ Conversations.branchId column added (auto-migration)');
            }
        } catch (migErr) {
            logger.warn('Conversations branchId migration:', migErr.message);
        }
        try {
            const convDesc = await sequelize.getQueryInterface().describeTable('Conversations').catch(() => null);
            if (!convDesc || !convDesc.firstReplyAt) {
                await sequelize.getQueryInterface().addColumn('Conversations', 'firstReplyAt', { type: require('sequelize').DataTypes.DATE, allowNull: true });
                logger.info('✅ Conversations.firstReplyAt column added (auto-migration)');
            }
            if (!convDesc || !convDesc.metadata) {
                await sequelize.getQueryInterface().addColumn('Conversations', 'metadata', { type: require('sequelize').DataTypes.JSON, allowNull: true });
                logger.info('✅ Conversations.metadata column added (auto-migration)');
            }
        } catch (migErr) {
            logger.warn('Conversations firstReplyAt migration:', migErr.message);
        }
        if (sequelize.getDialect() === 'postgres') {
            try {
                await sequelize.query("ALTER TYPE \"enum_Tickets_status\" ADD VALUE IF NOT EXISTS 'archived';");
                logger.info('✅ Ticket status archived added (auto-migration)');
            } catch (e) {
                if (!String(e.message || '').includes('already exists')) logger.warn('Ticket archived migration:', e.message);
            }
            try {
                await sequelize.query("ALTER TYPE \"enum_Conversations_status\" ADD VALUE IF NOT EXISTS 'archived';");
                logger.info('✅ Conversation status archived added (auto-migration)');
            } catch (e) {
                if (!String(e.message || '').includes('already exists')) logger.warn('Conversation archived migration:', e.message);
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
            if (desc && desc.showFooter === undefined) {
                try {
                    await qi.addColumn('panel_settings', 'showFooter', { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true });
                    logger.info('✅ panel_settings: showFooter column added (auto-migration)');
                } catch (e) {
                    if (!String(e.message || '').includes('already exists') && !String(e.message || '').includes('duplicate')) logger.warn('panel_settings.showFooter', e.message);
                }
            }
            if (desc && desc.defaultLanguage === undefined) {
                try {
                    await qi.addColumn('panel_settings', 'defaultLanguage', { type: DataTypes.STRING(10), allowNull: true });
                    logger.info('✅ panel_settings: defaultLanguage column added (auto-migration)');
                } catch (e) {
                    if (!String(e.message || '').includes('already exists') && !String(e.message || '').includes('duplicate')) logger.warn('panel_settings.defaultLanguage', e.message);
                }
            }
            if (desc && desc.footerStyle === undefined) {
                try {
                    await qi.addColumn('panel_settings', 'footerStyle', { type: DataTypes.STRING(32), allowNull: true });
                    logger.info('✅ panel_settings: footerStyle column added (auto-migration)');
                } catch (e) {
                    if (!String(e.message || '').includes('already exists') && !String(e.message || '').includes('duplicate')) logger.warn('panel_settings.footerStyle', e.message);
                }
            }
        } catch (e) {
            logger.warn('panel_settings migration:', e.message);
        }

        // Auto-migrate Users: add position column if missing
        try {
            const qi = sequelize.getQueryInterface();
            const userDesc = await qi.describeTable('Users');
            if (userDesc && !userDesc.position) {
                await qi.addColumn('Users', 'position', { type: require('sequelize').DataTypes.STRING, allowNull: true });
                logger.info('✅ Users: position column added (auto-migration)');
            }
        } catch (e) {
            if (!String(e.message || '').includes('already exists') && !String(e.message || '').includes('duplicate')) logger.warn('Users position migration:', e.message);
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

// ایجاد کاربران ادمین اصلی (بالاترین سطح دسترسی) اگر وجود نداشته باشند؛ اگر وجود داشتند همیشه نقش owner و فعال هستند
const MAIN_ADMIN_EMAILS_LIST = MAIN_ADMIN_EMAIL.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
const ADMIN_CONFIGS = MAIN_ADMIN_EMAIL.split(',').map(e => {
    const email = e.trim().toLowerCase();
    const name = email.split('@')[0];
    return { email, name, username: name, password: MAIN_ADMIN_PASSWORD };
});
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
        for (const cfg of ADMIN_CONFIGS) {
            if (!MAIN_ADMIN_EMAILS_LIST.includes(cfg.email)) continue;
            let existing = await User.findOne({
                where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), cfg.email)
            });
            if (!existing) {
                await User.create({
                    name: cfg.name,
                    username: cfg.username,
                    email: cfg.email,
                    password: cfg.password,
                    role: 'owner',
                    branchId: null,
                    departmentId: null,
                    isActive: true
                });
                logger.info('✅ کاربر ادمین اصلی ایجاد شد: ' + cfg.email);
            } else {
                let changed = false;
                if (existing.role !== 'owner') { existing.role = 'owner'; changed = true; }
                if (!existing.isActive) { existing.isActive = true; changed = true; }
                if (changed) {
                    await existing.save();
                    logger.info('✅ ادمین اصلی به‌روز شد: ' + existing.email);
                }
            }
        }
    } catch (err) {
        logger.warn('⚠️ ensureAdminUser:', err.message);
    }
}

// ==================== Process Incoming Messages ====================
const { normalizePhone, getSendTarget } = require('./lib/phoneUtils');

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
            else if (ct.includes('audio/ogg') || ct.includes('audio/opus')) ext = '.ogg';
            else if (ct.includes('audio/')) ext = '.m4a';
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
    if (mime.startsWith('audio/') || /\.(mp3|ogg|wav|m4a|opus|oga)$/i.test(name)) return 'audio';
    if (mime || name) return 'document';
    return 'text';
}

async function processIncomingMessage(messageData) {
    try {
        if (messageData.isStatus) return;
        const { body, contact, from, timestamp, hasMedia, media, chat } = messageData;
        const isGroup = !!(chat && chat.isGroup);
        // برای گروه: از شناسه گروه استفاده کن؛ برای چت مستقیم: از شماره فرستنده
        const rawPhone = isGroup ? (chat?.id || from) : ((contact && contact.number != null) ? contact.number : from);
        if (rawPhone == null || rawPhone === '') return;
        const phone = isGroup ? String(rawPhone).trim() : (normalizePhone(rawPhone) || normalizePhone(from));
        if (!phone) return;
        const rawType = (messageData.type || '').toLowerCase();
        if (rawType === 'reaction' || rawType === 'read_receipt' || rawType === 'delivery' || rawType === 'update') return;
        const hasText = body != null && String(body).trim().length > 0;
        const hasUsableMedia = hasMedia && media && (media.url || (media.filename && String(media.filename).trim()) || (media.caption && String(media.caption).trim()) || media.data);
        if (!hasText && !hasUsableMedia) return;
        
        let resolvedMedia = media || null;
        let msgType = (messageData.type || 'text').toLowerCase();
        if (msgType === 'ptt') msgType = 'audio';
        if (hasMedia && media) {
            if (media.url && (String(media.url).trim().startsWith('http://') || String(media.url).trim().startsWith('https://'))) {
                resolvedMedia = await resolveIncomingMedia(media);
            } else if (media.data) {
                resolvedMedia = resolveIncomingMediaFromBase64(media);
            }
            if (resolvedMedia && (resolvedMedia.url || resolvedMedia.filename || resolvedMedia.data)) msgType = inferMessageTypeFromMedia(resolvedMedia);
        }
        if (msgType === 'ptt') msgType = 'audio';
        
        // 1. پیدا کردن یا ایجاد مشتری (برای گروه‌ها: یک رکورد با شناسه گروه به‌عنوان «مشتری»)
        let customer = await Customer.findOne({ 
            where: { phone } 
        });
        
        const groupNameFromChat = isGroup ? (chat?.name || chat?.subject || chat?.formattedTitle || '').toString().trim() : '';
        if (!customer) {
            const contactName = isGroup ? (groupNameFromChat || `گروه ${phone}`) : ((contact && (contact.name || contact.pushname)) || `مشتری ${phone}`);
            const profilePic = isGroup ? null : (contact && contact.profilePicUrl) || null;
            customer = await Customer.create({
                phone,
                name: contactName,
                profilePic: profilePic,
                source: isGroup ? 'whatsapp' : 'whatsapp'
            });
            logger.info(isGroup ? `✨ New group conversation: ${groupNameFromChat || phone}` : `✨ New customer created: ${phone}`);
        } else {
            const tsContact = timestamp ? new Date((timestamp < 1e12 ? timestamp * 1000 : timestamp)) : new Date();
            const contactName = isGroup ? groupNameFromChat : (contact && (contact.name || contact.pushname)) || null;
            const updates = { lastContactAt: tsContact };
            if (contactName && String(contactName).trim() && String(customer.name || '').trim() !== String(contactName).trim()) updates.name = String(contactName).trim();
            if (!isGroup && contact && contact.profilePicUrl && contact.profilePicUrl !== customer.profilePic) updates.profilePic = contact.profilePicUrl;
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
                source: 'whatsapp',
                metadata: isGroup ? { isGroup: true, groupName: groupNameFromChat || null } : {}
            });
        } else if (isGroup && groupNameFromChat) {
            const meta = conversation.metadata || {};
            if (meta.groupName !== groupNameFromChat) {
                await conversation.update({ metadata: { ...meta, isGroup: true, groupName: groupNameFromChat } });
            }
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
        
        // برای گروه‌ها: فرستنده را ذخیره کن. contact از getContact وقتی author هست = فرستنده
        const msgMetadata = isGroup && (messageData.author || messageData.authorName)
          ? {
              senderId: messageData.author || null,
              senderName: messageData.authorName || (messageData.author && contact && (contact.name || contact.pushname)) || null
            }
          : {};
        const newMessage = await Message.create({
            conversationId: conversation.id,
            customerId: customer.id,
            whatsappId: messageData.id || null,
            direction: 'incoming',
            content: body || (resolvedMedia && (resolvedMedia.filename || resolvedMedia.caption)) || '',
            type: msgType,
            hasMedia: !!(hasMedia && resolvedMedia),
            mediaData: resolvedMedia || null,
            timestamp: ts,
            metadata: Object.keys(msgMetadata).length ? msgMetadata : {}
        });
        
        // 3.5. پاسخ خودکار به اولین پیام (خوش‌آمدگویی) — فقط برای چت مستقیم، نه گروه
        if (!isGroup) {
            const incomingCount = await Message.count({ where: { customerId: customer.id, direction: 'incoming' } });
            if (incomingCount === 1) {
                await sendFirstMessageWelcome(conversation, customer);
            }
        }
        
        // 4. تخصیص خودکار به دپارتمان و کارمند مناسب — فقط برای چت مستقیم
        if (!isGroup && !conversation.assignedTo) {
            await autoAssignment(conversation, body || '', customer.id);
            await conversation.reload({ include: [{ model: Department, as: 'department', required: false }] });
        }
        
        // 5. بررسی Auto-Response Rules — فقط برای چت مستقیم (در گروه‌ها پاسخ خودکار ارسال نشود)
        const autoResponseSent = isGroup ? false : await checkAutoResponse(conversation, newMessage);
        
        // 6. پاسخ هوش مصنوعی — فقط برای چت مستقیم؛ گروه‌ها پاسخ خودکار نمی‌گیرند
        if (!isGroup && !autoResponseSent && hasText) {
            const { generateAIResponse, isAIAnswerEnabled } = require('./services/aiResponseService');
            let aiEnabled = isAIAnswerEnabled();
            if (!aiEnabled) {
                logger.info('AI skipped: OPENAI_API_KEY not set or AI_ANSWER_ENABLED=false');
            }
            try {
                const [wc] = await WhatsappConfig.findOrCreate({ where: { id: 'default' }, defaults: { aiAnswerEnabled: true } });
                if (wc && wc.aiAnswerEnabled === false) {
                    aiEnabled = false;
                    logger.info('AI skipped: disabled in WhatsappConfig panel');
                }
            } catch (e) {
                logger.warn('WhatsappConfig aiAnswerEnabled check failed:', e?.message);
            }
            if (aiEnabled) {
                const convWithDept = await Conversation.findByPk(conversation.id, {
                    include: [{ model: Department, as: 'department', required: false }]
                });
                const history = await Message.findAll({
                    where: { conversationId: conversation.id },
                    order: [['timestamp', 'ASC']],
                    limit: 12,
                    attributes: ['direction', 'content']
                });
                const aiReply = await generateAIResponse({
                    conversation: convWithDept,
                    customer,
                    incomingMessage: body || '',
                    messageHistory: history,
                    department: convWithDept?.department || null
                });
                if (aiReply) {
                    await sendAutoReply(conversation, aiReply);
                    logger.info(`🤖 AI reply sent to ${customer.phone}`);
                } else {
                    logger.warn('AI returned no reply', { phone: customer.phone, incomingPreview: (body || '').slice(0, 50) });
                }
            }
        } else if (hasText && autoResponseSent) {
            logger.debug('AI skipped: auto-response rule matched');
        } else if (!hasText) {
            logger.debug('AI skipped: no text in message (media only)');
        }
        
        // 7. ارسال Notification به Dashboard
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
        
        // 8. اطلاع‌رسانی به کارمند مسئول
        if (conversation.assignedTo) {
            io.to(`user_${conversation.assignedTo}`).emit('assigned_message', {
                conversationId: conversation.id,
                message: newMessage
            });
        }
        
        if (mongoose.connection.readyState === 1 && mongoose.models.MessageLog) {
            const ts = timestamp != null ? (timestamp < 1e12 ? timestamp * 1000 : timestamp) : Date.now();
            await mongoose.model('MessageLog').create({
                conversationId: conversation.id,
                customerId: customer.id,
                messageId: newMessage.id,
                content: body,
                timestamp: new Date(ts),
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
function matchesAutoResponseConditions(rule, conversation, now) {
    const cond = rule.conditions || {};
    if (!cond || typeof cond !== 'object') return true;

    // زمان روز: { start: "09:00", end: "18:00" } — بازه زمانی فعال
    if (cond.timeOfDay && typeof cond.timeOfDay === 'object') {
        const start = (cond.timeOfDay.start || '00:00').toString();
        const end = (cond.timeOfDay.end || '23:59').toString();
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        const nowMins = now.getHours() * 60 + now.getMinutes();
        const startMins = (sh || 0) * 60 + (sm || 0);
        const endMins = (eh || 0) * 60 + (em || 0);
        if (startMins <= endMins) {
            if (nowMins < startMins || nowMins > endMins) return false;
        } else {
            if (nowMins < startMins && nowMins > endMins) return false;
        }
    }

    // روزهای هفته: [0,1,2,3,4,5,6] — 0=یکشنبه
    if (cond.daysOfWeek && Array.isArray(cond.daysOfWeek) && cond.daysOfWeek.length > 0) {
        const day = now.getDay();
        if (!cond.daysOfWeek.includes(day)) return false;
    }

    // دپارتمان: فقط اگر مکالمه به این دپارتمان تخصیص شده
    if (cond.departmentId && conversation.departmentId) {
        if (String(conversation.departmentId) !== String(cond.departmentId)) return false;
    }

    return true;
}

async function checkAutoResponse(conversation, message) {
    try {
        const responses = await AutoResponse.findAll({
            where: { isActive: true },
            order: [['priority', 'DESC'], ['createdAt', 'ASC']]
        });

        const messageText = (message.content || '').toLowerCase();
        const now = new Date();

        for (const rule of responses) {
            const keywords = (rule.keywords || '').split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
            if (keywords.length && keywords.some(keyword => messageText.includes(keyword))) {
                if (!matchesAutoResponseConditions(rule, conversation, now)) continue;
                await sendAutoReply(conversation, rule.response);
                return true;
            }
        }
        return false;
    } catch (error) {
        logger.error('Auto-response error:', error);
        return false;
    }
}

async function sendAutoReply(conversation, responseText) {
    try {
        const customer = await Customer.findByPk(conversation.customerId);
        if (!customer) {
            logger.warn('sendAutoReply: customer not found', { conversationId: conversation.id });
            return;
        }
        const toPhone = getSendTarget(customer.phone) || customer.phone;
        if (rabbitChannel) {
            rabbitChannel.sendToQueue('outgoing_messages', Buffer.from(JSON.stringify({
                to: toPhone, message: responseText, conversationId: conversation.id
            })), { persistent: true });
        } else {
            gatewayPost('/api/send-message', { to: toPhone, message: responseText }, { timeout: 10000 }).catch(err => logger.error('Gateway send error:', err.message));
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
        const upd = { lastMessageAt: now, lastOutgoingMessageAt: now, lastMessagePreview: preview, unansweredAlertSentAt: null, escalatedAt: null };
        if (!conversation.firstReplyAt) upd.firstReplyAt = now;
        await conversation.update(upd);
        logger.info(`🤖 Auto-reply sent to ${customer.phone}`);
    } catch (error) {
        logger.error('Send auto-reply error:', error);
    }
}

const { sendDeptAssignedMessage, maybeSendEmployeeIntro } = require('./services/autoMessages');
const { selectBestDepartment, selectBestUser } = require('./services/intelligentDepartmentRouter');

// ==================== Auto Assignment ====================
async function autoAssignment(conversation, messageContent, customerId) {
    try {
        const { Op } = require('sequelize');
        const departments = await Department.findAll({
            where: { isActive: true }
        });

        // مسیریابی هوشمند: فهم معنایی پیام → دپارتمان مناسب
        const { department: smartDept, method, confidence } = await selectBestDepartment(
            departments,
            messageContent || '',
            { useAI: !!process.env.OPENAI_API_KEY }
        );

        let assignedDepartment = smartDept;
        if (!assignedDepartment) {
            assignedDepartment = await Department.findOne({
                where: { isDefault: true }
            });
        }

        if (assignedDepartment && method !== 'none') {
            logger.info(`🧠 Smart routing: ${assignedDepartment.name} (${method}, confidence: ${confidence}%)`);
        }

        if (assignedDepartment) {
            // کارمند قبلی این مشتری (برای تداوم رابطه)
            let previousAssigneeId = null;
            if (customerId) {
                const prevConv = await Conversation.findOne({
                    where: {
                        customerId,
                        id: { [Op.ne]: conversation.id },
                        assignedTo: { [Op.ne]: null }
                    },
                    order: [['assignedAt', 'DESC']],
                    attributes: ['assignedTo']
                });
                if (prevConv) previousAssigneeId = prevConv.assignedTo;
            }

            const users = await User.findAll({
                where: {
                    departmentId: assignedDepartment.id,
                    isActive: true,
                    role: { [Op.ne]: 'admin' }
                },
                attributes: { include: ['status', 'settings'] },
                include: [{
                    model: Conversation,
                    as: 'conversations',
                    where: { status: { [Op.ne]: 'closed' } },
                    required: false
                }]
            });

            // انتخاب هوشمند کارمند: تخصص، مشتری قبلی، آنلاین، بار کاری
            const selectedUser = selectBestUser(users, messageContent || '', {
                customerId,
                previousAssigneeId
            });

            if (selectedUser) {
                await conversation.update({
                    departmentId: assignedDepartment.id,
                    assignedTo: selectedUser.id,
                    assignedAt: new Date()
                });
                logger.info(`👤 Assigned to ${selectedUser.name} (${assignedDepartment.name})`);
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
    
    // اتصال کاربر به روم شخصی (استفاده از String برای سازگاری)
    if (socket.userId) socket.join('user_' + String(socket.userId));
    
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
            if (!conversation.customer) {
                return socket.emit('error', { message: 'Customer not found for this conversation' });
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
            
            const toPhone = getSendTarget(conversation.customer.phone) || conversation.customer.phone;
            if (rabbitChannel) {
                rabbitChannel.sendToQueue('outgoing_messages', Buffer.from(JSON.stringify({
                    to: toPhone, message: content, media: media, conversationId: conversation.id
                })), { persistent: true });
            } else {
                gatewayPost('/api/send-message', { to: toPhone, message: content, media: media || null }, { timeout: 10000 }).catch(err => logger.error('Gateway send error:', err.message));
            }
            
            // بروزرسانی مکالمه
            const now = new Date();
            const upd = { lastMessageAt: now, lastOutgoingMessageAt: now, unreadCount: 0, unansweredAlertSentAt: null, escalatedAt: null };
            if (!conversation.firstReplyAt) upd.firstReplyAt = now;
            await conversation.update(upd);
            
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
        io.to('user_' + String(toUserId)).emit('call_offer', { fromUserId: socket.userId, threadId, type: type || 'voice', sdp });
    });
    socket.on('call_answer', (data) => {
        const { toUserId, threadId, sdp } = data;
        if (!toUserId || !threadId || !sdp) return;
        if (callRooms[threadId]) callRooms[threadId].participants.add(String(socket.userId));
        io.to('user_' + String(toUserId)).emit('call_answer', { fromUserId: socket.userId, threadId, sdp });
    });
    socket.on('call_ice', (data) => {
        const { toUserId, threadId, candidate } = data;
        if (!toUserId || !threadId) return;
        io.to('user_' + String(toUserId)).emit('call_ice', { fromUserId: socket.userId, threadId, candidate });
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
        io.to('user_' + String(toUserId)).emit('call_reject', { fromUserId: socket.userId, threadId });
    });
    socket.on('call_invite', async (data) => {
        const { toUserId, threadId, type, participantIds } = data;
        if (!toUserId || !threadId) return;
        const room = callRooms[threadId];
        if (!room || !room.participants.has(String(socket.userId))) return;
        const fromUser = await User.findByPk(socket.userId, { attributes: ['name', 'email'] });
        const fromUserName = (fromUser && (fromUser.name || fromUser.email)) || '';
        io.to('user_' + String(toUserId)).emit('call_invite', { fromUserId: socket.userId, fromUserName, threadId, type: type || room.type, participantIds: participantIds || Array.from(room.participants) });
    });
    socket.on('call_invite_accept', (data) => {
        const { threadId, type } = data;
        if (!threadId) return;
        const room = callRooms[threadId];
        if (!room) return;
        const participants = Array.from(room.participants);
        room.participants.add(String(socket.userId));
        participants.forEach(uid => io.to(`user_${uid}`).emit('call_participant_joined', { userId: socket.userId, threadId }));
        io.to('user_' + String(socket.userId)).emit('call_room_info', { threadId, participantIds: participants, type: type || room.type });
    });
    socket.on('call_invite_reject', async (data) => {
        const { fromUserId, threadId } = data;
        if (!fromUserId || !threadId) return;
        const rejecter = await User.findByPk(socket.userId, { attributes: ['name', 'email'] });
        const userName = (rejecter && (rejecter.name || rejecter.email)) || '';
        io.to('user_' + String(fromUserId)).emit('call_invite_reject', { userId: socket.userId, userName, threadId });
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

const { authMiddleware, requireSection } = require('./middleware/auth');
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
    const defaultEmail = (process.env.MAIN_ADMIN_EMAIL || 'Admin@kaya.fxguard.io').split(',')[0].trim();
    const supportLink = supportUrl || (supportEmail ? 'mailto:' + supportEmail : 'mailto:' + defaultEmail);
    res.json({
        timezone: process.env.APP_TIMEZONE || 'Europe/Istanbul',
        supportUrl: supportLink
    });
});

// فرم تماس لندینگ — عمومی، بدون auth، rate limit جداگانه
apiRouter.post('/contact', contactLimiter, async (req, res) => {
    const { purpose, name, email, phone, message } = req.body || {};
    if (!email || !name || !message) {
        return res.status(400).json({ error: 'نام، ایمیل و پیام الزامی است.' });
    }
    const purposeVal = ['demo', 'purchase', 'quote', 'support', 'other'].includes(purpose) ? purpose : 'other';
    try {
        const emailService = require('./services/emailService');
        if (!emailService.isEnabled()) {
            logger.warn('Contact form: email disabled, skipping send');
            return res.json({ ok: true, message: 'پیام دریافت شد. به زودی با شما تماس می‌گیریم.' });
        }
        await emailService.sendContactForm({
            purpose: purposeVal,
            name: String(name).trim(),
            email: String(email).trim(),
            phone: phone ? String(phone).trim() : '',
            message: String(message).trim()
        });
        res.json({ ok: true, message: 'پیام ارسال شد. به زودی با شما تماس می‌گیریم.' });
    } catch (err) {
        logger.error('Contact form send error:', err);
        res.status(500).json({ error: 'خطا در ارسال پیام. لطفاً دوباره تلاش کنید یا از واتساپ استفاده کنید.' });
    }
});

const { gatewayGet, gatewayPost } = require('./lib/gatewayClient');
let gatewayProcess = null;

apiRouter.get('/gateway/status', authMiddleware, requireSection('whatsapp'), (req, res) => {
    gatewayGet('/api/status', { timeout: 5000 })
        .then(r => res.json(r.data))
        .catch((e) => {
            const status = e.response?.status;
            const msg = e.response?.data?.error || e.message || 'Gateway در دسترس نیست';
            if (status === 401) logger.warn('Gateway returned 401 – check GATEWAY_API_SECRET matches gateway/.env');
            else if (e.code) logger.warn('Gateway request failed', { code: e.code, status, url: process.env.GATEWAY_URL || 'http://localhost:3001' });
            return res.status(503).json({ whatsapp: false, status: 'disconnected', error: 'Gateway در دسترس نیست' });
        });
});

apiRouter.get('/gateway/qr', authMiddleware, requireSection('whatsapp'), (req, res) => {
    gatewayGet('/api/qr', { timeout: 5000 })
        .then(r => res.json(r.data))
        .catch((e) => {
            if (e.response?.status === 401) logger.warn('Gateway QR returned 401 – check GATEWAY_API_SECRET matches gateway/.env');
            return res.status(503).json({ error: 'Gateway در دسترس نیست' });
        });
});

// پراکسی شروع واتساپ به Gateway (وقتی Gateway در دسترس است)
apiRouter.post('/gateway/start', authMiddleware, requireSection('whatsapp'), (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'owner') return res.status(403).json({ error: 'فقط ادمین یا مالک' });
    gatewayPost('/api/start', {}, { timeout: 10000 })
        .then(r => res.json(r.data))
        .catch(e => res.status(503).json({ error: e.response?.data?.error || 'Gateway در دسترس نیست' }));
});

// قطع دستی اتصال واتساپ (بدون خروج از حساب)
apiRouter.post('/gateway/stop', authMiddleware, requireSection('whatsapp'), (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'owner') return res.status(403).json({ error: 'فقط ادمین یا مالک' });
    gatewayPost('/api/stop', {}, { timeout: 10000 })
        .then(r => res.json(r.data))
        .catch(e => res.status(503).json({ error: e.response?.data?.error || 'Gateway در دسترس نیست' }));
});

// خروج کامل از واتساپ و حذف سشن (برای اتصال شماره جدید)
apiRouter.post('/gateway/logout', authMiddleware, requireSection('whatsapp'), (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'owner') return res.status(403).json({ error: 'فقط ادمین یا مالک' });
    gatewayPost('/api/logout', {}, { timeout: 20000 })
        .then(r => res.json(r.data))
        .catch(e => res.status(503).json({ error: e.response?.data?.error || 'Gateway در دسترس نیست' }));
});

apiRouter.post('/admin/start-gateway', authMiddleware, requireSection('whatsapp'), async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'owner') return res.status(403).json({ error: 'فقط ادمین یا مالک' });
    if (gatewayProcess) return res.json({ message: 'Gateway از قبل در حال اجراست' });
    try {
        const GATEWAY_URL = (process.env.GATEWAY_URL || 'http://localhost:3001').replace(/\/$/, '');
        const axios = require('axios');
        const testRes = await axios.get(GATEWAY_URL + '/test', { timeout: 3000 }).catch(() => null);
        if (testRes && testRes.status === 200) {
            return res.json({ message: 'Gateway از قبل در حال اجراست' });
        }
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
apiRouter.use('/departments', authMiddleware, departmentRoutes);
apiRouter.use('/analytics', authMiddleware, analyticsRoutes);
apiRouter.use('/customers', authMiddleware, customerRoutes);
apiRouter.use('/tags', authMiddleware, require('./routes/tags'));
apiRouter.use('/message-templates', authMiddleware, require('./routes/templates'));
apiRouter.use('/bulk', authMiddleware, require('./routes/bulk'));
apiRouter.use('/customers/import', authMiddleware, require('./routes/customersImport'));
apiRouter.use('/tickets', authMiddleware, requireSection('tickets'), require('./routes/tickets')(io));
apiRouter.use('/branches', authMiddleware, branchRoutes);
apiRouter.use('/supervision', authMiddleware, supervisionRoutes);
apiRouter.use('/tasks', authMiddleware, requireSection('tasks'), taskRoutes);
apiRouter.use('/processes', authMiddleware, processRoutes);
apiRouter.use('/upload', authMiddleware, require('./routes/upload'));
apiRouter.use('/rates', authMiddleware, require('./routes/rates'));
apiRouter.use('/services', authMiddleware, require('./routes/services'));
apiRouter.use('/exchange', authMiddleware, require('./routes/exchange'));
apiRouter.use('/whatsapp', authMiddleware, require('./routes/whatsapp'));
const announcementRoutes = require('./routes/announcements');
const internalRoutes = require('./routes/internal');
apiRouter.use('/announcements', authMiddleware, requireSection('announcements'), announcementRoutes);
apiRouter.use('/internal', authMiddleware, requireSection('internal_chat'), internalRoutes(io));
apiRouter.use('/panel-settings', require('./routes/panelSettings'));
apiRouter.use('/company-emails', authMiddleware, require('./routes/companyEmails'));

// میان‌افزار احراز هویت webhook — فقط Gateway مجاز است
function webhookAuth(req, res, next) {
    const secret = process.env.WEBHOOK_SECRET;
    if (!secret) {
        logger.warn('⚠️ WEBHOOK_SECRET تنظیم نشده — webhook بدون احراز هویت در دسترس است');
        return next();
    }
    const provided = req.headers['x-webhook-secret'] || req.query.secret;
    if (!provided || provided !== secret) {
        logger.warn('Webhook auth failed — invalid secret', { ip: req.ip });
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

// وب‌هوک پیام ورودی واتساپ. بدنه: from/contact, body, timestamp, hasMedia, type؟, media؟
// رسانه: اگر media.url با http/https باشد → دانلود و ذخیره در uploads و mediaData.url نسبی؛ اگر media.data (base64) باشد → ذخیره در uploads و mediaData.url. نوع پیام از mimetype/filename استنتاج می‌شود.
apiRouter.post('/webhook/incoming-message', webhookAuth, (req, res) => {
    processIncomingMessage(req.body).then(() => res.json({ ok: true })).catch(err => {
        logger.error('Webhook process error:', err);
        res.status(500).json({ error: err.message });
    });
});

// وب‌هوک وضعیت پیام (ارسال/تحویل/خوانده) — از Gateway
apiRouter.post('/webhook/message-status', webhookAuth, async (req, res) => {
    try {
        const { messageId, status } = req.body || {};
        if (!messageId) return res.json({ ok: true });
        const statusMap = { server: 'sent', device: 'delivered', read: 'read', played: 'read', error: 'failed', pending: 'pending' };
        const dbStatus = statusMap[status] || null;
        if (!dbStatus) return res.json({ ok: true });
        const { Message } = require('./models');
        const [updated] = await Message.update(
            { status: dbStatus },
            { where: { whatsappId: messageId, direction: 'outgoing' } }
        );
        if (updated > 0) {
            const msg = await Message.findOne({ where: { whatsappId: messageId }, attributes: ['id', 'conversationId', 'status'] });
            if (msg) io.emit('message_status_updated', { messageId: msg.id, conversationId: msg.conversationId, status: msg.status });
        }
        res.json({ ok: true });
    } catch (err) {
        logger.error('Message status webhook error:', err);
        res.status(500).json({ error: err.message });
    }
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

// ساختار لینک‌ها: / → لندینگ مارکتینگ، /dashboard → پنل CRM
// app.fxguard.io فقط فرانت (لندینگ از public) — kaya.fxguard.io پنل CRM و / → /dashboard
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
        const { ensureDefaultDepartments } = require('./services/defaultDepartments');
        await ensureDefaultDepartments();
        await ensureAdminUser();
        await connectRabbitMQ();

        setInterval(checkUnansweredConversations, 60000);
        
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
process.on('SIGINT', async () => {
    logger.info('Shutting down gracefully...');
    await sequelize.close();
    if (mongoose.connection.readyState === 1) await mongoose.connection.close().catch(() => {});
    redisClient.quit().catch(() => {});
    process.exit(0);
});

module.exports = { io, rabbitChannel };

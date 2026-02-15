const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const amqp = require('amqplib');
const redis = require('redis');
const winston = require('winston');
const axios = require('axios');
require('dotenv').config();

// Import Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const conversationRoutes = require('./routes/conversations');
const messageRoutes = require('./routes/messages');
const departmentRoutes = require('./routes/departments');
const analyticsRoutes = require('./routes/analytics');
const bulkRoutes = require('./routes/bulk');
const customerRoutes = require('./routes/customers');
const ticketRoutes = require('./routes/tickets');
const branchRoutes = require('./routes/branches');
const supervisionRoutes = require('./routes/supervision');

// Database
const models = require('./models');
const { sequelize, Customer, Conversation, Message, User, Department, AutoResponse } = models;
const mongoose = require('mongoose');

// ==================== Express Setup ====================
const app = express();
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقیقه
    max: 100 // حداکثر 100 درخواست
});
app.use('/api/', limiter);

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

// ==================== Redis (optional when USE_SQLITE) ====================
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.on('error', () => {}); // suppress repeat logs
redisClient.connect().catch(() => { logger.warn('⚠️ Redis not available - continuing without cache'); });

// ==================== RabbitMQ ====================
let rabbitChannel;

async function connectRabbitMQ() {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
        rabbitChannel = await connection.createChannel();
        
        await rabbitChannel.assertQueue('whatsapp_messages', { durable: true });
        await rabbitChannel.assertQueue('outgoing_messages', { durable: true });
        
        logger.info('✅ Connected to RabbitMQ');
        
        // مصرف پیام‌های دریافتی از WhatsApp Gateway
        rabbitChannel.consume('whatsapp_messages', async (msg) => {
            if (msg) {
                const messageData = JSON.parse(msg.content.toString());
                await processIncomingMessage(messageData);
                rabbitChannel.ack(msg);
            }
        });
        
    } catch (error) {
        logger.warn('⚠️ RabbitMQ not available - continuing without queue');
        rabbitChannel = null;
        if (!process.env.USE_SQLITE) setTimeout(connectRabbitMQ, 5000);
    }
}

// ==================== Database Connections ====================
async function connectDatabases() {
    try {
        await sequelize.authenticate();
        await sequelize.sync({ alter: true });
        logger.info(process.env.USE_SQLITE ? '✅ SQLite Connected' : '✅ PostgreSQL Connected');
        
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

// ایجاد کاربر ادمین پیش‌فرض اگر وجود نداشته باشد
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
        const existing = await User.findOne({ where: { email: 'admin@company.com' } });
        if (!existing) {
            await User.create({
                name: 'مالک شرکت',
                email: 'admin@company.com',
                password: 'Admin@123',
                role: 'owner',
                branchId: null,
                departmentId: dept.id,
                isActive: true
            });
            logger.info('✅ کاربر مالک ایجاد شد: admin@company.com / Admin@123');
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

async function processIncomingMessage(messageData) {
    try {
        const { body, contact, from, timestamp, hasMedia, media } = messageData;
        const rawPhone = (contact && contact.number != null) ? contact.number : from;
        if (rawPhone == null || rawPhone === '') return;
        const phone = normalizePhone(rawPhone) || normalizePhone(from);
        if (!phone) return;
        
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
        await conversation.update({
            lastMessageAt: ts,
            unreadCount: (conversation.unreadCount || 0) + 1
        });
        
        const newMessage = await Message.create({
            conversationId: conversation.id,
            customerId: customer.id,
            whatsappId: messageData.id || null,
            direction: 'incoming',
            content: body || '',
            type: messageData.type || 'text',
            hasMedia: !!hasMedia,
            mediaData: media || null,
            timestamp: ts
        });
        
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
        
        const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:3001';
        if (rabbitChannel) {
            rabbitChannel.sendToQueue('outgoing_messages', Buffer.from(JSON.stringify({
                to: customer.phone, message: responseText, conversationId: conversation.id
            })), { persistent: true });
        } else {
            axios.post(gatewayUrl + '/api/send-message', { to: customer.phone, message: responseText }, { timeout: 10000 }).catch(err => logger.error('Gateway send error:', err.message));
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
        
        logger.info(`🤖 Auto-reply sent to ${customer.phone}`);
    } catch (error) {
        logger.error('Send auto-reply error:', error);
    }
}

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
            }
        }
        
    } catch (error) {
        logger.error('Auto-assignment error:', error);
    }
}

// ==================== Socket.IO ====================
const socketAuth = require('./middleware/socketAuth');

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
                include: ['customer']
            });
            
            if (!conversation) {
                return socket.emit('error', { message: 'Conversation not found' });
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
            
            const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:3001';
            if (rabbitChannel) {
                rabbitChannel.sendToQueue('outgoing_messages', Buffer.from(JSON.stringify({
                    to: conversation.customer.phone, message: content, media: media, conversationId: conversation.id
                })), { persistent: true });
            } else {
                axios.post(gatewayUrl + '/api/send-message', { to: conversation.customer.phone, message: content, media: media || null }, { timeout: 10000 }).catch(err => logger.error('Gateway send error:', err.message));
            }
            
            // بروزرسانی مکالمه
            await conversation.update({
                lastMessageAt: new Date(),
                unreadCount: 0
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
    
    socket.on('disconnect', () => {
        logger.info(`🔌 User disconnected: ${socket.userId}`);
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

const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:3001';
let gatewayProcess = null;

apiRouter.get('/gateway/status', authMiddleware, (req, res) => {
    axios.get(gatewayUrl + '/api/status', { timeout: 5000 })
        .then(r => res.json(r.data))
        .catch(() => res.status(503).json({ whatsapp: false, status: 'disconnected', error: 'Gateway در دسترس نیست' }));
});

apiRouter.get('/gateway/qr', authMiddleware, (req, res) => {
    axios.get(gatewayUrl + '/api/qr', { timeout: 5000 })
        .then(r => res.json(r.data))
        .catch(() => res.status(503).json({ error: 'Gateway در دسترس نیست' }));
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
apiRouter.use('/tickets', authMiddleware, ticketRoutes);
apiRouter.use('/branches', authMiddleware, branchRoutes);
apiRouter.use('/supervision', authMiddleware, supervisionRoutes);
const announcementRoutes = require('./routes/announcements');
const internalRoutes = require('./routes/internal');
apiRouter.use('/announcements', authMiddleware, announcementRoutes);
apiRouter.use('/internal', authMiddleware, internalRoutes);

// پروکسی قیمت ارز و طلا از نوسان (نوسان دات نت) — برای نوار قیمت داشبورد
const NAVASAN_API_KEY = process.env.NAVASAN_API_KEY || 'premVIlUQHLNK4IGQzHnZNZyHCbJrknc';
const NAVASAN_LATEST = `http://api.navasan.tech/latest/?api_key=${NAVASAN_API_KEY}`;
// ارزهای مهم برای صرافی با دفاتر ایران، روسیه، دبی، استانبول، آذربایجان، چین
const RATES_KEYS = [
    { key: 'usd', label: 'دلار', apiKeys: ['usd_sell', 'usd_buy'] },
    { key: 'eur', label: 'یورو', apiKeys: ['eur', 'mex_eur_sell'] },
    { key: 'gbp', label: 'پوند', apiKeys: ['gbp', 'gbp_hav'] },
    { key: 'try', label: 'لیر ترکیه', apiKeys: ['try', 'try_hav'] },
    { key: 'aed', label: 'درهم امارات', apiKeys: ['aed_sell', 'dirham_dubai'] },
    { key: 'rub', label: 'روبل روسیه', apiKeys: ['rub'] },
    { key: 'azn', label: 'منات آذربایجان', apiKeys: ['azn'] },
    { key: 'cny', label: 'یوان چین', apiKeys: ['cny', 'cny_hav'] },
    { key: 'gold', label: 'طلا (گرم)', apiKeys: ['18ayar'] }
];
apiRouter.get('/rates', authMiddleware, (req, res) => {
    axios.get(NAVASAN_LATEST, { timeout: 8000 })
        .then(r => {
            const raw = r.data || {};
            const pick = (keys) => {
                for (const k of keys) {
                    const v = raw[k] && raw[k].value != null ? { value: raw[k].value, change: raw[k].change } : null;
                    if (v) return v;
                }
                return { value: '—', change: null };
            };
            const items = RATES_KEYS.map(({ key, label, apiKeys }) => ({ key, label, ...pick(apiKeys) }));
            res.json({
                items,
                updatedAt: raw.usd_sell && raw.usd_sell.date ? raw.usd_sell.date : new Date().toISOString()
            });
        })
        .catch(err => {
            logger.warn('Rates fetch failed:', err.message);
            res.status(502).json({
                error: 'دریافت قیمت‌ها ناموفق بود',
                items: RATES_KEYS.map(({ key, label }) => ({ key, label, value: '—', change: null }))
            });
        });
});

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

// فایل استاتیک و داشبورد فقط برای مسیرهای غیر از /api
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.redirect('/dashboard.html'));

// Error handling
app.use((err, req, res, next) => {
    logger.error('Server error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ==================== Server Startup ====================
async function startServer() {
    try {
        await connectDatabases();
        await ensureAdminUser();
        await connectRabbitMQ();
        
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

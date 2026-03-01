/**
 * مسیریابی API — همه endpointهای /api
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const rateLimit = require('express-rate-limit');
const { gatewayGet, gatewayPost } = require('../lib/gatewayClient');
const { authMiddleware, requireSection } = require('../middleware/auth');
const { createWebhookAuth } = require('../middleware/webhookAuth');
const { processIncomingMessage } = require('../services/incomingMessage');
const models = require('../models');
const { Message } = models;

const authRoutes = require('./auth');
const userRoutes = require('./users');
const conversationRoutes = require('./conversations');
const departmentRoutes = require('./departments');
const analyticsRoutes = require('./analytics');
const customerRoutes = require('./customers');
const branchRoutes = require('./branches');
const supervisionRoutes = require('./supervision');
const taskRoutes = require('./tasks');
const processRoutes = require('./processes');

const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'تعداد ارسال فرم زیاد است. چند دقیقه صبر کنید.' },
    standardHeaders: true,
    legacyHeaders: false
});

function createApiRouter(io, getRabbitChannel, redisClient, logger) {
    const apiRouter = express.Router();
    const webhookAuth = createWebhookAuth(logger);

    apiRouter.use((req, res, next) => {
        res.setHeader('Content-Type', 'application/json');
        next();
    });

    apiRouter.get('/ping', (req, res) => {
        res.json({ ok: true, message: 'API در دسترس است' });
    });

    apiRouter.get('/config', (req, res) => {
        const supportUrl = process.env.SUPPORT_URL || null;
        const supportEmail = process.env.SUPPORT_EMAIL || null;
        const supportLink = supportUrl || (supportEmail ? 'mailto:' + supportEmail : null);
        res.json({
            timezone: process.env.APP_TIMEZONE || 'Europe/Istanbul',
            supportUrl: supportLink
        });
    });

    apiRouter.post('/contact', contactLimiter, async (req, res) => {
        const { purpose, name, email, phone, message } = req.body || {};
        if (!email || !name || !message) {
            return res.status(400).json({ error: 'نام، ایمیل و پیام الزامی است.' });
        }
        const nameStr = String(name).trim();
        const emailStr = String(email).trim();
        const messageStr = String(message).trim();
        if (nameStr.length > 200) return res.status(400).json({ error: 'نام بیش از حد مجاز است.' });
        if (emailStr.length > 255) return res.status(400).json({ error: 'ایمیل نامعتبر است.' });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) return res.status(400).json({ error: 'فرمت ایمیل نامعتبر است.' });
        if (messageStr.length > 5000) return res.status(400).json({ error: 'پیام بیش از حد مجاز است.' });
        const purposeVal = ['demo', 'purchase', 'quote', 'support', 'other'].includes(purpose) ? purpose : 'other';
        try {
            const emailService = require('../services/emailService');
            if (!emailService.isEnabled()) {
                logger.warn('Contact form: email disabled, skipping send');
                return res.json({ ok: true, message: 'پیام دریافت شد. به زودی با شما تماس می‌گیریم.' });
            }
            await emailService.sendContactForm({
                purpose: purposeVal,
                name: nameStr,
                email: emailStr,
                phone: phone ? String(phone).trim().slice(0, 50) : '',
                message: messageStr
            });
            res.json({ ok: true, message: 'پیام ارسال شد. به زودی با شما تماس می‌گیریم.' });
        } catch (err) {
            logger.error('Contact form send error:', err);
            res.status(500).json({ error: 'خطا در ارسال پیام. لطفاً دوباره تلاش کنید یا از واتساپ استفاده کنید.' });
        }
    });

    let gatewayStarting = false;
    let gatewayStartedAt = null;
    const GATEWAY_START_COOLDOWN_MS = 15000;

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

    apiRouter.post('/gateway/start', authMiddleware, requireSection('whatsapp'), (req, res) => {
        if (req.user.role !== 'admin' && req.user.role !== 'owner') return res.status(403).json({ error: 'فقط ادمین یا مالک' });
        gatewayPost('/api/start', {}, { timeout: 10000 })
            .then(r => res.json(r.data))
            .catch(e => res.status(503).json({ error: e.response?.data?.error || 'Gateway در دسترس نیست' }));
    });

    apiRouter.post('/gateway/stop', authMiddleware, requireSection('whatsapp'), (req, res) => {
        if (req.user.role !== 'admin' && req.user.role !== 'owner') return res.status(403).json({ error: 'فقط ادمین یا مالک' });
        gatewayPost('/api/stop', {}, { timeout: 10000 })
            .then(r => res.json(r.data))
            .catch(e => res.status(503).json({ error: e.response?.data?.error || 'Gateway در دسترس نیست' }));
    });

    apiRouter.post('/gateway/logout', authMiddleware, requireSection('whatsapp'), (req, res) => {
        if (req.user.role !== 'admin' && req.user.role !== 'owner') return res.status(403).json({ error: 'فقط ادمین یا مالک' });
        gatewayPost('/api/logout', {}, { timeout: 20000 })
            .then(r => res.json(r.data))
            .catch(e => res.status(503).json({ error: e.response?.data?.error || 'Gateway در دسترس نیست' }));
    });

    apiRouter.post('/admin/start-gateway', authMiddleware, requireSection('whatsapp'), async (req, res) => {
        if (req.user.role !== 'admin' && req.user.role !== 'owner') return res.status(403).json({ error: 'فقط ادمین یا مالک' });
        const now = Date.now();
        if (gatewayStarting && gatewayStartedAt && (now - gatewayStartedAt) < GATEWAY_START_COOLDOWN_MS) {
            return res.json({ message: 'Gateway در حال بالا آمدن است. چند ثانیه صبر کنید.' });
        }
        try {
            const GATEWAY_URL = (process.env.GATEWAY_URL || 'http://localhost:3001').replace(/\/$/, '');
            const axios = require('axios');
            const testRes = await axios.get(GATEWAY_URL + '/api/status', { timeout: 3000 }).catch(() => null);
            if (testRes && testRes.status === 200) {
                return res.json({ message: 'Gateway از قبل در حال اجراست' });
            }
            const gatewayPath = path.join(__dirname, '..', '..', 'gateway');
            const entryPoint = path.join(gatewayPath, 'src', 'index.js');
            if (!fs.existsSync(entryPoint)) {
                return res.status(500).json({ error: 'فایل gateway/src/index.js یافت نشد. Gateway را نصب کنید.' });
            }
            const proc = spawn('node', ['src/index.js'], { cwd: gatewayPath, stdio: 'ignore', detached: true });
            proc.unref();
            gatewayStarting = true;
            gatewayStartedAt = now;
            setTimeout(() => { gatewayStarting = false; gatewayStartedAt = null; }, GATEWAY_START_COOLDOWN_MS);
            res.json({ message: 'Gateway در حال بالا آمدن است. چند ثانیه صبر کنید و QR را در تنظیمات واتساپ ببینید.' });
        } catch (e) {
            gatewayStarting = false;
            res.status(500).json({ error: e.message });
        }
    });

    apiRouter.use('/auth', authRoutes);
    apiRouter.use('/users', authMiddleware, userRoutes);
    apiRouter.use('/conversations', authMiddleware, conversationRoutes);
    apiRouter.use('/departments', authMiddleware, departmentRoutes);
    apiRouter.use('/analytics', authMiddleware, analyticsRoutes);
    apiRouter.use('/customers', authMiddleware, customerRoutes);
    apiRouter.use('/tags', authMiddleware, require('./tags'));
    apiRouter.use('/message-templates', authMiddleware, require('./templates'));
    apiRouter.use('/file-templates', authMiddleware, require('./fileTemplates'));
    apiRouter.use('/bulk', authMiddleware, require('./bulk'));
    apiRouter.use('/customers/import', authMiddleware, require('./customersImport'));
    apiRouter.use('/tickets', authMiddleware, requireSection('tickets'), require('./tickets')(io));
    apiRouter.use('/branches', authMiddleware, branchRoutes);
    apiRouter.use('/supervision', authMiddleware, supervisionRoutes);
    apiRouter.use('/tasks', authMiddleware, requireSection('tasks'), taskRoutes);
    apiRouter.use('/processes', authMiddleware, processRoutes);
    apiRouter.use('/upload', authMiddleware, require('./upload'));
    apiRouter.use('/rates', authMiddleware, require('./rates'));
    apiRouter.use('/services', authMiddleware, require('./services'));
    apiRouter.use('/exchange', authMiddleware, require('./exchange'));
    apiRouter.use('/whatsapp', authMiddleware, require('./whatsapp'));
    apiRouter.use('/announcements', authMiddleware, requireSection('announcements'), require('./announcements'));
    apiRouter.use('/internal', authMiddleware, requireSection('internal_chat'), require('./internal')(io));
    apiRouter.use('/panel-settings', require('./panelSettings'));
    apiRouter.use('/company-emails', authMiddleware, require('./companyEmails'));

    apiRouter.post('/webhook/incoming-message', webhookAuth, express.json({ limit: '20mb' }), (req, res) => {
        const body = req.body;
        if (!body || typeof body !== 'object') {
            return res.status(400).json({ error: 'Invalid payload' });
        }
        if (body.from !== undefined && typeof body.from !== 'string') {
            return res.status(400).json({ error: 'Invalid payload: from must be string' });
        }
        const rabbitChannel = typeof getRabbitChannel === 'function' ? getRabbitChannel() : getRabbitChannel;
        processIncomingMessage(body, { io, rabbitChannel, redisClient, logger })
            .then(() => res.json({ ok: true }))
            .catch(err => {
                logger.error('Webhook process error:', err);
                res.status(500).json({ error: 'Internal server error' });
            });
    });

    apiRouter.post('/webhook/message-status', webhookAuth, async (req, res) => {
        try {
            const { messageId, status } = req.body || {};
            if (!messageId) return res.json({ ok: true });
            const statusMap = { server: 'sent', device: 'delivered', read: 'read', played: 'read', error: 'failed', pending: 'pending' };
            const dbStatus = statusMap[status] || null;
            if (!dbStatus) return res.json({ ok: true });
            const [updated] = await Message.update(
                { status: dbStatus },
                { where: { whatsappId: messageId, direction: 'outgoing' } }
            );
            if (updated > 0) {
                const msg = await Message.findOne({ where: { whatsappId: messageId }, attributes: ['id', 'conversationId', 'status'] });
                if (msg) {
                    io.to(`conversation_${msg.conversationId}`).emit('message_status_updated', { messageId: msg.id, conversationId: msg.conversationId, status: msg.status });
                }
            }
            res.json({ ok: true });
        } catch (err) {
            logger.error('Message status webhook error:', err);
            res.status(500).json({ error: err.message });
        }
    });

    apiRouter.use((req, res) => {
        res.status(404).json({ error: 'مسیر API یافت نشد', path: req.path });
    });

    return apiRouter;
}

module.exports = { createApiRouter };

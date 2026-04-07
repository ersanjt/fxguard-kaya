/**
 * API Router — aggregates all /api endpoints
 */
const express = require('express');
const { authMiddleware, requireSection } = require('../middleware/auth');
const { createWebhookAuth } = require('../middleware/webhookAuth');
const { processIncomingMessage } = require('../services/incomingMessage');
const { transformCloudWebhookToInternal, downloadMedia, isConfigured: isCloudApiConfigured } = require('../lib/whatsappCloudApi');
const { getCloudVerifyToken } = require('../lib/whatsappConnectionLoader');
const models = require('../models');
const { Message } = models;
const { createContactRouter } = require('./contact');
const { createGatewayRouter } = require('./gateway');
const { sendAdminSecurityAlert } = require('../services/adminAlertService');
const { notifySystemEvent } = require('../services/systemEventNotifier');
const { isDemoModeEnabled, getDemoUsername } = require('../lib/demoAuth');

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

function createApiRouter(io, getRabbitChannel, redisClient, logger) {
    const apiRouter = express.Router();
    const webhookAuth = createWebhookAuth(logger);
    const { router: gatewayRouter } = createGatewayRouter(logger);

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
        const demoMode = isDemoModeEnabled();
        res.json({
            timezone: process.env.APP_TIMEZONE || 'Europe/Istanbul',
            supportUrl: supportLink,
            demoMode,
            demoUsername: demoMode ? getDemoUsername() : null,
            demoPassword: demoMode ? (process.env.DEMO_PASSWORD || '123456') : null,
            salesUrl: process.env.SALES_URL || 'https://fxguard.io',
        });
    });

    // گزارش خطاهای فرانت‌اند (landing/dashboard)
    apiRouter.post('/client-errors', async (req, res) => {
        try {
            const body = req.body || {};
            const message = (body.message || '').toString().trim();
            if (!message) return res.status(400).json({ error: 'message is required' });
            const pageUrl = (body.pageUrl || '').toString().slice(0, 500);
            const source = (body.source || '').toString().slice(0, 500);
            const stack = (body.stack || '').toString().slice(0, 3000);
            const eventType = (body.eventType || 'error').toString().slice(0, 80);
            const clientIp = (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();
            const ua = (req.get && req.get('user-agent')) || null;

            await sendAdminSecurityAlert('frontend_error', {
                ip: clientIp,
                userAgent: ua,
                pageUrl,
                path: source || pageUrl,
                errorMessage: `${eventType}: ${message}${stack ? '\n' + stack : ''}`
            });
            await notifySystemEvent('error', 'Frontend Error Reported', {
                eventType,
                pageUrl: source || pageUrl,
                ip: clientIp
            });
            return res.json({ ok: true });
        } catch (_) {
            return res.json({ ok: true });
        }
    });

    apiRouter.use('/', createContactRouter(logger));
    apiRouter.use('/', gatewayRouter);

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

    // بدنه با express.json در server.js (WEBHOOK_BODY_LIMIT، پیش‌فرض 25mb) پارس شده
    apiRouter.post('/webhook/incoming-message', webhookAuth, (req, res) => {
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

    // WhatsApp Cloud API — verification (Meta)
    apiRouter.get('/webhook/whatsapp-cloud', async (req, res) => {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];
        const expectedToken = (await getCloudVerifyToken()).trim();
        if (mode === 'subscribe' && expectedToken && token === expectedToken) {
            return res.type('text/plain').send(challenge || '');
        }
        res.status(403).send('Verification failed');
    });

    // WhatsApp Cloud API — incoming messages from Meta
    apiRouter.post('/webhook/whatsapp-cloud', express.json({ limit: '1mb' }), async (req, res) => {
        try {
            if (!(await isCloudApiConfigured())) return res.status(404).send('Cloud API not configured');
            const body = req.body;
            if (!body || body.object !== 'whatsapp_business_account') return res.status(200).send('ok');
            const entries = body.entry || [];
            for (const entry of entries) {
                const internalMessages = transformCloudWebhookToInternal(entry);
                for (const msgData of internalMessages) {
                    if (msgData._cloudMediaId) {
                        try {
                            const downloaded = await downloadMedia(msgData._cloudMediaId);
                            msgData.media = { data: downloaded.data, mimetype: downloaded.mimetype };
                        } catch (dlErr) {
                            logger.warn('Cloud API media download failed', { mediaId: msgData._cloudMediaId, error: dlErr?.message });
                        }
                        delete msgData._cloudMediaId;
                    }
                    const rabbitChannel = typeof getRabbitChannel === 'function' ? getRabbitChannel() : getRabbitChannel;
                    await processIncomingMessage(msgData, { io, rabbitChannel, redisClient, logger }).catch(err => logger.error('Cloud webhook process error:', err));
                }
            }
            res.status(200).send('ok');
        } catch (err) {
            logger.error('Cloud webhook error:', err);
            res.status(200).send('ok');
        }
    });

    // اطلاع‌رسانی از gateway هنگام قطع/وصل واتساپ → هشدار تلگرام به ادمین
    apiRouter.post('/webhook/gateway-status', webhookAuth, express.json({ limit: '32kb' }), async (req, res) => {
        try {
            const { event, reason } = req.body || {};
            if (event === 'disconnected') {
                const msg = reason === 'logged_out'
                    ? '❌ واتساپ Logout شد — سشن منقضی. وارد داشبورد شوید و QR جدید را اسکن کنید.'
                    : `⚠️ واتساپ قطع شد (دلیل: ${reason || 'نامشخص'}). اتصال مجدد خودکار در حال اجرا.`;
                notifySystemEvent('system', '🔌 WhatsApp Gateway Disconnected', {
                    reason: reason || 'unknown',
                    action: reason === 'logged_out' ? 'scan_new_qr' : 'auto_reconnect',
                    message: msg,
                }).catch(() => {});
                logger.warn('Gateway status webhook: disconnected', { reason });
            }
            res.json({ ok: true });
        } catch (e) {
            res.json({ ok: true });
        }
    });

    // بدنهٔ JSON؛ مسیرهای /webhook از json سراسری معافند
    apiRouter.post('/webhook/message-status', webhookAuth, express.json({ limit: '512kb' }), async (req, res, next) => {
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
            next(err);
        }
    });

    apiRouter.use((req, res) => {
        res.status(404).json({ error: 'مسیر API یافت نشد', path: req.path });
    });

    return apiRouter;
}

module.exports = { createApiRouter };

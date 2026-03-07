/**
 * API Router — aggregates all /api endpoints
 */
const express = require('express');
const { authMiddleware, requireSection } = require('../middleware/auth');
const { createWebhookAuth } = require('../middleware/webhookAuth');
const { processIncomingMessage } = require('../services/incomingMessage');
const models = require('../models');
const { Message } = models;
const { createContactRouter } = require('./contact');
const { createGatewayRouter } = require('./gateway');

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
        res.json({
            timezone: process.env.APP_TIMEZONE || 'Europe/Istanbul',
            supportUrl: supportLink,
        });
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

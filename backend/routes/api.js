/**
 * API Router — aggregates all /api endpoints
 */
const express = require('express');
const crypto = require('crypto');
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
const { getPanelSettings } = require('../services/panelSettingsLoader');
const { isDemoModeEnabled, getDemoUsername, isPublicAppRequest } = require('../lib/demoAuth');
const { publicDemoReadStub } = require('../middleware/publicDemoReadStub');

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
const tagsRoutes = require('./tags');
const templatesRoutes = require('./templates');
const fileTemplatesRoutes = require('./fileTemplates');
const bulkRoutes = require('./bulk');
const customersImportRoutes = require('./customersImport');
const createTicketsRouter = require('./tickets');
const uploadRoutes = require('./upload');
const ratesRoutes = require('./rates');
const servicesRoutes = require('./services');
const exchangeRoutes = require('./exchange');
const whatsappRoutes = require('./whatsapp');
const announcementsRoutes = require('./announcements');
const createInternalRouter = require('./internal');
const companyEmailsRoutes = require('./companyEmails');
const panelSettingsRoutes = require('./panelSettings');
const { getProfileImage } = require('./profileImage');

function getCloudWebhookAppSecret() {
    return String(process.env.WHATSAPP_CLOUD_APP_SECRET || '').trim();
}

function extractMetaSignature(req) {
    const signature = req.get('x-hub-signature-256') || req.get('X-Hub-Signature-256') || '';
    return String(signature).trim();
}

function isValidMetaSignature(req) {
    const appSecret = getCloudWebhookAppSecret();
    if (!appSecret || !req.rawBody || !Buffer.isBuffer(req.rawBody)) return false;

    const received = extractMetaSignature(req);
    if (!received || !received.startsWith('sha256=')) return false;

    const expectedHex = crypto.createHmac('sha256', appSecret).update(req.rawBody).digest('hex');
    const expected = Buffer.from(`sha256=${expectedHex}`, 'utf8');
    const actual = Buffer.from(received, 'utf8');
    if (expected.length !== actual.length) return false;
    return crypto.timingSafeEqual(expected, actual);
}

function createApiRouter(io, getRabbitChannel, redisClient, logger) {
    const apiRouter = express.Router();
    const webhookAuth = createWebhookAuth(logger);
    const { router: gatewayRouter } = createGatewayRouter(logger);

    apiRouter.use((req, res, next) => {
        if (req.method === 'GET' && req.path === '/profile-image') return next();
        res.setHeader('Content-Type', 'application/json');
        next();
    });

    apiRouter.get('/ping', (req, res) => {
        res.json({ ok: true, message: 'API در دسترس است' });
    });

    apiRouter.get('/profile-image', authMiddleware, getProfileImage);

    /**
     * پایهٔ https عمومی برای ساخت URL APK وقتی BACKEND_PUBLIC_URL در .env نیست یا http است.
     * (پشت nginx معمولاً X-Forwarded-Proto / Host ست است؛ server.js: trust proxy)
     */
    function httpsPublicBaseFromReq(req) {
        if (!req || typeof req.get !== 'function') return null;
        const host = (req.get('x-forwarded-host') || req.get('host') || '')
            .toString()
            .split(',')[0]
            .trim()
            .replace(/\/$/, '')
            .replace(/^https?:\/\//i, '');
        if (!host) return null;
        const xfProto = (req.get('x-forwarded-proto') || '').toString().split(',')[0].trim().toLowerCase();
        const isHttps = xfProto === 'https' || req.secure === true;
        if (!isHttps) return null;
        return `https://${host}`;
    }

    function resolveAndroidApkUrl(raw, req) {
        const u = String(raw || '').trim();
        if (!u) return null;
        if (/^https:\/\//i.test(u)) return u.slice(0, 2048);
        /* مسیر نسبی روی همین بک‌اند — ترجیح با BACKEND_PUBLIC_URL=https، وگرنا از Host درخواست */
        if (u.startsWith('/uploads/')) {
            let base = String(process.env.BACKEND_PUBLIC_URL || '').trim().replace(/\/$/, '');
            if (!/^https:\/\//i.test(base)) {
                base = httpsPublicBaseFromReq(req) || '';
            }
            if (!/^https:\/\//i.test(base)) return null;
            const path = u.startsWith('/') ? u : '/' + u;
            return (base + path).slice(0, 2048);
        }
        return null;
    }

    function parseAndroidAppUpdate(req) {
        const code = parseInt(String(process.env.ANDROID_APP_VERSION_CODE || '').trim(), 10);
        const rawUrl = String(process.env.ANDROID_APP_APK_URL || '').trim();
        const name = String(process.env.ANDROID_APP_VERSION_NAME || '').trim();
        const apkUrl = resolveAndroidApkUrl(rawUrl, req);
        if (!Number.isFinite(code) || code < 1 || !apkUrl || !name) return null;
        const notes = String(process.env.ANDROID_APP_RELEASE_NOTES || '').trim().slice(0, 4000);
        const mandatory = process.env.ANDROID_APP_UPDATE_MANDATORY === 'true' || process.env.ANDROID_APP_UPDATE_MANDATORY === '1';
        return {
            versionCode: code,
            versionName: name,
            apkUrl,
            releaseNotes: notes || null,
            mandatory
        };
    }

    apiRouter.get('/config', (req, res) => {
        const supportUrl = process.env.SUPPORT_URL || null;
        const supportEmail = process.env.SUPPORT_EMAIL || null;
        const supportLink = supportUrl || (supportEmail ? 'mailto:' + supportEmail : null);
        const isPublicApp = isPublicAppRequest(req);
        const demoMode = isDemoModeEnabled() && isPublicApp;
        const fxguardPublicSite = isPublicApp;
        const androidAppUpdate = parseAndroidAppUpdate(req);
        res.json({
            timezone: process.env.APP_TIMEZONE || 'Europe/Istanbul',
            supportUrl: supportLink,
            demoMode,
            demoUsername: demoMode ? getDemoUsername() : null,
            demoPassword: demoMode ? (process.env.DEMO_PASSWORD || '123456') : null,
            salesUrl: process.env.SALES_URL || 'https://kaya.fxguard.io',
            fxguardPublicSite,
            androidAppUpdate
        });
    });

    // گزارش خطاهای فرانت‌اند (landing/dashboard)
    apiRouter.post('/client-errors', async (req, res) => {
        try {
            if (isDemoModeEnabled() && isPublicAppRequest(req)) {
                return res.json({ ok: true, ignored: true });
            }
            const body = req.body || {};
            const message = (body.message || '').toString().trim();
            if (!message) return res.status(400).json({ error: 'message is required' });
            const pageUrl = (body.pageUrl || '').toString().slice(0, 500);
            const source = (body.source || '').toString().slice(0, 500);
            const stack = (body.stack || '').toString().slice(0, 3000);
            const eventType = (body.eventType || 'error').toString().slice(0, 80);
            const clientIp = (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();
            const ua = (req.get && req.get('user-agent')) || null;

            const panelSettings = await getPanelSettings();
            await sendAdminSecurityAlert(
                'frontend_error',
                {
                    ip: clientIp,
                    userAgent: ua,
                    pageUrl,
                    path: source || pageUrl,
                    errorMessage: `${eventType}: ${message}${stack ? '\n' + stack : ''}`
                },
                { settings: panelSettings }
            );
            return res.json({ ok: true });
        } catch (_) {
            return res.json({ ok: true });
        }
    });

    apiRouter.use('/', createContactRouter(logger));
    apiRouter.use('/', gatewayRouter);

    apiRouter.use('/auth', authRoutes);
    apiRouter.use('/users', authMiddleware, publicDemoReadStub, userRoutes);
    apiRouter.use('/conversations', authMiddleware, publicDemoReadStub, conversationRoutes);
    apiRouter.use('/departments', authMiddleware, publicDemoReadStub, departmentRoutes);
    apiRouter.use('/analytics', authMiddleware, publicDemoReadStub, analyticsRoutes);
    apiRouter.use('/customers', authMiddleware, publicDemoReadStub, customerRoutes);
    apiRouter.use('/tags', authMiddleware, publicDemoReadStub, tagsRoutes);
    apiRouter.use('/message-templates', authMiddleware, publicDemoReadStub, templatesRoutes);
    apiRouter.use('/file-templates', authMiddleware, publicDemoReadStub, fileTemplatesRoutes);
    apiRouter.use('/bulk', authMiddleware, publicDemoReadStub, bulkRoutes);
    apiRouter.use('/customers/import', authMiddleware, publicDemoReadStub, customersImportRoutes);
    apiRouter.use('/tickets', authMiddleware, requireSection('tickets'), publicDemoReadStub, createTicketsRouter(io));
    apiRouter.use('/branches', authMiddleware, publicDemoReadStub, branchRoutes);
    apiRouter.use('/supervision', authMiddleware, publicDemoReadStub, supervisionRoutes);
    apiRouter.use('/tasks', authMiddleware, requireSection('tasks'), publicDemoReadStub, taskRoutes);
    apiRouter.use('/processes', authMiddleware, publicDemoReadStub, processRoutes);
    apiRouter.use('/upload', authMiddleware, publicDemoReadStub, uploadRoutes);
    apiRouter.use('/rates', authMiddleware, publicDemoReadStub, ratesRoutes);
    apiRouter.use('/services', authMiddleware, publicDemoReadStub, servicesRoutes);
    apiRouter.use('/exchange', authMiddleware, publicDemoReadStub, exchangeRoutes);
    apiRouter.use('/whatsapp', authMiddleware, publicDemoReadStub, whatsappRoutes);
    apiRouter.use('/announcements', authMiddleware, requireSection('announcements'), publicDemoReadStub, announcementsRoutes);
    apiRouter.use('/internal', authMiddleware, requireSection('internal_chat'), publicDemoReadStub, createInternalRouter(io));
    apiRouter.use('/panel-settings', panelSettingsRoutes);
    apiRouter.use('/company-emails', authMiddleware, publicDemoReadStub, companyEmailsRoutes);

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
    apiRouter.post('/webhook/whatsapp-cloud', express.json({
        limit: '1mb',
        verify: (req, _res, buf) => {
            req.rawBody = Buffer.from(buf);
        }
    }), async (req, res) => {
        try {
            if (!(await isCloudApiConfigured())) return res.status(404).send('Cloud API not configured');
            if (!getCloudWebhookAppSecret()) {
                logger.error('Cloud webhook rejected: WHATSAPP_CLOUD_APP_SECRET is not configured');
                return res.status(503).send('Webhook secret is not configured');
            }
            if (!isValidMetaSignature(req)) {
                logger.warn('Cloud webhook rejected: invalid Meta signature');
                return res.status(401).send('Invalid signature');
            }
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

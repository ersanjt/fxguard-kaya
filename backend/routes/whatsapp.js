const express = require('express');
const router = express.Router();
const { WhatsappConfig, WhatsappConnection } = require('../models');
const { invalidateCache } = require('../lib/whatsappConnectionLoader');
const { isValidUUID } = require('../lib/validation');
const { clearOpenAIApiKeyCache } = require('../lib/getOpenAIApiKey');
const { buildWhatsappOverview } = require('../lib/whatsappOverview');

router.get('/config', async (req, res, next) => {
    try {
        if (!req.canAccess('whatsapp')) return res.status(403).json({ error: 'دسترسی به بخش واتساپ ندارید' });
        const [cfg] = await WhatsappConfig.findOrCreate({
            where: { id: 'default' },
            defaults: { welcomeMessage: null, welcomeEnabled: true, alertUnansweredAfterMinutes: 5, escalateUnansweredAfterMinutes: 15, aiAnswerEnabled: true }
        });
        res.json({
            welcomeMessage: cfg.welcomeMessage || '',
            welcomeEnabled: cfg.welcomeEnabled !== false,
            alertUnansweredAfterMinutes: cfg.alertUnansweredAfterMinutes ?? 5,
            escalateUnansweredAfterMinutes: cfg.escalateUnansweredAfterMinutes ?? 15,
            escalationDepartmentId: cfg.escalationDepartmentId || null,
            aiAnswerEnabled: cfg.aiAnswerEnabled !== false,
            openaiApiKeySet: !!(cfg.openaiApiKey && String(cfg.openaiApiKey).trim().length > 10),
            deptAssignedMessage: cfg.deptAssignedMessage ?? '',
            employeeIntroMessage: cfg.employeeIntroMessage ?? '',
            conversationEndedMessage: cfg.conversationEndedMessage ?? '',
            callIntroMessage: cfg.callIntroMessage ?? '',
            autoAssignmentMessagesEnabled: cfg.autoAssignmentMessagesEnabled !== false
        });
    } catch (err) {
        if (/no such column|SQLITE_ERROR|column.*does not exist/i.test(err.message)) {
            return res.json({
                welcomeMessage: '',
                welcomeEnabled: true,
                alertUnansweredAfterMinutes: 5,
                escalateUnansweredAfterMinutes: 15,
                escalationDepartmentId: null,
                aiAnswerEnabled: true,
                openaiApiKeySet: false,
                deptAssignedMessage: '',
                employeeIntroMessage: '',
                conversationEndedMessage: '',
                autoAssignmentMessagesEnabled: true
            });
        }
        next(err);
    }
});

router.put('/config', async (req, res, next) => {
    try {
        if (!req.canAccess('whatsapp')) return res.status(403).json({ error: 'دسترسی به بخش واتساپ ندارید' });
        const { welcomeMessage, welcomeEnabled, alertUnansweredAfterMinutes, escalateUnansweredAfterMinutes, escalationDepartmentId, aiAnswerEnabled, openaiApiKey, deptAssignedMessage, employeeIntroMessage, conversationEndedMessage, callIntroMessage, autoAssignmentMessagesEnabled } = req.body || {};
        const [cfg] = await WhatsappConfig.findOrCreate({
            where: { id: 'default' },
            defaults: { welcomeMessage: null, welcomeEnabled: true, alertUnansweredAfterMinutes: 5, escalateUnansweredAfterMinutes: 15, aiAnswerEnabled: true }
        });
        if (welcomeMessage !== undefined) {
            const msg = String(welcomeMessage || '').trim();
            if (msg.length > 1000) return res.status(400).json({ error: 'پیام خوش‌آمدگویی بیش از ۱,۰۰۰ کاراکتر مجاز نیست' });
            cfg.welcomeMessage = msg || null;
        }
        if (welcomeEnabled !== undefined) cfg.welcomeEnabled = !!welcomeEnabled;
        if (alertUnansweredAfterMinutes !== undefined) cfg.alertUnansweredAfterMinutes = Math.min(1440, Math.max(1, parseInt(alertUnansweredAfterMinutes) || 5));
        if (escalateUnansweredAfterMinutes !== undefined) cfg.escalateUnansweredAfterMinutes = Math.min(1440, Math.max(1, parseInt(escalateUnansweredAfterMinutes) || 15));
        if (escalationDepartmentId !== undefined) {
            if (escalationDepartmentId && !isValidUUID(escalationDepartmentId)) return res.status(400).json({ error: 'شناسه دپارتمان escalation نامعتبر است' });
            cfg.escalationDepartmentId = escalationDepartmentId || null;
        }
        if (aiAnswerEnabled !== undefined) cfg.aiAnswerEnabled = !!aiAnswerEnabled;
        if (openaiApiKey !== undefined) {
            const key = String(openaiApiKey || '').trim();
            if (key === '') {
                cfg.openaiApiKey = null;
            } else if (key.length >= 20 && (key.startsWith('sk-') || key.startsWith('sk_proj-'))) {
                cfg.openaiApiKey = key;
            }
            clearOpenAIApiKeyCache();
        }
        if (deptAssignedMessage !== undefined) {
            const msg = String(deptAssignedMessage || '').trim();
            if (msg.length > 500) return res.status(400).json({ error: 'پیام تخصیص دپارتمان بیش از ۵۰۰ کاراکتر مجاز نیست' });
            cfg.deptAssignedMessage = msg || null;
        }
        if (employeeIntroMessage !== undefined) {
            const msg = String(employeeIntroMessage || '').trim();
            if (msg.length > 500) return res.status(400).json({ error: 'پیام معرفی کارمند بیش از ۵۰۰ کاراکتر مجاز نیست' });
            cfg.employeeIntroMessage = msg || null;
        }
        if (conversationEndedMessage !== undefined) {
            const msg = String(conversationEndedMessage || '').trim();
            if (msg.length > 500) return res.status(400).json({ error: 'پیام پایان گفتگو بیش از ۵۰۰ کاراکتر مجاز نیست' });
            cfg.conversationEndedMessage = msg || null;
        }
        if (callIntroMessage !== undefined) {
            const msg = String(callIntroMessage || '').trim();
            if (msg.length > 500) return res.status(400).json({ error: 'پیام قبل از تماس بیش از ۵۰۰ کاراکتر مجاز نیست' });
            cfg.callIntroMessage = msg || null;
        }
        if (autoAssignmentMessagesEnabled !== undefined) cfg.autoAssignmentMessagesEnabled = !!autoAssignmentMessagesEnabled;
        await cfg.save();
        res.json({
            welcomeMessage: cfg.welcomeMessage || '',
            welcomeEnabled: cfg.welcomeEnabled,
            alertUnansweredAfterMinutes: cfg.alertUnansweredAfterMinutes,
            escalateUnansweredAfterMinutes: cfg.escalateUnansweredAfterMinutes,
            escalationDepartmentId: cfg.escalationDepartmentId,
            aiAnswerEnabled: cfg.aiAnswerEnabled !== false,
            openaiApiKeySet: !!(cfg.openaiApiKey && String(cfg.openaiApiKey).trim().length > 10),
            deptAssignedMessage: cfg.deptAssignedMessage ?? '',
            employeeIntroMessage: cfg.employeeIntroMessage ?? '',
            conversationEndedMessage: cfg.conversationEndedMessage ?? '',
            callIntroMessage: cfg.callIntroMessage ?? '',
            autoAssignmentMessagesEnabled: cfg.autoAssignmentMessagesEnabled !== false
        });
    } catch (err) {
        if (/no such column|SQLITE_ERROR|column.*does not exist/i.test(err.message)) {
            return res.status(500).json({ error: 'لطفاً اسکریپت‌های migration را اجرا کنید: node scripts/add-unanswered-columns.js و node scripts/add-auto-messages-columns.js و node scripts/add-auto-assignment-messages-enabled.js' });
        }
        next(err);
    }
});

/** مرکز کنترل — وضعیت کانال‌ها، کانال فعال، چک‌لیست Meta/Gateway */
router.get('/overview', async (req, res, next) => {
    try {
        if (!req.canAccess('whatsapp')) return res.status(403).json({ error: 'دسترسی به بخش واتساپ ندارید' });
        const overview = await buildWhatsappOverview(req);
        res.json(overview);
    } catch (err) {
        next(err);
    }
});

// تنظیمات اتصال واتساپ (Cloud API و Gateway)
router.get('/connection', async (req, res, next) => {
    try {
        if (!req.canAccess('whatsapp')) return res.status(403).json({ error: 'دسترسی به بخش واتساپ ندارید' });
        const [row] = await WhatsappConnection.findOrCreate({
            where: { id: 'default' },
            defaults: { connectionMode: 'cloud_first', cloudEnabled: true, gatewayEnabled: true },
        });
        res.json({
            connectionMode: row.connectionMode || 'cloud_first',
            cloudEnabled: row.cloudEnabled !== false,
            cloudAccessTokenSet: !!(row.cloudAccessToken && String(row.cloudAccessToken).trim().length > 10),
            cloudPhoneNumberId: row.cloudPhoneNumberId || '',
            cloudVerifyTokenSet: !!(row.cloudVerifyToken && String(row.cloudVerifyToken).trim().length > 0),
            cloudBulkTemplateName: row.cloudBulkTemplateName || '',
            cloudBulkTemplateLanguage: row.cloudBulkTemplateLanguage || 'fa',
            cloudAppSecretSet: !!String(process.env.WHATSAPP_CLOUD_APP_SECRET || '').trim(),
            gatewayEnabled: row.gatewayEnabled !== false,
            gatewayUrl: row.gatewayUrl || '',
            gatewayApiSecretSet: !!(row.gatewayApiSecret && String(row.gatewayApiSecret).trim().length > 0),
            numberFailoverEnabled: row.numberFailoverEnabled !== false,
        });
    } catch (err) {
        if (/no such table|relation .* does not exist/i.test(err.message)) {
            return res.json({
                connectionMode: 'cloud_first',
                cloudEnabled: true,
                cloudAccessTokenSet: false,
                cloudPhoneNumberId: '',
                cloudVerifyTokenSet: false,
                gatewayEnabled: true,
                gatewayUrl: '',
                gatewayApiSecretSet: false,
                numberFailoverEnabled: true,
            });
        }
        next(err);
    }
});

router.put('/connection', async (req, res, next) => {
    try {
        if (!req.canAccess('whatsapp')) return res.status(403).json({ error: 'دسترسی به بخش واتساپ ندارید' });
        if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            return res.status(403).json({ error: 'فقط ادمین یا مالک می‌تواند تنظیمات اتصال را تغییر دهد' });
        }
        const body = req.body || {};
        const [row] = await WhatsappConnection.findOrCreate({
            where: { id: 'default' },
            defaults: { connectionMode: 'cloud_first', cloudEnabled: true, gatewayEnabled: true },
        });
        if (body.connectionMode && ['cloud', 'gateway', 'cloud_first'].includes(body.connectionMode)) {
            row.connectionMode = body.connectionMode;
        }
        if (typeof body.cloudEnabled === 'boolean') row.cloudEnabled = body.cloudEnabled;
        if (body.cloudAccessToken !== undefined) {
            const v = String(body.cloudAccessToken || '').trim();
            row.cloudAccessToken = v || null;
        }
        if (body.cloudPhoneNumberId !== undefined) row.cloudPhoneNumberId = String(body.cloudPhoneNumberId || '').trim() || null;
        if (body.cloudVerifyToken !== undefined) row.cloudVerifyToken = String(body.cloudVerifyToken || '').trim() || null;
        if (body.cloudBulkTemplateName !== undefined) {
            row.cloudBulkTemplateName = String(body.cloudBulkTemplateName || '').trim() || null;
        }
        if (body.cloudBulkTemplateLanguage !== undefined) {
            const lang = String(body.cloudBulkTemplateLanguage || '').trim();
            row.cloudBulkTemplateLanguage = lang || 'fa';
        }
        if (typeof body.gatewayEnabled === 'boolean') row.gatewayEnabled = body.gatewayEnabled;
        if (body.gatewayUrl !== undefined) row.gatewayUrl = String(body.gatewayUrl || '').trim() || null;
        if (body.gatewayApiSecret !== undefined) {
            const v = String(body.gatewayApiSecret || '').trim();
            row.gatewayApiSecret = v || null;
        }
        if (typeof body.numberFailoverEnabled === 'boolean') {
            row.numberFailoverEnabled = body.numberFailoverEnabled;
        }
        await row.save();
        invalidateCache();
        try {
            const { syncPrimaryFromConnection } = require('../services/whatsappNumbers');
            await syncPrimaryFromConnection(row);
        } catch (_) {}
        res.json({
            connectionMode: row.connectionMode,
            cloudEnabled: row.cloudEnabled,
            cloudAccessTokenSet: !!(row.cloudAccessToken && String(row.cloudAccessToken).trim().length > 10),
            cloudPhoneNumberId: row.cloudPhoneNumberId || '',
            cloudVerifyTokenSet: !!(row.cloudVerifyToken && String(row.cloudVerifyToken).trim().length > 0),
            cloudBulkTemplateName: row.cloudBulkTemplateName || '',
            cloudBulkTemplateLanguage: row.cloudBulkTemplateLanguage || 'fa',
            gatewayEnabled: row.gatewayEnabled,
            gatewayUrl: row.gatewayUrl || '',
            gatewayApiSecretSet: !!(row.gatewayApiSecret && String(row.gatewayApiSecret).trim().length > 0),
            numberFailoverEnabled: row.numberFailoverEnabled !== false,
        });
    } catch (err) {
        if (/no such table|relation .* does not exist/i.test(err.message)) {
            return res.status(500).json({ error: 'لطفاً ابتدا اسکریپت add-whatsapp-connection-table را اجرا کنید: node scripts/add-whatsapp-connection-table.js' });
        }
        next(err);
    }
});

function requireWhatsappAdmin(req, res) {
    if (!req.canAccess('whatsapp')) {
        res.status(403).json({ error: 'دسترسی به بخش واتساپ ندارید' });
        return false;
    }
    if (req.user.role !== 'admin' && req.user.role !== 'owner') {
        res.status(403).json({ error: 'فقط ادمین یا مالک می‌تواند شماره‌های واتساپ را مدیریت کند' });
        return false;
    }
    return true;
}

/** لیست اسلات‌های شماره (اصلی + پشتیبان) */
router.get('/numbers', async (req, res, next) => {
    try {
        if (!req.canAccess('whatsapp')) return res.status(403).json({ error: 'دسترسی به بخش واتساپ ندارید' });
        const numbersSvc = require('../services/whatsappNumbers');
        const data = await numbersSvc.listNumbers();
        res.json(data);
    } catch (err) {
        if (/no such table|does not exist/i.test(String(err.message || ''))) {
            return res.json({ failoverEnabled: true, numbers: [], standbyCount: 0, readyStandbyCount: 0, canFailover: false });
        }
        next(err);
    }
});

/** افزودن اسلات پشتیبان (حتی بدون اعتبارنامه — برای آماده‌سازی) */
router.post('/numbers', async (req, res, next) => {
    try {
        if (!requireWhatsappAdmin(req, res)) return;
        const numbersSvc = require('../services/whatsappNumbers');
        const created = await numbersSvc.createStandbyNumber(req.body || {});
        res.status(201).json(created);
    } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        next(err);
    }
});

router.put('/numbers/failover', async (req, res, next) => {
    try {
        if (!requireWhatsappAdmin(req, res)) return;
        const numbersSvc = require('../services/whatsappNumbers');
        const enabled = !!(req.body && req.body.enabled);
        const failoverEnabled = await numbersSvc.setFailoverEnabled(enabled);
        res.json({ failoverEnabled });
    } catch (err) {
        next(err);
    }
});

router.put('/numbers/:id', async (req, res, next) => {
    try {
        if (!requireWhatsappAdmin(req, res)) return;
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر' });
        const numbersSvc = require('../services/whatsappNumbers');
        const updated = await numbersSvc.updateNumber(req.params.id, req.body || {});
        res.json(updated);
    } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        next(err);
    }
});

router.delete('/numbers/:id', async (req, res, next) => {
    try {
        if (!requireWhatsappAdmin(req, res)) return;
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر' });
        const numbersSvc = require('../services/whatsappNumbers');
        const result = await numbersSvc.deleteNumber(req.params.id);
        res.json(result);
    } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        next(err);
    }
});

/** اعتبارسنجی Token و Phone ID با Meta */
router.post('/cloud/verify', async (req, res, next) => {
    try {
        if (!req.canAccess('whatsapp')) return res.status(403).json({ error: 'دسترسی به بخش واتساپ ندارید' });
        if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            return res.status(403).json({ error: 'فقط ادمین یا مالک می‌تواند اتصال Cloud را تست کند' });
        }
        const whatsappCloud = require('../lib/whatsappCloudApi');
        const result = await whatsappCloud.verifyCredentials();
        res.json(result);
    } catch (err) {
        next(err);
    }
});

/** تشخیص وضعیت Cloud + راهنمای webhook verify */
router.get('/cloud/diagnostics', async (req, res, next) => {
    try {
        if (!req.canAccess('whatsapp')) return res.status(403).json({ error: 'دسترسی به بخش واتساپ ندارید' });
        const { getWhatsappConnectionConfig } = require('../lib/whatsappConnectionLoader');
        const whatsappCloud = require('../lib/whatsappCloudApi');
        const { getOutboundTemplateName } = require('../lib/whatsappOutboundPolicy');
        const cfg = await getWhatsappConnectionConfig();
        const env = String(process.env.BACKEND_PUBLIC_URL || '').trim().replace(/\/$/, '');
        const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
        const host = req.get('x-forwarded-host') || req.get('host') || '';
        const publicUrl = env || (host ? `${proto}://${host}` : '');
        const webhookUrl = publicUrl ? `${publicUrl}/api/webhook/whatsapp-cloud` : '';
        const verifyTokenSet = !!String(cfg.cloudVerifyToken || '').trim();
        const appSecretSet = !!String(process.env.WHATSAPP_CLOUD_APP_SECRET || '').trim();
        const meta = await whatsappCloud.verifyCredentials();

        res.json({
            webhookUrl,
            checks: {
                accessToken: !!(cfg.cloudAccessToken && String(cfg.cloudAccessToken).length > 10),
                phoneNumberId: !!String(cfg.cloudPhoneNumberId || '').trim(),
                verifyToken: verifyTokenSet,
                appSecret: appSecretSet,
                publicUrl: !!publicUrl,
                bulkTemplate: !!getOutboundTemplateName(cfg),
                metaApi: meta.ok === true,
            },
            meta,
            webhook: {
                callbackUrl: webhookUrl,
                verifyTokenConfigured: verifyTokenSet,
                appSecretConfigured: appSecretSet,
                verifyHint: webhookUrl
                    ? `${webhookUrl}?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=12345`
                    : null,
            },
            sessionWindowHours: parseInt(process.env.WHATSAPP_CLOUD_SESSION_HOURS || '24', 10) || 24,
        });
    } catch (err) {
        next(err);
    }
});

/** ارسال تست به یک شماره (متن آزاد یا قالب Meta) */
router.post('/cloud/test-send', async (req, res, next) => {
    try {
        if (!req.canAccess('whatsapp')) return res.status(403).json({ error: 'دسترسی به بخش واتساپ ندارید' });
        if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            return res.status(403).json({ error: 'فقط ادمین یا مالک می‌تواند پیام تست بفرستد' });
        }
        const { to, message, useTemplate, templateName, templateLanguage } = req.body || {};
        const phone = String(to || '').replace(/\D/g, '');
        if (!phone || phone.length < 10) return res.status(400).json({ error: 'شماره معتبر وارد کنید (مثلاً 989121234567)' });

        const whatsappCloud = require('../lib/whatsappCloudApi');
        const { getWhatsappConnectionConfig } = require('../lib/whatsappConnectionLoader');
        const { getOutboundTemplateName, getOutboundTemplateLanguage } = require('../lib/whatsappOutboundPolicy');
        const cfg = await getWhatsappConnectionConfig();
        const configured = await whatsappCloud.isConfigured();
        if (!configured) return res.status(400).json({ error: 'Cloud API تنظیم نشده است' });

        const text = String(message || '').trim() || 'Kaya CRM test';
        let payload;
        if (useTemplate === true) {
            const tplName = String(templateName || getOutboundTemplateName(cfg) || '').trim();
            if (!tplName) return res.status(400).json({ error: 'نام قالب Meta الزامی است' });
            payload = {
                to: phone,
                templateName: tplName,
                templateLanguage: String(templateLanguage || getOutboundTemplateLanguage(cfg) || 'fa').trim(),
                templateBodyParams: text ? [text] : [],
                message: text,
            };
        } else {
            payload = { to: phone, message: text };
        }

        const { sendWhatsAppMessage } = require('../lib/gatewayClient');
        const result = await sendWhatsAppMessage(payload, { timeout: 20000 });
        res.json({
            ok: true,
            messageId: result?.data?.messageId || null,
            viaTemplate: !!(result?.data?.viaTemplate || payload.templateName),
            to: phone,
        });
    } catch (err) {
        const metaErr = err?.response?.data?.error;
        if (metaErr) {
            return res.status(502).json({
                ok: false,
                error: metaErr.message || 'Meta API error',
                code: metaErr.code,
                hint: Number(metaErr.code) === 131047
                    ? 'خارج از پنجره ۲۴h — useTemplate:true یا قالب در پنل تنظیم کنید'
                    : undefined,
            });
        }
        next(err);
    }
});

module.exports = router;

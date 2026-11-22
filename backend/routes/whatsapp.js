const express = require('express');
const router = express.Router();
const { WhatsappConfig, WhatsappConnection } = require('../models');
const { invalidateCache, getWhatsappConnectionConfig } = require('../lib/whatsappConnectionLoader');
const { getPanelSettingsKey, getCurrentTenantId, isPlatformTenant } = require('../lib/tenantContext');
const { isSelfServeTenant, isTenantGatewayAllowed } = require('../lib/tenantGateway');
const { isValidUUID } = require('../lib/validation');
const { clearOpenAIApiKeyCache } = require('../lib/getOpenAIApiKey');
const { publicAiStatus, applyAiConfigUpdate, clearAiProviderCache } = require('../lib/aiProviders');
const { buildWhatsappOverview } = require('../lib/whatsappOverview');

router.get('/config', async (req, res, next) => {
    try {
        if (!req.canAccess('whatsapp')) return res.status(403).json({ error: 'دسترسی به بخش واتساپ ندارید' });
        const panelKey = getPanelSettingsKey();
        if (!panelKey) return res.status(400).json({ error: 'سازمان پنل مشخص نیست' });
        const [cfg] = await WhatsappConfig.findOrCreate({
            where: { id: panelKey },
            defaults: { welcomeMessage: null, welcomeEnabled: true, alertUnansweredAfterMinutes: 5, escalateUnansweredAfterMinutes: 15, aiAnswerEnabled: true }
        });
        const aiStatus = publicAiStatus(cfg);
        res.json({
            welcomeMessage: cfg.welcomeMessage || '',
            welcomeEnabled: cfg.welcomeEnabled !== false,
            alertUnansweredAfterMinutes: cfg.alertUnansweredAfterMinutes ?? 5,
            escalateUnansweredAfterMinutes: cfg.escalateUnansweredAfterMinutes ?? 15,
            escalationDepartmentId: cfg.escalationDepartmentId || null,
            aiAnswerEnabled: cfg.aiAnswerEnabled !== false,
            openaiApiKeySet: !!(aiStatus.aiKeyStatus.find((row) => row.id === 'openai') || {}).keySet,
            aiProvider: aiStatus.aiProvider,
            aiKeyStatus: aiStatus.aiKeyStatus,
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
                aiProvider: 'openai',
                aiKeyStatus: [],
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
        const panelKey = getPanelSettingsKey();
        if (!panelKey) return res.status(400).json({ error: 'سازمان پنل مشخص نیست' });
        const { welcomeMessage, welcomeEnabled, alertUnansweredAfterMinutes, escalateUnansweredAfterMinutes, escalationDepartmentId, aiAnswerEnabled, openaiApiKey, aiProvider, aiKeys, deptAssignedMessage, employeeIntroMessage, conversationEndedMessage, callIntroMessage, autoAssignmentMessagesEnabled } = req.body || {};
        const [cfg] = await WhatsappConfig.findOrCreate({
            where: { id: panelKey },
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
        if (aiProvider !== undefined || aiKeys !== undefined || openaiApiKey !== undefined) {
            const aiError = applyAiConfigUpdate(cfg, { aiProvider, aiKeys, openaiApiKey });
            if (aiError) return res.status(400).json(aiError);
            clearOpenAIApiKeyCache();
            clearAiProviderCache();
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
        const savedAi = publicAiStatus(cfg);
        res.json({
            welcomeMessage: cfg.welcomeMessage || '',
            welcomeEnabled: cfg.welcomeEnabled,
            alertUnansweredAfterMinutes: cfg.alertUnansweredAfterMinutes,
            escalateUnansweredAfterMinutes: cfg.escalateUnansweredAfterMinutes,
            escalationDepartmentId: cfg.escalationDepartmentId,
            aiAnswerEnabled: cfg.aiAnswerEnabled !== false,
            openaiApiKeySet: !!(savedAi.aiKeyStatus.find((row) => row.id === 'openai') || {}).keySet,
            aiProvider: savedAi.aiProvider,
            aiKeyStatus: savedAi.aiKeyStatus,
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
        const panelKey = getPanelSettingsKey();
        if (!panelKey) return res.status(400).json({ error: 'سازمان پنل مشخص نیست' });
        const selfServe = isSelfServeTenant(req.tenant);
        const [row] = await WhatsappConnection.findOrCreate({
            where: { id: panelKey },
            defaults: {
                connectionMode: selfServe ? 'cloud' : 'cloud_first',
                cloudEnabled: true,
                gatewayEnabled: !selfServe,
                tenantId: getCurrentTenantId() || null,
            },
        });
        if (!row.tenantId && getCurrentTenantId()) {
            row.tenantId = getCurrentTenantId();
            await row.save().catch(() => {});
        }
        const payload = {
            connectionMode: row.connectionMode || 'cloud_first',
            cloudEnabled: row.cloudEnabled !== false,
            cloudAccessTokenSet: !!(row.cloudAccessToken && String(row.cloudAccessToken).trim().length > 10),
            cloudPhoneNumberId: row.cloudPhoneNumberId || '',
            cloudWabaId: row.cloudWabaId || '',
            embeddedSignupAt: row.embeddedSignupAt || null,
            cloudVerifyTokenSet: !!(row.cloudVerifyToken && String(row.cloudVerifyToken).trim().length > 0),
            cloudBulkTemplateName: row.cloudBulkTemplateName || '',
            cloudBulkTemplateLanguage: row.cloudBulkTemplateLanguage || 'fa',
            cloudAppSecretSet: require('../lib/cloudAppSecret').isCloudAppSecretConfigured(),
            embeddedSignup: (() => {
                try {
                    return require('../lib/metaEmbeddedSignup').getPublicEmbeddedSignupConfig();
                } catch (_) {
                    return { enabled: false, reason: 'unavailable' };
                }
            })(),
            gatewayEnabled: row.gatewayEnabled !== false,
            gatewayUrl: row.gatewayUrl || '',
            gatewayApiSecretSet: !!(row.gatewayApiSecret && String(row.gatewayApiSecret).trim().length > 0),
            numberFailoverEnabled: row.numberFailoverEnabled !== false,
            selfServeCloudOnly: isSelfServeTenant(req.tenant) && !isTenantGatewayAllowed(req.tenant),
            gatewayManaged: isSelfServeTenant(req.tenant),
        };
        if (payload.selfServeCloudOnly) {
            payload.connectionMode = 'cloud';
            payload.gatewayEnabled = false;
        }
        if (payload.gatewayManaged) {
            payload.gatewayUrl = '';
            payload.gatewayApiSecretSet = false;
        } else if (!payload.gatewayUrl) {
            // پنل سکو: اگر DB خالی است همان GATEWAY_URL واقعی را نشان بده تا اشتباه :8000 ذخیره نشود
            try {
                const cfg = await getWhatsappConnectionConfig();
                if (cfg && cfg.gatewayUrl) payload.gatewayUrl = cfg.gatewayUrl;
            } catch (_) { /* ignore */ }
        }
        try {
            const { getTrialSnapshot } = require('../lib/whatsappTrial');
            payload.trial = await getTrialSnapshot();
        } catch (_) {
            payload.trial = { status: 'none', canStart: true, canConvert: false, days: 7 };
        }
        res.json(payload);
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
        const panelKey = getPanelSettingsKey();
        if (!panelKey) return res.status(400).json({ error: 'سازمان پنل مشخص نیست' });
        const cloudOnlyDesk = isSelfServeTenant(req.tenant) && !isTenantGatewayAllowed(req.tenant);
        const [row] = await WhatsappConnection.findOrCreate({
            where: { id: panelKey },
            defaults: {
                connectionMode: cloudOnlyDesk ? 'cloud' : 'cloud_first',
                cloudEnabled: true,
                gatewayEnabled: !cloudOnlyDesk,
                tenantId: getCurrentTenantId() || null,
            },
        });
        if (!row.tenantId && getCurrentTenantId()) {
            row.tenantId = getCurrentTenantId();
        }
        const gatewayManaged = isSelfServeTenant(req.tenant);
        if (cloudOnlyDesk) {
            row.connectionMode = 'cloud';
            row.cloudEnabled = true;
            row.gatewayEnabled = false;
        } else if (body.connectionMode && ['cloud', 'gateway', 'cloud_first'].includes(body.connectionMode)) {
            row.connectionMode = body.connectionMode;
        }
        if (!cloudOnlyDesk && typeof body.cloudEnabled === 'boolean') row.cloudEnabled = body.cloudEnabled;
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
        if (!cloudOnlyDesk && typeof body.gatewayEnabled === 'boolean') row.gatewayEnabled = body.gatewayEnabled;
        // حالت «فقط Gateway» بدون فعال بودن کانال QR بی‌معنی است — همیشه روشن کن
        if (!cloudOnlyDesk && row.connectionMode === 'gateway') row.gatewayEnabled = true;
        if (!gatewayManaged && body.gatewayUrl !== undefined) {
            let gw = String(body.gatewayUrl || '').trim() || null;
            if (gw) {
                // localhost روی https معمولاً ERR_CONNECTION_REFUSED می‌دهد
                gw = gw.replace(/^https:\/\/(127\.0\.0\.1|localhost)\b/i, 'http://$1');
                gw = gw.replace(/\/$/, '');
            }
            row.gatewayUrl = gw;
        }
        if (!gatewayManaged && body.gatewayApiSecret !== undefined) {
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
            cloudWabaId: row.cloudWabaId || '',
            embeddedSignupAt: row.embeddedSignupAt || null,
            cloudVerifyTokenSet: !!(row.cloudVerifyToken && String(row.cloudVerifyToken).trim().length > 0),
            cloudBulkTemplateName: row.cloudBulkTemplateName || '',
            cloudBulkTemplateLanguage: row.cloudBulkTemplateLanguage || 'fa',
            gatewayEnabled: row.gatewayEnabled,
            gatewayUrl: gatewayManaged ? '' : row.gatewayUrl || '',
            gatewayApiSecretSet: !gatewayManaged && !!(row.gatewayApiSecret && String(row.gatewayApiSecret).trim().length > 0),
            numberFailoverEnabled: row.numberFailoverEnabled !== false,
            selfServeCloudOnly: cloudOnlyDesk,
            gatewayManaged,
        });
    } catch (err) {
        if (/no such table|relation .* does not exist/i.test(err.message)) {
            return res.status(500).json({ error: 'لطفاً ابتدا اسکریپت add-whatsapp-connection-table را اجرا کنید: node scripts/add-whatsapp-connection-table.js' });
        }
        next(err);
    }
});

/** وضعیت عمومی Embedded Signup (بدون secret) */
router.get('/embedded-signup/config', async (req, res, next) => {
    try {
        if (!req.canAccess('whatsapp')) return res.status(403).json({ error: 'دسترسی به بخش واتساپ ندارید' });
        const { getPublicEmbeddedSignupConfig } = require('../lib/metaEmbeddedSignup');
        res.json(getPublicEmbeddedSignupConfig());
    } catch (err) {
        next(err);
    }
});

/**
 * تکمیل جریان Meta Embedded Signup — تعویض code، subscribe، ذخیره per-tenant
 * Body: { code, wabaId, phoneNumberId, pin?, displayPhoneNumber? }
 */
router.post('/embedded-signup/complete', async (req, res, next) => {
    try {
        if (!req.canAccess('whatsapp')) return res.status(403).json({ error: 'دسترسی به بخش واتساپ ندارید' });
        if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            return res.status(403).json({ error: 'فقط ادمین یا مالک می‌تواند واتساپ را با Meta وصل کند' });
        }
        const panelKey = getPanelSettingsKey();
        if (!panelKey) return res.status(400).json({ error: 'سازمان پنل مشخص نیست' });

        const {
            completeEmbeddedSignupFlow,
            getPublicEmbeddedSignupConfig,
        } = require('../lib/metaEmbeddedSignup');

        let result;
        try {
            result = await completeEmbeddedSignupFlow(req.body || {});
        } catch (err) {
            const status = err.status || 500;
            return res.status(status).json({
                error: err.message || 'Embedded Signup failed',
                code: err.code || 'ES_FAILED',
            });
        }

        const selfServe = isSelfServeTenant(req.tenant);
        const cloudOnlyDesk = selfServe && !isTenantGatewayAllowed(req.tenant);
        const [row] = await WhatsappConnection.findOrCreate({
            where: { id: panelKey },
            defaults: {
                connectionMode: cloudOnlyDesk || selfServe ? 'cloud' : 'cloud_first',
                cloudEnabled: true,
                gatewayEnabled: !cloudOnlyDesk,
                tenantId: getCurrentTenantId() || null,
            },
        });
        if (!row.tenantId && getCurrentTenantId()) row.tenantId = getCurrentTenantId();

        row.cloudEnabled = true;
        row.connectionMode = cloudOnlyDesk || selfServe ? 'cloud' : (row.connectionMode === 'gateway' ? 'cloud_first' : (row.connectionMode || 'cloud_first'));
        row.cloudAccessToken = result.accessToken;
        row.cloudPhoneNumberId = result.phoneNumberId;
        row.cloudWabaId = result.wabaId;
        row.embeddedSignupAt = new Date();
        if (!row.cloudVerifyToken) {
            const envTok = String(process.env.WHATSAPP_CLOUD_VERIFY_TOKEN || '').trim();
            row.cloudVerifyToken = envTok || require('crypto').randomBytes(16).toString('hex');
        }
        await row.save();
        invalidateCache();
        try {
            const { syncPrimaryFromConnection } = require('../services/whatsappNumbers');
            await syncPrimaryFromConnection(row);
        } catch (_) { /* جدول شماره ممکن است نباشد */ }

        const pub = getPublicEmbeddedSignupConfig();
        res.json({
            ok: true,
            cloudPhoneNumberId: row.cloudPhoneNumberId,
            cloudWabaId: row.cloudWabaId,
            embeddedSignupAt: row.embeddedSignupAt,
            cloudAccessTokenSet: true,
            subscribed: true,
            registered: !!result.registered,
            billingHintRequired: pub.billingHintRequired !== false,
            partnerType: pub.partnerType || 'tech_provider',
            displayPhone: result.displayPhone || null,
        });
    } catch (err) {
        if (/no such column|column.*does not exist/i.test(String(err.message || ''))) {
            return res.status(500).json({
                error: 'ستون Embedded Signup نیست. اجرا کنید: node scripts/add-embedded-signup-columns.js',
                code: 'ES_MIGRATION_REQUIRED',
            });
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
        const { getCloudWebhookUrl } = require('../lib/whatsappOverview');
        const webhookUrl = getCloudWebhookUrl(req);
        const verifyTokenSet = !!String(cfg.cloudVerifyToken || '').trim();
        const appSecretSet = require('../lib/cloudAppSecret').isCloudAppSecretConfigured();
        const meta = await whatsappCloud.verifyCredentials();

        res.json({
            webhookUrl,
            checks: {
                accessToken: !!(cfg.cloudAccessToken && String(cfg.cloudAccessToken).length > 10),
                phoneNumberId: !!String(cfg.cloudPhoneNumberId || '').trim(),
                verifyToken: verifyTokenSet,
                appSecret: appSecretSet,
                publicUrl: !!webhookUrl,
                bulkTemplate: !!getOutboundTemplateName(cfg),
                metaApi: meta.ok === true,
            },
            meta,
            webhook: {
                callbackUrl: webhookUrl,
                verifyTokenConfigured: verifyTokenSet,
                appSecretConfigured: appSecretSet,
                verifyHint: webhookUrl
                    ? `${webhookUrl}${webhookUrl.includes('?') ? '&' : '?'}hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=12345`
                    : null,
                coexistenceFields: [
                    'messages',
                    'smb_message_echoes',
                    'history',
                    'smb_app_state_sync',
                    'account_update',
                ],
            },
            coexistence: {
                syncEndpoint: '/api/whatsapp/cloud/coexistence/sync',
                note: 'برای شماره فعال روی WhatsApp Business App: Embedded Signup/Coexistence + Subscribe فیلدهای بالا، سپس sync مخاطبین و history در ۲۴ ساعت اول.',
            },
            sessionWindowHours: parseInt(process.env.WHATSAPP_CLOUD_SESSION_HOURS || '24', 10) || 24,
        });
    } catch (err) {
        next(err);
    }
});

/**
 * همگام‌سازی Coexistence بعد از Embedded Signup / ثبت شماره Business
 * contacts → smb_app_state_sync ؛ history → history (فقط یک‌بار در ۲۴h اول)
 */
router.post('/cloud/coexistence/sync', async (req, res, next) => {
    try {
        if (!req.canAccess('whatsapp')) return res.status(403).json({ error: 'دسترسی به بخش واتساپ ندارید' });
        if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            return res.status(403).json({ error: 'فقط ادمین یا مالک می‌تواند همگام‌سازی Coexistence را اجرا کند' });
        }
        const whatsappCloud = require('../lib/whatsappCloudApi');
        const configured = await whatsappCloud.isConfigured();
        if (!configured) return res.status(400).json({ error: 'Cloud API تنظیم نشده است' });

        const requested = String(req.body?.syncType || req.body?.type || 'both').trim().toLowerCase();
        const jobs = [];
        if (requested === 'contacts' || requested === 'smb_app_state_sync' || requested === 'both') {
            jobs.push({ key: 'contacts', syncType: 'smb_app_state_sync' });
        }
        if (requested === 'history' || requested === 'both') {
            jobs.push({ key: 'history', syncType: 'history' });
        }
        if (!jobs.length) {
            return res.status(400).json({
                error: 'syncType نامعتبر است',
                allowed: ['contacts', 'history', 'both'],
            });
        }

        const results = {};
        for (const job of jobs) {
            try {
                results[job.key] = {
                    ok: true,
                    data: await whatsappCloud.requestSmbAppData(job.syncType),
                };
            } catch (err) {
                const metaErr = err?.response?.data?.error;
                results[job.key] = {
                    ok: false,
                    error: metaErr?.message || err.message || 'sync_failed',
                    code: metaErr?.code,
                };
            }
        }
        const ok = Object.values(results).every((r) => r && r.ok);
        res.status(ok ? 200 : 502).json({
            ok,
            results,
            hint: 'Webhook باید فیلدهای history، smb_app_state_sync و smb_message_echoes را Subscribe کرده باشد.',
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

        // تست پنل فقط Cloud API — بدون failover/Gateway تا خطای واقعی Meta برگردد (نه 502 خام Cloudflare)
        const result = await whatsappCloud.sendMessage(payload);
        res.json({
            ok: true,
            messageId: result?.messageId || null,
            viaTemplate: !!payload.templateName,
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
        return res.status(502).json({
            ok: false,
            error: err?.message || 'ارسال تست ناموفق',
        });
    }
});

function requireOwnerOrAdmin(req, res, next) {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'owner')) return next();
    return res.status(403).json({ error: 'فقط ادمین یا مالک' });
}

router.post('/trial/start', requireOwnerOrAdmin, async (req, res, next) => {
    try {
        if (!req.canAccess('whatsapp')) return res.status(403).json({ error: 'دسترسی به بخش واتساپ ندارید' });
        if (req.tenant && req.tenant.id && !isPlatformTenant(req.tenant)) {
            return res.status(400).json({
                error: 'پنل‌های خودخدمت برای تست واتساپ از Meta Cloud API استفاده می‌کنند؛ اتصال QR مشترک نیست.',
                code: 'SELF_SERVE_CLOUD_ONLY',
            });
        }
        const { startWhatsappTrial } = require('../lib/whatsappTrial');
        const trial = await startWhatsappTrial();
        res.json({ ok: true, trial });
    } catch (err) {
        if (err && err.status) return res.status(err.status).json({ error: err.message, code: err.code });
        next(err);
    }
});

router.post('/trial/convert', requireOwnerOrAdmin, async (req, res, next) => {
    try {
        if (!req.canAccess('whatsapp')) return res.status(403).json({ error: 'دسترسی به بخش واتساپ ندارید' });
        const { convertWhatsappTrial } = require('../lib/whatsappTrial');
        const trial = await convertWhatsappTrial();
        res.json({ ok: true, trial });
    } catch (err) {
        if (err && err.status) return res.status(err.status).json({ error: err.message, code: err.code });
        next(err);
    }
});

module.exports = router;

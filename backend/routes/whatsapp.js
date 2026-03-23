const express = require('express');
const router = express.Router();
const { WhatsappConfig, WhatsappConnection } = require('../models');
const { invalidateCache } = require('../lib/whatsappConnectionLoader');
const { isValidUUID } = require('../lib/validation');
const { clearOpenAIApiKeyCache } = require('../lib/getOpenAIApiKey');

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
                autoAssignmentMessagesEnabled: true
            });
        }
        next(err);
    }
});

router.put('/config', async (req, res, next) => {
    try {
        if (!req.canAccess('whatsapp')) return res.status(403).json({ error: 'دسترسی به بخش واتساپ ندارید' });
        const { welcomeMessage, welcomeEnabled, alertUnansweredAfterMinutes, escalateUnansweredAfterMinutes, escalationDepartmentId, aiAnswerEnabled, openaiApiKey, deptAssignedMessage, employeeIntroMessage, autoAssignmentMessagesEnabled } = req.body || {};
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
            autoAssignmentMessagesEnabled: cfg.autoAssignmentMessagesEnabled !== false
        });
    } catch (err) {
        if (/no such column|SQLITE_ERROR|column.*does not exist/i.test(err.message)) {
            return res.status(500).json({ error: 'لطفاً اسکریپت‌های migration را اجرا کنید: node scripts/add-unanswered-columns.js و node scripts/add-auto-messages-columns.js و node scripts/add-auto-assignment-messages-enabled.js' });
        }
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
            cloudVerifyToken: row.cloudVerifyToken || '',
            gatewayEnabled: row.gatewayEnabled !== false,
            gatewayUrl: row.gatewayUrl || '',
            gatewayApiSecretSet: !!(row.gatewayApiSecret && String(row.gatewayApiSecret).trim().length > 0),
        });
    } catch (err) {
        if (/no such table|relation .* does not exist/i.test(err.message)) {
            return res.json({
                connectionMode: 'cloud_first',
                cloudEnabled: true,
                cloudAccessTokenSet: false,
                cloudPhoneNumberId: '',
                cloudVerifyToken: '',
                gatewayEnabled: true,
                gatewayUrl: '',
                gatewayApiSecretSet: false,
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
        if (typeof body.gatewayEnabled === 'boolean') row.gatewayEnabled = body.gatewayEnabled;
        if (body.gatewayUrl !== undefined) row.gatewayUrl = String(body.gatewayUrl || '').trim() || null;
        if (body.gatewayApiSecret !== undefined) {
            const v = String(body.gatewayApiSecret || '').trim();
            row.gatewayApiSecret = v || null;
        }
        await row.save();
        invalidateCache();
        res.json({
            connectionMode: row.connectionMode,
            cloudEnabled: row.cloudEnabled,
            cloudAccessTokenSet: !!(row.cloudAccessToken && String(row.cloudAccessToken).trim().length > 10),
            cloudPhoneNumberId: row.cloudPhoneNumberId || '',
            cloudVerifyToken: row.cloudVerifyToken || '',
            gatewayEnabled: row.gatewayEnabled,
            gatewayUrl: row.gatewayUrl || '',
            gatewayApiSecretSet: !!(row.gatewayApiSecret && String(row.gatewayApiSecret).trim().length > 0),
        });
    } catch (err) {
        if (/no such table|relation .* does not exist/i.test(err.message)) {
            return res.status(500).json({ error: 'لطفاً ابتدا اسکریپت add-whatsapp-connection-table را اجرا کنید: node scripts/add-whatsapp-connection-table.js' });
        }
        next(err);
    }
});

module.exports = router;

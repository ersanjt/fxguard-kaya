const express = require('express');
const router = express.Router();
const { WhatsappConfig } = require('../models');

router.get('/config', async (req, res) => {
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
            deptAssignedMessage: cfg.deptAssignedMessage ?? '',
            employeeIntroMessage: cfg.employeeIntroMessage ?? ''
        });
    } catch (err) {
        if (/no such column|SQLITE_ERROR/i.test(err.message)) {
            return res.json({
                welcomeMessage: '',
                welcomeEnabled: true,
                alertUnansweredAfterMinutes: 5,
                escalateUnansweredAfterMinutes: 15,
                escalationDepartmentId: null,
                aiAnswerEnabled: true,
                deptAssignedMessage: '',
                employeeIntroMessage: ''
            });
        }
        res.status(500).json({ error: err.message });
    }
});

router.put('/config', async (req, res) => {
    try {
        if (!req.canAccess('whatsapp')) return res.status(403).json({ error: 'دسترسی به بخش واتساپ ندارید' });
        const { welcomeMessage, welcomeEnabled, alertUnansweredAfterMinutes, escalateUnansweredAfterMinutes, escalationDepartmentId, aiAnswerEnabled, deptAssignedMessage, employeeIntroMessage } = req.body || {};
        const [cfg] = await WhatsappConfig.findOrCreate({
            where: { id: 'default' },
            defaults: { welcomeMessage: null, welcomeEnabled: true, alertUnansweredAfterMinutes: 5, escalateUnansweredAfterMinutes: 15, aiAnswerEnabled: true }
        });
        if (welcomeMessage !== undefined) cfg.welcomeMessage = String(welcomeMessage || '').trim() || null;
        if (welcomeEnabled !== undefined) cfg.welcomeEnabled = !!welcomeEnabled;
        if (alertUnansweredAfterMinutes !== undefined) cfg.alertUnansweredAfterMinutes = Math.max(1, parseInt(alertUnansweredAfterMinutes) || 5);
        if (escalateUnansweredAfterMinutes !== undefined) cfg.escalateUnansweredAfterMinutes = Math.max(1, parseInt(escalateUnansweredAfterMinutes) || 15);
        if (escalationDepartmentId !== undefined) cfg.escalationDepartmentId = escalationDepartmentId || null;
        if (aiAnswerEnabled !== undefined) cfg.aiAnswerEnabled = !!aiAnswerEnabled;
        if (deptAssignedMessage !== undefined) cfg.deptAssignedMessage = String(deptAssignedMessage || '').trim() || null;
        if (employeeIntroMessage !== undefined) cfg.employeeIntroMessage = String(employeeIntroMessage || '').trim() || null;
        await cfg.save();
        res.json({
            welcomeMessage: cfg.welcomeMessage || '',
            welcomeEnabled: cfg.welcomeEnabled,
            alertUnansweredAfterMinutes: cfg.alertUnansweredAfterMinutes,
            escalateUnansweredAfterMinutes: cfg.escalateUnansweredAfterMinutes,
            escalationDepartmentId: cfg.escalationDepartmentId,
            aiAnswerEnabled: cfg.aiAnswerEnabled !== false,
            deptAssignedMessage: cfg.deptAssignedMessage ?? '',
            employeeIntroMessage: cfg.employeeIntroMessage ?? ''
        });
    } catch (err) {
        if (/no such column|SQLITE_ERROR/i.test(err.message)) {
            return res.status(500).json({ error: 'لطفاً اسکریپت‌های migration را اجرا کنید: node scripts/add-unanswered-columns.js و node scripts/add-auto-messages-columns.js' });
        }
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

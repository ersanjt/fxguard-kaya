const express = require('express');
const router = express.Router();
const { WhatsappConfig } = require('../models');

router.get('/config', async (req, res) => {
    try {
        if (!req.canAccess('whatsapp')) return res.status(403).json({ error: 'دسترسی به بخش واتساپ ندارید' });
        const [cfg] = await WhatsappConfig.findOrCreate({
            where: { id: 'default' },
            defaults: { welcomeMessage: null, welcomeEnabled: true, alertUnansweredAfterMinutes: 5, escalateUnansweredAfterMinutes: 15 }
        });
        res.json({
            welcomeMessage: cfg.welcomeMessage || '',
            welcomeEnabled: cfg.welcomeEnabled !== false,
            alertUnansweredAfterMinutes: cfg.alertUnansweredAfterMinutes ?? 5,
            escalateUnansweredAfterMinutes: cfg.escalateUnansweredAfterMinutes ?? 15,
            escalationDepartmentId: cfg.escalationDepartmentId || null
        });
    } catch (err) {
        if (/no such column|SQLITE_ERROR/i.test(err.message)) {
            return res.json({
                welcomeMessage: '',
                welcomeEnabled: true,
                alertUnansweredAfterMinutes: 5,
                escalateUnansweredAfterMinutes: 15,
                escalationDepartmentId: null
            });
        }
        res.status(500).json({ error: err.message });
    }
});

router.put('/config', async (req, res) => {
    try {
        if (!req.canAccess('whatsapp')) return res.status(403).json({ error: 'دسترسی به بخش واتساپ ندارید' });
        const { welcomeMessage, welcomeEnabled, alertUnansweredAfterMinutes, escalateUnansweredAfterMinutes, escalationDepartmentId } = req.body || {};
        const [cfg] = await WhatsappConfig.findOrCreate({
            where: { id: 'default' },
            defaults: { welcomeMessage: null, welcomeEnabled: true, alertUnansweredAfterMinutes: 5, escalateUnansweredAfterMinutes: 15 }
        });
        if (welcomeMessage !== undefined) cfg.welcomeMessage = String(welcomeMessage || '').trim() || null;
        if (welcomeEnabled !== undefined) cfg.welcomeEnabled = !!welcomeEnabled;
        if (alertUnansweredAfterMinutes !== undefined) cfg.alertUnansweredAfterMinutes = Math.max(1, parseInt(alertUnansweredAfterMinutes) || 5);
        if (escalateUnansweredAfterMinutes !== undefined) cfg.escalateUnansweredAfterMinutes = Math.max(1, parseInt(escalateUnansweredAfterMinutes) || 15);
        if (escalationDepartmentId !== undefined) cfg.escalationDepartmentId = escalationDepartmentId || null;
        await cfg.save();
        res.json({
            welcomeMessage: cfg.welcomeMessage || '',
            welcomeEnabled: cfg.welcomeEnabled,
            alertUnansweredAfterMinutes: cfg.alertUnansweredAfterMinutes,
            escalateUnansweredAfterMinutes: cfg.escalateUnansweredAfterMinutes,
            escalationDepartmentId: cfg.escalationDepartmentId
        });
    } catch (err) {
        if (/no such column|SQLITE_ERROR/i.test(err.message)) {
            return res.status(500).json({ error: 'لطفاً اسکریپت migration را اجرا کنید: node scripts/add-unanswered-columns.js' });
        }
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { WhatsappConfig } = require('../models');

router.get('/config', async (req, res) => {
    try {
        if (!req.canAccess('whatsapp')) return res.status(403).json({ error: 'دسترسی به بخش واتساپ ندارید' });
        const [cfg] = await WhatsappConfig.findOrCreate({
            where: { id: 'default' },
            defaults: { welcomeMessage: null, welcomeEnabled: true }
        });
        res.json({
            welcomeMessage: cfg.welcomeMessage || '',
            welcomeEnabled: cfg.welcomeEnabled !== false
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/config', async (req, res) => {
    try {
        if (!req.canAccess('whatsapp')) return res.status(403).json({ error: 'دسترسی به بخش واتساپ ندارید' });
        const { welcomeMessage, welcomeEnabled } = req.body || {};
        const [cfg] = await WhatsappConfig.findOrCreate({
            where: { id: 'default' },
            defaults: { welcomeMessage: null, welcomeEnabled: true }
        });
        if (welcomeMessage !== undefined) cfg.welcomeMessage = String(welcomeMessage || '').trim() || null;
        if (welcomeEnabled !== undefined) cfg.welcomeEnabled = !!welcomeEnabled;
        await cfg.save();
        res.json({ welcomeMessage: cfg.welcomeMessage || '', welcomeEnabled: cfg.welcomeEnabled });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

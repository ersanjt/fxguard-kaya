/**
 * Kaya CRM — ثبت/حذف توکن پوش دستگاه
 * @file    backend/routes/devices.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const express = require('express');
const router = express.Router();
const { DevicePushToken } = require('../models');

const TOKEN_MAX = 512;
const PLATFORMS = new Set(['android', 'ios']);

function cleanToken(raw) {
    return String(raw || '').trim();
}

router.post('/push-token', async (req, res, next) => {
    try {
        const token = cleanToken(req.body && req.body.token);
        if (!token || token.length > TOKEN_MAX) {
            return res.status(400).json({ error: 'توکن پوش نامعتبر است' });
        }
        const platformRaw = String((req.body && req.body.platform) || 'android').trim().toLowerCase();
        const platform = PLATFORMS.has(platformRaw) ? platformRaw : 'android';
        const appVersion = String((req.body && req.body.appVersion) || '').trim().slice(0, 32) || null;
        const existing = await DevicePushToken.findOne({ where: { token } });
        if (existing) {
            await existing.update({ userId: req.userId, platform, appVersion });
            return res.json({ ok: true, id: existing.id });
        }
        const row = await DevicePushToken.create({
            userId: req.userId,
            token,
            platform,
            appVersion
        });
        return res.status(201).json({ ok: true, id: row.id });
    } catch (err) {
        next(err);
    }
});

router.delete('/push-token', async (req, res, next) => {
    try {
        const token = cleanToken((req.body && req.body.token) || (req.query && req.query.token));
        if (!token) return res.status(400).json({ error: 'توکن پوش نامعتبر است' });
        await DevicePushToken.destroy({ where: { token, userId: req.userId } });
        return res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

router.post('/push-test', async (req, res, next) => {
    try {
        const pushNotificationService = require('../services/pushNotificationService');
        if (!pushNotificationService.getMessaging()) {
            return res.json({ ok: false, reason: 'no_firebase' });
        }
        const result = await pushNotificationService.sendToUsers([req.userId], {
            type: 'announcement',
            title: 'Kaya Staff',
            body: 'این یک اعلان آزمایشی است.'
        });
        if (!result || !result.sent) {
            return res.json({
                ok: false,
                reason: (result && result.reason) || 'no_token',
                sent: (result && result.sent) || 0
            });
        }
        return res.json({ ok: true, sent: result.sent });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

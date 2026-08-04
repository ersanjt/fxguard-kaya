/**
 * وضعیت سیستم برای ادمین — سلامت + متریک عملیاتی
 */
const express = require('express');
const { isMainAdmin } = require('../lib/permissions');
const { collectSystemHealth, toPrometheusText } = require('../services/systemHealth');

function canViewSystemStatus(req) {
    if (!req.user) return false;
    if (isMainAdmin(req.user)) return true;
    if (req.user.role === 'owner' || req.user.role === 'admin') return true;
    return !!(req.canAccess && req.canAccess('system_status'));
}

function createSystemStatusRouter({ redisClient, getRabbitChannel }) {
    const router = express.Router();

    router.get('/', async (req, res, next) => {
        try {
            if (!canViewSystemStatus(req)) {
                return res.status(403).json({ error: 'دسترسی به وضعیت سیستم ندارید' });
            }
            const health = await collectSystemHealth({
                redisClient,
                getRabbitChannel,
                includeGateway: true,
                includeCounts: true,
            });
            const httpStatus = health.status === 'error' ? 503 : 200;
            res.status(httpStatus).json(health);
        } catch (err) {
            next(err);
        }
    });

    /** خروجی Prometheus (متن) — فقط ادمین/مالک */
    router.get('/prometheus', async (req, res, next) => {
        try {
            if (!canViewSystemStatus(req)) {
                return res.status(403).type('text/plain').send('forbidden');
            }
            const health = await collectSystemHealth({
                redisClient,
                getRabbitChannel,
                includeGateway: true,
                includeCounts: true,
            });
            res.set('Cache-Control', 'no-store');
            res.type('text/plain; version=0.0.4; charset=utf-8');
            res.status(200).send(toPrometheusText(health));
        } catch (err) {
            next(err);
        }
    });

    return router;
}

module.exports = { createSystemStatusRouter, canViewSystemStatus };

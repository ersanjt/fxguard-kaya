/**
 * WhatsApp Gateway proxy routes — status, QR, start/stop
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const axios = require('axios');
const { gatewayGet, gatewayPost, isCloudApiConfigured } = require('../lib/gatewayClient');
const { authMiddleware, requireSection } = require('../middleware/auth');

const GATEWAY_START_COOLDOWN_MS = 15000;

/**
 * @param {object} logger
 * @returns {{ router: express.Router, state: { gatewayStarting: boolean, gatewayStartedAt: number|null } }}
 */
function createGatewayRouter(logger) {
    const router = express.Router();
    const state = { gatewayStarting: false, gatewayStartedAt: null };

    const requireAdmin = (req, res, next) => {
        if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            return res.status(403).json({ error: 'فقط ادمین یا مالک' });
        }
        next();
    };

    router.get('/gateway/status', authMiddleware, requireSection('whatsapp'), (req, res) => {
        if (isCloudApiConfigured()) {
            const { PHONE_NUMBER_ID } = require('../lib/whatsappCloudApi');
            return res.json({
                whatsapp: true,
                status: 'ready',
                cloudApi: true,
                number: PHONE_NUMBER_ID ? ('••••' + PHONE_NUMBER_ID.slice(-8) + ' (Cloud API)') : null,
            });
        }
        gatewayGet('/api/status', { timeout: 5000 })
            .then((r) => res.json(r.data))
            .catch((e) => {
                const status = e.response?.status;
                if (status === 401) {
                    logger.warn(
                        'Gateway returned 401 – check GATEWAY_API_SECRET matches gateway/.env'
                    );
                } else if (e.code) {
                    logger.warn('Gateway request failed', {
                        code: e.code,
                        status,
                        url: process.env.GATEWAY_URL || 'http://localhost:3001',
                    });
                }
                res.status(503).json({
                    whatsapp: false,
                    status: 'disconnected',
                    error: 'Gateway در دسترس نیست',
                });
            });
    });

    router.get('/gateway/qr', authMiddleware, requireSection('whatsapp'), (req, res) => {
        if (isCloudApiConfigured()) {
            return res.json({ qr: null });
        }
        gatewayGet('/api/qr', { timeout: 5000 })
            .then((r) => res.json(r.data))
            .catch((e) => {
                if (e.response?.status === 401) {
                    logger.warn('Gateway QR returned 401 – check GATEWAY_API_SECRET');
                }
                res.status(503).json({ error: 'Gateway در دسترس نیست' });
            });
    });

    router.post(
        '/gateway/start',
        authMiddleware,
        requireSection('whatsapp'),
        requireAdmin,
        (req, res) => {
            if (isCloudApiConfigured()) return res.json({ ok: true, status: 'ready', message: 'Cloud API فعال است' });
            gatewayPost('/api/start', {}, { timeout: 10000 })
                .then((r) => res.json(r.data))
                .catch((e) =>
                    res.status(503).json({
                        error: e.response?.data?.error || 'Gateway در دسترس نیست',
                    })
                );
        }
    );

    router.post(
        '/gateway/stop',
        authMiddleware,
        requireSection('whatsapp'),
        requireAdmin,
        (req, res) => {
            if (isCloudApiConfigured()) return res.json({ ok: true, status: 'stopped', message: 'Cloud API فعال است' });
            gatewayPost('/api/stop', {}, { timeout: 10000 })
                .then((r) => res.json(r.data))
                .catch((e) =>
                    res.status(503).json({
                        error: e.response?.data?.error || 'Gateway در دسترس نیست',
                    })
                );
        }
    );

    router.post(
        '/gateway/logout',
        authMiddleware,
        requireSection('whatsapp'),
        requireAdmin,
        (req, res) => {
            if (isCloudApiConfigured()) return res.json({ ok: true, status: 'logged_out', message: 'Cloud API فعال است' });
            gatewayPost('/api/logout', {}, { timeout: 20000 })
                .then((r) => res.json(r.data))
                .catch((e) =>
                    res.status(503).json({
                        error: e.response?.data?.error || 'Gateway در دسترس نیست',
                    })
                );
        }
    );

    router.post(
        '/admin/start-gateway',
        authMiddleware,
        requireSection('whatsapp'),
        requireAdmin,
        async (req, res) => {
            const now = Date.now();
            if (
                state.gatewayStarting &&
                state.gatewayStartedAt &&
                now - state.gatewayStartedAt < GATEWAY_START_COOLDOWN_MS
            ) {
                return res.json({
                    message: 'Gateway در حال بالا آمدن است. چند ثانیه صبر کنید.',
                });
            }

            try {
                const GATEWAY_URL = (process.env.GATEWAY_URL || 'http://localhost:3001').replace(
                    /\/$/,
                    ''
                );
                const testRes = await axios
                    .get(GATEWAY_URL + '/api/status', { timeout: 3000 })
                    .catch(() => null);
                if (testRes && testRes.status === 200) {
                    return res.json({ message: 'Gateway از قبل در حال اجراست' });
                }

                const gatewayPath = path.join(__dirname, '..', '..', 'gateway');
                const entryPoint = path.join(gatewayPath, 'src', 'index.js');
                if (!fs.existsSync(entryPoint)) {
                    return res.status(500).json({
                        error: 'فایل gateway/src/index.js یافت نشد. Gateway را نصب کنید.',
                    });
                }

                const proc = spawn('node', ['src/index.js'], {
                    cwd: gatewayPath,
                    stdio: 'ignore',
                    detached: true,
                });
                proc.unref();

                state.gatewayStarting = true;
                state.gatewayStartedAt = now;
                setTimeout(() => {
                    state.gatewayStarting = false;
                    state.gatewayStartedAt = null;
                }, GATEWAY_START_COOLDOWN_MS);

                res.json({
                    message:
                        'Gateway در حال بالا آمدن است. چند ثانیه صبر کنید و QR را در تنظیمات واتساپ ببینید.',
                });
            } catch (e) {
                state.gatewayStarting = false;
                res.status(500).json({ error: e.message });
            }
        }
    );

    return { router, state };
}

module.exports = { createGatewayRouter };

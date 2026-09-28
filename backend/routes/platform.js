/**
 * ساخت و فهرست شرکت‌ها. کلید پلتفرم فقط دست اپراتور FxGuard است.
 */
const crypto = require('crypto');
const express = require('express');
const registry = require('../services/tenancy/registry');
const { provisionTenant } = require('../services/tenancy/provision');
const { getStore } = require('../services/tenancy/context');
const { panelUrl } = require('../services/tenancy/host');
const logger = require('../config/logger');

function requirePlatformKey(req, res, next) {
    const expected = String(process.env.PLATFORM_PROVISION_KEY || '');
    if (expected.length < 16) {
        return res.status(503).json({ error: 'ساخت شرکت روی این سرور هنوز فعال نشده است.' });
    }
    const got = String(req.get('x-platform-key') || '');
    const a = Buffer.from(got);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return res.status(401).json({ error: 'کلید پلتفرم نامعتبر است.' });
    }
    return next();
}

function respondProvision(req, res) {
    const body = req.body || {};
    return provisionTenant({
        slug: body.slug,
        name: body.name,
        ownerEmail: body.ownerEmail,
        ownerPassword: body.ownerPassword,
        environment: body.environment
    }).then((created) => res.status(201).json(created)).catch((err) => {
        const status = err.status || 500;
        if (status >= 500) logger.error('Platform provision error', { error: err.message });
        const message = status >= 500 ? 'ساخت پنل شرکت انجام نشد.' : err.message;
        return res.status(status).json({ error: message });
    });
}

function createPlatformRouter() {
    const router = express.Router();

    router.get('/host', (req, res) => {
        const store = getStore();
        const resolution = (store && store.resolution) || { kind: 'legacy' };
        res.json({
            kind: resolution.kind || 'legacy',
            slug: resolution.slug || null,
            environment: resolution.environment || null,
            host: resolution.host || null,
            registered: !!(store && store.tenant),
            publicBase: (store && store.publicBase) || null
        });
    });

    router.get('/tenants', requirePlatformKey, async (req, res, next) => {
        try {
            const rows = await registry.listAll();
            res.json({
                tenants: rows.map((row) => ({
                    ...registry.toPublic(row),
                    panelUrl: panelUrl(row.slug, row.environment)
                }))
            });
        } catch (err) {
            next(err);
        }
    });

    router.post('/signup', requirePlatformKey, (req, res) => respondProvision(req, res));

    router.post('/tenants', requirePlatformKey, (req, res) => respondProvision(req, res));

    return router;
}

module.exports = { createPlatformRouter };

/**
 * Kaya CRM — /api/industry-templates — قالب‌های شروع صنایع
 * @file    backend/routes/industryTemplates.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 *
 * GET  /            فهرست قالب‌ها (هر کاربر واردشده)
 * GET  /:key        جزئیات کامل یک قالب (پیش‌نمایش)
 * POST /:key/apply  اعمال قالب روی سازمان (مالک/ادمین)
 */
const express = require('express');
const router = express.Router();
const models = require('../models');
const { getPanelSettingsKey } = require('../lib/tenantContext');
const { isMainAdmin } = require('../lib/permissions');
const { listTemplates, getTemplate, applyTemplate } = require('../lib/industryTemplates');
const moduleBuilder = require('../services/moduleBuilder');
const { getPanelSettings } = require('../services/panelSettingsLoader');

function canApply(user) {
    return !!user && (isMainAdmin(user) || user.role === 'owner' || user.role === 'admin');
}

router.get('/', async (req, res, next) => {
    try {
        const s = await getPanelSettings();
        res.json({ data: listTemplates(), current: s.industryKey || null });
    } catch (err) {
        next(err);
    }
});

router.get('/:key', (req, res) => {
    const t = getTemplate(req.params.key);
    if (!t) return res.status(404).json({ error: 'قالب یافت نشد' });
    res.json(t);
});

router.post('/:key/apply', async (req, res, next) => {
    try {
        if (!canApply(req.user)) return res.status(403).json({ error: 'فقط مالک یا ادمین می‌تواند قالب صنعت را اعمال کند' });
        const result = await applyTemplate(req.params.key, { models, moduleBuilder, getPanelSettingsKey });
        res.json({ ok: true, ...result });
    } catch (err) {
        if (err && err.expose && err.status) return res.status(err.status).json({ error: err.message });
        next(err);
    }
});

module.exports = router;

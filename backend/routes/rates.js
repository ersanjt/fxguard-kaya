const express = require('express');
const router = express.Router();
const axios = require('axios');
const { RateAdjustment, TickerConfig } = require('../models');

const NAVASAN_API_KEY = process.env.NAVASAN_API_KEY || 'premVIlUQHLNK4IGQzHnZNZyHCbJrknc';
const NAVASAN_LATEST = `https://api.navasan.tech/latest/?api_key=${NAVASAN_API_KEY}`;

let lastRatesCache = null;

const RATES_KEYS = [
    { key: 'usd', label: 'دلار', apiKeys: ['usd_sell', 'usd_buy'] },
    { key: 'eur', label: 'یورو', apiKeys: ['eur', 'mex_eur_sell'] },
    { key: 'gbp', label: 'پوند', apiKeys: ['gbp', 'gbp_hav'] },
    { key: 'try', label: 'لیر ترکیه', apiKeys: ['try', 'try_hav'] },
    { key: 'aed', label: 'درهم امارات', apiKeys: ['aed_sell', 'dirham_dubai'] },
    { key: 'rub', label: 'روبل روسیه', apiKeys: ['rub'] },
    { key: 'azn', label: 'منات آذربایجان', apiKeys: ['azn'] },
    { key: 'cny', label: 'یوان چین', apiKeys: ['cny', 'cny_hav'] },
    { key: 'gold', label: 'طلا (گرم)', apiKeys: ['18ayar'] }
];

function pickValue(raw, apiKeys) {
    for (const k of apiKeys) {
        const v = raw[k] && raw[k].value != null ? raw[k].value : null;
        if (v != null) return Number(v);
    }
    return null;
}
function pickChange(raw, apiKeys) {
    for (const k of apiKeys) {
        const v = raw[k] && raw[k].change != null ? raw[k].change : null;
        if (v != null) return Number(v);
    }
    return null;
}

function applyAdjustment(rawNum, adj) {
    if (!adj || adj.adjustmentType === 'none' || adj.adjustmentType == null) return rawNum;
    const val = adj.value != null ? Number(adj.value) : 0;
    if (adj.adjustmentType === 'fixed') return val;
    if (adj.adjustmentType === 'delta_toman') return (rawNum || 0) + val;
    if (adj.adjustmentType === 'percent') return (rawNum || 0) * (1 + val / 100);
    return rawNum;
}

// GET /api/rates — نرخ‌ها از API + اعمال تعدیلات؛ برای همه کاربران لاگین‌شده
router.get('/', async (req, res) => {
    try {
        let raw = await axios.get(NAVASAN_LATEST, { timeout: 12000 }).then(r => r.data || {}).catch((e) => {
            console.warn('Navasan API error:', e.message || e.code);
            return null;
        });
        if (!raw || Object.keys(raw).length === 0) {
            raw = lastRatesCache || {};
        } else {
            lastRatesCache = raw;
        }
        let adjustments = {};
        try {
            const rows = await RateAdjustment.findAll();
            rows.forEach(r => { adjustments[r.currencyKey] = r; });
        } catch (dbErr) {
            console.warn('RateAdjustment error:', dbErr.message);
        }

        let visibleKeys = null;
        try {
            const cfg = await TickerConfig.findByPk('default');
            if (cfg && cfg.visibleKeys && Array.isArray(cfg.visibleKeys) && cfg.visibleKeys.length > 0) {
                visibleKeys = cfg.visibleKeys;
            }
        } catch (e) { /* ignore */ }

        const allItems = RATES_KEYS.map(({ key, label, apiKeys }) => {
            const rawVal = pickValue(raw, apiKeys);
            const change = pickChange(raw, apiKeys);
            const adj = adjustments[key];
            const finalVal = applyAdjustment(rawVal, adj);
            return {
                key,
                label,
                value: finalVal != null ? finalVal : '—',
                change: change != null ? change : null,
                rawValue: rawVal
            };
        });

        const items = visibleKeys
            ? visibleKeys.map(k => allItems.find(i => i.key === k)).filter(Boolean)
            : allItems;

        // همیشه زمان فعلی سرور به صورت ISO — تاریخ API ناواسان فرمت یکسانی ندارد و در مرورگر به اشتباه (مثلاً سال ۷۸۳/۸۰۷) تفسیر می‌شد
        const updatedAt = new Date().toISOString();
        res.json({ items, allItems, visibleKeys: visibleKeys || RATES_KEYS.map(r => r.key), updatedAt });
    } catch (err) {
        res.status(502).json({
            error: 'دریافت قیمت‌ها ناموفق بود',
            items: RATES_KEYS.map(({ key, label }) => ({ key, label, value: '—', change: null }))
        });
    }
});

// GET /api/rates/health — تست دسترسی به API خارجی (نیاز به auth دارد)
router.get('/health', async (req, res) => {
    try {
        const r = await axios.get(NAVASAN_LATEST, { timeout: 8000 });
        const hasData = r.data && typeof r.data === 'object' && Object.keys(r.data).length > 0;
        res.json({ ok: true, external: hasData });
    } catch (e) {
        res.json({ ok: false, external: false, error: e.message || e.code });
    }
});

// GET /api/rates/adjustments — لیست تعدیلات (فقط برای کسی که دسترسی نرخ ارز دارد)
router.get('/adjustments', async (req, res) => {
    try {
        if (!req.canAccess('rates')) return res.status(403).json({ error: 'دسترسی به بخش نرخ ارز ندارید' });
        const rows = await RateAdjustment.findAll({ order: [['currencyKey', 'ASC']] });
        const map = {};
        rows.forEach(r => { map[r.currencyKey] = { currencyKey: r.currencyKey, adjustmentType: r.adjustmentType || 'none', value: r.value != null ? Number(r.value) : null }; });
        RATES_KEYS.forEach(({ key }) => { if (!map[key]) map[key] = { currencyKey: key, adjustmentType: 'none', value: null }; });
        res.json({ data: Object.values(map) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/rates/adjustments — ذخیره تعدیلات
router.put('/adjustments', async (req, res) => {
    try {
        if (!req.canAccess('rates')) return res.status(403).json({ error: 'دسترسی به بخش نرخ ارز ندارید' });
        const list = req.body.adjustments || req.body.data || [];
        const allowedKeys = RATES_KEYS.map(r => r.key);
        for (const item of list) {
            const key = (item.currencyKey || item.key || '').toLowerCase();
            if (!allowedKeys.includes(key)) continue;
            const type = item.adjustmentType || 'none';
            const value = item.value != null && type !== 'none' ? item.value : null;
            const [rec] = await RateAdjustment.findOrCreate({ where: { currencyKey: key }, defaults: { adjustmentType: 'none', value: null } });
            await rec.update({ adjustmentType: type, value });
        }
        const rows = await RateAdjustment.findAll({ order: [['currencyKey', 'ASC']] });
        const map = {};
        rows.forEach(r => { map[r.currencyKey] = { currencyKey: r.currencyKey, adjustmentType: r.adjustmentType || 'none', value: r.value != null ? Number(r.value) : null }; });
        RATES_KEYS.forEach(({ key }) => { if (!map[key]) map[key] = { currencyKey: key, adjustmentType: 'none', value: null }; });
        res.json({ data: Object.values(map) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/rates/ticker-config — ارزهای قابل نمایش در نوار قیمت
router.get('/ticker-config', async (req, res) => {
    try {
        const cfg = await TickerConfig.findByPk('default');
        const visibleKeys = (cfg && cfg.visibleKeys && Array.isArray(cfg.visibleKeys)) ? cfg.visibleKeys : RATES_KEYS.map(r => r.key);
        res.json({ visibleKeys, availableKeys: RATES_KEYS.map(r => ({ key: r.key, label: r.label })) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/rates/ticker-config — ذخیره ارزهای قابل نمایش (فقط با دسترسی rates)
router.put('/ticker-config', async (req, res) => {
    try {
        if (!req.canAccess('rates')) return res.status(403).json({ error: 'دسترسی به بخش نرخ ارز ندارید' });
        const visibleKeys = req.body.visibleKeys;
        if (!Array.isArray(visibleKeys)) return res.status(400).json({ error: 'visibleKeys باید آرایه باشد' });
        const allowed = RATES_KEYS.map(r => r.key);
        const valid = visibleKeys.filter(k => allowed.includes(String(k).toLowerCase()));
        const [cfg] = await TickerConfig.findOrCreate({ where: { id: 'default' }, defaults: { visibleKeys: null } });
        await cfg.update({ visibleKeys: valid.length > 0 ? valid : null });
        res.json({ visibleKeys: valid.length > 0 ? valid : RATES_KEYS.map(r => r.key) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { RateAdjustment } = require('../models');

const NAVASAN_API_KEY = process.env.NAVASAN_API_KEY || 'premVIlUQHLNK4IGQzHnZNZyHCbJrknc';
const NAVASAN_LATEST = `http://api.navasan.tech/latest/?api_key=${NAVASAN_API_KEY}`;

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
        const raw = await axios.get(NAVASAN_LATEST, { timeout: 8000 }).then(r => r.data || {}).catch(() => ({}));
        const adjustments = await RateAdjustment.findAll().then(rows => {
            const map = {};
            rows.forEach(r => { map[r.currencyKey] = r; });
            return map;
        });

        const items = RATES_KEYS.map(({ key, label, apiKeys }) => {
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

        const updatedAt = raw.usd_sell && raw.usd_sell.date ? raw.usd_sell.date : new Date().toISOString();
        res.json({ items, updatedAt });
    } catch (err) {
        res.status(502).json({
            error: 'دریافت قیمت‌ها ناموفق بود',
            items: RATES_KEYS.map(({ key, label }) => ({ key, label, value: '—', change: null }))
        });
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

module.exports = router;

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { RateAdjustment, RateCurrency, TickerConfig } = require('../models');
const defaultRateCurrencies = require('../lib/defaultRateCurrencies');
const logger = require('../config/logger');

const NAVASAN_API_KEY = process.env.NAVASAN_API_KEY || '';
const NAVASAN_LATEST = NAVASAN_API_KEY ? `https://api.navasan.tech/latest/?api_key=${NAVASAN_API_KEY}` : null;

let lastRatesCache = null;

/** لیست ارزها از DB؛ اگر خالی بود از پیش‌فرض برمی‌گرداند */
async function getRatesKeys() {
    const rows = await RateCurrency.findAll({ order: [['sortOrder', 'ASC'], ['key', 'ASC']] });
    if (rows && rows.length > 0) {
        return rows.map(r => ({
            key: r.key,
            label: r.label || r.key,
            apiKeys: Array.isArray(r.apiKeys) ? r.apiKeys : (r.apiKeys ? [r.apiKeys] : [])
        }));
    }
    return defaultRateCurrencies.map(({ key, label, apiKeys }) => ({ key, label, apiKeys }));
}

function pickValue(raw, apiKeys) {
    for (const k of apiKeys) {
        const obj = raw[k];
        if (!obj) continue;
        let v = obj.value;
        if (v == null) continue;
        if (typeof v === 'string') v = parseFloat(v.replace(/[^\d.-]/g, ''));
        const num = Number(v);
        if (!isNaN(num)) return num;
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

// GET /api/rates/config-status — وضعیت تنظیمات (آیا API key دارد؟)
router.get('/config-status', async (req, res) => {
    res.json({ hasApiKey: !!NAVASAN_API_KEY });
});

// GET /api/rates — نرخ‌ها از API + اعمال تعدیلات؛ برای همه کاربران لاگین‌شده
router.get('/', async (req, res) => {
    try {
        const RATES_KEYS = await getRatesKeys();
        let raw = null;
        if (NAVASAN_LATEST) {
            raw = await axios.get(NAVASAN_LATEST, { timeout: 12000 }).then(r => r.data || {}).catch((e) => {
                logger.warn('Navasan API error', { error: e.message || e.code });
                return null;
            });
        } else {
            logger.warn('NAVASAN_API_KEY not set — using cached rates only');
        }
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
            logger.warn('RateAdjustment error', { error: dbErr.message });
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

        const ts = raw.usd_sell && raw.usd_sell.timestamp ? raw.usd_sell.timestamp : null;
        const updatedAt = ts ? new Date(ts * 1000).toISOString() : new Date().toISOString();
        res.json({ items, allItems, visibleKeys: visibleKeys || RATES_KEYS.map(r => r.key), updatedAt, updatedAtTimestamp: ts || null });
    } catch (err) {
        const fallback = defaultRateCurrencies.map(({ key, label }) => ({ key, label, value: '—', change: null }));
        res.status(502).json({
            error: 'دریافت قیمت‌ها ناموفق بود',
            items: fallback
        });
    }
});

// نگاشت کلید ارز به item نوسان برای dailyCurrency
const CURRENCY_TO_NAVASAN_ITEM = {
    usd: 'usd_sell', eur: 'mex_eur_sell', gbp: 'gbp', chf: 'chf_sell', cad: 'cad_sell',
    aud: 'aud_sell', jpy: 'jpy_sell', try: 'try_hav', aed: 'aed_sell', sar: 'sar_sell',
    kwd: 'kwd_sell', gold: '18ayar', rub: 'rub', cny: 'cny_hav', inr: 'inr_sell'
};

// تبدیل میلادی به شمسی ساده (برای date param)
function toJalaliDate(d) {
    const g2d = (g) => {
        const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
        const gy = g.getFullYear() - 1600;
        const gm = g.getMonth();
        const gd = g.getDate() - 1;
        let g_day_no = 365 * gy + Math.floor((gy + 3) / 4) - Math.floor((gy + 99) / 100) + Math.floor((gy + 399) / 400);
        for (let i = 0; i < gm; i++) g_day_no += g_d_m[i];
        if (gm > 1 && ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0)) g_day_no++;
        g_day_no += gd;
        let j_day_no = g_day_no - 79;
        const j_np = Math.floor(j_day_no / 12053);
        j_day_no %= 12053;
        let jy = 979 + 33 * j_np + 4 * Math.floor(j_day_no / 1461);
        j_day_no %= 1461;
        if (j_day_no >= 366) { jy += Math.floor((j_day_no - 1) / 365); j_day_no = (j_day_no - 1) % 365; }
        const jm = j_day_no < 186 ? 1 + Math.floor(j_day_no / 31) : 7 + Math.floor((j_day_no - 186) / 30);
        const jd = 1 + (j_day_no < 186 ? j_day_no % 31 : (j_day_no - 186) % 30);
        return [jy, String(jm).padStart(2, '0'), String(jd).padStart(2, '0')].join('-');
    };
    return g2d(d);
}

// کش داده تاریخی — کلید: `${key}_${days}` ، TTL: 10 دقیقه
const historyCache = new Map();
const HISTORY_CACHE_TTL = 10 * 60 * 1000;

function getHistoryCacheKey(key, days) { return `${key}_${days}`; }

// GET /api/rates/history — داده تاریخی برای چارت (item یا key ارز، days تعداد روز)
router.get('/history', async (req, res) => {
    try {
        const key = (req.query.key || req.query.currency || 'usd').toLowerCase();
        const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 30));
        const forceRefresh = req.query.refresh === '1';

        const cacheKey = getHistoryCacheKey(key, days);
        if (!forceRefresh && historyCache.has(cacheKey)) {
            const cached = historyCache.get(cacheKey);
            if (Date.now() - cached.ts < HISTORY_CACHE_TTL) {
                return res.json(cached.data);
            }
            historyCache.delete(cacheKey);
        }

        const item = CURRENCY_TO_NAVASAN_ITEM[key] || (key === 'usd' ? 'usd_sell' : key + '_sell');
        const baseUrl = `https://api.navasan.tech/dailyCurrency/?api_key=${NAVASAN_API_KEY}&item=${encodeURIComponent(item)}`;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const BATCH_SIZE = 5;
        const dayEntries = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            dayEntries.push({ index: days - 1 - i, date: d, jalali: toJalaliDate(d) });
        }

        const results = new Array(dayEntries.length).fill(null);
        for (let batch = 0; batch < dayEntries.length; batch += BATCH_SIZE) {
            const chunk = dayEntries.slice(batch, batch + BATCH_SIZE);
            const promises = chunk.map(entry =>
                axios.get(baseUrl + '&date=' + encodeURIComponent(entry.jalali), { timeout: 8000 })
                    .then(r => {
                        const data = Array.isArray(r.data) ? r.data : (r.data && r.data.data ? r.data.data : []);
                        if (data.length > 0) {
                            const last = data[data.length - 1];
                            let v = last.value;
                            if (typeof v === 'string') v = parseFloat(v.replace(/[^\d.-]/g, ''));
                            const num = Number(v);
                            if (!isNaN(num)) return { date: entry.jalali, timestamp: last.timestamp || Math.floor(entry.date.getTime() / 1000), value: num };
                        }
                        return null;
                    })
                    .catch(() => null)
            );
            const batchResults = await Promise.all(promises);
            batchResults.forEach((r, i) => { results[batch + i] = r; });
        }

        const points = results.filter(Boolean);
        const responseData = { key, item, points };

        historyCache.set(cacheKey, { ts: Date.now(), data: responseData });

        res.json(responseData);
    } catch (err) {
        res.status(500).json({ error: err.message || 'خطا در دریافت داده تاریخی' });
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
        const RATES_KEYS = await getRatesKeys();
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
        const RATES_KEYS = await getRatesKeys();
        const list = req.body.adjustments || req.body.data || [];
        if (!Array.isArray(list)) return res.status(400).json({ error: 'adjustments باید آرایه باشد' });
        if (list.length > 100) return res.status(400).json({ error: 'حداکثر ۱۰۰ تعدیل در هر درخواست مجاز است' });
        const VALID_ADJUSTMENT_TYPES = new Set(['none', 'fixed', 'delta_toman', 'percent']);
        const allowedKeys = RATES_KEYS.map(r => r.key);
        for (const item of list) {
            const key = (item.currencyKey || item.key || '').toLowerCase();
            if (!allowedKeys.includes(key)) continue;
            const type = item.adjustmentType || 'none';
            if (!VALID_ADJUSTMENT_TYPES.has(type)) continue;
            const rawValue = item.value != null && type !== 'none' ? Number(item.value) : null;
            if (rawValue !== null && (isNaN(rawValue) || Math.abs(rawValue) > 1e12)) continue;
            const [rec] = await RateAdjustment.findOrCreate({ where: { currencyKey: key }, defaults: { adjustmentType: 'none', value: null } });
            await rec.update({ adjustmentType: type, value: rawValue });
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
        const RATES_KEYS = await getRatesKeys();
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
        const RATES_KEYS = await getRatesKeys();
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

// ————— مدیریت ارزها (فقط با دسترسی rates) —————

// GET /api/rates/currencies — لیست ارزهای قابل ویرایش
router.get('/currencies', async (req, res) => {
    try {
        if (!req.canAccess('rates')) return res.status(403).json({ error: 'دسترسی به بخش نرخ ارز ندارید' });
        const list = await RateCurrency.findAll({ order: [['sortOrder', 'ASC'], ['key', 'ASC']] });
        const data = (list && list.length > 0)
            ? list.map(r => ({ key: r.key, label: r.label || '', apiKeys: Array.isArray(r.apiKeys) ? r.apiKeys : [], sortOrder: r.sortOrder != null ? r.sortOrder : 0 }))
            : defaultRateCurrencies.map(({ key, label, apiKeys, sortOrder }) => ({ key, label, apiKeys: apiKeys || [], sortOrder: sortOrder != null ? sortOrder : 0 }));
        res.json({ data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/rates/currencies — افزودن ارز
router.post('/currencies', async (req, res) => {
    try {
        if (!req.canAccess('rates')) return res.status(403).json({ error: 'دسترسی به بخش نرخ ارز ندارید' });
        const key = (req.body.key || '').trim().toLowerCase();
        const label = (req.body.label || '').trim() || key;
        let apiKeys = req.body.apiKeys;
        if (typeof apiKeys === 'string') apiKeys = apiKeys.split(/[\s,،]+/).map(s => s.trim()).filter(Boolean);
        if (!Array.isArray(apiKeys)) apiKeys = [key + '_sell', key + '_buy'];
        if (!key) return res.status(400).json({ error: 'کلید ارز الزامی است' });
        const exists = await RateCurrency.findByPk(key);
        if (exists) return res.status(400).json({ error: 'این ارز قبلاً ثبت شده است' });
        const maxOrder = await RateCurrency.max('sortOrder');
        await RateCurrency.create({ key, label, apiKeys, sortOrder: (maxOrder != null ? maxOrder : 0) + 1 });
        const list = await RateCurrency.findAll({ order: [['sortOrder', 'ASC'], ['key', 'ASC']] });
        res.json({ data: list.map(r => ({ key: r.key, label: r.label, apiKeys: r.apiKeys || [], sortOrder: r.sortOrder })) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/rates/currencies/:key — ویرایش ارز
router.put('/currencies/:key', async (req, res) => {
    try {
        if (!req.canAccess('rates')) return res.status(403).json({ error: 'دسترسی به بخش نرخ ارز ندارید' });
        const key = (req.params.key || '').trim().toLowerCase();
        if (!key) return res.status(400).json({ error: 'کلید ارز الزامی است' });
        const rec = await RateCurrency.findByPk(key);
        if (!rec) return res.status(404).json({ error: 'ارز یافت نشد' });
        const updates = {};
        if (req.body.label !== undefined) updates.label = String(req.body.label).trim() || rec.label;
        if (req.body.apiKeys !== undefined) {
            let apiKeys = req.body.apiKeys;
            if (typeof apiKeys === 'string') apiKeys = apiKeys.split(/[\s,،]+/).map(s => s.trim()).filter(Boolean);
            updates.apiKeys = Array.isArray(apiKeys) ? apiKeys : rec.apiKeys;
        }
        if (req.body.sortOrder !== undefined) updates.sortOrder = parseInt(req.body.sortOrder, 10);
        await rec.update(updates);
        const list = await RateCurrency.findAll({ order: [['sortOrder', 'ASC'], ['key', 'ASC']] });
        res.json({ data: list.map(r => ({ key: r.key, label: r.label, apiKeys: r.apiKeys || [], sortOrder: r.sortOrder })) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/rates/currencies/:key — حذف ارز
router.delete('/currencies/:key', async (req, res) => {
    try {
        if (!req.canAccess('rates')) return res.status(403).json({ error: 'دسترسی به بخش نرخ ارز ندارید' });
        const key = (req.params.key || '').trim().toLowerCase();
        if (!key) return res.status(400).json({ error: 'کلید ارز الزامی است' });
        const rec = await RateCurrency.findByPk(key);
        if (!rec) return res.status(404).json({ error: 'ارز یافت نشد' });
        await rec.destroy();
        await RateAdjustment.destroy({ where: { currencyKey: key } });
        const cfg = await TickerConfig.findByPk('default');
        if (cfg && cfg.visibleKeys && Array.isArray(cfg.visibleKeys)) {
            const visibleKeys = cfg.visibleKeys.filter(k => k !== key);
            await cfg.update({ visibleKeys: visibleKeys.length > 0 ? visibleKeys : null });
        }
        const list = await RateCurrency.findAll({ order: [['sortOrder', 'ASC'], ['key', 'ASC']] });
        res.json({ data: list.map(r => ({ key: r.key, label: r.label, apiKeys: r.apiKeys || [], sortOrder: r.sortOrder })) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { RateAdjustment, RateCurrency, TickerConfig, PanelSetting } = require('../models');
const defaultRateCurrencies = require('../lib/defaultRateCurrencies');
const logger = require('../config/logger');
const { getNavasanApiKey, navasanLatestUrl, normalizeNavasanApiKey, navasanUsageUrl, navasanApiErrorMessage } = require('../lib/navasanApiKey');
const {
    getRatesApiCredentials,
    applyRatesApiKeyUpdates,
    publicRatesApiFlags
} = require('../lib/ratesApiProvider');
const {
    pickValue,
    pickChange,
    applyAdjustment,
    fetchRawNavasan,
    getLastRatesCache,
    clearRatesCaches
} = require('../lib/ratesSnapshot');
const { requireFxModule } = require('../lib/planLimits');

router.use(requireFxModule);

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

// GET /api/rates/config-status — وضعیت توکن‌ها (نوسان / الان چند)
router.get('/config-status', async (req, res, _next) => {
    if (!req.canAccess('rates')) return res.status(403).json({ error: 'دسترسی ندارید' });
    const creds = await getRatesApiCredentials();
    const settings = await require('../services/panelSettingsLoader').getPanelSettings();
    res.json({
        hasApiKey: creds.hasApiKey,
        source: creds.provider || 'none',
        activeProvider: creds.provider,
        ...publicRatesApiFlags(settings)
    });
});

function ratesTestCooldownCheck(map, userId, ms) {
    if (!userId) return null;
    const last = map.get(userId) || 0;
    if (Date.now() - last < ms) {
        const waitSec = Math.ceil((ms - (Date.now() - last)) / 1000);
        return `برای جلوگیری از اسپم، ${waitSec} ثانیه صبر کنید و دوباره امتحان کنید.`;
    }
    return null;
}

const ratesTestNavasanCooldown = new Map();
const ratesTestAlanChandCooldown = new Map();
const RATES_TEST_COOLDOWN_MS = 30000;

// PUT /api/rates/api-keys — ذخیره توکن نوسان / الان چند و منبع فعال
router.put('/api-keys', async (req, res, next) => {
    try {
        if (!req.canAccess('rates')) return res.status(403).json({ error: 'دسترسی ندارید' });
        const [row] = await PanelSetting.findOrCreate({
            where: { id: 'default' },
            defaults: { id: 'default' }
        });
        applyRatesApiKeyUpdates(row, req.body || {});
        await row.save();
        clearRatesCaches();
        const creds = await getRatesApiCredentials();
        res.json({ ok: true, hasApiKey: creds.hasApiKey, activeProvider: creds.provider, ...publicRatesApiFlags(row) });
    } catch (err) {
        next(err);
    }
});

router.post('/test-navasan', async (req, res, next) => {
    try {
        if (!req.canAccess('rates')) return res.status(403).json({ error: 'دسترسی ندارید' });
        const userId = req.user && req.user.id;
        const wait = ratesTestCooldownCheck(ratesTestNavasanCooldown, userId, RATES_TEST_COOLDOWN_MS);
        if (wait) return res.status(429).json({ error: wait });
        const hasKeyField = req.body && Object.prototype.hasOwnProperty.call(req.body, 'navasanApiKey');
        const keyInput = hasKeyField ? normalizeNavasanApiKey(req.body.navasanApiKey) : '';
        const creds = await getRatesApiCredentials();
        const apiKey = keyInput ? keyInput : creds.navasanKey;
        if (!apiKey) return res.status(400).json({ error: 'کلید API نوسان تنظیم نشده است.' });
        const url = navasanLatestUrl(apiKey);
        const r = await axios.get(url, { timeout: 12000, validateStatus: () => true });
        if (r.status !== 200) {
            return res.status(r.status === 429 ? 429 : 400).json({ error: navasanApiErrorMessage(r.status, r.data) });
        }
        const hasData = r.data && typeof r.data === 'object' && Object.keys(r.data).length > 0;
        if (!hasData) return res.status(502).json({ error: 'پاسخ API نوسان خالی بود.' });
        let usageNote = '';
        const usageUrl = navasanUsageUrl(apiKey);
        if (usageUrl) {
            try {
                const u = await axios.get(usageUrl, { timeout: 8000, validateStatus: () => true });
                if (u.status === 200 && u.data && u.data.monthly_usage != null) {
                    usageNote = ` مصرف ماه جاری: ${u.data.monthly_usage} درخواست.`;
                }
            } catch (_) { /* optional */ }
        }
        if (userId) ratesTestNavasanCooldown.set(userId, Date.now());
        return res.json({ ok: true, message: `اتصال به API نوسان برقرار است.${usageNote}` });
    } catch (err) {
        next(err);
    }
});

router.post('/test-alanchand', async (req, res, next) => {
    try {
        if (!req.canAccess('rates')) return res.status(403).json({ error: 'دسترسی ندارید' });
        const userId = req.user && req.user.id;
        const wait = ratesTestCooldownCheck(ratesTestAlanChandCooldown, userId, RATES_TEST_COOLDOWN_MS);
        if (wait) return res.status(429).json({ error: wait });
        const {
            normalizeAlanChandApiKey,
            fetchAlanChandLatest,
            mapAlanChandToNavasanShape
        } = require('../lib/alanChandApi');
        const hasKeyField = req.body && Object.prototype.hasOwnProperty.call(req.body, 'alanChandApiKey');
        const keyInput = hasKeyField ? normalizeAlanChandApiKey(req.body.alanChandApiKey) : '';
        const creds = await getRatesApiCredentials();
        const apiKey = keyInput ? keyInput : creds.alanChandKey;
        if (!apiKey) return res.status(400).json({ error: 'توکن API الان چند تنظیم نشده است.' });
        const result = await fetchAlanChandLatest(apiKey, { type: 'currency', symbols: ['usd'] });
        if (result.status !== 200) {
            return res.status(result.status === 429 ? 429 : 400).json({ error: result.error || 'اتصال به API الان چند ناموفق بود.' });
        }
        const mapped = mapAlanChandToNavasanShape(result.raw, 'currency');
        if (!mapped || Object.keys(mapped).length === 0) {
            return res.status(502).json({ error: 'پاسخ API الان چند خالی یا ناشناخته بود.' });
        }
        if (userId) ratesTestAlanChandCooldown.set(userId, Date.now());
        return res.json({ ok: true, message: 'اتصال به API الان چند برقرار است.' });
    } catch (err) {
        next(err);
    }
});

// GET /api/rates — نرخ‌ها از API + اعمال تعدیلات
router.get('/', async (req, res, _next) => {
    if (!req.canAccess('rates')) return res.status(403).json({ error: 'دسترسی ندارید' });
    try {
        const RATES_KEYS = await getRatesKeys();
        const { raw: fetchedRaw, hasApiKey, provider } = await fetchRawNavasan();
        const raw = fetchedRaw && Object.keys(fetchedRaw).length ? fetchedRaw : (getLastRatesCache() || {});
        void hasApiKey;
        const adjustments = {};
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

        let items = visibleKeys
            ? visibleKeys.map(k => allItems.find(i => i.key === k)).filter(Boolean)
            : allItems;

        const tickerDisplay = 'toman';

        const ts = raw.usd_sell && raw.usd_sell.timestamp ? raw.usd_sell.timestamp : null;
        const updatedAt = ts ? new Date(ts * 1000).toISOString() : new Date().toISOString();
        res.json({
            items,
            allItems,
            visibleKeys: visibleKeys || RATES_KEYS.map(r => r.key),
            updatedAt,
            updatedAtTimestamp: ts || null,
            tickerDisplay,
            provider: provider || null
        });
    } catch (err) {
        const fallback = defaultRateCurrencies.map(({ key, label }) => ({ key, label, value: '—', change: null }));
        res.status(502).json({
            error: 'دریافت قیمت‌ها ناموفق بود',
            items: fallback,
            tickerDisplay: 'toman'
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

/** استخراج آرایه سطرها از پاسخ نوسان (آرایه خام یا { data } یا خطا) */
function normalizeNavasanRows(body) {
    if (body == null) return [];
    if (Array.isArray(body)) return body;
    if (body.data != null && Array.isArray(body.data)) return body.data;
    return [];
}

function parseNumericNavasanField(v) {
    if (v == null) return NaN;
    if (typeof v === 'string') return parseFloat(v.replace(/[^\d.-]/g, ''));
    const n = Number(v);
    return isNaN(n) ? NaN : n;
}

/** یک نقطه در روز از پاسخ ohlcSearch (ترجیح close) */
function pointsFromOhlcRows(rows) {
    const byDate = new Map();
    for (const row of rows) {
        if (!row || row.date == null) continue;
        const dateStr = String(row.date).trim().split(/\s+/)[0];
        if (!dateStr) continue;
        const raw = row.close != null ? row.close : (row.value != null ? row.value : row.open);
        const num = parseNumericNavasanField(raw);
        if (isNaN(num)) continue;
        const ts = row.timestamp != null ? Number(row.timestamp) : 0;
        byDate.set(dateStr, { date: dateStr, timestamp: ts, value: num });
    }
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Fallback: dailyCurrency برای هر روز (کمتر ترجیح داده می‌شود — مصرف API بالا) */
async function fetchHistoryViaDaily(item, dayEntries, baseUrl) {
    const BATCH_SIZE = 5;
    const results = new Array(dayEntries.length).fill(null);
    for (let batch = 0; batch < dayEntries.length; batch += BATCH_SIZE) {
        const chunk = dayEntries.slice(batch, batch + BATCH_SIZE);
        const promises = chunk.map(entry =>
            axios.get(baseUrl + '&date=' + encodeURIComponent(entry.jalali), { timeout: 8000 })
                .then(r => {
                    const data = normalizeNavasanRows(r.data);
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
        if (batch + BATCH_SIZE < dayEntries.length) {
            await new Promise(r => setTimeout(r, 120));
        }
    }
    return results.filter(Boolean);
}

// GET /api/rates/history — داده تاریخی برای چارت (item یا key ارز، days تعداد روز)
router.get('/history', async (req, res, next) => {
    try {
        if (!req.canAccess('rates')) return res.status(403).json({ error: 'دسترسی ندارید' });
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

        const apiKey = await getNavasanApiKey();
        if (!apiKey) {
            const responseData = {
                key,
                item,
                points: [],
                externalConfigured: false,
                adjustmentApplied: false,
                cachedAt: new Date().toISOString(),
            };
            historyCache.set(cacheKey, { ts: Date.now(), data: responseData });
            return res.json(responseData);
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dayEntries = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            dayEntries.push({ date: d, jalali: toJalaliDate(d) });
        }
        const startJ = dayEntries[0].jalali;
        const endJ = dayEntries[dayEntries.length - 1].jalali;

        let points = [];
        let source = 'ohlc';

        try {
            const ohlcUrl = `https://api.navasan.tech/ohlcSearch/?api_key=${encodeURIComponent(apiKey)}&item=${encodeURIComponent(item)}&start=${encodeURIComponent(startJ)}&end=${encodeURIComponent(endJ)}`;
            const ohlcRes = await axios.get(ohlcUrl, { timeout: 20000 });
            const rows = normalizeNavasanRows(ohlcRes.data);
            if (rows.length === 0 && ohlcRes.data && typeof ohlcRes.data === 'object' && ohlcRes.data.message) {
                logger.warn('Navasan ohlcSearch empty or error', { key, item, message: ohlcRes.data.message });
            }
            points = pointsFromOhlcRows(rows);
        } catch (e) {
            logger.warn('Navasan ohlcSearch request failed', { key, item, error: e.message || e.code });
        }

        if (points.length === 0) {
            source = 'daily';
            const baseUrl = `https://api.navasan.tech/dailyCurrency/?api_key=${encodeURIComponent(apiKey)}&item=${encodeURIComponent(item)}`;
            points = await fetchHistoryViaDaily(item, dayEntries, baseUrl);
        }

        let adjustment = null;
        try {
            adjustment = await RateAdjustment.findOne({ where: { currencyKey: key } });
        } catch (_) {}
        const adjustmentApplied = !!(adjustment && adjustment.adjustmentType && adjustment.adjustmentType !== 'none');
        if (adjustmentApplied && points.length > 0) {
            points = points.map((p) => ({
                ...p,
                value: applyAdjustment(p.value, adjustment),
                rawValue: p.value,
            }));
        }

        const responseData = {
            key,
            item,
            points,
            source,
            adjustmentApplied,
            cachedAt: new Date().toISOString(),
            externalConfigured: true,
        };

        historyCache.set(cacheKey, { ts: Date.now(), data: responseData });

        res.json(responseData);
    } catch (err) {
        next(err);
    }
});

// GET /api/rates/health — تست دسترسی به API خارجی (نیاز به auth دارد)
router.get('/health', async (req, res, _next) => {
    const creds = await getRatesApiCredentials();
    if (!creds.hasApiKey) return res.json({ ok: false, external: false, error: 'API key not configured', provider: null });
    try {
        const { raw, hasApiKey, provider } = await fetchRawNavasan();
        const hasData = raw && typeof raw === 'object' && Object.keys(raw).length > 0;
        res.json({ ok: true, external: hasData, hasApiKey, provider: provider || creds.provider });
    } catch (e) {
        logger.warn('Rates health check failed', { error: e.message });
        res.json({ ok: false, external: false, error: 'External API unavailable', provider: creds.provider });
    }
});

// GET /api/rates/adjustments — لیست تعدیلات (فقط برای کسی که دسترسی نرخ ارز دارد)
router.get('/adjustments', async (req, res, next) => {
    try {
        if (!req.canAccess('rates')) return res.status(403).json({ error: 'دسترسی به بخش نرخ ارز ندارید' });
        const RATES_KEYS = await getRatesKeys();
        const rows = await RateAdjustment.findAll({ order: [['currencyKey', 'ASC']] });
        const map = {};
        rows.forEach(r => { map[r.currencyKey] = { currencyKey: r.currencyKey, adjustmentType: r.adjustmentType || 'none', value: r.value != null ? Number(r.value) : null }; });
        RATES_KEYS.forEach(({ key }) => { if (!map[key]) map[key] = { currencyKey: key, adjustmentType: 'none', value: null }; });
        res.json({ data: Object.values(map) });
    } catch (err) {
        next(err);
    }
});

// PUT /api/rates/adjustments — ذخیره تعدیلات
router.put('/adjustments', async (req, res, next) => {
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
        next(err);
    }
});

// GET /api/rates/ticker-config — ارزهای قابل نمایش در نوار قیمت
router.get('/ticker-config', async (req, res, next) => {
    try {
        const RATES_KEYS = await getRatesKeys();
        const cfg = await TickerConfig.findByPk('default');
        const visibleKeys = (cfg && cfg.visibleKeys && Array.isArray(cfg.visibleKeys)) ? cfg.visibleKeys : RATES_KEYS.map(r => r.key);
        res.json({ visibleKeys, availableKeys: RATES_KEYS.map(r => ({ key: r.key, label: r.label })) });
    } catch (err) {
        next(err);
    }
});

// PUT /api/rates/ticker-config — ذخیره ارزهای قابل نمایش (فقط با دسترسی rates)
router.put('/ticker-config', async (req, res, next) => {
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
        next(err);
    }
});

// ————— مدیریت ارزها (فقط با دسترسی rates) —————

// GET /api/rates/currencies — لیست ارزهای قابل ویرایش
router.get('/currencies', async (req, res, next) => {
    try {
        if (!req.canAccess('rates')) return res.status(403).json({ error: 'دسترسی به بخش نرخ ارز ندارید' });
        const list = await RateCurrency.findAll({ order: [['sortOrder', 'ASC'], ['key', 'ASC']] });
        const data = (list && list.length > 0)
            ? list.map(r => ({ key: r.key, label: r.label || '', apiKeys: Array.isArray(r.apiKeys) ? r.apiKeys : [], sortOrder: r.sortOrder != null ? r.sortOrder : 0 }))
            : defaultRateCurrencies.map(({ key, label, apiKeys, sortOrder }) => ({ key, label, apiKeys: apiKeys || [], sortOrder: sortOrder != null ? sortOrder : 0 }));
        res.json({ data });
    } catch (err) {
        next(err);
    }
});

// POST /api/rates/currencies — افزودن ارز
router.post('/currencies', async (req, res, next) => {
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
        next(err);
    }
});

// PUT /api/rates/currencies/:key — ویرایش ارز
router.put('/currencies/:key', async (req, res, next) => {
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
        next(err);
    }
});

// DELETE /api/rates/currencies/:key — حذف ارز
router.delete('/currencies/:key', async (req, res, next) => {
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
        next(err);
    }
});

module.exports = router;

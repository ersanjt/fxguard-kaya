/**
 * Alan Chand («الان چند») live prices — Bearer token, maps into Navasan-shaped snapshot.
 * Docs: GET https://api.alanchand.com?type=currency|gold|crypto&symbols=usd,eur
 * Header: Authorization: Bearer TOKEN
 */

const axios = require('axios');
const { getPanelSettings } = require('../services/panelSettingsLoader');

const ALANCHAND_BASE = 'https://api.alanchand.com';
const ALANCHAND_CACHE_TTL_MS = 10 * 60 * 1000;

const CURRENCY_SYMBOLS = [
    'usd', 'eur', 'gbp', 'chf', 'cad', 'aud', 'jpy', 'try',
    'aed', 'sar', 'kwd', 'iqd', 'rub', 'azn', 'cny', 'inr'
];
const GOLD_SYMBOLS = ['18ayar', 'geram18', '18', 'gold18'];

/** CRM / Navasan keys that should receive the sell (or single) price. */
const SYMBOL_SELL_KEYS = {
    usd: ['usd_sell', 'usd'],
    eur: ['eur', 'mex_eur_sell'],
    gbp: ['gbp', 'gbp_hav'],
    chf: ['chf', 'chf_sell', 'chf_hav'],
    cad: ['cad', 'cad_sell', 'cad_hav'],
    aud: ['aud', 'aud_sell', 'aud_hav'],
    jpy: ['jpy', 'jpy_sell', 'jpy_hav'],
    try: ['try', 'try_hav'],
    aed: ['aed_sell', 'dirham_dubai', 'aed'],
    sar: ['sar', 'sar_sell', 'sar_hav'],
    kwd: ['kwd', 'kwd_sell', 'kwd_hav'],
    iqd: ['iqd', 'iqd_sell', 'iqd_hav'],
    rub: ['rub'],
    azn: ['azn'],
    cny: ['cny', 'cny_hav'],
    inr: ['inr', 'inr_sell', 'inr_hav'],
    '18ayar': ['18ayar'],
    geram18: ['18ayar'],
    '18': ['18ayar'],
    gold18: ['18ayar'],
    gold: ['18ayar']
};

const SYMBOL_BUY_KEYS = {
    usd: ['usd_buy']
};

const GOLD_SYMBOLS_SET = new Set(['18ayar', 'geram18', '18', 'gold18', 'gold']);

let alanChandCache = { at: 0, raw: null };

function normalizeAlanChandApiKey(raw) {
    if (raw == null) return '';
    let k = String(raw)
        .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
        .trim();
    if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
        k = k.slice(1, -1).trim();
    }
    k = k.replace(/^Bearer\s+/i, '').trim();
    const urlMatch = k.match(/[?&](?:api_?token|token|api_key)=([^&\s#]+)/i);
    if (urlMatch) {
        try {
            k = decodeURIComponent(urlMatch[1]);
        } catch (_) {
            k = urlMatch[1];
        }
    }
    return k.trim();
}

async function getAlanChandApiKey() {
    try {
        const s = await getPanelSettings();
        const fromPanel = normalizeAlanChandApiKey(s.alanChandApiKey);
        if (fromPanel) return fromPanel;
    } catch (_) { /* ignore */ }
    return normalizeAlanChandApiKey(process.env.ALANCHAND_API_KEY);
}

function alanChandUrl(type, symbols) {
    const list = Array.isArray(symbols) ? symbols.join(',') : String(symbols || '');
    return `${ALANCHAND_BASE}?type=${encodeURIComponent(type)}&symbols=${encodeURIComponent(list)}`;
}

function parseAlanChandNumber(v) {
    if (v == null || v === '') return NaN;
    if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
    if (typeof v === 'object') {
        if (v.price != null) return parseAlanChandNumber(v.price);
        if (v.value != null) return parseAlanChandNumber(v.value);
        if (v.sell != null) return parseAlanChandNumber(v.sell);
        return NaN;
    }
    const n = Number(String(v).replace(/,/g, '').replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : NaN;
}

function pickRecordField(rec, names) {
    if (!rec || typeof rec !== 'object') return NaN;
    for (let i = 0; i < names.length; i++) {
        const n = parseAlanChandNumber(rec[names[i]]);
        if (!Number.isNaN(n)) return n;
    }
    return NaN;
}

/**
 * Gold on Alan Chand is often IRR; CRM/Navasan gold (18ayar) is toman.
 * Values already in toman stay unchanged.
 */
function maybeTomanFromRial(num, isGold) {
    if (!isGold || num == null || !Number.isFinite(num)) return num;
    if (num >= 50000000) return num / 10;
    return num;
}

function extractAlanChandRecords(body) {
    if (body == null) return [];
    if (Array.isArray(body)) return body.filter(Boolean);
    if (typeof body !== 'object') return [];
    if (Array.isArray(body.data)) return body.data.filter(Boolean);
    if (Array.isArray(body.result)) return body.result.filter(Boolean);
    if (Array.isArray(body.items)) return body.items.filter(Boolean);
    if (Array.isArray(body.prices)) return body.prices.filter(Boolean);
    const nested = body.data && typeof body.data === 'object' && !Array.isArray(body.data)
        ? body.data
        : body;
    const skip = new Set([
        'ok', 'success', 'status', 'message', 'error', 'errors', 'type',
        'updated_at', 'updatedAt', 'timestamp', 'time', 'meta', 'pagination'
    ]);
    return Object.keys(nested)
        .filter((k) => !skip.has(k))
        .map((k) => {
            const v = nested[k];
            if (v == null) return null;
            if (typeof v === 'object' && !Array.isArray(v)) {
                return Object.assign({ symbol: v.symbol || v.slug || v.code || v.key || k }, v);
            }
            if (typeof v === 'number' || typeof v === 'string') {
                return { symbol: k, price: v };
            }
            return null;
        })
        .filter(Boolean);
}

function recordSymbol(rec) {
    const raw = rec && (rec.symbol || rec.slug || rec.code || rec.key || rec.name || rec.id);
    return raw != null ? String(raw).trim().toLowerCase() : '';
}

/**
 * Convert Alan Chand JSON into Navasan latest-shaped map: { usd_sell: { value, change, timestamp }, ... }
 */
function mapAlanChandToNavasanShape(body, type) {
    const ts = Math.floor(Date.now() / 1000);
    const out = {};
    const records = extractAlanChandRecords(body);
    const isGoldType = type === 'gold';

    records.forEach((rec) => {
        const symbol = recordSymbol(rec);
        if (!symbol) return;
        const sellKeys = SYMBOL_SELL_KEYS[symbol];
        if (!sellKeys) {
            const sell = pickRecordField(rec, ['sell', 'sellPrice', 'sell_price', 'price', 'value', 'price_sell']);
            if (!Number.isNaN(sell)) {
                out[symbol] = { value: sell, change: null, timestamp: ts };
            }
            return;
        }
        const isGold = isGoldType || GOLD_SYMBOLS_SET.has(symbol);
        let sell = pickRecordField(rec, ['sell', 'sellPrice', 'sell_price', 'price', 'value', 'price_sell', 'high']);
        if (Number.isNaN(sell) && typeof rec === 'object' && rec.price == null) {
            sell = parseAlanChandNumber(rec);
        }
        if (Number.isNaN(sell)) return;
        sell = maybeTomanFromRial(sell, isGold);
        const change = pickRecordField(rec, ['change', 'changeValue', 'change_value', 'd', 'percent', 'daily_change']);
        const buy = pickRecordField(rec, ['buy', 'buyPrice', 'buy_price', 'price_buy', 'low']);
        sellKeys.forEach((k) => {
            out[k] = {
                value: sell,
                change: Number.isNaN(change) ? null : change,
                timestamp: ts
            };
        });
        const buyKeys = SYMBOL_BUY_KEYS[symbol] || [];
        if (!Number.isNaN(buy)) {
            const buyVal = maybeTomanFromRial(buy, isGold);
            buyKeys.forEach((k) => {
                out[k] = { value: buyVal, change: Number.isNaN(change) ? null : change, timestamp: ts };
            });
        }
    });
    return out;
}

function alanChandApiErrorMessage(status, body) {
    let detail = '';
    if (typeof body === 'string') detail = body.trim();
    else if (body && (body.message || body.error)) detail = String(body.message || body.error).trim();

    if (status === 401 || status === 403) {
        return 'توکن API الان چند نامعتبر است. توکن را از alanchand.com بدون فاصله اضافه وارد کنید.';
    }
    if (status === 429) {
        return 'سقف درخواست API الان چند پر شده است (نسخه تستی: حدود یک بار در ساعت). چند دقیقه صبر کنید یا برای دسترسی نامحدود با الان چند تماس بگیرید.';
    }
    return detail || 'اتصال به API الان چند ناموفق بود.';
}

function getAlanChandCache() {
    if (alanChandCache.raw && Date.now() - alanChandCache.at < ALANCHAND_CACHE_TTL_MS) {
        return alanChandCache.raw;
    }
    return null;
}

function setAlanChandCache(raw) {
    alanChandCache = { at: Date.now(), raw: raw && typeof raw === 'object' ? raw : null };
}

function clearAlanChandCache() {
    alanChandCache = { at: 0, raw: null };
}

async function fetchAlanChandLatest(apiKey, opts) {
    const key = normalizeAlanChandApiKey(apiKey);
    if (!key) return { raw: null, status: 0, error: 'توکن API الان چند تنظیم نشده است.' };
    const headers = { Authorization: 'Bearer ' + key, Accept: 'application/json' };
    const timeout = (opts && opts.timeout) || 12000;
    const symbols = (opts && opts.symbols) || CURRENCY_SYMBOLS;
    const type = (opts && opts.type) || 'currency';
    const url = alanChandUrl(type, symbols);
    const r = await axios.get(url, { headers, timeout, validateStatus: () => true });
    return { raw: r.data, status: r.status, error: r.status === 200 ? null : alanChandApiErrorMessage(r.status, r.data) };
}

async function fetchRawAlanChand(apiKey) {
    const cached = getAlanChandCache();
    if (cached) return { raw: cached, fromCache: true, ok: true };

    const key = normalizeAlanChandApiKey(apiKey);
    const [currencyRes, goldRes] = await Promise.all([
        fetchAlanChandLatest(key, { type: 'currency', symbols: CURRENCY_SYMBOLS }),
        fetchAlanChandLatest(key, { type: 'gold', symbols: GOLD_SYMBOLS })
    ]);

    const merged = {};
    if (currencyRes.status === 200) {
        Object.assign(merged, mapAlanChandToNavasanShape(currencyRes.raw, 'currency'));
    }
    if (goldRes.status === 200) {
        Object.assign(merged, mapAlanChandToNavasanShape(goldRes.raw, 'gold'));
    }

    if (Object.keys(merged).length > 0) {
        setAlanChandCache(merged);
        return { raw: merged, fromCache: false, ok: true, status: 200 };
    }

    const failed = currencyRes.status !== 200 ? currencyRes : goldRes;
    return {
        raw: null,
        fromCache: false,
        ok: false,
        status: failed.status || 502,
        error: failed.error || 'پاسخ API الان چند خالی بود.'
    };
}

module.exports = {
    ALANCHAND_BASE,
    CURRENCY_SYMBOLS,
    GOLD_SYMBOLS,
    normalizeAlanChandApiKey,
    getAlanChandApiKey,
    alanChandUrl,
    parseAlanChandNumber,
    extractAlanChandRecords,
    mapAlanChandToNavasanShape,
    maybeTomanFromRial,
    alanChandApiErrorMessage,
    fetchAlanChandLatest,
    fetchRawAlanChand,
    getAlanChandCache,
    clearAlanChandCache
};

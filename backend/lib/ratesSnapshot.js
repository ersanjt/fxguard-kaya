/**
 * اسنپ‌شات نرخ ارز (نواسان + تعدیلات + تیکر)
 * مشترک بین API داشبورد و بات تلگرام — با کش آخرین پاسخ موفق
 */

const axios = require('axios');
const logger = require('../config/logger');
const defaultRateCurrencies = require('./defaultRateCurrencies');
const { navasanLatestUrl } = require('./navasanApiKey');
const { getRatesApiCredentials } = require('./ratesApiProvider');
const { fetchRawAlanChand, clearAlanChandCache } = require('./alanChandApi');
const { ensureTenantCurrencies, loadTickerConfig } = require('./tenantRates');

const lastRatesByTenant = new Map();

function tenantCacheKey() {
    const { getCurrentTenantId } = require('./tenantContext');
    return String(getCurrentTenantId() || 'platform');
}

function pickValue(raw, apiKeys) {
    const keys = Array.isArray(apiKeys) ? apiKeys : [];
    for (const k of keys) {
        const obj = raw && raw[k];
        if (!obj) continue;
        let v = obj.value;
        if (v == null) continue;
        if (typeof v === 'string') v = parseFloat(v.replace(/[^\d.-]/g, ''));
        const num = Number(v);
        if (!Number.isNaN(num)) return num;
    }
    return null;
}

function pickChange(raw, apiKeys) {
    const keys = Array.isArray(apiKeys) ? apiKeys : [];
    for (const k of keys) {
        const v = raw && raw[k] && raw[k].change != null ? raw[k].change : null;
        if (v != null && !Number.isNaN(Number(v))) return Number(v);
    }
    return null;
}

/**
 * @param {number|null} rawNum
 * @param {{ adjustmentType?: string, value?: number }|null} adj
 * @returns {number|null}
 */
function applyAdjustment(rawNum, adj) {
    if (!adj || adj.adjustmentType === 'none' || adj.adjustmentType == null) {
        return rawNum != null && Number.isFinite(Number(rawNum)) ? Number(rawNum) : null;
    }
    const val = adj.value != null ? Number(adj.value) : NaN;
    if (adj.adjustmentType === 'fixed') {
        if (!Number.isFinite(val)) {
            return rawNum != null && Number.isFinite(Number(rawNum)) ? Number(rawNum) : null;
        }
        // fixed=0 بدون قیمت بازار تقریباً همیشه misconfig است؛ قیمت زنده را نگه دار
        if (val === 0 && rawNum != null && Number(rawNum) > 0) return Number(rawNum);
        return val;
    }
    if (rawNum == null || !Number.isFinite(Number(rawNum))) return null;
    if (adj.adjustmentType === 'delta_toman') {
        return Number.isFinite(val) ? Number(rawNum) + val : Number(rawNum);
    }
    if (adj.adjustmentType === 'percent') {
        return Number.isFinite(val) ? Number(rawNum) * (1 + val / 100) : Number(rawNum);
    }
    return Number(rawNum);
}

async function fetchRawNavasanOnly(apiKey) {
    const latestUrl = navasanLatestUrl(apiKey);
    if (!latestUrl) return null;
    return axios.get(latestUrl, { timeout: 12000 }).then((r) => r.data || {}).catch((e) => {
        logger.warn('Navasan API error', { error: e.message || e.code });
        return null;
    });
}

async function fetchRawNavasan() {
    const creds = await getRatesApiCredentials();
    const hasApiKey = creds.hasApiKey;
    let raw = null;
    const provider = creds.provider;

    const bucket = tenantCacheKey();
    if (provider === 'alanchand') {
        const alan = await fetchRawAlanChand(creds.alanChandKey);
        if (alan.ok && alan.raw && Object.keys(alan.raw).length > 0) {
            lastRatesByTenant.set(bucket, alan.raw);
            return { raw: alan.raw, fromCache: !!alan.fromCache, hasApiKey, provider: 'alanchand' };
        }
        logger.warn('Alan Chand API error', { error: alan.error || 'empty' });
        if (creds.navasanKey) {
            raw = await fetchRawNavasanOnly(creds.navasanKey);
            if (raw && typeof raw === 'object' && Object.keys(raw).length > 0) {
                lastRatesByTenant.set(bucket, raw);
                return { raw, fromCache: false, hasApiKey, provider: 'navasan' };
            }
        }
    } else if (provider === 'navasan') {
        raw = await fetchRawNavasanOnly(creds.navasanKey);
    } else {
        logger.warn('Rates API key not set — using cached rates only');
    }

    if (raw && typeof raw === 'object' && Object.keys(raw).length > 0) {
        lastRatesByTenant.set(bucket, raw);
        return { raw, fromCache: false, hasApiKey, provider: provider || 'navasan' };
    }
    const cached = lastRatesByTenant.get(bucket);
    return {
        raw: cached && typeof cached === 'object' ? cached : {},
        fromCache: !!(cached && Object.keys(cached).length),
        hasApiKey,
        provider: provider || null
    };
}

function clearRatesCaches() {
    lastRatesByTenant.delete(tenantCacheKey());
    // فقط کش همین سازمان؛ clear() سراسری نرخ بقیهٔ شرکت‌ها را بی‌دلیل باطل می‌کرد
    Promise.resolve()
        .then(async () => {
            const { getAlanChandApiKey } = require('./alanChandApi');
            const key = await getAlanChandApiKey();
            if (key) clearAlanChandCache(key);
        })
        .catch(() => {});
}

async function getRatesKeys(models) {
    const RateCurrency = models && models.RateCurrency;
    if (RateCurrency) return ensureTenantCurrencies(RateCurrency);
    return defaultRateCurrencies.map(({ key, label, apiKeys }) => ({
        key,
        label,
        apiKeys: apiKeys || []
    }));
}

/**
 * @param {object} opts
 * @param {object} [opts.models]
 * @param {boolean} [opts.onlyPositive] — برای تلگرام: صفر و منفی را حذف کن
 * @param {boolean} [opts.respectVisible]
 */
async function buildRatesSnapshot(opts = {}) {
    const models = opts.models || require('../models');
    const onlyPositive = !!opts.onlyPositive;
    const respectVisible = opts.respectVisible !== false;

    const { raw, fromCache, hasApiKey, provider } = await fetchRawNavasan();
    const RATES_KEYS = await getRatesKeys(models);

    const adjustments = {};
    try {
        const { RateAdjustment } = models;
        if (RateAdjustment) {
            const rows = await RateAdjustment.findAll();
            rows.forEach((r) => {
                adjustments[r.currencyKey] = r;
            });
        }
    } catch (dbErr) {
        logger.warn('RateAdjustment error', { error: dbErr.message });
    }

    let visibleKeys = null;
    if (respectVisible) {
        try {
            const { TickerConfig } = models;
            if (TickerConfig) {
                const cfg = await loadTickerConfig(TickerConfig);
                if (cfg && cfg.visibleKeys && Array.isArray(cfg.visibleKeys) && cfg.visibleKeys.length > 0) {
                    visibleKeys = cfg.visibleKeys;
                }
            }
        } catch (_) {
            /* ignore */
        }
    }

    const allItems = RATES_KEYS.map(({ key, label, apiKeys }) => {
        const rawVal = pickValue(raw, apiKeys);
        const change = pickChange(raw, apiKeys);
        const adj = adjustments[key];
        const finalVal = applyAdjustment(rawVal, adj);
        return {
            key,
            label,
            value: finalVal,
            change: change != null ? change : null,
            rawValue: rawVal
        };
    });

    let items = visibleKeys
        ? visibleKeys.map((k) => allItems.find((i) => i.key === k)).filter(Boolean)
        : allItems;

    if (onlyPositive) {
        items = items.filter((i) => i.value != null && Number.isFinite(Number(i.value)) && Number(i.value) > 0);
    }

    const ts = raw.usd_sell && raw.usd_sell.timestamp ? raw.usd_sell.timestamp : null;
    const updatedAt = ts ? new Date(ts * 1000).toISOString() : new Date().toISOString();

    return {
        items,
        allItems,
        updatedAt,
        fromCache,
        hasApiKey,
        provider: provider || null,
        hasLiveData: !!(raw && Object.keys(raw).length > 0)
    };
}

function getLastRatesCache() {
    return lastRatesByTenant.get(tenantCacheKey()) || null;
}

module.exports = {
    pickValue,
    pickChange,
    applyAdjustment,
    fetchRawNavasan,
    buildRatesSnapshot,
    getLastRatesCache,
    clearRatesCaches
};

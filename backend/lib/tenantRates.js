/**
 * ارز، تعدیل و تیکر هر سازمان — کپی پیش‌فرض فقط وقتی جدول آن سازمان خالی است.
 */
'use strict';

const defaultRateCurrencies = require('./defaultRateCurrencies');
const { getCurrentTenantId, getPanelSettingsKey } = require('./tenantContext');

function mapCurrency(row) {
    const src = row && row.get ? row.get({ plain: true }) : row;
    return {
        key: src.key,
        label: src.label || src.key,
        apiKeys: Array.isArray(src.apiKeys) ? src.apiKeys : src.apiKeys ? [src.apiKeys] : [],
        sortOrder: src.sortOrder != null ? src.sortOrder : 0,
    };
}

async function ensureTenantCurrencies(RateCurrency) {
    const order = [
        ['sortOrder', 'ASC'],
        ['key', 'ASC'],
    ];
    let rows = await RateCurrency.findAll({ order });
    if (rows && rows.length) return rows.map(mapCurrency);
    if (!getCurrentTenantId()) return defaultRateCurrencies.map(mapCurrency);
    try {
        await RateCurrency.bulkCreate(
            defaultRateCurrencies.map((row) => ({
                key: row.key,
                label: row.label,
                apiKeys: row.apiKeys,
                sortOrder: row.sortOrder,
            }))
        );
    } catch (err) {
        rows = await RateCurrency.findAll({ order });
        if (rows && rows.length) return rows.map(mapCurrency);
        throw err;
    }
    rows = await RateCurrency.findAll({ order });
    return rows.map(mapCurrency);
}

function tickerRowId() {
    return getPanelSettingsKey() || null;
}

async function loadTickerConfig(TickerConfig) {
    const id = tickerRowId();
    if (!id || !TickerConfig) return null;
    const [cfg] = await TickerConfig.findOrCreate({
        where: { id },
        defaults: { id, visibleKeys: null },
    });
    return cfg;
}

module.exports = {
    mapCurrency,
    ensureTenantCurrencies,
    tickerRowId,
    loadTickerConfig,
};

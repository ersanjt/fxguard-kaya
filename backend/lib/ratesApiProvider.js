/**
 * Resolve which live-rate provider to use (Navasan vs Alan Chand) and apply key updates.
 */

const { getPanelSettings } = require('../services/panelSettingsLoader');
const { getNavasanApiKey, normalizeNavasanApiKey } = require('./navasanApiKey');
const { getAlanChandApiKey, normalizeAlanChandApiKey } = require('./alanChandApi');

function normalizeRatesApiProvider(v) {
    return v === 'alanchand' ? 'alanchand' : 'navasan';
}

async function getRatesApiCredentials() {
    let preferred = 'navasan';
    try {
        const settings = await getPanelSettings();
        preferred = normalizeRatesApiProvider(settings && settings.ratesApiProvider);
    } catch (_) { /* ignore */ }
    const navasanKey = await getNavasanApiKey();
    const alanChandKey = await getAlanChandApiKey();
    let provider = null;
    if (preferred === 'alanchand' && alanChandKey) provider = 'alanchand';
    else if (preferred === 'navasan' && navasanKey) provider = 'navasan';
    else if (alanChandKey) provider = 'alanchand';
    else if (navasanKey) provider = 'navasan';
    return {
        navasanKey: navasanKey || '',
        alanChandKey: alanChandKey || '',
        preferred,
        provider,
        hasApiKey: !!(navasanKey || alanChandKey)
    };
}

function applyRatesApiKeyUpdates(row, body) {
    const b = body || {};
    if (b.navasanApiKeyClear === true) {
        row.navasanApiKey = null;
    } else if (b.navasanApiKey !== undefined && String(b.navasanApiKey).trim() !== '') {
        row.navasanApiKey = normalizeNavasanApiKey(b.navasanApiKey);
    }
    if (b.alanChandApiKeyClear === true) {
        row.alanChandApiKey = null;
    } else if (b.alanChandApiKey !== undefined && String(b.alanChandApiKey).trim() !== '') {
        row.alanChandApiKey = normalizeAlanChandApiKey(b.alanChandApiKey);
    }
    if (b.ratesApiProvider === 'alanchand' || b.ratesApiProvider === 'navasan') {
        row.ratesApiProvider = b.ratesApiProvider;
    }
}

function publicRatesApiFlags(settingsOrRow) {
    const s = settingsOrRow || {};
    const navasanSet = !!(s.navasanApiKey && String(s.navasanApiKey).trim());
    const alanSet = !!(s.alanChandApiKey && String(s.alanChandApiKey).trim());
    return {
        navasanApiKeySet: navasanSet,
        navasanApiKeyFromEnv: !!(process.env.NAVASAN_API_KEY && String(process.env.NAVASAN_API_KEY).trim()),
        alanChandApiKeySet: alanSet,
        alanChandApiKeyFromEnv: !!(process.env.ALANCHAND_API_KEY && String(process.env.ALANCHAND_API_KEY).trim()),
        ratesApiProvider: normalizeRatesApiProvider(s.ratesApiProvider)
    };
}

function stripRatesApiSecrets(obj) {
    if (!obj) return obj;
    delete obj.navasanApiKey;
    delete obj.alanChandApiKey;
    return obj;
}

module.exports = {
    normalizeRatesApiProvider,
    getRatesApiCredentials,
    applyRatesApiKeyUpdates,
    publicRatesApiFlags,
    stripRatesApiSecrets
};

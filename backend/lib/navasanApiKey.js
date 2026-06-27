/**
 * Navasan API key — panel settings first, then NAVASAN_API_KEY env fallback.
 */
const { getPanelSettings } = require('../services/panelSettingsLoader');

async function getNavasanApiKey() {
    try {
        const s = await getPanelSettings();
        const fromPanel = String(s.navasanApiKey || '').trim();
        if (fromPanel) return fromPanel;
    } catch (_) { /* ignore */ }
    return String(process.env.NAVASAN_API_KEY || '').trim();
}

function navasanLatestUrl(apiKey) {
    const key = String(apiKey || '').trim();
    return key ? `https://api.navasan.tech/latest/?api_key=${encodeURIComponent(key)}` : null;
}

module.exports = { getNavasanApiKey, navasanLatestUrl };

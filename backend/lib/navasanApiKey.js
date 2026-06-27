/**
 * Navasan API key — panel settings first, then NAVASAN_API_KEY env fallback.
 */
const { getPanelSettings } = require('../services/panelSettingsLoader');

/** Strip invisible chars / quotes / pasted URL fragments from Telegram copy-paste. */
function normalizeNavasanApiKey(raw) {
    if (raw == null) return '';
    let k = String(raw)
        .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
        .trim();
    if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
        k = k.slice(1, -1).trim();
    }
    const urlMatch = k.match(/[?&]api_key=([^&\s#]+)/i);
    if (urlMatch) {
        try {
            k = decodeURIComponent(urlMatch[1]);
        } catch (_) {
            k = urlMatch[1];
        }
    }
    return k.trim();
}

async function getNavasanApiKey() {
    try {
        const s = await getPanelSettings();
        const fromPanel = normalizeNavasanApiKey(s.navasanApiKey);
        if (fromPanel) return fromPanel;
    } catch (_) { /* ignore */ }
    return normalizeNavasanApiKey(process.env.NAVASAN_API_KEY);
}

function navasanLatestUrl(apiKey) {
    const key = normalizeNavasanApiKey(apiKey);
    return key ? `http://api.navasan.tech/latest/?api_key=${encodeURIComponent(key)}` : null;
}

function navasanUsageUrl(apiKey) {
    const key = normalizeNavasanApiKey(apiKey);
    return key ? `http://api.navasan.tech/usage/?api_key=${encodeURIComponent(key)}` : null;
}

function navasanApiErrorMessage(status, body) {
    let detail = '';
    if (typeof body === 'string') detail = body.trim();
    else if (body && body.message) detail = String(body.message).trim();

    if (status === 401 || status === 403 || /invalid api_key/i.test(detail)) {
        return 'کلید API نوسان نامعتبر است. کلید را از ربات تلگرام @navasan_contact_bot دریافت کنید و بدون فاصله اضافه وارد کنید.';
    }
    if (status === 429) {
        return 'محدودیت تعداد درخواست API نوسان — چند دقیقه صبر کنید و دوباره امتحان کنید.';
    }
    if (status === 503) {
        return detail || 'سرویس نوسان موقتاً در دسترس نیست یا سقف مصرف ماهانه/روزانه API پر شده است.';
    }
    return detail || 'اتصال به API نوسان ناموفق بود.';
}

module.exports = {
    getNavasanApiKey,
    normalizeNavasanApiKey,
    navasanLatestUrl,
    navasanUsageUrl,
    navasanApiErrorMessage
};

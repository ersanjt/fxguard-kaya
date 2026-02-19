/**
 * بارگذاری تنظیمات پنل (برای استفاده در routeها و سرویس ایمیل)
 */
const { PanelSetting } = require('../models');

const DEFAULT = {
    siteName: 'صرافی کایا',
    logoUrl: null,
    faviconUrl: null,
    loginTitle: 'پورتال کارکنان کایا',
    pageTitle: 'پورتال کارکنان کایا | صرافی کایا',
    footerText: 'صرافی کایا — پورتال کارکنان',
    smtpHost: null,
    smtpPort: null,
    smtpUser: null,
    smtpPass: null,
    smtpFrom: null,
    smtpFromName: null,
    smtpSecure: false,
    emailLoginNotification: false,
    hiddenSections: [],
    languageMode: 'trilingual'
};

function parseHiddenSections(val) {
    if (val == null || val === '') return [];
    if (Array.isArray(val)) return val;
    try {
        const arr = JSON.parse(val);
        return Array.isArray(arr) ? arr : [];
    } catch (_) { return []; }
}

async function getPanelSettings() {
    const row = await PanelSetting.findByPk('default');
    if (!row) return { ...DEFAULT };
    return {
        siteName: row.siteName != null ? row.siteName : DEFAULT.siteName,
        logoUrl: row.logoUrl || null,
        faviconUrl: row.faviconUrl || null,
        loginTitle: row.loginTitle != null ? row.loginTitle : DEFAULT.loginTitle,
        pageTitle: row.pageTitle != null ? row.pageTitle : DEFAULT.pageTitle,
        footerText: row.footerText != null ? row.footerText : DEFAULT.footerText,
        smtpHost: row.smtpHost || null,
        smtpPort: row.smtpPort || null,
        smtpUser: row.smtpUser || null,
        smtpPass: row.smtpPass || null,
        smtpFrom: row.smtpFrom || null,
        smtpFromName: row.smtpFromName || null,
        smtpSecure: row.smtpSecure === true,
        emailLoginNotification: row.emailLoginNotification === true,
        hiddenSections: parseHiddenSections(row.hiddenSections),
        languageMode: row.languageMode === 'single' || row.languageMode === 'bilingual' || row.languageMode === 'trilingual' ? row.languageMode : DEFAULT.languageMode
    };
}

/** اگر تنظیمات SMTP از پنل پر شده باشد، آبجکت config برای sendMailWithConfig برمی‌گرداند؛ وگرنه null */
function getPanelEmailConfig(settings) {
    if (!settings || !settings.smtpHost || !settings.smtpPort) return null;
    return {
        host: settings.smtpHost,
        port: settings.smtpPort,
        user: settings.smtpUser || null,
        pass: settings.smtpPass || null,
        from: settings.smtpFrom || settings.smtpUser || null,
        fromName: settings.smtpFromName || null,
        secure: !!settings.smtpSecure
    };
}

module.exports = { getPanelSettings, getPanelEmailConfig, DEFAULT, parseHiddenSections };

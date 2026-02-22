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
    showFooter: true,
    footerStyle: 'accent',
    smtpHost: null,
    smtpPort: null,
    smtpUser: null,
    smtpPass: null,
    smtpFrom: null,
    smtpFromName: null,
    smtpSecure: false,
    emailLoginNotification: false,
    hiddenSections: [],
    languageMode: 'trilingual',
    defaultLanguage: 'fa'
};

const MODE_TO_LANGUAGES = {
    single: ['fa'],
    single_en: ['en'],
    single_tr: ['tr'],
    bilingual: ['fa', 'en'],
    bilingual_fa_tr: ['fa', 'tr'],
    bilingual_en_tr: ['en', 'tr'],
    trilingual: ['fa', 'en', 'tr']
};

function getSupportedLanguagesFromMode(mode) {
    const list = MODE_TO_LANGUAGES[mode];
    return Array.isArray(list) ? list : ['fa', 'en', 'tr'];
}

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
        showFooter: row.showFooter !== false,
        footerStyle: (row.footerStyle && ['accent', 'minimal', 'compact', 'line'].indexOf(row.footerStyle) >= 0) ? row.footerStyle : DEFAULT.footerStyle,
        smtpHost: row.smtpHost || null,
        smtpPort: row.smtpPort || null,
        smtpUser: row.smtpUser || null,
        smtpPass: row.smtpPass || null,
        smtpFrom: row.smtpFrom || null,
        smtpFromName: row.smtpFromName || null,
        smtpSecure: row.smtpSecure === true,
        emailLoginNotification: row.emailLoginNotification === true,
        hiddenSections: parseHiddenSections(row.hiddenSections),
        languageMode: MODE_TO_LANGUAGES[row.languageMode] ? row.languageMode : DEFAULT.languageMode,
        defaultLanguage: (row.defaultLanguage === 'fa' || row.defaultLanguage === 'en' || row.defaultLanguage === 'tr') ? row.defaultLanguage : DEFAULT.defaultLanguage
    };
}

function getSupportedLanguages(settings) {
    const mode = settings && MODE_TO_LANGUAGES[settings.languageMode] ? settings.languageMode : DEFAULT.languageMode;
    return getSupportedLanguagesFromMode(mode);
}

/** اگر تنظیمات SMTP از پنل پر شده باشد، آبجکت config برای sendMailWithConfig برمی‌گرداند؛ وگرنه null */
function getPanelEmailConfig(settings) {
    if (!settings || !settings.smtpHost || !settings.smtpPort) return null;
    const host = (settings.smtpHost || '').replace(/\.+$/, '').trim();
    return {
        host,
        port: settings.smtpPort,
        user: settings.smtpUser || null,
        pass: settings.smtpPass || null,
        from: settings.smtpFrom || settings.smtpUser || null,
        fromName: settings.smtpFromName || null,
        secure: !!settings.smtpSecure,
        allowSelfSigned: host.includes('host.secureserver.net') || host === 'mail.fxguard.io'
    };
}

module.exports = { getPanelSettings, getPanelEmailConfig, getSupportedLanguages, getSupportedLanguagesFromMode, DEFAULT, parseHiddenSections };

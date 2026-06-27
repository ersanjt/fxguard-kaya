/**
 * Panel settings loader — used by routes and email service
 */
const { PanelSetting } = require('../../models');

const DEFAULT = {
    siteName: 'صرافی کایا',
    logoUrl: null,
    faviconUrl: null,
    loginLogoUrl: null,
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
    adminAlertsEnabled: true,
    adminAlertEmails: null,
    telegramBotToken: null,
    telegramChatIds: null,
    telegramTimeoutMs: 12000,
    clientErrorReportingEnabled: true,
    telegramNotifyAllEvents: false,
    telegramNotifyApiRequests: false,
    telegramNotifyAuthEvents: true,
    telegramNotifySocketEvents: false,
    telegramNotifyIncomingMessages: true,
    telegramNotifySystemEvents: true,
    telegramNotifyErrorEvents: true,
    hiddenSections: [],
    languageMode: 'trilingual',
    defaultLanguage: 'fa',
    primaryColor: null,
    fontFamily: null,
    fontSize: 'medium',
    fontWeight: 'normal',
    uiTheme: 'default',
    sidebarOrder: null,
    iosAppUrl: null,
    androidAppUrl: null,
    navasanApiKey: null,
};

const MODE_TO_LANGUAGES = {
    single: ['fa'],
    single_en: ['en'],
    single_tr: ['tr'],
    bilingual: ['fa', 'en'],
    bilingual_fa_tr: ['fa', 'tr'],
    bilingual_en_tr: ['en', 'tr'],
    trilingual: ['fa', 'en', 'tr'],
};

function getSupportedLanguagesFromMode(mode) {
    const list = MODE_TO_LANGUAGES[mode];
    return Array.isArray(list) ? list : ['fa', 'en', 'tr'];
}

function parseSidebarOrder(val) {
    if (val == null || val === '') return null;
    if (Array.isArray(val)) return val;
    try {
        const arr = JSON.parse(val);
        return Array.isArray(arr) ? arr : null;
    } catch (_) {
        return null;
    }
}

function parseHiddenSections(val) {
    if (val == null || val === '') return [];
    if (Array.isArray(val)) return val;
    try {
        const arr = JSON.parse(val);
        return Array.isArray(arr) ? arr : [];
    } catch (_) {
        return [];
    }
}

async function getPanelSettings() {
    const row = await PanelSetting.findByPk('default');
    if (!row) return { ...DEFAULT };
    return {
        siteName: row.siteName != null ? row.siteName : DEFAULT.siteName,
        logoUrl: row.logoUrl || null,
        faviconUrl: row.faviconUrl || null,
        loginLogoUrl: row.loginLogoUrl || null,
        loginTitle: row.loginTitle != null ? row.loginTitle : DEFAULT.loginTitle,
        pageTitle: row.pageTitle != null ? row.pageTitle : DEFAULT.pageTitle,
        footerText: row.footerText != null ? row.footerText : DEFAULT.footerText,
        showFooter: row.showFooter !== false,
        footerStyle:
            row.footerStyle &&
            ['accent', 'minimal', 'compact', 'line'].indexOf(row.footerStyle) >= 0
                ? row.footerStyle
                : DEFAULT.footerStyle,
        smtpHost: row.smtpHost || null,
        smtpPort: row.smtpPort || null,
        smtpUser: row.smtpUser || null,
        smtpPass: row.smtpPass || null,
        smtpFrom: row.smtpFrom || null,
        smtpFromName: row.smtpFromName || null,
        smtpSecure: row.smtpSecure === true,
        emailLoginNotification: row.emailLoginNotification === true,
        adminAlertsEnabled: row.adminAlertsEnabled !== false,
        adminAlertEmails: row.adminAlertEmails || null,
        telegramBotToken: row.telegramBotToken || null,
        telegramChatIds: row.telegramChatIds || null,
        telegramTimeoutMs: Number.isFinite(Number(row.telegramTimeoutMs)) ? Math.max(1000, Number(row.telegramTimeoutMs)) : DEFAULT.telegramTimeoutMs,
        clientErrorReportingEnabled: row.clientErrorReportingEnabled !== false,
        telegramNotifyAllEvents: row.telegramNotifyAllEvents === true,
        telegramNotifyApiRequests: row.telegramNotifyApiRequests === true,
        telegramNotifyAuthEvents: row.telegramNotifyAuthEvents !== false,
        telegramNotifySocketEvents: row.telegramNotifySocketEvents === true,
        telegramNotifyIncomingMessages: row.telegramNotifyIncomingMessages === true,
        telegramNotifySystemEvents: row.telegramNotifySystemEvents !== false,
        telegramNotifyErrorEvents: row.telegramNotifyErrorEvents !== false,
        hiddenSections: parseHiddenSections(row.hiddenSections),
        languageMode: MODE_TO_LANGUAGES[row.languageMode]
            ? row.languageMode
            : DEFAULT.languageMode,
        defaultLanguage:
            ['fa', 'en', 'tr'].indexOf(row.defaultLanguage) >= 0
                ? row.defaultLanguage
                : DEFAULT.defaultLanguage,
        primaryColor: row.primaryColor || null,
        fontFamily: row.fontFamily || null,
        fontSize: ['small', 'medium', 'large'].indexOf(row.fontSize) >= 0 ? row.fontSize : DEFAULT.fontSize,
        fontWeight: ['normal', 'medium', 'bold'].indexOf(row.fontWeight) >= 0 ? row.fontWeight : DEFAULT.fontWeight,
        uiTheme: ['default', 'minimal', 'dark', 'light', 'ocean', 'warm'].indexOf(row.uiTheme) >= 0 ? row.uiTheme : DEFAULT.uiTheme,
        sidebarOrder: parseSidebarOrder(row.sidebarOrder),
        iosAppUrl: row.iosAppUrl || null,
        androidAppUrl: row.androidAppUrl || null,
        navasanApiKey: row.navasanApiKey || null,
    };
}

function getSupportedLanguages(settings) {
    const mode =
        settings && MODE_TO_LANGUAGES[settings.languageMode]
            ? settings.languageMode
            : DEFAULT.languageMode;
    return getSupportedLanguagesFromMode(mode);
}

function getPanelEmailConfig(settings) {
    if (!settings || !settings.smtpHost || !settings.smtpPort) return null;
    const host = (settings.smtpHost || '').replace(/\.+$/, '').trim();
    const secure = !!settings.smtpSecure;
    return {
        host,
        port: settings.smtpPort,
        user: settings.smtpUser || null,
        pass: settings.smtpPass || null,
        from: settings.smtpFrom || settings.smtpUser || null,
        fromName: settings.smtpFromName || null,
        secure,
        allowSelfSigned:
            host.includes('secureserver.net') || host === 'mail.fxguard.io',
    };
}

function parseBool(v, fallback = false) {
    if (v === true || v === false) return v;
    if (v == null) return fallback;
    const s = String(v).trim().toLowerCase();
    if (s === 'true' || s === '1' || s === 'yes' || s === 'on') return true;
    if (s === 'false' || s === '0' || s === 'no' || s === 'off') return false;
    return fallback;
}

function parseEmails(raw) {
    return String(raw || '')
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);
}

function parseChatIds(raw) {
    return String(raw || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
}

function getPanelAlertConfig(settings) {
    const s = settings || {};
    const envAdminEmails = process.env.ADMIN_ALERT_EMAILS || process.env.MAIN_ADMIN_EMAIL || '';
    const alertEmailsRaw = s.adminAlertEmails || envAdminEmails;
    const tgChatIdsRaw = s.telegramChatIds || process.env.TELEGRAM_CHAT_IDS || '';
    const tgTimeoutRaw = s.telegramTimeoutMs != null ? s.telegramTimeoutMs : process.env.TELEGRAM_TIMEOUT_MS;
    const timeoutMs = Number.isFinite(Number(tgTimeoutRaw)) ? Math.max(1000, Number(tgTimeoutRaw)) : 12000;
    return {
        adminAlertsEnabled: parseBool(s.adminAlertsEnabled, parseBool(process.env.ADMIN_ALERTS_ENABLED, false)),
        adminAlertEmails: parseEmails(alertEmailsRaw),
        telegramBotToken: String(s.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || '').trim(),
        telegramChatIds: parseChatIds(tgChatIdsRaw),
        telegramTimeoutMs: timeoutMs,
        clientErrorReportingEnabled: parseBool(
            s.clientErrorReportingEnabled,
            parseBool(process.env.CLIENT_ERROR_REPORTING_ENABLED, true)
        ),
        telegramNotifyAllEvents: parseBool(s.telegramNotifyAllEvents, false),
        telegramNotifyApiRequests: parseBool(s.telegramNotifyApiRequests, false),
        telegramNotifyAuthEvents: parseBool(s.telegramNotifyAuthEvents, true),
        telegramNotifySocketEvents: parseBool(s.telegramNotifySocketEvents, false),
        telegramNotifyIncomingMessages: parseBool(s.telegramNotifyIncomingMessages, true),
        telegramNotifySystemEvents: parseBool(s.telegramNotifySystemEvents, true),
        telegramNotifyErrorEvents: parseBool(s.telegramNotifyErrorEvents, true),
    };
}

module.exports = {
    getPanelSettings,
    getPanelEmailConfig,
    getPanelAlertConfig,
    getSupportedLanguages,
    getSupportedLanguagesFromMode,
    DEFAULT,
    parseHiddenSections,
};

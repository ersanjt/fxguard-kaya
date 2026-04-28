const express = require('express');
const router = express.Router();
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const { isPublicAppRequest, isDemoModeEnabled } = require('../lib/demoAuth');
const { PanelSetting } = require('../models');
const { getPanelSettings, getSupportedLanguages, getPanelEmailConfig } = require('../services/panelSettingsLoader');
const emailService = require('../services/emailService');
const telegramService = require('../services/telegramService');


function applyPublicDemoBranding(req, payload) {
    if (!isPublicAppRequest(req)) return payload;
    const siteName = (process.env.DEMO_PUBLIC_SITE_NAME || 'CRM Demo').trim();
    return Object.assign({}, payload, {
        siteName,
        pageTitle: (process.env.DEMO_PUBLIC_PAGE_TITLE || 'Product preview').trim(),
        loginTitle: (process.env.DEMO_PUBLIC_LOGIN_TITLE || siteName).trim(),
        logoUrl: process.env.DEMO_PUBLIC_LOGO_URL || null,
        loginLogoUrl: process.env.DEMO_PUBLIC_LOGIN_LOGO_URL || null,
        faviconUrl: process.env.DEMO_PUBLIC_FAVICON_URL || '/favicon-fxguard.svg',
        footerText: (process.env.DEMO_PUBLIC_FOOTER_TEXT || 'Demonstration only — sample data.').trim()
    });
}

/** تنظیمات کامل پنل برای ویرایشگر: روی دامنهٔ دمو هیچ رشتهٔ مشتری واقعی برنمی‌گردد */
function applyPublicDemoFullPanelRow(req, out) {
    if (!isPublicAppRequest(req) || !isDemoModeEnabled()) return out;
    const overlaid = applyPublicDemoBranding(req, {
        siteName: out.siteName,
        logoUrl: out.logoUrl,
        faviconUrl: out.faviconUrl,
        loginLogoUrl: out.loginLogoUrl,
        loginTitle: out.loginTitle,
        pageTitle: out.pageTitle,
        footerText: out.footerText,
    });
    Object.assign(out, overlaid, {
        languageMode: 'bilingual_en_tr',
        defaultLanguage: 'en',
        smtpHost: null,
        smtpUser: null,
        smtpFrom: null,
        smtpFromName: null,
        adminAlertEmails: null,
        telegramChatIds: null,
        telegramBotTokenSet: false,
        clientErrorReportingEnabled: false,
    });
    return out;
}

/** مسیرهای آپلود و URLها: بک‌اسلش، کاراکترهای نامرئی bidi، فاصلهٔ اضافه */
function normalizePanelMediaUrl(v) {
    if (v == null || v === '') return v;
    let s = String(v).trim().replace(/\\/g, '/');
    s = s.replace(/[\u200e\u200f\u202a-\u202e\ufeff]/g, '');
    return s.trim();
}

// عمومی — برای صفحه ورود و اعمال ظاهر برای همه کاربران (بدون احراز هویت)
router.get('/public/branding', async (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    try {
        const s = await getPanelSettings();
        const out = applyPublicDemoBranding(req, {
            siteName: s.siteName,
            logoUrl: s.logoUrl,
            faviconUrl: s.faviconUrl,
            loginLogoUrl: s.loginLogoUrl,
            loginTitle: s.loginTitle,
            pageTitle: s.pageTitle,
            footerText: s.footerText,
            showFooter: s.showFooter !== false,
            footerStyle: s.footerStyle || 'accent',
            primaryColor: s.primaryColor,
            fontFamily: s.fontFamily,
            fontSize: s.fontSize || 'medium',
            fontWeight: s.fontWeight || 'normal',
            uiTheme: s.uiTheme || 'default',
            sidebarOrder: s.sidebarOrder,
            iosAppUrl: s.iosAppUrl || null,
            androidAppUrl: s.androidAppUrl || null
        });
        res.json(out);
    } catch (err) {
        next(err);
    }
});

// عمومی — زبان‌های فعال سایت (برای نمایش سوئیچ زبان در صفحه ورود و داخل پنل)
router.get('/public/languages', async (req, res, next) => {
    try {
        if (isPublicAppRequest(req) && isDemoModeEnabled()) {
            return res.json({ languageMode: 'bilingual_en_tr', supportedLanguages: ['en', 'tr'], defaultLanguage: 'en' });
        }
        const s = await getPanelSettings();
        const supportedLanguages = getSupportedLanguages(s);
        const defaultLanguage = supportedLanguages.indexOf(s.defaultLanguage) >= 0 ? s.defaultLanguage : supportedLanguages[0] || 'fa';
        res.json({ languageMode: s.languageMode, supportedLanguages, defaultLanguage });
    } catch (err) {
        next(err);
    }
});

// فقط با نشست معتبر — بدون توکن/کاربر، [] برمی‌گردد تا فهرست بخش‌های مخفی در اینترنت لو نرود
router.get('/public/visibility', optionalAuthMiddleware, async (req, res, next) => {
    try {
        if (isPublicAppRequest(req)) {
            return res.json({ hiddenSections: [] });
        }
        if (!req.user) {
            return res.json({ hiddenSections: [] });
        }
        const s = await getPanelSettings();
        res.json({ hiddenSections: s.hiddenSections || [] });
    } catch (err) {
        next(err);
    }
});

// فقط با احراز هویت و دسترسی «ظاهر پنل» (panel_settings)
router.get('/', authMiddleware, async (req, res, next) => {
    try {
        if (!req.canAccess || !req.canAccess('panel_settings')) {
            return res.status(403).json({ error: 'دسترسی به تنظیمات ظاهر پنل ندارید.' });
        }
        const s = await getPanelSettings();
        const out = { ...s };
        delete out.smtpPass;
        delete out.telegramBotToken;
        out.telegramBotTokenSet = !!(s && s.telegramBotToken);
        if (isDemoModeEnabled() && isPublicAppRequest(req)) {
            applyPublicDemoFullPanelRow(req, out);
        }
        out.supportedLanguages = getSupportedLanguages(out);
        if (out.supportedLanguages && out.supportedLanguages.indexOf(out.defaultLanguage) < 0) {
            out.defaultLanguage = out.supportedLanguages[0] || 'fa';
        }
        res.json(out);
    } catch (err) {
        next(err);
    }
});

router.put('/', authMiddleware, async (req, res, next) => {
    try {
        if (!req.canAccess || !req.canAccess('panel_settings')) {
            return res.status(403).json({ error: 'دسترسی به تنظیمات ظاهر پنل ندارید.' });
        }
        const body = req.body || {};
        let { logoUrl, faviconUrl, loginLogoUrl, iosAppUrl, androidAppUrl } = body;
        const {
            siteName,
            loginTitle,
            pageTitle,
            footerText,
            showFooter,
            footerStyle,
            smtpHost,
            smtpPort,
            smtpUser,
            smtpPass,
            smtpFrom,
            smtpFromName,
            smtpSecure,
            emailLoginNotification,
            adminAlertsEnabled,
            adminAlertEmails,
            telegramBotToken,
            telegramChatIds,
            telegramTimeoutMs,
            clientErrorReportingEnabled,
            telegramNotifyAllEvents,
            telegramNotifyApiRequests,
            telegramNotifyAuthEvents,
            telegramNotifySocketEvents,
            telegramNotifyIncomingMessages,
            telegramNotifySystemEvents,
            telegramNotifyErrorEvents,
            hiddenSections,
            languageMode,
            defaultLanguage,
            primaryColor,
            fontFamily,
            fontSize,
            fontWeight,
            uiTheme,
            sidebarOrder
        } = body;

        if (logoUrl !== undefined) logoUrl = normalizePanelMediaUrl(logoUrl);
        if (faviconUrl !== undefined) faviconUrl = normalizePanelMediaUrl(faviconUrl);
        if (loginLogoUrl !== undefined) loginLogoUrl = normalizePanelMediaUrl(loginLogoUrl);
        if (iosAppUrl !== undefined) iosAppUrl = normalizePanelMediaUrl(iosAppUrl);
        if (androidAppUrl !== undefined) androidAppUrl = normalizePanelMediaUrl(androidAppUrl);

        const validLogoLike = (v) => {
            if (!v || !String(v).trim()) return true;
            const s = String(v).trim();
            const lower = s.toLowerCase();
            const isSafeStaticPath =
                s.startsWith('/') &&
                !s.startsWith('//') &&
                !s.includes('..') &&
                /^\/[A-Za-z0-9._~!$&'()*+,;=:@\/%-]+$/.test(s);
            return (
                /^https?:\/\//i.test(s) ||
                s.startsWith('//') ||
                lower.startsWith('/uploads/') ||
                isSafeStaticPath
            );
        };
        if (!validLogoLike(logoUrl)) {
            return res.status(400).json({ error: 'آدرس لوگو باید یک URL معتبر یا مسیر /uploads/ باشد' });
        }
        if (!validLogoLike(faviconUrl)) {
            return res.status(400).json({ error: 'آدرس فاویکون باید یک URL معتبر یا مسیر /uploads/ باشد' });
        }
        if (!validLogoLike(loginLogoUrl)) {
            return res.status(400).json({ error: 'آدرس لوگوی ورود باید یک URL معتبر یا مسیر /uploads/ باشد' });
        }
        const validAppUrl = (v) => {
            if (!v || !String(v).trim()) return true;
            const s = String(v).trim();
            if (s.toLowerCase().startsWith('/uploads/')) return true;
            return /^(https?:\/\/|itms-services:\/\/|market:\/\/|intent:\/\/)/i.test(s);
        };
        if (!validAppUrl(iosAppUrl)) {
            return res.status(400).json({ error: 'لینک اپ iOS معتبر نیست. از https://، /uploads/... یا itms-services:// استفاده کنید.' });
        }
        if (!validAppUrl(androidAppUrl)) {
            return res.status(400).json({ error: 'لینک اپ Android معتبر نیست. از https://، /uploads/... یا market:// استفاده کنید.' });
        }
        let smtpPortValid = null;
        if (smtpPort !== undefined && smtpPort !== '') {
            const port = parseInt(smtpPort, 10);
            if (!isNaN(port) && port >= 1 && port <= 65535) smtpPortValid = port;
        }
        const smtpFromTrimmed = smtpFrom !== undefined && smtpFrom != null ? String(smtpFrom).trim() : '';
        const smtpFromLooksValid =
            !smtpFromTrimmed || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(smtpFromTrimmed);
        if (adminAlertEmails && String(adminAlertEmails).trim().length > 2000) {
            return res.status(400).json({ error: 'لیست ایمیل مدیران بیش از حد طولانی است' });
        }
        if (telegramChatIds && String(telegramChatIds).trim().length > 1000) {
            return res.status(400).json({ error: 'لیست Chat ID تلگرام بیش از حد طولانی است' });
        }
        const [row] = await PanelSetting.findOrCreate({
            where: { id: 'default' },
            defaults: {}
        });
        const telegramTokenBeforeSave =
            row.telegramBotToken && String(row.telegramBotToken).trim()
                ? String(row.telegramBotToken).trim()
                : '';
        if (siteName !== undefined) row.siteName = siteName === '' ? null : siteName;
        if (logoUrl !== undefined) row.logoUrl = logoUrl === '' ? null : logoUrl;
        if (faviconUrl !== undefined) row.faviconUrl = faviconUrl === '' ? null : faviconUrl;
        if (loginLogoUrl !== undefined) row.loginLogoUrl = loginLogoUrl === '' ? null : loginLogoUrl;
        if (loginTitle !== undefined) row.loginTitle = loginTitle === '' ? null : loginTitle;
        if (pageTitle !== undefined) row.pageTitle = pageTitle === '' ? null : pageTitle;
        if (footerText !== undefined) row.footerText = footerText === '' ? null : footerText;
        if (showFooter !== undefined) row.showFooter = !!showFooter;
        if (footerStyle !== undefined) row.footerStyle = (footerStyle && ['accent', 'minimal', 'compact', 'line'].indexOf(footerStyle) >= 0) ? footerStyle : 'accent';
        if (smtpHost !== undefined) row.smtpHost = smtpHost === '' ? null : String(smtpHost).replace(/\.+$/, '').trim() || null;
        if (smtpPort !== undefined) {
            if (smtpPort === '' || smtpPort == null) row.smtpPort = null;
            else if (smtpPortValid != null) row.smtpPort = String(smtpPortValid);
        }
        if (smtpUser !== undefined) row.smtpUser = smtpUser === '' ? null : smtpUser;
        if (smtpPass !== undefined && String(smtpPass).trim() !== '') row.smtpPass = String(smtpPass).trim();
        if (smtpFrom !== undefined) {
            if (smtpFrom === '' || smtpFrom == null) row.smtpFrom = null;
            else if (smtpFromLooksValid) row.smtpFrom = smtpFromTrimmed;
        }
        if (smtpFromName !== undefined) row.smtpFromName = smtpFromName === '' ? null : smtpFromName;
        if (smtpSecure !== undefined) row.smtpSecure = !!smtpSecure;
        if (emailLoginNotification !== undefined) row.emailLoginNotification = !!emailLoginNotification;
        if (adminAlertsEnabled !== undefined) row.adminAlertsEnabled = !!adminAlertsEnabled;
        if (adminAlertEmails !== undefined) row.adminAlertEmails = adminAlertEmails === '' ? null : String(adminAlertEmails).trim();
        /* توکن خالی در فرم یعنی «تغییر نده» — وگرنه هر بار ذخیرهٔ پنل توکن ذخیره‌شده را پاک می‌کرد */
        if (telegramBotToken !== undefined && String(telegramBotToken).trim() !== '') {
            row.telegramBotToken = String(telegramBotToken).trim();
        }
        if (telegramChatIds !== undefined) row.telegramChatIds = telegramChatIds === '' ? null : String(telegramChatIds).trim();
        if (telegramTimeoutMs !== undefined) {
            if (telegramTimeoutMs === '' || telegramTimeoutMs == null) row.telegramTimeoutMs = null;
            else {
                let t = parseInt(String(telegramTimeoutMs), 10);
                if (!Number.isFinite(t)) t = row.telegramTimeoutMs || 12000;
                else if (t < 1000) t = 1000;
                else if (t > 120000) t = 120000;
                row.telegramTimeoutMs = t;
            }
        }
        if (clientErrorReportingEnabled !== undefined) row.clientErrorReportingEnabled = !!clientErrorReportingEnabled;
        if (telegramNotifyAllEvents !== undefined) row.telegramNotifyAllEvents = !!telegramNotifyAllEvents;
        if (telegramNotifyApiRequests !== undefined) row.telegramNotifyApiRequests = !!telegramNotifyApiRequests;
        if (telegramNotifyAuthEvents !== undefined) row.telegramNotifyAuthEvents = !!telegramNotifyAuthEvents;
        if (telegramNotifySocketEvents !== undefined) row.telegramNotifySocketEvents = !!telegramNotifySocketEvents;
        if (telegramNotifyIncomingMessages !== undefined) row.telegramNotifyIncomingMessages = !!telegramNotifyIncomingMessages;
        if (telegramNotifySystemEvents !== undefined) row.telegramNotifySystemEvents = !!telegramNotifySystemEvents;
        if (telegramNotifyErrorEvents !== undefined) row.telegramNotifyErrorEvents = !!telegramNotifyErrorEvents;
        if (hiddenSections !== undefined) row.hiddenSections = Array.isArray(hiddenSections) ? JSON.stringify(hiddenSections) : (hiddenSections === '' ? null : row.hiddenSections);
        if (languageMode !== undefined) {
            const validLangModes = ['single', 'single_en', 'single_tr', 'bilingual', 'bilingual_fa_tr', 'bilingual_en_tr', 'trilingual'];
            if (languageMode === '' || languageMode == null) row.languageMode = null;
            else row.languageMode = validLangModes.indexOf(languageMode) >= 0 ? languageMode : 'trilingual';
        }
        if (defaultLanguage !== undefined) {
            const langs = getSupportedLanguages({ languageMode: row.languageMode });
            if (['fa', 'en', 'tr'].indexOf(defaultLanguage) >= 0 && langs.indexOf(defaultLanguage) >= 0) {
                row.defaultLanguage = defaultLanguage;
            }
        }
        if (primaryColor !== undefined) row.primaryColor = (typeof primaryColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(primaryColor.trim())) ? primaryColor.trim() : (primaryColor === '' ? null : row.primaryColor);
        if (fontFamily !== undefined) row.fontFamily = fontFamily === '' ? null : fontFamily;
        if (fontSize !== undefined && ['small', 'medium', 'large'].indexOf(fontSize) >= 0) row.fontSize = fontSize;
        if (fontWeight !== undefined && ['normal', 'medium', 'bold'].indexOf(fontWeight) >= 0) row.fontWeight = fontWeight;
        if (uiTheme !== undefined && ['default', 'minimal', 'dark', 'light', 'ocean', 'warm'].indexOf(uiTheme) >= 0) row.uiTheme = uiTheme;
        if (sidebarOrder !== undefined) row.sidebarOrder = Array.isArray(sidebarOrder) ? JSON.stringify(sidebarOrder) : (sidebarOrder === '' ? null : row.sidebarOrder);
        if (iosAppUrl !== undefined) row.iosAppUrl = iosAppUrl === '' ? null : String(iosAppUrl).trim();
        if (androidAppUrl !== undefined) row.androidAppUrl = androidAppUrl === '' ? null : String(androidAppUrl).trim();
        await row.save();
        const telegramTokenAfterSave =
            row.telegramBotToken && String(row.telegramBotToken).trim()
                ? String(row.telegramBotToken).trim()
                : '';
        if (telegramBotToken !== undefined && telegramTokenBeforeSave !== telegramTokenAfterSave) {
            const telegramBotService = require('../services/telegramBotService');
            const models = require('../models');
            const logger = require('../config/logger');
            try {
                await telegramBotService.restartPollingFromPanel(models);
                logger.info('Telegram bot: polling restarted after panel bot token change');
            } catch (e) {
                logger.warn('Telegram bot: polling restart failed after panel save', { error: e.message });
                setImmediate(() => {
                    try {
                        const { notifyMainAdminsIncident } = require('../services/mainAdminIncidentNotifier');
                        notifyMainAdminsIncident({
                            severity: 'WARNING',
                            kind: 'telegram_bot_restart_failed',
                            title: 'Telegram bot: polling restart failed after panel save',
                            bodyText: [
                                'The CRM could not restart Telegram long polling after the bot token was saved.',
                                String(e.message || e)
                            ].join('\n'),
                            dedupeKey: 'ma:tg_restart_panel_fail',
                            dedupeWindowMs: 300000
                        }).catch(() => {});
                    } catch (_) {}
                });
            }
        }
        const s = await getPanelSettings();
        if (footerStyle !== undefined) s.footerStyle = (footerStyle && ['accent', 'minimal', 'compact', 'line'].indexOf(footerStyle) >= 0) ? footerStyle : 'accent';
        s.supportedLanguages = getSupportedLanguages(s);
        delete s.smtpPass;
        delete s.telegramBotToken;
        s.telegramBotTokenSet = !!(row.telegramBotToken && String(row.telegramBotToken).trim());
        res.json(s);
    } catch (err) {
        next(err);
    }
});

// Cooldown برای ارسال تست ایمیل (۶۰ ثانیه) — جلوگیری از اسپم و فیلتر Gmail
const testEmailCooldown = new Map();
const TEST_EMAIL_COOLDOWN_MS = 60000;
const testTelegramCooldown = new Map();
const TEST_TELEGRAM_COOLDOWN_MS = 45000;
// پاک‌سازی خودکار هر ۱۰ دقیقه برای جلوگیری از memory leak
setInterval(() => {
    const now = Date.now();
    for (const [key, ts] of testEmailCooldown.entries()) {
        if (now - ts > TEST_EMAIL_COOLDOWN_MS * 2) testEmailCooldown.delete(key);
    }
    for (const [key, ts] of testTelegramCooldown.entries()) {
        if (now - ts > TEST_TELEGRAM_COOLDOWN_MS * 2) testTelegramCooldown.delete(key);
    }
}, 10 * 60 * 1000).unref();

// ارسال ایمیل تست — برای اطمینان از صحت تنظیمات SMTP
// اگر smtpHost و smtpPort در body ارسال شوند، از آن‌ها استفاده می‌شود (تست قبل از ذخیره)
router.post('/test-email', authMiddleware, async (req, res, next) => {
    try {
        if (!req.canAccess || !req.canAccess('panel_settings')) {
            return res.status(403).json({ error: 'دسترسی به تنظیمات پنل ندارید.' });
        }
        const userId = req.user && req.user.id;
        if (userId) {
            const last = testEmailCooldown.get(userId) || 0;
            if (Date.now() - last < TEST_EMAIL_COOLDOWN_MS) {
                const waitSec = Math.ceil((TEST_EMAIL_COOLDOWN_MS - (Date.now() - last)) / 1000);
                return res.status(429).json({ error: `برای جلوگیری از اسپم، ${waitSec} ثانیه صبر کنید و دوباره امتحان کنید.` });
            }
        }
        const to = (req.body.to || req.body.email || '').toString().trim();
        if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
            return res.status(400).json({ error: 'آدرس ایمیل معتبر وارد کنید.' });
        }
        const settings = await getPanelSettings();
        let emailConfig = getPanelEmailConfig(settings);
        // اگر مقادیر فرم در body ارسال شده‌اند، برای تست قبل از ذخیره استفاده کن
        const bodyHost = (req.body.smtpHost || '').toString().trim();
        const bodyPort = (req.body.smtpPort || '').toString().trim();
        if (bodyHost && bodyPort) {
            const bodyPass = (req.body.smtpPass || '').toString().trim();
            const normHost = bodyHost.replace(/\.+$/, '').trim();
            emailConfig = {
                host: normHost,
                port: bodyPort,
                user: (req.body.smtpUser || '').toString().trim() || null,
                pass: bodyPass || (settings && settings.smtpPass) || null,
                from: (req.body.smtpFrom || '').toString().trim() || null,
                fromName: (req.body.smtpFromName || '').toString().trim() || null,
                secure: !!(req.body.smtpSecure === true || req.body.smtpSecure === 'true' || req.body.smtpSecure === '1'),
                allowSelfSigned: (process.env.SMTP_ALLOW_SELF_SIGNED_HOSTS || '').split(',').map(h => h.trim().toLowerCase()).filter(Boolean).some(h => normHost.includes(h) || normHost === h)
            };
            if (!emailConfig.from && emailConfig.user) emailConfig.from = emailConfig.user;
        }
        const siteName = (settings && settings.siteName) || 'Staff Portal';
        const title = 'Test email — ' + siteName;
        const body = '<p>This message was sent to verify SMTP settings for the panel. If you received it, outbound email is working.</p>';
        const mailOpts = {
            to,
            subject: title,
            text: 'This message was sent to verify SMTP settings for the panel.',
            html: emailService.baseHtml(title, body)
        };
        let result = { ok: false };
        if (emailConfig && emailConfig.host && emailConfig.port) {
            result = await emailService.sendMailWithConfigDetailed(emailConfig, mailOpts);
        } else {
            if (!emailService.isEnabled()) {
                return res.status(400).json({ error: 'تنظیمات SMTP وجود ندارد. Host و پورت را در فرم وارد کنید و ذخیره کنید، یا متغیرهای SMTP_HOST و SMTP_PORT را در فایل .env تنظیم کنید.' });
            }
            result = await emailService.sendMailWithRetry(mailOpts);
        }
        if (result.ok) {
            if (userId) testEmailCooldown.set(userId, Date.now());
            const usedHost = result.usedHost || null;
            const configHost = emailConfig && emailConfig.host ? emailConfig.host : null;
            const usedFallback = usedHost && configHost && usedHost !== configHost ? usedHost : null;
            const msg = usedFallback
                ? `ایمیل ارسال شد با Host جایگزین (${usedFallback}). توصیه: این Host را در تنظیمات ذخیره کنید.`
                : 'ایمیل تست ارسال شد. صندوق ورودی (و اسپم) را بررسی کنید.';
            res.json({ ok: true, message: msg, usedFallback });
        } else {
            res.status(500).json({ error: result.error || 'ارسال ایمیل ناموفق بود. Host، پورت و احراز هویت را بررسی کنید.' });
        }
    } catch (err) {
        next(err);
    }
});

// ارسال پیام تست تلگرام — برای اطمینان از صحت تنظیمات Bot
router.post('/test-telegram', authMiddleware, async (req, res, next) => {
    try {
        if (!req.canAccess || !req.canAccess('panel_settings')) {
            return res.status(403).json({ error: 'دسترسی به تنظیمات پنل ندارید.' });
        }
        const userId = req.user && req.user.id;
        if (userId) {
            const last = testTelegramCooldown.get(userId) || 0;
            if (Date.now() - last < TEST_TELEGRAM_COOLDOWN_MS) {
                const waitSec = Math.ceil((TEST_TELEGRAM_COOLDOWN_MS - (Date.now() - last)) / 1000);
                return res.status(429).json({ error: `برای جلوگیری از اسپم، ${waitSec} ثانیه صبر کنید و دوباره امتحان کنید.` });
            }
        }
        const settings = await getPanelSettings();
        const tokenInput = (req.body.telegramBotToken || '').toString().trim();
        const chatIdsInput = (req.body.telegramChatIds || '').toString().trim();
        const timeoutInput = (req.body.telegramTimeoutMs || '').toString().trim();
        const token = tokenInput || settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || '';
        const chatIds = chatIdsInput || settings.telegramChatIds || process.env.TELEGRAM_CHAT_IDS || '';
        let timeoutMs = Number(settings.telegramTimeoutMs || process.env.TELEGRAM_TIMEOUT_MS || 12000);
        if (timeoutInput) {
            const t = parseInt(timeoutInput, 10);
            if (Number.isFinite(t)) {
                timeoutMs = t < 1000 ? 1000 : t > 120000 ? 120000 : t;
            }
        }
        if (!Number.isFinite(timeoutMs)) timeoutMs = 12000;

        if (!token || !chatIds) {
            return res.status(400).json({ error: 'توکن و Chat ID تلگرام الزامی است.' });
        }
        const customText = (req.body.text || '').toString().trim();
        const message = customText || `✅ Telegram test from Kaya CRM\nTime: ${new Date().toISOString()}`;
        const result = await telegramService.sendMessage(message, {
            botToken: token,
            chatIds,
            timeoutMs
        });
        if (result.ok) {
            if (userId) testTelegramCooldown.set(userId, Date.now());
            return res.json({ ok: true });
        }
        return res.status(500).json({ error: result.error || 'ارسال پیام تلگرام ناموفق بود.' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

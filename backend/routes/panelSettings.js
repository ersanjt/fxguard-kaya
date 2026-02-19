const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { PanelSetting } = require('../models');
const { getPanelSettings, getSupportedLanguages, getPanelEmailConfig } = require('../services/panelSettingsLoader');
const emailService = require('../services/emailService');

async function getSettings() {
    return getPanelSettings();
}

// عمومی — برای صفحه ورود و اعمال ظاهر برای همه کاربران (بدون احراز هویت)
router.get('/public/branding', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    try {
        const s = await getSettings();
        res.json({
            siteName: s.siteName,
            logoUrl: s.logoUrl,
            faviconUrl: s.faviconUrl,
            loginTitle: s.loginTitle,
            pageTitle: s.pageTitle,
            footerText: s.footerText,
            showFooter: s.showFooter !== false,
            footerStyle: s.footerStyle || 'accent'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// عمومی — زبان‌های فعال سایت (برای نمایش سوئیچ زبان در صفحه ورود و داخل پنل)
router.get('/public/languages', async (req, res) => {
    try {
        const s = await getSettings();
        const supportedLanguages = getSupportedLanguages(s);
        const defaultLanguage = supportedLanguages.indexOf(s.defaultLanguage) >= 0 ? s.defaultLanguage : supportedLanguages[0] || 'fa';
        res.json({ languageMode: s.languageMode, supportedLanguages, defaultLanguage });
    } catch (err) {
        res.status(500).json({ error: err.message, languageMode: 'trilingual', supportedLanguages: ['fa', 'en', 'tr'], defaultLanguage: 'fa' });
    }
});

// عمومی — لیست بخش‌های مخفی برای مخفی کردن در منو و جلوگیری از دسترسی
router.get('/public/visibility', async (req, res) => {
    try {
        const s = await getSettings();
        res.json({ hiddenSections: s.hiddenSections || [] });
    } catch (err) {
        res.status(500).json({ error: err.message, hiddenSections: [] });
    }
});

// فقط با احراز هویت و دسترسی «ظاهر پنل» (panel_settings)
router.get('/', authMiddleware, async (req, res) => {
    try {
        if (!req.canAccess || !req.canAccess('panel_settings')) {
            return res.status(403).json({ error: 'دسترسی به تنظیمات ظاهر پنل ندارید.' });
        }
        const s = await getSettings();
        const out = { ...s };
        delete out.smtpPass;
        res.json(out);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/', authMiddleware, async (req, res) => {
    try {
        if (!req.canAccess || !req.canAccess('panel_settings')) {
            return res.status(403).json({ error: 'دسترسی به تنظیمات ظاهر پنل ندارید.' });
        }
        const body = req.body || {};
        const { siteName, logoUrl, faviconUrl, loginTitle, pageTitle, footerText, showFooter, footerStyle, smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, smtpFromName, smtpSecure, emailLoginNotification, hiddenSections, languageMode, defaultLanguage } = body;
        const [row] = await PanelSetting.findOrCreate({
            where: { id: 'default' },
            defaults: {}
        });
        if (siteName !== undefined) row.siteName = siteName === '' ? null : siteName;
        if (logoUrl !== undefined) row.logoUrl = logoUrl === '' ? null : logoUrl;
        if (faviconUrl !== undefined) row.faviconUrl = faviconUrl === '' ? null : faviconUrl;
        if (loginTitle !== undefined) row.loginTitle = loginTitle === '' ? null : loginTitle;
        if (pageTitle !== undefined) row.pageTitle = pageTitle === '' ? null : pageTitle;
        if (footerText !== undefined) row.footerText = footerText === '' ? null : footerText;
        if (showFooter !== undefined) row.showFooter = !!showFooter;
        if (footerStyle !== undefined) row.footerStyle = (footerStyle && ['accent', 'minimal', 'compact', 'line'].indexOf(footerStyle) >= 0) ? footerStyle : 'accent';
        if (smtpHost !== undefined) row.smtpHost = smtpHost === '' ? null : smtpHost;
        if (smtpPort !== undefined) row.smtpPort = smtpPort === '' ? null : smtpPort;
        if (smtpUser !== undefined) row.smtpUser = smtpUser === '' ? null : smtpUser;
        if (smtpPass !== undefined && String(smtpPass).trim() !== '') row.smtpPass = String(smtpPass).trim();
        if (smtpFrom !== undefined) row.smtpFrom = smtpFrom === '' ? null : smtpFrom;
        if (smtpFromName !== undefined) row.smtpFromName = smtpFromName === '' ? null : smtpFromName;
        if (smtpSecure !== undefined) row.smtpSecure = !!smtpSecure;
        if (emailLoginNotification !== undefined) row.emailLoginNotification = !!emailLoginNotification;
        if (hiddenSections !== undefined) row.hiddenSections = Array.isArray(hiddenSections) ? JSON.stringify(hiddenSections) : (hiddenSections === '' ? null : row.hiddenSections);
        if (languageMode !== undefined) row.languageMode = languageMode === '' ? null : languageMode;
        if (defaultLanguage !== undefined && (defaultLanguage === 'fa' || defaultLanguage === 'en' || defaultLanguage === 'tr')) row.defaultLanguage = defaultLanguage;
        await row.save();
        const s = await getSettings();
        if (footerStyle !== undefined) s.footerStyle = (footerStyle && ['accent', 'minimal', 'compact', 'line'].indexOf(footerStyle) >= 0) ? footerStyle : 'accent';
        s.supportedLanguages = getSupportedLanguages(s);
        delete s.smtpPass;
        res.json(s);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ارسال ایمیل تست — برای اطمینان از صحت تنظیمات SMTP
router.post('/test-email', authMiddleware, async (req, res) => {
    try {
        if (!req.canAccess || !req.canAccess('panel_settings')) {
            return res.status(403).json({ error: 'دسترسی به تنظیمات پنل ندارید.' });
        }
        const to = (req.body.to || req.body.email || '').toString().trim();
        if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
            return res.status(400).json({ error: 'آدرس ایمیل معتبر وارد کنید.' });
        }
        const settings = await getPanelSettings();
        const emailConfig = getPanelEmailConfig(settings);
        const siteName = (settings && settings.siteName) || 'پورتال کارکنان';
        const title = 'ایمیل تست — ' + siteName;
        const body = '<p>این ایمیل برای تست تنظیمات SMTP پنل ارسال شده است. اگر آن را دریافت کرده‌اید، ارسال ایمیل درست کار می‌کند.</p>';
        const mailOpts = {
            to,
            subject: title,
            text: 'این ایمیل برای تست تنظیمات SMTP پنل ارسال شده است.',
            html: emailService.baseHtml(title, body)
        };
        let sent = false;
        if (emailConfig && emailConfig.host) {
            sent = await emailService.sendMailWithConfig(emailConfig, mailOpts);
        } else {
            sent = await emailService.sendMail(mailOpts);
        }
        if (sent) {
            res.json({ ok: true, message: 'ایمیل تست ارسال شد. صندوق ورودی (و اسپم) را بررسی کنید.' });
        } else {
            res.status(500).json({ error: 'ارسال ایمیل ناموفق بود. Host، پورت و احراز هویت را بررسی کنید.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message || 'خطای سرور' });
    }
});

module.exports = router;

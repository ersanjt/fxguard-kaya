const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const models = require('../models');
const { PanelSetting } = models;

const DEFAULT = {
    siteName: 'صرافی کایا',
    logoUrl: null,
    faviconUrl: null,
    loginTitle: 'پورتال کارکنان کایا',
    pageTitle: 'پورتال کارکنان کایا | صرافی کایا',
    footerText: 'صرافی کایا — پورتال کارکنان'
};

async function getSettings() {
    const row = await PanelSetting.findByPk('default');
    if (!row) return { ...DEFAULT };
    return {
        siteName: row.siteName != null ? row.siteName : DEFAULT.siteName,
        logoUrl: row.logoUrl || null,
        faviconUrl: row.faviconUrl || null,
        loginTitle: row.loginTitle != null ? row.loginTitle : DEFAULT.loginTitle,
        pageTitle: row.pageTitle != null ? row.pageTitle : DEFAULT.pageTitle,
        footerText: row.footerText != null ? row.footerText : DEFAULT.footerText
    };
}

// عمومی — برای صفحه ورود و اعمال ظاهر برای همه کاربران (بدون احراز هویت)
router.get('/public/branding', async (req, res) => {
    try {
        const s = await getSettings();
        res.json({
            siteName: s.siteName,
            logoUrl: s.logoUrl,
            faviconUrl: s.faviconUrl,
            loginTitle: s.loginTitle,
            pageTitle: s.pageTitle,
            footerText: s.footerText
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// فقط با احراز هویت و دسترسی «ظاهر پنل» (panel_settings)
router.get('/', authMiddleware, async (req, res) => {
    try {
        if (!req.canAccess || !req.canAccess('panel_settings')) {
            return res.status(403).json({ error: 'دسترسی به تنظیمات ظاهر پنل ندارید.' });
        }
        const s = await getSettings();
        res.json(s);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/', authMiddleware, async (req, res) => {
    try {
        if (!req.canAccess || !req.canAccess('panel_settings')) {
            return res.status(403).json({ error: 'دسترسی به تنظیمات ظاهر پنل ندارید.' });
        }
        const { siteName, logoUrl, faviconUrl, loginTitle, pageTitle, footerText } = req.body || {};
        const [row] = await PanelSetting.findOrCreate({
            where: { id: 'default' },
            defaults: { siteName: null, logoUrl: null, faviconUrl: null, loginTitle: null, pageTitle: null, footerText: null }
        });
        if (siteName !== undefined) row.siteName = siteName === '' ? null : siteName;
        if (logoUrl !== undefined) row.logoUrl = logoUrl === '' ? null : logoUrl;
        if (faviconUrl !== undefined) row.faviconUrl = faviconUrl === '' ? null : faviconUrl;
        if (loginTitle !== undefined) row.loginTitle = loginTitle === '' ? null : loginTitle;
        if (pageTitle !== undefined) row.pageTitle = pageTitle === '' ? null : pageTitle;
        if (footerText !== undefined) row.footerText = footerText === '' ? null : footerText;
        await row.save();
        const s = await getSettings();
        res.json(s);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

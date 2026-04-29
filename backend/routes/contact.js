/**
 * Contact form routes — public endpoints for landing page
 */
const express = require('express');
const rateLimit = require('express-rate-limit');

const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'تعداد ارسال فرم زیاد است. چند دقیقه صبر کنید.' },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * @param {object} logger
 * @returns {express.Router}
 */
function createContactRouter(logger) {
    const router = express.Router();

    router.post('/contact', contactLimiter, async (req, res) => {
        const { purpose, name, email, phone, message } = req.body || {};
        if (!email || !name || !message) {
            return res.status(400).json({ error: 'نام، ایمیل و پیام الزامی است.' });
        }

        const nameStr = String(name).trim();
        const emailStr = String(email).trim();
        const messageStr = String(message).trim();

        if (nameStr.length > 200) {
            return res.status(400).json({ error: 'نام بیش از حد مجاز است.' });
        }
        if (emailStr.length > 255) {
            return res.status(400).json({ error: 'ایمیل نامعتبر است.' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
            return res.status(400).json({ error: 'فرمت ایمیل نامعتبر است.' });
        }
        if (messageStr.length > 5000) {
            return res.status(400).json({ error: 'پیام بیش از حد مجاز است.' });
        }

        const purposeVal = ['purchase', 'quote', 'support', 'other'].includes(purpose)
            ? purpose
            : 'other';

        try {
            const emailService = require('../services/emailService');
            const { getPanelSettings, getPanelEmailConfig } = require('../services/panelSettingsLoader');
            const panelSettings = await getPanelSettings();
            const panelEmailConfig = getPanelEmailConfig(panelSettings);
            const envEnabled = emailService.isEnabled();
            if (!panelEmailConfig && !envEnabled) {
                logger.warn('Contact form: email disabled, skipping send');
                return res.json({
                    ok: true,
                    message: 'پیام دریافت شد. به زودی با شما تماس می‌گیریم.',
                });
            }
            await emailService.sendContactForm({
                purpose: purposeVal,
                name: nameStr,
                email: emailStr,
                phone: phone ? String(phone).trim().slice(0, 50) : '',
                message: messageStr,
                emailConfig: panelEmailConfig
            });
            res.json({ ok: true, message: 'پیام ارسال شد. به زودی با شما تماس می‌گیریم.' });
        } catch (err) {
            logger.error('Contact form send error:', err);
            res.status(500).json({
                error:
                    'خطا در ارسال پیام. لطفاً دوباره تلاش کنید یا از واتساپ استفاده کنید.',
            });
        }
    });

    return router;
}

module.exports = { createContactRouter };

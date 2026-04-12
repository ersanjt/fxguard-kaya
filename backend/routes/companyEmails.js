const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { CompanyEmail, User } = require('../models');
const { getPanelSettings, getPanelEmailConfig } = require('../services/panelSettingsLoader');
const emailService = require('../services/emailService');
const { encrypt, decrypt } = require('../lib/encrypt');

function canAccess(req) {
    return req.canAccess && req.canAccess('panel_settings');
}

// لیست ایمیل‌های شرکتی
router.get('/', authMiddleware, async (req, res, next) => {
    try {
        if (!canAccess(req)) return res.status(403).json({ error: 'دسترسی به ایمیل‌های شرکتی ندارید.' });
        const list = await CompanyEmail.findAll({
            order: [['createdAt', 'DESC']],
            include: [{ model: User, as: 'assignedUser', attributes: ['id', 'name', 'email'], required: false }]
        });
        const out = list.map(row => {
            const j = row.toJSON();
            delete j.passwordEnc;
            j.hasPassword = !!row.passwordEnc;
            return j;
        });
        res.json({ data: out });
    } catch (err) {
        next(err);
    }
});

// جزئیات یک ایمیل شرکتی (برای ویرایش)
router.get('/:id', authMiddleware, async (req, res, next) => {
    try {
        if (!canAccess(req)) return res.status(403).json({ error: 'دسترسی به ایمیل‌های شرکتی ندارید.' });
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'شناسه نامعتبر است.' });
        const row = await CompanyEmail.findByPk(id, {
            include: [{ model: User, as: 'assignedUser', attributes: ['id', 'name', 'email'], required: false }]
        });
        if (!row) return res.status(404).json({ error: 'ایمیل شرکتی یافت نشد.' });
        const j = row.toJSON();
        delete j.passwordEnc;
        j.hasPassword = !!row.passwordEnc;
        res.json(j);
    } catch (err) {
        next(err);
    }
});

// ایجاد ایمیل شرکتی
router.post('/', authMiddleware, async (req, res, next) => {
    try {
        if (!canAccess(req)) return res.status(403).json({ error: 'دسترسی به ایمیل‌های شرکتی ندارید.' });
        const email = (req.body.email || '').toString().trim().toLowerCase();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'آدرس ایمیل معتبر وارد کنید.' });
        }
        const existing = await CompanyEmail.findOne({ where: { email } });
        if (existing) return res.status(400).json({ error: 'این ایمیل شرکتی قبلاً ثبت شده است.' });
        const label = (req.body.label || '').trim() || null;
        if (label && label.length > 100) return res.status(400).json({ error: 'برچسب بیش از ۱۰۰ کاراکتر مجاز نیست' });
        const assignedUserId = req.body.assignedUserId || null;
        if (assignedUserId) {
            const { isValidUUID } = require('../lib/validation');
            if (!isValidUUID(assignedUserId)) return res.status(400).json({ error: 'شناسه کاربر نامعتبر است' });
        }
        const notes = (req.body.notes || '').trim() || null;
        if (notes && notes.length > 500) return res.status(400).json({ error: 'یادداشت بیش از ۵۰۰ کاراکتر مجاز نیست' });
        const password = (req.body.password || '').toString();
        if (password && password.length > 200) return res.status(400).json({ error: 'رمز عبور بیش از ۲۰۰ کاراکتر مجاز نیست' });
        const isActive = req.body.isActive !== false;
        const passwordEnc = password ? encrypt(password) : null;
        const row = await CompanyEmail.create({
            email,
            label,
            assignedUserId: assignedUserId || null,
            passwordEnc,
            notes,
            isActive
        });
        const j = row.toJSON();
        delete j.passwordEnc;
        j.hasPassword = !!row.passwordEnc;
        res.status(201).json(j);
    } catch (err) {
        next(err);
    }
});

// به‌روزرسانی
router.put('/:id', authMiddleware, async (req, res, next) => {
    try {
        if (!canAccess(req)) return res.status(403).json({ error: 'دسترسی به ایمیل‌های شرکتی ندارید.' });
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'شناسه نامعتبر است.' });
        const row = await CompanyEmail.findByPk(id);
        if (!row) return res.status(404).json({ error: 'ایمیل شرکتی یافت نشد.' });
        if (req.body.email !== undefined) {
            const email = (req.body.email || '').toString().trim().toLowerCase();
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return res.status(400).json({ error: 'آدرس ایمیل معتبر وارد کنید.' });
            }
            const existing = await CompanyEmail.findOne({ where: { email } });
            if (existing && existing.id !== id) return res.status(400).json({ error: 'این ایمیل شرکتی قبلاً ثبت شده است.' });
            row.email = email;
        }
        if (req.body.label !== undefined) row.label = (req.body.label || '').trim() || null;
        if (req.body.assignedUserId !== undefined) row.assignedUserId = req.body.assignedUserId || null;
        if (req.body.notes !== undefined) row.notes = (req.body.notes || '').trim() || null;
        if (req.body.isActive !== undefined) row.isActive = !!req.body.isActive;
        if (req.body.password !== undefined) {
            const p = (req.body.password || '').toString();
            row.passwordEnc = p ? encrypt(p) : null;
        }
        await row.save();
        const j = row.toJSON();
        delete j.passwordEnc;
        j.hasPassword = !!row.passwordEnc;
        res.json(j);
    } catch (err) {
        next(err);
    }
});

// حذف
router.delete('/:id', authMiddleware, async (req, res, next) => {
    try {
        if (!canAccess(req)) return res.status(403).json({ error: 'دسترسی به ایمیل‌های شرکتی ندارید.' });
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'شناسه نامعتبر است.' });
        const row = await CompanyEmail.findByPk(id);
        if (!row) return res.status(404).json({ error: 'ایمیل شرکتی یافت نشد.' });
        await row.destroy();
        res.json({ ok: true, message: 'حذف شد.' });
    } catch (err) {
        next(err);
    }
});

// ارسال اطلاعات ورود (ایمیل + رمز) به کاربر اختصاص‌داده‌شده
router.post('/:id/send-credentials', authMiddleware, async (req, res, next) => {
    try {
        if (!canAccess(req)) return res.status(403).json({ error: 'دسترسی به ایمیل‌های شرکتی ندارید.' });
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'شناسه نامعتبر است.' });
        const row = await CompanyEmail.findByPk(id, {
            include: [{ model: User, as: 'assignedUser', attributes: ['id', 'name', 'email'], required: false }]
        });
        if (!row) return res.status(404).json({ error: 'ایمیل شرکتی یافت نشد.' });
        if (!row.assignedUserId || !row.assignedUser || !row.assignedUser.email) {
            return res.status(400).json({ error: 'برای این ایمیل شرکتی کاربری اختصاص داده نشده یا کاربر ایمیل ندارد.' });
        }
        const plainPassword = row.passwordEnc ? decrypt(row.passwordEnc) : null;
        if (!plainPassword) {
            return res.status(400).json({ error: 'رمز عبور برای این ایمیل شرکتی ثبت نشده است. در ویرایش رمز را وارد کنید.' });
        }
        const settings = await getPanelSettings();
        const emailConfig = getPanelEmailConfig(settings);
        const siteName = (settings && settings.siteName) || 'کایا CRM';
        const title = `اطلاعات ایمیل شرکتی ${row.email}`;
        const body = `
      <p>سلام ${row.assignedUser.name || 'کاربر'}،</p>
      <p>اطلاعات ورود به <strong>ایمیل شرکتی</strong> (${siteName}) که به شما اختصاص داده شده است:</p>
      <ul>
        <li>آدرس ایمیل: <span class="cred">${row.email}</span></li>
        <li>رمز عبور: <span class="cred">${plainPassword}</span></li>
        ${row.label ? '<li>کاربرد: ' + row.label + '</li>' : ''}
      </ul>
      <p class="muted">این اطلاعات را محرمانه نگه دارید. برای ورود به صندوق پستی از نرم‌افزار ایمیل یا وب‌میل استفاده کنید.</p>
    `;
        const mailOpts = {
            to: row.assignedUser.email,
            subject: title,
            text: `ایمیل شرکتی: ${row.email} — رمز: ${plainPassword}`,
            html: emailService.baseHtml(title, body)
        };
        let sent = false;
        if (emailConfig && emailConfig.host) {
            sent = await emailService.sendMailWithConfig(emailConfig, mailOpts);
        } else {
            sent = await emailService.sendMail(mailOpts);
        }
        if (sent) {
            res.json({ ok: true, message: 'اطلاعات ورود به ایمیل کاربر ارسال شد.' });
        } else {
            res.status(500).json({ error: 'ارسال ایمیل ناموفق بود. تنظیمات SMTP را بررسی کنید.' });
        }
    } catch (err) {
        next(err);
    }
});

// تست اتصال SMTP
router.post('/test/connection', authMiddleware, async (req, res, next) => {
    try {
        if (!canAccess(req)) return res.status(403).json({ error: 'دسترسی ندارید.' });
        const { host, port, user, pass, secure, allowSelfSigned } = req.body;
        if (!host || !port) return res.status(400).json({ error: 'host و port الزامی است.' });
        
        const result = await emailService.testSmtpConnection({ host, port, user, pass, secure, allowSelfSigned });
        if (result.ok) {
            res.json({ ok: true, message: 'اتصال SMTP موفق بود.' });
        } else {
            res.status(400).json({ error: result.error || 'اتصال SMTP ناموفق بود.' });
        }
    } catch (err) {
        next(err);
    }
});

// تست ارسال ایمیل
router.post('/test/send', authMiddleware, async (req, res, next) => {
    try {
        if (!canAccess(req)) return res.status(403).json({ error: 'دسترسی ندارید.' });
        const { host, port, user, pass, from, fromName, secure, allowSelfSigned, testEmail } = req.body;
        if (!host || !port) return res.status(400).json({ error: 'host و port الزامی است.' });
        if (!testEmail) return res.status(400).json({ error: 'ایمیل تست الزامی است.' });
        
        const result = await emailService.sendTestEmail(
            { host, port, user, pass, from, fromName, secure, allowSelfSigned },
            testEmail
        );
        
        if (result.ok) {
            res.json({ ok: true, message: `ایمیل تست به ${testEmail} ارسال شد.` });
        } else {
            res.status(400).json({ error: result.error || 'ارسال ایمیل تست ناموفق بود.' });
        }
    } catch (err) {
        next(err);
    }
});

module.exports = router;

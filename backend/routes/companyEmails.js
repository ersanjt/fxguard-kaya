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
router.get('/', authMiddleware, async (req, res) => {
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
        res.status(500).json({ error: err.message });
    }
});

// جزئیات یک ایمیل شرکتی (برای ویرایش)
router.get('/:id', authMiddleware, async (req, res) => {
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
        res.status(500).json({ error: err.message });
    }
});

// ایجاد ایمیل شرکتی
router.post('/', authMiddleware, async (req, res) => {
    try {
        if (!canAccess(req)) return res.status(403).json({ error: 'دسترسی به ایمیل‌های شرکتی ندارید.' });
        const email = (req.body.email || '').toString().trim().toLowerCase();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'آدرس ایمیل معتبر وارد کنید.' });
        }
        const existing = await CompanyEmail.findOne({ where: { email } });
        if (existing) return res.status(400).json({ error: 'این ایمیل شرکتی قبلاً ثبت شده است.' });
        const label = (req.body.label || '').trim() || null;
        const assignedUserId = req.body.assignedUserId || null;
        const notes = (req.body.notes || '').trim() || null;
        const password = (req.body.password || '').toString();
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
        res.status(500).json({ error: err.message });
    }
});

// به‌روزرسانی
router.put('/:id', authMiddleware, async (req, res) => {
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
        res.status(500).json({ error: err.message });
    }
});

// حذف
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        if (!canAccess(req)) return res.status(403).json({ error: 'دسترسی به ایمیل‌های شرکتی ندارید.' });
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'شناسه نامعتبر است.' });
        const row = await CompanyEmail.findByPk(id);
        if (!row) return res.status(404).json({ error: 'ایمیل شرکتی یافت نشد.' });
        await row.destroy();
        res.json({ ok: true, message: 'حذف شد.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ارسال اطلاعات ورود (ایمیل + رمز) به کاربر اختصاص‌داده‌شده
router.post('/:id/send-credentials', authMiddleware, async (req, res) => {
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
        const siteName = (settings && settings.siteName) || 'پورتال کارکنان';
        const title = `اطلاعات ایمیل شرکتی ${row.email}`;
        const body = `
      <p>سلام ${row.assignedUser.name || 'کاربر'}،</p>
      <p>اطلاعات ورود به <strong>ایمیل شرکتی</strong> که به شما اختصاص داده شده است:</p>
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
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

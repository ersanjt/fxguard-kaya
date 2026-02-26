const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const { User, sequelize, PasswordResetToken } = require('../models');
const { Op } = require('sequelize');
const crypto = require('crypto');
const { logActivity } = require('../services/activityLog');
const { getCountryFromIp } = require('../lib/geoip');
const emailService = require('../services/emailService');
const { getPanelSettings, getPanelEmailConfig } = require('../services/panelSettingsLoader');
const { getPermissions, canDeleteCustomer, canDeleteUser, canManageTickets } = require('../lib/permissions');

const JWT_OPTIONS = { expiresIn: process.env.JWT_EXPIRES_IN || '7d' };
const TOTP_TEMP_EXPIRY = '5m';

function issueToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        JWT_OPTIONS
    );
}

router.post('/login', async (req, res) => {
    const sendJson = (status, body) => {
        try {
            if (res.headersSent) return;
            res.status(status).json(body);
        } catch (_) {
            try { if (!res.headersSent) res.status(500).json({ error: 'Internal server error' }); } catch (__) {}
        }
    };
    try {
        const identifier = (req.body.email || req.body.username || '').toString().trim();
        const password = req.body.password;
        if (!identifier || !password) {
            return sendJson(400, { error: 'ایمیل/نام کاربری و رمز عبور الزامی است' });
        }
        if (identifier.length > 255) return sendJson(400, { error: 'ایمیل یا نام کاربری نامعتبر است' });
        let user = null;
        const isEmail = identifier.indexOf('@') >= 0;
        if (isEmail) {
            const emailLower = identifier.toLowerCase();
            user = await User.findOne({ where: { email: emailLower, isActive: true } });
            if (!user) {
                user = await User.findOne({
                    where: {
                        [Op.and]: [
                            sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), emailLower),
                            { isActive: true }
                        ]
                    }
                });
            }
        } else {
            const usernameLower = identifier.toLowerCase();
            user = await User.findOne({
                where: {
                    [Op.and]: [
                        sequelize.where(sequelize.fn('LOWER', sequelize.col('username')), usernameLower),
                        { isActive: true },
                        { username: { [Op.ne]: null } }
                    ]
                }
            });
        }
        if (!user || !(await user.comparePassword(password))) {
            const clientIp = req.ip || req.connection?.remoteAddress || '';
            await logActivity({
                userId: user ? user.id : null,
                action: 'login_failed',
                entityType: 'auth',
                summary: `ورود ناموفق برای: ${identifier}`,
                metadata: { ip: clientIp, identifier }
            }).catch(() => {});
            return sendJson(401, { error: 'ایمیل/نام کاربری یا رمز عبور اشتباه است' });
        }
        if (user.totpEnabled) {
            const tempToken = jwt.sign(
                { id: user.id, totpStep: true },
                process.env.JWT_SECRET,
                { expiresIn: TOTP_TEMP_EXPIRY }
            );
            return sendJson(200, { needTotp: true, tempToken, email: user.email, username: user.username });
        }
        const now = new Date();
        await user.update({ lastLoginAt: now, status: 'online' });
        const clientIp = req.ip || req.connection?.remoteAddress || '';
        await logActivity({
            userId: user.id,
            branchId: user.branchId || null,
            departmentId: user.departmentId || null,
            action: 'user_login',
            entityType: 'user',
            entityId: user.id,
            summary: 'ورود به پورتال کارکنان کایا',
            metadata: {
                ip: clientIp,
                country: getCountryFromIp(clientIp),
                userAgent: (req.get && req.get('user-agent')) || null,
                email: user.email
            }
        });
        const token = issueToken(user);
        const permissions = getPermissions(user);
        try { (req.app && req.app.get('io'))?.emit('user_login', { userId: user.id }); } catch (_) {}
        setImmediate(async () => {
            try {
                const settings = await getPanelSettings();
                const emailConfig = getPanelEmailConfig(settings);
                await emailService.sendLoginNotification(user, req.ip || '', (req.get && req.get('user-agent')) || '', { emailConfig, loginNotificationEnabled: settings.emailLoginNotification });
            } catch (_) {}
        });
        sendJson(200, {
            token,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                departmentId: user.departmentId,
                branchId: user.branchId,
                status: 'online',
                permissions,
                totpEnabled: false,
                canDeleteCustomer: canDeleteCustomer(user),
                canDeleteUser: canDeleteUser(user),
                canManageTickets: canManageTickets(user)
            }
        });
    } catch (err) {
        sendJson(500, { error: err.message || 'خطای سرور' });
    }
});

const RESET_TOKEN_EXPIRY_MINUTES = 60;

router.post('/forgot-password', async (req, res) => {
    try {
        const email = (req.body.email || '').toString().trim().toLowerCase();
        if (!email) return res.status(400).json({ error: 'ایمیل الزامی است' });
        const user = await User.findOne({ where: { email, isActive: true } });
        if (!user) {
            return res.status(200).json({ message: 'در صورت وجود حساب با این ایمیل، لینک بازیابی ارسال می‌شود.' });
        }
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);
        await PasswordResetToken.destroy({ where: { userId: user.id } });
        await PasswordResetToken.create({ userId: user.id, token, expiresAt });
        const settings = await getPanelSettings();
        const emailConfig = getPanelEmailConfig(settings);
        await emailService.sendPasswordReset(user, token, RESET_TOKEN_EXPIRY_MINUTES, emailConfig);
        res.status(200).json({ message: 'در صورت وجود حساب با این ایمیل، لینک بازیابی ارسال می‌شود.' });
    } catch (err) {
        res.status(500).json({ error: err.message || 'خطای سرور' });
    }
});

router.post('/reset-password', async (req, res) => {
    try {
        const { token: resetToken, newPassword } = req.body;
        if (!resetToken || !newPassword) return res.status(400).json({ error: 'توکن و رمز عبور جدید الزامی است' });
        if (String(newPassword).length < 6) return res.status(400).json({ error: 'رمز عبور حداقل ۶ کاراکتر باشد' });
        const row = await PasswordResetToken.findOne({
            where: { token: String(resetToken).trim() }
        });
        if (!row) return res.status(400).json({ error: 'لینک بازیابی نامعتبر یا منقضی شده است' });
        if (new Date() > row.expiresAt) {
            await row.destroy();
            return res.status(400).json({ error: 'لینک بازیابی منقضی شده است. دوباره درخواست دهید.' });
        }
        const user = await User.findByPk(row.userId);
        if (!user || !user.isActive) return res.status(400).json({ error: 'کاربر یافت نشد یا غیرفعال است' });
        user.password = newPassword;
        await user.save();
        await PasswordResetToken.destroy({ where: { userId: user.id } });
        res.json({ message: 'رمز عبور با موفقیت تغییر کرد. اکنون می‌توانید وارد شوید.' });
    } catch (err) {
        res.status(500).json({ error: err.message || 'خطای سرور' });
    }
});

router.post('/totp/verify-login', async (req, res) => {
    try {
        const { tempToken, code } = req.body;
        if (!tempToken || !code) return res.status(400).json({ error: 'کد احراز هویت الزامی است' });
        const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
        if (!decoded.totpStep || !decoded.id) return res.status(401).json({ error: 'لینک ورود منقضی شده. دوباره وارد شوید.' });
        const user = await User.findByPk(decoded.id);
        if (!user || !user.isActive || !user.totpEnabled || !user.totpSecret) {
            return res.status(401).json({ error: 'کاربر نامعتبر است' });
        }
        authenticator.options = { window: 1 };
        const verified = authenticator.verify({ token: String(code).replace(/\s/g, ''), secret: user.totpSecret });
        if (!verified) return res.status(401).json({ error: 'کد احراز هویت اشتباه یا منقضی است' });
        const now = new Date();
        await user.update({ lastLoginAt: now, status: 'online' });
        const clientIp = req.ip || req.connection?.remoteAddress || '';
        await logActivity({
            userId: user.id,
            branchId: user.branchId || null,
            departmentId: user.departmentId || null,
            action: 'user_login',
            entityType: 'user',
            entityId: user.id,
            summary: 'ورود به پورتال کارکنان کایا (۲FA)',
            metadata: {
                ip: clientIp,
                country: getCountryFromIp(clientIp),
                userAgent: (req.get && req.get('user-agent')) || null,
                email: user.email
            }
        });
        const token = issueToken(user);
        const permissions = getPermissions(user);
        try { (req.app && req.app.get('io'))?.emit('user_login', { userId: user.id }); } catch (_) {}
        setImmediate(async () => {
            try {
                const settings = await getPanelSettings();
                const emailConfig = getPanelEmailConfig(settings);
                await emailService.sendLoginNotification(user, req.ip || '', (req.get && req.get('user-agent')) || '', { emailConfig, loginNotificationEnabled: settings.emailLoginNotification });
            } catch (_) {}
        });
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                departmentId: user.departmentId,
                branchId: user.branchId,
                status: 'online',
                permissions,
                totpEnabled: true,
                canDeleteCustomer: canDeleteCustomer(user),
                canDeleteUser: canDeleteUser(user),
                canManageTickets: canManageTickets(user)
            }
        });
    } catch (err) {
        if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'زمان ورود تمام شده. دوباره وارد شوید.' });
        res.status(500).json({ error: err.message });
    }
});

router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'توکن یافت نشد' });
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id, {
            attributes: { exclude: ['password'] },
            include: [
                { association: 'branch', required: false },
                { association: 'department', required: false }
            ]
        });
        if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
        if (!user.isActive) return res.status(401).json({ error: 'کاربر مسدود است' });
        const u = user.toJSON();
        delete u.totpSecret;
        u.permissions = getPermissions(user);
        u.canDeleteCustomer = canDeleteCustomer(user);
        u.canDeleteUser = canDeleteUser(user);
        u.canManageTickets = canManageTickets(user);
        res.json(u);
    } catch (err) {
        res.status(401).json({ error: 'توکن نامعتبر است' });
    }
});

const { authMiddleware } = require('../middleware/auth');

router.get('/totp/setup', authMiddleware, async (req, res) => {
    try {
        if (req.user.totpEnabled) return res.status(400).json({ error: 'احراز دو مرحله‌ای از قبل فعال است' });
        const secret = authenticator.generateSecret(20);
        await req.user.update({ totpSecret: secret });
        const otpauth = authenticator.keyuri(req.user.email, 'Kaya CRM', secret);
        const qrDataUrl = await QRCode.toDataURL(otpauth, { width: 220, margin: 2 });
        res.json({ secret, qrCode: qrDataUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/totp/confirm-setup', authMiddleware, async (req, res) => {
    try {
        const code = (req.body.code || '').toString().replace(/\s/g, '');
        if (!code) return res.status(400).json({ error: 'کد شش‌رقمی را وارد کنید' });
        if (!req.user.totpSecret) return res.status(400).json({ error: 'ابتدا مرحلهٔ اسکن QR را انجام دهید' });
        authenticator.options = { window: 1 };
        const verified = authenticator.verify({ token: code, secret: req.user.totpSecret });
        if (!verified) return res.status(400).json({ error: 'کد اشتباه یا منقضی است' });
        await req.user.update({ totpEnabled: true });
        res.json({ ok: true, message: 'احراز هویت دو مرحله‌ای فعال شد' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/totp/disable', authMiddleware, async (req, res) => {
    try {
        const password = req.body.password;
        if (!password) return res.status(400).json({ error: 'رمز عبور الزامی است' });
        const ok = await req.user.comparePassword(password);
        if (!ok) return res.status(401).json({ error: 'رمز عبور اشتباه است' });
        await req.user.update({ totpSecret: null, totpEnabled: false });
        res.json({ ok: true, message: 'احراز هویت دو مرحله‌ای غیرفعال شد' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/logout', authMiddleware, async (req, res) => {
    try {
        const user = req.user;
        await user.update({ status: 'offline' });
        await logActivity({
            userId: user.id,
            branchId: user.branchId || null,
            departmentId: user.departmentId || null,
            action: 'user_logout',
            entityType: 'user',
            entityId: user.id,
            summary: 'خروج از پورتال',
            metadata: { email: user.email }
        });
        res.json({ ok: true, message: 'خروج انجام شد' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.patch('/me/presence', authMiddleware, async (req, res) => {
    try {
        const status = req.body.status;
        if (status && ['online', 'away', 'busy', 'offline'].indexOf(status) !== -1) {
            await req.user.update({ status });
        }
        res.json({ ok: true, status: req.user.status });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

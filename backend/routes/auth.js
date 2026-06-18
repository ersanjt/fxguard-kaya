const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const { User, sequelize, PasswordResetToken } = require('../models');
const { Op } = require('sequelize');
const crypto = require('crypto');
const logger = require('../config/logger');
const { logActivity } = require('../services/activityLog');
const { getCountryFromIp } = require('../lib/geoip');
const emailService = require('../services/emailService');
const { getPanelSettings, getPanelEmailConfig } = require('../services/panelSettingsLoader');
const telegramBotService = require('../services/telegramBotService');
const { sendAdminSecurityAlert } = require('../services/adminAlertService');
const { getPermissions, canDeleteCustomer, canDeleteUser, canManageTickets } = require('../lib/permissions');
const { validatePassword } = require('../lib/passwordValidation');
const { setAuthCookie, clearAuthCookie } = require('../lib/authCookie');

const JWT_OPTIONS = { expiresIn: process.env.JWT_EXPIRES_IN || '7d' };
const TOTP_TEMP_EXPIRY = '5m';
const TOTP_MAX_ATTEMPTS = 5;
const TOTP_TTL_SECONDS = 5 * 60; // 5 minutes

// استخراج IP واقعی کاربر — از X-Forwarded-For یا X-Real-IP (پشت Nginx)
function getRealIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        const firstIp = String(forwarded).split(',')[0].trim();
        if (firstIp) return firstIp;
    }
    const realIp = req.headers['x-real-ip'];
    if (realIp) return String(realIp).trim();
    const ip = req.ip || req.connection?.remoteAddress || '';
    // حذف پیشوند IPv6 mapped IPv4
    return ip.replace(/^::ffff:/, '');
}

// In-memory fallback for TOTP attempts (used when Redis is unavailable)
const totpAttemptsLocal = new Map();

async function getTotpAttempts(redisClient, jti) {
    try {
        if (redisClient && !redisClient.isStub) {
            const val = await redisClient.get(`totp:${jti}`);
            return val ? parseInt(val, 10) : 0;
        }
    } catch (_) {}
    return totpAttemptsLocal.get(jti) || 0;
}

async function setTotpAttempts(redisClient, jti, count) {
    try {
        if (redisClient && !redisClient.isStub) {
            await redisClient.set(`totp:${jti}`, String(count), { EX: TOTP_TTL_SECONDS });
            return;
        }
    } catch (_) {}
    totpAttemptsLocal.set(jti, count);
    setTimeout(() => totpAttemptsLocal.delete(jti), TOTP_TTL_SECONDS * 1000);
}

async function clearTotpAttempts(redisClient, jti) {
    try {
        if (redisClient && !redisClient.isStub) {
            await redisClient.del(`totp:${jti}`);
            return;
        }
    } catch (_) {}
    totpAttemptsLocal.delete(jti);
}

function issueToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        JWT_OPTIONS
    );
}

router.post('/login', async (req, res, _next) => {
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
        // Always run bcrypt to prevent timing-based username enumeration
        const passwordMatch = user ? await user.comparePassword(password) : await User.dummyCompare(password);
        if (!user || !passwordMatch) {
            const clientIp = getRealIp(req);
            await logActivity({
                userId: user ? user.id : null,
                action: 'login_failed',
                entityType: 'auth',
                summary: `ورود ناموفق برای: ${identifier}`,
                metadata: { ip: clientIp, identifier }
            }).catch(() => {});
            setImmediate(async () => {
                try {
                    const settings = await getPanelSettings();
                    const emailConfig = getPanelEmailConfig(settings);
                    await sendAdminSecurityAlert(
                        'login_failed',
                        {
                            identifier,
                            ip: clientIp,
                            country: getCountryFromIp(clientIp),
                            userAgent: (req.get && req.get('user-agent')) || null
                        },
                        { siteName: settings.siteName, emailConfig, settings }
                    );
                } catch (_) {}
            });
            return sendJson(401, { error: 'ایمیل/نام کاربری یا رمز عبور اشتباه است' });
        }
        if (user.totpEnabled) {
            const jti = crypto.randomBytes(16).toString('hex');
            const tempToken = jwt.sign(
                { id: user.id, totpStep: true, jti },
                process.env.JWT_SECRET,
                { expiresIn: TOTP_TEMP_EXPIRY }
            );
            return sendJson(200, { needTotp: true, tempToken, email: user.email, username: user.username });
        }
        const now = new Date();
        await user.update({ lastLoginAt: now, status: 'online' });
        const clientIp = getRealIp(req);
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
        setAuthCookie(res, token);
        try { (req.app && req.app.get('io'))?.emit('user_login', { userId: user.id }); } catch (_) {}
        setImmediate(async () => {
            try {
                const settings = await getPanelSettings();
                const emailConfig = getPanelEmailConfig(settings);
                await emailService.sendLoginNotification(user, clientIp, (req.get && req.get('user-agent')) || '', { emailConfig, loginNotificationEnabled: settings.emailLoginNotification });
                await sendAdminSecurityAlert(
                    'login_success',
                    {
                        userEmail: user.email,
                        username: user.username,
                        ip: clientIp,
                        country: getCountryFromIp(clientIp),
                        userAgent: (req.get && req.get('user-agent')) || null
                    },
                    { siteName: settings.siteName, emailConfig, settings }
                );
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
                avatar: user.avatar,
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
        logger.error('Login error', { error: err.message });
        sendJson(500, { error: 'خطای سرور. لطفاً دوباره تلاش کنید.' });
    }
});

const RESET_TOKEN_EXPIRY_MINUTES = 60;

const FORGOT_OK_MESSAGE =
    'If an account exists for this email address, you will receive password reset instructions shortly.';
const RESET_EMAIL_FAIL =
    'We could not send the password reset email. Please try again later or contact your administrator.';

router.post('/forgot-password', async (req, res, next) => {
    try {
        const email = (req.body.email || '').toString().trim().toLowerCase();
        if (!email) return res.status(400).json({ error: 'Email is required' });
        const user = await User.findOne({ where: { email, isActive: true } });
        if (!user) {
            return res.status(200).json({ message: FORGOT_OK_MESSAGE });
        }
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);
        await sequelize.transaction(async (t) => {
            await PasswordResetToken.destroy({ where: { userId: user.id }, transaction: t });
            await PasswordResetToken.create({ userId: user.id, token, expiresAt }, { transaction: t });
        });
        const settings = await getPanelSettings();
        const emailConfig = getPanelEmailConfig(settings);
        let sent = false;
        try {
            sent = await emailService.sendPasswordReset(user, token, RESET_TOKEN_EXPIRY_MINUTES, emailConfig);
        } catch (err) {
            logger.error('Failed to send password reset email:', err);
        }
        if (!sent) {
            await PasswordResetToken.destroy({ where: { userId: user.id } });
            return res.status(503).json({ error: RESET_EMAIL_FAIL });
        }
        return res.status(200).json({ message: FORGOT_OK_MESSAGE });
    } catch (err) {
        next(err);
    }
});

router.post('/reset-password', async (req, res, next) => {
    try {
        const { token: resetToken, newPassword } = req.body;
        if (!resetToken || !newPassword) {
            return res.status(400).json({ error: 'Reset token and new password are required' });
        }
        const pwdCheck = validatePassword(newPassword);
        if (!pwdCheck.valid) return res.status(400).json({ error: pwdCheck.message });
        const row = await PasswordResetToken.findOne({
            where: { token: String(resetToken).trim() }
        });
        if (!row) return res.status(400).json({ error: 'This reset link is invalid or has expired' });
        if (new Date() > row.expiresAt) {
            await row.destroy();
            return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });
        }
        const user = await User.findByPk(row.userId);
        if (!user || !user.isActive) {
            return res.status(400).json({ error: 'Account was not found or is disabled' });
        }
        user.password = newPassword;
        await user.save();
        await PasswordResetToken.destroy({ where: { userId: user.id } });
        res.json({ message: 'Your password has been updated. You can sign in now.' });
    } catch (err) {
        next(err);
    }
});

router.post('/totp/verify-login', async (req, res, next) => {
    try {
        const { tempToken, code } = req.body;
        if (!tempToken || !code) return res.status(400).json({ error: 'کد احراز هویت الزامی است' });
        const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
        if (!decoded.totpStep || !decoded.id) return res.status(401).json({ error: 'لینک ورود منقضی شده. دوباره وارد شوید.' });

        // Brute-force protection: max TOTP_MAX_ATTEMPTS per tempToken (Redis-backed for multi-process safety)
        const jti = decoded.jti || decoded.id;
        const redisClient = req.app.get('redisClient');
        const attempts = (await getTotpAttempts(redisClient, jti)) + 1;
        if (attempts > TOTP_MAX_ATTEMPTS) {
            return res.status(429).json({ error: 'تعداد تلاش‌های مجاز تمام شده. دوباره وارد شوید.' });
        }
        await setTotpAttempts(redisClient, jti, attempts);

        const user = await User.findByPk(decoded.id);
        if (!user || !user.isActive || !user.totpEnabled || !user.totpSecret) {
            return res.status(401).json({ error: 'کاربر نامعتبر است' });
        }
        const totpVerifier = authenticator.clone();
        totpVerifier.options = { window: 1 };
        const verified = totpVerifier.verify({ token: String(code).replace(/\s/g, ''), secret: user.totpSecret });
        if (!verified) return res.status(401).json({ error: 'کد احراز هویت اشتباه یا منقضی است' });

        // Clear attempt counter on success
        await clearTotpAttempts(redisClient, jti);
        const now = new Date();
        await user.update({ lastLoginAt: now, status: 'online' });
        const clientIp2fa = getRealIp(req);
        await logActivity({
            userId: user.id,
            branchId: user.branchId || null,
            departmentId: user.departmentId || null,
            action: 'user_login',
            entityType: 'user',
            entityId: user.id,
            summary: 'ورود به پورتال کارکنان کایا (۲FA)',
            metadata: {
                ip: clientIp2fa,
                country: getCountryFromIp(clientIp2fa),
                userAgent: (req.get && req.get('user-agent')) || null,
                email: user.email
            }
        });
        const token = issueToken(user);
        const permissions = getPermissions(user);
        setAuthCookie(res, token);
        try { (req.app && req.app.get('io'))?.emit('user_login', { userId: user.id }); } catch (_) {}
        setImmediate(async () => {
            try {
                const settings = await getPanelSettings();
                const emailConfig = getPanelEmailConfig(settings);
                await emailService.sendLoginNotification(user, clientIp2fa, (req.get && req.get('user-agent')) || '', { emailConfig, loginNotificationEnabled: settings.emailLoginNotification });
                await sendAdminSecurityAlert(
                    'login_success',
                    {
                        userEmail: user.email,
                        username: user.username,
                        ip: clientIp2fa,
                        country: getCountryFromIp(clientIp2fa),
                        userAgent: (req.get && req.get('user-agent')) || null
                    },
                    { siteName: settings.siteName, emailConfig, settings }
                );
            } catch (_) {}
        });
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                avatar: user.avatar,
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
        next(err);
    }
});

const { authMiddleware } = require('../middleware/auth');

router.get('/me', authMiddleware, async (req, res, next) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] },
            include: [
                { association: 'branch', required: false },
                { association: 'department', required: false }
            ]
        });
        if (!user) return res.status(401).json({ error: 'کاربر مسدود یا نامعتبر است' });
        if (!user.isActive) return res.status(401).json({ error: 'کاربر مسدود است' });
        const u = user.toJSON();
        delete u.totpSecret;
        u.permissions = getPermissions(user);
        u.canDeleteCustomer = canDeleteCustomer(user);
        u.canDeleteUser = canDeleteUser(user);
        u.canManageTickets = canManageTickets(user);
        if (req.authToken) u.token = req.authToken;
        res.json(u);
    } catch (err) {
        next(err);
    }
});

router.get('/totp/setup', authMiddleware, async (req, res, next) => {
    try {
        if (req.user.totpEnabled) return res.status(400).json({ error: 'احراز دو مرحله‌ای از قبل فعال است' });
        const secret = authenticator.generateSecret(20);
        await req.user.update({ totpSecret: secret });
        const otpauth = authenticator.keyuri(req.user.email, 'Kaya CRM', secret);
        const qrDataUrl = await QRCode.toDataURL(otpauth, { width: 220, margin: 2 });
        res.json({ secret, qrCode: qrDataUrl });
    } catch (err) {
        next(err);
    }
});

router.post('/totp/confirm-setup', authMiddleware, async (req, res, next) => {
    try {
        const code = (req.body.code || '').toString().replace(/\s/g, '');
        if (!code) return res.status(400).json({ error: 'کد شش‌رقمی را وارد کنید' });
        if (!req.user.totpSecret) return res.status(400).json({ error: 'ابتدا مرحلهٔ اسکن QR را انجام دهید' });
        const totpVerifier = authenticator.clone();
        totpVerifier.options = { window: 1 };
        const verified = totpVerifier.verify({ token: code, secret: req.user.totpSecret });
        if (!verified) return res.status(400).json({ error: 'کد اشتباه یا منقضی است' });
        await req.user.update({ totpEnabled: true });
        res.json({ ok: true, message: 'احراز هویت دو مرحله‌ای فعال شد' });
    } catch (err) {
        next(err);
    }
});

router.post('/totp/disable', authMiddleware, async (req, res, next) => {
    try {
        const password = req.body.password;
        if (!password) return res.status(400).json({ error: 'رمز عبور الزامی است' });
        const ok = await req.user.comparePassword(password);
        if (!ok) return res.status(401).json({ error: 'رمز عبور اشتباه است' });
        await req.user.update({ totpSecret: null, totpEnabled: false });
        res.json({ ok: true, message: 'احراز هویت دو مرحله‌ای غیرفعال شد' });
    } catch (err) {
        next(err);
    }
});

router.post('/logout', authMiddleware, async (req, res, next) => {
    try {
        clearAuthCookie(res);
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
        setImmediate(async () => {
            try {
                const clientIp = getRealIp(req);
                const settings = await getPanelSettings();
                const emailConfig = getPanelEmailConfig(settings);
                await sendAdminSecurityAlert(
                    'logout',
                    {
                        userEmail: user.email,
                        username: user.username,
                        ip: clientIp,
                        country: getCountryFromIp(clientIp),
                        userAgent: (req.get && req.get('user-agent')) || null
                    },
                    { siteName: settings.siteName, emailConfig, settings }
                );
            } catch (_) {}
        });
        res.json({ ok: true, message: 'خروج انجام شد' });
    } catch (err) {
        next(err);
    }
});
// تولید توکن اتصال تلگرام (برای کاربر لاگین‌شده)
router.post('/telegram-link-token', authMiddleware, async (req, res, next) => {
    try {
        const user = req.user;
        const token = crypto.randomBytes(16).toString('hex');
        const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 دقیقه
        await user.update({ telegramLinkToken: token, telegramLinkTokenExpiry: expiry });
        const envName = String(process.env.TELEGRAM_BOT_USERNAME || '')
            .replace(/^@/, '')
            .trim();
        const cachedName =
            typeof telegramBotService.getCachedBotUsername === 'function'
                ? String(telegramBotService.getCachedBotUsername() || '').replace(/^@/, '').trim()
                : '';
        const botName = envName || cachedName;
        const botUrl = botName ? `https://t.me/${botName}?start=${token}` : null;
        res.json({
            token,
            expiresAt: expiry.toISOString(),
            botUrl,
            instruction: `دستور زیر را در تلگرام ارسال کنید:\n/link ${token}`
        });
    } catch (err) {
        next(err);
    }
});

// نمایش وضعیت اتصال تلگرام کاربر
router.get('/telegram-status', authMiddleware, async (req, res, next) => {
    try {
        const user = req.user;
        res.json({
            linked: !!(user.telegramChatId),
            chatId: user.telegramChatId || null
        });
    } catch (err) {
        next(err);
    }
});

// قطع اتصال تلگرام کاربر از طریق پنل
router.delete('/telegram-link', authMiddleware, async (req, res, next) => {
    try {
        const user = req.user;
        await user.update({ telegramChatId: null, telegramLinkToken: null, telegramLinkTokenExpiry: null });
        res.json({ ok: true, message: 'اتصال تلگرام قطع شد' });
    } catch (err) {
        next(err);
    }
});

router.patch('/me/presence', authMiddleware, async (req, res, next) => {
    try {
        const status = req.body.status;
        const validStatuses = ['online', 'away', 'busy', 'offline'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'وضعیت نامعتبر است. مقادیر مجاز: online, away, busy, offline' });
        }
        await req.user.update({ status });
        res.json({ ok: true, status });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

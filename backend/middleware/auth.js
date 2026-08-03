const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { getPermissions, canAccess, canManageUsers, canManageTickets, canViewCustomerPhone, canDeleteCustomer, canDeleteUser, canManageConversations, canViewArchivedConversations, canViewHiddenConversations } = require('../lib/permissions');

const { COOKIE_NAME } = require('../lib/authCookie');

function collectCandidateTokens(req) {
    const tokens = [];
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const bearer = authHeader.slice(7).trim();
        if (bearer) tokens.push(bearer);
    }
    if (req.cookies && req.cookies[COOKIE_NAME]) {
        const cookieTok = String(req.cookies[COOKIE_NAME] || '').trim();
        if (cookieTok && tokens.indexOf(cookieTok) === -1) tokens.push(cookieTok);
    }
    return tokens;
}

function attachAuthUser(req, user, token) {
    req.user = user;
    req.userId = user.id;
    req.authToken = token;
    req.isOwner = user.role === 'owner';
    req.permissions = getPermissions(user);
    req.canAccess = (section) => canAccess(user, section);
    req.canManageUsers = () => canManageUsers(req.user);
    req.canManageTickets = () => canManageTickets(req.user);
    req.canViewCustomerPhone = () => canViewCustomerPhone(req.user);
    req.canDeleteCustomer = () => canDeleteCustomer(req.user);
    req.canDeleteUser = () => canDeleteUser(req.user);
    req.canManageConversations = () => canManageConversations(req.user);
    req.canViewArchivedConversations = () => canViewArchivedConversations(req.user);
    req.canViewHiddenConversations = () => canViewHiddenConversations(req.user);
}

async function resolveUserFromToken(token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.totpStep) {
        const err = new Error('totp_step');
        err.code = 'TOTP_STEP';
        throw err;
    }
    const user = await User.findByPk(decoded.id, {
        include: [
            { association: 'branch', required: false },
            { association: 'department', required: false }
        ]
    });
    if (!user || !user.isActive) {
        const err = new Error('inactive');
        err.code = 'INACTIVE';
        throw err;
    }
    return user;
}

/**
 * Bearer را اول امتحان می‌کند؛ اگر نامعتبر بود کوکی httpOnly را هم امتحان می‌کند
 * تا نشست ذخیره‌شدهٔ کهنه باعث بیرون‌انداختن نشود.
 */
async function authMiddleware(req, res, next) {
    const tokens = collectCandidateTokens(req);
    if (!tokens.length) {
        return res.status(401).json({ error: 'توکن یافت نشد' });
    }

    let sawTotpStep = false;
    let lastErr = null;
    for (const token of tokens) {
        try {
            const user = await resolveUserFromToken(token);
            attachAuthUser(req, user, token);
            return next();
        } catch (err) {
            lastErr = err;
            if (err && err.code === 'TOTP_STEP') sawTotpStep = true;
        }
    }

    if (sawTotpStep) {
        return res.status(401).json({ error: 'لطفاً احراز دو مرحله‌ای را تکمیل کنید' });
    }
    if (lastErr && lastErr.code === 'INACTIVE') {
        return res.status(401).json({ error: 'کاربر مسدود یا نامعتبر است' });
    }
    return res.status(401).json({ error: 'توکن نامعتبر یا منقضی' });
}

/** مثل authMiddleware ولی بدون 401: برای مسیرهای عمومی که با توکن معتبر اطلاعات بیشتری برمی‌گردانند */
async function optionalAuthMiddleware(req, res, next) {
    const tokens = collectCandidateTokens(req);
    if (!tokens.length) {
        req.user = null;
        req.canAccess = () => false;
        return next();
    }
    for (const token of tokens) {
        try {
            const user = await resolveUserFromToken(token);
            attachAuthUser(req, user, token);
            return next();
        } catch (_) {
            /* try next candidate */
        }
    }
    req.user = null;
    req.canAccess = () => false;
    return next();
}

function requireSection(section) {
    return (req, res, next) => {
        if (!req.canAccess(section)) return res.status(403).json({ error: 'دسترسی به این بخش ندارید' });
        next();
    };
}

module.exports = { authMiddleware, optionalAuthMiddleware, requireSection, getPermissions, canAccess, canManageUsers };

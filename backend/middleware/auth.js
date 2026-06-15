const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { getPermissions, canAccess, canManageUsers, canManageTickets, canDeleteCustomer, canDeleteUser, canManageConversations, canViewArchivedConversations, canViewHiddenConversations } = require('../lib/permissions');

const { COOKIE_NAME } = require('../lib/authCookie');

async function authMiddleware(req, res, next) {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies[COOKIE_NAME]) {
        token = req.cookies[COOKIE_NAME];
    }
    if (!token) {
        return res.status(401).json({ error: 'توکن یافت نشد' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id, {
            include: [
                { association: 'branch', required: false },
                { association: 'department', required: false }
            ]
        });
        if (!user || !user.isActive) return res.status(401).json({ error: 'کاربر مسدود یا نامعتبر است' });
        req.user = user;
        req.userId = user.id;
        req.isOwner = user.role === 'owner';
        req.permissions = getPermissions(user);
        req.canAccess = (section) => canAccess(user, section);
        req.canManageUsers = () => canManageUsers(req.user);
        req.canManageTickets = () => canManageTickets(req.user);
        req.canDeleteCustomer = () => canDeleteCustomer(req.user);
        req.canDeleteUser = () => canDeleteUser(req.user);
        req.canManageConversations = () => canManageConversations(req.user);
        req.canViewArchivedConversations = () => canViewArchivedConversations(req.user);
        req.canViewHiddenConversations = () => canViewHiddenConversations(req.user);
        next();
    } catch (err) {
        return res.status(401).json({ error: 'توکن نامعتبر یا منقضی' });
    }
}

/** مثل authMiddleware ولی بدون 401: برای مسیرهای عمومی که با توکن معتبر اطلاعات بیشتری برمی‌گردانند */
async function optionalAuthMiddleware(req, res, next) {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies[COOKIE_NAME]) {
        token = req.cookies[COOKIE_NAME];
    }
    if (!token) {
        req.user = null;
        req.canAccess = () => false;
        return next();
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id, {
            include: [
                { association: 'branch', required: false },
                { association: 'department', required: false }
            ]
        });
        if (!user || !user.isActive) {
            req.user = null;
            req.canAccess = () => false;
            return next();
        }
        req.user = user;
        req.userId = user.id;
        req.isOwner = user.role === 'owner';
        req.permissions = getPermissions(user);
        req.canAccess = (section) => canAccess(user, section);
        req.canManageUsers = () => canManageUsers(req.user);
        req.canManageTickets = () => canManageTickets(req.user);
        req.canDeleteCustomer = () => canDeleteCustomer(req.user);
        req.canDeleteUser = () => canDeleteUser(req.user);
        req.canManageConversations = () => canManageConversations(req.user);
        req.canViewArchivedConversations = () => canViewArchivedConversations(req.user);
        req.canViewHiddenConversations = () => canViewHiddenConversations(req.user);
        return next();
    } catch (_) {
        req.user = null;
        req.canAccess = () => false;
        return next();
    }
}

function requireSection(section) {
    return (req, res, next) => {
        if (!req.canAccess(section)) return res.status(403).json({ error: 'دسترسی به این بخش ندارید' });
        next();
    };
}

module.exports = { authMiddleware, optionalAuthMiddleware, requireSection, getPermissions, canAccess, canManageUsers };

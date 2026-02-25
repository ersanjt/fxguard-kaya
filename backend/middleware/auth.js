const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { getPermissions, canAccess, canManageUsers, canManageTickets, canDeleteCustomer, canDeleteUser, canManageConversations, canViewArchivedConversations } = require('../lib/permissions');

async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'توکن یافت نشد' });
    }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
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
        next();
    } catch (err) {
        return res.status(401).json({ error: 'توکن نامعتبر یا منقضی' });
    }
}

function requireSection(section) {
    return (req, res, next) => {
        if (!req.canAccess(section)) return res.status(403).json({ error: 'دسترسی به این بخش ندارید' });
        next();
    };
}

module.exports = { authMiddleware, requireSection, getPermissions, canAccess, canManageUsers };

const express = require('express');
const router = express.Router();
const { Sequelize, Conversation, Message, User, Branch, Department, Customer, ActivityLog, Ticket, TicketReply, Task } = require('../models');
const { Op } = require('sequelize');
const { isMainAdmin } = require('../lib/permissions');

function ownerOnly(req, res, next) {
    if (isMainAdmin(req.user) || req.user.role === 'owner') return next();
    return res.status(403).json({ error: 'فقط مالک شرکت به این بخش دسترسی دارد' });
}

// مالک، ادمین اصلی، ادمین، مدیر، ناظر — برای مشاهده ورودها و وضعیت آنلاین کارکنان
function canViewStaffActivity(req, res, next) {
    if (isMainAdmin(req.user) || ['owner', 'admin', 'manager', 'supervisor'].indexOf(req.user.role) !== -1) return next();
    return res.status(403).json({ error: 'دسترسی به این بخش محدود است' });
}

// لاگ ورود کارکنان — برای مدیر و بالاتر
router.get('/logins', canViewStaffActivity, async (req, res) => {
    try {
        const { limit = 50, page = 1 } = req.query;
        const { rows, count } = await ActivityLog.findAndCountAll({
            where: { action: 'user_login' },
            include: [
                { model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'], required: false },
                { model: Branch, as: 'branch', attributes: ['id', 'name', 'city', 'country'], required: false }
            ],
            order: [['createdAt', 'DESC']],
            limit: Math.min(parseInt(limit) || 50, 100),
            offset: (parseInt(page) - 1) * (parseInt(limit) || 50)
        });
        res.json({ data: rows, total: count, page: parseInt(page) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// لیست کارکنان آنلاین — برای مدیر و بالاتر
router.get('/online', canViewStaffActivity, async (req, res) => {
    try {
        const users = await User.findAll({
            where: { isActive: true, status: ['online', 'away', 'busy'] },
            attributes: ['id', 'name', 'email', 'role', 'status', 'lastLoginAt'],
            include: [{ model: Branch, as: 'branch', attributes: ['id', 'name', 'city'], required: false }],
            order: [['lastLoginAt', 'DESC']]
        });
        res.json({ data: users });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// جزئیات فعالیت کاربر — ورود/خروج، ساعات آنلاین، چت‌ها، تیکت‌ها، تسک‌ها (بدون اطلاع به کاربر)
router.get('/user/:userId/detail', canViewStaffActivity, async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findByPk(userId, {
            attributes: ['id', 'name', 'email', 'role', 'status', 'lastLoginAt'],
            include: [{ model: Branch, as: 'branch', attributes: ['id', 'name', 'city'], required: false }]
        });
        if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });

        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [logins, logouts, activities, convCount, msgCount, ticketsCreated, ticketsReplied, ticketsAssigned, tasksCompleted, conversations] = await Promise.all([
            ActivityLog.findAll({ where: { userId, action: 'user_login' }, order: [['createdAt', 'DESC']], limit: 50 }),
            ActivityLog.findAll({ where: { userId, action: 'user_logout' }, order: [['createdAt', 'DESC']], limit: 50 }),
            ActivityLog.findAll({ where: { userId, action: { [Op.notIn]: ['user_login', 'user_logout'] } }, order: [['createdAt', 'DESC']], limit: 100 }),
            Conversation.count({ where: { assignedTo: userId } }),
            Message.count({ where: { userId, direction: 'outgoing' } }),
            Ticket.count({ where: { createdBy: userId } }),
            TicketReply.count({ where: { userId } }),
            Ticket.count({ where: { assignedTo: userId } }),
            Task.count({ where: { completedBy: userId, status: 'done' } }),
            Conversation.findAll({
                where: { assignedTo: userId },
                include: [{ model: Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'email'], required: false }],
                order: [['lastMessageAt', 'DESC']],
                limit: 30
            })
        ]);

        const sessions = [];
        const loginsMap = logins.map(l => ({ at: new Date(l.createdAt), type: 'login' }));
        const logoutsMap = logouts.map(l => ({ at: new Date(l.createdAt), type: 'logout' }));
        const allEvents = [...loginsMap, ...logoutsMap].sort((a, b) => a.at - b.at);
        let onlineMinutes = 0;
        let lastLogin = null;
        for (const e of allEvents) {
            if (e.type === 'login') lastLogin = e.at;
            else if (e.type === 'logout' && lastLogin) {
                onlineMinutes += (e.at - lastLogin) / (60 * 1000);
                sessions.push({ loginAt: lastLogin, logoutAt: e.at, minutes: Math.round((e.at - lastLogin) / (60 * 1000)) });
                lastLogin = null;
            }
        }
        if (lastLogin && ['online', 'away', 'busy'].indexOf(user.status) !== -1) {
            onlineMinutes += (now - lastLogin) / (60 * 1000);
            sessions.push({ loginAt: lastLogin, logoutAt: null, minutes: Math.round((now - lastLogin) / (60 * 1000)) });
        }

        const recentLogins = logins.slice(0, 20).map(l => ({ createdAt: l.createdAt, summary: l.summary }));
        const recentLogouts = logouts.slice(0, 20).map(l => ({ createdAt: l.createdAt, summary: l.summary }));
        const recentActivities = activities.slice(0, 30).map(a => ({ createdAt: a.createdAt, action: a.action, summary: a.summary }));
        const conversationsWithCustomers = (conversations || []).map(c => ({
            id: c.id,
            status: c.status,
            lastMessageAt: c.lastMessageAt,
            customer: c.customer ? { id: c.customer.id, name: c.customer.name, phone: c.customer.phone } : null
        }));

        res.json({
            user: user.toJSON(),
            stats: {
                onlineMinutesTotal: Math.round(onlineMinutes),
                onlineHoursTotal: (onlineMinutes / 60).toFixed(1),
                sessionsCount: sessions.length,
                conversationsAssigned: convCount,
                messagesSent: msgCount,
                ticketsCreated,
                ticketsReplied,
                ticketsAssigned,
                tasksCompleted
            },
            sessions: sessions.slice(0, 20),
            recentLogins,
            recentLogouts,
            recentActivities,
            conversations: conversationsWithCustomers
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.use(ownerOnly);

// همه مکالمات با جزئیات شعبه، دپارتمان، کارمند — برای نظارت مالک
router.get('/conversations', async (req, res) => {
    try {
        const { branchId, departmentId, userId, status, limit = 50, page = 1 } = req.query;
        const where = {};
        if (branchId) where.branchId = branchId;
        if (departmentId) where.departmentId = departmentId;
        if (userId) where.assignedTo = userId;
        if (status) where.status = status;
        const { rows, count } = await Conversation.findAndCountAll({
            where,
            include: [
                { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'email'] },
                { model: User, as: 'assignee', attributes: ['id', 'name', 'email', 'role'], include: [{ model: Branch, as: 'branch', attributes: ['id', 'name', 'city', 'country'] }] },
                { model: Department, as: 'department', attributes: ['id', 'name'], include: [{ model: Branch, as: 'branch', attributes: ['id', 'name', 'city'] }] },
                { model: Branch, as: 'branch', attributes: ['id', 'name', 'city', 'country'], required: false }
            ],
            order: [['lastMessageAt', 'DESC']],
            limit: Math.min(parseInt(limit) || 50, 100),
            offset: (parseInt(page) - 1) * (parseInt(limit) || 50)
        });
        res.json({ data: rows, total: count, page: parseInt(page) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// لاگ فعالیت‌ها — چه کسی چه عملی انجام داده
router.get('/activity', async (req, res) => {
    try {
        const { branchId, userId, action, limit = 100, page = 1 } = req.query;
        const where = {};
        if (branchId) where.branchId = branchId;
        if (userId) where.userId = userId;
        if (action) where.action = action;
        const { rows, count } = await ActivityLog.findAndCountAll({
            where,
            include: [
                { model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'], required: false },
                { model: Branch, as: 'branch', attributes: ['id', 'name', 'city'], required: false },
                { model: Department, as: 'department', attributes: ['id', 'name'], required: false }
            ],
            order: [['createdAt', 'DESC']],
            limit: Math.min(parseInt(limit) || 100, 200),
            offset: (parseInt(page) - 1) * (parseInt(limit) || 100)
        });
        res.json({ data: rows, total: count, page: parseInt(page) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// خلاصه عملکرد به تفکیک شعبه و کاربر — برای مالک
router.get('/performance', async (req, res) => {
    try {
        const [branches, users, conversationCount, messageCount] = await Promise.all([
            Branch.findAll({ where: { isActive: true }, attributes: ['id', 'name', 'city', 'country'], order: [['name', 'ASC']] }),
            User.findAll({ where: { isActive: true }, attributes: ['id', 'name', 'email', 'role', 'branchId'], include: [{ model: Branch, as: 'branch', attributes: ['id', 'name', 'city'], required: false }] }),
            Conversation.count(),
            Message.count({ where: { direction: 'outgoing' } })
        ]);
        const branchIds = branches.map(b => b.id);
        const convCountByBranch = await Conversation.findAll({
            attributes: ['branchId', [Sequelize.fn('COUNT', '*'), 'count']],
            where: { branchId: { [Op.in]: branchIds } },
            group: ['branchId'],
            raw: true
        }).catch(() => []);
        const msgCountByUser = await Message.findAll({
            attributes: ['userId', [Sequelize.fn('COUNT', '*'), 'count']],
            where: { direction: 'outgoing', userId: { [Op.ne]: null } },
            group: ['userId'],
            raw: true
        }).catch(() => []);
        const countByBranch = {};
        convCountByBranch.forEach(r => { countByBranch[r.branchId] = parseInt(r.count, 10); });
        const countByUser = {};
        msgCountByUser.forEach(r => { countByUser[r.userId] = parseInt(r.count, 10); });
        res.json({
            summary: { conversationCount, messageCount },
            branches: branches.map(b => ({ ...b.toJSON(), conversationCount: countByBranch[b.id] || 0 })),
            users: users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, branch: u.branch, outgoingMessageCount: countByUser[u.id] || 0 }))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

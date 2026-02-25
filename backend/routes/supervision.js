const express = require('express');
const router = express.Router();
const { Sequelize, Conversation, Message, User, Branch, Department, Customer, ActivityLog, Ticket, TicketReply, Task, InternalThread, InternalMessage, InternalThreadParticipant } = require('../models');
const { Op } = require('sequelize');
const { isMainAdmin } = require('../lib/permissions');

function ownerOnly(req, res, next) {
    if (!req.canAccess('supervision')) return res.status(403).json({ error: 'دسترسی به بخش نظارت ندارید' });
    if (isMainAdmin(req.user) || req.user.role === 'owner') return next();
    return res.status(403).json({ error: 'فقط مالک شرکت به این بخش دسترسی دارد' });
}

// مالک، ادمین اصلی، ادمین، مدیر، ناظر — برای مشاهده ورودها و وضعیت آنلاین کارکنان
function canViewStaffActivity(req, res, next) {
    if (!req.canAccess('staff_activity')) return res.status(403).json({ error: 'دسترسی به بخش ورودها و وضعیت آنلاین ندارید' });
    if (isMainAdmin(req.user) || ['owner', 'admin', 'manager', 'supervisor'].indexOf(req.user.role) !== -1) return next();
    return res.status(403).json({ error: 'دسترسی به این بخش محدود است' });
}

// لاگ ورود کارکنان — برای مدیر و بالاتر (شامل IP و کشور)
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
        const data = rows.map(r => {
            const m = r.metadata || {};
            return {
                ...r.toJSON(),
                ip: m.ip || null,
                country: m.country || null
            };
        });
        res.json({ data, total: count, page: parseInt(page) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// لیست کارکنان آنلاین — برای مدیر و بالاتر (شامل IP و کشور آخرین ورود)
router.get('/online', canViewStaffActivity, async (req, res) => {
    try {
        const users = await User.findAll({
            where: { isActive: true, status: ['online', 'away', 'busy'] },
            attributes: ['id', 'name', 'email', 'role', 'status', 'lastLoginAt'],
            include: [{ model: Branch, as: 'branch', attributes: ['id', 'name', 'city'], required: false }],
            order: [['lastLoginAt', 'DESC']]
        });
        const userIds = users.map(u => u.id);
        const loginByUser = {};
        if (userIds.length > 0) {
            const latestLogins = await Promise.all(userIds.map(uid =>
                ActivityLog.findOne({
                    where: { action: 'user_login', userId: uid },
                    attributes: ['userId', 'metadata'],
                    order: [['createdAt', 'DESC']],
                    raw: true
                })
            ));
            latestLogins.forEach((l, i) => {
                if (l) loginByUser[userIds[i]] = l;
            });
        }
        const data = users.map(u => {
            const j = u.toJSON();
            const lastLogin = loginByUser[u.id];
            const m = lastLogin && lastLogin.metadata ? lastLogin.metadata : {};
            j.lastLoginIp = m.ip || null;
            j.lastLoginCountry = m.country || null;
            return j;
        });
        res.json({ data });
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
        const { branchId, departmentId, userId, status, unassigned, limit = 50, page = 1 } = req.query;
        const where = {};
        if (branchId) where.branchId = branchId;
        if (departmentId) where.departmentId = departmentId;
        if (userId) where.assignedTo = userId;
        if (status) where.status = status;
        if (unassigned === '1' || unassigned === 'true') where.assignedTo = null;
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

// لیست چت‌های داخلی — برای مالک/ادمین (مشاهده کی با کی صحبت کرده)
router.get('/internal-chats', async (req, res) => {
    try {
        const { limit = 50, page = 1, userId } = req.query;
        const lim = Math.min(parseInt(limit) || 50, 100);
        const off = (parseInt(page) - 1) * lim;
        let threadIds = null;
        if (userId) {
            const parts = await InternalThreadParticipant.findAll({ where: { userId }, attributes: ['threadId'] });
            threadIds = parts.map(p => p.threadId);
            if (threadIds.length === 0) return res.json({ data: [], total: 0, page: parseInt(page) });
        }
        const where = threadIds ? { id: { [Op.in]: threadIds } } : {};
        const { rows, count } = await InternalThread.findAndCountAll({
            where,
            include: [{ model: User, as: 'participants', attributes: ['id', 'name', 'email', 'role'], through: { attributes: [] } }],
            order: [['lastMessageAt', 'DESC']],
            limit: lim,
            offset: off
        });
        const list = await Promise.all(rows.map(async (t) => {
            const lastMsg = await InternalMessage.findOne({
                where: { threadId: t.id },
                include: [{ model: User, as: 'fromUser', attributes: ['id', 'name'] }],
                order: [['createdAt', 'DESC']]
            });
            const parts = (t.participants || []).map(p => ({ id: p.id, name: p.name, email: p.email, role: p.role }));
            return {
                id: t.id,
                lastMessageAt: t.lastMessageAt,
                lastMessage: lastMsg ? { content: lastMsg.content, fromUser: lastMsg.fromUser } : null,
                participants: parts
            };
        }));
        res.json({ data: list, total: count, page: parseInt(page) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// پیام‌های یک چت داخلی — برای مالک/ادمین
router.get('/internal-chats/:threadId/messages', async (req, res) => {
    try {
        const messages = await InternalMessage.findAll({
            where: { threadId: req.params.threadId },
            include: [{ model: User, as: 'fromUser', attributes: ['id', 'name', 'email'] }],
            order: [['createdAt', 'ASC']]
        });
        const thread = await InternalThread.findByPk(req.params.threadId, {
            include: [{ model: User, as: 'participants', attributes: ['id', 'name', 'email'], through: { attributes: [] } }]
        });
        res.json({ data: messages, thread: thread ? { id: thread.id, participants: thread.participants } : null });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// خلاصه عملکرد به تفکیک شعبه و کاربر — برای مالک
router.get('/performance', async (req, res) => {
    try {
        const [branches, users, conversationCount, messageCount, openCount, pendingCount, unassignedCount, todayMsgCount, allConvsForResponse, allConvsForRating] = await Promise.all([
            Branch.findAll({ where: { isActive: true }, attributes: ['id', 'name', 'city', 'country'], order: [['name', 'ASC']] }),
            User.findAll({ where: { isActive: true }, attributes: ['id', 'name', 'email', 'role', 'branchId'], include: [{ model: Branch, as: 'branch', attributes: ['id', 'name', 'city'], required: false }] }),
            Conversation.count(),
            Message.count({ where: { direction: 'outgoing' } }),
            Conversation.count({ where: { status: 'open' } }),
            Conversation.count({ where: { status: 'pending' } }),
            Conversation.count({ where: { assignedTo: null } }),
            Message.count({ where: { direction: 'outgoing', createdAt: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
            Conversation.findAll({ where: { lastIncomingMessageAt: { [Op.ne]: null }, lastOutgoingMessageAt: { [Op.ne]: null } }, attributes: ['id', 'branchId', 'assignedTo', 'lastIncomingMessageAt', 'lastOutgoingMessageAt', 'firstReplyAt', 'rating'], raw: true }),
            Conversation.findAll({ where: { rating: { [Op.ne]: null } }, attributes: ['id', 'branchId', 'assignedTo', 'rating'], raw: true })
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

        function calcResponseTimeMinutes(convs) {
            const diffs = convs.map(c => {
                const inc = new Date(c.lastIncomingMessageAt).getTime();
                const out = new Date(c.lastOutgoingMessageAt).getTime();
                if (out >= inc) return (out - inc) / 60000;
                return null;
            }).filter(x => x != null && x >= 0 && x < 10080);
            if (diffs.length === 0) return null;
            return Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length * 10) / 10;
        }
        function calcAvgRating(convs) {
            if (!convs.length) return null;
            const sum = convs.reduce((a, c) => a + (c.rating || 0), 0);
            return Math.round(sum / convs.length * 10) / 10;
        }

        const overallDiffs = allConvsForResponse.map(c => {
            const inc = new Date(c.lastIncomingMessageAt).getTime();
            const out = new Date(c.lastOutgoingMessageAt).getTime();
            if (out >= inc) return (out - inc) / 60000;
            return null;
        }).filter(x => x != null && x >= 0 && x < 10080);
        const avgResponseTimeMinutes = overallDiffs.length ? Math.round(overallDiffs.reduce((a, b) => a + b, 0) / overallDiffs.length * 10) / 10 : null;
        const avgRating = allConvsForRating.length ? Math.round(allConvsForRating.reduce((a, c) => a + (c.rating || 0), 0) / allConvsForRating.length * 10) / 10 : null;
        const ratedConversationsCount = allConvsForRating.length;

        const usersWithStats = users.map(u => {
            const userConvsResp = allConvsForResponse.filter(c => c.assignedTo === u.id);
            const userConvsRate = allConvsForRating.filter(c => c.assignedTo === u.id);
            return {
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                branch: u.branch,
                outgoingMessageCount: countByUser[u.id] || 0,
                avgResponseTimeMinutes: calcResponseTimeMinutes(userConvsResp),
                avgRating: calcAvgRating(userConvsRate),
                ratedConversationsCount: userConvsRate.length
            };
        });

        const branchesWithStats = branches.map(b => {
            const branchConvs = allConvsForResponse.filter(c => c.branchId === b.id);
            return {
                ...b.toJSON(),
                conversationCount: countByBranch[b.id] || 0,
                avgResponseTimeMinutes: calcResponseTimeMinutes(branchConvs)
            };
        });

        res.json({
            summary: {
                conversationCount,
                messageCount,
                openCount,
                pendingCount,
                unassignedCount,
                todayMessageCount: todayMsgCount,
                avgResponseTimeMinutes,
                avgRating,
                ratedConversationsCount
            },
            branches: branchesWithStats,
            users: usersWithStats
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// گزارش حضور و غیاب — بر اساس ActivityLog (user_login, user_logout)
router.get('/attendance-report', canViewStaffActivity, async (req, res) => {
    try {
        const { branchId, userId, from, to } = req.query;
        const fromDate = from ? new Date(from) : new Date(new Date().setDate(1));
        const toDate = to ? new Date(to) : new Date();
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);

        const whereLogin = { action: 'user_login', createdAt: { [Op.between]: [fromDate, toDate] } };
        const whereLogout = { action: 'user_logout', createdAt: { [Op.between]: [fromDate, toDate] } };
        if (branchId) { whereLogin.branchId = branchId; whereLogout.branchId = branchId; }
        if (userId) { whereLogin.userId = userId; whereLogout.userId = userId; }

        const [logins, logouts, users] = await Promise.all([
            ActivityLog.findAll({ where: whereLogin, include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }, { model: Branch, as: 'branch', attributes: ['id', 'name'] }], order: [['createdAt', 'ASC']] }),
            ActivityLog.findAll({ where: whereLogout, order: [['createdAt', 'ASC']] }),
            User.findAll({ where: { isActive: true }, attributes: ['id', 'name', 'email'], include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'], required: false }] })
        ]);

        const sessions = [];
        const loginByUser = {};
        logins.forEach(l => {
            if (!loginByUser[l.userId]) loginByUser[l.userId] = [];
            loginByUser[l.userId].push({ at: new Date(l.createdAt), branchId: l.branchId, id: l.id });
        });
        const logoutByUser = {};
        logouts.forEach(l => {
            if (!logoutByUser[l.userId]) logoutByUser[l.userId] = [];
            logoutByUser[l.userId].push({ at: new Date(l.createdAt), branchId: l.branchId });
        });

        const userMinutes = {};
        for (const uid of [...new Set([...Object.keys(loginByUser), ...Object.keys(logoutByUser)])]) {
            const loginsU = (loginByUser[uid] || []).sort((a, b) => a.at - b.at);
            const logoutsU = (logoutByUser[uid] || []).sort((a, b) => a.at - b.at);
            let lo = 0;
            for (const login of loginsU) {
                let logoutAt = null;
                while (lo < logoutsU.length && logoutsU[lo].at <= login.at) lo++;
                if (lo < logoutsU.length) { logoutAt = logoutsU[lo].at; lo++; }
                const mins = logoutAt ? Math.round((logoutAt - login.at) / 60000) : Math.round((new Date() - login.at) / 60000);
                sessions.push({ userId: uid, loginAt: login.at, logoutAt, minutes: mins, branchId: login.branchId });
                userMinutes[uid] = (userMinutes[uid] || 0) + mins;
            }
        }

        const summary = Object.entries(userMinutes).map(([uid, mins]) => {
            const u = users.find(x => x.id === uid);
            return { userId: uid, userName: u ? (u.name || u.email) : uid, totalMinutes: mins, totalHours: Math.round(mins / 60 * 10) / 10 };
        }).sort((a, b) => b.totalMinutes - a.totalMinutes);

        res.json({ sessions, summary, from: fromDate, to: toDate });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

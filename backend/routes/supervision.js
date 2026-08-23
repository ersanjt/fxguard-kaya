const express = require('express');
const router = express.Router();
const { Sequelize, Conversation, Message, User, Branch, Department, Customer, ActivityLog, Ticket, TicketReply, Task, InternalThread, InternalMessage, InternalThreadParticipant } = require('../models');
const { Op } = require('sequelize');
const { isMainAdmin } = require('../lib/permissions');
const { isValidUUID, parsePagination } = require('../lib/validation');
const {
    canSuperviseStaff,
    getVisibleStaffUserIds,
    applyVisibleUserFilter,
    applyVisibleUserIdFilter,
} = require('../lib/staffSupervision');
const { mergeLivePresenceWhere, ACTIVE_PRESENCE_STATUSES } = require('../lib/staffPresence');
const { redactCustomerPhone, redactConversationList } = require('../lib/customerPhoneVisibility');

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
router.get('/logins', canViewStaffActivity, async (req, res, next) => {
    try {
        const { page, limit, offset } = parsePagination(req.query.page, req.query.limit, 100);
        const visibleIds = await getVisibleStaffUserIds(req.user, User);
        const logWhere = applyVisibleUserIdFilter({ action: 'user_login' }, visibleIds);
        const { rows, count } = await ActivityLog.findAndCountAll({
            where: logWhere,
            include: [
                { model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'], required: false },
                { model: Branch, as: 'branch', attributes: ['id', 'name', 'city', 'country'], required: false }
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });
        const data = rows.map(r => {
            const m = r.metadata || {};
            return {
                ...r.toJSON(),
                ip: m.ip || null,
                country: m.country || null
            };
        });
        res.json({ data, total: count, page });
    } catch (err) {
        next(err);
    }
});

// لیست کارکنان آنلاین — برای مدیر و بالاتر (شامل IP و کشور آخرین ورود)
router.get('/online', canViewStaffActivity, async (req, res, next) => {
    try {
        const visibleIds = await getVisibleStaffUserIds(req.user, User);
        const io = req.app && req.app.get('io');
        const where = applyVisibleUserFilter(
            mergeLivePresenceWhere(
                { isActive: true, status: { [Op.in]: ACTIVE_PRESENCE_STATUSES } },
                io
            ),
            visibleIds
        );
        const users = await User.findAll({
            where,
            attributes: ['id', 'name', 'email', 'role', 'status', 'lastLoginAt'],
            include: [
                { model: Branch, as: 'branch', attributes: ['id', 'name', 'city'], required: false },
                { model: Department, as: 'department', attributes: ['id', 'name'], required: false },
            ],
            order: [['lastLoginAt', 'DESC']]
        });
        const userIds = users.map(u => u.id);
        const loginByUser = {};
        if (userIds.length > 0) {
            // یک query برای آخرین login هر کاربر — با limit برای جلوگیری از کشیدن کل جدول
            const latestLogins = await ActivityLog.findAll({
                where: { action: 'user_login', userId: { [Op.in]: userIds } },
                attributes: ['userId', 'metadata', 'createdAt'],
                order: [['createdAt', 'DESC']],
                limit: userIds.length * 3,
                raw: true
            });
            latestLogins.forEach(l => {
                if (!loginByUser[l.userId]) loginByUser[l.userId] = l;
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
        next(err);
    }
});

// فهرست کارکنان قابل نظارت — برای جستجوی سریع در staff-activity
router.get('/staff-index', canViewStaffActivity, async (req, res, next) => {
    try {
        const visibleIds = await getVisibleStaffUserIds(req.user, User);
        const where = applyVisibleUserFilter({ isActive: true }, visibleIds);
        const users = await User.findAll({
            where,
            attributes: ['id', 'name', 'email', 'username', 'role', 'status', 'departmentId', 'lastLoginAt'],
            include: [{ model: Department, as: 'department', attributes: ['id', 'name'], required: false }],
            order: [['name', 'ASC']],
        });
        res.json({ data: users });
    } catch (err) {
        next(err);
    }
});

// جزئیات فعالیت کاربر — ورود/خروج، ساعات آنلاین، چت‌ها، تیکت‌ها، تسک‌ها (بدون اطلاع به کاربر)
router.get('/user/:userId/detail', canViewStaffActivity, async (req, res, next) => {
    if (!isValidUUID(req.params.userId)) return res.status(400).json({ error: 'شناسه کاربر نامعتبر است' });
    try {
        const { userId } = req.params;
        const user = await User.findByPk(userId, {
            attributes: ['id', 'name', 'email', 'role', 'status', 'lastLoginAt', 'departmentId', 'isActive'],
            include: [
                { model: Branch, as: 'branch', attributes: ['id', 'name', 'city'], required: false },
                { model: Department, as: 'department', attributes: ['id', 'name'], required: false },
            ],
        });
        if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
        if (!canSuperviseStaff(req.user, user)) {
            return res.status(403).json({ error: 'دسترسی به فعالیت این کاربر ندارید' });
        }

        const now = new Date();

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
            customer: c.customer
                ? redactCustomerPhone(
                      { id: c.customer.id, name: c.customer.name, phone: c.customer.phone },
                      req.user
                  )
                : null
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
        next(err);
    }
});

router.use(ownerOnly);

// همه مکالمات با جزئیات شعبه، دپارتمان، کارمند — برای نظارت مالک
router.get('/conversations', async (req, res, next) => {
    try {
        const { branchId, departmentId, userId, status, unassigned } = req.query;
        const { page, limit, offset } = parsePagination(req.query.page, req.query.limit, 100);
        if (branchId && !isValidUUID(branchId)) return res.status(400).json({ error: 'شناسه شعبه نامعتبر است' });
        if (departmentId && !isValidUUID(departmentId)) return res.status(400).json({ error: 'شناسه دپارتمان نامعتبر است' });
        if (userId && !isValidUUID(userId)) return res.status(400).json({ error: 'شناسه کاربر نامعتبر است' });
        const VALID_STATUSES = ['open', 'pending', 'closed', 'resolved'];
        if (status && !VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'وضعیت نامعتبر است' });
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
            limit,
            offset
        });
        res.json({ data: redactConversationList(rows, req.user), total: count, page });
    } catch (err) {
        next(err);
    }
});

// لاگ فعالیت‌ها — چه کسی چه عملی انجام داده
router.get('/activity', async (req, res, next) => {
    try {
        const { branchId, userId, action } = req.query;
        const { page, limit, offset } = parsePagination(req.query.page, req.query.limit, 200);
        if (branchId && !isValidUUID(branchId)) return res.status(400).json({ error: 'شناسه شعبه نامعتبر است' });
        if (userId && !isValidUUID(userId)) return res.status(400).json({ error: 'شناسه کاربر نامعتبر است' });
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
            limit,
            offset
        });
        res.json({ data: rows, total: count, page });
    } catch (err) {
        next(err);
    }
});

// لیست چت‌های داخلی — برای مالک/ادمین (مشاهده کی با کی صحبت کرده)
router.get('/internal-chats', async (req, res, next) => {
    try {
        const { userId } = req.query;
        const { page, limit, offset } = parsePagination(req.query.page, req.query.limit, 100);
        if (userId && !isValidUUID(userId)) return res.status(400).json({ error: 'شناسه کاربر نامعتبر است' });
        let participantThreadIds = null;
        if (userId) {
            const parts = await InternalThreadParticipant.findAll({ where: { userId }, attributes: ['threadId'] });
            participantThreadIds = parts.map(p => p.threadId);
            if (participantThreadIds.length === 0) return res.json({ data: [], total: 0, page });
        }
        const where = participantThreadIds ? { id: { [Op.in]: participantThreadIds } } : {};
        const { rows, count } = await InternalThread.findAndCountAll({
            where,
            include: [{ model: User, as: 'participants', attributes: ['id', 'name', 'email', 'role'], through: { attributes: [] } }],
            order: [['lastMessageAt', 'DESC']],
            limit,
            offset
        });
        // batch load: آخرین پیام هر thread — یک query با limit به‌جای N query
        const rowThreadIds = rows.map(t => t.id);
        const lastMsgs = rowThreadIds.length ? await InternalMessage.findAll({
            where: { threadId: { [Op.in]: rowThreadIds } },
            include: [{ model: User, as: 'fromUser', attributes: ['id', 'name'] }],
            order: [['createdAt', 'DESC']],
            limit: rowThreadIds.length * 5,
            raw: false
        }) : [];
        const lastMsgByThread = {};
        lastMsgs.forEach(m => {
            if (!lastMsgByThread[m.threadId]) lastMsgByThread[m.threadId] = m;
        });

        const list = rows.map((t) => {
            const lastMsg = lastMsgByThread[t.id] || null;
            const parts = (t.participants || []).map(p => ({ id: p.id, name: p.name, email: p.email, role: p.role }));
            return {
                id: t.id,
                lastMessageAt: t.lastMessageAt,
                lastMessage: lastMsg ? { content: lastMsg.content, fromUser: lastMsg.fromUser } : null,
                participants: parts
            };
        });
        res.json({ data: list, total: count, page });
    } catch (err) {
        next(err);
    }
});

// پیام‌های یک چت داخلی — برای مالک/ادمین
router.get('/internal-chats/:threadId/messages', async (req, res, next) => {
    if (!isValidUUID(req.params.threadId)) return res.status(400).json({ error: 'شناسه ترد نامعتبر است' });
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
        next(err);
    }
});

// خلاصه عملکرد به تفکیک شعبه و کاربر — برای مالک
router.get('/performance', async (req, res, next) => {
    try {
        const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

        // همه query‌ها به‌صورت موازی — بدون full table scan
        const [
            branches, users,
            conversationCount, messageCount, openCount, pendingCount, unassignedCount, todayMsgCount,
            convCountByBranch, msgCountByUser,
            responseTimeByUser, responseTimeByBranch,
            ratingByUser, ratingByBranch,
            overallResponseRows, overallRatingRows
        ] = await Promise.all([
            Branch.findAll({ where: { isActive: true }, attributes: ['id', 'name', 'city', 'country'], order: [['name', 'ASC']] }),
            User.findAll({ where: { isActive: true }, attributes: ['id', 'name', 'email', 'role', 'branchId'], include: [{ model: Branch, as: 'branch', attributes: ['id', 'name', 'city'], required: false }] }),
            Conversation.count(),
            Message.count({ where: { direction: 'outgoing' } }),
            Conversation.count({ where: { status: 'open' } }),
            Conversation.count({ where: { status: 'pending' } }),
            Conversation.count({ where: { assignedTo: null } }),
            Message.count({ where: { direction: 'outgoing', createdAt: { [Op.gte]: todayStart } } }),
            // تعداد مکالمات به تفکیک شعبه — GROUP BY در DB
            Conversation.findAll({
                attributes: ['branchId', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
                where: { branchId: { [Op.ne]: null } },
                group: ['branchId'],
                raw: true
            }).catch(() => []),
            // تعداد پیام‌های خروجی به تفکیک کاربر — GROUP BY در DB
            Message.findAll({
                attributes: ['userId', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
                where: { direction: 'outgoing', userId: { [Op.ne]: null } },
                group: ['userId'],
                raw: true
            }).catch(() => []),
            // میانگین زمان پاسخ به تفکیک کاربر — GROUP BY در DB
            Conversation.findAll({
                attributes: [
                    'assignedTo',
                    [Sequelize.fn('AVG', Sequelize.literal(
                        "EXTRACT(EPOCH FROM (\"lastOutgoingMessageAt\" - \"lastIncomingMessageAt\")) / 60"
                    )), 'avgResponseMinutes'],
                    [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
                ],
                where: {
                    assignedTo: { [Op.ne]: null },
                    lastIncomingMessageAt: { [Op.ne]: null },
                    lastOutgoingMessageAt: { [Op.ne]: null }
                },
                group: ['assignedTo'],
                raw: true
            }).catch(() => []),
            // میانگین زمان پاسخ به تفکیک شعبه — GROUP BY در DB
            Conversation.findAll({
                attributes: [
                    'branchId',
                    [Sequelize.fn('AVG', Sequelize.literal(
                        "EXTRACT(EPOCH FROM (\"lastOutgoingMessageAt\" - \"lastIncomingMessageAt\")) / 60"
                    )), 'avgResponseMinutes']
                ],
                where: {
                    branchId: { [Op.ne]: null },
                    lastIncomingMessageAt: { [Op.ne]: null },
                    lastOutgoingMessageAt: { [Op.ne]: null }
                },
                group: ['branchId'],
                raw: true
            }).catch(() => []),
            // میانگین امتیاز به تفکیک کاربر — GROUP BY در DB
            Conversation.findAll({
                attributes: [
                    'assignedTo',
                    [Sequelize.fn('AVG', Sequelize.col('rating')), 'avgRating'],
                    [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
                ],
                where: { assignedTo: { [Op.ne]: null }, rating: { [Op.ne]: null } },
                group: ['assignedTo'],
                raw: true
            }).catch(() => []),
            // میانگین امتیاز به تفکیک شعبه — GROUP BY در DB
            Conversation.findAll({
                attributes: [
                    'branchId',
                    [Sequelize.fn('AVG', Sequelize.col('rating')), 'avgRating'],
                    [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
                ],
                where: { branchId: { [Op.ne]: null }, rating: { [Op.ne]: null } },
                group: ['branchId'],
                raw: true
            }).catch(() => []),
            // میانگین کلی زمان پاسخ — یک aggregate query
            Conversation.findAll({
                attributes: [
                    [Sequelize.fn('AVG', Sequelize.literal(
                        "EXTRACT(EPOCH FROM (\"lastOutgoingMessageAt\" - \"lastIncomingMessageAt\")) / 60"
                    )), 'avgResponseMinutes'],
                    [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
                ],
                where: {
                    lastIncomingMessageAt: { [Op.ne]: null },
                    lastOutgoingMessageAt: { [Op.ne]: null }
                },
                raw: true
            }).catch(() => []),
            // میانگین کلی امتیاز — یک aggregate query
            Conversation.findAll({
                attributes: [
                    [Sequelize.fn('AVG', Sequelize.col('rating')), 'avgRating'],
                    [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
                ],
                where: { rating: { [Op.ne]: null } },
                raw: true
            }).catch(() => [])
        ]);

        // ساخت map‌ها از نتایج aggregate
        const countByBranch = {};
        convCountByBranch.forEach(r => { countByBranch[r.branchId] = parseInt(r.count, 10) || 0; });

        const countByUser = {};
        msgCountByUser.forEach(r => { countByUser[r.userId] = parseInt(r.count, 10) || 0; });

        const respTimeByUser = {};
        responseTimeByUser.forEach(r => { respTimeByUser[r.assignedTo] = r.avgResponseMinutes != null ? Math.round(parseFloat(r.avgResponseMinutes) * 10) / 10 : null; });

        const respTimeByBranch = {};
        responseTimeByBranch.forEach(r => { respTimeByBranch[r.branchId] = r.avgResponseMinutes != null ? Math.round(parseFloat(r.avgResponseMinutes) * 10) / 10 : null; });

        const avgRatingByUser = {};
        const ratedCountByUser = {};
        ratingByUser.forEach(r => {
            avgRatingByUser[r.assignedTo] = r.avgRating != null ? Math.round(parseFloat(r.avgRating) * 10) / 10 : null;
            ratedCountByUser[r.assignedTo] = parseInt(r.count, 10) || 0;
        });

        const avgRatingByBranch = {};
        ratingByBranch.forEach(r => { avgRatingByBranch[r.branchId] = r.avgRating != null ? Math.round(parseFloat(r.avgRating) * 10) / 10 : null; });

        const overallResp = overallResponseRows[0];
        const avgResponseTimeMinutes = overallResp && overallResp.avgResponseMinutes != null
            ? Math.round(parseFloat(overallResp.avgResponseMinutes) * 10) / 10
            : null;

        const overallRating = overallRatingRows[0];
        const avgRating = overallRating && overallRating.avgRating != null
            ? Math.round(parseFloat(overallRating.avgRating) * 10) / 10
            : null;
        const ratedConversationsCount = overallRating ? parseInt(overallRating.count, 10) || 0 : 0;

        const usersWithStats = users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            branch: u.branch,
            outgoingMessageCount: countByUser[u.id] || 0,
            avgResponseTimeMinutes: respTimeByUser[u.id] ?? null,
            avgRating: avgRatingByUser[u.id] ?? null,
            ratedConversationsCount: ratedCountByUser[u.id] || 0
        }));

        const branchesWithStats = branches.map(b => ({
            ...b.toJSON(),
            conversationCount: countByBranch[b.id] || 0,
            avgResponseTimeMinutes: respTimeByBranch[b.id] ?? null,
            avgRating: avgRatingByBranch[b.id] ?? null
        }));

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
        next(err);
    }
});

// گزارش حضور و غیاب — بر اساس ActivityLog (user_login, user_logout)
router.get('/attendance-report', canViewStaffActivity, async (req, res, next) => {
    try {
        const { branchId, userId, from, to } = req.query;
        if (branchId && !isValidUUID(branchId)) return res.status(400).json({ error: 'شناسه شعبه نامعتبر است' });
        if (userId && !isValidUUID(userId)) return res.status(400).json({ error: 'شناسه کاربر نامعتبر است' });
        const fromDate = from ? new Date(from) : new Date(new Date().setDate(1));
        const toDate = to ? new Date(to) : new Date();
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);

        const whereLogin = applyVisibleUserIdFilter(
            { action: 'user_login', createdAt: { [Op.between]: [fromDate, toDate] } },
            await getVisibleStaffUserIds(req.user, User)
        );
        const whereLogout = applyVisibleUserIdFilter(
            { action: 'user_logout', createdAt: { [Op.between]: [fromDate, toDate] } },
            await getVisibleStaffUserIds(req.user, User)
        );
        if (branchId) { whereLogin.branchId = branchId; whereLogout.branchId = branchId; }
        if (userId) {
            const target = await User.findByPk(userId, { attributes: ['id', 'role', 'departmentId', 'isActive'] });
            if (!target || !canSuperviseStaff(req.user, target)) {
                return res.status(403).json({ error: 'دسترسی به گزارش این کاربر ندارید' });
            }
            whereLogin.userId = userId;
            whereLogout.userId = userId;
        }

        const [logins, logouts, users] = await Promise.all([
            ActivityLog.findAll({ where: whereLogin, include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }, { model: Branch, as: 'branch', attributes: ['id', 'name'] }], order: [['createdAt', 'ASC']] }),
            ActivityLog.findAll({ where: whereLogout, order: [['createdAt', 'ASC']] }),
            User.findAll({
                where: applyVisibleUserFilter({ isActive: true }, await getVisibleStaffUserIds(req.user, User)),
                attributes: ['id', 'name', 'email'],
                include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'], required: false }],
            }),
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
        next(err);
    }
});

module.exports = router;

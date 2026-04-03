/**
 * Analytics controller — dashboard stats and metrics
 */
const { Op, literal, fn, col, where: sqWhere, cast } = require('sequelize');
const {
    Conversation,
    Message,
    Customer,
    Ticket,
    Task,
    Announcement,
    AnnouncementRead,
    User,
} = require('../models');
const { getAccessibleCustomerIds } = require('../lib/customerAccess');
const { isMainAdmin } = require('../lib/permissions');

function conversationWhere(req) {
    if (isMainAdmin(req.user) || ['owner', 'admin', 'manager'].indexOf(req.user.role) !== -1) {
        return {};
    }
    const orConditions = [{ assignedTo: req.userId }];
    if (req.user.departmentId) orConditions.push({ departmentId: req.user.departmentId });
    return { [Op.or]: orConditions };
}

function ticketAccessWhere(req) {
    if (isMainAdmin(req.user) || ['owner', 'admin', 'manager'].indexOf(req.user.role || '') !== -1) return {};
    const orConditions = [{ assignedTo: req.userId }, { createdBy: req.userId }];
    if (req.user.departmentId) orConditions.push({ departmentId: req.user.departmentId });
    return { [Op.or]: orConditions };
}

function taskAccessWhere(req) {
    if (isMainAdmin(req.user) || ['owner', 'admin', 'manager'].indexOf(req.user.role || '') !== -1) return {};
    const orConditions = [{ assignedTo: req.userId }, { createdBy: req.userId }];
    if (req.user.departmentId) orConditions.push({ departmentId: req.user.departmentId });
    return { [Op.or]: orConditions };
}

async function dashboard(req, res, next) {
    try {
        if (!req.canAccess('dashboard')) {
            return res.status(403).json({ error: 'دسترسی به داشبورد ندارید' });
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const convWhere = conversationWhere(req);
        const hasConvFilter = Object.keys(convWhere).length > 0;

        const [
            totalConversations,
            openConversations,
            unreadConversations,
            todayMessages,
            customerCount,
            ticketsOpen,
            tasksPending,
            announcementsCount,
            unreadAnnouncements,
            staffOnline,
            loginsToday,
        ] = await Promise.all([
            Conversation.count({ where: convWhere }),
            Conversation.count({ where: { ...convWhere, status: 'open' } }),
            Conversation.count({ where: { ...convWhere, unreadCount: { [Op.gt]: 0 } } }),
            hasConvFilter
                ? Message.count({
                      where: { timestamp: { [Op.gte]: today } },
                      include: [
                          {
                              model: Conversation,
                              as: 'conversation',
                              where: convWhere,
                              required: true,
                              attributes: [],
                          },
                      ],
                  })
                : Message.count({ where: { timestamp: { [Op.gte]: today } } }),
            (async () => {
                const ids = await getAccessibleCustomerIds(req);
                if (ids === null) return Customer.count();
                if (ids.length === 0) return 0;
                return Customer.count({ where: { id: { [Op.in]: ids } } });
            })(),
            Ticket.count({ where: { ...ticketAccessWhere(req), status: { [Op.in]: ['open', 'in_progress'] } } }),
            Task.count({ where: { ...taskAccessWhere(req), status: { [Op.in]: ['pending', 'in_progress'] } } }),
            Announcement.count(),
            (async () => {
                try {
                    if (!AnnouncementRead) return Announcement.count();
                    const readIds = await AnnouncementRead.findAll({
                        where: { userId: req.userId },
                        attributes: ['announcementId'],
                        raw: true,
                    });
                    const readAnnIds = readIds.map(r => r.announcementId);
                    const whereClause = readAnnIds.length > 0
                        ? { id: { [Op.notIn]: readAnnIds } }
                        : {};
                    return Announcement.count({ where: whereClause });
                } catch (_) {
                    return Announcement.count();
                }
            })(),
            User.count({
                where: { isActive: true, status: { [Op.in]: ['online', 'away', 'busy'] } },
            }),
            User.count({ where: { isActive: true, lastLoginAt: { [Op.gte]: today } } }),
        ]);

        let avgResponseTimeMinutes = null;
        let avgRating = null;
        let ratedCount = 0;

        const [ratedRows, convsWithReply] = await Promise.all([
            Conversation.findAll({
                where: { ...convWhere, rating: { [Op.ne]: null } },
                attributes: ['rating'],
                raw: true,
            }),
            Conversation.findAll({
                where: { ...convWhere, firstReplyAt: { [Op.ne]: null } },
                attributes: ['id', 'firstReplyAt'],
                raw: true,
            }),
        ]);

        ratedCount = ratedRows.length;
        if (ratedCount > 0) {
            avgRating =
                Math.round(
                    (ratedRows.reduce((a, c) => a + (c.rating || 0), 0) / ratedCount) * 10
                ) / 10;
        }

        if (convsWithReply.length > 0) {
            const convIds = convsWithReply.map((c) => c.id);
            const minIncomingRows = await Message.findAll({
                attributes: ['conversationId', [fn('MIN', col('timestamp')), 'firstIncoming']],
                where: { conversationId: { [Op.in]: convIds }, direction: 'incoming' },
                group: ['conversationId'],
                raw: true,
            });
            const minMap = new Map(
                minIncomingRows.map((r) => [r.conversationId, new Date(r.firstIncoming).getTime()])
            );
            const replyMap = new Map(
                convsWithReply.map((c) => [c.id, new Date(c.firstReplyAt).getTime()])
            );
            const diffs = [];
            for (const [id, replyT] of replyMap) {
                const incT = minMap.get(id);
                if (incT == null) continue;
                const diffMin = (replyT - incT) / 60000;
                if (diffMin >= 0 && diffMin < 10080) diffs.push(diffMin);
            }
            if (diffs.length > 0) {
                avgResponseTimeMinutes =
                    Math.round((diffs.reduce((a, b) => a + b, 0) / diffs.length) * 10) / 10;
            }
        }

        res.json({
            totalConversations,
            openConversations,
            unreadConversations,
            todayMessages,
            totalCustomers: customerCount,
            ticketsOpen,
            tasksPending,
            announcementsCount,
            unreadAnnouncements: unreadAnnouncements || 0,
            staffOnline: staffOnline || 0,
            loginsToday: loginsToday || 0,
            avgResponseTimeMinutes: avgResponseTimeMinutes ?? null,
            avgRating: avgRating ?? null,
            ratedConversationsCount: ratedCount ?? 0,
        });
    } catch (err) {
        next(err);
    }
}

module.exports = { dashboard };

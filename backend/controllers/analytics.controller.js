/**
 * Analytics controller — dashboard stats and metrics
 */
const { Op, literal } = require('sequelize');
const {
    Conversation,
    Message,
    Customer,
    Ticket,
    Task,
    Announcement,
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

async function dashboard(req, res) {
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
            responseAndRating,
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
            Ticket.count({ where: { status: { [Op.in]: ['open', 'in_progress', 'resolved'] } } }),
            Task.count({ where: { status: { [Op.in]: ['pending', 'in_progress'] } } }),
            Announcement.count(),
            Announcement.count({
                where: {
                    id: {
                        [Op.notIn]: literal(
                            `(SELECT "announcementId" FROM "AnnouncementReads" WHERE "userId" = ${req.userId})`
                        ),
                    },
                },
            }).catch(() => Announcement.count()),
            User.count({
                where: { isActive: true, status: { [Op.in]: ['online', 'away', 'busy'] } },
            }),
            User.count({ where: { isActive: true, lastLoginAt: { [Op.gte]: today } } }),
            Conversation.findAll({
                where: {
                    ...convWhere,
                    lastIncomingMessageAt: { [Op.ne]: null },
                    lastOutgoingMessageAt: { [Op.ne]: null },
                },
                attributes: ['lastIncomingMessageAt', 'lastOutgoingMessageAt', 'rating'],
                raw: true,
            }),
        ]);

        let avgResponseTimeMinutes = null;
        let avgRating = null;
        let ratedCount = 0;
        if (Array.isArray(responseAndRating)) {
            const diffs = responseAndRating
                .map((c) => {
                    const inc = new Date(c.lastIncomingMessageAt).getTime();
                    const out = new Date(c.lastOutgoingMessageAt).getTime();
                    if (out >= inc) return (out - inc) / 60000;
                    return null;
                })
                .filter((x) => x != null && x >= 0 && x < 10080);
            if (diffs.length > 0) {
                avgResponseTimeMinutes =
                    Math.round(
                        (diffs.reduce((a, b) => a + b, 0) / diffs.length) * 10
                    ) / 10;
            }
            const rated = responseAndRating.filter((c) => c.rating != null);
            ratedCount = rated.length;
            if (ratedCount > 0) {
                avgRating =
                    Math.round(
                        (rated.reduce((a, c) => a + (c.rating || 0), 0) / ratedCount) * 10
                    ) / 10;
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
        res.status(500).json({ error: err.message });
    }
}

module.exports = { dashboard };

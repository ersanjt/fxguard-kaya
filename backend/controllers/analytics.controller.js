/**
 * Analytics controller — آمار داشبورد بر اساس دسترسی همان کاربر
 * (مکالمات مخفی/آرشیو قفل‌شده و مشتریان محدود در KPI لیست عادی نمی‌آیند)
 */
const { Op, fn, col } = require('sequelize');
const {
    Conversation,
    Message,
    Customer,
    Ticket,
    Task,
    Announcement,
    AnnouncementRead,
    User,
    sequelize,
} = require('../models');
const { getAccessibleCustomerIds } = require('../lib/customerAccess');
const { isMainAdmin, canViewHiddenConversations } = require('../lib/permissions');
const { conversationListWhereAsync } = require('../lib/conversationAccess');
const { getVisibleStaffUserIds, applyVisibleUserFilter } = require('../lib/staffSupervision');

/** آیا where خالی نیست؟ (کلیدهای Symbol مثل Op.and/Op.or با Object.keys دیده نمی‌شوند) */
function hasWhereClauses(where) {
    if (!where || typeof where !== 'object') return false;
    return Reflect.ownKeys(where).length > 0;
}

/** ترکیب فیلتر دسترسی با شرط اضافی برای count */
function mergeConvWhere(convWhere, extra) {
    const parts = [];
    if (hasWhereClauses(convWhere)) parts.push(convWhere);
    if (hasWhereClauses(extra)) parts.push(extra);
    if (parts.length === 0) return {};
    if (parts.length === 1) return parts[0];
    return { [Op.and]: parts };
}

/**
 * دامنهٔ مکالمات قابل‌مشاهده برای KPI داشبورد = همان منطق لیست مکالمات
 * + همیشه بدون آرشیو (آرشیو شمارهٔ قبلی فقط در تب آرشیو ادمین است)
 */
async function activeConversationWhere(req) {
    const access = await conversationListWhereAsync(req.user, req.userId);
    return mergeConvWhere(access, { status: { [Op.ne]: 'archived' } });
}

const UNANSWERED_EXTRA = {
    status: { [Op.in]: ['open', 'pending'] },
    lastIncomingMessageAt: { [Op.ne]: null },
    [Op.or]: [
        { lastOutgoingMessageAt: null },
        sequelize.where(sequelize.col('lastIncomingMessageAt'), Op.gt, sequelize.col('lastOutgoingMessageAt')),
    ],
};

const UNASSIGNED_EXTRA = {
    status: 'open',
    assignedTo: null,
    departmentId: null,
};

function ticketAccessWhere(req) {
    if (isMainAdmin(req.user) || ['owner', 'admin', 'manager'].indexOf(req.user.role || '') !== -1) return {};
    const orConditions = [{ assignedTo: req.userId }, { createdBy: req.userId }];
    if (req.user.departmentId) orConditions.push({ departmentId: req.user.departmentId });
    return { [Op.or]: orConditions };
}

function taskAccessWhere(req) {
    if (isMainAdmin(req.user) || ['owner', 'admin', 'manager'].indexOf(req.user.role || '') !== -1) return {};
    const orConditions = [{ assignedTo: req.userId }, { createdBy: req.userId }];
    if (req.user.departmentId) orConditions.push({ assignedToDepartmentId: req.user.departmentId });
    return { [Op.or]: orConditions };
}

async function dashboard(req, res, next) {
    try {
        if (!req.canAccess('dashboard')) {
            return res.status(403).json({ error: 'دسترسی به داشبورد ندارید' });
        }
        try {
            const { ensureLegacyCutover } = require('../services/legacyCrmLockdown');
            await ensureLegacyCutover(null, { reason: 'dashboard_stats' });
        } catch (_) {}
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const convWhere = await activeConversationWhere(req);
        const hasConvFilter = hasWhereClauses(convWhere);
        const canSeeHidden = isMainAdmin(req.user) || canViewHiddenConversations(req.user);

        // بدون تخصیص: فقط برای ادمین/مدیر معنا دارد؛ کارشناس فقط کار خودش را می‌بیند
        const showUnassignedPool =
            canSeeHidden || ['owner', 'admin', 'manager'].indexOf(req.user.role || '') !== -1;

        const [
            totalConversations,
            openConversations,
            unreadConversations,
            unassignedConversations,
            unansweredConversations,
            todayMessages,
            customerCount,
            ticketsOpen,
            tasksPending,
            announcementsCount,
            unreadAnnouncements,
            staffOnline,
            loginsToday,
            archivedLockedCount,
        ] = await Promise.all([
            Conversation.count({ where: convWhere }),
            Conversation.count({ where: mergeConvWhere(convWhere, { status: 'open' }) }),
            Conversation.count({
                where: mergeConvWhere(convWhere, { unreadCount: { [Op.gt]: 0 } }),
            }),
            showUnassignedPool
                ? Conversation.count({ where: mergeConvWhere(convWhere, UNASSIGNED_EXTRA) })
                : Promise.resolve(0),
            Conversation.count({ where: mergeConvWhere(convWhere, UNANSWERED_EXTRA) }),
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
                : Message.count({
                      where: { timestamp: { [Op.gte]: today } },
                      include: [
                          {
                              model: Conversation,
                              as: 'conversation',
                              where: { status: { [Op.ne]: 'archived' } },
                              required: true,
                              attributes: [],
                          },
                      ],
                  }),
            (async () => {
                const ids = await getAccessibleCustomerIds(req);
                if (ids === null) return Customer.count();
                if (ids.length === 0) return 0;
                return Customer.count({ where: { id: { [Op.in]: ids } } });
            })(),
            Ticket.count({
                where: { ...ticketAccessWhere(req), status: { [Op.in]: ['open', 'in_progress'] } },
            }),
            Task.count({
                where: {
                    ...taskAccessWhere(req),
                    status: { [Op.in]: ['pending', 'in_progress'] },
                },
            }),
            Announcement.count(),
            (async () => {
                try {
                    if (!AnnouncementRead) return Announcement.count();
                    const readIds = await AnnouncementRead.findAll({
                        where: { userId: req.userId },
                        attributes: ['announcementId'],
                        raw: true,
                    });
                    const readAnnIds = readIds.map((r) => r.announcementId);
                    const whereClause =
                        readAnnIds.length > 0 ? { id: { [Op.notIn]: readAnnIds } } : {};
                    return Announcement.count({ where: whereClause });
                } catch (_) {
                    return Announcement.count();
                }
            })(),
            (async () => {
                if (!req.canAccess('staff_activity')) return 0;
                const visibleIds = await getVisibleStaffUserIds(req.user, User);
                const where = applyVisibleUserFilter(
                    { isActive: true, status: { [Op.in]: ['online', 'away', 'busy'] } },
                    visibleIds
                );
                return User.count({ where });
            })(),
            (async () => {
                if (!req.canAccess('staff_activity')) return 0;
                const visibleIds = await getVisibleStaffUserIds(req.user, User);
                const where = applyVisibleUserFilter(
                    { isActive: true, lastLoginAt: { [Op.gte]: today } },
                    visibleIds
                );
                return User.count({ where });
            })(),
            canSeeHidden
                ? Conversation.count({
                      where: { status: 'archived', isHiddenFromStaff: true },
                  })
                : Promise.resolve(0),
        ]);

        let avgResponseTimeMinutes = null;
        let avgRating = null;
        let ratedCount = 0;

        const [ratedRows, convsWithReply] = await Promise.all([
            Conversation.findAll({
                where: mergeConvWhere(convWhere, { rating: { [Op.ne]: null } }),
                attributes: ['rating'],
                raw: true,
            }),
            Conversation.findAll({
                where: mergeConvWhere(convWhere, { firstReplyAt: { [Op.ne]: null } }),
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
            unassignedConversations,
            unansweredConversations,
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
            /** فقط برای ادمین: تعداد مکالمات آرشیو قفل‌شده (شمارهٔ قبلی) — در KPI اصلی نیست */
            archivedLockedConversations: archivedLockedCount || 0,
            scopedToUser: true,
        });
    } catch (err) {
        next(err);
    }
}

module.exports = { dashboard };

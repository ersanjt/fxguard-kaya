const express = require('express');
const router = express.Router();
const { Conversation, Message, Customer, Ticket, Task, Announcement, AnnouncementRead, User } = require('../models');
const { Op } = require('sequelize');
const { getAccessibleCustomerIds } = require('../lib/customerAccess');
const { isMainAdmin } = require('../lib/permissions');

function conversationWhere(req) {
    if (isMainAdmin(req.user) || ['owner', 'admin', 'manager'].indexOf(req.user.role) !== -1) return {};
    const orConditions = [{ assignedTo: req.userId }];
    if (req.user.departmentId) orConditions.push({ departmentId: req.user.departmentId });
    return { [Op.or]: orConditions };
}

router.get('/dashboard', async (req, res) => {
    try {
        if (!req.canAccess('dashboard')) return res.status(403).json({ error: 'دسترسی به داشبورد ندارید' });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const convWhere = conversationWhere(req);

        const convIds = await Conversation.findAll({ where: convWhere, attributes: ['id'], raw: true }).then(r => r.map(x => x.id));
        const convIdList = convIds.length ? convIds : [null];

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
            avgResponseTimeMinutes,
            avgRating,
            ratedCount
        ] = await Promise.all([
            Conversation.count({ where: convWhere }),
            Conversation.count({ where: { ...convWhere, status: 'open' } }),
            Conversation.count({ where: { ...convWhere, unreadCount: { [Op.gt]: 0 } } }),
            convIdList[0] ? Message.count({ where: { conversationId: { [Op.in]: convIdList }, timestamp: { [Op.gte]: today } } }) : 0,
            (async () => {
                const ids = await getAccessibleCustomerIds(req);
                if (ids === null) return Customer.count();
                if (ids.length === 0) return 0;
                return Customer.count({ where: { id: { [Op.in]: ids } } });
            })(),
            Ticket.count({ where: { status: { [Op.in]: ['open', 'in_progress', 'resolved'] } } }),
            Task.count({ where: { status: { [Op.in]: ['pending', 'in_progress'] } } }),
            Announcement.count(),
            (async () => {
                const readIds = await AnnouncementRead.findAll({ where: { userId: req.userId }, attributes: ['announcementId'], raw: true }).then(r => r.map(x => x.announcementId));
                if (readIds.length === 0) return Announcement.count();
                return Announcement.count({ where: { id: { [Op.notIn]: readIds } } });
            })(),
            User.count({ where: { isActive: true, status: { [Op.in]: ['online', 'away', 'busy'] } } }),
            User.count({ where: { isActive: true, lastLoginAt: { [Op.gte]: today } } }),
            (async () => {
                const convs = await Conversation.findAll({
                    where: { ...convWhere, lastIncomingMessageAt: { [Op.ne]: null }, lastOutgoingMessageAt: { [Op.ne]: null } },
                    attributes: ['lastIncomingMessageAt', 'lastOutgoingMessageAt'],
                    raw: true
                });
                const diffs = convs.map(c => {
                    const inc = new Date(c.lastIncomingMessageAt).getTime();
                    const out = new Date(c.lastOutgoingMessageAt).getTime();
                    if (out >= inc) return (out - inc) / 60000;
                    return null;
                }).filter(x => x != null && x >= 0 && x < 10080);
                if (diffs.length === 0) return null;
                return Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length * 10) / 10;
            })(),
            (async () => {
                const convs = await Conversation.findAll({
                    where: { ...convWhere, rating: { [Op.ne]: null } },
                    attributes: ['rating'],
                    raw: true
                });
                if (convs.length === 0) return null;
                const sum = convs.reduce((a, c) => a + (c.rating || 0), 0);
                return Math.round(sum / convs.length * 10) / 10;
            })(),
            (async () => {
                return Conversation.count({ where: { ...convWhere, rating: { [Op.ne]: null } } });
            })()
        ]);

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
            ratedConversationsCount: ratedCount ?? 0
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

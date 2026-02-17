const express = require('express');
const router = express.Router();
const { Conversation, Message, Customer, Ticket, Task, Announcement, AnnouncementRead } = require('../models');
const { Op } = require('sequelize');
const { getAccessibleCustomerIds } = require('../lib/customerAccess');
const { isMainAdmin } = require('../lib/permissions');

function conversationWhere(req) {
    if (isMainAdmin(req.user) || ['owner', 'admin', 'manager'].indexOf(req.user.role) !== -1) return {};
    const orConditions = [{ assignedTo: req.userId }];
    if (req.user.departmentId) orConditions.push({ departmentId: req.user.departmentId });
    if (req.user.branchId) orConditions.push({ branchId: req.user.branchId });
    return { [Op.or]: orConditions };
}

router.get('/dashboard', async (req, res) => {
    try {
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
            unreadAnnouncements
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
            unreadAnnouncements: unreadAnnouncements || 0
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

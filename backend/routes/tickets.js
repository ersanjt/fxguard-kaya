const express = require('express');
const { Ticket, User, Department, TicketReply } = require('../models');
const { Op, literal } = require('sequelize');
const { isMainAdmin } = require('../lib/permissions');

function canManageTicket(req) {
    if (!req.user) return false;
    if (isMainAdmin(req.user)) return true;
    const role = req.user.role || '';
    return ['owner', 'admin', 'manager'].indexOf(role) !== -1;
}

function createTicketsRouter(io) {
const router = express.Router();

router.get('/stats', async (req, res) => {
    try {
        const rows = await Ticket.findAll({ attributes: ['status'], raw: true });
        const stats = { total: rows.length, open: 0, in_progress: 0, resolved: 0, closed: 0 };
        rows.forEach(t => { if (stats[t.status] !== undefined) stats[t.status]++; });
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const { status, priority, assignedTo, createdBy, departmentId, search, sort = 'newest', page = 1, limit = 50 } = req.query;
        const where = {};
        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (assignedTo) where.assignedTo = assignedTo;
        if (createdBy) where.createdBy = createdBy;
        if (departmentId) where.departmentId = departmentId;
        if (search && String(search).trim()) {
            const term = '%' + String(search).trim() + '%';
            where[Op.or] = [
                { title: { [Op.like]: term } },
                { description: { [Op.like]: term } },
                { ticketNumber: { [Op.like]: term } }
            ];
        }
        let order = [['createdAt', 'DESC']];
        if (sort === 'oldest') order = [['createdAt', 'ASC']];
        else if (sort === 'priority') order = [[literal("CASE \"Tickets\".\"priority\" WHEN 'urgent' THEN 4 WHEN 'high' THEN 3 WHEN 'normal' THEN 2 WHEN 'low' THEN 1 ELSE 0 END"), 'DESC'], ['createdAt', 'DESC']];
        const { rows, count } = await Ticket.findAndCountAll({
            where,
            include: [
                { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
                { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
                { model: Department, as: 'department', attributes: ['id', 'name'] }
            ],
            order,
            limit: Math.min(parseInt(limit) || 50, 100),
            offset: (Math.max(1, parseInt(page)) - 1) * (parseInt(limit) || 50)
        });
        res.json({ data: rows, total: count, page: parseInt(page) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const ticket = await Ticket.findByPk(req.params.id, {
            include: [
                { model: User, as: 'creator', attributes: { exclude: ['password'] } },
                { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
                { model: Department, as: 'department' },
                { model: TicketReply, as: 'replies', include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }], order: [['createdAt', 'ASC']] }
            ]
        });
        if (!ticket) return res.status(404).json({ error: 'تیکت یافت نشد' });
        res.json(ticket);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/:id/replies', async (req, res) => {
    try {
        const ticket = await Ticket.findByPk(req.params.id);
        if (!ticket) return res.status(404).json({ error: 'تیکت یافت نشد' });
        const content = (req.body.content || '').trim();
        const attachments = Array.isArray(req.body.attachments) ? req.body.attachments : (req.body.attachments ? [req.body.attachments] : []);
        if (!content && attachments.length === 0) return res.status(400).json({ error: 'متن پاسخ یا حداقل یک پیوست الزامی است' });
        const reply = await TicketReply.create({
            ticketId: ticket.id,
            userId: req.userId,
            content: content || '(پیوست)',
            attachments: attachments.map(a => typeof a === 'object' && a.url ? { name: a.name || a.url, url: a.url, size: a.size } : null).filter(Boolean)
        });
        const withUser = await TicketReply.findByPk(reply.id, { include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }] });
        if (io) {
            const recipientIds = [ticket.createdBy, ticket.assignedTo].filter(Boolean).filter(id => String(id) !== String(req.userId));
            [...new Set(recipientIds)].forEach(uid => io.to(`user_${uid}`).emit('ticket_reply', {
                ticketId: ticket.id,
                ticketTitle: ticket.title,
                reply: withUser,
                fromUser: withUser.user
            }));
        }
        res.status(201).json(withUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { title, description, assignedTo, departmentId, priority, dueDate } = req.body;
        if (!title || !title.trim()) return res.status(400).json({ error: 'عنوان الزامی است' });
        const ticket = await Ticket.create({
            title: title.trim(),
            description: description || '',
            createdBy: req.userId,
            assignedTo: assignedTo || null,
            departmentId: departmentId || null,
            priority: priority || 'normal',
            status: 'open',
            dueDate: dueDate ? new Date(dueDate) : null
        });
        const withIncludes = await Ticket.findByPk(ticket.id, {
            include: [
                { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
                { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
                { model: Department, as: 'department', attributes: ['id', 'name'] }
            ]
        });
        res.status(201).json(withIncludes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const ticket = await Ticket.findByPk(req.params.id);
        if (!ticket) return res.status(404).json({ error: 'تیکت یافت نشد' });
        const { title, description, assignedTo, departmentId, status, priority, dueDate } = req.body;
        if ((title !== undefined || description !== undefined) && !canManageTicket(req)) return res.status(403).json({ error: 'فقط مدیر، ادمین یا مالک می‌تواند عنوان و توضیحات تیکت را ویرایش کند' });
        if (title !== undefined) ticket.title = (title || '').trim();
        if (description !== undefined) ticket.description = description;
        if (assignedTo !== undefined) ticket.assignedTo = assignedTo;
        if (departmentId !== undefined) ticket.departmentId = departmentId;
        if (status !== undefined) ticket.status = status;
        if (priority !== undefined) ticket.priority = priority;
        if (dueDate !== undefined) ticket.dueDate = dueDate ? new Date(dueDate) : null;
        await ticket.save();
        res.json(ticket);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        if (!canManageTicket(req)) return res.status(403).json({ error: 'فقط مدیر، ادمین یا مالک می‌تواند تیکت را حذف کند' });
        const ticket = await Ticket.findByPk(req.params.id);
        if (!ticket) return res.status(404).json({ error: 'تیکت یافت نشد' });
        await TicketReply.destroy({ where: { ticketId: ticket.id } });
        await ticket.destroy();
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

return router;
}

module.exports = createTicketsRouter;

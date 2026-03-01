const express = require('express');
const { Ticket, User, Department, TicketReply } = require('../models');
const { Op, literal } = require('sequelize');
const { canManageTickets, isMainAdmin } = require('../lib/permissions');
const notificationService = require('../services/notificationService');
const logger = require('../config/logger');
const { isValidUUID, parsePagination } = require('../lib/validation');

const VALID_TICKET_STATUSES = new Set(['open', 'in_progress', 'resolved', 'closed', 'archived']);
const VALID_TICKET_PRIORITIES = new Set(['low', 'normal', 'high', 'urgent']);

function canManageTicket(req) {
    return canManageTickets(req.user);
}

/** شرط دسترسی تیکت‌ها: ادمین/مالک/مدیر همه؛ کارمند/ناظر فقط تیکت‌های تخصیص‌یافته به خود، ایجادشده توسط خود، یا دپارتمان خود */
function ticketAccessWhere(req) {
    if (isMainAdmin(req.user) || ['owner', 'admin', 'manager'].indexOf(req.user.role || '') !== -1) return {};
    const orConditions = [
        { assignedTo: req.userId },
        { createdBy: req.userId }
    ];
    if (req.user.departmentId) orConditions.push({ departmentId: req.user.departmentId });
    return { [Op.or]: orConditions };
}

/** آیا کاربر به این تیکت دسترسی دارد؟ */
function canAccessTicket(req, ticket) {
    if (!ticket) return false;
    if (isMainAdmin(req.user) || ['owner', 'admin', 'manager'].indexOf(req.user.role || '') !== -1) return true;
    if (ticket.assignedTo === req.userId || ticket.createdBy === req.userId) return true;
    if (req.user.departmentId && ticket.departmentId === req.user.departmentId) return true;
    return false;
}

function createTicketsRouter(io) {
const router = express.Router();

router.get('/stats', async (req, res) => {
    try {
        const accessWhere = ticketAccessWhere(req);
        const rows = await Ticket.findAll({ where: accessWhere, attributes: ['status'], raw: true });
        const stats = { total: rows.length, open: 0, in_progress: 0, resolved: 0, closed: 0, archived: 0 };
        rows.forEach(t => { if (stats[t.status] !== undefined) stats[t.status]++; });
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const { status, priority, assignedTo, createdBy, departmentId, search, sort = 'newest' } = req.query;
        const { page, limit, offset } = parsePagination(req.query.page, req.query.limit, 100);
        const accessWhere = ticketAccessWhere(req);
        const andParts = Object.keys(accessWhere).length > 0 ? [accessWhere] : [];
        const where = {};
        if (status) {
            if (!VALID_TICKET_STATUSES.has(status)) return res.status(400).json({ error: 'وضعیت تیکت نامعتبر است' });
            where.status = status;
        }
        if (priority) {
            if (!VALID_TICKET_PRIORITIES.has(priority)) return res.status(400).json({ error: 'اولویت تیکت نامعتبر است' });
            where.priority = priority;
        }
        if (assignedTo) where.assignedTo = assignedTo;
        if (createdBy) where.createdBy = createdBy;
        if (departmentId) where.departmentId = departmentId;
        if (search && String(search).trim()) {
            const term = '%' + String(search).trim() + '%';
            andParts.push({
                [Op.or]: [
                    { title: { [Op.like]: term } },
                    { description: { [Op.like]: term } },
                    { ticketNumber: { [Op.like]: term } }
                ]
            });
        }
        if (andParts.length > 0) where[Op.and] = andParts;
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
            limit,
            offset
        });
        res.json({ data: rows, total: count, page });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه تیکت نامعتبر است' });
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
        if (!canAccessTicket(req, ticket)) return res.status(403).json({ error: 'دسترسی به این تیکت ندارید' });
        res.json(ticket);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/:id/replies', async (req, res) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه تیکت نامعتبر است' });
    try {
        const ticket = await Ticket.findByPk(req.params.id);
        if (!ticket) return res.status(404).json({ error: 'تیکت یافت نشد' });
        if (!canAccessTicket(req, ticket)) return res.status(403).json({ error: 'دسترسی به این تیکت ندارید' });
        const content = (req.body.content || '').trim();
        const attachments = Array.isArray(req.body.attachments) ? req.body.attachments : (req.body.attachments ? [req.body.attachments] : []);
        if (!content && attachments.length === 0) return res.status(400).json({ error: 'متن پاسخ یا حداقل یک پیوست الزامی است' });
        if (content.length > 10000) return res.status(400).json({ error: 'متن پاسخ بیش از ۱۰,۰۰۰ کاراکتر مجاز نیست' });
        const reply = await TicketReply.create({
            ticketId: ticket.id,
            userId: req.userId,
            content: content || '(پیوست)',
            attachments: attachments.map(a => typeof a === 'object' && a.url ? { name: a.name || a.url, url: a.url, size: a.size } : null).filter(Boolean)
        });
        const withUser = await TicketReply.findByPk(reply.id, { include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }] });
        
        // اطلاع‌دهی پاسخ تیکت
        setImmediate(() => {
            notificationService.notifyTicketReply(ticket, withUser, io).catch(err => {
                logger.error('Reply notification error', { error: err.message });
            });
        });
        
        // Socket.IO (fallback برای سازگاری عقب‌تر)
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
        if (!req.canAccess('tickets')) return res.status(403).json({ error: 'دسترسی به بخش تیکت‌ها ندارید' });
        const { title, description, assignedTo, departmentId, priority, dueDate } = req.body;
        if (!title || !title.trim()) return res.status(400).json({ error: 'عنوان الزامی است' });
        if (String(title).trim().length > 300) return res.status(400).json({ error: 'عنوان تیکت بیش از ۳۰۰ کاراکتر مجاز نیست' });
        if (assignedTo && !isValidUUID(assignedTo)) return res.status(400).json({ error: 'شناسه کارمند نامعتبر است' });
        if (departmentId && !isValidUUID(departmentId)) return res.status(400).json({ error: 'شناسه دپارتمان نامعتبر است' });
        const resolvedPriority = priority || 'normal';
        if (!VALID_TICKET_PRIORITIES.has(resolvedPriority)) return res.status(400).json({ error: 'اولویت تیکت نامعتبر است' });
        const ticket = await Ticket.create({
            title: title.trim(),
            description: description || '',
            createdBy: req.userId,
            assignedTo: assignedTo || null,
            departmentId: departmentId || null,
            priority: resolvedPriority,
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
        
        // ارسال اطلاع تخصیص تیکت
        if (assignedTo) {
            setImmediate(() => {
                notificationService.notifyTicketAssigned(withIncludes, io).catch(err => {
                    logger.error('Ticket notification error', { error: err.message });
                });
            });
        }
        
        res.status(201).json(withIncludes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه تیکت نامعتبر است' });
    try {
        const ticket = await Ticket.findByPk(req.params.id);
        if (!ticket) return res.status(404).json({ error: 'تیکت یافت نشد' });
        if (!canAccessTicket(req, ticket)) return res.status(403).json({ error: 'دسترسی به این تیکت ندارید' });
        
        const oldAssignedTo = ticket.assignedTo;
        const { title, description, assignedTo, departmentId, status, priority, dueDate } = req.body;
        if ((title !== undefined || description !== undefined) && !canManageTicket(req)) return res.status(403).json({ error: 'فقط مدیر، ادمین یا مالک می‌تواند عنوان و توضیحات تیکت را ویرایش کند' });
        if (title !== undefined) ticket.title = (title || '').trim();
        if (description !== undefined) ticket.description = description;
        if (assignedTo !== undefined) ticket.assignedTo = assignedTo;
        if (departmentId !== undefined) ticket.departmentId = departmentId;
        if (status !== undefined) {
            if (!VALID_TICKET_STATUSES.has(status)) return res.status(400).json({ error: 'وضعیت تیکت نامعتبر است' });
            ticket.status = status;
        }
        if (priority !== undefined) {
            if (!VALID_TICKET_PRIORITIES.has(priority)) return res.status(400).json({ error: 'اولویت تیکت نامعتبر است' });
            ticket.priority = priority;
        }
        if (dueDate !== undefined) ticket.dueDate = dueDate ? new Date(dueDate) : null;
        await ticket.save();
        
        // اگر تخصیص تغیر یافت
        if (assignedTo !== undefined && String(oldAssignedTo || '') !== String(assignedTo || '')) {
            if (assignedTo) {
                const updated = await Ticket.findByPk(ticket.id, {
                    include: [
                        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
                        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
                        { model: Department, as: 'department', attributes: ['id', 'name'] }
                    ]
                });
                setImmediate(() => {
                    notificationService.notifyTicketAssigned(updated, io).catch(err => {
                        logger.error('Ticket update notification error', { error: err.message });
                    });
                });
            }
        }
        
        res.json(ticket);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه تیکت نامعتبر است' });
    try {
        if (!canManageTicket(req)) return res.status(403).json({ error: 'فقط مدیر، ادمین یا مالک می‌تواند تیکت را حذف کند' });
        const ticket = await Ticket.findByPk(req.params.id);
        if (!ticket) return res.status(404).json({ error: 'تیکت یافت نشد' });
        if (!canAccessTicket(req, ticket)) return res.status(403).json({ error: 'دسترسی به این تیکت ندارید' });
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

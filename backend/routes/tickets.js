const express = require('express');
const router = express.Router();
const { Ticket, User, Department, TicketReply } = require('../models');
const { Op } = require('sequelize');

router.get('/', async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const where = {};
        if (status) where.status = status;
        const { rows, count } = await Ticket.findAndCountAll({
            where,
            include: [
                { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
                { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
                { model: Department, as: 'department', attributes: ['id', 'name'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: Math.min(parseInt(limit) || 20, 100),
            offset: (parseInt(page) - 1) * (parseInt(limit) || 20)
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
        if (!content) return res.status(400).json({ error: 'متن پاسخ الزامی است' });
        const reply = await TicketReply.create({ ticketId: ticket.id, userId: req.userId, content });
        const withUser = await TicketReply.findByPk(reply.id, { include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }] });
        res.status(201).json(withUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { title, description, assignedTo, departmentId, priority } = req.body;
        if (!title || !title.trim()) return res.status(400).json({ error: 'عنوان الزامی است' });
        const ticket = await Ticket.create({
            title: title.trim(),
            description: description || '',
            createdBy: req.userId,
            assignedTo: assignedTo || null,
            departmentId: departmentId || null,
            priority: priority || 'normal',
            status: 'open'
        });
        res.status(201).json(ticket);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const ticket = await Ticket.findByPk(req.params.id);
        if (!ticket) return res.status(404).json({ error: 'تیکت یافت نشد' });
        const { title, description, assignedTo, departmentId, status, priority } = req.body;
        if (title !== undefined) ticket.title = title.trim();
        if (description !== undefined) ticket.description = description;
        if (assignedTo !== undefined) ticket.assignedTo = assignedTo;
        if (departmentId !== undefined) ticket.departmentId = departmentId;
        if (status !== undefined) ticket.status = status;
        if (priority !== undefined) ticket.priority = priority;
        await ticket.save();
        res.json(ticket);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

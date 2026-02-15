const express = require('express');
const router = express.Router();
const { Customer, Conversation, Message, CustomerNote, User } = require('../models');
const { Op } = require('sequelize');
const { getAccessibleCustomerIds, canAccessCustomer } = require('../lib/customerAccess');

router.get('/', async (req, res) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی به بخش مشتریان ندارید' });
        const { page = 1, limit = 100, search, status } = req.query;
        const customerIds = await getAccessibleCustomerIds(req);
        const where = {};
        if (customerIds && customerIds.length === 0) {
            return res.json({ data: [], total: 0, page: parseInt(page) });
        }
        if (customerIds) where.id = { [Op.in]: customerIds };
        if (status && ['active', 'inactive', 'blocked'].includes(status)) where.status = status;
        if (search && String(search).trim()) {
            const term = '%' + String(search).trim().replace(/%/g, '\\%') + '%';
            where[Op.or] = [
                { name: { [Op.like]: term } },
                { phone: { [Op.like]: term } },
                { email: { [Op.like]: term } }
            ];
        }
        const { rows, count } = await Customer.findAndCountAll({
            where,
            order: [['lastContactAt', 'DESC']],
            limit: Math.min(parseInt(limit) || 100, 200),
            offset: (Math.max(1, parseInt(page)) - 1) * (parseInt(limit) || 100)
        });
        res.json({ data: rows, total: count, page: parseInt(page) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی به بخش مشتریان ندارید' });
        const customer = await Customer.findByPk(req.params.id);
        if (!customer) return res.status(404).json({ error: 'مشتری یافت نشد' });
        const allowed = await canAccessCustomer(req, customer.id);
        if (!allowed) return res.status(403).json({ error: 'دسترسی به این مشتری ندارید' });
        res.json(customer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id/conversations', async (req, res) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی به بخش مشتریان ندارید' });
        const allowed = await canAccessCustomer(req, req.params.id);
        if (!allowed) return res.status(403).json({ error: 'دسترسی به این مشتری ندارید' });
        // پس از تأیید دسترسی، کل تاریخچه مکالمات این مشتری را برگردان (برای دیدن همه‌چیز)
        const conversations = await Conversation.findAll({
            where: { customerId: req.params.id },
            order: [['lastMessageAt', 'DESC']]
        });
        const withCount = await Promise.all(conversations.map(async (c) => {
            const count = await Message.count({ where: { conversationId: c.id } });
            return { id: c.id, status: c.status, priority: c.priority, lastMessageAt: c.lastMessageAt, messageCount: count, createdAt: c.createdAt, assignedTo: c.assignedTo };
        }));
        res.json({ data: withCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی به بخش مشتریان ندارید' });
        const customer = await Customer.create(req.body);
        res.status(201).json(customer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی به بخش مشتریان ندارید' });
        const customer = await Customer.findByPk(req.params.id);
        if (!customer) return res.status(404).json({ error: 'مشتری یافت نشد' });
        const allowed = await canAccessCustomer(req, customer.id);
        if (!allowed) return res.status(403).json({ error: 'دسترسی به این مشتری ندارید' });
        const { name, phone, email, status, notes, customFields } = req.body;
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone;
        if (email !== undefined) updateData.email = email;
        if (notes !== undefined) updateData.notes = notes;
        if (customFields !== undefined) updateData.customFields = customFields;
        const role = req.user.role;
        const canEditStatus = ['owner', 'admin', 'manager'].indexOf(role) !== -1 || (req.user.permissions && req.user.permissions.manage_users);
        if (status !== undefined && canEditStatus) updateData.status = status;
        await customer.update(updateData);
        res.json(customer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ——— گزارش/یادداشت کارمند درباره مشتری (تاریخچه هر کارمند)
router.get('/:id/notes', async (req, res) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی به بخش مشتریان ندارید' });
        const allowed = await canAccessCustomer(req, req.params.id);
        if (!allowed) return res.status(403).json({ error: 'دسترسی به این مشتری ندارید' });
        const notes = await CustomerNote.findAll({
            where: { customerId: req.params.id },
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
            order: [['createdAt', 'DESC']]
        });
        res.json({ data: notes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/:id/notes', async (req, res) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی به بخش مشتریان ندارید' });
        const customer = await Customer.findByPk(req.params.id);
        if (!customer) return res.status(404).json({ error: 'مشتری یافت نشد' });
        const allowed = await canAccessCustomer(req, customer.id);
        if (!allowed) return res.status(403).json({ error: 'دسترسی به این مشتری ندارید' });
        const content = (req.body.content || '').trim();
        if (!content) return res.status(400).json({ error: 'متن گزارش/یادداشت الزامی است' });
        const note = await CustomerNote.create({
            customerId: req.params.id,
            userId: req.userId,
            content
        });
        const withUser = await CustomerNote.findByPk(note.id, {
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }]
        });
        res.status(201).json(withUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

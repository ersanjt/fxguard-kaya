const express = require('express');
const router = express.Router();
const { Customer, Conversation, Message, CustomerNote, User, ActivityLog, Department, Transaction, CashBox, BankAccount } = require('../models');
const { Op } = require('sequelize');
const { getAccessibleCustomerIds, canAccessCustomer } = require('../lib/customerAccess');

router.get('/', async (req, res) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی به بخش مشتریان ندارید' });
        const { page = 1, limit = 100, search, status } = req.query;
        const customerIds = await getAccessibleCustomerIds(req);
        const where = {};
        if (customerIds && customerIds.length === 0) {
            return res.json({ data: [], total: 0, page: parseInt(page), stats: { total: 0, active: 0, inactive: 0, blocked: 0 } });
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
        const statsWhere = customerIds ? { id: { [Op.in]: customerIds } } : {};
        const [stats, { rows, count }] = await Promise.all([
            !search ? Customer.findAll({
                where: statsWhere,
                attributes: ['status'],
                raw: true
            }).then(all => ({
                total: all.length,
                active: all.filter(c => c.status === 'active').length,
                inactive: all.filter(c => c.status === 'inactive').length,
                blocked: all.filter(c => c.status === 'blocked').length
            })) : Promise.resolve(null),
            Customer.findAndCountAll({
                where,
                order: [['lastContactAt', 'DESC']],
                limit: Math.min(parseInt(limit) || 100, 200),
                offset: (Math.max(1, parseInt(page)) - 1) * (parseInt(limit) || 100)
            })
        ]);
        const custIds = rows.map(r => r.id);
        const latestConvs = custIds.length > 0 ? await Conversation.findAll({
            where: { customerId: { [Op.in]: custIds }, status: { [Op.ne]: 'closed' } },
            include: [
                { model: User, as: 'assignee', attributes: ['id', 'name'] },
                { model: Department, as: 'department', attributes: ['id', 'name'], required: false }
            ],
            order: [['lastMessageAt', 'DESC']],
            raw: false
        }).then(convs => {
            const byCust = {};
            convs.forEach(c => { if (!byCust[c.customerId]) byCust[c.customerId] = c; });
            return byCust;
        }) : {};
        const enriched = rows.map(c => {
            const plain = c.get ? c.get({ plain: true }) : c;
            const cid = plain.id;
            const lc = latestConvs[cid];
            return {
                ...plain,
                lastOpenConv: lc ? { id: lc.id, assignee: lc.assignee ? lc.assignee.get ? lc.assignee.get({ plain: true }) : lc.assignee : null, department: lc.department ? (lc.department.get ? lc.department.get({ plain: true }) : lc.department) : null, status: lc.status } : null
            };
        });
        res.json({ data: enriched, total: count, page: parseInt(page), stats: stats || null });
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
        const conversations = await Conversation.findAll({
            where: { customerId: req.params.id },
            include: [{ model: User, as: 'assignee', attributes: ['id', 'name', 'email'] }],
            order: [['lastMessageAt', 'DESC']]
        });
        const withCount = await Promise.all(conversations.map(async (c) => {
            const count = await Message.count({ where: { conversationId: c.id } });
            const lastOutgoing = await Message.findOne({ where: { conversationId: c.id, direction: 'outgoing' }, order: [['timestamp', 'DESC']], include: [{ model: User, as: 'user', attributes: ['id', 'name'] }] });
            return {
                id: c.id, status: c.status, priority: c.priority, lastMessageAt: c.lastMessageAt, messageCount: count, createdAt: c.createdAt,
                assignedTo: c.assignedTo, assignee: c.assignee, lastOutgoingBy: lastOutgoing && lastOutgoing.user ? lastOutgoing.user.name : null
            };
        }));
        res.json({ data: withCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id/timeline', async (req, res) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی به بخش مشتریان ندارید' });
        const allowed = await canAccessCustomer(req, req.params.id);
        if (!allowed) return res.status(403).json({ error: 'دسترسی به این مشتری ندارید' });
        const customerId = req.params.id;
        let transactions = [];
        const [conversationsRaw, notes, activities, txList] = await Promise.all([
            Conversation.findAll({
                where: { customerId },
                include: [{ model: User, as: 'assignee', attributes: ['id', 'name'] }],
                order: [['lastMessageAt', 'DESC']]
            }),
            CustomerNote.findAll({
                where: { customerId },
                include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
                order: [['createdAt', 'DESC']]
            }),
            ActivityLog.findAll({
                where: { customerId },
                include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
                order: [['createdAt', 'DESC']],
                limit: 100
            }),
            Transaction.findAll({
                where: { customerId },
                order: [['transactionDate', 'DESC'], ['createdAt', 'DESC']],
                limit: 50
            }).catch(() => [])
        ]);
        transactions = Array.isArray(txList) ? txList : [];
        const convWithCount = await Promise.all(conversationsRaw.map(async (c) => {
            const count = await Message.count({ where: { conversationId: c.id } });
            const plain = c.get ? c.get({ plain: true }) : c;
            return { ...plain, messageCount: count };
        }));
        const items = [];
        convWithCount.forEach(c => {
            items.push({ type: 'conversation', date: c.lastMessageAt || c.createdAt, data: c, assignee: c.assignee });
        });
        notes.forEach(n => {
            items.push({ type: 'note', date: n.createdAt, data: n, user: n.user });
        });
        activities.forEach(a => {
            items.push({ type: 'activity', date: a.createdAt, data: a, user: a.user });
        });
        transactions.forEach(t => {
            items.push({ type: 'transaction', date: t.transactionDate || t.createdAt, data: t });
        });
        items.sort((a, b) => new Date(b.date) - new Date(a.date));
        res.json({ data: items });
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
router.get('/:id/transactions', async (req, res) => {
    try {
        if (!req.canAccess('customers') && !req.canAccess('services')) return res.status(403).json({ error: 'دسترسی ندارید' });
        const allowed = await canAccessCustomer(req, req.params.id);
        if (!allowed) return res.status(403).json({ error: 'دسترسی به این مشتری ندارید' });
        let transactions = [];
        try {
            transactions = await Transaction.findAll({
                where: { customerId: req.params.id },
            include: [
                { model: User, as: 'user', attributes: ['id', 'name'] },
                { model: CashBox, as: 'fromCashBox', attributes: ['id', 'name'] },
                { model: CashBox, as: 'toCashBox', attributes: ['id', 'name'] },
                { model: BankAccount, as: 'fromBankAccount', attributes: ['id', 'name', 'bankName'] },
                { model: BankAccount, as: 'toBankAccount', attributes: ['id', 'name', 'bankName'] }
            ],
            order: [['transactionDate', 'DESC'], ['createdAt', 'DESC']],
            limit: 200
        });
        } catch (_) { transactions = []; }
        res.json({ data: transactions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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
        const { logActivity } = require('../services/activityLog');
        await logActivity({
            userId: req.userId,
            action: 'customer_note_added',
            entityType: 'customer_note',
            entityId: note.id,
            customerId: req.params.id,
            summary: 'گزارش/یادداشت ثبت شد',
            metadata: { contentLength: content.length }
        });
        res.status(201).json(withUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { sequelize, Customer, Conversation, Message, CustomerNote, User, ActivityLog, Department, Transaction, CashBox, BankAccount, Tag } = require('../models');
const { logActivity } = require('../services/activityLog');
const { Op } = require('sequelize');
const { getAccessibleCustomerIds, canAccessCustomer } = require('../lib/customerAccess');
const { normalizePhone } = require('../lib/phoneUtils');
const { isValidUUID, parsePagination } = require('../lib/validation');

router.get('/', async (req, res) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی به بخش مشتریان ندارید' });
        const { page = 1, limit = 100, search, status } = req.query;
        const { page: p, limit: l, offset } = parsePagination(page, limit, 200);
        const customerIds = await getAccessibleCustomerIds(req);
        const where = {};
        if (customerIds && customerIds.length === 0) {
            return res.json({ data: [], total: 0, page: p, stats: { total: 0, active: 0, inactive: 0, blocked: 0 } });
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
                limit: l,
                offset
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
        res.json({ data: enriched, total: count, page: p, stats: stats || null });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی به بخش مشتریان ندارید' });
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const customer = await Customer.findByPk(req.params.id, {
            include: [{ model: Tag, as: 'tags', attributes: ['id', 'name', 'color'], through: { attributes: [] } }]
        });
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
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const allowed = await canAccessCustomer(req, req.params.id);
        if (!allowed) return res.status(403).json({ error: 'دسترسی به این مشتری ندارید' });
        const conversations = await Conversation.findAll({
            where: { customerId: req.params.id },
            include: [{ model: User, as: 'assignee', attributes: ['id', 'name', 'email'] }],
            order: [['lastMessageAt', 'DESC']]
        });
        const convIds = conversations.map(c => c.id);
        let countMap = {};
        let lastOutgoingMap = {};
        if (convIds.length > 0) {
            const [countRows, lastOutgoings] = await Promise.all([
                Message.findAll({
                    where: { conversationId: { [Op.in]: convIds } },
                    attributes: ['conversationId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
                    group: ['conversationId'],
                    raw: true
                }),
                Message.findAll({
                    where: { conversationId: { [Op.in]: convIds }, direction: 'outgoing' },
                    include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
                    order: [['timestamp', 'DESC']],
                    limit: Math.min(convIds.length * 5, 200),
                    raw: false
                })
            ]);
            countRows.forEach(r => { countMap[r.conversationId] = parseInt(r.count) || 0; });
            lastOutgoings.forEach(m => {
                if (!lastOutgoingMap[m.conversationId]) lastOutgoingMap[m.conversationId] = m.user ? m.user.name : null;
            });
        }
        const withCount = conversations.map((c) => {
            const lastOutgoing = lastOutgoingMap[c.id];
            return {
                id: c.id, status: c.status, priority: c.priority, lastMessageAt: c.lastMessageAt, messageCount: countMap[c.id] || 0, createdAt: c.createdAt,
                assignedTo: c.assignedTo, assignee: c.assignee, lastOutgoingBy: lastOutgoing,
                metadata: c.metadata || {}
            };
        });
        res.json({ data: withCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id/timeline', async (req, res) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی به بخش مشتریان ندارید' });
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
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
        const convIds = conversationsRaw.map(c => c.id);
        let convCountMap = {};
        if (convIds.length > 0) {
            const countRows = await Message.findAll({
                where: { conversationId: { [Op.in]: convIds } },
                attributes: ['conversationId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
                group: ['conversationId'],
                raw: true
            });
            countRows.forEach(r => { convCountMap[r.conversationId] = parseInt(r.count) || 0; });
        }
        const convWithCount = conversationsRaw.map((c) => {
            const plain = c.get ? c.get({ plain: true }) : c;
            return { ...plain, messageCount: convCountMap[c.id] || 0 };
        });
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
        const body = { ...req.body };
        if (body.phone) body.phone = normalizePhone(body.phone) || body.phone;
        body.source = body.source || 'manual';
        const customer = await Customer.create(body);
        if (body.tagIds && Array.isArray(body.tagIds) && body.tagIds.length) {
            await customer.setTags(body.tagIds);
        }
        const created = await Customer.findByPk(customer.id, {
            include: [{ model: Tag, as: 'tags', attributes: ['id', 'name', 'color'], through: { attributes: [] } }]
        });
        res.status(201).json(created || customer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی به بخش مشتریان ندارید' });
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const customer = await Customer.findByPk(req.params.id);
        if (!customer) return res.status(404).json({ error: 'مشتری یافت نشد' });
        const allowed = await canAccessCustomer(req, customer.id);
        if (!allowed) return res.status(403).json({ error: 'دسترسی به این مشتری ندارید' });
        const { name, phone, email, status, notes, customFields } = req.body;
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) updateData.phone = normalizePhone(phone) || phone;
        if (email !== undefined) updateData.email = email;
        if (notes !== undefined) updateData.notes = notes;
        if (customFields !== undefined) updateData.customFields = customFields;
        if (req.body.profilePic !== undefined) updateData.profilePic = req.body.profilePic;
        const role = req.user.role;
        const canEditStatus = ['owner', 'admin', 'manager'].indexOf(role) !== -1 || (req.user.permissions && req.user.permissions.manage_users);
        if (status !== undefined && canEditStatus) updateData.status = status;
        await customer.update(updateData);
        res.json(customer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// حذف مشتری — فقط ادمین یا مدیر (یا مالک)
router.delete('/:id', async (req, res) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی به بخش مشتریان ندارید' });
        if (!req.canDeleteCustomer()) return res.status(403).json({ error: 'فقط ادمین یا مدیر می‌توانند مشتری را حذف کنند' });
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const customer = await Customer.findByPk(req.params.id);
        if (!customer) return res.status(404).json({ error: 'مشتری یافت نشد' });
        const allowed = await canAccessCustomer(req, customer.id);
        if (!allowed) return res.status(403).json({ error: 'دسترسی به این مشتری ندارید' });

        const customerId = customer.id;
        const convs = await Conversation.findAll({ where: { customerId }, attributes: ['id'] });
        const convIds = convs.map(c => c.id);
        if (convIds.length > 0) {
            await Message.destroy({ where: { conversationId: { [Op.in]: convIds } } });
        }
        await Conversation.destroy({ where: { customerId } });
        await CustomerNote.destroy({ where: { customerId } });
        await ActivityLog.destroy({ where: { customerId } });
        await Transaction.update({ customerId: null }, { where: { customerId } });
        await customer.destroy();

        await logActivity({
            userId: req.userId,
            action: 'customer_deleted',
            entityType: 'customer',
            entityId: customerId,
            summary: 'مشتری حذف شد',
            metadata: { name: customer.name, phone: customer.phone }
        });
        res.json({ message: 'مشتری حذف شد' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ——— گزارش/یادداشت کارمند درباره مشتری (تاریخچه هر کارمند)
router.get('/:id/transactions', async (req, res) => {
    try {
        if (!req.canAccess('customers') && !req.canAccess('services')) return res.status(403).json({ error: 'دسترسی ندارید' });
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
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
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
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
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const customer = await Customer.findByPk(req.params.id);
        if (!customer) return res.status(404).json({ error: 'مشتری یافت نشد' });
        const allowed = await canAccessCustomer(req, customer.id);
        if (!allowed) return res.status(403).json({ error: 'دسترسی به این مشتری ندارید' });
        const content = (req.body.content || '').trim();
        if (!content) return res.status(400).json({ error: 'متن گزارش/یادداشت الزامی است' });
        if (content.length > 5000) return res.status(400).json({ error: 'متن یادداشت بیش از ۵,۰۰۰ کاراکتر مجاز نیست' });
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

// ——— تگ‌های مشتری
router.get('/:id/tags', async (req, res) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی به بخش مشتریان ندارید' });
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const allowed = await canAccessCustomer(req, req.params.id);
        if (!allowed) return res.status(403).json({ error: 'دسترسی به این مشتری ندارید' });
        const customer = await Customer.findByPk(req.params.id, {
            include: [{ model: Tag, as: 'tags', attributes: ['id', 'name', 'color'], through: { attributes: [] } }]
        });
        if (!customer) return res.status(404).json({ error: 'مشتری یافت نشد' });
        res.json({ data: customer.tags || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id/tags', async (req, res) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی به بخش مشتریان ندارید' });
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const customer = await Customer.findByPk(req.params.id);
        if (!customer) return res.status(404).json({ error: 'مشتری یافت نشد' });
        const allowed = await canAccessCustomer(req, customer.id);
        if (!allowed) return res.status(403).json({ error: 'دسترسی به این مشتری ندارید' });
        const tagIds = Array.isArray(req.body.tagIds) ? req.body.tagIds : (req.body.tagIds ? [req.body.tagIds] : []);
        const validIds = tagIds.filter(id => id && String(id).trim()).map(id => String(id).trim());
        await customer.setTags(validIds);
        const updated = await Customer.findByPk(req.params.id, {
            include: [{ model: Tag, as: 'tags', attributes: ['id', 'name', 'color'], through: { attributes: [] } }]
        });
        res.json({ data: updated.tags || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

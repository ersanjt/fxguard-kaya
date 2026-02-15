const express = require('express');
const router = express.Router();
const axios = require('axios');
const { Conversation, Customer, Message, User, Branch, Department } = require('../models');
const { Op } = require('sequelize');
const { logActivity } = require('../services/activityLog');
const { getAccessibleCustomerIds } = require('../lib/customerAccess');
const { isMainAdmin } = require('../lib/permissions');

/** آیا کاربر جاری به این مکالمه دسترسی دارد؟ (نقش، شعبه/تخصیص، مشارکت قبلی، یا دسترسی به مشتری) */
async function canAccessConversation(req, conversation, accessibleCustomerIds) {
    if (!conversation) return false;
    if (isMainAdmin(req.user)) return true;
    const role = req.user.role;
    if (role === 'owner' || role === 'admin' || role === 'manager') return true;
    if (conversation.assignedTo === req.userId) return true;
    if (req.user.branchId && conversation.branchId === req.user.branchId) return true;
    if (!conversation.branchId && !conversation.assignedTo) return true;
    if (accessibleCustomerIds && conversation.customerId && accessibleCustomerIds.includes(conversation.customerId)) return true;
    const participated = await Message.findOne({ where: { conversationId: conversation.id, userId: req.userId }, attributes: ['id'] });
    if (participated) return true;
    return false;
}

/** آیا کاربر می‌تواند مکالمه را تخصیص/بست/تغییر وضعیت دهد؟ (ادمین اصلی، owner، admin، manager) */
function canManageConversation(req) {
    return isMainAdmin(req.user) || req.user.role === 'owner' || req.user.role === 'admin' || req.user.role === 'manager';
}

// ——— لیست مکالمات (با فیلتر و سیاست دسترسی)
router.get('/', async (req, res) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        const { status, priority, assignedTo, unread, branchId, departmentId, search, page = 1, limit = 20 } = req.query;
        const where = {};

        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (assignedTo) where.assignedTo = assignedTo;
        if (unread === '1' || unread === 'true') where.unreadCount = { [Op.gt]: 0 };
        if (branchId) where.branchId = branchId;
        if (departmentId) where.departmentId = departmentId;

        if (!isMainAdmin(req.user) && req.user.role !== 'owner' && req.user.role !== 'admin' && req.user.role !== 'manager') {
            if (req.user.branchId) {
                where[Op.or] = [{ branchId: req.user.branchId }, { assignedTo: req.userId }, { branchId: null, assignedTo: null }];
            } else {
                where[Op.or] = [{ assignedTo: req.userId }, { assignedTo: null }];
            }
        }

        const include = [
            { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'profilePic'], ...(search ? { where: { [Op.or]: [{ name: { [Op.like]: '%' + search + '%' } }, { phone: { [Op.like]: '%' + search + '%' } }] }, required: true } : {}) },
            { model: User, as: 'assignee', attributes: ['id', 'name'] },
            { model: Branch, as: 'branch', attributes: ['id', 'name', 'city'], required: false },
            { model: Department, as: 'department', attributes: ['id', 'name', 'color'], required: false }
        ];

        const { rows, count } = await Conversation.findAndCountAll({
            where,
            include,
            distinct: true,
            order: [['lastMessageAt', 'DESC']],
            limit: Math.min(parseInt(limit) || 20, 100),
            offset: (Math.max(1, parseInt(page)) - 1) * (parseInt(limit) || 20)
        });
        res.json({ data: rows, total: count, page: Math.max(1, parseInt(page)) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ——— جزئیات یک مکالمه
router.get('/:id', async (req, res) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        const conversation = await Conversation.findByPk(req.params.id, {
            include: [
                { model: Customer, as: 'customer' },
                { model: User, as: 'assignee', attributes: { exclude: ['password'] } },
                { model: Branch, as: 'branch', required: false },
                { model: Department, as: 'department', required: false }
            ]
        });
        if (!conversation) return res.status(404).json({ error: 'مکالمه یافت نشد' });
        const accessibleCustomerIds = await getAccessibleCustomerIds(req);
        if (!(await canAccessConversation(req, conversation, accessibleCustomerIds))) return res.status(403).json({ error: 'دسترسی به این مکالمه ندارید' });
        res.json(conversation);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ——— پیام‌های مکالمه
router.get('/:id/messages', async (req, res) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        const conversation = await Conversation.findByPk(req.params.id);
        if (!conversation) return res.status(404).json({ error: 'مکالمه یافت نشد' });
        const accessibleCustomerIds = await getAccessibleCustomerIds(req);
        if (!(await canAccessConversation(req, conversation, accessibleCustomerIds))) return res.status(403).json({ error: 'دسترسی به این مکالمه ندارید' });
        const messages = await Message.findAll({
            where: { conversationId: req.params.id },
            order: [['timestamp', 'ASC']]
        });
        res.json({ data: messages });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ——— به‌روزرسانی مکالمه (تخصیص، وضعیت، اولویت، بستن، موضوع، خوانده‌شدن)
router.patch('/:id', async (req, res) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        const conversation = await Conversation.findByPk(req.params.id, {
            include: [
                { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'] },
                { model: User, as: 'assignee', attributes: ['id', 'name'] }
            ]
        });
        if (!conversation) return res.status(404).json({ error: 'مکالمه یافت نشد' });
        const accessibleCustomerIds = await getAccessibleCustomerIds(req);
        if (!(await canAccessConversation(req, conversation, accessibleCustomerIds))) return res.status(403).json({ error: 'دسترسی به این مکالمه ندارید' });

        const { assignedTo, departmentId, branchId, status, priority, subject, markRead } = req.body;

        if (markRead === true || markRead === 'true') {
            await conversation.update({ unreadCount: 0 });
            return res.json(conversation);
        }

        if (!canManageConversation(req)) return res.status(403).json({ error: 'فقط مدیر یا ادمین می‌تواند تخصیص و وضعیت مکالمه را تغییر دهد' });

        const updateData = {};
        if (assignedTo !== undefined) {
            updateData.assignedTo = assignedTo || null;
            updateData.assignedAt = assignedTo ? new Date() : null;
        }
        if (departmentId !== undefined) updateData.departmentId = departmentId || null;
        if (branchId !== undefined && (isMainAdmin(req.user) || req.user.role === 'owner' || req.user.role === 'admin' || req.user.role === 'manager')) updateData.branchId = branchId || null;
        if (status !== undefined) {
            updateData.status = status;
            if (status === 'closed' || status === 'resolved') {
                updateData.closedAt = new Date();
                updateData.closedBy = req.userId;
            }
        }
        if (priority !== undefined) updateData.priority = priority;
        if (subject !== undefined) updateData.subject = subject;

        await conversation.update(updateData);

        if (assignedTo && updateData.assignedTo) {
            await logActivity({
                userId: req.userId,
                branchId: conversation.branchId || req.user.branchId,
                departmentId: conversation.departmentId || req.user.departmentId,
                action: 'conversation_assigned',
                entityType: 'conversation',
                entityId: conversation.id,
                summary: `مکالمه به کاربر تخصیص داده شد`,
                metadata: { conversationId: conversation.id, assignedTo, customerPhone: conversation.customer && conversation.customer.phone }
            });
        }
        const updated = await Conversation.findByPk(req.params.id, {
            include: [
                { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'profilePic'] },
                { model: User, as: 'assignee', attributes: ['id', 'name'] },
                { model: Branch, as: 'branch', attributes: ['id', 'name', 'city'], required: false },
                { model: Department, as: 'department', attributes: ['id', 'name', 'color'], required: false }
            ]
        });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ——— علامت‌گذاری به‌عنوان خوانده‌شده
router.post('/:id/read', async (req, res) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        const conversation = await Conversation.findByPk(req.params.id);
        if (!conversation) return res.status(404).json({ error: 'مکالمه یافت نشد' });
        const accessibleCustomerIds = await getAccessibleCustomerIds(req);
        if (!(await canAccessConversation(req, conversation, accessibleCustomerIds))) return res.status(403).json({ error: 'دسترسی به این مکالمه ندارید' });
        await conversation.update({ unreadCount: 0 });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ——— ارسال پیام
router.post('/:id/send', async (req, res) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        const conversation = await Conversation.findByPk(req.params.id, { include: [{ model: Customer, as: 'customer' }] });
        if (!conversation) return res.status(404).json({ error: 'مکالمه یافت نشد' });
        const accessibleCustomerIds = await getAccessibleCustomerIds(req);
        if (!(await canAccessConversation(req, conversation, accessibleCustomerIds))) return res.status(403).json({ error: 'دسترسی به این مکالمه ندارید' });
        const content = (req.body.content || '').trim();
        if (!content) return res.status(400).json({ error: 'متن پیام الزامی است' });
        const msg = await Message.create({
            conversationId: conversation.id,
            customerId: conversation.customerId,
            userId: req.userId,
            direction: 'outgoing',
            content,
            type: req.body.type || 'text',
            timestamp: new Date()
        });
        const updateData = { lastMessageAt: new Date(), unreadCount: 0 };
        if (!conversation.branchId && req.user.branchId) updateData.branchId = req.user.branchId;
        await conversation.update(updateData);
        const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:3001';
        await axios.post(gatewayUrl + '/api/send-message', {
            to: conversation.customer.phone,
            message: content,
            media: req.body.media || null
        }, { timeout: 10000 }).catch(() => {});
        await logActivity({
            userId: req.userId,
            branchId: req.user.branchId || conversation.branchId,
            departmentId: req.user.departmentId || conversation.departmentId,
            action: 'message_sent',
            entityType: 'message',
            entityId: msg.id,
            summary: `پیام به مشتری ${conversation.customer.phone || conversation.customerId}`,
            metadata: { conversationId: conversation.id, contentLength: content.length }
        });
        res.json(msg);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

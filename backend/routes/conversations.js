const express = require('express');
const router = express.Router();
const axios = require('axios');
const { Conversation, Customer, Message, User, Branch } = require('../models');
const { Op } = require('sequelize');
const { logActivity } = require('../services/activityLog');

router.get('/', async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const where = {};
        if (status) where.status = status;
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            if (req.user.branchId) where[Op.or] = [{ branchId: req.user.branchId }, { assignedTo: req.userId }];
            else where.assignedTo = req.userId;
        }
        const { rows, count } = await Conversation.findAndCountAll({
            where,
            include: [
                { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'profilePic'] },
                { model: User, as: 'assignee', attributes: ['id', 'name'] },
                { model: Branch, as: 'branch', attributes: ['id', 'name', 'city'], required: false }
            ],
            order: [['lastMessageAt', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });
        res.json({ data: rows, total: count, page: parseInt(page) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const conversation = await Conversation.findByPk(req.params.id, {
            include: [
                { model: Customer, as: 'customer' },
                { model: User, as: 'assignee', attributes: { exclude: ['password'] } }
            ]
        });
        if (!conversation) return res.status(404).json({ error: 'مکالمه یافت نشد' });
        res.json(conversation);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id/messages', async (req, res) => {
    try {
        const messages = await Message.findAll({
            where: { conversationId: req.params.id },
            order: [['timestamp', 'ASC']]
        });
        res.json({ data: messages });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ارسال پیام از داشبورد و ارسال به واتساپ
router.post('/:id/send', async (req, res) => {
    try {
        const conversation = await Conversation.findByPk(req.params.id, { include: [{ model: Customer, as: 'customer' }] });
        if (!conversation) return res.status(404).json({ error: 'مکالمه یافت نشد' });
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

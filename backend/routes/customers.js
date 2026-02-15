const express = require('express');
const router = express.Router();
const { Customer, Conversation, Message } = require('../models');

router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const { rows, count } = await Customer.findAndCountAll({
            order: [['lastContactAt', 'DESC']],
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
        const customer = await Customer.findByPk(req.params.id);
        if (!customer) return res.status(404).json({ error: 'مشتری یافت نشد' });
        res.json(customer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id/conversations', async (req, res) => {
    try {
        const conversations = await Conversation.findAll({
            where: { customerId: req.params.id },
            order: [['lastMessageAt', 'DESC']]
        });
        const withCount = await Promise.all(conversations.map(async (c) => {
            const count = await Message.count({ where: { conversationId: c.id } });
            return { id: c.id, status: c.status, lastMessageAt: c.lastMessageAt, messageCount: count, createdAt: c.createdAt };
        }));
        res.json({ data: withCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const customer = await Customer.create(req.body);
        res.status(201).json(customer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const customer = await Customer.findByPk(req.params.id);
        if (!customer) return res.status(404).json({ error: 'مشتری یافت نشد' });
        await customer.update(req.body);
        res.json(customer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { Message, Conversation, Customer } = require('../models');

router.post('/:conversationId', async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { content, type = 'text' } = req.body;
        const conversation = await Conversation.findByPk(conversationId, { include: [{ model: Customer, as: 'customer' }] });
        if (!conversation) return res.status(404).json({ error: 'مکالمه یافت نشد' });
        const msg = await Message.create({
            conversationId,
            customerId: conversation.customerId,
            direction: 'outgoing',
            content: content || '',
            type
        });
        res.json(msg);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

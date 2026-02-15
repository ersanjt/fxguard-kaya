const express = require('express');
const router = express.Router();
const { Conversation, Message } = require('../models');
const { Op } = require('sequelize');

router.get('/dashboard', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const openCount = await Conversation.count({ where: { status: 'open' } });
        const todayMessages = await Message.count({
            where: { timestamp: { [Op.gte]: today } }
        });
        res.json({
            openConversations: openCount,
            todayMessages,
            totalConversations: await Conversation.count()
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { InternalThread, InternalMessage, InternalThreadParticipant, User } = require('../models');
const { Op } = require('sequelize');

// لیست تردهای چت داخلی من
router.get('/threads', async (req, res) => {
    try {
        const threads = await InternalThreadParticipant.findAll({
            where: { userId: req.userId },
            include: [
                { model: InternalThread, as: 'thread', include: [
                    { model: InternalMessage, as: 'messages', limit: 1, order: [['createdAt', 'DESC']], include: [{ model: User, as: 'fromUser', attributes: ['id', 'name'] }] },
                    { model: User, as: 'participants', attributes: ['id', 'name', 'email'], through: { attributes: [] } }
                ]}
            ]
        });
        const list = threads.map(t => {
            const th = t.thread;
            if (!th) return null;
            const others = (th.participants || []).filter(p => p.id !== req.userId);
            const lastMsg = (th.messages && th.messages[0]) ? th.messages[0] : null;
            return {
                id: th.id,
                lastMessageAt: th.lastMessageAt,
                lastMessage: lastMsg ? { content: lastMsg.content, fromUser: lastMsg.fromUser } : null,
                participants: others
            };
        }).filter(Boolean);
        list.sort((a, b) => (new Date(b.lastMessageAt || 0)) - (new Date(a.lastMessageAt || 0)));
        res.json({ data: list });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ایجاد ترد با یک یا چند کاربر (یا باز کردن ترد موجود)
router.post('/threads', async (req, res) => {
    try {
        const userIds = req.body.userIds || (req.body.userId ? [req.body.userId] : []);
        if (!userIds.length) return res.status(400).json({ error: 'حداقل یک کاربر لازم است' });
        const me = req.userId;
        const sorted = [...new Set([me, ...userIds].map(String))].sort();
        const participants = await InternalThreadParticipant.findAll({
            where: { userId: me },
            include: [{ model: InternalThread, as: 'thread' }]
        });
        for (const p of participants) {
            const thread = p.thread;
            const otherParts = await InternalThreadParticipant.findAll({ where: { threadId: thread.id } });
            const otherIds = otherParts.map(o => String(o.userId)).filter(id => id !== String(me)).sort();
            const targetIds = [...new Set(userIds.map(String))].sort();
            if (otherIds.length === targetIds.length && otherIds.every((id, i) => id === targetIds[i])) {
                const withParticipants = await InternalThread.findByPk(thread.id, { include: [{ model: User, as: 'participants', attributes: ['id', 'name', 'email'], through: { attributes: [] } }] });
                return res.status(201).json(withParticipants);
            }
        }
        const thread = await InternalThread.create({});
        await InternalThreadParticipant.bulkCreate([me, ...userIds].map(uid => ({ threadId: thread.id, userId: uid })));
        const withParticipants = await InternalThread.findByPk(thread.id, { include: [{ model: User, as: 'participants', attributes: ['id', 'name', 'email'], through: { attributes: [] } }] });
        res.status(201).json(withParticipants);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// پیام‌های یک ترد
router.get('/threads/:id/messages', async (req, res) => {
    try {
        const part = await InternalThreadParticipant.findOne({ where: { threadId: req.params.id, userId: req.userId } });
        if (!part) return res.status(403).json({ error: 'دسترسی به این گفتگو ندارید' });
        const messages = await InternalMessage.findAll({
            where: { threadId: req.params.id },
            include: [{ model: User, as: 'fromUser', attributes: ['id', 'name', 'email'] }],
            order: [['createdAt', 'ASC']]
        });
        res.json({ data: messages });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ارسال پیام در ترد
router.post('/threads/:id/messages', async (req, res) => {
    try {
        const part = await InternalThreadParticipant.findOne({ where: { threadId: req.params.id, userId: req.userId } });
        if (!part) return res.status(403).json({ error: 'دسترسی به این گفتگو ندارید' });
        const content = (req.body.content || '').trim();
        const attachments = Array.isArray(req.body.attachments) ? req.body.attachments : (req.body.attachments ? [req.body.attachments] : []);
        if (!content && attachments.length === 0) return res.status(400).json({ error: 'متن پیام یا حداقل یک پیوست الزامی است' });
        const msg = await InternalMessage.create({
            threadId: req.params.id,
            fromUserId: req.userId,
            content: content || '(پیوست)',
            attachments: attachments.map(a => typeof a === 'object' && a.url ? { name: a.name || a.url, url: a.url, size: a.size } : null).filter(Boolean)
        });
        await InternalThread.update({ lastMessageAt: new Date() }, { where: { id: req.params.id } });
        const withUser = await InternalMessage.findByPk(msg.id, { include: [{ model: User, as: 'fromUser', attributes: ['id', 'name', 'email'] }] });
        res.status(201).json(withUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// لیست کاربران برای شروع چت (همه به‌جز خودم؛ محدود به شعبه برای غیرمالک)
router.get('/users', async (req, res) => {
    try {
        const where = { isActive: true, id: { [Op.ne]: req.userId } };
        if (!require('../lib/permissions').isMainAdmin(req.user) && req.user.role !== 'owner' && req.user.role !== 'admin' && req.user.branchId) where.branchId = req.user.branchId;
        const users = await User.findAll({
            where,
            attributes: ['id', 'name', 'email'],
            order: [['name', 'ASC']]
        });
        res.json({ data: users });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

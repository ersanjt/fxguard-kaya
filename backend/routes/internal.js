const express = require('express');
const { InternalThread, InternalMessage, InternalThreadParticipant, User } = require('../models');
const { Op } = require('sequelize');
const { isValidUUID, safeString } = require('../lib/validation');
const { logActivity } = require('../services/activityLog');

function createInternalRouter(io) {
const router = express.Router();

// لیست تردهای چت داخلی من
router.get('/threads', async (req, res, next) => {
    try {
        const threads = await InternalThreadParticipant.findAll({
            where: { userId: req.userId },
            include: [
                { model: InternalThread, as: 'thread', include: [
                    { model: InternalMessage, as: 'messages', limit: 1, order: [['createdAt', 'DESC']], include: [{ model: User, as: 'fromUser', attributes: ['id', 'name', 'avatar'] }] },
                    { model: User, as: 'participants', attributes: ['id', 'name', 'email', 'avatar'], through: { attributes: [] } }
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
        next(err);
    }
});

// ایجاد ترد با یک یا چند کاربر (یا باز کردن ترد موجود)
router.post('/threads', async (req, res, next) => {
    try {
        const userIds = req.body.userIds || (req.body.userId ? [req.body.userId] : []);
        if (!userIds.length) return res.status(400).json({ error: 'حداقل یک کاربر لازم است' });
        const me = req.userId;
        const targetIds = [...new Set(userIds.map(String))].sort();
        // Fetch all threads the current user participates in, with ALL their participants in one query (no N+1)
        const myThreads = await InternalThreadParticipant.findAll({
            where: { userId: me },
            include: [{
                model: InternalThread, as: 'thread',
                include: [{ model: InternalThreadParticipant, as: 'threadParticipants', attributes: ['userId'] }]
            }]
        });
        for (const p of myThreads) {
            const thread = p.thread;
            if (!thread) continue;
            const allParts = (thread.threadParticipants || []).map(tp => String(tp.userId));
            const otherIds = allParts.filter(id => id !== String(me)).sort();
            if (otherIds.length === targetIds.length && otherIds.every((id, i) => id === targetIds[i])) {
                const withParticipants = await InternalThread.findByPk(thread.id, { include: [{ model: User, as: 'participants', attributes: ['id', 'name', 'email', 'avatar'], through: { attributes: [] } }] });
                return res.status(201).json(withParticipants);
            }
        }
        const thread = await InternalThread.create({});
        await InternalThreadParticipant.bulkCreate([me, ...userIds].map(uid => ({ threadId: thread.id, userId: uid })));
        const withParticipants = await InternalThread.findByPk(thread.id, { include: [{ model: User, as: 'participants', attributes: ['id', 'name', 'email', 'avatar'], through: { attributes: [] } }] });
        logActivity({
            userId: me,
            action: 'internal_thread_created',
            entityType: 'internal_thread',
            entityId: thread.id,
            summary: `گفتگوی داخلی جدید با ${userIds.length} کاربر ایجاد شد`,
            metadata: { participantIds: userIds }
        }).catch(() => {});
        res.status(201).json(withParticipants);
    } catch (err) {
        next(err);
    }
});

// پیام‌های یک ترد
router.get('/threads/:id/messages', async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه ترد نامعتبر است' });
    try {
        const part = await InternalThreadParticipant.findOne({ where: { threadId: req.params.id, userId: req.userId } });
        if (!part) return res.status(403).json({ error: 'دسترسی به این گفتگو ندارید' });
        const messages = await InternalMessage.findAll({
            where: { threadId: req.params.id },
            include: [{ model: User, as: 'fromUser', attributes: ['id', 'name', 'email', 'avatar'] }],
            order: [['createdAt', 'ASC']]
        });
        res.json({ data: messages });
    } catch (err) {
        next(err);
    }
});

// ارسال پیام در ترد
router.post('/threads/:id/messages', async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه ترد نامعتبر است' });
    try {
        const part = await InternalThreadParticipant.findOne({ where: { threadId: req.params.id, userId: req.userId } });
        if (!part) return res.status(403).json({ error: 'دسترسی به این گفتگو ندارید' });
        const content = safeString(req.body.content, 5000);
        const attachments = Array.isArray(req.body.attachments) ? req.body.attachments : (req.body.attachments ? [req.body.attachments] : []);
        if (!content && attachments.length === 0) return res.status(400).json({ error: 'متن پیام یا حداقل یک پیوست الزامی است' });
        const msg = await InternalMessage.create({
            threadId: req.params.id,
            fromUserId: req.userId,
            content: content || '(پیوست)',
            attachments: attachments.map(a => typeof a === 'object' && a.url ? { name: a.name || a.url, url: a.url, size: a.size, allowDownload: a.allowDownload !== false } : null).filter(Boolean)
        });
        await InternalThread.update({ lastMessageAt: new Date() }, { where: { id: req.params.id } });
        const withUser = await InternalMessage.findByPk(msg.id, { include: [{ model: User, as: 'fromUser', attributes: ['id', 'name', 'email', 'avatar'] }] });
        if (io) {
            const participants = await InternalThreadParticipant.findAll({ where: { threadId: req.params.id }, attributes: ['userId'] });
            const recipientIds = participants.map(p => p.userId).filter(id => String(id) !== String(req.userId));
            recipientIds.forEach(uid => io.to(`user_${uid}`).emit('internal_message', {
                threadId: req.params.id,
                message: withUser,
                fromUser: withUser.fromUser
            }));
        }
        logActivity({
            userId: req.userId,
            action: 'internal_message_sent',
            entityType: 'internal_thread',
            entityId: req.params.id,
            summary: `پیام داخلی ارسال شد`,
            metadata: { messageId: msg.id, contentLength: content.length, hasAttachments: attachments.length > 0 }
        }).catch(() => {});
        res.status(201).json(withUser);
    } catch (err) {
        next(err);
    }
});

// لیست کاربران برای شروع چت (همه به‌جز خودم؛ محدود به شعبه برای غیرمالک)
router.get('/users', async (req, res, next) => {
    try {
        const where = { isActive: true, id: { [Op.ne]: req.userId } };
        if (!require('../lib/permissions').isMainAdmin(req.user) && req.user.role !== 'owner' && req.user.role !== 'admin' && req.user.branchId) where.branchId = req.user.branchId;
        const users = await User.findAll({
            where,
            attributes: ['id', 'name', 'email', 'avatar'],
            order: [['name', 'ASC']]
        });
        res.json({ data: users });
    } catch (err) {
        next(err);
    }
});

return router;
}

module.exports = createInternalRouter;

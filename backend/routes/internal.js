const express = require('express');
const { InternalThread, InternalMessage, InternalThreadParticipant, User } = require('../models');
const { Op } = require('sequelize');
const { isValidUUID, safeString } = require('../lib/validation');
const { logActivity } = require('../services/activityLog');
const { isPresenceFresh, getConnectedUserIds } = require('../lib/staffPresence');

const USER_PUBLIC_ATTRS = ['id', 'name', 'email', 'avatar', 'status', 'lastLoginAt', 'lastSeenAt'];

function toPlainUser(p) {
    if (!p) return null;
    return typeof p.toJSON === 'function' ? p.toJSON() : { ...p };
}

function decoratePresence(user, connectedIds) {
    const plain = toPlainUser(user);
    if (!plain) return null;
    const id = String(plain.id);
    const connected = !!(connectedIds && connectedIds.has(id));
    const fresh = isPresenceFresh(plain.lastSeenAt);
    if (connected && (!plain.status || plain.status === 'offline')) {
        plain.status = 'online';
    } else if (!connected && !fresh) {
        plain.status = 'offline';
    }
    return plain;
}

function serializeThread(th, me, unreadCount, connectedIds) {
    if (!th) return null;
    const others = (th.participants || [])
        .map((p) => decoratePresence(p, connectedIds))
        .filter((p) => p && String(p.id) !== String(me));
    const lastMsg = (th.messages && th.messages[0]) ? th.messages[0] : null;
    const type = th.type === 'group' || others.length > 1 || !!th.name ? 'group' : 'dm';
    const displayName = th.name
        || (others.map((p) => p.name || p.email || '').filter(Boolean).join(', '))
        || 'Chat';
    return {
        id: th.id,
        name: th.name || null,
        type,
        isGroup: type === 'group',
        displayName,
        createdById: th.createdById || null,
        lastMessageAt: th.lastMessageAt,
        unreadCount: unreadCount || 0,
        lastMessage: lastMsg ? {
            content: lastMsg.content,
            fromUser: lastMsg.fromUser,
            createdAt: lastMsg.createdAt,
            attachments: Array.isArray(lastMsg.attachments)
                ? lastMsg.attachments.map((a) => ({ name: a && a.name, url: a && a.url }))
                : []
        } : null,
        participants: others
    };
}

function emitThreadUpdated(io, threadId, action, name, userIds, exceptUserId) {
    if (!io || !userIds || !userIds.length) return;
    userIds.forEach((uid) => {
        if (exceptUserId && String(uid) === String(exceptUserId)) return;
        io.to(`user_${uid}`).emit('internal_thread_updated', {
            threadId,
            action,
            name: name || null
        });
    });
}

async function assertParticipant(threadId, userId) {
    return InternalThreadParticipant.findOne({ where: { threadId, userId } });
}

async function countUnread(threadId, userId, lastReadAt) {
    const where = {
        threadId,
        fromUserId: { [Op.ne]: userId }
    };
    if (lastReadAt) where.createdAt = { [Op.gt]: lastReadAt };
    return InternalMessage.count({ where });
}

function createInternalRouter(io) {
    const router = express.Router();

    // لیست تردهای چت داخلی من
    router.get('/threads', async (req, res, next) => {
        try {
            const connectedIds = getConnectedUserIds(io);
            const threads = await InternalThreadParticipant.findAll({
                where: { userId: req.userId },
                include: [
                    {
                        model: InternalThread,
                        as: 'thread',
                        include: [
                            {
                                model: InternalMessage,
                                as: 'messages',
                                separate: true,
                                limit: 1,
                                order: [['createdAt', 'DESC']],
                                include: [{ model: User, as: 'fromUser', attributes: ['id', 'name', 'avatar'] }]
                            },
                            {
                                model: User,
                                as: 'participants',
                                attributes: USER_PUBLIC_ATTRS,
                                through: { attributes: [] }
                            }
                        ]
                    }
                ]
            });
            const list = [];
            for (const t of threads) {
                const th = t.thread;
                if (!th) continue;
                const unreadCount = await countUnread(th.id, req.userId, t.lastReadAt);
                list.push(serializeThread(th, req.userId, unreadCount, connectedIds));
            }
            list.sort((a, b) => (new Date(b.lastMessageAt || 0)) - (new Date(a.lastMessageAt || 0)));
            const totalUnread = list.reduce((s, x) => s + (x.unreadCount || 0), 0);
            res.json({ data: list, totalUnread });
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
            const targetIds = [...new Set(userIds.map(String).filter((id) => id && id !== String(me) && isValidUUID(id)))].sort();
            if (!targetIds.length) return res.status(400).json({ error: 'حداقل یک کاربر دیگر لازم است' });

            const foundUsers = await User.findAll({
                where: { id: { [Op.in]: targetIds }, isActive: true },
                attributes: ['id']
            });
            if (foundUsers.length !== targetIds.length) {
                return res.status(400).json({ error: 'یک یا چند کاربر نامعتبر است' });
            }

            const groupName = safeString(req.body.name, 120) || null;
            const wantGroup = !!groupName || targetIds.length > 1 || req.body.type === 'group';
            const connectedIds = getConnectedUserIds(io);

            // DM بدون نام: همان مجموعهٔ افراد → همان ترد
            if (!groupName && targetIds.length === 1) {
                const myThreads = await InternalThreadParticipant.findAll({
                    where: { userId: me },
                    include: [{
                        model: InternalThread,
                        as: 'thread',
                        include: [{ model: InternalThreadParticipant, as: 'threadParticipants', attributes: ['userId'] }]
                    }]
                });
                for (const p of myThreads) {
                    const thread = p.thread;
                    if (!thread || thread.name || thread.type === 'group') continue;
                    const allParts = (thread.threadParticipants || []).map((tp) => String(tp.userId));
                    const otherIds = allParts.filter((id) => id !== String(me)).sort();
                    if (otherIds.length === targetIds.length && otherIds.every((id, i) => id === targetIds[i])) {
                        const withParticipants = await InternalThread.findByPk(thread.id, {
                            include: [{ model: User, as: 'participants', attributes: USER_PUBLIC_ATTRS, through: { attributes: [] } }]
                        });
                        return res.json(serializeThread(withParticipants, me, 0, connectedIds));
                    }
                }
            }

            const thread = await InternalThread.create({
                name: groupName,
                type: wantGroup ? 'group' : 'dm',
                createdById: me
            });
            await InternalThreadParticipant.bulkCreate(
                [me, ...targetIds].map((uid) => ({ threadId: thread.id, userId: uid, lastReadAt: new Date() }))
            );
            const withParticipants = await InternalThread.findByPk(thread.id, {
                include: [{ model: User, as: 'participants', attributes: USER_PUBLIC_ATTRS, through: { attributes: [] } }]
            });
            logActivity({
                userId: me,
                action: 'internal_thread_created',
                entityType: 'internal_thread',
                entityId: thread.id,
                summary: wantGroup
                    ? `گروه داخلی «${groupName || 'بدون نام'}» با ${targetIds.length} عضو ایجاد شد`
                    : `گفتگوی داخلی جدید با ${targetIds.length} کاربر ایجاد شد`,
                metadata: { participantIds: targetIds, type: wantGroup ? 'group' : 'dm', name: groupName }
            }).catch(() => {});

            emitThreadUpdated(io, thread.id, 'created', groupName, targetIds, me);

            res.status(201).json(serializeThread(withParticipants, me, 0, connectedIds));
        } catch (err) {
            next(err);
        }
    });

    // تغییر نام گروه
    router.patch('/threads/:id', async (req, res, next) => {
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه ترد نامعتبر است' });
        try {
            const part = await assertParticipant(req.params.id, req.userId);
            if (!part) return res.status(403).json({ error: 'دسترسی به این گفتگو ندارید' });
            const name = safeString(req.body.name, 120);
            if (!name) return res.status(400).json({ error: 'نام گروه الزامی است' });
            await InternalThread.update(
                { name, type: 'group' },
                { where: { id: req.params.id } }
            );
            const withParticipants = await InternalThread.findByPk(req.params.id, {
                include: [{ model: User, as: 'participants', attributes: USER_PUBLIC_ATTRS, through: { attributes: [] } }]
            });
            if (io) {
                const parts = await InternalThreadParticipant.findAll({
                    where: { threadId: req.params.id },
                    attributes: ['userId']
                });
                emitThreadUpdated(io, req.params.id, 'renamed', name, parts.map((p) => p.userId), req.userId);
            }
            res.json(serializeThread(withParticipants, req.userId, 0, getConnectedUserIds(io)));
        } catch (err) {
            next(err);
        }
    });

    // افزودن عضو به گروه
    router.post('/threads/:id/participants', async (req, res, next) => {
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه ترد نامعتبر است' });
        try {
            const part = await assertParticipant(req.params.id, req.userId);
            if (!part) return res.status(403).json({ error: 'دسترسی به این گفتگو ندارید' });
            const thread = await InternalThread.findByPk(req.params.id);
            if (!thread) return res.status(404).json({ error: 'گفتگو یافت نشد' });
            const userIds = (req.body.userIds || (req.body.userId ? [req.body.userId] : []))
                .map(String)
                .filter((id) => id && id !== String(req.userId) && isValidUUID(id));
            if (!userIds.length) return res.status(400).json({ error: 'حداقل یک کاربر لازم است' });

            const existing = await InternalThreadParticipant.findAll({
                where: { threadId: req.params.id },
                attributes: ['userId']
            });
            const existingSet = new Set(existing.map((e) => String(e.userId)));
            const toAdd = [...new Set(userIds)].filter((id) => !existingSet.has(id));
            if (toAdd.length) {
                await InternalThreadParticipant.bulkCreate(
                    toAdd.map((uid) => ({ threadId: req.params.id, userId: uid, lastReadAt: new Date() }))
                );
                await thread.update({ type: 'group' });
            }
            const withParticipants = await InternalThread.findByPk(req.params.id, {
                include: [{ model: User, as: 'participants', attributes: USER_PUBLIC_ATTRS, through: { attributes: [] } }]
            });
            emitThreadUpdated(io, req.params.id, 'added', thread.name, toAdd, req.userId);
            res.json(serializeThread(withParticipants, req.userId, 0, getConnectedUserIds(io)));
        } catch (err) {
            next(err);
        }
    });

    // ترک / حذف عضو
    router.delete('/threads/:id/participants/:userId', async (req, res, next) => {
        if (!isValidUUID(req.params.id) || !isValidUUID(req.params.userId)) {
            return res.status(400).json({ error: 'شناسه نامعتبر است' });
        }
        try {
            const mePart = await assertParticipant(req.params.id, req.userId);
            if (!mePart) return res.status(403).json({ error: 'دسترسی به این گفتگو ندارید' });
            const targetId = String(req.params.userId);
            // فقط خودتان یا سازنده می‌تواند حذف کند
            const thread = await InternalThread.findByPk(req.params.id);
            if (targetId !== String(req.userId) && String(thread.createdById) !== String(req.userId)) {
                return res.status(403).json({ error: 'اجازهٔ حذف این عضو را ندارید' });
            }
            await InternalThreadParticipant.destroy({
                where: { threadId: req.params.id, userId: targetId }
            });
            const remaining = await InternalThreadParticipant.findAll({
                where: { threadId: req.params.id },
                attributes: ['userId']
            });
            emitThreadUpdated(io, req.params.id, 'removed', thread && thread.name, remaining.map((p) => p.userId).concat([targetId]), req.userId);
            res.json({ ok: true });
        } catch (err) {
            next(err);
        }
    });

    // علامت‌گذاری خوانده‌شده
    router.post('/threads/:id/read', async (req, res, next) => {
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه ترد نامعتبر است' });
        try {
            const part = await assertParticipant(req.params.id, req.userId);
            if (!part) return res.status(403).json({ error: 'دسترسی به این گفتگو ندارید' });
            await part.update({ lastReadAt: new Date() });
            res.json({ ok: true, lastReadAt: part.lastReadAt });
        } catch (err) {
            next(err);
        }
    });

    // پیام‌های یک ترد
    router.get('/threads/:id/messages', async (req, res, next) => {
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه ترد نامعتبر است' });
        try {
            const part = await assertParticipant(req.params.id, req.userId);
            if (!part) return res.status(403).json({ error: 'دسترسی به این گفتگو ندارید' });
            const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 300));
            const messages = await InternalMessage.findAll({
                where: { threadId: req.params.id },
                include: [{ model: User, as: 'fromUser', attributes: USER_PUBLIC_ATTRS }],
                order: [['createdAt', 'ASC']],
                limit
            });
            await part.update({ lastReadAt: new Date() });
            res.json({ data: messages });
        } catch (err) {
            next(err);
        }
    });

    // ارسال پیام در ترد
    router.post('/threads/:id/messages', async (req, res, next) => {
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه ترد نامعتبر است' });
        try {
            const part = await assertParticipant(req.params.id, req.userId);
            if (!part) return res.status(403).json({ error: 'دسترسی به این گفتگو ندارید' });
            const content = safeString(req.body.content, 5000);
            const attachments = Array.isArray(req.body.attachments)
                ? req.body.attachments
                : (req.body.attachments ? [req.body.attachments] : []);
            if (!content && attachments.length === 0) {
                return res.status(400).json({ error: 'متن پیام یا حداقل یک پیوست الزامی است' });
            }
            const msg = await InternalMessage.create({
                threadId: req.params.id,
                fromUserId: req.userId,
                content: content || '(پیوست)',
                attachments: attachments
                    .map((a) => (typeof a === 'object' && a.url
                        ? { name: a.name || a.url, url: a.url, size: a.size, allowDownload: a.allowDownload !== false }
                        : null))
                    .filter(Boolean)
            });
            await InternalThread.update({ lastMessageAt: new Date() }, { where: { id: req.params.id } });
            await part.update({ lastReadAt: new Date() });
            const withUser = await InternalMessage.findByPk(msg.id, {
                include: [{ model: User, as: 'fromUser', attributes: USER_PUBLIC_ATTRS }]
            });
            if (io) {
                const participants = await InternalThreadParticipant.findAll({
                    where: { threadId: req.params.id },
                    attributes: ['userId']
                });
                const recipientIds = participants.map((p) => p.userId).filter((id) => String(id) !== String(req.userId));
                recipientIds.forEach((uid) => io.to(`user_${uid}`).emit('internal_message', {
                    threadId: req.params.id,
                    message: withUser,
                    fromUser: withUser.fromUser
                }));
                try {
                    const pushNotificationService = require('../services/pushNotificationService');
                    const fromName = (withUser.fromUser && (withUser.fromUser.name || withUser.fromUser.email)) || 'چت داخلی';
                    const preview = String(content || '').trim().slice(0, 180) || (attachments.length ? 'پیوست' : 'پیام جدید');
                    pushNotificationService.notifyInternalMessage({
                        userIds: recipientIds,
                        fromName,
                        preview,
                        threadId: req.params.id
                    }).catch(() => {});
                } catch (_) {}
            }
            logActivity({
                userId: req.userId,
                action: 'internal_message_sent',
                entityType: 'internal_thread',
                entityId: req.params.id,
                summary: 'پیام داخلی ارسال شد',
                metadata: { messageId: msg.id, contentLength: content.length, hasAttachments: attachments.length > 0 }
            }).catch(() => {});
            res.status(201).json(withUser);
        } catch (err) {
            next(err);
        }
    });

    // لیست کاربران برای شروع چت
    router.get('/users', async (req, res, next) => {
        try {
            const where = { isActive: true, id: { [Op.ne]: req.userId } };
            if (
                !require('../lib/permissions').isMainAdmin(req.user)
                && req.user.role !== 'owner'
                && req.user.role !== 'admin'
                && req.user.branchId
            ) {
                where.branchId = req.user.branchId;
            }
            const connectedIds = getConnectedUserIds(io);
            const users = await User.findAll({
                where,
                attributes: USER_PUBLIC_ATTRS,
                order: [['name', 'ASC']]
            });
            res.json({ data: users.map((u) => decoratePresence(u, connectedIds)) });
        } catch (err) {
            next(err);
        }
    });

    return router;
}

module.exports = createInternalRouter;

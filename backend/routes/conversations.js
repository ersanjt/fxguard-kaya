const express = require('express');
const router = express.Router();
const axios = require('axios');
const { sequelize, Conversation, Customer, Message, User, Branch, Department } = require('../models');
const { sendDeptAssignedMessage, maybeSendEmployeeIntro } = require('../services/autoMessages');
const { Op } = require('sequelize');
const { logActivity } = require('../services/activityLog');
const { getAccessibleCustomerIds } = require('../lib/customerAccess');
const { isMainAdmin } = require('../lib/permissions');

/** آیا کاربر جاری به این مکالمه دسترسی دارد؟ (نقش، تخصیص، دپارتمان، شعبه، مشارکت قبلی) */
async function canAccessConversation(req, conversation, accessibleCustomerIds) {
    if (!conversation) return false;
    if (isMainAdmin(req.user)) return true;
    const role = req.user.role;
    if (role === 'owner' || role === 'admin' || role === 'manager') return true;
    if (conversation.assignedTo === req.userId) return true;
    if (req.user.departmentId && conversation.departmentId === req.user.departmentId) return true;
    if (req.user.branchId && conversation.branchId === req.user.branchId) return true;
    if (accessibleCustomerIds && conversation.customerId && accessibleCustomerIds.includes(conversation.customerId)) return true;
    const participated = await Message.findOne({ where: { conversationId: conversation.id, userId: req.userId }, attributes: ['id'] });
    if (participated) return true;
    return false;
}

/** آیا کاربر می‌تواند مکالمه را تخصیص/بست/تغییر وضعیت دهد؟ (ادمین اصلی، owner، admin، manager) */
function canManageConversation(req) {
    return isMainAdmin(req.user) || req.user.role === 'owner' || req.user.role === 'admin' || req.user.role === 'manager';
}

// ——— ایجاد مکالمه جدید (با مشتری)
router.post('/', async (req, res) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        const { customerId } = req.body;
        if (!customerId) return res.status(400).json({ error: 'شناسه مشتری الزامی است' });
        const accessibleCustomerIds = await getAccessibleCustomerIds(req);
        const { canAccessCustomer } = require('../lib/customerAccess');
        if (!(await canAccessCustomer(req, customerId))) return res.status(403).json({ error: 'دسترسی به این مشتری ندارید' });
        const customer = await Customer.findByPk(customerId);
        if (!customer) return res.status(404).json({ error: 'مشتری یافت نشد' });
        let conversation = await Conversation.findOne({
            where: { customerId, status: { [Op.ne]: 'closed' } },
            include: [
                { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'profilePic'] },
                { model: User, as: 'assignee', attributes: ['id', 'name'] },
                { model: Branch, as: 'branch', attributes: ['id', 'name', 'city'], required: false },
                { model: Department, as: 'department', attributes: ['id', 'name', 'color'], required: false }
            ]
        });
        if (!conversation) {
            conversation = await Conversation.create({
                customerId,
                status: 'open',
                priority: 'normal',
                source: 'whatsapp',
                branchId: req.user.branchId || null,
                departmentId: req.user.departmentId || null,
                assignedTo: req.userId,
                assignedAt: new Date()
            });
            conversation = await Conversation.findByPk(conversation.id, {
                include: [
                    { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'profilePic'] },
                    { model: User, as: 'assignee', attributes: ['id', 'name'] },
                    { model: Branch, as: 'branch', attributes: ['id', 'name', 'city'], required: false },
                    { model: Department, as: 'department', attributes: ['id', 'name', 'color'], required: false }
                ]
            });
        }
        res.status(201).json(conversation);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ——— لیست مکالمات (با فیلتر و سیاست دسترسی)
router.get('/', async (req, res) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        const { status, priority, assignedTo, unread, unassigned, unanswered, branchId, departmentId, search, page = 1, limit = 20 } = req.query;
        const where = {};

        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (assignedTo) where.assignedTo = assignedTo;
        if (unassigned === '1' || unassigned === 'true') { where.assignedTo = null; where.departmentId = null; }
        if (unread === '1' || unread === 'true') where.unreadCount = { [Op.gt]: 0 };
        if (branchId) where.branchId = branchId;
        if (departmentId) where.departmentId = departmentId;
        // مکالمات بدون پاسخ: آخرین پیام از مشتری بوده و ما جواب نداده‌ایم (فقط باز/در انتظار)
        if (unanswered === '1' || unanswered === 'true') {
            where[Op.and] = (where[Op.and] || []).concat([
                { status: { [Op.in]: ['open', 'pending'] } },
                { lastIncomingMessageAt: { [Op.ne]: null } },
                { [Op.or]: [
                    { lastOutgoingMessageAt: null },
                    sequelize.where(sequelize.col('lastIncomingMessageAt'), Op.gt, sequelize.col('lastOutgoingMessageAt'))
                ] }
            ]);
        }

        // کارمند/ناظر فقط مکالمات تخصیص‌یافته به خود یا دپارتمانش را می‌بیند (نه همه بدون تخصیص)
        if (!isMainAdmin(req.user) && req.user.role !== 'owner' && req.user.role !== 'admin' && req.user.role !== 'manager') {
            const orConditions = [{ assignedTo: req.userId }];
            if (req.user.departmentId) orConditions.push({ departmentId: req.user.departmentId });
            if (req.user.branchId) orConditions.push({ branchId: req.user.branchId });
            where[Op.or] = orConditions;
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

// ——— پیام‌های مکالمه (شامل کاربر ارسال‌کننده برای پیام‌های خروجی)
router.get('/:id/messages', async (req, res) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        const conversation = await Conversation.findByPk(req.params.id);
        if (!conversation) return res.status(404).json({ error: 'مکالمه یافت نشد' });
        const accessibleCustomerIds = await getAccessibleCustomerIds(req);
        if (!(await canAccessConversation(req, conversation, accessibleCustomerIds))) return res.status(403).json({ error: 'دسترسی به این مکالمه ندارید' });
        const messages = await Message.findAll({
            where: { conversationId: req.params.id },
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'username'], required: false }],
            order: [['timestamp', 'ASC']]
        });
        res.json({ data: messages });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ——— آمار مکالمه برای نظارت مدیر (زمان اولین پاسخ، پاسخ‌دهندگان، خوانده‌شدن)
router.get('/:id/stats', async (req, res) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        const conversation = await Conversation.findByPk(req.params.id);
        if (!conversation) return res.status(404).json({ error: 'مکالمه یافت نشد' });
        const accessibleCustomerIds = await getAccessibleCustomerIds(req);
        if (!(await canAccessConversation(req, conversation, accessibleCustomerIds))) return res.status(403).json({ error: 'دسترسی به این مکالمه ندارید' });
        const messages = await Message.findAll({
            where: { conversationId: req.params.id },
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'username'], required: false }],
            order: [['timestamp', 'ASC']]
        });
        let firstResponseTimeMin = null;
        let firstIncomingAt = null;
        let firstOutgoingAfterIncoming = null;
        const responders = [];
        const responderIds = new Set();
        for (const m of messages) {
            const ts = m.timestamp ? new Date(m.timestamp) : null;
            if (m.direction === 'incoming' && ts) {
                if (!firstIncomingAt || ts < firstIncomingAt) firstIncomingAt = ts;
            }
            if (m.direction === 'outgoing' && ts) {
                const name = (m.user && (m.user.name || m.user.username)) || null;
                if (m.userId && !responderIds.has(m.userId)) {
                    responderIds.add(m.userId);
                    responders.push({ id: m.userId, name: name || '—' });
                }
                if (firstIncomingAt && ts >= firstIncomingAt && (!firstOutgoingAfterIncoming || ts < firstOutgoingAfterIncoming)) {
                    firstOutgoingAfterIncoming = ts;
                }
            }
        }
        if (firstIncomingAt && firstOutgoingAfterIncoming) {
            firstResponseTimeMin = Math.round((firstOutgoingAfterIncoming - firstIncomingAt) / 60000);
        }
        res.json({
            firstResponseTimeMin,
            firstIncomingAt: firstIncomingAt ? firstIncomingAt.toISOString() : null,
            firstOutgoingAt: firstOutgoingAfterIncoming ? firstOutgoingAfterIncoming.toISOString() : null,
            responders,
            messageCount: messages.length,
            outgoingCount: messages.filter(m => m.direction === 'outgoing').length,
            unreadCount: conversation.unreadCount || 0
        });
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

        const updateData = {};
        const canManage = canManageConversation(req);
        const canAssignSelf = !canManage && assignedTo === req.userId;
        if (assignedTo !== undefined) {
            if (canManage || canAssignSelf) {
                updateData.assignedTo = canAssignSelf ? req.userId : (assignedTo || null);
                updateData.assignedAt = updateData.assignedTo ? new Date() : null;
            }
        }
        if (!canManage && Object.keys(updateData).length === 0 && (departmentId !== undefined || branchId !== undefined || status !== undefined || priority !== undefined || subject !== undefined)) {
            return res.status(403).json({ error: 'فقط مدیر یا ادمین می‌تواند تخصیص و وضعیت مکالمه را تغییر دهد' });
        }
        if (!canManage && (departmentId !== undefined || branchId !== undefined || status !== undefined || priority !== undefined || subject !== undefined)) {
            return res.status(403).json({ error: 'فقط مدیر یا ادمین می‌تواند وضعیت و اولویت را تغییر دهد' });
        }
        if (canManage && departmentId !== undefined) updateData.departmentId = departmentId || null;
        if (canManage && branchId !== undefined && (isMainAdmin(req.user) || req.user.role === 'owner' || req.user.role === 'admin' || req.user.role === 'manager')) updateData.branchId = branchId || null;
        if (canManage && status !== undefined) {
            updateData.status = status;
            if (status === 'closed' || status === 'resolved') {
                updateData.closedAt = new Date();
                updateData.closedBy = req.userId;
            }
        }
        if (canManage && priority !== undefined) updateData.priority = priority;
        if (canManage && subject !== undefined) updateData.subject = subject;

        await conversation.update(updateData);

        if (assignedTo !== undefined && updateData.assignedTo) {
            await logActivity({
                userId: req.userId,
                branchId: conversation.branchId || req.user.branchId,
                departmentId: updateData.departmentId || conversation.departmentId || req.user.departmentId,
                action: 'conversation_assigned',
                entityType: 'conversation',
                entityId: conversation.id,
                customerId: conversation.customerId,
                summary: `مکالمه به کاربر تخصیص داده شد`,
                metadata: { conversationId: conversation.id, assignedTo: updateData.assignedTo, customerPhone: conversation.customer && conversation.customer.phone }
            });
        }
        if (departmentId !== undefined && updateData.departmentId !== undefined) {
            if (updateData.departmentId) {
                const dept = await Department.findByPk(updateData.departmentId);
                const convForDept = await Conversation.findByPk(req.params.id, { include: [{ model: Department, as: 'department' }] });
                if (convForDept && dept) await sendDeptAssignedMessage(convForDept, dept);
            }
            await logActivity({
                userId: req.userId,
                branchId: conversation.branchId || req.user.branchId,
                departmentId: updateData.departmentId || req.user.departmentId,
                action: 'conversation_department_changed',
                entityType: 'conversation',
                entityId: conversation.id,
                customerId: conversation.customerId,
                summary: `دپارتمان مکالمه تغییر کرد`,
                metadata: { conversationId: conversation.id, departmentId: updateData.departmentId, customerPhone: conversation.customer && conversation.customer.phone }
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

// ——— ارسال پیام (متن یا فایل/عکس)
router.post('/:id/send', async (req, res) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        const conversation = await Conversation.findByPk(req.params.id, { include: [{ model: Customer, as: 'customer' }, { model: Department, as: 'department', required: false }] });
        if (!conversation) return res.status(404).json({ error: 'مکالمه یافت نشد' });
        const accessibleCustomerIds = await getAccessibleCustomerIds(req);
        if (!(await canAccessConversation(req, conversation, accessibleCustomerIds))) return res.status(403).json({ error: 'دسترسی به این مکالمه ندارید' });
        const content = (req.body.content || '').trim();
        const media = req.body.media || null;
        if (!content && !media) return res.status(400).json({ error: 'متن پیام یا فایل الزامی است' });
        // معرفی کارمند قبل از اولین پاسخ او
        if (req.userId) {
            const user = await User.findByPk(req.userId, { include: [{ model: Department, as: 'department', required: false }] });
            const dept = conversation.department || (user && user.department) || null;
            await maybeSendEmployeeIntro(conversation, req.userId, user, dept);
        }
        const proto = req.get('x-forwarded-proto') || req.protocol;
        const host = req.get('host') || '';
        const baseUrl = process.env.BACKEND_PUBLIC_URL || (proto + '://' + host);
        let mediaUrl = null;
        let msgType = req.body.type || 'text';
        let hasMedia = false;
        let mediaData = null;
        if (media && (media.url || media.filename)) {
            hasMedia = true;
            const relPath = media.url || ('/uploads/' + media.filename);
            if (relPath.startsWith('http')) {
                mediaUrl = relPath;
            } else {
                const root = (process.env.BACKEND_PUBLIC_URL && process.env.BACKEND_PUBLIC_URL.replace(/\/$/, '')) || baseUrl.replace(/\/$/, '');
                mediaUrl = root + (relPath.startsWith('/') ? relPath : '/' + relPath);
            }
            const mime = media.mimetype || '';
            if (mime.startsWith('image/')) msgType = 'image';
            else if (mime.startsWith('video/')) msgType = 'video';
            else if (mime.startsWith('audio/')) msgType = 'audio';
            else msgType = 'document';
            mediaData = { url: relPath, filename: media.filename || media.name, mimetype: media.mimetype };
        }
        const msg = await Message.create({
            conversationId: conversation.id,
            customerId: conversation.customerId,
            userId: req.userId,
            direction: 'outgoing',
            content: content || (hasMedia ? (media.filename || media.name || '') : ''),
            type: msgType,
            hasMedia,
            mediaData,
            timestamp: new Date()
        });
        var preview = (content || '').slice(0, 120) || (hasMedia ? '📎 فایل' : '');
        if ((content || '').length > 120) preview += '…';
        const now = new Date();
        const updateData = { lastMessageAt: now, lastOutgoingMessageAt: now, lastMessagePreview: preview, unreadCount: 0, unansweredAlertSentAt: null, escalatedAt: null };
        if (!conversation.branchId && req.user.branchId) updateData.branchId = req.user.branchId;
        await conversation.update(updateData);
        const { gatewayPost } = require('../lib/gatewayClient');
        const payload = { to: conversation.customer.phone, message: content };
        if (mediaUrl) {
            payload.media = { url: mediaUrl, mimetype: media.mimetype || '' };
            if (msgType === 'audio') payload.media.sendAsVoice = true;
        }
        await gatewayPost('/api/send-message', payload, { timeout: 10000 }).catch(() => {});
        await logActivity({
            userId: req.userId,
            branchId: req.user.branchId || conversation.branchId,
            departmentId: req.user.departmentId || conversation.departmentId,
            action: 'message_sent',
            entityType: 'message',
            entityId: msg.id,
            customerId: conversation.customerId,
            summary: `پیام به مشتری ${conversation.customer.phone || conversation.customerId}`,
            metadata: { conversationId: conversation.id, contentLength: (content || '').length, hasMedia: !!hasMedia }
        });
        res.json(msg);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { sequelize, Conversation, Customer, Message, User, Branch, Department } = require('../models');
const { sendDeptAssignedMessage, maybeSendEmployeeIntro } = require('../services/autoMessages');
const { Op } = require('sequelize');
const { logActivity } = require('../services/activityLog');
const { getAccessibleCustomerIds } = require('../lib/customerAccess');
const { isMainAdmin } = require('../lib/permissions');

/** آیا کاربر می‌تواند مکالمه را آرشیو یا حذف کند؟ (فقط مالک) */
function canArchiveOrDeleteConversation(req) {
    return req.canManageConversations && req.canManageConversations();
}

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
            where: { customerId, status: { [Op.notIn]: ['closed', 'archived'] } },
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

// ——— همگام‌سازی گروه‌های واتساپ — همه گروه‌ها را در CRM نمایش می‌دهد
router.post('/sync-groups', async (req, res) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        const { gatewayGet, GATEWAY_URL } = require('../lib/gatewayClient');
        let gwRes;
        try {
            gwRes = await gatewayGet('/api/chats/groups', { timeout: 15000 });
        } catch (gwErr) {
            const status = gwErr?.response?.status;
            const msg = gwErr?.message || '';
            if (status === 404 || msg.includes('404')) {
                return res.status(503).json({
                    error: 'مسیر /api/chats/groups در Gateway یافت نشد. احتمالاً GATEWAY_URL در .env اشتباه است (باید آدرس Gateway باشد، نه Backend) یا نسخه Gateway قدیمی است.'
                });
            }
            if (status === 401) {
                return res.status(503).json({ error: 'Gateway: احراز هویت ناموفق. GATEWAY_API_SECRET را در .env بررسی کنید.' });
            }
            if (status === 503 || msg.includes('503') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
                return res.status(503).json({ error: 'Gateway در دسترس نیست. مطمئن شوید Gateway روی پورت صحیح در حال اجراست و GATEWAY_URL=' + (GATEWAY_URL || 'http://localhost:3001') + ' درست است.' });
            }
            throw gwErr;
        }
        const groups = gwRes?.data?.groups || gwRes?.data?.data?.groups || [];
        for (const g of groups) {
            const groupId = (g.id || '').toString().trim();
            if (!groupId) continue;
            const groupName = (g.name || g.subject || g.formattedTitle || '').toString().trim();
            let [customer] = await Customer.findOrCreate({
                where: { phone: groupId },
                defaults: { name: groupName || `گروه ${groupId}`, source: 'whatsapp' }
            });
            if (customer && groupName && String(customer.name || '').trim() !== groupName) {
                await customer.update({ name: groupName });
            }
            let conv = await Conversation.findOne({
                where: { customerId: customer.id, status: { [Op.ne]: 'closed' } }
            });
            if (!conv) {
                await Conversation.create({
                    customerId: customer.id,
                    status: 'open',
                    priority: 'normal',
                    source: 'whatsapp',
                    metadata: { isGroup: true, groupName: groupName || null }
                });
            } else {
                const meta = conv.metadata || {};
                const needsUpdate = !meta.isGroup || (groupName && meta.groupName !== groupName);
                if (needsUpdate) {
                    await conv.update({ metadata: { ...meta, isGroup: true, groupName: groupName || meta.groupName || null } });
                }
            }
        }
        res.json({ ok: true, groupsCount: groups.length, message: `${groups.length} گروه همگام شد` });
    } catch (err) {
        res.status(500).json({ error: err.message || 'خطا در همگام‌سازی گروه‌ها' });
    }
});

// ——— لیست مکالمات (با فیلتر و سیاست دسترسی)
router.get('/', async (req, res) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        const { status, priority, assignedTo, unread, unassigned, unanswered, branchId, departmentId, search, archived, isGroup, page = 1, limit = 20 } = req.query;
        const where = {};

        const canViewArchived = req.canViewArchivedConversations && req.canViewArchivedConversations();
        if (status === 'archived' || archived === '1' || archived === 'true') {
            if (!canViewArchived) return res.status(403).json({ error: 'فقط مالک، ادمین و مدیر می‌توانند مکالمات آرشیو شده را ببینند' });
            where.status = 'archived';
        } else if (status) {
            where.status = status;
        } else if (!canViewArchived) {
            where.status = { [Op.ne]: 'archived' };
        }
        if (priority) where.priority = priority;
        if (assignedTo) where.assignedTo = assignedTo;
        if (unassigned === '1' || unassigned === 'true') { where.assignedTo = null; where.departmentId = null; }
        if (unread === '1' || unread === 'true') where.unreadCount = { [Op.gt]: 0 };
        if (isGroup === '1' || isGroup === 'true') {
            const dialect = sequelize.getDialect();
            const tbl = Conversation.tableName || 'Conversations';
            const subq = dialect === 'postgres'
                ? `(SELECT id FROM "${tbl}" WHERE (metadata->>'isGroup')::text = 'true')`
                : `(SELECT id FROM "${tbl}" WHERE (json_extract(metadata, '$.isGroup') = 1 OR json_extract(metadata, '$.isGroup') = 'true'))`;
            where[Op.and] = (where[Op.and] || []).concat([
                sequelize.where(sequelize.col('Conversation.id'), Op.in, sequelize.literal(subq))
            ]);
        }
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

        // کارمند/ناظر: مکالمات تخصیص‌یافته، دپارتمان، شعبه، گروه‌ها، مشارکت قبلی، مشتریان قابل دسترسی
        if (!isMainAdmin(req.user) && req.user.role !== 'owner' && req.user.role !== 'admin' && req.user.role !== 'manager') {
            const orConditions = [{ assignedTo: req.userId }];
            if (req.user.departmentId) orConditions.push({ departmentId: req.user.departmentId });
            if (req.user.branchId) orConditions.push({ branchId: req.user.branchId });
            const dialect = sequelize.getDialect();
            const convTbl = Conversation.tableName || 'Conversations';
            const msgTbl = Message.tableName || 'Messages';
            const groupSubq = dialect === 'postgres'
                ? `(SELECT id FROM "${convTbl}" WHERE (metadata->>'isGroup')::text = 'true')`
                : `(SELECT id FROM "${convTbl}" WHERE (json_extract(metadata, '$.isGroup') = 1 OR json_extract(metadata, '$.isGroup') = 'true'))`;
            orConditions.push(sequelize.where(sequelize.col('Conversation.id'), Op.in, sequelize.literal(groupSubq)));
            // مکالماتی که کاربر در آن‌ها پیام فرستاده (مشارکت قبلی)
            const escapedUserId = sequelize.escape(req.userId);
            orConditions.push(sequelize.where(sequelize.col('Conversation.id'), Op.in, sequelize.literal(`(SELECT "conversationId" FROM "${msgTbl}" WHERE "userId" = ${escapedUserId})`)));
            const accessibleCustomerIds = await getAccessibleCustomerIds(req);
            if (accessibleCustomerIds && accessibleCustomerIds.length > 0) {
                orConditions.push({ customerId: { [Op.in]: accessibleCustomerIds } });
            }
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
        if (conversation.status === 'archived' && !(req.canViewArchivedConversations && req.canViewArchivedConversations())) {
            return res.status(403).json({ error: 'فقط مالک، ادمین و مدیر می‌توانند مکالمات آرشیو شده را ببینند' });
        }
        res.json(conversation);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ——— پیام‌های مکالمه (شامل کاربر ارسال‌کننده برای پیام‌های خروجی)
router.get('/:id/messages', async (req, res) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        const conversation = await Conversation.findByPk(req.params.id, {
            include: [{ model: Customer, as: 'customer', attributes: ['id', 'phone'], required: false }]
        });
        if (!conversation) return res.status(404).json({ error: 'مکالمه یافت نشد' });
        const accessibleCustomerIds = await getAccessibleCustomerIds(req);
        if (!(await canAccessConversation(req, conversation, accessibleCustomerIds))) return res.status(403).json({ error: 'دسترسی به این مکالمه ندارید' });
        if (conversation.status === 'archived' && !(req.canViewArchivedConversations && req.canViewArchivedConversations())) {
            return res.status(403).json({ error: 'فقط مالک، ادمین و مدیر می‌توانند مکالمات آرشیو شده را ببینند' });
        }
        const messages = await Message.findAll({
            where: { conversationId: req.params.id },
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'username'], required: false }],
            order: [['timestamp', 'ASC']]
        });
        // برای چت گروهی: اگر پیام‌هایی senderId دارند ولی senderName ندارند، از Gateway لیست اعضا را بگیر و نام را پر کن
        const meta = conversation.metadata || {};
        const isGroup = meta.isGroup || (conversation.customer && String(conversation.customer.phone || '').includes('@g.us'));
        if (isGroup && conversation.customer && conversation.customer.phone) {
            const needResolve = messages.some(m => m.direction === 'incoming' && m.metadata?.senderId && !m.metadata?.senderName);
            if (needResolve) {
                try {
                    const { gatewayGet } = require('../lib/gatewayClient');
                    const groupId = String(conversation.customer.phone).trim();
                    const gwRes = await gatewayGet('/api/chats/groups/' + encodeURIComponent(groupId) + '/participants', { timeout: 10000 });
                    const participants = (gwRes?.data?.participants || []);
                    const idToName = {};
                    for (const p of participants) {
                        if (p.name && p.id) idToName[String(p.id)] = p.name;
                    }
                    for (const m of messages) {
                        if (m.direction === 'incoming' && m.metadata?.senderId && !m.metadata?.senderName) {
                            const sid = String(m.metadata.senderId);
                            const name = idToName[sid];
                            if (name) m.metadata = { ...m.metadata, senderName: name };
                        }
                    }
                } catch (e) {
                    // Gateway در دسترس نبود یا خطا — بدون تغییر ادامه بده
                }
            }
        }
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
        if (conversation.status === 'archived' && !(req.canViewArchivedConversations && req.canViewArchivedConversations())) {
            return res.status(403).json({ error: 'فقط مالک، ادمین و مدیر می‌توانند مکالمات آرشیو شده را ببینند' });
        }
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

        const { assignedTo, departmentId, branchId, status, priority, subject, markRead, rating, feedback } = req.body;

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
            if (status === 'archived' && !canArchiveOrDeleteConversation(req)) {
                return res.status(403).json({ error: 'فقط مالک مجموعه (بالاترین سطح دسترسی) می‌تواند مکالمه را آرشیو کند' });
            }
            updateData.status = status;
            if (status === 'closed' || status === 'resolved' || status === 'archived') {
                updateData.closedAt = new Date();
                updateData.closedBy = req.userId;
            }
        }
        if (canManage && priority !== undefined) updateData.priority = priority;
        if (canManage && subject !== undefined) updateData.subject = subject;
        if (rating !== undefined && Number(rating) >= 1 && Number(rating) <= 5) updateData.rating = Math.round(Number(rating));
        if (feedback !== undefined) updateData.feedback = String(feedback || '').trim() || null;

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

// ——— حذف مکالمه (فقط مالک)
router.delete('/:id', async (req, res) => {
    try {
        if (!canArchiveOrDeleteConversation(req)) return res.status(403).json({ error: 'فقط مالک مجموعه (بالاترین سطح دسترسی) می‌تواند مکالمه را حذف کند' });
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        const conversation = await Conversation.findByPk(req.params.id);
        if (!conversation) return res.status(404).json({ error: 'مکالمه یافت نشد' });
        await Message.destroy({ where: { conversationId: conversation.id } });
        await conversation.destroy();
        res.json({ ok: true });
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
        if (conversation.status === 'archived') return res.status(400).json({ error: 'امکان ارسال پیام به مکالمه آرشیو شده وجود ندارد. ابتدا وضعیت را تغییر دهید.' });
        const content = (req.body.content || '').trim();
        const media = req.body.media || null;
        const replyTo = req.body.replyTo || null;
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
        if (!conversation.firstReplyAt) updateData.firstReplyAt = now;
        if (!conversation.branchId && req.user.branchId) updateData.branchId = req.user.branchId;
        await conversation.update(updateData);
        const { gatewayPost } = require('../lib/gatewayClient');
        const { getSendTarget } = require('../lib/phoneUtils');
        const toPhone = getSendTarget(conversation.customer.phone) || conversation.customer.phone;
        if (!toPhone) return res.status(400).json({ error: 'شماره تلفن مشتری معتبر نیست. لطفاً در پروفایل مشتری شماره را با فرمت صحیح (مثلاً 09121234567 یا 989121234567) وارد کنید.' });
        const payload = { to: toPhone, message: content };
        if (hasMedia && media && (media.url || media.filename)) {
            const relPath = media.url || ('/uploads/' + media.filename);
            const uploadsDir = path.join(__dirname, '..', 'uploads');
            const fileName = (relPath.replace(/^\/uploads\/?/, '') || media.filename || media.name || 'file').split('/').pop();
            const filePath = path.join(uploadsDir, fileName);
            if (!relPath.startsWith('http') && fs.existsSync(filePath)) {
                try {
                    const fileBuf = fs.readFileSync(filePath);
                    const base64 = fileBuf.toString('base64');
                    payload.media = { data: base64, mimetype: media.mimetype || 'application/octet-stream', filename: media.filename || media.name || fileName };
                    if (msgType === 'audio') payload.media.sendAsVoice = true;
                } catch (readErr) {
                    if (mediaUrl) {
                        payload.media = { url: mediaUrl, mimetype: media.mimetype || '' };
                        if (msgType === 'audio') payload.media.sendAsVoice = true;
                    }
                }
            } else if (mediaUrl) {
                payload.media = { url: mediaUrl, mimetype: media.mimetype || '' };
                if (msgType === 'audio') payload.media.sendAsVoice = true;
            }
        }
        if (replyTo) payload.replyTo = replyTo;
        try {
            const gwRes = await gatewayPost('/api/send-message', payload, { timeout: 15000 });
            const waId = gwRes?.data?.messageId;
            if (waId) await msg.update({ whatsappId: waId, status: 'sent' });
        } catch (gwErr) {
            let errMsg = gwErr?.response?.data?.error || gwErr?.message || 'خطا در ارسال به واتساپ';
            if (errMsg.includes('Invalid or unsafe media URL') || errMsg.includes('media URL')) {
                errMsg += ' — برای پیام صوتی/فایل، در Gateway: MEDIA_ALLOW_LOCALHOST=true یا MEDIA_URL_WHITELIST تنظیم کنید؛ در Backend: BACKEND_PUBLIC_URL را به آدرسی که Gateway به آن دسترسی دارد تنظیم کنید.';
            }
            await msg.update({ status: 'failed' });
            return res.status(502).json({ error: 'پیام در پنل ذخیره شد اما به واتساپ ارسال نشد: ' + errMsg });
        }
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

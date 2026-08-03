const express = require('express');
const router = express.Router();
const { sequelize, Conversation, Customer, Message, User, Branch, Department } = require('../models');
const { sendDeptAssignedMessage, sendConversationEndedMessage, clearConversationEndedFlag } = require('../services/autoMessages');
const { Op } = require('sequelize');
const { logActivity } = require('../services/activityLog');
const { canAccessCustomer } = require('../lib/customerAccess');
const { isMainAdmin } = require('../lib/permissions');
const { canAccessConversationAsync, conversationListWhereAsync } = require('../lib/conversationAccess');
const { isValidUUID, parsePagination, safeString } = require('../lib/validation');
const logger = require('../config/logger');
const { maybeRefreshWhatsappCustomerAvatar } = require('../lib/customerAvatar');
const { deliverOutboundConversationMessage } = require('../lib/conversationOutbound');
const { getUserWhatsAppSenderName } = require('../lib/outboundMessagePrefix');
const { redactConversationPhones, redactConversationList, publicCustomerSocketPayload } = require('../lib/customerPhoneVisibility');

/** آیا کاربر می‌تواند مکالمه را آرشیو یا حذف کند؟ (فقط مالک) */
function canArchiveOrDeleteConversation(req) {
    return req.canManageConversations && req.canManageConversations();
}

/** آیا کاربر جاری به این مکالمه دسترسی دارد؟ */
async function canAccessConversation(req, conversation) {
    return canAccessConversationAsync(req.user, req.userId, conversation);
}

/** آیا کاربر می‌تواند مکالمه را تخصیص/بست/تغییر وضعیت دهد؟ (ادمین اصلی، owner، admin، manager) */
function canManageConversation(req) {
    return isMainAdmin(req.user) || req.user.role === 'owner' || req.user.role === 'admin' || req.user.role === 'manager';
}

async function emitConversationNewMessage(req, conversation, msg) {
    const io = req.app && req.app.get('io');
    if (!io || !msg || !conversation) return;
    let messagePayload = msg;
    try {
        const full = await Message.findByPk(msg.id, {
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'username', 'avatar', 'firstName', 'lastName', 'whatsappSenderName'], required: false }],
        });
        if (full) messagePayload = full;
    } catch (_) { /* ignore */ }
    const customer = conversation.customer;
    io.emit('new_message', {
        conversationId: conversation.id,
        customerId: conversation.customerId,
        message: messagePayload,
        isHiddenFromStaff: !!conversation.isHiddenFromStaff,
        customer: publicCustomerSocketPayload(customer),
    });
}

// ——— ایجاد مکالمه جدید (با مشتری)
router.post('/', async (req, res, next) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        const { customerId } = req.body;
        if (!customerId) return res.status(400).json({ error: 'شناسه مشتری الزامی است' });
        if (!(await canAccessCustomer(req, customerId))) return res.status(403).json({ error: 'دسترسی به این مشتری ندارید' });
        const customer = await Customer.findByPk(customerId);
        if (!customer) return res.status(404).json({ error: 'مشتری یافت نشد' });
        let conversation = await Conversation.findOne({
            where: { customerId, status: { [Op.notIn]: ['closed', 'archived'] } },
            include: [
                { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'profilePic'] },
                { model: User, as: 'assignee', attributes: ['id', 'name', 'avatar'] },
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
                    { model: User, as: 'assignee', attributes: ['id', 'name', 'avatar'] },
                    { model: Branch, as: 'branch', attributes: ['id', 'name', 'city'], required: false },
                    { model: Department, as: 'department', attributes: ['id', 'name', 'color'], required: false }
                ]
            });
        }
        res.status(201).json(redactConversationPhones(conversation, req.user));
    } catch (err) {
        next(err);
    }
});

// ——— همگام‌سازی گروه‌های واتساپ — همه گروه‌ها را در CRM نمایش می‌دهد
router.post('/sync-groups', async (req, res, next) => {
    const logger = require('../config/logger');
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        const { gatewayGet, GATEWAY_URL } = require('../lib/gatewayClient');
        let gwRes;
        try {
            // Store path معمولاً <15s؛ کل درخواست زیر زیر proxy (~60s) بماند
            gwRes = await gatewayGet('/api/chats/groups', { timeout: 35000 });
        } catch (gwErr) {
            const status = gwErr?.response?.status;
            const gwBody = gwErr?.response?.data;
            const gwMsg = (gwBody && (gwBody.error || gwBody.message)) || gwErr?.message || '';
            logger.warn('sync-groups: gateway request failed', {
                status,
                error: gwMsg,
                gatewayUrl: GATEWAY_URL || process.env.GATEWAY_URL || null,
            });
            if (status === 404 || String(gwMsg).includes('404')) {
                return res.status(503).json({
                    error: 'مسیر گروه‌ها در Gateway یافت نشد. GATEWAY_URL یا نسخهٔ Gateway را بررسی کنید.',
                });
            }
            if (status === 401) {
                return res.status(503).json({
                    error: 'Gateway: احراز هویت ناموفق. GATEWAY_API_SECRET را بررسی کنید.',
                });
            }
            if (status === 503 || /not ready|WhatsApp not ready/i.test(String(gwMsg))) {
                return res.status(503).json({
                    error: 'واتساپ Gateway آماده نیست. صبر کنید تا وضعیت ready شود، بعد دوباره همگام‌سازی کنید.',
                });
            }
            if (
                status === 500 ||
                status >= 502 ||
                /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNABORTED|timeout|getChats|getGroups/i.test(String(gwMsg))
            ) {
                return res.status(503).json({
                    error:
                        'Gateway موقتاً گروه‌ها را برنگرداند' +
                        (gwMsg ? ` (${String(gwMsg).slice(0, 120)})` : '') +
                        '. چند ثانیه بعد دوباره بزنید؛ اگر ادامه داشت Gateway را ری‌استارت کنید.',
                });
            }
            return res.status(503).json({
                error: 'خطا در ارتباط با Gateway برای همگام‌سازی گروه‌ها. دوباره تلاش کنید.',
            });
        }
        const groups = gwRes?.data?.groups || gwRes?.data?.data?.groups || [];
        let synced = 0;
        for (const g of groups) {
            const groupId = (g.id || '').toString().trim();
            if (!groupId) continue;
            const groupName = (g.name || g.subject || g.formattedTitle || '').toString().trim();
            const t = await sequelize.transaction();
            try {
                let customer;
                try {
                    [customer] = await Customer.findOrCreate({
                        where: { phone: groupId },
                        defaults: { name: groupName || `گروه ${groupId}`, source: 'whatsapp' },
                        transaction: t,
                    });
                } catch (e) {
                    if (e.name === 'SequelizeUniqueConstraintError') {
                        customer = await Customer.findOne({ where: { phone: groupId }, transaction: t });
                    } else throw e;
                }
                if (!customer) {
                    await t.rollback();
                    continue;
                }
                if (groupName && String(customer.name || '').trim() !== groupName) {
                    await customer.update({ name: groupName }, { transaction: t });
                }
                // گروه فعال از شمارهٔ فعلی: محدودیت قفل قدیمی را بردار
                if (customer.isRestrictedFromStaff) {
                    await customer.update({ isRestrictedFromStaff: false }, { transaction: t });
                }
                // مکالمهٔ فعال (غیرآرشیو) را ترجیح بده؛ آرشیو قفل‌شده را دوباره باز کن
                let conv = await Conversation.findOne({
                    where: {
                        customerId: customer.id,
                        status: { [Op.notIn]: ['closed', 'archived'] },
                    },
                    transaction: t,
                });
                if (!conv) {
                    const archived = await Conversation.findOne({
                        where: { customerId: customer.id, status: 'archived' },
                        order: [['updatedAt', 'DESC']],
                        transaction: t,
                    });
                    if (archived) {
                        const meta = archived.metadata || {};
                        await archived.update(
                            {
                                status: 'open',
                                isHiddenFromStaff: false,
                                metadata: {
                                    ...meta,
                                    isGroup: true,
                                    groupName: groupName || meta.groupName || null,
                                },
                            },
                            { transaction: t }
                        );
                        conv = archived;
                    } else {
                        await Conversation.create(
                            {
                                customerId: customer.id,
                                status: 'open',
                                priority: 'normal',
                                source: 'whatsapp',
                                isHiddenFromStaff: false,
                                metadata: { isGroup: true, groupName: groupName || null },
                            },
                            { transaction: t }
                        );
                    }
                } else {
                    const meta = conv.metadata || {};
                    const needsUpdate =
                        !meta.isGroup ||
                        (groupName && meta.groupName !== groupName) ||
                        conv.isHiddenFromStaff;
                    if (needsUpdate) {
                        await conv.update(
                            {
                                isHiddenFromStaff: false,
                                metadata: {
                                    ...meta,
                                    isGroup: true,
                                    groupName: groupName || meta.groupName || null,
                                },
                            },
                            { transaction: t }
                        );
                    }
                }
                await t.commit();
                synced++;
            } catch (loopErr) {
                try {
                    await t.rollback();
                } catch (_) {}
                logger.warn('sync-groups: failed for group', { groupId, error: loopErr.message });
            }
        }
        res.json({
            ok: true,
            groupsCount: groups.length,
            synced,
            stale: !!gwRes?.data?.stale,
            message:
                groups.length === 0
                    ? 'هیچ گروهی از واتساپ دریافت نشد'
                    : `${synced} گروه همگام شد` + (gwRes?.data?.stale ? ' (از کش Gateway)' : ''),
        });
    } catch (err) {
        next(err);
    }
});

// ——— لیست مکالمات (با فیلتر و سیاست دسترسی)
router.get('/', async (req, res, next) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        const { status, priority, assignedTo, unread, unassigned, unanswered, branchId, departmentId, search, archived, isGroup, page = 1, limit = 20 } = req.query;
        const where = {};

        const canViewHidden = req.canViewHiddenConversations && req.canViewHiddenConversations();
        if (status === 'archived' || archived === '1' || archived === 'true') {
            // آرشیو (از جمله مکالمات قفل‌شدهٔ شمارهٔ قبلی) فقط ادمین سطح بالا
            if (!canViewHidden) {
                return res.status(403).json({ error: 'فقط ادمین سطح بالا به آرشیو مکالمات دسترسی دارد' });
            }
            where.status = 'archived';
        } else if (status) {
            where.status = status;
        } else {
            // لیست عادی: آرشیو نشان داده نشود — تب آرشیو جداست
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

        // سیاست دسترسی لیست + مخفی‌سازی از کارکنان (+ اعطای دسترسی)
        // پیش‌فرض: مکالمات قفل‌شده در لیست نیستند؛ فقط با includeHidden/hiddenOnly برای ادمین سطح بالا
        const includeHidden = req.query.includeHidden === '1' || req.query.includeHidden === 'true';
        const hiddenOnly = req.query.hiddenOnly === '1' || req.query.hiddenOnly === 'true';
        const listAccess = await conversationListWhereAsync(req.user, req.userId, {
            includeHidden,
            hiddenOnly,
        });
        if (listAccess && Object.keys(listAccess).length) {
            where[Op.and] = (where[Op.and] || []).concat([listAccess]);
        }

        // حذف wildcardهای SQL برای جلوگیری از abuse و بار ناخواسته روی DB
        const normalizedSearch = search
            ? String(search).replace(/[%_]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)
            : null;
        const customerSearchWhere = normalizedSearch
            ? {
                [Op.or]: [
                    { name: { [Op.like]: '%' + normalizedSearch + '%' } },
                    { phone: { [Op.like]: '%' + normalizedSearch + '%' } }
                ]
            }
            : null;
        const include = [
            { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'profilePic'], ...(customerSearchWhere ? { where: customerSearchWhere, required: true } : {}) },
            { model: User, as: 'assignee', attributes: ['id', 'name', 'avatar'] },
            { model: Branch, as: 'branch', attributes: ['id', 'name', 'city'], required: false },
            { model: Department, as: 'department', attributes: ['id', 'name', 'color'], required: false }
        ];

        const { page: p, limit: l, offset } = parsePagination(page, limit, 100);
        const { rows, count } = await Conversation.findAndCountAll({
            where,
            include,
            distinct: true,
            order: [['lastMessageAt', 'DESC']],
            limit: l,
            offset
        });
        // شمارش‌های تجمیعی برای UI (بر اساس همان فیلترهای فعلی)
        const [openCount, unreadCountRaw] = await Promise.all([
            Conversation.count({
                where: { ...where, status: 'open' },
                include: customerSearchWhere
                    ? [{
                        model: Customer,
                        as: 'customer',
                        attributes: [],
                        where: customerSearchWhere,
                        required: true
                    }]
                    : undefined,
                distinct: true,
                col: 'id'
            }),
            Conversation.sum('unreadCount', {
                where,
                include: customerSearchWhere
                    ? [{
                        model: Customer,
                        as: 'customer',
                        attributes: [],
                        where: customerSearchWhere,
                        required: true
                    }]
                    : undefined
            })
        ]);
        res.json({
            data: redactConversationList(rows, req.user),
            total: count,
            page: p,
            openCount: Number(openCount) || 0,
            unreadCount: Number(unreadCountRaw) || 0
        });
    } catch (err) {
        next(err);
    }
});

const conversationDetailInclude = [
    { model: Customer, as: 'customer' },
    { model: User, as: 'assignee', attributes: { exclude: ['password'] } },
    { model: Branch, as: 'branch', required: false },
    { model: Department, as: 'department', required: false },
];

// ——— فوروارد پیام به مشتری دیگر
router.post('/forward', async (req, res, next) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        const { messageId, customerId } = req.body || {};
        if (!isValidUUID(messageId)) return res.status(400).json({ error: 'شناسه پیام نامعتبر است' });
        if (!isValidUUID(customerId)) return res.status(400).json({ error: 'شناسه مشتری نامعتبر است' });

        const sourceMsg = await Message.findByPk(messageId, {
            include: [{ model: Conversation, as: 'conversation', include: [{ model: Customer, as: 'customer' }] }],
        });
        if (!sourceMsg || !sourceMsg.conversation) return res.status(404).json({ error: 'پیام یافت نشد' });
        if (!(await canAccessConversation(req, sourceMsg.conversation))) {
            return res.status(403).json({ error: 'دسترسی به پیام مبدأ ندارید' });
        }
        if (!(await canAccessCustomer(req, customerId))) {
            return res.status(403).json({ error: 'دسترسی به مشتری مقصد ندارید' });
        }

        const customer = await Customer.findByPk(customerId);
        if (!customer) return res.status(404).json({ error: 'مشتری یافت نشد' });

        let targetConv = await Conversation.findOne({
            where: { customerId, status: { [Op.notIn]: ['closed', 'archived'] } },
            include: [
                { model: Customer, as: 'customer' },
                { model: Department, as: 'department', required: false },
            ],
        });
        if (!targetConv) {
            targetConv = await Conversation.create({
                customerId,
                status: 'open',
                priority: 'normal',
                source: 'whatsapp',
                branchId: req.user.branchId || null,
                departmentId: req.user.departmentId || null,
                assignedTo: req.userId,
                assignedAt: new Date(),
            });
            targetConv = await Conversation.findByPk(targetConv.id, {
                include: [
                    { model: Customer, as: 'customer' },
                    { model: Department, as: 'department', required: false },
                ],
            });
        }
        if (!(await canAccessConversation(req, targetConv))) {
            return res.status(403).json({ error: 'دسترسی به مکالمه مقصد ندارید' });
        }

        let content = String(sourceMsg.content || '').trim();
        let media = null;
        if (sourceMsg.hasMedia && sourceMsg.mediaData) {
            const md = sourceMsg.mediaData;
            const srcType = String(sourceMsg.type || '').toLowerCase();
            const mime = String(md.mimetype || '').toLowerCase();
            const isVoice =
                srcType === 'ptt' ||
                srcType === 'audio' ||
                /^audio\/(ogg|opus|webm)/i.test(mime) ||
                /voice|ptt/i.test(String(md.filename || content || ''));
            media = {
                url: md.url,
                filename: md.filename || sourceMsg.content || 'file',
                mimetype: md.mimetype || (isVoice ? 'audio/ogg; codecs=opus' : 'application/octet-stream'),
                type: isVoice ? 'audio' : (['image', 'video', 'audio', 'document'].includes(srcType) ? srcType : 'document'),
                sendAsVoice: !!isVoice,
            };
            if (/^voice\.(webm|ogg|m4a|mp3|wav)$/i.test(content)) content = '';
            else if (content === md.filename || content === 'file' || content === '📎 فایل') content = '';
        }
        if (!content && !media) return res.status(400).json({ error: 'این پیام محتوای قابل فوروارد ندارد' });

        const sourceCustomer = sourceMsg.conversation.customer;
        const targetCustomerName = customer.name || customer.phone || '';
        const forwardedByName =
            getUserWhatsAppSenderName(req.user)
            || [req.user.firstName, req.user.lastName].filter(Boolean).join(' ').trim()
            || req.user.name
            || req.user.username
            || '';
        const metadata = {
            forwardedFrom: {
                messageId: sourceMsg.id,
                conversationId: sourceMsg.conversationId,
                customerId: sourceMsg.customerId,
                customerName: sourceCustomer ? (sourceCustomer.name || sourceCustomer.phone || '') : '',
            },
            forwardedTo: {
                customerId,
                customerName: targetCustomerName,
                conversationId: targetConv.id,
            },
            forwardedBy: {
                userId: req.userId,
                name: forwardedByName,
            },
        };

        const result = await deliverOutboundConversationMessage(req, targetConv, { content, media, metadata });
        if (result.error) return res.status(result.status || 500).json({ error: result.error, message: result.msg });
        await emitConversationNewMessage(req, targetConv, result.msg);
        res.json({ ok: true, message: result.msg, conversation: { id: targetConv.id, customerId: targetConv.customerId } });
    } catch (err) {
        next(err);
    }
});

// ——— مالک خط واتساپ موبایل (برای نمایش فرستندهٔ پیام‌های غیر CRM)
router.get('/mobile-wa-sender', async (req, res, next) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        const { loadMobileWhatsappUser, serializeMobileWhatsappUser } = require('../lib/resolveMobileWhatsappUser');
        const user = await loadMobileWhatsappUser(req.app.get('logger') || logger);
        res.json({ user: serializeMobileWhatsappUser(user) });
    } catch (err) {
        next(err);
    }
});

// ——— جزئیات یک مکالمه
router.get('/:id', async (req, res, next) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const conversation = await Conversation.findByPk(req.params.id, {
            include: conversationDetailInclude,
        });
        if (!conversation) return res.status(404).json({ error: 'مکالمه یافت نشد' });
        if (!(await canAccessConversation(req, conversation))) return res.status(403).json({ error: 'دسترسی به این مکالمه ندارید' });
        if (conversation.status === 'archived' && !(req.canViewArchivedConversations && req.canViewArchivedConversations())) {
            return res.status(403).json({ error: 'فقط مالک، ادمین و مدیر می‌توانند مکالمات آرشیو شده را ببینند' });
        }
        const meta = conversation.metadata || {};
        const isGroup = !!(meta.isGroup || (conversation.customer && String(conversation.customer.phone || '').includes('@g.us')));
        if (!isGroup && conversation.customer) {
            try {
                await maybeRefreshWhatsappCustomerAvatar(conversation.customer);
            } catch (e) {
                logger.warn('conversation avatar refresh', { customerId: conversation.customerId, err: e && e.message });
            }
        }
        await conversation.reload({ include: conversationDetailInclude });
        res.json(redactConversationPhones(conversation, req.user));
    } catch (err) {
        next(err);
    }
});

// ——— پیام‌های مکالمه (شامل کاربر ارسال‌کننده برای پیام‌های خروجی)
router.get('/:id/messages', async (req, res, next) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const conversation = await Conversation.findByPk(req.params.id, {
            include: [{ model: Customer, as: 'customer', attributes: ['id', 'phone'], required: false }]
        });
        if (!conversation) return res.status(404).json({ error: 'مکالمه یافت نشد' });
        if (!(await canAccessConversation(req, conversation))) return res.status(403).json({ error: 'دسترسی به این مکالمه ندارید' });
        if (conversation.status === 'archived' && !(req.canViewArchivedConversations && req.canViewArchivedConversations())) {
            return res.status(403).json({ error: 'فقط مالک، ادمین و مدیر می‌توانند مکالمات آرشیو شده را ببینند' });
        }
        // pagination: پیش‌فرض آخرین ۱۰۰ پیام، با before برای بارگذاری پیام‌های قدیمی‌تر
        const pageLimit = Math.min(parseInt(req.query.limit) || 100, 200);
        const beforeId = req.query.before || null;
        const msgWhere = { conversationId: req.params.id };
        if (beforeId) {
            const { isValidUUID } = require('../lib/validation');
            if (!isValidUUID(beforeId)) return res.status(400).json({ error: 'شناسه پیام (before) نامعتبر است' });
            // UUIDv4 ترتیب زمانی ندارد؛ پیام مرجع را می‌گیریم و صفحه‌بندی را روی timestamp انجام می‌دهیم.
            const beforeMsg = await Message.findOne({
                where: { id: beforeId, conversationId: req.params.id },
                attributes: ['id', 'timestamp']
            });
            if (!beforeMsg || !beforeMsg.timestamp) {
                return res.status(404).json({ error: 'پیام مرجع برای صفحه‌بندی یافت نشد' });
            }
            msgWhere[Op.or] = [
                { timestamp: { [Op.lt]: beforeMsg.timestamp } },
                {
                    [Op.and]: [
                        { timestamp: beforeMsg.timestamp },
                        { id: { [Op.lt]: beforeMsg.id } }
                    ]
                }
            ];
        }
        const total = await Message.count({ where: { conversationId: req.params.id } });
        const messages = await Message.findAll({
            where: msgWhere,
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'username', 'avatar', 'firstName', 'lastName', 'whatsappSenderName'], required: false }],
            order: [['timestamp', 'DESC']],
            limit: pageLimit
        });
        // برگشت به ترتیب صعودی برای نمایش صحیح در UI
        messages.reverse();
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
        const { loadMobileWhatsappUser, applyMobileWhatsappSenderToMessages, serializeMobileWhatsappUser } = require('../lib/resolveMobileWhatsappUser');
        const mobileOwner = await loadMobileWhatsappUser(req.app.get('logger') || logger);
        applyMobileWhatsappSenderToMessages(messages, mobileOwner);

        const oldestId = messages.length > 0 ? messages[0].id : null;
        res.json({
            data: messages,
            total,
            hasMore: messages.length === pageLimit,
            oldestId,
            mobileWhatsappSender: serializeMobileWhatsappUser(mobileOwner),
        });
    } catch (err) {
        next(err);
    }
});

// ——— آمار مکالمه برای نظارت مدیر (زمان اولین پاسخ، پاسخ‌دهندگان، خوانده‌شدن)
router.get('/:id/stats', async (req, res, next) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const conversation = await Conversation.findByPk(req.params.id);
        if (!conversation) return res.status(404).json({ error: 'مکالمه یافت نشد' });
        if (!(await canAccessConversation(req, conversation))) return res.status(403).json({ error: 'دسترسی به این مکالمه ندارید' });
        if (conversation.status === 'archived' && !(req.canViewArchivedConversations && req.canViewArchivedConversations())) {
            return res.status(403).json({ error: 'فقط مالک، ادمین و مدیر می‌توانند مکالمات آرشیو شده را ببینند' });
        }
        // Use SQL aggregation instead of loading all messages into memory
        const convId = req.params.id;
        const [counts, firstIncoming, responderRows] = await Promise.all([
            // Total and outgoing counts
            Message.findAll({
                where: { conversationId: convId },
                attributes: [
                    'direction',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']
                ],
                group: ['direction'],
                raw: true
            }),
            // First incoming message timestamp
            Message.findOne({
                where: { conversationId: convId, direction: 'incoming', timestamp: { [Op.ne]: null } },
                attributes: ['timestamp'],
                order: [['timestamp', 'ASC']],
                raw: true
            }),
            // Distinct responders (users who sent outgoing messages)
            Message.findAll({
                where: { conversationId: convId, direction: 'outgoing', userId: { [Op.ne]: null } },
                attributes: ['userId', [sequelize.fn('MIN', sequelize.col('timestamp')), 'firstAt']],
                include: [{ model: User, as: 'user', attributes: ['id', 'name', 'username', 'avatar', 'firstName', 'lastName', 'whatsappSenderName'], required: false }],
                group: ['userId', 'user.id', 'user.name', 'user.username', 'user.avatar'],
                order: [[sequelize.fn('MIN', sequelize.col('timestamp')), 'ASC']],
                raw: false
            })
        ]);
        // First outgoing message timestamp AFTER first incoming
        const firstOutgoing = firstIncoming?.timestamp
            ? await Message.findOne({
                where: {
                    conversationId: convId,
                    direction: 'outgoing',
                    timestamp: { [Op.gte]: firstIncoming.timestamp }
                },
                attributes: ['timestamp'],
                order: [['timestamp', 'ASC']],
                raw: true
            })
            : null;

        const countMap = {};
        for (const r of counts) countMap[r.direction] = parseInt(r.cnt, 10);
        const messageCount = (countMap.incoming || 0) + (countMap.outgoing || 0);
        const outgoingCount = countMap.outgoing || 0;

        const firstIncomingAt = firstIncoming?.timestamp ? new Date(firstIncoming.timestamp) : null;
        const firstOutgoingAt = firstOutgoing?.timestamp ? new Date(firstOutgoing.timestamp) : null;
        let firstResponseTimeMin = null;
        if (firstIncomingAt && firstOutgoingAt && firstOutgoingAt >= firstIncomingAt) {
            firstResponseTimeMin = Math.round((firstOutgoingAt - firstIncomingAt) / 60000);
        }

        const responders = responderRows.map(m => ({
            id: m.userId,
            name: (m.user && (m.user.name || m.user.username)) || '—'
        }));

        res.json({
            firstResponseTimeMin,
            firstIncomingAt: firstIncomingAt ? firstIncomingAt.toISOString() : null,
            firstOutgoingAt: firstOutgoingAt ? firstOutgoingAt.toISOString() : null,
            responders,
            messageCount,
            outgoingCount,
            unreadCount: conversation.unreadCount || 0
        });
    } catch (err) {
        next(err);
    }
});

// ——— به‌روزرسانی مکالمه (تخصیص، وضعیت، اولویت، بستن، موضوع، خوانده‌شدن)
router.patch('/:id', async (req, res, next) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const conversation = await Conversation.findByPk(req.params.id, {
            include: [
                { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'] },
                { model: User, as: 'assignee', attributes: ['id', 'name', 'avatar'] }
            ]
        });
        if (!conversation) return res.status(404).json({ error: 'مکالمه یافت نشد' });
        if (!(await canAccessConversation(req, conversation))) return res.status(403).json({ error: 'دسترسی به این مکالمه ندارید' });

        const { assignedTo, departmentId, branchId, status, priority, subject, markRead, rating, feedback, isHiddenFromStaff } = req.body;
        const prevStatus = conversation.status;

        if (markRead === true || markRead === 'true') {
            await conversation.update({ unreadCount: 0 });
            return res.json(redactConversationPhones(conversation, req.user));
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
        const VALID_CONV_STATUSES = ['open', 'pending', 'closed', 'resolved', 'archived'];
        if (canManage && status !== undefined) {
            if (!VALID_CONV_STATUSES.includes(status)) {
                return res.status(400).json({ error: 'وضعیت مکالمه نامعتبر است' });
            }
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
        if (isHiddenFromStaff !== undefined) {
            if (!(req.canViewHiddenConversations && req.canViewHiddenConversations())) {
                return res.status(403).json({ error: 'فقط مالک یا ادمین می‌تواند مکالمه را از دید کارکنان مخفی کند' });
            }
            updateData.isHiddenFromStaff = isHiddenFromStaff === true || isHiddenFromStaff === 'true';
        }

        const prevDeptIdBeforeUpdate = conversation.departmentId ? String(conversation.departmentId) : null;

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
            // ارسال ایمیل اطلاع‌رسانی به کاربر تخصیص‌یافته
            if (String(updateData.assignedTo) !== String(req.userId)) {
                setImmediate(async () => {
                    try {
                        const emailService = require('../services/emailService');
                        const { getPanelSettings, getPanelEmailConfig } = require('../services/panelSettingsLoader');
                        const { NotificationPreference } = require('../models');
                        const assignee = await User.findByPk(updateData.assignedTo, { attributes: ['id', 'name', 'email'] });
                        if (!assignee || !assignee.email) return;
                        const [pref, settings] = await Promise.all([
                            NotificationPreference.findOne({ where: { userId: assignee.id } }),
                            getPanelSettings()
                        ]);
                        if (pref && pref.ticketAssignedEmailEnabled === false) return;
                        const emailConfig = getPanelEmailConfig(settings);
                        const customerName = conversation.customer ? conversation.customer.name || conversation.customer.phone : '';
                        const assignerName = req.user ? req.user.name || req.user.email : null;
                        await emailService.sendConversationAssigned(assignee, conversation, customerName, assignerName, emailConfig && emailConfig.host ? emailConfig : null);
                    } catch (_) {}
                });
            }
        }
        if (departmentId !== undefined && updateData.departmentId !== undefined) {
            const newDeptId = updateData.departmentId ? String(updateData.departmentId) : null;
            const deptChanged = prevDeptIdBeforeUpdate !== newDeptId;
            if (updateData.departmentId && deptChanged) {
                const dept = await Department.findByPk(updateData.departmentId);
                const convForDept = await Conversation.findByPk(req.params.id, { include: [{ model: Department, as: 'department' }] });
                if (convForDept && dept) await sendDeptAssignedMessage(convForDept, dept);
            }
            if (deptChanged) {
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
        }
        // اطلاع‌رسانی پایان گفتگو به مشتری هنگام بسته/حل‌شدن مکالمه (و پاک‌کردن پرچم هنگام بازشدن مجدد)
        if (canManage && status !== undefined && updateData.status) {
            const END_STATUSES = ['closed', 'resolved'];
            const wasEnded = END_STATUSES.includes(prevStatus);
            const isEnded = END_STATUSES.includes(updateData.status);
            if (isEnded && !wasEnded) {
                try { await sendConversationEndedMessage(conversation.id); } catch (_) {}
            } else if (!isEnded && wasEnded && (updateData.status === 'open' || updateData.status === 'pending')) {
                try { await clearConversationEndedFlag(conversation.id); } catch (_) {}
            }
        }

        const updated = await Conversation.findByPk(req.params.id, {
            include: [
                { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'profilePic'] },
                { model: User, as: 'assignee', attributes: ['id', 'name', 'avatar'] },
                { model: Branch, as: 'branch', attributes: ['id', 'name', 'city'], required: false },
                { model: Department, as: 'department', attributes: ['id', 'name', 'color'], required: false }
            ]
        });
        res.json(redactConversationPhones(updated, req.user));
    } catch (err) {
        next(err);
    }
});

// ——— حذف مکالمه (فقط مالک)
router.delete('/:id', async (req, res, next) => {
    try {
        if (!canArchiveOrDeleteConversation(req)) return res.status(403).json({ error: 'فقط مالک مجموعه (بالاترین سطح دسترسی) می‌تواند مکالمه را حذف کند' });
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const conversation = await Conversation.findByPk(req.params.id);
        if (!conversation) return res.status(404).json({ error: 'مکالمه یافت نشد' });
        await Message.destroy({ where: { conversationId: conversation.id } });
        await conversation.destroy();
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

// ——— علامت‌گذاری به‌عنوان خوانده‌شده
router.post('/:id/read', async (req, res, next) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const conversation = await Conversation.findByPk(req.params.id);
        if (!conversation) return res.status(404).json({ error: 'مکالمه یافت نشد' });
        if (!(await canAccessConversation(req, conversation))) return res.status(403).json({ error: 'دسترسی به این مکالمه ندارید' });
        await conversation.update({ unreadCount: 0 });
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

// ——— ارسال پیام (متن یا فایل/عکس)
router.post('/:id/send', async (req, res, next) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const conversation = await Conversation.findByPk(req.params.id, { include: [{ model: Customer, as: 'customer' }, { model: Department, as: 'department', required: false }] });
        if (!conversation) return res.status(404).json({ error: 'مکالمه یافت نشد' });
        if (!(await canAccessConversation(req, conversation))) return res.status(403).json({ error: 'دسترسی به این مکالمه ندارید' });
        const content = safeString(req.body.content, 10000);
        const media = req.body.media || null;
        const replyTo = req.body.replyTo || null;
        if (!content && !media) return res.status(400).json({ error: 'متن پیام یا فایل الزامی است' });
        const result = await deliverOutboundConversationMessage(req, conversation, { content, media, replyTo });
        if (result.error) {
            return res.status(result.status || 500).json({
                error: result.error,
                messageId: result.msg && result.msg.id ? result.msg.id : undefined,
            });
        }
        await emitConversationNewMessage(req, conversation, result.msg);
        res.json(result.msg);
    } catch (err) {
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
            return res.status(503).json({
                error: 'Gateway واتساپ در دسترس نیست. سرویس crm-gateway-kaya را بررسی کنید.',
            });
        }
        if (err.response && (err.response.status === 503 || err.response.status === 502)) {
            return res.status(503).json({
                error:
                    (err.response.data && (err.response.data.error || err.response.data.message)) ||
                    'واتساپ Gateway آماده نیست. QR/اتصال را در تنظیمات واتساپ بررسی کنید.',
            });
        }
        next(err);
    }
});

// ——— تماس صوتی/تصویری واتساپ (فقط Gateway — نه Cloud API)
router.post('/:id/call', async (req, res, next) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const conversation = await Conversation.findByPk(req.params.id, {
            include: [
                { model: Customer, as: 'customer' },
                { model: Department, as: 'department', required: false },
            ],
        });
        if (!conversation) return res.status(404).json({ error: 'مکالمه یافت نشد' });
        if (!(await canAccessConversation(req, conversation))) {
            return res.status(403).json({ error: 'دسترسی به این مکالمه ندارید' });
        }

        const { getWhatsappConnectionConfig } = require('../lib/gatewayClient');
        const cfg = await getWhatsappConnectionConfig();
        if (!cfg.gatewayEnabled) {
            return res.status(503).json({
                error: 'تماس واتساپ فقط با اتصال Gateway فعال است. در تنظیمات اتصال، Gateway را فعال کنید.',
            });
        }

        const callType = req.body?.type === 'video' ? 'video' : 'voice';
        const { startWaConversationCall } = require('../lib/waCallOutbound');
        const result = await startWaConversationCall(req, conversation, callType);
        if (result.error) return res.status(result.status || 500).json({ error: result.error });
        res.json(result.data);
    } catch (err) {
        if (err.response?.status === 503) {
            return res.status(503).json({
                error: err.response?.data?.error || 'Gateway واتساپ آماده نیست. اتصال را در تنظیمات بررسی کنید.',
            });
        }
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
            return res.status(503).json({ error: 'Gateway در دسترس نیست' });
        }
        next(err);
    }
});

module.exports = router;

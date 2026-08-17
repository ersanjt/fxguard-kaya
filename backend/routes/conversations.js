const express = require('express');
const router = express.Router();
const {
    sequelize,
    Conversation,
    Customer,
    Message,
    User,
    Branch,
    Department,
} = require('../models');
const {
    sendDeptAssignedMessage,
    sendConversationEndedMessage,
    clearConversationEndedFlag,
} = require('../services/autoMessages');
const { Op } = require('sequelize');
const { logActivity } = require('../services/activityLog');
const { canAccessCustomer } = require('../lib/customerAccess');
const { isMainAdmin } = require('../lib/permissions');
const {
    canAccessConversationAsync,
    conversationListWhereAsync,
} = require('../lib/conversationAccess');
const { getUserGrantSets, grantedCustomerIdList } = require('../lib/staffResourceGrants');
const { isValidUUID, parsePagination, safeString } = require('../lib/validation');
const logger = require('../config/logger');
const { maybeRefreshWhatsappCustomerAvatar } = require('../lib/customerAvatar');
const { deliverOutboundConversationMessage } = require('../lib/conversationOutbound');
const { getUserWhatsAppSenderName } = require('../lib/outboundMessagePrefix');
const {
    redactConversationPhones,
    redactConversationList,
    publicCustomerSocketPayload,
} = require('../lib/customerPhoneVisibility');
const { emitNewMessageToAuthorized } = require('../lib/conversationRealtime');

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
    return (
        isMainAdmin(req.user) ||
        req.user.role === 'owner' ||
        req.user.role === 'admin' ||
        req.user.role === 'manager'
    );
}

async function emitConversationNewMessage(req, conversation, msg) {
    const io = req.app && req.app.get('io');
    if (!io || !msg || !conversation) return;
    let messagePayload = msg;
    try {
        const full = await Message.findByPk(msg.id, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: [
                        'id',
                        'name',
                        'username',
                        'avatar',
                        'firstName',
                        'lastName',
                        'whatsappSenderName',
                    ],
                    required: false,
                },
            ],
        });
        if (full) messagePayload = full;
    } catch (_) {
        /* ignore */
    }
    const customer = conversation.customer;
    await emitNewMessageToAuthorized(io, conversation, {
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
        if (!req.canAccess('conversations'))
            return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        const { customerId } = req.body;
        if (!customerId) return res.status(400).json({ error: 'شناسه مشتری الزامی است' });
        if (!(await canAccessCustomer(req, customerId)))
            return res.status(403).json({ error: 'دسترسی به این مشتری ندارید' });
        const customer = await Customer.findByPk(customerId);
        if (!customer) return res.status(404).json({ error: 'مشتری یافت نشد' });
        let conversation = await Conversation.findOne({
            where: { customerId, status: { [Op.notIn]: ['closed', 'archived'] } },
            include: [
                {
                    model: Customer,
                    as: 'customer',
                    attributes: ['id', 'name', 'phone', 'profilePic'],
                },
                { model: User, as: 'assignee', attributes: ['id', 'name', 'avatar'] },
                {
                    model: Branch,
                    as: 'branch',
                    attributes: ['id', 'name', 'city'],
                    required: false,
                },
                {
                    model: Department,
                    as: 'department',
                    attributes: ['id', 'name', 'color'],
                    required: false,
                },
            ],
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
                assignedAt: new Date(),
            });
            conversation = await Conversation.findByPk(conversation.id, {
                include: [
                    {
                        model: Customer,
                        as: 'customer',
                        attributes: ['id', 'name', 'phone', 'profilePic'],
                    },
                    { model: User, as: 'assignee', attributes: ['id', 'name', 'avatar'] },
                    {
                        model: Branch,
                        as: 'branch',
                        attributes: ['id', 'name', 'city'],
                        required: false,
                    },
                    {
                        model: Department,
                        as: 'department',
                        attributes: ['id', 'name', 'color'],
                        required: false,
                    },
                ],
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
        if (!req.canAccess('conversations'))
            return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        const {
            gatewayGet,
            gatewayPost,
            GATEWAY_URL,
            getWhatsappConnectionConfig,
        } = require('../lib/gatewayClient');

        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

        const isGwReady = (data) =>
            !!(data && (data.whatsapp || data.usable || data.status === 'ready' || data.phase === 'ready'));

        /** وضعیت Gateway؛ در صورت نیاز /api/start و انتظار تا ready */
        const ensureGatewayWhatsappReady = async (cfg, opts = {}) => {
            const maxWaitMs = opts.maxWaitMs != null ? opts.maxWaitMs : 35000;
            const startedAt = Date.now();
            let last = {};
            let startAttempted = false;

            while (Date.now() - startedAt < maxWaitMs) {
                try {
                    const st = await gatewayGet('/api/status', { timeout: 10000, cfg });
                    last = st?.data || {};
                    if (isGwReady(last)) {
                        return { ok: true, data: last };
                    }
                } catch (e) {
                    last = {
                        status: 'unreachable',
                        error: e?.response?.data?.error || e?.message || 'unreachable',
                    };
                }

                const phase = last.phase || last.status || '';
                const needsStart =
                    !last.starting &&
                    phase !== 'authenticated' &&
                    phase !== 'qr' &&
                    (phase === 'disconnected' ||
                        phase === 'unreachable' ||
                        phase === 'auth_failure' ||
                        !phase);

                if (needsStart && !startAttempted) {
                    startAttempted = true;
                    try {
                        await gatewayPost('/api/start', {}, { timeout: 25000, cfg });
                        logger.info('sync-groups: triggered gateway /api/start');
                    } catch (startErr) {
                        logger.warn('sync-groups: gateway start failed', {
                            error: startErr?.response?.data?.error || startErr?.message,
                        });
                    }
                }

                await sleep(2000);
            }

            return { ok: false, data: last };
        };

        const cfg = await getWhatsappConnectionConfig();
        let readyGate = await ensureGatewayWhatsappReady(cfg);

        const {
            applyVisibilityForCurrentGatewayChats,
            promoteExistingGroupConversations,
            chatIdVariants,
            normalizeLinkedNumber,
            ensureLegacyCutover,
            collectCandidateChatPhones,
        } = require('../services/legacyCrmLockdown');

        // حتی اگر ensure کوتاه شکست خورد، یک وضعیت زنده بگیر — UI ممکن است «متصل» باشد
        let liveStatus = readyGate.data || {};
        try {
            const st = await gatewayGet('/api/status', { timeout: 8000, cfg });
            liveStatus = st?.data || liveStatus;
            if (isGwReady(liveStatus)) {
                readyGate = { ok: true, data: liveStatus };
            }
        } catch (_) {}

        const gatewayNumber =
            normalizeLinkedNumber(liveStatus.number) ||
            normalizeLinkedNumber(readyGate?.data?.number) ||
            '';

        try {
            await ensureLegacyCutover(gatewayNumber || liveStatus.number, { reason: 'sync_groups' });
        } catch (cutErr) {
            logger.warn('sync-groups: cutover failed', { error: cutErr?.message });
        }

        const normalizeChatRows = (payload) => {
            const chats = payload?.chats || payload?.data?.chats || null;
            if (Array.isArray(chats) && chats.length) {
                return chats
                    .map((c) => ({
                        id: (c.id || '').toString().trim(),
                        name: (c.name || c.subject || c.formattedTitle || '').toString().trim(),
                        isGroup: !!(c.isGroup || String(c.id || '').endsWith('@g.us')),
                        lastPreview: (c.lastPreview || '').toString().trim() || null,
                        timestamp: c.timestamp || null,
                    }))
                    .filter((c) => c.id);
            }
            const groups = payload?.groups || payload?.data?.groups || [];
            return (groups || [])
                .map((g) => ({
                    id: (g.id || '').toString().trim(),
                    name: (g.name || g.subject || g.formattedTitle || '').toString().trim(),
                    isGroup: true,
                    lastPreview: null,
                    timestamp: null,
                }))
                .filter((g) => g.id);
        };

        const fetchGatewayChats = async () => {
            let lastErr = null;
            let lastEmpty = null;
            for (let attempt = 0; attempt < 2; attempt++) {
                try {
                    if (attempt > 0) {
                        await sleep(2000 * attempt);
                    }
                    try {
                        const all = await gatewayGet('/api/chats', { timeout: 90000, cfg });
                        const rows = normalizeChatRows(all.data || {});
                        if (rows.length) {
                            return { gwRes: all, chatRows: rows, source: 'chats' };
                        }
                        lastEmpty = { gwRes: all, chatRows: rows, source: 'chats' };
                    } catch (eAll) {
                        lastErr = eAll;
                    }
                    try {
                        const groups = await gatewayGet('/api/chats/groups', { timeout: 60000, cfg });
                        const rows = normalizeChatRows(groups.data || {});
                        if (rows.length) {
                            return { gwRes: groups, chatRows: rows, source: 'groups-only' };
                        }
                    } catch (eGroups) {
                        lastErr = eGroups;
                    }
                } catch (e) {
                    lastErr = e;
                    const msg =
                        (e?.response?.data && (e.response.data.error || e.response.data.message)) ||
                        e?.message ||
                        '';
                    const retryable =
                        e?.response?.status === 503 ||
                        /not ready|timeout|getChats|getGroups|Session closed|Target closed/i.test(
                            String(msg)
                        );
                    if (!retryable) throw e;
                }
            }
            if (lastEmpty) return lastEmpty;
            throw lastErr || new Error('chats_fetch_failed');
        };

        let fetched = null;
        let fetchErr = null;
        try {
            fetched = await fetchGatewayChats();
        } catch (e) {
            fetchErr = e;
        }

        // اگر لیست Store خالی بود، چت‌هایی را باز کن که روی همین نشست واتساپ واقعاً وجود دارند
        if ((!fetched || !(fetched.chatRows || []).length) && isGwReady(readyGate.data || liveStatus)) {
            try {
                const phones = await collectCandidateChatPhones();
                if (phones.length) {
                    const resolved = await gatewayPost(
                        '/api/chats/resolve',
                        { ids: phones },
                        { timeout: 100000, cfg }
                    );
                    const rows = normalizeChatRows(resolved.data || {});
                    if (rows.length) {
                        fetched = { gwRes: resolved, chatRows: rows, source: 'resolve' };
                    }
                }
            } catch (resErr) {
                logger.warn('sync-groups: resolve current-session chats failed', {
                    error: resErr?.response?.data?.error || resErr?.message,
                });
            }
        }

        const gwRes = fetched && fetched.gwRes;
        const chatSource = (fetched && fetched.source) || 'chats';

        // اگر لیست موقتاً نیامد ولی Gateway ready است — شمارهٔ قبلی را دوباره باز نکن
        if (!gwRes && isGwReady(readyGate.data || liveStatus)) {
            logger.warn('sync-groups: chats list failed while Gateway ready — keep previous archived', {
                error: fetchErr?.response?.data?.error || fetchErr?.message || null,
                gatewayUrl: GATEWAY_URL || process.env.GATEWAY_URL || null,
            });
            let promoted = { opened: 0 };
            try {
                promoted = await promoteExistingGroupConversations(
                    gatewayNumber || liveStatus.number
                );
            } catch (promErr) {
                logger.warn('sync-groups: keep-current-group fallback failed', {
                    error: promErr?.message,
                });
            }
            return res.json({
                ok: true,
                groupsCount: promoted.opened || 0,
                chatsCount: promoted.opened || 0,
                synced: promoted.opened || 0,
                opened: promoted.opened || 0,
                soft: true,
                message: promoted.opened
                    ? 'لیست زنده واتساپ نیامد؛ فقط گروه همین شماره در مکالمات فعال ماند. ۲۰ ثانیه بعد دوباره همگام کنید.'
                    : 'Gateway متصل است اما الان لیست چت‌های همین شماره از واتساپ نیامد. چت‌های شمارهٔ قبلی آرشیو ماندند. ۲۰ ثانیه صبر کنید و دوباره همگام‌سازی کنید.',
            });
        }

        if (!gwRes) {
            const status = fetchErr?.response?.status;
            const gwMsg =
                (fetchErr?.response?.data &&
                    (fetchErr.response.data.error || fetchErr.response.data.message)) ||
                fetchErr?.message ||
                '';
            logger.warn('sync-groups: gateway request failed', {
                status,
                error: gwMsg,
                gatewayUrl: GATEWAY_URL || process.env.GATEWAY_URL || null,
            });
            if (status === 404 || String(gwMsg).includes('404')) {
                return res.status(503).json({
                    error: 'مسیر چت‌ها در Gateway یافت نشد. GATEWAY_URL یا نسخهٔ Gateway را بررسی کنید.',
                });
            }
            if (status === 401) {
                return res.status(503).json({
                    error: 'Gateway: احراز هویت ناموفق. GATEWAY_API_SECRET را بررسی کنید.',
                });
            }
            return res.status(503).json({
                error:
                    'همگام‌سازی چت‌ها الان کامل نشد. چند ثانیه صبر کنید و دوباره بزنید. اگر ادامه داشت در تنظیمات واتساپ وضعیت Gateway را به‌روز کنید.',
                gatewayStatus: (liveStatus && (liveStatus.phase || liveStatus.status)) || null,
            });
        }

        const chatRows = (fetched && fetched.chatRows) || normalizeChatRows(gwRes.data || {});
        let synced = 0;
        let groupsSynced = 0;
        for (const row of chatRows) {
            const chatId = row.id;
            const chatName = row.name;
            const isGroup = !!row.isGroup;
            const t = await sequelize.transaction();
            try {
                let customer = null;
                const variants = chatIdVariants(chatId);
                customer = await Customer.findOne({
                    where: { phone: { [Op.in]: variants } },
                    transaction: t,
                });
                if (!customer) {
                    try {
                        [customer] = await Customer.findOrCreate({
                            where: { phone: chatId },
                            defaults: {
                                name: chatName || (isGroup ? `گروه ${chatId}` : `مشتری ${chatId}`),
                                source: 'whatsapp',
                                isRestrictedFromStaff: false,
                            },
                            transaction: t,
                        });
                    } catch (e) {
                        if (e.name === 'SequelizeUniqueConstraintError') {
                            customer = await Customer.findOne({
                                where: { phone: { [Op.in]: variants } },
                                transaction: t,
                            });
                        } else throw e;
                    }
                }
                if (!customer) {
                    await t.rollback();
                    continue;
                }
                const looksLikeJidName = (s) =>
                    /@g\.us$/i.test(String(s || '')) || /^گروه\s+\d/i.test(String(s || ''));
                const custUpdates = {};
                if (chatName && !looksLikeJidName(chatName) && customer.name !== chatName) {
                    custUpdates.name = chatName;
                }
                if (customer.isRestrictedFromStaff) custUpdates.isRestrictedFromStaff = false;
                if (Object.keys(custUpdates).length) {
                    await customer.update(custUpdates, { transaction: t });
                }

                const stampMeta = (meta) => ({
                    ...(meta || {}),
                    isGroup: isGroup || !!(meta && meta.isGroup),
                    groupName: isGroup
                        ? chatName || (meta && meta.groupName) || null
                        : meta && meta.groupName,
                    linkedGatewayNumber: gatewayNumber || (meta && meta.linkedGatewayNumber) || null,
                    historicalImport: true,
                });

                const applyLivePreview = (target, upd) => {
                    if (row.lastPreview && !target.lastMessagePreview) {
                        upd.lastMessagePreview = row.lastPreview;
                    }
                    if (row.timestamp && !target.lastMessageAt) {
                        const tsNum = Number(row.timestamp);
                        if (Number.isFinite(tsNum) && tsNum > 0) {
                            upd.lastMessageAt = new Date(tsNum < 1e12 ? tsNum * 1000 : tsNum);
                        }
                    }
                };

                const conv = await Conversation.findOne({
                    where: {
                        customerId: customer.id,
                        status: { [Op.notIn]: ['closed', 'archived'] },
                        isHiddenFromStaff: false,
                    },
                    transaction: t,
                });
                if (conv) {
                    const upd = { metadata: stampMeta(conv.metadata) };
                    applyLivePreview(conv, upd);
                    await conv.update(upd, { transaction: t });
                } else {
                    const existing = await Conversation.findOne({
                        where: { customerId: customer.id },
                        order: [['updatedAt', 'DESC']],
                        transaction: t,
                    });
                    if (existing) {
                        const upd = {
                            metadata: stampMeta(existing.metadata),
                            status: 'open',
                            isHiddenFromStaff: false,
                            closedAt: null,
                        };
                        applyLivePreview(existing, upd);
                        await existing.update(upd, { transaction: t });
                    } else {
                        const createData = {
                            customerId: customer.id,
                            status: 'open',
                            priority: 'normal',
                            source: 'whatsapp',
                            isHiddenFromStaff: false,
                            metadata: stampMeta({}),
                        };
                        applyLivePreview({}, createData);
                        await Conversation.create(createData, { transaction: t });
                    }
                }
                await t.commit();
                synced++;
                if (isGroup) groupsSynced++;
                try {
                    const { maybeRefreshWhatsappCustomerAvatar } = require('../lib/customerAvatar');
                    maybeRefreshWhatsappCustomerAvatar(customer).catch(() => {});
                } catch (_) {}
            } catch (loopErr) {
                try {
                    await t.rollback();
                } catch (_) {}
                logger.warn('sync-groups: failed for chat', { chatId, error: loopErr.message });
            }
        }

        // هر چتی که روی واتساپ این شماره نیست (شمارهٔ قبلی) آرشیو می‌ماند — لیست ناقص هم آن‌ها را باز نمی‌کند
        let visibility = { archived: 0, opened: 0 };
        try {
            visibility = await applyVisibilityForCurrentGatewayChats(
                chatRows.map((r) => r.id),
                gatewayNumber || liveStatus.number,
                { archiveMissing: true, keepProtectedGroups: true }
            );
        } catch (visErr) {
            logger.warn('sync-groups: visibility filter failed', { error: visErr?.message });
        }

        const openedTotal = visibility.opened || 0;
        res.json({
            ok: true,
            groupsCount: groupsSynced,
            chatsCount: chatRows.length,
            synced,
            opened: openedTotal,
            archivedOther: visibility.archived || 0,
            incomplete: false,
            gatewayNumber: gatewayNumber || null,
            source: chatSource,
            stale: !!gwRes?.data?.stale,
            message:
                chatRows.length === 0
                    ? 'هیچ چتی از واتساپ این شماره دریافت نشد. چت‌های شمارهٔ قبلی آرشیو ماندند. ۲۰ ثانیه بعد دوباره همگام کنید.'
                    : `${synced} چت در مکالمات فعال همگام شد` +
                      (groupsSynced ? ` (${groupsSynced} گروه)` : '') +
                      (openedTotal ? `؛ ${openedTotal} مکالمه از آرشیو باز شد` : '') +
                      (visibility.archived
                          ? `؛ ${visibility.archived} مکالمهٔ شمارهٔ قبلی آرشیو ماند`
                          : '') +
                      (chatSource === 'groups-only' ? ' (فعلاً فقط گروه‌ها)' : '') +
                      (chatSource === 'resolve' ? ' (از نشست زنده واتساپ همین شماره)' : '') +
                      (gwRes?.data?.stale ? ' (از کش Gateway)' : ''),
        });
    } catch (err) {
        next(err);
    }
});

function canExportOrPurgeArchive(req) {
    return !!(isMainAdmin(req.user) || (req.canManageConversations && req.canManageConversations()));
}

// ——— دانلود بکاپ آرشیو (فقط ادمین اصلی / مالک)
router.get('/archive-backup', async (req, res, next) => {
    try {
        if (!canExportOrPurgeArchive(req)) {
            return res.status(403).json({ error: 'فقط ادمین اصلی می‌تواند بکاپ آرشیو را دانلود کند' });
        }
        const { exportArchiveToFile } = require('../services/archiveExport');
        const exported = await exportArchiveToFile();
        res.setHeader('Content-Type', 'application/gzip');
        res.setHeader('Content-Disposition', `attachment; filename="${exported.fileName}"`);
        res.setHeader('X-Archive-Conversations', String(exported.conversationCount));
        res.setHeader('X-Archive-Messages', String(exported.messageCount));
        return res.sendFile(exported.filePath);
    } catch (err) {
        next(err);
    }
});

// ——— پاک‌سازی آرشیو بعد از بکاپ (گروه فروش کایا نگه داشته می‌شود)
router.post('/archive-purge', async (req, res, next) => {
    try {
        if (!canExportOrPurgeArchive(req)) {
            return res.status(403).json({ error: 'فقط ادمین اصلی می‌تواند آرشیو را پاک کند' });
        }
        const { exportArchiveToFile, purgeArchive } = require('../services/archiveExport');
        const exported = await exportArchiveToFile();
        const purged = await purgeArchive({ keepCurrentGroups: true });
        res.json({
            ok: true,
            backup: {
                fileName: exported.fileName,
                conversationCount: exported.conversationCount,
                messageCount: exported.messageCount,
                bytes: exported.bytes,
            },
            purged,
            message: `${exported.conversationCount} مکالمه آرشیو بکاپ شد؛ ${purged.deletedConversations} مکالمه پاک شد؛ ${purged.keptConversations} گروه فعلی در لیست فعال ماند.`,
        });
    } catch (err) {
        next(err);
    }
});

// ——— لیست مکالمات (با فیلتر و سیاست دسترسی)
router.get('/', async (req, res, next) => {
    try {
        if (!req.canAccess('conversations'))
            return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        try {
            const { ensureLegacyCutover } = require('../services/legacyCrmLockdown');
            await ensureLegacyCutover(null, { reason: 'conversations_list' });
        } catch (_) {}
        const {
            status,
            priority,
            assignedTo,
            unread,
            unassigned,
            unanswered,
            branchId,
            departmentId,
            search,
            archived,
            isGroup,
            page = 1,
            limit = 20,
        } = req.query;
        const where = {};

        const canViewHidden = req.canViewHiddenConversations && req.canViewHiddenConversations();
        const hiddenOnly = req.query.hiddenOnly === '1' || req.query.hiddenOnly === 'true';
        if (hiddenOnly && !canViewHidden) {
            return res
                .status(403)
                .json({ error: 'فقط ادمین سطح بالا به مکالمات محدودشده دسترسی دارد' });
        }
        if (status === 'archived' || archived === '1' || archived === 'true') {
            // آرشیو (از جمله مکالمات قفل‌شدهٔ شمارهٔ قبلی) فقط ادمین سطح بالا
            if (!canViewHidden) {
                return res
                    .status(403)
                    .json({ error: 'فقط ادمین سطح بالا به آرشیو مکالمات دسترسی دارد' });
            }
            where.status = 'archived';
        } else if (status) {
            where.status = status;
        } else if (!hiddenOnly) {
            // لیست عادی: آرشیو نشان داده نشود — تب آرشیو جداست
            where.status = { [Op.ne]: 'archived' };
        }
        if (priority) where.priority = priority;
        if (assignedTo) where.assignedTo = assignedTo;
        if (unassigned === '1' || unassigned === 'true') {
            where.assignedTo = null;
            where.departmentId = null;
        }
        if (unread === '1' || unread === 'true') where.unreadCount = { [Op.gt]: 0 };
        if (isGroup === '1' || isGroup === 'true') {
            const dialect = sequelize.getDialect();
            const convTbl = Conversation.tableName || 'Conversations';
            const custTbl = Customer.tableName || 'Customers';
            const custFk = dialect === 'postgres' ? '"customerId"' : 'customerId';
            const subq =
                dialect === 'postgres'
                    ? `(SELECT c.id FROM "${convTbl}" c LEFT JOIN "${custTbl}" cu ON cu.id = c.${custFk} WHERE (c.metadata->>'isGroup')::text = 'true' OR cu.phone ILIKE '%@g.us')`
                    : `(SELECT c.id FROM "${convTbl}" c LEFT JOIN "${custTbl}" cu ON cu.id = c.${custFk} WHERE json_extract(c.metadata, '$.isGroup') IN (1, 'true') OR cu.phone LIKE '%@g.us')`;
            where[Op.and] = (where[Op.and] || []).concat([
                sequelize.where(sequelize.col('Conversation.id'), Op.in, sequelize.literal(subq)),
            ]);
        }
        if (branchId) where.branchId = branchId;
        if (departmentId) where.departmentId = departmentId;
        // مکالمات بدون پاسخ: آخرین پیام از مشتری بوده و ما جواب نداده‌ایم (فقط باز/در انتظار)
        if (unanswered === '1' || unanswered === 'true') {
            where[Op.and] = (where[Op.and] || []).concat([
                { status: { [Op.in]: ['open', 'pending'] } },
                { lastIncomingMessageAt: { [Op.ne]: null } },
                {
                    [Op.or]: [
                        { lastOutgoingMessageAt: null },
                        sequelize.where(
                            sequelize.col('lastIncomingMessageAt'),
                            Op.gt,
                            sequelize.col('lastOutgoingMessageAt')
                        ),
                    ],
                },
            ]);
        }

        // سیاست دسترسی لیست + مخفی‌سازی از کارکنان (+ اعطای دسترسی)
        // پیش‌فرض: مکالمات قفل‌شده در لیست نیستند؛ آرشیو/محدود برای ادمین جداست
        const viewingArchived =
            status === 'archived' || archived === '1' || archived === 'true';
        const includeHidden =
            req.query.includeHidden === '1' ||
            req.query.includeHidden === 'true' ||
            viewingArchived;
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
                      { phone: { [Op.like]: '%' + normalizedSearch + '%' } },
                  ],
              }
            : null;
        const include = [
            {
                model: Customer,
                as: 'customer',
                attributes: ['id', 'name', 'phone', 'profilePic', 'isRestrictedFromStaff'],
                ...(customerSearchWhere ? { where: customerSearchWhere, required: true } : {}),
            },
            { model: User, as: 'assignee', attributes: ['id', 'name', 'avatar'] },
            { model: Branch, as: 'branch', attributes: ['id', 'name', 'city'], required: false },
            {
                model: Department,
                as: 'department',
                attributes: ['id', 'name', 'color'],
                required: false,
            },
        ];

        // لیست عادی: مشتری محدودشده فقط با اعطا دیده شود (هم‌تراز canAccessConversation)
        if (!hiddenOnly && !includeHidden) {
            const grants = await getUserGrantSets(req.userId);
            const grantedIds = grantedCustomerIdList(grants);
            const restrictOr = [{ isRestrictedFromStaff: false }];
            if (grantedIds.length) restrictOr.push({ id: { [Op.in]: grantedIds } });
            const cust = include[0];
            cust.required = true;
            cust.where = cust.where
                ? { [Op.and]: [cust.where, { [Op.or]: restrictOr }] }
                : { [Op.or]: restrictOr };
        }

        const { page: p, limit: l, offset } = parsePagination(page, limit, 100);
        const { rows, count } = await Conversation.findAndCountAll({
            where,
            include,
            distinct: true,
            order: [['lastMessageAt', 'DESC']],
            limit: l,
            offset,
        });
        // شمارش‌های تجمیعی برای UI (بر اساس همان فیلترهای فعلی)
        const [openCount, unreadCountRaw] = await Promise.all([
            Conversation.count({
                where: { ...where, status: 'open' },
                include: customerSearchWhere
                    ? [
                          {
                              model: Customer,
                              as: 'customer',
                              attributes: [],
                              where: customerSearchWhere,
                              required: true,
                          },
                      ]
                    : undefined,
                distinct: true,
                col: 'id',
            }),
            Conversation.sum('unreadCount', {
                where,
                include: customerSearchWhere
                    ? [
                          {
                              model: Customer,
                              as: 'customer',
                              attributes: [],
                              where: customerSearchWhere,
                              required: true,
                          },
                      ]
                    : undefined,
            }),
        ]);
        res.json({
            data: redactConversationList(rows, req.user),
            total: count,
            page: p,
            openCount: Number(openCount) || 0,
            unreadCount: Number(unreadCountRaw) || 0,
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
        if (!req.canAccess('conversations'))
            return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        const { messageId, customerId } = req.body || {};
        if (!isValidUUID(messageId))
            return res.status(400).json({ error: 'شناسه پیام نامعتبر است' });
        if (!isValidUUID(customerId))
            return res.status(400).json({ error: 'شناسه مشتری نامعتبر است' });

        const sourceMsg = await Message.findByPk(messageId, {
            include: [
                {
                    model: Conversation,
                    as: 'conversation',
                    include: [{ model: Customer, as: 'customer' }],
                },
            ],
        });
        if (!sourceMsg || !sourceMsg.conversation)
            return res.status(404).json({ error: 'پیام یافت نشد' });
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
                mimetype:
                    md.mimetype ||
                    (isVoice ? 'audio/ogg; codecs=opus' : 'application/octet-stream'),
                type: isVoice
                    ? 'audio'
                    : ['image', 'video', 'audio', 'document'].includes(srcType)
                      ? srcType
                      : 'document',
                sendAsVoice: !!isVoice,
            };
            if (/^voice\.(webm|ogg|m4a|mp3|wav)$/i.test(content)) content = '';
            else if (content === md.filename || content === 'file' || content === '📎 فایل')
                content = '';
        }
        if (!content && !media)
            return res.status(400).json({ error: 'این پیام محتوای قابل فوروارد ندارد' });

        const sourceCustomer = sourceMsg.conversation.customer;
        const targetCustomerName = customer.name || customer.phone || '';
        const forwardedByName =
            getUserWhatsAppSenderName(req.user) ||
            [req.user.firstName, req.user.lastName].filter(Boolean).join(' ').trim() ||
            req.user.name ||
            req.user.username ||
            '';
        const metadata = {
            forwardedFrom: {
                messageId: sourceMsg.id,
                conversationId: sourceMsg.conversationId,
                customerId: sourceMsg.customerId,
                customerName: sourceCustomer
                    ? sourceCustomer.name || sourceCustomer.phone || ''
                    : '',
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

        const result = await deliverOutboundConversationMessage(req, targetConv, {
            content,
            media,
            metadata,
        });
        if (result.error)
            return res
                .status(result.status || 500)
                .json({ error: result.error, message: result.msg });
        await emitConversationNewMessage(req, targetConv, result.msg);
        res.json({
            ok: true,
            message: result.msg,
            conversation: { id: targetConv.id, customerId: targetConv.customerId },
        });
    } catch (err) {
        next(err);
    }
});

// ——— مالک خط واتساپ موبایل (برای نمایش فرستندهٔ پیام‌های غیر CRM)
router.get('/mobile-wa-sender', async (req, res, next) => {
    try {
        if (!req.canAccess('conversations'))
            return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        const {
            loadMobileWhatsappUser,
            serializeMobileWhatsappUser,
        } = require('../lib/resolveMobileWhatsappUser');
        const user = await loadMobileWhatsappUser(req.app.get('logger') || logger);
        res.json({ user: serializeMobileWhatsappUser(user) });
    } catch (err) {
        next(err);
    }
});

// ——— جزئیات یک مکالمه
router.get('/:id', async (req, res, next) => {
    try {
        if (!req.canAccess('conversations'))
            return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        if (!isValidUUID(req.params.id))
            return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const conversation = await Conversation.findByPk(req.params.id, {
            include: conversationDetailInclude,
        });
        if (!conversation) return res.status(404).json({ error: 'مکالمه یافت نشد' });
        if (!(await canAccessConversation(req, conversation)))
            return res.status(403).json({ error: 'دسترسی به این مکالمه ندارید' });
        if (
            conversation.status === 'archived' &&
            !(req.canViewArchivedConversations && req.canViewArchivedConversations())
        ) {
            return res
                .status(403)
                .json({ error: 'فقط مالک، ادمین و مدیر می‌توانند مکالمات آرشیو شده را ببینند' });
        }
        const meta = conversation.metadata || {};
        const isGroup = !!(
            meta.isGroup ||
            (conversation.customer && String(conversation.customer.phone || '').includes('@g.us'))
        );
        if (!isGroup && conversation.customer) {
            try {
                await maybeRefreshWhatsappCustomerAvatar(conversation.customer);
            } catch (e) {
                logger.warn('conversation avatar refresh', {
                    customerId: conversation.customerId,
                    err: e && e.message,
                });
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
        if (!req.canAccess('conversations'))
            return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        if (!isValidUUID(req.params.id))
            return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const conversation = await Conversation.findByPk(req.params.id, {
            include: [
                { model: Customer, as: 'customer', attributes: ['id', 'phone'], required: false },
            ],
        });
        if (!conversation) return res.status(404).json({ error: 'مکالمه یافت نشد' });
        if (!(await canAccessConversation(req, conversation)))
            return res.status(403).json({ error: 'دسترسی به این مکالمه ندارید' });
        if (
            conversation.status === 'archived' &&
            !(req.canViewArchivedConversations && req.canViewArchivedConversations())
        ) {
            return res
                .status(403)
                .json({ error: 'فقط مالک، ادمین و مدیر می‌توانند مکالمات آرشیو شده را ببینند' });
        }
        // pagination: پیش‌فرض آخرین ۱۰۰ پیام، با before برای بارگذاری پیام‌های قدیمی‌تر
        const pageLimit = Math.min(parseInt(req.query.limit) || 100, 200);
        const beforeId = req.query.before || null;
        const msgWhere = { conversationId: req.params.id };
        if (beforeId) {
            const { isValidUUID } = require('../lib/validation');
            if (!isValidUUID(beforeId))
                return res.status(400).json({ error: 'شناسه پیام (before) نامعتبر است' });
            // UUIDv4 ترتیب زمانی ندارد؛ پیام مرجع را می‌گیریم و صفحه‌بندی را روی timestamp انجام می‌دهیم.
            const beforeMsg = await Message.findOne({
                where: { id: beforeId, conversationId: req.params.id },
                attributes: ['id', 'timestamp'],
            });
            if (!beforeMsg || !beforeMsg.timestamp) {
                return res.status(404).json({ error: 'پیام مرجع برای صفحه‌بندی یافت نشد' });
            }
            msgWhere[Op.or] = [
                { timestamp: { [Op.lt]: beforeMsg.timestamp } },
                {
                    [Op.and]: [
                        { timestamp: beforeMsg.timestamp },
                        { id: { [Op.lt]: beforeMsg.id } },
                    ],
                },
            ];
        }
        const total = await Message.count({ where: { conversationId: req.params.id } });
        const messages = await Message.findAll({
            where: msgWhere,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: [
                        'id',
                        'name',
                        'username',
                        'avatar',
                        'firstName',
                        'lastName',
                        'whatsappSenderName',
                    ],
                    required: false,
                },
            ],
            order: [['timestamp', 'DESC']],
            limit: pageLimit,
        });
        // برگشت به ترتیب صعودی برای نمایش صحیح در UI
        messages.reverse();
        // برای چت گروهی: اگر پیام‌هایی senderId دارند ولی senderName ندارند، از Gateway لیست اعضا را بگیر و نام را پر کن
        const meta = conversation.metadata || {};
        const isGroup =
            meta.isGroup ||
            (conversation.customer && String(conversation.customer.phone || '').includes('@g.us'));
        if (isGroup && conversation.customer && conversation.customer.phone) {
            const needResolve = messages.some(
                (m) => m.direction === 'incoming' && m.metadata?.senderId && !m.metadata?.senderName
            );
            if (needResolve) {
                try {
                    const { gatewayGet } = require('../lib/gatewayClient');
                    const groupId = String(conversation.customer.phone).trim();
                    const gwRes = await gatewayGet(
                        '/api/chats/groups/' + encodeURIComponent(groupId) + '/participants',
                        { timeout: 10000 }
                    );
                    const participants = gwRes?.data?.participants || [];
                    const idToName = {};
                    for (const p of participants) {
                        if (p.name && p.id) idToName[String(p.id)] = p.name;
                    }
                    for (const m of messages) {
                        if (
                            m.direction === 'incoming' &&
                            m.metadata?.senderId &&
                            !m.metadata?.senderName
                        ) {
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
        const {
            loadMobileWhatsappUser,
            applyMobileWhatsappSenderToMessages,
            serializeMobileWhatsappUser,
        } = require('../lib/resolveMobileWhatsappUser');
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
        if (!req.canAccess('conversations'))
            return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        if (!isValidUUID(req.params.id))
            return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const conversation = await Conversation.findByPk(req.params.id);
        if (!conversation) return res.status(404).json({ error: 'مکالمه یافت نشد' });
        if (!(await canAccessConversation(req, conversation)))
            return res.status(403).json({ error: 'دسترسی به این مکالمه ندارید' });
        if (
            conversation.status === 'archived' &&
            !(req.canViewArchivedConversations && req.canViewArchivedConversations())
        ) {
            return res
                .status(403)
                .json({ error: 'فقط مالک، ادمین و مدیر می‌توانند مکالمات آرشیو شده را ببینند' });
        }
        // Use SQL aggregation instead of loading all messages into memory
        const convId = req.params.id;
        const [counts, firstIncoming, responderRows] = await Promise.all([
            // Total and outgoing counts
            Message.findAll({
                where: { conversationId: convId },
                attributes: ['direction', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']],
                group: ['direction'],
                raw: true,
            }),
            // First incoming message timestamp
            Message.findOne({
                where: {
                    conversationId: convId,
                    direction: 'incoming',
                    timestamp: { [Op.ne]: null },
                },
                attributes: ['timestamp'],
                order: [['timestamp', 'ASC']],
                raw: true,
            }),
            // Distinct responders (users who sent outgoing messages)
            Message.findAll({
                where: { conversationId: convId, direction: 'outgoing', userId: { [Op.ne]: null } },
                attributes: [
                    'userId',
                    [sequelize.fn('MIN', sequelize.col('timestamp')), 'firstAt'],
                ],
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: [
                            'id',
                            'name',
                            'username',
                            'avatar',
                            'firstName',
                            'lastName',
                            'whatsappSenderName',
                        ],
                        required: false,
                    },
                ],
                group: ['userId', 'user.id', 'user.name', 'user.username', 'user.avatar'],
                order: [[sequelize.fn('MIN', sequelize.col('timestamp')), 'ASC']],
                raw: false,
            }),
        ]);
        // First outgoing message timestamp AFTER first incoming
        const firstOutgoing = firstIncoming?.timestamp
            ? await Message.findOne({
                  where: {
                      conversationId: convId,
                      direction: 'outgoing',
                      timestamp: { [Op.gte]: firstIncoming.timestamp },
                  },
                  attributes: ['timestamp'],
                  order: [['timestamp', 'ASC']],
                  raw: true,
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

        const responders = responderRows.map((m) => ({
            id: m.userId,
            name: (m.user && (m.user.name || m.user.username)) || '—',
        }));

        res.json({
            firstResponseTimeMin,
            firstIncomingAt: firstIncomingAt ? firstIncomingAt.toISOString() : null,
            firstOutgoingAt: firstOutgoingAt ? firstOutgoingAt.toISOString() : null,
            responders,
            messageCount,
            outgoingCount,
            unreadCount: conversation.unreadCount || 0,
        });
    } catch (err) {
        next(err);
    }
});

// ——— به‌روزرسانی مکالمه (تخصیص، وضعیت، اولویت، بستن، موضوع، خوانده‌شدن)
router.patch('/:id', async (req, res, next) => {
    try {
        if (!req.canAccess('conversations'))
            return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        if (!isValidUUID(req.params.id))
            return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const conversation = await Conversation.findByPk(req.params.id, {
            include: [
                { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'] },
                { model: User, as: 'assignee', attributes: ['id', 'name', 'avatar'] },
            ],
        });
        if (!conversation) return res.status(404).json({ error: 'مکالمه یافت نشد' });
        if (!(await canAccessConversation(req, conversation)))
            return res.status(403).json({ error: 'دسترسی به این مکالمه ندارید' });

        const {
            assignedTo,
            departmentId,
            branchId,
            status,
            priority,
            subject,
            markRead,
            rating,
            feedback,
            isHiddenFromStaff,
        } = req.body;
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
                updateData.assignedTo = canAssignSelf ? req.userId : assignedTo || null;
                updateData.assignedAt = updateData.assignedTo ? new Date() : null;
            }
        }
        if (
            !canManage &&
            Object.keys(updateData).length === 0 &&
            (departmentId !== undefined ||
                branchId !== undefined ||
                status !== undefined ||
                priority !== undefined ||
                subject !== undefined)
        ) {
            return res
                .status(403)
                .json({ error: 'فقط مدیر یا ادمین می‌تواند تخصیص و وضعیت مکالمه را تغییر دهد' });
        }
        if (
            !canManage &&
            (departmentId !== undefined ||
                branchId !== undefined ||
                status !== undefined ||
                priority !== undefined ||
                subject !== undefined)
        ) {
            return res
                .status(403)
                .json({ error: 'فقط مدیر یا ادمین می‌تواند وضعیت و اولویت را تغییر دهد' });
        }
        if (canManage && departmentId !== undefined) updateData.departmentId = departmentId || null;
        if (
            canManage &&
            branchId !== undefined &&
            (isMainAdmin(req.user) ||
                req.user.role === 'owner' ||
                req.user.role === 'admin' ||
                req.user.role === 'manager')
        )
            updateData.branchId = branchId || null;
        const VALID_CONV_STATUSES = ['open', 'pending', 'closed', 'resolved', 'archived'];
        if (canManage && status !== undefined) {
            if (!VALID_CONV_STATUSES.includes(status)) {
                return res.status(400).json({ error: 'وضعیت مکالمه نامعتبر است' });
            }
            if (status === 'archived' && !canArchiveOrDeleteConversation(req)) {
                return res.status(403).json({
                    error: 'فقط مالک مجموعه (بالاترین سطح دسترسی) می‌تواند مکالمه را آرشیو کند',
                });
            }
            updateData.status = status;
            if (status === 'closed' || status === 'resolved' || status === 'archived') {
                updateData.closedAt = new Date();
                updateData.closedBy = req.userId;
            }
        }
        if (canManage && priority !== undefined) updateData.priority = priority;
        if (canManage && subject !== undefined) updateData.subject = subject;
        if (rating !== undefined && Number(rating) >= 1 && Number(rating) <= 5)
            updateData.rating = Math.round(Number(rating));
        if (feedback !== undefined) updateData.feedback = String(feedback || '').trim() || null;
        if (isHiddenFromStaff !== undefined) {
            if (!(req.canViewHiddenConversations && req.canViewHiddenConversations())) {
                return res.status(403).json({
                    error: 'فقط مالک یا ادمین می‌تواند مکالمه را از دید کارکنان مخفی کند',
                });
            }
            updateData.isHiddenFromStaff =
                isHiddenFromStaff === true || isHiddenFromStaff === 'true';
        }

        const prevDeptIdBeforeUpdate = conversation.departmentId
            ? String(conversation.departmentId)
            : null;

        await conversation.update(updateData);

        if (assignedTo !== undefined && updateData.assignedTo) {
            await logActivity({
                userId: req.userId,
                branchId: conversation.branchId || req.user.branchId,
                departmentId:
                    updateData.departmentId || conversation.departmentId || req.user.departmentId,
                action: 'conversation_assigned',
                entityType: 'conversation',
                entityId: conversation.id,
                customerId: conversation.customerId,
                summary: `مکالمه به کاربر تخصیص داده شد`,
                metadata: {
                    conversationId: conversation.id,
                    assignedTo: updateData.assignedTo,
                    customerPhone: conversation.customer && conversation.customer.phone,
                },
            });
            // ارسال ایمیل اطلاع‌رسانی به کاربر تخصیص‌یافته
            if (String(updateData.assignedTo) !== String(req.userId)) {
                setImmediate(async () => {
                    try {
                        const emailService = require('../services/emailService');
                        const {
                            getPanelSettings,
                            getPanelEmailConfig,
                        } = require('../services/panelSettingsLoader');
                        const { NotificationPreference } = require('../models');
                        const assignee = await User.findByPk(updateData.assignedTo, {
                            attributes: ['id', 'name', 'email'],
                        });
                        if (!assignee || !assignee.email) return;
                        const [pref, settings] = await Promise.all([
                            NotificationPreference.findOne({ where: { userId: assignee.id } }),
                            getPanelSettings(),
                        ]);
                        if (pref && pref.ticketAssignedEmailEnabled === false) return;
                        const emailConfig = getPanelEmailConfig(settings);
                        const customerName = conversation.customer
                            ? conversation.customer.name || conversation.customer.phone
                            : '';
                        const assignerName = req.user ? req.user.name || req.user.email : null;
                        await emailService.sendConversationAssigned(
                            assignee,
                            conversation,
                            customerName,
                            assignerName,
                            emailConfig && emailConfig.host ? emailConfig : null
                        );
                    } catch (_) {}
                });
            }
        }
        if (departmentId !== undefined && updateData.departmentId !== undefined) {
            const newDeptId = updateData.departmentId ? String(updateData.departmentId) : null;
            const deptChanged = prevDeptIdBeforeUpdate !== newDeptId;
            if (updateData.departmentId && deptChanged) {
                const dept = await Department.findByPk(updateData.departmentId);
                const convForDept = await Conversation.findByPk(req.params.id, {
                    include: [{ model: Department, as: 'department' }],
                });
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
                    metadata: {
                        conversationId: conversation.id,
                        departmentId: updateData.departmentId,
                        customerPhone: conversation.customer && conversation.customer.phone,
                    },
                });
            }
        }
        // اطلاع‌رسانی پایان گفتگو به مشتری هنگام بسته/حل‌شدن مکالمه (و پاک‌کردن پرچم هنگام بازشدن مجدد)
        if (canManage && status !== undefined && updateData.status) {
            const END_STATUSES = ['closed', 'resolved'];
            const wasEnded = END_STATUSES.includes(prevStatus);
            const isEnded = END_STATUSES.includes(updateData.status);
            if (isEnded && !wasEnded) {
                try {
                    await sendConversationEndedMessage(conversation.id);
                } catch (_) {}
            } else if (
                !isEnded &&
                wasEnded &&
                (updateData.status === 'open' || updateData.status === 'pending')
            ) {
                try {
                    await clearConversationEndedFlag(conversation.id);
                } catch (_) {}
            }
        }

        const updated = await Conversation.findByPk(req.params.id, {
            include: [
                {
                    model: Customer,
                    as: 'customer',
                    attributes: ['id', 'name', 'phone', 'profilePic'],
                },
                { model: User, as: 'assignee', attributes: ['id', 'name', 'avatar'] },
                {
                    model: Branch,
                    as: 'branch',
                    attributes: ['id', 'name', 'city'],
                    required: false,
                },
                {
                    model: Department,
                    as: 'department',
                    attributes: ['id', 'name', 'color'],
                    required: false,
                },
            ],
        });
        res.json(redactConversationPhones(updated, req.user));
    } catch (err) {
        next(err);
    }
});

// ——— آرشیو مکالمه (حذف سخت پیام‌ها ممنوع است — فقط مالک/ادمین اصلی)
router.delete('/:id', async (req, res, next) => {
    try {
        if (!canArchiveOrDeleteConversation(req)) {
            return res.status(403).json({
                error: 'فقط مالک مجموعه یا ادمین اصلی می‌تواند مکالمه را از لیست فعال خارج کند',
            });
        }
        if (!req.canAccess('conversations'))
            return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        if (!isValidUUID(req.params.id))
            return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const conversation = await Conversation.findByPk(req.params.id);
        if (!conversation) return res.status(404).json({ error: 'مکالمه یافت نشد' });

        // پیام‌ها هرگز destroy نمی‌شوند — فقط آرشیو + مخفی از لیست عادی کارکنان
        const meta = Object.assign({}, conversation.metadata || {}, {
            softRemovedAt: new Date().toISOString(),
            softRemovedBy: req.userId || null,
        });
        await conversation.update({
            status: 'archived',
            isHiddenFromStaff: true,
            unreadCount: 0,
            metadata: meta,
        });

        try {
            await logActivity({
                userId: req.userId,
                action: 'conversation_archived',
                entityType: 'conversation',
                entityId: conversation.id,
                customerId: conversation.customerId || null,
                summary: 'مکالمه آرشیو شد (پیام‌ها حفظ شدند)',
                metadata: { softRemove: true },
            });
        } catch (_) {}

        res.json({
            ok: true,
            archived: true,
            messagesPreserved: true,
            message: 'مکالمه آرشیو شد. پیام‌ها حذف نشدند و در سیستم باقی ماندند.',
        });
    } catch (err) {
        next(err);
    }
});

// ——— علامت‌گذاری به‌عنوان خوانده‌شده
router.post('/:id/read', async (req, res, next) => {
    try {
        if (!req.canAccess('conversations'))
            return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        if (!isValidUUID(req.params.id))
            return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const conversation = await Conversation.findByPk(req.params.id);
        if (!conversation) return res.status(404).json({ error: 'مکالمه یافت نشد' });
        if (!(await canAccessConversation(req, conversation)))
            return res.status(403).json({ error: 'دسترسی به این مکالمه ندارید' });
        await conversation.update({ unreadCount: 0 });
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

// ——— ارسال پیام (متن یا فایل/عکس)
router.post('/:id/send', async (req, res, next) => {
    try {
        if (!req.canAccess('conversations'))
            return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        if (!isValidUUID(req.params.id))
            return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const conversation = await Conversation.findByPk(req.params.id, {
            include: [
                { model: Customer, as: 'customer' },
                { model: Department, as: 'department', required: false },
            ],
        });
        if (!conversation) return res.status(404).json({ error: 'مکالمه یافت نشد' });
        if (!(await canAccessConversation(req, conversation)))
            return res.status(403).json({ error: 'دسترسی به این مکالمه ندارید' });
        const content = safeString(req.body.content, 10000);
        const media = req.body.media || null;
        const replyTo = req.body.replyTo || null;
        if (!content && !media)
            return res.status(400).json({ error: 'متن پیام یا فایل الزامی است' });
        const result = await deliverOutboundConversationMessage(req, conversation, {
            content,
            media,
            replyTo,
        });
        if (result.error) {
            return res.status(result.status || 500).json({
                error: result.error,
                messageId: result.msg && result.msg.id ? result.msg.id : undefined,
            });
        }
        let emitConv = conversation;
        if (result.conversationId && result.conversationId !== conversation.id) {
            const live = await Conversation.findByPk(result.conversationId, {
                include: [
                    { model: Customer, as: 'customer' },
                    { model: Department, as: 'department', required: false },
                ],
            });
            if (live) emitConv = live;
        }
        await emitConversationNewMessage(req, emitConv, result.msg);
        const payload = result.msg && result.msg.toJSON ? result.msg.toJSON() : result.msg;
        res.json(Object.assign({}, payload, { conversationId: emitConv.id }));
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
        if (!req.canAccess('conversations'))
            return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        if (!isValidUUID(req.params.id))
            return res.status(400).json({ error: 'شناسه نامعتبر است' });
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
        const status = err.response?.status;
        const gwMsg = err.response?.data?.error || err.response?.data?.message || err.message;
        if (status === 503 || status === 502 || status === 504) {
            return res.status(503).json({
                error: gwMsg || 'Gateway واتساپ آماده نیست. اتصال را در تنظیمات بررسی کنید.',
            });
        }
        if (status === 400) {
            return res.status(400).json({ error: gwMsg || 'درخواست تماس نامعتبر است' });
        }
        if (
            err.code === 'ECONNREFUSED' ||
            err.code === 'ENOTFOUND' ||
            err.code === 'ECONNABORTED'
        ) {
            return res.status(503).json({ error: 'Gateway در دسترس نیست' });
        }
        // خطای کنترل‌شده تماس — 5xx اسپایک نساز
        const logger = require('../config/logger');
        logger.warn('wa call endpoint failed', {
            conversationId: req.params.id,
            error: err.message,
            status: status || null,
        });
        return res.status(503).json({
            error: gwMsg || 'تماس واتساپ انجام نشد. چند ثانیه بعد دوباره تلاش کنید.',
        });
    }
});

module.exports = router;

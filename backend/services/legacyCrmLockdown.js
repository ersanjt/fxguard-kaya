/**
 * قفل دادهٔ CRM قبلی پس از تعویض شماره واتساپ:
 * همهٔ مکالمات → آرشیو + مخفی از کارکنان
 * مشتریان → محدود؛ فقط ادمین سطح بالا (و اعطای صریح) می‌بینند
 */
const { Op } = require('sequelize');
const { Conversation, Customer, WhatsappConnection } = require('../models');
const logger = require('../config/logger');

function normalizeLinkedNumber(num) {
    if (num == null) return '';
    return String(num).replace(/\D/g, '').trim();
}

/** آیا شناسه شبیه مخاطب/گروه واتساپ است؟ */
function isWhatsAppIdentity(phone) {
    const p = String(phone || '').trim();
    if (!p) return false;
    if (/@(c\.us|g\.us|s\.whatsapp\.net|lid)\b/i.test(p)) return true;
    const digits = p.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
}

/** گروه زندهٔ شمارهٔ فعلی که حتی اگر لیست Gateway ناقص باشد نباید قفل بماند */
const KEEP_CURRENT_GROUP_RE = /فروش\s*کایا|kaya\s*sales/i;

function isKeepCurrentGroup(conv) {
    const name = `${(conv.customer && conv.customer.name) || ''} ${(conv.metadata && conv.metadata.groupName) || ''}`;
    return KEEP_CURRENT_GROUP_RE.test(name);
}

/** انواع معادل یک chat id برای تطبیق با Customer.phone */
function chatIdVariants(id) {
    const s = String(id || '').trim();
    const out = new Set();
    if (!s) return [];
    out.add(s);
    const lower = s.toLowerCase();
    out.add(lower);
    const digits = s.replace(/\D/g, '');
    if (digits) {
        out.add(digits);
        out.add(`${digits}@c.us`);
        out.add(`${digits}@s.whatsapp.net`);
        out.add(`${digits}@lid`);
        out.add(`${digits}@g.us`);
    }
    // 123@g.us ↔ همان با/بدون پسوند
    const at = lower.indexOf('@');
    if (at > 0) {
        const user = lower.slice(0, at);
        const host = lower.slice(at + 1);
        out.add(user);
        if (host) out.add(`${user}@${host}`);
        const userDigits = user.replace(/\D/g, '');
        if (userDigits && userDigits !== user) {
            out.add(userDigits);
            out.add(`${userDigits}@${host}`);
        }
    }
    return [...out];
}

/**
 * همهٔ مکالمات فعلی را آرشیو و از کارکنان مخفی می‌کند؛ مشتریان را محدود می‌کند.
 */
async function lockdownExistingCrmData({ reason, before } = {}) {
    const convWhere = { id: { [Op.ne]: null } };
    const custWhere = { id: { [Op.ne]: null }, isRestrictedFromStaff: false };
    if (before) {
        convWhere.createdAt = { [Op.lt]: before };
        custWhere.createdAt = { [Op.lt]: before };
    }
    const [convResult, custResult] = await Promise.all([
        Conversation.update(
            { isHiddenFromStaff: true, status: 'archived' },
            { where: convWhere }
        ),
        Customer.update(
            { isRestrictedFromStaff: true },
            { where: custWhere }
        ),
    ]);
    const conversationsUpdated = Array.isArray(convResult) ? convResult[0] : convResult;
    const customersUpdated = Array.isArray(custResult) ? custResult[0] : custResult;
    const archived = await Conversation.count({
        where: { status: 'archived', isHiddenFromStaff: true },
    });
    logger.info('Legacy CRM lockdown applied (archived + hidden)', {
        reason: reason || 'manual',
        conversationsUpdated,
        customersUpdated,
        archived,
    });
    return { conversationsUpdated, customersUpdated, archived };
}

/**
 * «نمایش همه شماره‌ها» عمداً حذف شد. این تابع همان تفکیک شمارهٔ فعلی است
 * تا دکمهٔ قدیمی پنل هم دادهٔ شمارهٔ قبلی را دوباره به لیست عادی نیاورد.
 */
async function restoreLegacyCrmVisibility({ reason } = {}) {
    logger.warn('restoreLegacyCrmVisibility refused — enforcing current-number inbox instead', {
        reason: reason || 'manual',
    });
    const live = await loadGatewayChatIdsAndNumber();
    return enforceCurrentNumberInbox(live.chatIds, live.number, {
        reason: reason || 'restore_legacy_redirected_to_enforce',
    });
}

/**
 * چت‌های روی لیست فعلی Gateway را در مکالمات فعال باز می‌کند.
 * مکالمات واتساپیِ خارج از آن لیست (شمارهٔ قبلی) آرشیو/محدود می‌مانند.
 */
async function applyVisibilityForCurrentGatewayChats(chatIds, gatewayNumber, opts = {}) {
    const gw = normalizeLinkedNumber(gatewayNumber);
    const ids = Array.isArray(chatIds) ? chatIds.filter(Boolean) : [];
    const archiveMissing = opts.archiveMissing !== false;
    const keepProtectedGroups = opts.keepProtectedGroups !== false;

    // بدون لیست واقعی، فقط گروه محافظت‌شده را باز کن — بقیه را از آرشیو درنیاور
    if (ids.length === 0 && !keepProtectedGroups) {
        logger.warn('applyVisibility skipped — empty Gateway chat list', {
            gatewayNumber: gw || null,
        });
        return {
            opened: 0,
            archived: 0,
            unrestricted: 0,
            restricted: 0,
            allowedCount: 0,
            skipped: true,
        };
    }

    const allowed = new Set();
    for (const id of ids) {
        for (const v of chatIdVariants(id)) allowed.add(String(v).toLowerCase());
    }

    const convs = await Conversation.findAll({
        where: { status: { [Op.ne]: 'closed' } },
        include: [
            {
                model: Customer,
                as: 'customer',
                required: true,
                attributes: ['id', 'phone', 'name', 'isRestrictedFromStaff'],
            },
        ],
        attributes: ['id', 'status', 'isHiddenFromStaff', 'customerId', 'metadata'],
        limit: 8000,
    });

    const openIds = [];
    const archiveIds = [];
    const restrictCust = new Set();
    const unrestrictCust = new Set();

    for (const conv of convs) {
        const phone = String(conv.customer?.phone || '');
        if (!isWhatsAppIdentity(phone)) continue;

        const variants = chatIdVariants(phone);
        const onList = variants.some((v) => allowed.has(String(v).toLowerCase()));
        const onCurrent = onList || (keepProtectedGroups && isKeepCurrentGroup(conv));

        if (onCurrent) {
            if (conv.status === 'archived' || conv.isHiddenFromStaff) {
                openIds.push(conv.id);
            }
            if (conv.customer && conv.customer.isRestrictedFromStaff) {
                unrestrictCust.add(conv.customer.id);
            }
            continue;
        }
        if (!archiveMissing) continue;
        if (conv.status !== 'archived' || !conv.isHiddenFromStaff) {
            archiveIds.push(conv.id);
        }
        if (conv.customer && !conv.customer.isRestrictedFromStaff) {
            restrictCust.add(conv.customer.id);
        }
    }

    const chunked = async (Model, values, idList, size = 250) => {
        for (let i = 0; i < idList.length; i += size) {
            const slice = idList.slice(i, i + size);
            await Model.update(values, { where: { id: { [Op.in]: slice } } });
        }
    };

    if (openIds.length) {
        await chunked(
            Conversation,
            { status: 'open', isHiddenFromStaff: false, closedAt: null },
            openIds
        );
    }
    if (archiveIds.length) {
        await chunked(
            Conversation,
            { status: 'archived', isHiddenFromStaff: true },
            archiveIds
        );
    }
    if (restrictCust.size) {
        await chunked(Customer, { isRestrictedFromStaff: true }, [...restrictCust]);
    }
    if (unrestrictCust.size) {
        await chunked(Customer, { isRestrictedFromStaff: false }, [...unrestrictCust]);
    }

    logger.info('Applied visibility for current Gateway chats', {
        gatewayNumber: gw || null,
        allowedCount: ids.length,
        opened: openIds.length,
        archived: archiveIds.length,
        unrestricted: unrestrictCust.size,
        restricted: restrictCust.size,
        archiveMissing,
    });
    return {
        opened: openIds.length,
        archived: archiveIds.length,
        unrestricted: unrestrictCust.size,
        restricted: restrictCust.size,
        allowedCount: ids.length,
    };
}

function normalizeChatIdList(payload) {
    const chats = payload?.chats || payload?.data?.chats || null;
    if (Array.isArray(chats) && chats.length) {
        return chats.map((c) => (c.id || '').toString().trim()).filter(Boolean);
    }
    const groups = payload?.groups || payload?.data?.groups || [];
    return (groups || []).map((g) => (g.id || '').toString().trim()).filter(Boolean);
}

async function collectCandidateChatPhones() {
    const seen = new Set();
    const out = [];
    const pushPhone = (phone) => {
        const p = String(phone || '').trim();
        if (!p || !isWhatsAppIdentity(p)) return;
        const key = p.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        out.push(p);
    };

    const convs = await Conversation.findAll({
        include: [
            {
                model: Customer,
                as: 'customer',
                required: true,
                attributes: ['phone'],
            },
        ],
        attributes: ['id', 'lastMessageAt'],
        order: [['lastMessageAt', 'DESC']],
        limit: 200,
    });
    for (const conv of convs) pushPhone(conv.customer && conv.customer.phone);

    if (out.length < 80) {
        const customers = await Customer.findAll({
            attributes: ['phone', 'lastContactAt'],
            order: [['lastContactAt', 'DESC']],
            limit: 150,
        });
        for (const cust of customers) pushPhone(cust.phone);
    }
    return out;
}

/** لیست چت زندهٔ Gateway و شمارهٔ متصل */
async function loadGatewayChatIdsAndNumber() {
    try {
        const { gatewayGet, gatewayPost, getWhatsappConnectionConfig } = require('../lib/gatewayClient');
        const cfg = await getWhatsappConnectionConfig();
        let number = '';
        try {
            const st = await gatewayGet('/api/status', { timeout: 10000, cfg });
            number = normalizeLinkedNumber(st?.data?.number);
        } catch (e) {
            logger.warn('loadGatewayChatIdsAndNumber: status failed', { error: e?.message });
        }
        let chatIds = [];
        try {
            const all = await gatewayGet('/api/chats', { timeout: 12000, cfg });
            chatIds = normalizeChatIdList(all.data || {});
        } catch (e) {
            logger.warn('loadGatewayChatIdsAndNumber: /api/chats failed', { error: e?.message });
        }
        if (!chatIds.length) {
            try {
                const phones = await collectCandidateChatPhones();
                if (phones.length) {
                    const resolved = await gatewayPost(
                        '/api/chats/resolve',
                        { ids: phones },
                        { timeout: 100000, cfg }
                    );
                    chatIds = normalizeChatIdList(resolved.data || {});
                    const extra = [];
                    for (const row of resolved.data?.chats || []) {
                        if (row && row.phone) extra.push(String(row.phone));
                        if (row && row.requested) extra.push(String(row.requested));
                    }
                    chatIds = [...new Set([...chatIds, ...extra.filter(Boolean)])];
                    logger.info('loadGatewayChatIdsAndNumber: resolved from current session', {
                        asked: phones.length,
                        found: chatIds.length,
                    });
                }
            } catch (e) {
                logger.warn('loadGatewayChatIdsAndNumber: resolve failed', { error: e?.message });
            }
        }
        return { number, chatIds };
    } catch (e) {
        logger.warn('loadGatewayChatIdsAndNumber failed', { error: e?.message });
        return { number: '', chatIds: [] };
    }
}

/**
 * همه را آرشیو/محدود کن، بعد فقط چت‌های شمارهٔ فعلی Gateway را به لیست عادی برگردان.
 * مشتریان و مکالمات شمارهٔ قبلی فقط در آرشیو (ادمین) می‌مانند.
 */
async function enforceCurrentNumberInbox(chatIds, gatewayNumber, opts = {}) {
    const gw = normalizeLinkedNumber(gatewayNumber);
    const ids = Array.isArray(chatIds) ? chatIds.filter(Boolean) : [];
    if (!ids.length && !opts.forceEmptyLockdown) {
        logger.warn('enforceCurrentNumberInbox skipped — no current-session chats yet', {
            reason: opts.reason || 'enforce_current_number',
            number: gw || null,
        });
        const stats = await getLockdownStats();
        return {
            changed: false,
            skipped: true,
            number: gw || null,
            chatCount: 0,
            lockdown: null,
            visibility: { opened: 0, skipped: true },
            stats,
            conversationsUpdated: 0,
            customersUpdated: 0,
        };
    }
    const lockdown = await lockdownExistingCrmData({
        reason: opts.reason || 'enforce_current_number',
    });

    const row = await getOrCreateConnectionRow();
    if (gw) row.lastLinkedGatewayNumber = gw;
    row.legacyLockdownAt = new Date();
    await row.save();

    const visibility = await applyVisibilityForCurrentGatewayChats(ids, gw, {
        archiveMissing: false,
        keepProtectedGroups: true,
    });
    const stats = await getLockdownStats();
    logger.warn('Enforced current-number inbox — previous WhatsApp data archived', {
        reason: opts.reason || 'enforce_current_number',
        number: gw || null,
        chatCount: ids.length,
        ...lockdown,
        opened: visibility.opened,
        unrestricted: visibility.unrestricted,
        hidden: stats.hiddenConversations,
        restrictedCustomers: stats.restrictedCustomers,
    });
    return {
        changed: true,
        number: gw || null,
        chatCount: ids.length,
        lockdown,
        visibility,
        stats,
        conversationsUpdated: lockdown.conversationsUpdated,
        customersUpdated: lockdown.customersUpdated,
    };
}

async function getOrCreateConnectionRow() {
    const [row] = await WhatsappConnection.findOrCreate({
        where: { id: 'default' },
        defaults: {
            connectionMode: 'cloud_first',
            cloudEnabled: true,
            gatewayEnabled: true,
        },
    });
    return row;
}

async function getLegacyLockdownAt() {
    try {
        const row = await WhatsappConnection.findByPk('default');
        return row && row.legacyLockdownAt ? new Date(row.legacyLockdownAt) : null;
    } catch (_) {
        return null;
    }
}

/** مکالمات/مشتریان ساخته‌شده قبل از cutover که هنوز در لیست عادی‌اند */
async function sweepLeftoverLegacyVisibility(lockdownAt) {
    if (!lockdownAt) return { conversationsUpdated: 0, customersUpdated: 0 };
    const cutAt = new Date(lockdownAt);
    // updatedAt بعد از همگام‌سازی/پیام زنده عوض می‌شود — آن‌ها را دوباره آرشیو نکن
    const [convResult] = await Conversation.update(
        { isHiddenFromStaff: true, status: 'archived' },
        {
            where: {
                createdAt: { [Op.lt]: cutAt },
                updatedAt: { [Op.lt]: cutAt },
                [Op.or]: [{ isHiddenFromStaff: false }, { isHiddenFromStaff: null }],
            },
        }
    );
    const liveRows = await Conversation.findAll({
        where: {
            isHiddenFromStaff: false,
            status: { [Op.ne]: 'archived' },
        },
        attributes: ['customerId'],
        raw: true,
    });
    const keepIds = [...new Set(liveRows.map((r) => r.customerId).filter(Boolean))];
    const custWhere = {
        isRestrictedFromStaff: false,
        createdAt: { [Op.lt]: cutAt },
    };
    if (keepIds.length) custWhere.id = { [Op.notIn]: keepIds };
    const [custResult] = await Customer.update({ isRestrictedFromStaff: true }, { where: custWhere });
    const conversationsUpdated = typeof convResult === 'number' ? convResult : 0;
    const customersUpdated = typeof custResult === 'number' ? custResult : 0;
    if (conversationsUpdated || customersUpdated) {
        logger.warn('Swept leftover pre-cutover CRM rows back to archive', {
            conversationsUpdated,
            customersUpdated,
            cutAt: cutAt.toISOString(),
        });
    }
    return { conversationsUpdated, customersUpdated };
}

let cutoverInflight = null;

/**
 * یک‌بار دادهٔ قبلی را آرشیو/محدود می‌کند و باقیماندهٔ لیست عادی را جارو می‌کند.
 */
async function ensureLegacyCutover(linkedNumber, meta = {}) {
    if (cutoverInflight) return cutoverInflight;
    cutoverInflight = (async () => {
        const number = normalizeLinkedNumber(linkedNumber);
        const row = await getOrCreateConnectionRow();
        const prev = normalizeLinkedNumber(row.lastLinkedGatewayNumber);
        const alreadyCut = !!row.legacyLockdownAt;
        const force = !!(meta && meta.force);

        if (force) {
            const lockdown = await lockdownExistingCrmData({
                reason: meta.reason || 'forced_legacy_cutover',
            });
            if (number) row.lastLinkedGatewayNumber = number;
            row.legacyLockdownAt = new Date();
            await row.save();
            logger.warn('Forced legacy CRM cutover — all current chats/customers archived', {
                number: number || prev || null,
                ...lockdown,
            });
            return { changed: true, forced: true, number: number || prev || null, lockdown };
        }

        if (number && prev && prev !== number) {
            const lockdown = await lockdownExistingCrmData({
                reason: meta.reason || `gateway_number_changed:${prev}->${number}`,
            });
            row.lastLinkedGatewayNumber = number;
            row.legacyLockdownAt = new Date();
            await row.save();
            logger.warn('WhatsApp gateway number changed — legacy CRM data archived and locked', {
                previous: prev,
                number,
                ...lockdown,
            });
            return { changed: true, previous: prev, number, lockdown };
        }

        if (!alreadyCut) {
            const any = await Conversation.count();
            if (any > 0) {
                const before = new Date(Date.now() - 5000);
                const lockdown = await lockdownExistingCrmData({
                    reason: meta.reason || 'legacy_cutover',
                    before,
                });
                if (number) row.lastLinkedGatewayNumber = number;
                row.legacyLockdownAt = before;
                await row.save();
                logger.warn('Legacy CRM cutover — previous chats/customers archived', {
                    number: number || prev || null,
                    ...lockdown,
                });
                return { changed: true, firstCutover: true, number: number || prev || null, lockdown };
            }
            if (number) row.lastLinkedGatewayNumber = number;
            row.legacyLockdownAt = new Date();
            await row.save();
            return { changed: false, firstConnect: !prev, number, lockdown: null };
        }

        const sweep = await sweepLeftoverLegacyVisibility(row.legacyLockdownAt);
        if (number && !prev) {
            row.lastLinkedGatewayNumber = number;
            await row.save();
        }
        return {
            changed: !!(sweep.conversationsUpdated || sweep.customersUpdated),
            swept: true,
            number: number || prev || null,
            lockdown: sweep,
        };
    })().finally(() => {
        cutoverInflight = null;
    });
    return cutoverInflight;
}

async function handleGatewayNumberReady(linkedNumber, meta = {}) {
    if (!normalizeLinkedNumber(linkedNumber)) {
        return { changed: false, lockdown: null };
    }
    const result = await ensureLegacyCutover(linkedNumber, meta);
    if (result.changed) {
        try {
            const live = await loadGatewayChatIdsAndNumber();
            const visibility = await applyVisibilityForCurrentGatewayChats(
                live.chatIds,
                normalizeLinkedNumber(linkedNumber) || live.number,
                { archiveMissing: false, keepProtectedGroups: true }
            );
            result.visibility = visibility;
        } catch (e) {
            logger.warn('handleGatewayNumberReady: could not reopen current-number chats', {
                error: e?.message,
            });
        }
    }
    return result;
}

async function getLockdownStats() {
    const [
        hiddenConversations,
        archivedHidden,
        restrictedCustomers,
        totalCustomers,
        totalConversations,
    ] = await Promise.all([
        Conversation.count({ where: { isHiddenFromStaff: true } }),
        Conversation.count({ where: { status: 'archived', isHiddenFromStaff: true } }),
        Customer.count({ where: { isRestrictedFromStaff: true } }),
        Customer.count(),
        Conversation.count(),
    ]);
    return {
        hiddenConversations,
        archivedHidden,
        restrictedCustomers,
        totalCustomers,
        totalConversations,
    };
}

/**
 * فقط گروه محافظت‌شدهٔ شمارهٔ فعلی را باز کن — هرگز همهٔ @g.us (شمارهٔ قبلی) را به All نیاور.
 */
async function promoteExistingGroupConversations(gatewayNumber) {
    const gw = normalizeLinkedNumber(gatewayNumber);
    const convs = await Conversation.findAll({
        where: { status: { [Op.ne]: 'closed' } },
        include: [
            {
                model: Customer,
                as: 'customer',
                required: true,
                attributes: ['id', 'phone', 'name', 'isRestrictedFromStaff'],
            },
        ],
        attributes: ['id', 'status', 'isHiddenFromStaff', 'customerId', 'metadata'],
        limit: 8000,
    });

    const openIds = [];
    const unrestrictCust = new Set();
    for (const conv of convs) {
        const phone = String(conv.customer?.phone || '');
        const meta = conv.metadata || {};
        const isGroup = !!meta.isGroup || /@g\.us$/i.test(phone);
        if (!isGroup || !isKeepCurrentGroup(conv)) continue;
        if (conv.status === 'archived' || conv.isHiddenFromStaff) {
            openIds.push(conv.id);
        }
        if (conv.customer && conv.customer.isRestrictedFromStaff) {
            unrestrictCust.add(conv.customer.id);
        }
        const nextMeta = {
            ...meta,
            isGroup: true,
            groupName: meta.groupName || conv.customer?.name || null,
            linkedGatewayNumber: gw || meta.linkedGatewayNumber || null,
        };
        const metaChanged = JSON.stringify(meta) !== JSON.stringify(nextMeta);
        if (metaChanged) {
            await conv.update({ metadata: nextMeta });
        }
    }

    const chunked = async (Model, values, idList, size = 250) => {
        for (let i = 0; i < idList.length; i += size) {
            const slice = idList.slice(i, i + size);
            await Model.update(values, { where: { id: { [Op.in]: slice } } });
        }
    };
    if (openIds.length) {
        await chunked(
            Conversation,
            { status: 'open', isHiddenFromStaff: false, closedAt: null },
            openIds
        );
    }
    if (unrestrictCust.size) {
        await chunked(Customer, { isRestrictedFromStaff: false }, [...unrestrictCust]);
    }

    logger.info('Promoted existing WhatsApp group conversations', {
        gatewayNumber: gw || null,
        opened: openIds.length,
        unrestricted: unrestrictCust.size,
        scanned: convs.length,
    });
    return {
        opened: openIds.length,
        unrestricted: unrestrictCust.size,
        scanned: convs.length,
    };
}

module.exports = {
    lockdownExistingCrmData,
    restoreLegacyCrmVisibility,
    applyVisibilityForCurrentGatewayChats,
    promoteExistingGroupConversations,
    enforceCurrentNumberInbox,
    loadGatewayChatIdsAndNumber,
    collectCandidateChatPhones,
    ensureLegacyCutover,
    getLegacyLockdownAt,
    handleGatewayNumberReady,
    getLockdownStats,
    normalizeLinkedNumber,
    chatIdVariants,
    isWhatsAppIdentity,
};

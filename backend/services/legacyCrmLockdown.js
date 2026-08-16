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
 * بازگردانی دیده‌شدن همهٔ مکالمات/مشتریان قفل‌شده (فقط دستی از پنل — همه شماره‌ها).
 */
async function restoreLegacyCrmVisibility({ reason } = {}) {
    const [convHidden, custResult] = await Promise.all([
        Conversation.update(
            {
                isHiddenFromStaff: false,
                status: 'open',
                closedAt: null,
            },
            { where: { isHiddenFromStaff: true } }
        ),
        Customer.update(
            { isRestrictedFromStaff: false },
            { where: { isRestrictedFromStaff: true } }
        ),
    ]);

    const [convArchived] = await Conversation.update(
        { status: 'open', closedAt: null, isHiddenFromStaff: false },
        { where: { status: 'archived' } }
    );

    const conversationsUpdated =
        (Array.isArray(convHidden) ? convHidden[0] : convHidden) +
        (typeof convArchived === 'number' ? convArchived : 0);
    const customersUpdated = Array.isArray(custResult) ? custResult[0] : custResult;
    try {
        const row = await WhatsappConnection.findByPk('default');
        if (row) {
            row.legacyLockdownAt = null;
            await row.save();
        }
    } catch (_) {}

    const stats = await getLockdownStats();
    logger.info('Legacy CRM visibility restored', {
        reason: reason || 'manual',
        conversationsUpdated,
        customersUpdated,
        remainingHidden: stats.hiddenConversations,
    });
    return { conversationsUpdated, customersUpdated, stats };
}

/**
 * چت‌های روی لیست فعلی Gateway را در مکالمات فعال باز می‌کند.
 * مکالمات واتساپیِ خارج از آن لیست (شمارهٔ قبلی) آرشیو/محدود می‌مانند.
 * اگر لیست ناقص باشد (مثلاً فقط گروه)، بقیه را آرشیو نکن.
 */
async function applyVisibilityForCurrentGatewayChats(chatIds, gatewayNumber, opts = {}) {
    const gw = normalizeLinkedNumber(gatewayNumber);
    const ids = Array.isArray(chatIds) ? chatIds.filter(Boolean) : [];
    const archiveMissing = opts.archiveMissing !== false;

    // بدون لیست واقعی واتساپ، هیچ‌چیز را آرشیو نکن (جلوگیری از «همه آرشیو / هیچ‌کدام»)
    if (ids.length === 0) {
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
                attributes: ['id', 'phone', 'isRestrictedFromStaff'],
            },
        ],
        attributes: ['id', 'status', 'isHiddenFromStaff', 'customerId'],
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
        const onCurrent = variants.some((v) => allowed.has(String(v).toLowerCase()));

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
    return ensureLegacyCutover(linkedNumber, meta);
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
 * گروه‌های موجود در DB را به مکالمات فعال برگردان (وقتی لیست واتساپ نیاید).
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
                attributes: ['id', 'phone', 'isRestrictedFromStaff'],
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
        if (!isGroup) continue;
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
    ensureLegacyCutover,
    getLegacyLockdownAt,
    handleGatewayNumberReady,
    getLockdownStats,
    normalizeLinkedNumber,
    chatIdVariants,
    isWhatsAppIdentity,
};

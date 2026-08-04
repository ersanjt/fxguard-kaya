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
async function lockdownExistingCrmData({ reason } = {}) {
    const [convResult, custResult] = await Promise.all([
        Conversation.update(
            { isHiddenFromStaff: true, status: 'archived' },
            { where: {} }
        ),
        Customer.update(
            { isRestrictedFromStaff: true },
            { where: { isRestrictedFromStaff: false } }
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
 * فقط چت‌های موجود روی شمارهٔ فعلی Gateway را باز کن؛
 * بقیهٔ مکالمات واتساپی را دوباره آرشیو/مخفی کن.
 * آپدیت‌ها bulk هستند تا درخواست تایم‌اوت نشود.
 */
async function applyVisibilityForCurrentGatewayChats(chatIds, gatewayNumber) {
    const gw = normalizeLinkedNumber(gatewayNumber);
    const ids = Array.isArray(chatIds) ? chatIds.filter(Boolean) : [];

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
    const unrestrictCust = new Set();
    const restrictCust = new Set();

    for (const conv of convs) {
        const phone = String(conv.customer?.phone || '');
        if (!isWhatsAppIdentity(phone)) continue;

        const variants = chatIdVariants(phone);
        const onCurrent = variants.some((v) => allowed.has(String(v).toLowerCase()));

        if (onCurrent) {
            if (conv.status === 'archived' || !!conv.isHiddenFromStaff) {
                openIds.push(conv.id);
            }
            if (conv.customer?.isRestrictedFromStaff) {
                unrestrictCust.add(conv.customer.id);
            }
        } else {
            if (conv.status !== 'archived' || !conv.isHiddenFromStaff) {
                archiveIds.push(conv.id);
            }
            if (conv.customer && !conv.customer.isRestrictedFromStaff) {
                restrictCust.add(conv.customer.id);
            }
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
    if (unrestrictCust.size) {
        await chunked(Customer, { isRestrictedFromStaff: false }, [...unrestrictCust]);
    }
    if (restrictCust.size) {
        await chunked(Customer, { isRestrictedFromStaff: true }, [...restrictCust]);
    }

    logger.info('Applied visibility for current Gateway chats', {
        gatewayNumber: gw || null,
        allowedCount: ids.length,
        opened: openIds.length,
        archived: archiveIds.length,
        unrestricted: unrestrictCust.size,
        restricted: restrictCust.size,
    });
    return {
        opened: openIds.length,
        archived: archiveIds.length,
        unrestricted: unrestrictCust.size,
        restricted: restrictCust.size,
        allowedCount: ids.length,
    };
}

async function handleGatewayNumberReady(linkedNumber, meta = {}) {
    const number = normalizeLinkedNumber(linkedNumber);
    if (!number) {
        return { changed: false, lockdown: null };
    }

    const [row] = await WhatsappConnection.findOrCreate({
        where: { id: 'default' },
        defaults: {
            connectionMode: 'cloud_first',
            cloudEnabled: true,
            gatewayEnabled: true,
        },
    });

    const prev = normalizeLinkedNumber(row.lastLinkedGatewayNumber);
    if (!prev) {
        row.lastLinkedGatewayNumber = number;
        await row.save();
        logger.info('Gateway linked number recorded (first connect)', { number });
        return { changed: false, firstConnect: true, number, lockdown: null };
    }

    if (prev === number) {
        return { changed: false, number, lockdown: null };
    }

    const lockdown = await lockdownExistingCrmData({
        reason: meta.reason || `gateway_number_changed:${prev}->${number}`,
    });
    row.lastLinkedGatewayNumber = number;
    await row.save();
    logger.warn('WhatsApp gateway number changed — legacy CRM data archived and locked', {
        previous: prev,
        number,
        ...lockdown,
    });
    return { changed: true, previous: prev, number, lockdown };
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

module.exports = {
    lockdownExistingCrmData,
    restoreLegacyCrmVisibility,
    applyVisibilityForCurrentGatewayChats,
    handleGatewayNumberReady,
    getLockdownStats,
    normalizeLinkedNumber,
    chatIdVariants,
    isWhatsAppIdentity,
};

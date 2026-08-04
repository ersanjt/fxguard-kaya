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
    const digits = s.replace(/\D/g, '');
    if (digits) {
        out.add(digits);
        out.add(`${digits}@c.us`);
        out.add(`${digits}@s.whatsapp.net`);
        out.add(`${digits}@lid`);
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
 */
async function applyVisibilityForCurrentGatewayChats(chatIds, gatewayNumber) {
    const gw = normalizeLinkedNumber(gatewayNumber);
    const allowed = new Set();
    for (const id of chatIds || []) {
        for (const v of chatIdVariants(id)) allowed.add(v);
    }

    const convs = await Conversation.findAll({
        where: { status: { [Op.ne]: 'closed' } },
        include: [{ model: Customer, as: 'customer', required: true }],
        limit: 5000,
    });

    let opened = 0;
    let archived = 0;
    let unrestricted = 0;
    let restricted = 0;

    for (const conv of convs) {
        const phone = String(conv.customer?.phone || '');
        if (!isWhatsAppIdentity(phone)) continue;

        const variants = chatIdVariants(phone);
        const onCurrent = variants.some((v) => allowed.has(v));
        const meta = { ...(conv.metadata || {}) };

        if (onCurrent) {
            meta.linkedGatewayNumber = gw || meta.linkedGatewayNumber || null;
            meta.notOnCurrentGateway = false;
            const needOpen = conv.status === 'archived' || !!conv.isHiddenFromStaff;
            if (needOpen) {
                await conv.update({
                    status: 'open',
                    isHiddenFromStaff: false,
                    closedAt: null,
                    metadata: meta,
                });
                opened++;
            } else {
                await conv.update({ metadata: meta });
            }
            if (conv.customer.isRestrictedFromStaff) {
                await conv.customer.update({ isRestrictedFromStaff: false });
                unrestricted++;
            }
        } else {
            meta.notOnCurrentGateway = true;
            if (gw) {
                meta.previousGatewayNumber =
                    meta.linkedGatewayNumber || meta.previousGatewayNumber || null;
            }
            if (conv.status !== 'archived' || !conv.isHiddenFromStaff) {
                await conv.update({
                    status: 'archived',
                    isHiddenFromStaff: true,
                    metadata: meta,
                });
                archived++;
            }
            if (!conv.customer.isRestrictedFromStaff) {
                await conv.customer.update({ isRestrictedFromStaff: true });
                restricted++;
            }
        }
    }

    logger.info('Applied visibility for current Gateway chats', {
        gatewayNumber: gw || null,
        allowedCount: (chatIds || []).length,
        opened,
        archived,
        unrestricted,
        restricted,
    });
    return {
        opened,
        archived,
        unrestricted,
        restricted,
        allowedCount: (chatIds || []).length,
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

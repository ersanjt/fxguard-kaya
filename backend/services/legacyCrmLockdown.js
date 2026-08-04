/**
 * قفل دادهٔ CRM قبلی پس از تعویض شماره واتساپ:
 * همهٔ مکالمات → آرشیو + مخفی از کارکنان
 * مشتریان → محدود؛ فقط ادمین سطح بالا (و اعطای صریح) می‌بینند
 */
const { Conversation, Customer, WhatsappConnection } = require('../models');
const logger = require('../config/logger');

function normalizeLinkedNumber(num) {
    if (num == null) return '';
    return String(num).replace(/\D/g, '').trim();
}

/**
 * همهٔ مکالمات فعلی را آرشیو و از کارکنان مخفی می‌کند؛ مشتریان را محدود می‌کند.
 * @returns {{ conversationsUpdated: number, customersUpdated: number, archived: number }}
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
    const archived = await Conversation.count({ where: { status: 'archived', isHiddenFromStaff: true } });
    logger.info('Legacy CRM lockdown applied (archived + hidden)', {
        reason: reason || 'manual',
        conversationsUpdated,
        customersUpdated,
        archived,
    });
    return { conversationsUpdated, customersUpdated, archived };
}

/**
 * بازگردانی دیده‌شدن مکالمات/مشتریان قفل‌شده (مثلاً بعد از اتصال مجدد همان شماره).
 * مکالمات مخفی → قابل‌نمایش و open؛ محدودیت مشتریان برداشته می‌شود.
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

    // آرشیو بدون پرچم مخفی (اگر فقط status عوض شده) هم به open برگردان
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
 * اگر شمارهٔ متصل‌شده با آخرین شمارهٔ ذخیره‌شده فرق کند، دادهٔ قبلی را قفل و آرشیو می‌کند.
 * اولین اتصال (بدون lastLinkedGatewayNumber) فقط شماره را ذخیره می‌کند و قفل نمی‌زند.
 */
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

/** آمار وضعیت قفل برای UI */
async function getLockdownStats() {
    const [hiddenConversations, archivedHidden, restrictedCustomers, totalCustomers, totalConversations] =
        await Promise.all([
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
    handleGatewayNumberReady,
    getLockdownStats,
    normalizeLinkedNumber,
};

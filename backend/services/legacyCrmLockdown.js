/**
 * قفل دادهٔ CRM قبلی پس از تعویض شماره واتساپ:
 * مکالمات و مشتریان موجود فقط برای ادمین سطح بالا (owner/admin/main admin) دیده می‌شوند
 * مگر اینکه صریحاً دسترسی اعطا شود.
 */
const { Conversation, Customer, WhatsappConnection } = require('../models');
const logger = require('../config/logger');

function normalizeLinkedNumber(num) {
    if (num == null) return '';
    return String(num).replace(/\D/g, '').trim();
}

/**
 * همهٔ مکالمات و مشتریان فعلی را محدود می‌کند.
 * @returns {{ conversationsUpdated: number, customersUpdated: number }}
 */
async function lockdownExistingCrmData({ reason } = {}) {
    const [convResult, custResult] = await Promise.all([
        Conversation.update(
            { isHiddenFromStaff: true },
            { where: { isHiddenFromStaff: false } }
        ),
        Customer.update(
            { isRestrictedFromStaff: true },
            { where: { isRestrictedFromStaff: false } }
        ),
    ]);
    const conversationsUpdated = Array.isArray(convResult) ? convResult[0] : convResult;
    const customersUpdated = Array.isArray(custResult) ? custResult[0] : custResult;
    logger.info('Legacy CRM lockdown applied', {
        reason: reason || 'manual',
        conversationsUpdated,
        customersUpdated,
    });
    return { conversationsUpdated, customersUpdated };
}

/**
 * اگر شمارهٔ متصل‌شده با آخرین شمارهٔ ذخیره‌شده فرق کند، دادهٔ قبلی را قفل می‌کند.
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
    logger.warn('WhatsApp gateway number changed — legacy CRM data locked', {
        previous: prev,
        number,
        ...lockdown,
    });
    return { changed: true, previous: prev, number, lockdown };
}

/** آمار وضعیت قفل برای UI */
async function getLockdownStats() {
    const [hiddenConversations, restrictedCustomers, totalCustomers, totalConversations] = await Promise.all([
        Conversation.count({ where: { isHiddenFromStaff: true } }),
        Customer.count({ where: { isRestrictedFromStaff: true } }),
        Customer.count(),
        Conversation.count(),
    ]);
    return { hiddenConversations, restrictedCustomers, totalCustomers, totalConversations };
}

module.exports = {
    lockdownExistingCrmData,
    handleGatewayNumberReady,
    getLockdownStats,
    normalizeLinkedNumber,
};

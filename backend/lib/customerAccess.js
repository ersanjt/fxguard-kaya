const { Conversation, Customer } = require('../models');
const { Op } = require('sequelize');
const { isMainAdmin, canViewHiddenConversations } = require('./permissions');
const { getUserGrantSets, grantedCustomerIdList } = require('./staffResourceGrants');
const { hiddenConversationWhere } = require('./conversationAccess');

/**
 * شناسه مشتری‌هایی که این کاربر مجاز به دیدنشان است.
 * ادمین سطح بالا با includeRestricted → null (همه، شامل محدودشده‌ها).
 * پیش‌فرض حتی برای ادمین: غیرمحدود + اعطاشده (محدودشده‌ها در لیست عادی نمی‌آیند).
 */
async function getAccessibleCustomerIds(req, opts = {}) {
    const includeRestricted =
        !!(opts && opts.includeRestricted) &&
        (isMainAdmin(req.user) || canViewHiddenConversations(req.user));

    if (includeRestricted) return null;

    const grants = await getUserGrantSets(req.userId);
    const grantedIds = grantedCustomerIdList(grants);

    const unrestrictedOrGranted = {
        [Op.or]: [
            { isRestrictedFromStaff: false },
            ...(grantedIds.length ? [{ id: { [Op.in]: grantedIds } }] : []),
        ],
    };

    // ادمین/مالک/مدیر بدون includeRestricted: همهٔ غیرمحدود (+ اعطا)
    if (
        isMainAdmin(req.user) ||
        canViewHiddenConversations(req.user) ||
        req.user.role === 'manager'
    ) {
        const rows = await Customer.findAll({
            where: unrestrictedOrGranted,
            attributes: ['id'],
            raw: true,
        });
        return rows.map((r) => r.id);
    }

    const roleOr = [{ assignedTo: req.userId }];
    if (req.user.departmentId) roleOr.push({ departmentId: req.user.departmentId });
    if (grantedIds.length) roleOr.push({ customerId: { [Op.in]: grantedIds } });

    const convs = await Conversation.findAll({
        where: {
            [Op.and]: [
                hiddenConversationWhere(req.user, grants),
                { [Op.or]: roleOr },
            ],
        },
        attributes: ['customerId'],
        raw: true,
    });
    const fromConvs = convs.map((c) => c.customerId).filter(Boolean);

    const ids = new Set([...fromConvs, ...grantedIds]);

    if (ids.size === 0) return [];
    const allowed = await Customer.findAll({
        where: {
            [Op.and]: [
                { id: { [Op.in]: [...ids] } },
                unrestrictedOrGranted,
            ],
        },
        attributes: ['id'],
        raw: true,
    });
    return allowed.map((r) => r.id);
}

/** آیا این کاربر به این مشتری دسترسی دارد؟ */
async function canAccessCustomer(req, customerId) {
    if (!customerId) return false;
    if (isMainAdmin(req.user) || canViewHiddenConversations(req.user)) return true;

    const customer = await Customer.findByPk(customerId, {
        attributes: ['id', 'isRestrictedFromStaff'],
        raw: true,
    });
    if (!customer) return false;

    if (customer.isRestrictedFromStaff) {
        const grants = await getUserGrantSets(req.userId);
        return grants.customerIds.has(customerId);
    }

    const ids = await getAccessibleCustomerIds(req);
    if (ids === null) return true;
    return ids.includes(customerId);
}

module.exports = { getAccessibleCustomerIds, canAccessCustomer };

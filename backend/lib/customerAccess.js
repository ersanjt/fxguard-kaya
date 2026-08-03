const { Conversation, Customer } = require('../models');
const { Op } = require('sequelize');
const { isMainAdmin, canViewHiddenConversations } = require('./permissions');
const { getUserGrantSets, grantedCustomerIdList } = require('./staffResourceGrants');
const { hiddenConversationWhere } = require('./conversationAccess');

/**
 * شناسه مشتری‌هایی که این کاربر مجاز به دیدنشان است.
 * ادمین سطح بالا (owner/admin/main admin) → null (همه، شامل محدودشده‌ها).
 * بقیه → غیرمحدود + اعطاشده (+ از مسیر مکالمات قابل‌دسترسی برای agent/supervisor).
 */
async function getAccessibleCustomerIds(req) {
    if (isMainAdmin(req.user) || canViewHiddenConversations(req.user)) return null;

    const grants = await getUserGrantSets(req.userId);
    const grantedIds = grantedCustomerIdList(grants);

    if (req.user.role === 'manager') {
        const rows = await Customer.findAll({
            where: {
                [Op.or]: [
                    { isRestrictedFromStaff: false },
                    ...(grantedIds.length ? [{ id: { [Op.in]: grantedIds } }] : []),
                ],
            },
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

    // مشتریان محدود بدون اعطا را حذف کن (حتی اگر از مکالمهٔ قدیمی بیایند)
    if (ids.size === 0) return [];
    const allowed = await Customer.findAll({
        where: {
            id: { [Op.in]: [...ids] },
            [Op.or]: [
                { isRestrictedFromStaff: false },
                ...(grantedIds.length ? [{ id: { [Op.in]: grantedIds } }] : []),
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

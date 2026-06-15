const { Conversation } = require('../models');
const { Op } = require('sequelize');
const { isMainAdmin } = require('./permissions');
const { hiddenConversationWhere } = require('./conversationAccess');

/**
 * شناسه مشتری‌هایی که این کاربر مجاز به دیدنشان است.
 * ادمین اصلی پنل / owner / admin / manager → null (همه).
 * بقیه → فقط مشتری‌های مکالمات تخصیص‌یافته به خود یا دپارتمان خود (بدون شعبه و مشارکت قبلی).
 */
async function getAccessibleCustomerIds(req) {
    if (isMainAdmin(req.user)) return null;
    if (req.user.role === 'owner' || req.user.role === 'admin' || req.user.role === 'manager') return null;
    const convWhere = { [Op.or]: [{ assignedTo: req.userId }], ...hiddenConversationWhere(req.user) };
    if (req.user.departmentId) convWhere[Op.or].push({ departmentId: req.user.departmentId });
    const convs = await Conversation.findAll({ where: convWhere, attributes: ['customerId'], raw: true });
    return [...new Set(convs.map((c) => c.customerId).filter(Boolean))];
}

/** آیا این کاربر به این مشتری دسترسی دارد؟ */
async function canAccessCustomer(req, customerId) {
    const ids = await getAccessibleCustomerIds(req);
    if (ids === null) return true;
    return ids.includes(customerId);
}

module.exports = { getAccessibleCustomerIds, canAccessCustomer };

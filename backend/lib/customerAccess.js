const { Conversation, Message } = require('../models');
const { Op } = require('sequelize');
const { isMainAdmin } = require('./permissions');

/**
 * شناسه مشتری‌هایی که این کاربر مجاز به دیدنشان است.
 * ادمین اصلی پنل / owner / admin / manager → null (همه).
 * بقیه → مشتری‌های مکالمات تخصیص‌یافته به خود یا شعبه‌شان + مشتری‌هایی که این کاربر
 * حداقل یک پیام در مکالماتشان فرستاده (تاریخچه مشارکت).
 */
async function getAccessibleCustomerIds(req) {
    if (isMainAdmin(req.user)) return null;
    if (req.user.role === 'owner' || req.user.role === 'admin' || req.user.role === 'manager') return null;
    const convWhere = { [Op.or]: [{ assignedTo: req.userId }] };
    if (req.user.departmentId) convWhere[Op.or].push({ departmentId: req.user.departmentId });
    if (req.user.branchId) convWhere[Op.or].push({ branchId: req.user.branchId });
    const convs = await Conversation.findAll({ where: convWhere, attributes: ['customerId'], raw: true });
    const fromConvs = [...new Set(convs.map((c) => c.customerId).filter(Boolean))];
    const fromMessages = await Message.findAll({
        where: { userId: req.userId, direction: 'outgoing' },
        attributes: ['customerId'],
        raw: true
    }).then((rows) => [...new Set(rows.map((r) => r.customerId).filter(Boolean))]);
    return [...new Set([...fromConvs, ...fromMessages])];
}

/** آیا این کاربر به این مشتری دسترسی دارد؟ */
async function canAccessCustomer(req, customerId) {
    const ids = await getAccessibleCustomerIds(req);
    if (ids === null) return true;
    return ids.includes(customerId);
}

module.exports = { getAccessibleCustomerIds, canAccessCustomer };

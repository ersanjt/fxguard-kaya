const { Op } = require('sequelize');
const { isMainAdmin, canViewHiddenConversations } = require('./permissions');

/** آیا کاربر جاری به این مکالمه دسترسی دارد؟ */
function canAccessConversation(user, userId, conversation) {
    if (!conversation || !user) return false;
    if (conversation.isHiddenFromStaff && !canViewHiddenConversations(user)) return false;
    if (isMainAdmin(user)) return true;
    const role = user.role;
    if (role === 'owner' || role === 'admin' || role === 'manager') return true;
    if (conversation.assignedTo === userId) return true;
    if (user.departmentId && conversation.departmentId === user.departmentId) return true;
    return false;
}

/** فیلتر Sequelize برای مخفی‌سازی مکالمات از دید کاربران غیرمجاز */
function hiddenConversationWhere(user) {
    if (canViewHiddenConversations(user)) return {};
    return { isHiddenFromStaff: false };
}

/** شرط لیست/شمارش مکالمات بر اساس نقش و مخفی‌سازی */
function conversationListWhere(user, userId) {
    const hidden = hiddenConversationWhere(user);
    if (isMainAdmin(user) || ['owner', 'admin', 'manager'].indexOf(user.role || '') !== -1) {
        return { ...hidden };
    }
    const orConditions = [{ assignedTo: userId }];
    if (user.departmentId) orConditions.push({ departmentId: user.departmentId });
    return { ...hidden, [Op.or]: orConditions };
}

module.exports = {
    canAccessConversation,
    hiddenConversationWhere,
    conversationListWhere,
};

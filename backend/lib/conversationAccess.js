const { Op } = require('sequelize');
const { isMainAdmin, canViewHiddenConversations } = require('./permissions');
const {
    getUserGrantSets,
    hasResourceGrant,
    visibleDespiteHiddenOr,
} = require('./staffResourceGrants');

/** آیا کاربر جاری به این مکالمه دسترسی دارد؟ */
function canAccessConversation(user, userId, conversation, grants = null) {
    if (!conversation || !user) return false;
    if (isMainAdmin(user) || canViewHiddenConversations(user)) return true;

    const granted =
        hasResourceGrant(grants, 'conversation', conversation.id) ||
        hasResourceGrant(grants, 'customer', conversation.customerId);

    if (conversation.isHiddenFromStaff && !granted) return false;

    if (granted) return true;

    const role = user.role;
    if (role === 'owner' || role === 'admin' || role === 'manager') return true;
    if (conversation.assignedTo === userId) return true;
    if (user.departmentId && conversation.departmentId === user.departmentId) return true;
    return false;
}

async function canAccessConversationAsync(user, userId, conversation) {
    if (!conversation || !user) return false;
    if (isMainAdmin(user) || canViewHiddenConversations(user)) return true;
    if (!conversation.isHiddenFromStaff) {
        return canAccessConversation(user, userId, conversation, null);
    }
    const grants = await getUserGrantSets(userId);
    return canAccessConversation(user, userId, conversation, grants);
}

/** فیلتر Sequelize برای مخفی‌سازی مکالمات از دید کاربران غیرمجاز */
function hiddenConversationWhere(user, grants = null) {
    if (isMainAdmin(user) || canViewHiddenConversations(user)) return {};
    return visibleDespiteHiddenOr(grants);
}

/**
 * شرط لیست مکالمات.
 * ادمین سطح بالا (owner/admin/main): همه (آرشیو با فیلتر جدا در route).
 * بقیه: فقط غیرمخفی (+ اعطا) و بر اساس نقش/تخصیص.
 *
 * @param {object} [opts]
 * @param {boolean} [opts.hiddenOnly] — فقط مخفی‌ها (ادمین)
 * @param {boolean} [opts.includeHidden] — مخفی‌ها را هم بیاور (ادمین؛ پیش‌فرض ادمین همه را می‌بیند)
 */
function conversationListWhere(user, userId, grants = null, opts = {}) {
    const canSeeHidden = isMainAdmin(user) || canViewHiddenConversations(user);
    const hiddenOnly = !!(opts && opts.hiddenOnly) && canSeeHidden;

    if (hiddenOnly) {
        return { isHiddenFromStaff: true };
    }

    // ادمین سطح بالا: بدون فیلتر مخفی (لیست کامل؛ آرشیو جدا فیلتر می‌شود)
    if (canSeeHidden) {
        return {};
    }

    const visibility = visibleDespiteHiddenOr(grants);

    if (['owner', 'admin', 'manager'].indexOf(user.role || '') !== -1) {
        // owner/admin اینجا فقط اگر canSeeHidden نبودند؛ manager همیشه visibility
        return visibility;
    }

    const orConditions = [{ assignedTo: userId }];
    if (user.departmentId) orConditions.push({ departmentId: user.departmentId });

    const grantedCust = grants && grants.customerIds ? [...grants.customerIds] : [];
    const grantedConv = grants && grants.conversationIds ? [...grants.conversationIds] : [];
    if (grantedCust.length) orConditions.push({ customerId: { [Op.in]: grantedCust } });
    if (grantedConv.length) orConditions.push({ id: { [Op.in]: grantedConv } });

    return {
        [Op.and]: [
            visibility,
            { [Op.or]: orConditions },
        ],
    };
}

async function conversationListWhereAsync(user, userId, opts = {}) {
    const canSeeHidden = isMainAdmin(user) || canViewHiddenConversations(user);
    if (opts && opts.hiddenOnly && canSeeHidden) {
        return { isHiddenFromStaff: true };
    }
    if (canSeeHidden) {
        return {};
    }
    const grants = await getUserGrantSets(userId);
    return conversationListWhere(user, userId, grants, opts);
}

module.exports = {
    canAccessConversation,
    canAccessConversationAsync,
    hiddenConversationWhere,
    conversationListWhere,
    conversationListWhereAsync,
};

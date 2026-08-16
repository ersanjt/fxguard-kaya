const { Op } = require('sequelize');
const { isMainAdmin, canViewHiddenConversations } = require('./permissions');
const {
    getUserGrantSets,
    hasResourceGrant,
    visibleDespiteHiddenOr,
} = require('./staffResourceGrants');

function customerIsRestricted(conversation) {
    if (conversation && conversation.customer && conversation.customer.isRestrictedFromStaff != null) {
        return !!conversation.customer.isRestrictedFromStaff;
    }
    return !!(conversation && conversation._customerRestricted);
}

function idsEq(a, b) {
    return a != null && b != null && String(a) === String(b);
}

function isLiveInboxConversation(conversation) {
    if (!conversation || conversation.isHiddenFromStaff) return false;
    const status = conversation.status || 'open';
    if (status === 'archived' || status === 'closed') return false;
    return true;
}

/** آیا کاربر جاری به این مکالمه دسترسی دارد؟ */
function canAccessConversation(user, userId, conversation, grants = null) {
    if (!conversation || !user) return false;
    if (isMainAdmin(user) || canViewHiddenConversations(user)) return true;

    const granted =
        hasResourceGrant(grants, 'conversation', conversation.id) ||
        hasResourceGrant(grants, 'customer', conversation.customerId);

    if (conversation.isHiddenFromStaff && !granted) return false;
    // محدودیت مشتری فقط با مکالمهٔ قفل‌شده (شمارهٔ قبلی) معنا دارد — چت فعال را نبند
    if (customerIsRestricted(conversation) && conversation.isHiddenFromStaff && !granted) {
        return false;
    }

    if (granted) return true;

    const role = user.role || '';
    if (role === 'owner' || role === 'admin' || role === 'manager' || role === 'supervisor') {
        return true;
    }
    if (idsEq(conversation.assignedTo, userId)) return true;
    if (user.departmentId && idsEq(conversation.departmentId, user.departmentId)) return true;
    // اینباکس مشترک: مکالمهٔ فعال قفل‌نشده برای همهٔ کارکنان مکالمات
    if (isLiveInboxConversation(conversation)) return true;
    return false;
}

async function canAccessConversationAsync(user, userId, conversation) {
    if (!conversation || !user) return false;
    if (isMainAdmin(user) || canViewHiddenConversations(user)) return true;

    let view = conversation;
    if (
        conversation.customerId &&
        (!conversation.customer || conversation.customer.isRestrictedFromStaff == null)
    ) {
        const { Customer } = require('../models');
        const row = await Customer.findByPk(conversation.customerId, {
            attributes: ['isRestrictedFromStaff'],
            raw: true,
        });
        view = {
            id: conversation.id,
            customerId: conversation.customerId,
            assignedTo: conversation.assignedTo,
            departmentId: conversation.departmentId,
            status: conversation.status,
            isHiddenFromStaff: conversation.isHiddenFromStaff,
            customer: conversation.customer || row || null,
            _customerRestricted: !!(row && row.isRestrictedFromStaff),
        };
    }

    const needsGrants = !!(view.isHiddenFromStaff || customerIsRestricted(view));
    const grants = needsGrants ? await getUserGrantSets(userId) : null;
    return canAccessConversation(user, userId, view, grants);
}

/** فیلتر Sequelize برای مخفی‌سازی مکالمات از دید کاربران غیرمجاز */
function hiddenConversationWhere(user, grants = null) {
    if (isMainAdmin(user) || canViewHiddenConversations(user)) return {};
    return visibleDespiteHiddenOr(grants);
}

/**
 * شرط لیست مکالمات.
 * لیست عادی («همه»): حتی ادمین سطح بالا قفل‌شده‌ها را نمی‌بیند — تب آرشیو / محدود جداست.
 * بقیه: فقط غیرمخفی (+ اعطا) و بر اساس نقش/تخصیص.
 *
 * @param {object} [opts]
 * @param {boolean} [opts.hiddenOnly] — فقط مخفی‌ها (ادمین)
 * @param {boolean} [opts.includeHidden] — مخفی‌ها را هم بیاور (ادمین)
 */
function conversationListWhere(user, userId, grants = null, opts = {}) {
    const canSeeHidden = isMainAdmin(user) || canViewHiddenConversations(user);
    const hiddenOnly = !!(opts && opts.hiddenOnly) && canSeeHidden;
    const includeHidden = !!(opts && opts.includeHidden) && canSeeHidden;

    if (hiddenOnly) {
        return { isHiddenFromStaff: true };
    }

    // ادمین: فقط با includeHidden همه را ببین؛ وگرنه مثل بقیه بدون قفل‌شده
    if (canSeeHidden && includeHidden) {
        return {};
    }
    if (canSeeHidden) {
        return { isHiddenFromStaff: false };
    }

    const visibility = visibleDespiteHiddenOr(grants);

    // اینباکس واتساپ مشترک: همهٔ کارکنان بخش مکالمات، چت‌های غیرقفل را می‌بینند
    return visibility;
}

async function conversationListWhereAsync(user, userId, opts = {}) {
    const canSeeHidden = isMainAdmin(user) || canViewHiddenConversations(user);
    if (opts && opts.hiddenOnly && canSeeHidden) {
        return { isHiddenFromStaff: true };
    }
    if (canSeeHidden && opts && opts.includeHidden) {
        return {};
    }
    if (canSeeHidden) {
        return { isHiddenFromStaff: false };
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

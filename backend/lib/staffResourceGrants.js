/**
 * کمک‌توابع اعطای دسترسی به مشتری/مکالمهٔ محدودشده
 */
const { Op } = require('sequelize');
const { StaffResourceGrant } = require('../models');
const { canViewHiddenConversations } = require('./permissions');

async function getUserGrantSets(userId) {
    if (!userId) return { customerIds: new Set(), conversationIds: new Set() };
    const rows = await StaffResourceGrant.findAll({
        where: { userId },
        attributes: ['resourceType', 'resourceId'],
        raw: true,
    });
    const customerIds = new Set();
    const conversationIds = new Set();
    for (const r of rows) {
        if (r.resourceType === 'customer') customerIds.add(r.resourceId);
        else if (r.resourceType === 'conversation') conversationIds.add(r.resourceId);
    }
    return { customerIds, conversationIds };
}

function hasResourceGrant(grants, resourceType, resourceId) {
    if (!grants || !resourceId) return false;
    if (resourceType === 'customer') return grants.customerIds.has(resourceId);
    if (resourceType === 'conversation') return grants.conversationIds.has(resourceId);
    return false;
}

function canBypassStaffRestriction(user) {
    return canViewHiddenConversations(user);
}

async function listGrantsForResource(resourceType, resourceId) {
    return StaffResourceGrant.findAll({
        where: { resourceType, resourceId },
        include: [
            { association: 'user', attributes: ['id', 'name', 'email', 'username', 'role'], required: false },
            { association: 'granter', attributes: ['id', 'name', 'email'], required: false },
        ],
        order: [['createdAt', 'DESC']],
    });
}

async function grantAccess({ userId, resourceType, resourceId, grantedBy }) {
    const [row] = await StaffResourceGrant.findOrCreate({
        where: { userId, resourceType, resourceId },
        defaults: { grantedBy: grantedBy || null },
    });
    return row;
}

async function revokeAccess({ userId, resourceType, resourceId }) {
    return StaffResourceGrant.destroy({
        where: { userId, resourceType, resourceId },
    });
}

async function grantCustomersToUser({ userId, customerIds, grantedBy }) {
    const ids = [...new Set((customerIds || []).filter(Boolean))];
    let created = 0;
    for (const resourceId of ids) {
        const [, wasCreated] = await StaffResourceGrant.findOrCreate({
            where: { userId, resourceType: 'customer', resourceId },
            defaults: { grantedBy: grantedBy || null },
        });
        if (wasCreated) created++;
    }
    return { created, total: ids.length };
}

/** شناسه‌های مشتری اعطاشده — برای فیلتر Sequelize */
function grantedCustomerIdList(grants) {
    return grants && grants.customerIds ? [...grants.customerIds] : [];
}

function grantedConversationIdList(grants) {
    return grants && grants.conversationIds ? [...grants.conversationIds] : [];
}

/** شرط Op برای «مخفی نیست یا اعطا شده» */
function visibleDespiteHiddenOr(grants) {
    const or = [{ isHiddenFromStaff: false }];
    const custIds = grantedCustomerIdList(grants);
    const convIds = grantedConversationIdList(grants);
    if (custIds.length) or.push({ customerId: { [Op.in]: custIds } });
    if (convIds.length) or.push({ id: { [Op.in]: convIds } });
    return { [Op.or]: or };
}

module.exports = {
    getUserGrantSets,
    hasResourceGrant,
    canBypassStaffRestriction,
    listGrantsForResource,
    grantAccess,
    revokeAccess,
    grantCustomersToUser,
    grantedCustomerIdList,
    grantedConversationIdList,
    visibleDespiteHiddenOr,
};

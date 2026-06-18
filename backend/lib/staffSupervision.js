/**
 * سلسله‌مراتب نظارت بر حضور کارکنان — مدیر کل، مدیر دپارتمان، و نقش‌های بالاتر از کارمند.
 */
const { Op } = require('sequelize');
const { isMainAdmin } = require('./permissions');

const ROLE_RANK = {
    owner: 100,
    admin: 90,
    manager: 70,
    supervisor: 50,
    agent: 10,
};

function roleRank(role) {
    return ROLE_RANK[role] || ROLE_RANK.agent;
}

function hasSystemWideStaffView(user) {
    if (!user) return false;
    if (isMainAdmin(user)) return true;
    return user.role === 'owner' || user.role === 'admin';
}

/**
 * آیا viewer مجاز است فعالیت/حضور target را ببیند؟
 */
function canSuperviseStaff(viewer, target) {
    if (!viewer || !target) return false;
    if (viewer.id === target.id) return false;
    if (target.isActive === false) return false;

    const viewerRank = roleRank(viewer.role);
    const targetRank = roleRank(target.role);
    if (viewerRank <= targetRank) return false;

    if (hasSystemWideStaffView(viewer)) return true;

    if (viewer.role === 'manager') {
        if (!viewer.departmentId || !target.departmentId) return false;
        if (String(viewer.departmentId) !== String(target.departmentId)) return false;
        return target.role === 'supervisor' || target.role === 'agent';
    }

    if (viewer.role === 'supervisor') {
        if (!viewer.departmentId || !target.departmentId) return false;
        if (String(viewer.departmentId) !== String(target.departmentId)) return false;
        return target.role === 'agent';
    }

    return false;
}

/**
 * شناسه کاربرانی که viewer مجاز است در staff-activity ببیند.
 * null = همه (مالک/ادمین)، [] = هیچ‌کس
 */
async function getVisibleStaffUserIds(viewer, User) {
    if (!viewer) return [];
    if (hasSystemWideStaffView(viewer)) return null;

    if (viewer.role === 'manager' || viewer.role === 'supervisor') {
        if (!viewer.departmentId) return [];
        const roles = viewer.role === 'manager' ? ['supervisor', 'agent'] : ['agent'];
        const rows = await User.findAll({
            where: {
                isActive: true,
                departmentId: viewer.departmentId,
                role: { [Op.in]: roles },
            },
            attributes: ['id'],
        });
        return rows.map((r) => r.id);
    }

    return [];
}

function applyVisibleUserFilter(where, visibleIds) {
    if (visibleIds === null) return where;
    if (!visibleIds.length) {
        return { ...where, id: { [Op.eq]: null } };
    }
    return { ...where, id: { [Op.in]: visibleIds } };
}

function applyVisibleUserIdFilter(whereField, visibleIds) {
    if (visibleIds === null) return whereField;
    if (!visibleIds.length) {
        return { ...whereField, userId: { [Op.eq]: null } };
    }
    return { ...whereField, userId: { [Op.in]: visibleIds } };
}

/**
 * کاربرانی که باید از تغییر وضعیت subject مطلع شوند.
 */
async function findSupervisorUserIds(subjectUser, User) {
    if (!subjectUser || !User) return [];
    const subject = subjectUser.role != null
        ? subjectUser
        : await User.findByPk(subjectUser.id || subjectUser, {
            attributes: ['id', 'role', 'departmentId', 'isActive'],
        });
    if (!subject || subject.isActive === false) return [];

    const subjectRank = roleRank(subject.role);
    const higherRoles = Object.entries(ROLE_RANK)
        .filter(([, rank]) => rank > subjectRank)
        .map(([role]) => role);
    if (!higherRoles.length) return [];

    const candidates = await User.findAll({
        where: { isActive: true, role: { [Op.in]: higherRoles } },
        attributes: ['id', 'role', 'departmentId'],
    });

    return candidates
        .filter((viewer) => canSuperviseStaff(viewer, subject))
        .map((viewer) => viewer.id);
}

module.exports = {
    ROLE_RANK,
    roleRank,
    hasSystemWideStaffView,
    canSuperviseStaff,
    getVisibleStaffUserIds,
    applyVisibleUserFilter,
    applyVisibleUserIdFilter,
    findSupervisorUserIds,
};

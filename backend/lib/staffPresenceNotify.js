/**
 * اعلان real-time حضور کارکنان — فقط به مدیران مجاز (دپارتمان / کل سیستم).
 */
const { User, Department } = require('../models');
const { findSupervisorUserIds } = require('./staffSupervision');

const USER_ATTRS = ['id', 'name', 'email', 'username', 'role', 'departmentId', 'branchId', 'status'];

async function loadSubjectUser(subjectUser) {
    if (!subjectUser) return null;
    if (subjectUser.name != null && subjectUser.role != null && subjectUser.id) {
        return subjectUser;
    }
    return User.findByPk(subjectUser.id || subjectUser, {
        attributes: USER_ATTRS,
        include: [{ model: Department, as: 'department', attributes: ['id', 'name'], required: false }],
    });
}

function serializeSubjectUser(user) {
    if (!user) return null;
    const j = typeof user.toJSON === 'function' ? user.toJSON() : user;
    return {
        id: j.id,
        name: j.name,
        username: j.username,
        email: j.email,
        role: j.role,
        departmentId: j.departmentId,
        department: j.department ? { id: j.department.id, name: j.department.name } : null,
    };
}

/**
 * @param {import('socket.io').Server} io
 * @param {object} subjectUser
 * @param {{ event: string, status?: string, previousStatus?: string }} opts
 */
async function notifyStaffPresence(io, subjectUser, opts = {}) {
    if (!io || !subjectUser) return;
    try {
        const user = await loadSubjectUser(subjectUser);
        if (!user) return;

        const supervisorIds = await findSupervisorUserIds(user, User);
        if (!supervisorIds.length) return;

        const payload = {
            event: opts.event || 'status',
            userId: user.id,
            status: opts.status || user.status || 'offline',
            previousStatus: opts.previousStatus || null,
            user: serializeSubjectUser(user),
            at: new Date().toISOString(),
        };

        supervisorIds.forEach((id) => {
            io.to('user_' + String(id)).emit('staff_presence', payload);
        });
    } catch (_) {
        /* non-critical */
    }
}

module.exports = { notifyStaffPresence };

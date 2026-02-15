const { ActivityLog } = require('../models');

/**
 * ثبت فعالیت برای نظارت مالک — چه کسی، در کدام شعبه/دپارتمان، چه عملی انجام داده
 */
async function logActivity({ userId, branchId, departmentId, action, entityType, entityId, summary, metadata = {} }) {
    try {
        await ActivityLog.create({
            userId: userId || null,
            branchId: branchId || null,
            departmentId: departmentId || null,
            action,
            entityType: entityType || null,
            entityId: entityId || null,
            summary: summary || null,
            metadata
        });
    } catch (err) {
        // عدم وابستگی سایر عملیات به لاگ
        console.error('ActivityLog error:', err.message);
    }
}

module.exports = { logActivity };

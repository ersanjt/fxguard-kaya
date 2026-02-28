const { ActivityLog } = require('../models');
const logger = require('../config/logger');

/**
 * ثبت فعالیت برای نظارت مالک — چه کسی، در کدام شعبه/دپارتمان، چه عملی انجام داده
 */
async function logActivity({ userId, branchId, departmentId, action, entityType, entityId, customerId, summary, metadata = {} }) {
    try {
        await ActivityLog.create({
            userId: userId || null,
            branchId: branchId || null,
            departmentId: departmentId || null,
            action,
            entityType: entityType || null,
            entityId: entityId || null,
            customerId: customerId || null,
            summary: summary || null,
            metadata
        });
    } catch (err) {
        logger.error('ActivityLog error', { error: err.message });
    }
}

module.exports = { logActivity };

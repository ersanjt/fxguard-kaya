/**
 * Activity log — audit trail for owner supervision
 */
const { ActivityLog } = require('../../models');
const logger = require('../../config/logger');

const VALID_ACTIONS = new Set([
    'user_login', 'user_logout', 'login_failed',
    'conversation_created', 'conversation_updated', 'conversation_closed', 'conversation_archived',
    'conversation_assigned', 'conversation_department_changed',
    'message_sent', 'message_received',
    'customer_created', 'customer_updated', 'customer_deleted',
    'ticket_created', 'ticket_updated', 'ticket_closed', 'ticket_deleted',
    'task_created', 'task_updated', 'task_completed',
    'user_created', 'user_updated', 'user_deleted', 'user_deactivated',
    'announcement_created', 'announcement_deleted',
    'settings_updated', 'password_reset', 'totp_setup', 'totp_disabled',
    'transaction_created', 'transaction_updated', 'transaction_deleted',
    'transaction_approved', 'transaction_rejected',
    'process_created', 'process_updated', 'process_completed',
    'internal_thread_created', 'internal_message_sent',
    'bulk_message_sent', 'customers_imported',
    'customer_note_added',
    'legacy_crm_lockdown',
]);

async function logActivity({ userId, branchId, departmentId, action, entityType, entityId, customerId, summary, metadata = {} }) {
    if (!action) {
        logger.warn('logActivity called without action');
        return;
    }
    if (!VALID_ACTIONS.has(action)) {
        logger.warn('logActivity: unknown action type', { action });
    }
    try {
        await ActivityLog.create({
            userId: userId || null,
            branchId: branchId || null,
            departmentId: departmentId || null,
            action: String(action).slice(0, 100),
            entityType: entityType || null,
            entityId: entityId || null,
            customerId: customerId || null,
            summary: summary ? String(summary).slice(0, 500) : null,
            metadata,
        });
    } catch (err) {
        logger.error('ActivityLog write failed', { error: err.message, action, userId });
    }
}

module.exports = { logActivity };

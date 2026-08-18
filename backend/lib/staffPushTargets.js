/**
 * Kaya CRM — انتخاب گیرنده و متن پوش کارکنان
 * @file    backend/lib/staffPushTargets.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const { canAccessConversation } = require('./conversationAccess');

function notificationsEnabled(user) {
    const settings = user && user.settings;
    if (settings && settings.notifications === false) return false;
    return true;
}

function isLeadRole(user) {
    const role = String((user && user.role) || '').toLowerCase();
    return role === 'owner' || role === 'admin' || role === 'manager' || role === 'supervisor';
}

function shouldNotifyIncomingWhatsapp({ isFromMe, direction } = {}) {
    if (isFromMe) return false;
    return String(direction || '').toLowerCase() !== 'outgoing';
}

function messagePreview(message, fallback) {
    if (!message || typeof message !== 'object') return fallback || '';
    const content = String(message.content || message.body || '').trim();
    if (content) return content.slice(0, 180);
    const type = String(message.type || '').toLowerCase();
    if (type === 'image') return '📷';
    if (type === 'video') return '🎬';
    if (type === 'audio' || type === 'ptt' || type === 'voice') return '🎤';
    if (type === 'document' || type === 'sticker') return '📎';
    return fallback || '';
}

function normalizeId(value) {
    return value == null ? '' : String(value);
}

/**
 * تخصیص‌شده → همان نفر؛ وگرنه دپارتمان؛ وگرنه کارکنان با دسترسی اینباکس زنده.
 */
function pickWhatsappRecipientIds(conversation, staffRows, excludeUserId) {
    const exclude = normalizeId(excludeUserId);
    if (!conversation) return [];
    if (conversation.assignedTo) {
        const id = normalizeId(conversation.assignedTo);
        if (exclude && id === exclude) return [];
        return [conversation.assignedTo];
    }
    const rows = Array.isArray(staffRows) ? staffRows : [];
    const deptId = conversation.departmentId ? normalizeId(conversation.departmentId) : '';
    return rows
        .filter((user) => {
            const id = normalizeId(user && user.id);
            if (!id || (exclude && id === exclude)) return false;
            if (!notificationsEnabled(user)) return false;
            if (deptId) {
                const sameDept = normalizeId(user.departmentId) === deptId;
                if (!sameDept && !isLeadRole(user)) return false;
            }
            return canAccessConversation(user, user.id, conversation);
        })
        .map((user) => user.id);
}

module.exports = {
    notificationsEnabled,
    isLeadRole,
    shouldNotifyIncomingWhatsapp,
    messagePreview,
    pickWhatsappRecipientIds
};

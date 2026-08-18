/**
 * Kaya CRM — ارسال FCM به دستگاه کارکنان
 * @file    backend/services/pushNotificationService.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
'use strict';

const logger = require('../config/logger');

let adminApp = null;
let initAttempted = false;

function readServiceAccount() {
    const raw = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
    if (raw) {
        try {
            return JSON.parse(raw);
        } catch (err) {
            logger.warn('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON', { error: err.message });
            return null;
        }
    }
    const fs = require('fs');
    const path = String(process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();
    if (!path) return null;
    try {
        return JSON.parse(fs.readFileSync(path, 'utf8'));
    } catch (err) {
        logger.warn('Firebase service account file unreadable', { error: err.message });
        return null;
    }
}

function getMessaging() {
    if (initAttempted) {
        return adminApp ? adminApp.messaging() : null;
    }
    initAttempted = true;
    const creds = readServiceAccount();
    if (!creds) return null;
    try {
        const admin = require('firebase-admin');
        adminApp = admin.apps && admin.apps.length
            ? admin.app()
            : admin.initializeApp({ credential: admin.credential.cert(creds) });
        return adminApp.messaging();
    } catch (err) {
        logger.warn('firebase-admin init failed', { error: err.message });
        adminApp = null;
        return null;
    }
}

function stringifyData(data) {
    const out = {};
    Object.entries(data || {}).forEach(([key, value]) => {
        if (value == null || value === '') return;
        out[key] = String(value);
    });
    return out;
}

function channelForType(type) {
    if (type === 'call') return 'kaya_calls_v2';
    if (type === 'ticket' || type === 'task') return 'kaya_work_v2';
    if (type === 'announcement') return 'kaya_announcements_v2';
    if (type === 'internal') return 'kaya_internal_v2';
    return 'kaya_messages_v2';
}

async function deleteTokens(tokens) {
    if (!tokens || !tokens.length) return;
    try {
        const { DevicePushToken } = require('../models');
        await DevicePushToken.destroy({ where: { token: tokens } });
    } catch (err) {
        logger.warn('push token cleanup failed', { error: err.message });
    }
}

async function sendToUsers(userIds, payload) {
    const ids = [...new Set((userIds || []).filter(Boolean).map((id) => String(id)))];
    if (!ids.length) return { sent: 0, skipped: true };
    const messaging = getMessaging();
    if (!messaging) return { sent: 0, skipped: true, reason: 'no_firebase' };

    const { DevicePushToken, User } = require('../models');
    const { notificationsEnabled } = require('../lib/staffPushTargets');
    const users = await User.findAll({
        where: { id: ids, isActive: true },
        attributes: ['id', 'settings']
    });
    const allowed = new Set(users.filter(notificationsEnabled).map((u) => String(u.id)));
    if (!allowed.size) return { sent: 0, reason: 'notifications_disabled' };

    const rows = await DevicePushToken.findAll({
        where: { userId: [...allowed] },
        attributes: ['token', 'userId']
    });
    const tokens = [...new Set(rows.map((r) => r.token).filter(Boolean))];
    if (!tokens.length) return { sent: 0, reason: 'no_token' };

    const type = payload && payload.type ? String(payload.type) : 'message';
    const title = String((payload && payload.title) || 'Kaya Staff').slice(0, 120);
    const body = String((payload && payload.body) || '').slice(0, 240);
    const data = stringifyData({
        type,
        title,
        body,
        conversationId: payload && payload.conversationId,
        threadId: payload && payload.threadId,
        ticketId: payload && payload.ticketId,
        taskId: payload && payload.taskId,
        announcementId: payload && payload.announcementId
    });

    const stale = [];
    let sent = 0;
    for (let i = 0; i < tokens.length; i += 500) {
        const batch = tokens.slice(i, i + 500);
        try {
            const res = await messaging.sendEachForMulticast({
                tokens: batch,
                notification: { title, body },
                data,
                android: {
                    priority: 'high',
                    ttl: 86400 * 1000,
                    notification: {
                        channelId: channelForType(type),
                        title,
                        body,
                        sound: 'default',
                        defaultSound: true,
                        defaultVibrateTimings: true,
                        notificationCount: 1
                    }
                }
            });
            sent += res.successCount || 0;
            (res.responses || []).forEach((item, idx) => {
                if (item.success) return;
                const code = item.error && item.error.code;
                if (
                    code === 'messaging/registration-token-not-registered' ||
                    code === 'messaging/invalid-registration-token'
                ) {
                    stale.push(batch[idx]);
                }
            });
        } catch (err) {
            logger.warn('FCM send failed', { error: err.message, count: batch.length });
        }
    }
    if (stale.length) await deleteTokens(stale);
    return { sent, stale: stale.length };
}

async function notifyWhatsappMessage({ conversation, message, customer, isFromMe } = {}) {
    if (!conversation || !message) return;
    const {
        shouldNotifyIncomingWhatsapp,
        messagePreview,
        pickWhatsappRecipientIds
    } = require('../lib/staffPushTargets');
    if (!shouldNotifyIncomingWhatsapp({ isFromMe, direction: message.direction })) return;

    const { User } = require('../models');
    let staffRows = [];
    if (!conversation.assignedTo) {
        staffRows = await User.findAll({
            where: { isActive: true },
            attributes: ['id', 'role', 'departmentId', 'permissions', 'settings', 'branchId', 'email']
        });
    }
    const userIds = pickWhatsappRecipientIds(conversation, staffRows);
    const name = (customer && (customer.name || customer.phone)) || 'WhatsApp';
    return sendToUsers(userIds, {
        type: 'message',
        title: name,
        body: messagePreview(message, 'پیام جدید'),
        conversationId: conversation.id
    });
}

async function notifyInternalMessage({ userIds, fromName, preview, threadId }) {
    return sendToUsers(userIds, {
        type: 'internal',
        title: fromName || 'چت داخلی',
        body: preview || 'پیام جدید',
        threadId
    });
}

async function notifyAnnouncementPush({ userIds, title, body, announcementId }) {
    return sendToUsers(userIds, {
        type: 'announcement',
        title: title || 'اعلان',
        body: body || '',
        announcementId
    });
}

async function notifyTicketPush({ userIds, title, body, ticketId }) {
    return sendToUsers(userIds, {
        type: 'ticket',
        title: title || 'تیکت',
        body: body || '',
        ticketId
    });
}

async function notifyTaskPush({ userIds, title, body, taskId }) {
    return sendToUsers(userIds, {
        type: 'task',
        title: title || 'وظیفه',
        body: body || '',
        taskId
    });
}

async function notifyCallPush({ userId, fromName, threadId, callType }) {
    return sendToUsers([userId], {
        type: 'call',
        title: fromName || 'تماس داخلی',
        body: callType === 'video' ? 'تماس تصویری' : 'تماس صوتی',
        threadId
    });
}

module.exports = {
    getMessaging,
    sendToUsers,
    notifyWhatsappMessage,
    notifyInternalMessage,
    notifyAnnouncementPush,
    notifyTicketPush,
    notifyTaskPush,
    notifyCallPush
};

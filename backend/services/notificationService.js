/**
 * سرویس اعلان‌ها — ارسال ایمیل، Socket.IO، و... بر اساس تنظیمات کاربر
 */

const emailService = require('./emailService');
const { NotificationPreference, User, PanelSetting } = require('../models');
const { getPanelEmailConfig } = require('./panelSettingsLoader');
const logger = require('../config/logger');

/**
 * دریافت یا ایجاد تنظیمات اطلاعات یک کاربر
 */
async function getOrCreatePreference(userId) {
    const [pref] = await NotificationPreference.findOrCreate({
        where: { userId },
        defaults: { userId }
    });
    return pref;
}

/**
 * ارسال اطلاع اعلان مهم به ایمیل و Socket.IO
 */
async function notifyAnnouncement(announcement, recipientIds, io) {
    const results = [];
    if (!recipientIds || recipientIds.length === 0) return results;

    // batch load users and preferences
    const [users, prefs, settings] = await Promise.all([
        User.findAll({ where: { id: recipientIds }, attributes: ['id', 'email', 'name'] }),
        NotificationPreference.findAll({ where: { userId: recipientIds } }),
        PanelSetting.findByPk('default')
    ]);
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    const prefMap = Object.fromEntries(prefs.map(p => [p.userId, p]));
    const emailConfig = getPanelEmailConfig(settings);

    for (const userId of recipientIds) {
        try {
            const user = userMap[userId];
            if (!user) continue;
            const pref = prefMap[userId] || (await getOrCreatePreference(userId));

            // Socket.IO
            if (io && pref.announceSocketEnabled) {
                try {
                    io.to(`user_${userId}`).emit('important_announcement', {
                        id: announcement.id,
                        title: announcement.title,
                        body: announcement.body,
                        fromUser: announcement.fromUser || {},
                        timestamp: announcement.createdAt
                    });
                } catch (err) {
                    logger.error(`Socket.IO notification error for user ${userId}:`, err.message);
                }
            }

            // ایمیل
            if (pref.announceEmailEnabled && user.email) {
                try {
                    const esc = emailService.escHtml;
                    const title = `Important notice: ${esc(announcement.title)}`;
                    const from = announcement.fromUser ? esc(announcement.fromUser.name) : 'System';
                    const when = new Date(announcement.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
                    const bodyHtml = esc(String(announcement.body || '')).replace(/\n/g, '<br>');
                    const body = `
                        <p>Hello ${esc(user.name || 'there')},</p>
                        <p><strong>Important notice from ${from}:</strong></p>
                        <p>${bodyHtml}</p>
                        <p class="muted">Time: ${when}</p>
                    `;

                    const mailOpts = {
                        to: user.email,
                        subject: `Important notice: ${String(announcement.title || '').slice(0, 200)}`,
                        text: announcement.body,
                        html: emailService.baseHtml(title, body)
                    };

                    if (emailConfig && emailConfig.host) {
                        await emailService.sendMailWithConfig(emailConfig, mailOpts);
                    } else {
                        await emailService.sendMailWithRetry(mailOpts);
                    }
                    results.push({ userId, type: 'email', ok: true });
                } catch (err) {
                    logger.error(`Email notification error for user ${userId}:`, err.message);
                    results.push({ userId, type: 'email', ok: false, error: err.message });
                }
            }
        } catch (err) {
            logger.error(`Notification error for user ${userId}:`, err.message);
            results.push({ userId, ok: false, error: err.message });
        }
    }

    return results;
}

/**
 * ارسال اطلاع تخصیص تسک
 */
async function notifyTaskAssigned(task, io) {
    const results = [];
    if (!task || !task.assignedTo) return results;
    try {
        const pref = await getOrCreatePreference(task.assignedTo);
        const user = await User.findByPk(task.assignedTo, { attributes: ['id', 'email', 'name'] });
        if (!user) return results;

        // Socket.IO
        if (io && pref) {
            try {
                io.to(`user_${task.assignedTo}`).emit('task_assigned', {
                    taskId: task.id,
                    title: task.title,
                    priority: task.priority,
                    dueDate: task.dueDate
                });
            } catch (err) {
                logger.error(`Socket notification error:`, err.message);
            }
        }

        // ایمیل
        if (pref && pref.taskAssignedEmailEnabled && user.email) {
            try {
                const settings = await PanelSetting.findByPk('default');
                const emailConfig = getPanelEmailConfig(settings);
                const esc = emailService.escHtml;
                const title = `New task assigned: ${esc(task.title)}`;
                const priorityLabel = { low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent' }[task.priority] || esc(String(task.priority || ''));
                const dueStr = task.dueDate
                    ? new Date(task.dueDate).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
                    : 'Not set';
                const desc = esc((task.description || '—').substring(0, 200));
                const body = `
                    <p>Hello ${esc(user.name || 'there')},</p>
                    <p>A new task has been assigned to you:</p>
                    <p><strong>${esc(task.title)}</strong></p>
                    <ul>
                        <li>Priority: ${priorityLabel}</li>
                        <li>Due: ${dueStr}</li>
                        <li>Description: ${desc}${(task.description && task.description.length > 200) ? '…' : ''}</li>
                    </ul>
                    <p>Open the portal for full details.</p>
                `;

                const mailOpts = {
                    to: user.email,
                    subject: `New task: ${String(task.title || '').slice(0, 200)}`,
                    text: `Task: ${task.title}`,
                    html: emailService.baseHtml(title, body)
                };

                if (emailConfig && emailConfig.host) {
                    await emailService.sendMailWithConfig(emailConfig, mailOpts);
                } else {
                    await emailService.sendMailWithRetry(mailOpts);
                }
                results.push({ userId: task.assignedTo, type: 'email', ok: true });
            } catch (err) {
                logger.error(`Task email error:`, err.message);
                results.push({ userId: task.assignedTo, type: 'email', ok: false });
            }
        }
    } catch (err) {
        logger.error(`Task notification error:`, err.message);
    }

    return results;
}

/**
 * ارسال اطلاع تخصیص تیکت
 */
async function notifyTicketAssigned(ticket, io) {
    const results = [];
    if (!ticket || !ticket.assignedTo) return results;
    try {
        const pref = await getOrCreatePreference(ticket.assignedTo);
        const user = await User.findByPk(ticket.assignedTo, { attributes: ['id', 'email', 'name'] });
        if (!user) return results;

        // Socket.IO
        if (io && pref) {
            try {
                io.to(`user_${ticket.assignedTo}`).emit('ticket_assigned', {
                    ticketId: ticket.id,
                    ticketNumber: ticket.ticketNumber,
                    title: ticket.title,
                    priority: ticket.priority
                });
            } catch (err) {
                logger.error(`Ticket socket error:`, err.message);
            }
        }

        // ایمیل با template جدید
        if (pref && pref.ticketAssignedEmailEnabled && user.email) {
            try {
                const settings = await PanelSetting.findByPk('default');
                const emailConfig = getPanelEmailConfig(settings);
                const assignedByUser = ticket.creator ? ticket.creator.name || ticket.creator.email : null;
                await emailService.sendTicketAssigned(user, ticket, assignedByUser, emailConfig && emailConfig.host ? emailConfig : null);
                results.push({ userId: ticket.assignedTo, type: 'email', ok: true });
            } catch (err) {
                logger.error(`Ticket email error:`, err.message);
                results.push({ userId: ticket.assignedTo, type: 'email', ok: false });
            }
        }

        // اطلاع تلگرام به ادمین برای تیکت جدید
        try {
            const { notifySystemEvent } = require('./systemEventNotifier');
            await notifySystemEvent('system', '🎫 تیکت جدید ایجاد شد', {
                عنوان: ticket.title || '—',
                شماره: ticket.ticketNumber ? '#' + ticket.ticketNumber : '—',
                اولویت: { low: 'کم', normal: 'عادی', high: 'بالا', urgent: 'فوری' }[ticket.priority] || ticket.priority || '—',
                'تخصیص به': user.name || user.email || '—',
                ایجادکننده: ticket.creator ? ticket.creator.name || ticket.creator.email : '—',
            });
        } catch (_) {}
    } catch (err) {
        logger.error(`Ticket notification error:`, err.message);
    }

    return results;
}

/**
 * ارسال اطلاع پاسخ تیکت
 */
async function notifyTicketReply(ticket, reply, io) {
    const recipientIds = [
        ticket.createdBy,
        ticket.assignedTo
    ].filter(Boolean).filter((id, i, arr) => i === arr.indexOf(id)); // unique

    const results = [];
    if (!recipientIds || recipientIds.length === 0) return results;

    // batch load
    const [users, prefs, settings] = await Promise.all([
        User.findAll({ where: { id: recipientIds }, attributes: ['id', 'email', 'name'] }),
        NotificationPreference.findAll({ where: { userId: recipientIds } }),
        PanelSetting.findByPk('default')
    ]);
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    const prefMap = Object.fromEntries(prefs.map(p => [p.userId, p]));
    const emailConfig = getPanelEmailConfig(settings);

    for (const userId of recipientIds) {
        try {
            const user = userMap[userId];
            if (!user) continue;
            const pref = prefMap[userId] || (await getOrCreatePreference(userId));

            // Socket.IO
            if (io && pref) {
                try {
                    io.to(`user_${userId}`).emit('ticket_reply_notification', {
                        ticketId: ticket.id,
                        ticketNumber: ticket.ticketNumber,
                        replyId: reply.id,
                        replyContent: reply.content.substring(0, 100),
                        fromUser: reply.user || {}
                    });
                } catch (err) {
                    logger.error(`Socket error:`, err.message);
                }
            }

            // ایمیل
            if (pref && pref.ticketReplyEmailEnabled && user.email) {
                try {
                    const esc = emailService.escHtml;
                    const title = `Ticket reply: ${esc(ticket.title)}`;
                    const replyFrom = reply.user ? esc(reply.user.name) : 'Support';
                    const snippet = esc(reply.content.substring(0, 300)).replace(/\n/g, '<br>');
                    const body = `
                        <p>Hello ${esc(user.name || 'there')},</p>
                        <p><strong>${replyFrom}</strong> replied on ticket <strong>${esc(String(ticket.ticketNumber || ''))}</strong>:</p>
                        <p>${snippet}${reply.content.length > 300 ? '…' : ''}</p>
                        <p class="muted">Open the portal to read the full thread.</p>
                    `;

                    const mailOpts = {
                        to: user.email,
                        subject: `Ticket reply: ${String(ticket.title || '').slice(0, 200)}`,
                        text: reply.content.substring(0, 200),
                        html: emailService.baseHtml(title, body)
                    };

                    if (emailConfig && emailConfig.host) {
                        await emailService.sendMailWithConfig(emailConfig, mailOpts);
                    } else {
                        await emailService.sendMailWithRetry(mailOpts);
                    }
                    results.push({ userId, type: 'email', ok: true });
                } catch (err) {
                    logger.error(`Reply email error:`, err.message);
                    results.push({ userId, type: 'email', ok: false });
                }
            }
        } catch (err) {
            logger.error(`Reply notification error:`, err.message);
            results.push({ userId, ok: false });
        }
    }

    return results;
}

module.exports = {
    getOrCreatePreference,
    notifyAnnouncement,
    notifyTaskAssigned,
    notifyTicketAssigned,
    notifyTicketReply
};

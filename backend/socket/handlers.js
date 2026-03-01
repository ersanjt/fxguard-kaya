/**
 * هندلرهای Socket.IO — ارسال پیام، تماس تصویری/صوتی، وضعیت کاربر
 */
const { User, Conversation, Message, Department } = require('../models');
const { getSendTarget } = require('../lib/phoneUtils');
const { gatewayPost } = require('../lib/gatewayClient');
const { maybeSendEmployeeIntro } = require('../services/autoMessages');
const { logActivity } = require('../services/activityLog');

const VALID_STATUSES = ['online', 'away', 'busy', 'offline'];
const CALL_ROOM_TTL_MS = 2 * 60 * 60 * 1000; // 2 ساعت
const STATUS_DEBOUNCE_MS = 2000;

// WebSocket rate limiting: max messages per window per user
const WS_MSG_LIMIT = 30;
const WS_MSG_WINDOW_MS = 10 * 1000; // 10 seconds
const socketMsgCounters = new Map(); // userId -> { count, resetAt }

function checkSocketRateLimit(userId) {
    const now = Date.now();
    const entry = socketMsgCounters.get(userId);
    if (!entry || now > entry.resetAt) {
        socketMsgCounters.set(userId, { count: 1, resetAt: now + WS_MSG_WINDOW_MS });
        return true;
    }
    entry.count++;
    if (entry.count > WS_MSG_LIMIT) return false;
    return true;
}

const statusDebounceTimers = {};

const callRooms = {};

function cleanupStaleCallRooms() {
    const now = Date.now();
    for (const threadId of Object.keys(callRooms)) {
        const room = callRooms[threadId];
        if (room && room.createdAt && (now - room.createdAt) > CALL_ROOM_TTL_MS) {
            delete callRooms[threadId];
        }
    }
}
setInterval(cleanupStaleCallRooms, 30 * 60 * 1000);

function setupSocketHandlers(io, getRabbitChannel, logger) {
    io.on('connection', (socket) => {
        logger.info(`🔌 User connected: ${socket.userId}`);

        if (socket.userId) socket.join('user_' + String(socket.userId));
        if (socket.departmentId) socket.join(`department_${socket.departmentId}`);

        socket.on('send_message', async (data) => {
            try {
                if (!checkSocketRateLimit(socket.userId)) {
                    return socket.emit('error', { message: 'تعداد پیام‌های ارسالی بیش از حد مجاز است. لطفاً کمی صبر کنید.' });
                }
                const { conversationId, content, type, media } = data;
                if (!conversationId || typeof conversationId !== 'string') {
                    return socket.emit('error', { message: 'شناسه مکالمه الزامی است' });
                }
                const trimmedContent = (content || '').trim();
                if (!trimmedContent && !media) {
                    return socket.emit('error', { message: 'متن پیام یا فایل الزامی است' });
                }
                if (trimmedContent.length > 10000) {
                    return socket.emit('error', { message: 'متن پیام بیش از حد مجاز است' });
                }
                const conversation = await Conversation.findByPk(conversationId, {
                    include: ['customer', { model: Department, as: 'department', required: false }]
                });
                if (!conversation) {
                    return socket.emit('error', { message: 'Conversation not found' });
                }
                if (!conversation.customer) {
                    return socket.emit('error', { message: 'Customer not found for this conversation' });
                }

                const user = socket.userId ? await User.findByPk(socket.userId, {
                    include: [{ model: Department, as: 'department', required: false }]
                }) : null;

                if (!user) return socket.emit('error', { message: 'Unauthorized' });
                if (!user.isActive) return socket.emit('error', { message: 'حساب کاربری غیرفعال است' });

                const isPrivileged = ['owner', 'admin', 'manager', 'supervisor'].includes(user.role);
                const isAssigned = conversation.assignedTo === socket.userId;
                const sameDept = user.departmentId && conversation.departmentId && String(user.departmentId) === String(conversation.departmentId);
                if (!isPrivileged && !isAssigned && !sameDept) {
                    return socket.emit('error', { message: 'دسترسی به این مکالمه ندارید' });
                }

                if (socket.userId) {
                    const dept = conversation.department || (user && user.department) || null;
                    await maybeSendEmployeeIntro(conversation, socket.userId, user, dept);
                }

                const newMessage = await Message.create({
                    conversationId: conversation.id,
                    customerId: conversation.customerId,
                    userId: socket.userId,
                    direction: 'outgoing',
                    content: content,
                    type: type || 'text',
                    timestamp: new Date()
                });

                const toPhone = getSendTarget(conversation.customer.phone) || conversation.customer.phone;
                const rabbitChannel = typeof getRabbitChannel === 'function' ? getRabbitChannel() : getRabbitChannel;
                if (rabbitChannel) {
                    rabbitChannel.sendToQueue('outgoing_messages', Buffer.from(JSON.stringify({
                        to: toPhone, message: content, media: media, conversationId: conversation.id
                    })), { persistent: true });
                } else {
                    gatewayPost('/api/send-message', { to: toPhone, message: content, media: media || null }, { timeout: 10000 }).catch(err => logger.error('Gateway send error:', err.message));
                }

                const now = new Date();
                const upd = { lastMessageAt: now, lastOutgoingMessageAt: now, unreadCount: 0, unansweredAlertSentAt: null, escalatedAt: null };
                if (!conversation.firstReplyAt) upd.firstReplyAt = now;
                await conversation.update(upd);

                // Emit only to users in this conversation's room, not all clients
                io.to(`conversation_${conversation.id}`).emit('message_sent', { conversationId: conversation.id, message: newMessage });
                if (conversation.departmentId) {
                    io.to(`department_${conversation.departmentId}`).emit('message_sent', { conversationId: conversation.id, message: newMessage });
                }
                logger.info(`📤 Message sent by user ${socket.userId}`);
            } catch (error) {
                logger.error('Send message error:', error);
                socket.emit('error', { message: error.message });
            }
        });

        socket.on('call_offer', (data) => {
            const { toUserId, threadId, type, sdp } = data;
            if (!toUserId || !threadId || !sdp) return;
            if (!callRooms[threadId]) callRooms[threadId] = { participants: new Set(), type: type || 'voice', createdAt: Date.now() };
            callRooms[threadId].participants.add(String(socket.userId));
            io.to('user_' + String(toUserId)).emit('call_offer', { fromUserId: socket.userId, threadId, type: type || 'voice', sdp });
        });
        socket.on('call_answer', (data) => {
            const { toUserId, threadId, sdp } = data;
            if (!toUserId || !threadId || !sdp) return;
            if (callRooms[threadId]) callRooms[threadId].participants.add(String(socket.userId));
            io.to('user_' + String(toUserId)).emit('call_answer', { fromUserId: socket.userId, threadId, sdp });
        });
        socket.on('call_ice', (data) => {
            const { toUserId, threadId, candidate } = data;
            if (!toUserId || !threadId) return;
            io.to('user_' + String(toUserId)).emit('call_ice', { fromUserId: socket.userId, threadId, candidate });
        });
        socket.on('call_end', (data) => {
            const { threadId } = data;
            if (!threadId) return;
            const room = callRooms[threadId];
            if (room) {
                room.participants.delete(String(socket.userId));
                room.participants.forEach(uid => io.to(`user_${uid}`).emit('call_participant_left', { userId: socket.userId, threadId }));
                if (room.participants.size === 0) delete callRooms[threadId];
            }
        });
        socket.on('call_reject', (data) => {
            const { toUserId, threadId } = data;
            if (!toUserId || !threadId) return;
            io.to('user_' + String(toUserId)).emit('call_reject', { fromUserId: socket.userId, threadId });
        });
        socket.on('call_invite', async (data) => {
            const { toUserId, threadId, type, participantIds } = data;
            if (!toUserId || !threadId) return;
            const room = callRooms[threadId];
            if (!room || !room.participants.has(String(socket.userId))) return;
            const fromUser = await User.findByPk(socket.userId, { attributes: ['name', 'email'] });
            const fromUserName = (fromUser && (fromUser.name || fromUser.email)) || '';
            io.to('user_' + String(toUserId)).emit('call_invite', { fromUserId: socket.userId, fromUserName, threadId, type: type || room.type, participantIds: participantIds || Array.from(room.participants) });
        });
        socket.on('call_invite_accept', (data) => {
            const { threadId, type } = data;
            if (!threadId) return;
            const room = callRooms[threadId];
            if (!room) return;
            const participants = Array.from(room.participants);
            room.participants.add(String(socket.userId));
            participants.forEach(uid => io.to(`user_${uid}`).emit('call_participant_joined', { userId: socket.userId, threadId }));
            io.to('user_' + String(socket.userId)).emit('call_room_info', { threadId, participantIds: participants, type: type || room.type });
        });
        socket.on('call_invite_reject', async (data) => {
            const { fromUserId, threadId } = data;
            if (!fromUserId || !threadId) return;
            const rejecter = await User.findByPk(socket.userId, { attributes: ['name', 'email'] });
            const userName = (rejecter && (rejecter.name || rejecter.email)) || '';
            io.to('user_' + String(fromUserId)).emit('call_invite_reject', { userId: socket.userId, userName, threadId });
        });

        socket.on('status_change', (status) => {
            if (!VALID_STATUSES.includes(status) || !socket.userId) return;
            const uid = socket.userId;
            if (statusDebounceTimers[uid]) clearTimeout(statusDebounceTimers[uid]);
            statusDebounceTimers[uid] = setTimeout(async () => {
                delete statusDebounceTimers[uid];
                try {
                    await User.update({ status }, { where: { id: uid } });
                    io.emit('user_status', { userId: uid, status });
                } catch (e) {
                    logger.warn('status_change update error:', e.message);
                }
            }, STATUS_DEBOUNCE_MS);
        });

        socket.on('disconnect', async () => {
            logger.info(`🔌 User disconnected: ${socket.userId}`);
            Object.keys(callRooms).forEach(threadId => {
                const room = callRooms[threadId];
                if (room && room.participants.has(String(socket.userId))) {
                    room.participants.delete(String(socket.userId));
                    room.participants.forEach(uid => io.to(`user_${uid}`).emit('call_participant_left', { userId: socket.userId, threadId }));
                    if (room.participants.size === 0) delete callRooms[threadId];
                }
            });
            if (socket.userId) {
                // Cancel any pending debounced status change
                if (statusDebounceTimers[socket.userId]) {
                    clearTimeout(statusDebounceTimers[socket.userId]);
                    delete statusDebounceTimers[socket.userId];
                }
                try {
                    await User.update({ status: 'offline' }, { where: { id: socket.userId } });
                    await logActivity({
                        userId: socket.userId,
                        branchId: socket.branchId || null,
                        departmentId: socket.departmentId || null,
                        action: 'user_logout',
                        entityType: 'user',
                        entityId: socket.userId,
                        summary: 'خروج از پورتال (قطع اتصال)',
                        metadata: {}
                    });
                    io.emit('user_status', { userId: socket.userId, status: 'offline' });
                } catch (e) {
                    logger.warn('Disconnect status update:', e.message);
                }
            }
        });
    });
}

module.exports = { setupSocketHandlers };

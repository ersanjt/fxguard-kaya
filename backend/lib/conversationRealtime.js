'use strict';

/**
 * ارسال رویداد سوکت مکالمه فقط به کاربرانی که به آن مکالمه دسترسی دارند.
 */
async function emitNewMessageToAuthorized(io, conversation, payload) {
    if (!io || !payload || !conversation) return;
    let sockets;
    try {
        sockets = await io.fetchSockets();
    } catch (_) {
        return;
    }
    const { canAccessConversationAsync } = require('./conversationAccess');
    const { canAccess } = require('./permissions');
    await Promise.all(
        sockets.map(async (s) => {
            if (!s.user || !s.userId) return;
            if (s.user.isActive === false) return;
            try {
                if (!canAccess(s.user, 'conversations')) return;
                if (await canAccessConversationAsync(s.user, s.userId, conversation)) {
                    s.emit('new_message', payload);
                }
            } catch (_) {
                /* ignore per-socket access errors */
            }
        })
    );
}

module.exports = { emitNewMessageToAuthorized };

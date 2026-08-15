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
    await Promise.all(
        sockets.map(async (s) => {
            if (!s.user || !s.userId) return;
            try {
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

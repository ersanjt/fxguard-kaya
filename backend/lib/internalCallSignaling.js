'use strict';

function asCallId(value) {
    return value == null ? '' : String(value);
}

function callUserRoom(userId) {
    const id = asCallId(userId);
    return id ? 'user_' + id : '';
}

function normalizeCallSignal(data, fromUserId) {
    if (!data || typeof data !== 'object') return null;
    const toUserId = asCallId(data.toUserId);
    const threadId = asCallId(data.threadId);
    if (!toUserId || !threadId) return null;
    return {
        toUserId,
        threadId,
        type: data.type === 'video' ? 'video' : 'voice',
        sdp: data.sdp || null,
        candidate: data.candidate,
        participantIds: Array.isArray(data.participantIds) ? data.participantIds.map(asCallId) : null,
        fromUserId: asCallId(fromUserId)
    };
}

module.exports = { asCallId, callUserRoom, normalizeCallSignal };

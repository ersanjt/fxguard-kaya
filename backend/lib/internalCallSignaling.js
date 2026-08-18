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

async function canRelayCallSignal(fromUserId, toUserId, threadId) {
    const from = asCallId(fromUserId);
    const to = asCallId(toUserId);
    const tid = asCallId(threadId);
    if (!from || !to || !tid || from === to) return false;
    const { User, InternalThreadParticipant } = require('../models');
    const peer = await User.findByPk(to, { attributes: ['id', 'isActive'] });
    if (!peer || !peer.isActive) return false;
    const rows = await InternalThreadParticipant.findAll({
        where: { threadId: tid },
        attributes: ['userId'],
    });
    if (!rows.length) return false;
    const ids = new Set(rows.map((r) => asCallId(r.userId)));
    return ids.has(from) && ids.has(to);
}

module.exports = { asCallId, callUserRoom, normalizeCallSignal, canRelayCallSignal };

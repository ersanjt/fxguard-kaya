'use strict';

/**
 * Staff JWT versioning — password change, deactivation, and logout
 * invalidate every existing Bearer/cookie for that user.
 */
const jwt = require('jsonwebtoken');

const JWT_OPTIONS = { expiresIn: process.env.JWT_EXPIRES_IN || '7d' };

function tokenVersionOf(user) {
    return Number(user && user.tokenVersion) || 0;
}

function issueStaffToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, tv: tokenVersionOf(user) },
        process.env.JWT_SECRET,
        JWT_OPTIONS
    );
}

function assertMatchingTokenVersion(decoded, user) {
    const claimed = decoded && decoded.tv != null ? Number(decoded.tv) : 0;
    if (claimed !== tokenVersionOf(user)) {
        const err = new Error('revoked');
        err.code = 'REVOKED';
        throw err;
    }
}

async function bumpStaffSession(user) {
    if (!user) return 0;
    const next = tokenVersionOf(user) + 1;
    await user.update({ tokenVersion: next });
    user.tokenVersion = next;
    return next;
}

async function disconnectStaffSockets(io, userId) {
    if (!io || !userId) return;
    try {
        const sockets = await io.fetchSockets();
        sockets.forEach((s) => {
            if (String(s.userId) !== String(userId)) return;
            try {
                s.emit('session_revoked', { reason: 'revoked' });
            } catch (_) {}
            s.disconnect(true);
        });
    } catch (_) {}
}

async function revokeStaffSessions(user, io) {
    if (!user) return;
    await bumpStaffSession(user);
    await disconnectStaffSockets(io, user.id);
    try {
        const { DevicePushToken } = require('../models');
        if (DevicePushToken) {
            await DevicePushToken.destroy({ where: { userId: user.id } });
        }
    } catch (_) {}
}

module.exports = {
    tokenVersionOf,
    issueStaffToken,
    assertMatchingTokenVersion,
    bumpStaffSession,
    disconnectStaffSockets,
    revokeStaffSessions,
};

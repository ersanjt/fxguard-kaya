/**
 * Kaya CRM — حضور زنده کارکنان (نه فیلد status گیرکرده در DB)
 * @file    backend/lib/staffPresence.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 *
 * داشبورد هر ۳۰ ثانیه heartbeat می‌زند؛ بعد از ۲ دقیقه بدون سیگنال، آنلاین نیست.
 */
const { Op } = require('sequelize');

const PRESENCE_TTL_MS = 2 * 60 * 1000;
const ACTIVE_PRESENCE_STATUSES = ['online', 'away', 'busy'];

function freshPresenceSince(now = Date.now()) {
    return new Date(now - PRESENCE_TTL_MS);
}

function isPresenceFresh(lastSeenAt, now = Date.now()) {
    if (!lastSeenAt) return false;
    const t = lastSeenAt instanceof Date ? lastSeenAt.getTime() : Date.parse(lastSeenAt);
    if (!Number.isFinite(t)) return false;
    return now - t <= PRESENCE_TTL_MS;
}

function getConnectedUserIds(io) {
    const ids = new Set();
    if (!io || !io.sockets || !io.sockets.sockets) return ids;
    for (const socket of io.sockets.sockets.values()) {
        if (socket.userId) ids.add(String(socket.userId));
    }
    return ids;
}

function countUserSockets(io, userId, exceptSocketId) {
    if (!io || !userId || !io.sockets || !io.sockets.sockets) return 0;
    const id = String(userId);
    let n = 0;
    for (const socket of io.sockets.sockets.values()) {
        if (exceptSocketId && socket.id === exceptSocketId) continue;
        if (socket.userId && String(socket.userId) === id) n += 1;
    }
    return n;
}

function mergeLivePresenceWhere(where, io) {
    const connectedIds = [...getConnectedUserIds(io)];
    const or = [{ lastSeenAt: { [Op.gte]: freshPresenceSince() } }];
    if (connectedIds.length) {
        or.push({ id: { [Op.in]: connectedIds } });
    }
    return {
        ...where,
        status: where.status || { [Op.in]: ACTIVE_PRESENCE_STATUSES },
        [Op.or]: or,
    };
}

async function expireStalePresence(User, io) {
    if (!User) return 0;
    const connectedIds = [...getConnectedUserIds(io)];
    const where = {
        status: { [Op.in]: ACTIVE_PRESENCE_STATUSES },
        [Op.or]: [{ lastSeenAt: null }, { lastSeenAt: { [Op.lt]: freshPresenceSince() } }],
    };
    if (connectedIds.length) {
        where.id = { [Op.notIn]: connectedIds };
    }
    const stale = await User.findAll({
        where,
        attributes: ['id'],
    });
    if (!stale.length) return 0;
    await User.update(
        { status: 'offline' },
        { where: { id: { [Op.in]: stale.map((u) => u.id) } } }
    );
    return stale.length;
}

module.exports = {
    PRESENCE_TTL_MS,
    ACTIVE_PRESENCE_STATUSES,
    freshPresenceSince,
    isPresenceFresh,
    getConnectedUserIds,
    countUserSockets,
    mergeLivePresenceWhere,
    expireStalePresence,
};

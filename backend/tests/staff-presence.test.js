/**
 * Unit tests for live staff presence (no HTTP / DB)
 */
const assert = require('assert');
const { Op } = require('sequelize');
const {
    PRESENCE_TTL_MS,
    isPresenceFresh,
    getConnectedUserIds,
    countUserSockets,
    mergeLivePresenceWhere,
} = require('../lib/staffPresence');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log('  ✓', name);
    } catch (err) {
        failed++;
        console.error('  ✗', name, '→', err.message);
    }
}

console.log('staffPresence unit tests\n');

test('stale lastSeenAt is not fresh', () => {
    const old = new Date(Date.now() - PRESENCE_TTL_MS - 1000);
    assert.strictEqual(isPresenceFresh(old), false);
    assert.strictEqual(isPresenceFresh(null), false);
});

test('recent lastSeenAt is fresh', () => {
    assert.strictEqual(isPresenceFresh(new Date()), true);
});

test('getConnectedUserIds reads socket.userId', () => {
    const io = {
        sockets: {
            sockets: new Map([
                ['a', { id: 'a', userId: 'u1' }],
                ['b', { id: 'b', userId: 'u1' }],
                ['c', { id: 'c', userId: 'u2' }],
                ['d', { id: 'd' }],
            ]),
        },
    };
    const ids = getConnectedUserIds(io);
    assert.strictEqual(ids.size, 2);
    assert(ids.has('u1'));
    assert(ids.has('u2'));
    assert.strictEqual(countUserSockets(io, 'u1'), 2);
    assert.strictEqual(countUserSockets(io, 'u1', 'a'), 1);
});

test('live presence where requires fresh lastSeenAt or connected id', () => {
    const io = {
        sockets: {
            sockets: new Map([['a', { userId: 'live-user' }]]),
        },
    };
    const where = mergeLivePresenceWhere({ isActive: true }, io);
    assert.strictEqual(where.isActive, true);
    assert(Array.isArray(where[Op.or]));
    assert(where[Op.or].some((c) => c.lastSeenAt));
    assert(where[Op.or].some((c) => c.id && c.id[Op.in] && c.id[Op.in].includes('live-user')));
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

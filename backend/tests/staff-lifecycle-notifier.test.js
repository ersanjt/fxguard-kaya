/**
 * Unit tests for staffLifecycleNotifier (no HTTP / DB required for pure helpers)
 */
const assert = require('assert');
const {
    computeLifecycleChanges,
    formatChangesText,
    normalizeStaffPhone,
    snapshotUser,
} = require('../services/staffLifecycleDiff');

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

console.log('staffLifecycleNotifier unit tests\n');

test('detects role change', () => {
    const before = snapshotUser({ id: '1', role: 'agent', isActive: true, permissions: {} });
    const after = snapshotUser({ id: '1', role: 'supervisor', isActive: true, permissions: {} });
    const changes = computeLifecycleChanges(before, after);
    assert.strictEqual(changes.length, 1);
    assert.strictEqual(changes[0].key, 'role');
});

test('detects block/unblock', () => {
    const before = snapshotUser({ id: '1', role: 'agent', isActive: true, permissions: {} });
    const after = snapshotUser({ id: '1', role: 'agent', isActive: false, permissions: {} });
    const changes = computeLifecycleChanges(before, after);
    assert(changes.some((c) => c.key === 'account_deactivated'));
});

test('detects password change via opts', () => {
    const before = snapshotUser({ id: '1', role: 'agent', isActive: true, permissions: {} });
    const after = snapshotUser({ id: '1', role: 'agent', isActive: true, permissions: {} });
    const changes = computeLifecycleChanges(before, after, { passwordChanged: true });
    assert(changes.some((c) => c.key === 'password'));
});

test('formatChangesText is non-empty for changes', () => {
    const text = formatChangesText([
        { key: 'role', label: 'نقش', from: 'کارشناس', to: 'سرپرست' },
    ]);
    assert(text.includes('نقش'));
    assert(text.includes('سرپرست'));
});

test('normalizeStaffPhone accepts IR mobile', () => {
    const n = normalizeStaffPhone('09121234567');
    assert(n && n.startsWith('98'));
});

test('normalizeStaffPhone rejects garbage', () => {
    assert.strictEqual(normalizeStaffPhone('abc'), null);
    assert.strictEqual(normalizeStaffPhone(''), null);
});

test('no changes when identical', () => {
    const snap = snapshotUser({ id: '1', role: 'agent', isActive: true, permissions: { tickets: true } });
    assert.strictEqual(computeLifecycleChanges(snap, snap).length, 0);
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

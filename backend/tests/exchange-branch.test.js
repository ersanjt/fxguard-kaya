/**
 * Exchange branch scope helpers.
 */
const assert = require('assert');
const {
    canSeeAllExchangeBranches,
    applyExchangeBranchFilter,
    denyIfWrongBranch,
    assignWriteBranchId
} = require('../lib/exchangeBranchScope');

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

console.log('exchange branch scope unit tests\n');

const BRANCH_A = '11111111-1111-1111-1111-111111111111';
const BRANCH_B = '22222222-2222-2222-2222-222222222222';

test('owner and admin see all branches', () => {
    assert.strictEqual(canSeeAllExchangeBranches({ role: 'owner' }), true);
    assert.strictEqual(canSeeAllExchangeBranches({ role: 'admin' }), true);
    assert.strictEqual(canSeeAllExchangeBranches({ role: 'manager', branchId: BRANCH_A }), false);
    assert.strictEqual(canSeeAllExchangeBranches({ role: 'agent', branchId: BRANCH_A }), false);
});

test('agent list is forced to their branch', () => {
    const scoped = applyExchangeBranchFilter({ role: 'agent', branchId: BRANCH_A }, BRANCH_B);
    assert.strictEqual(scoped.ok, false);
    assert.strictEqual(scoped.status, 403);
    const own = applyExchangeBranchFilter({ role: 'agent', branchId: BRANCH_A }, '');
    assert.strictEqual(own.ok, true);
    assert.strictEqual(own.where.branchId, BRANCH_A);
});

test('agent without branch sees empty lists', () => {
    const scoped = applyExchangeBranchFilter({ role: 'agent' }, '');
    assert.strictEqual(scoped.ok, true);
    assert.strictEqual(scoped.empty, true);
});

test('owner may filter by query branch', () => {
    const scoped = applyExchangeBranchFilter({ role: 'owner' }, BRANCH_B);
    assert.strictEqual(scoped.ok, true);
    assert.strictEqual(scoped.where.branchId, BRANCH_B);
});

test('agent cannot read or write another branch record', () => {
    const agent = { role: 'agent', branchId: BRANCH_A };
    assert.strictEqual(denyIfWrongBranch(agent, BRANCH_B).ok, false);
    assert.strictEqual(denyIfWrongBranch(agent, BRANCH_A).ok, true);
    assert.strictEqual(assignWriteBranchId(agent, BRANCH_B).ok, false);
    assert.strictEqual(assignWriteBranchId(agent, null).branchId, BRANCH_A);
    assert.strictEqual(assignWriteBranchId({ role: 'owner' }, BRANCH_B).branchId, BRANCH_B);
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

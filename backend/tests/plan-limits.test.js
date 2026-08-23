/**
 * Unit tests for commercial plan caps (no HTTP / DB)
 */
const assert = require('assert');
const {
    DEFAULT_TIER,
    normalizePlanTier,
    resolvePlanTier,
    limitsForTier,
    remainingSlots,
    mergeFxHidden,
    commercialHomeKind,
    planErrorPayload,
    PlanLimitError,
} = require('../lib/planLimits');

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

console.log('planLimits unit tests\n');

test('unknown / empty stored tier is legacy (no caps)', () => {
    assert.strictEqual(normalizePlanTier(''), null);
    assert.strictEqual(resolvePlanTier(null, {}), DEFAULT_TIER);
    assert.strictEqual(resolvePlanTier('nope', {}), 'legacy');
    const legacy = limitsForTier('legacy');
    assert.strictEqual(legacy.staffLimit, null);
    assert.strictEqual(legacy.branchLimit, null);
    assert.strictEqual(legacy.fxEnabled, true);
});

test('Start caps 3 staff, 1 branch, no FX', () => {
    const start = limitsForTier('start');
    assert.strictEqual(start.staffLimit, 3);
    assert.strictEqual(start.branchLimit, 1);
    assert.strictEqual(start.fxEnabled, false);
});

test('Business caps 10 staff, 3 branches, FX on', () => {
    const biz = limitsForTier('business');
    assert.strictEqual(biz.staffLimit, 10);
    assert.strictEqual(biz.branchLimit, 3);
    assert.strictEqual(biz.fxEnabled, true);
});

test('env PLAN_TIER is default when DB empty; lock overrides stored', () => {
    assert.strictEqual(resolvePlanTier(null, { PLAN_TIER: 'start' }), 'start');
    assert.strictEqual(
        resolvePlanTier('multi', { PLAN_TIER: 'start', PLAN_TIER_LOCK: '1' }),
        'start'
    );
    assert.strictEqual(
        resolvePlanTier('business', { PLAN_TIER: 'start', PLAN_TIER_LOCK: '0' }),
        'business'
    );
});

test('mergeFxHidden only when FX is locked', () => {
    const open = mergeFxHidden(['tickets'], { fxEnabled: true });
    assert.deepStrictEqual(open, ['tickets']);
    const locked = mergeFxHidden(['tickets'], { fxEnabled: false });
    assert.ok(locked.indexOf('rates') >= 0);
    assert.ok(locked.indexOf('services') >= 0);
    assert.ok(locked.indexOf('tickets') >= 0);
});

test('remaining slots and PlanLimitError payload', () => {
    assert.strictEqual(remainingSlots(2, 3), 1);
    assert.strictEqual(remainingSlots(3, 3), 0);
    assert.strictEqual(remainingSlots(1, null), null);
    const err = new PlanLimitError('cap', 'PLAN_STAFF_LIMIT');
    assert.deepStrictEqual(planErrorPayload(err), { error: 'cap', code: 'PLAN_STAFF_LIMIT' });
    assert.strictEqual(planErrorPayload(new Error('nope')), null);
});

test('home banner is quiet for legacy unless a trial is running', () => {
    assert.strictEqual(commercialHomeKind({ tier: 'legacy', fxEnabled: true }, { status: 'none' }), 'none');
    assert.strictEqual(commercialHomeKind({ tier: 'business' }, { status: 'converted' }), 'none');
    assert.strictEqual(commercialHomeKind({ tier: 'start', fxEnabled: false }, { status: 'none' }), 'start');
    assert.strictEqual(commercialHomeKind({ tier: 'start' }, { status: 'active' }), 'trial_active');
    assert.strictEqual(commercialHomeKind({ tier: 'legacy' }, { status: 'expired' }), 'trial_expired');
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

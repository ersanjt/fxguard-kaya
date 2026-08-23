/**
 * Unit tests for product-fit math (no HTTP / DB)
 */
const assert = require('assert');
const {
    PANEL_SHARE_TARGET_PCT,
    panelSharePct,
    meetsPanelShareTarget,
    seanEllisVeryDisappointedPct,
    normalizeSeanEllisAnswer,
} = require('../lib/productFit');

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

console.log('productFit unit tests\n');

test('panel share is null when no team outbound', () => {
    assert.strictEqual(panelSharePct(0, 0), null);
    assert.strictEqual(meetsPanelShareTarget(null), false);
});

test('panel share hits 80% target', () => {
    assert.strictEqual(panelSharePct(80, 20), 80);
    assert.strictEqual(meetsPanelShareTarget(80), true);
    assert.strictEqual(meetsPanelShareTarget(79.9), false);
    assert.strictEqual(PANEL_SHARE_TARGET_PCT, 80);
});

test('Sean Ellis very-disappointed share', () => {
    assert.strictEqual(seanEllisVeryDisappointedPct({ very: 8, somewhat: 1, not: 1 }), 80);
    assert.strictEqual(seanEllisVeryDisappointedPct({}), null);
});

test('normalizes Sean Ellis answers', () => {
    assert.strictEqual(normalizeSeanEllisAnswer('very_disappointed'), 'very');
    assert.strictEqual(normalizeSeanEllisAnswer('Somewhat'), 'somewhat');
    assert.strictEqual(normalizeSeanEllisAnswer('nope'), null);
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

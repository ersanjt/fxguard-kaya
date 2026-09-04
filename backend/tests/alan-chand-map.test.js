/**
 * Unit tests for Alan Chand → Navasan snapshot mapping (no HTTP / DB)
 */
const assert = require('assert');
const {
    normalizeAlanChandApiKey,
    parseAlanChandNumber,
    extractAlanChandRecords,
    mapAlanChandToNavasanShape,
    maybeTomanFromRial
} = require('../lib/alanChandApi');
const { normalizeRatesApiProvider } = require('../lib/ratesApiProvider');

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

console.log('alanChand map unit tests\n');

test('strips Bearer prefix and quotes from pasted token', () => {
    assert.strictEqual(normalizeAlanChandApiKey('  Bearer abc-123  '), 'abc-123');
    assert.strictEqual(normalizeAlanChandApiKey('"tok"'), 'tok');
});

test('parses comma-formatted prices', () => {
    assert.strictEqual(parseAlanChandNumber('2,219,000'), 2219000);
    assert.strictEqual(parseAlanChandNumber(2219000), 2219000);
});

test('maps keyed currency object to usd_sell / usd_buy', () => {
    const raw = mapAlanChandToNavasanShape({
        usd: { sell: 2219000, buy: 2197000, change: 1000 }
    }, 'currency');
    assert.strictEqual(raw.usd_sell.value, 2219000);
    assert.strictEqual(raw.usd_buy.value, 2197000);
    assert.strictEqual(raw.usd.value, 2219000);
    assert.strictEqual(raw.usd_sell.change, 1000);
});

test('maps array records with slug + price', () => {
    const raw = mapAlanChandToNavasanShape({
        data: [{ slug: 'eur', price: 2579000 }]
    }, 'currency');
    assert.strictEqual(raw.eur.value, 2579000);
    assert.strictEqual(raw.mex_eur_sell.value, 2579000);
});

test('converts gold IRR-sized values to toman', () => {
    assert.strictEqual(maybeTomanFromRial(233690400, true), 23369040);
    assert.strictEqual(maybeTomanFromRial(23369040, true), 23369040);
    const raw = mapAlanChandToNavasanShape({
        '18ayar': { sell: 233690400 }
    }, 'gold');
    assert.strictEqual(raw['18ayar'].value, 23369040);
});

test('extracts nested data object records', () => {
    const recs = extractAlanChandRecords({ data: { gbp: { sell: 10 } } });
    assert.strictEqual(recs.length, 1);
    assert.strictEqual(recs[0].symbol, 'gbp');
});

test('provider normalizer only allows navasan | alanchand', () => {
    assert.strictEqual(normalizeRatesApiProvider('alanchand'), 'alanchand');
    assert.strictEqual(normalizeRatesApiProvider('navasan'), 'navasan');
    assert.strictEqual(normalizeRatesApiProvider('other'), 'navasan');
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

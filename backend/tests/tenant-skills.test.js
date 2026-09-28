/**
 * Unit tests for tenant industry presets and skill gating
 */
'use strict';

const assert = require('assert');
const {
    SKILLS,
    INDUSTRIES,
    normalizeIndustry,
    normalizeSkills,
    industryModules,
    defaultSkillsFor,
    parseSkillsColumn,
    isSkillEnabled,
    hiddenPagesForTenant,
    mergeSkillHidden,
    disabledSkillForPath,
    terminologyForIndustry,
    attachTenantSkillsToSettings,
    publicCatalog,
} = require('../lib/tenantSkills');

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

console.log('tenant skills tests\n');

test('industry ids normalize; unknown is rejected', () => {
    assert.strictEqual(normalizeIndustry(' Health '), 'health');
    assert.strictEqual(normalizeIndustry('casino'), null);
    assert.strictEqual(normalizeIndustry(''), null);
});

test('industry add-on defaults only reference add-on modules', () => {
    const addonIds = SKILLS.filter((s) => s.tier === 'addon').map((s) => s.id);
    INDUSTRIES.forEach((ind) => {
        ind.addons.forEach((id) => assert.ok(addonIds.indexOf(id) >= 0, ind.id + ':' + id));
    });
});

test('every industry module belongs to a real industry', () => {
    const ids = INDUSTRIES.map((i) => i.id);
    SKILLS.filter((s) => s.tier === 'industry').forEach((s) => {
        assert.ok(s.industries.length > 0, s.id);
        s.industries.forEach((i) => assert.ok(ids.indexOf(i) >= 0, s.id + ':' + i));
    });
});

test('general and unknown modules are dropped from stored list', () => {
    assert.deepStrictEqual(normalizeSkills(['customers', 'tickets', 'processes', 'nope', 'processes']), ['processes']);
    assert.deepStrictEqual(parseSkillsColumn('["fx_rates","processes"]'), ['processes', 'fx_rates']);
    assert.strictEqual(parseSkillsColumn('not json'), null);
    assert.strictEqual(parseSkillsColumn(null), null);
});

test('general modules are on for every panel and cannot be hidden', () => {
    const bare = { id: 't', isPlatform: false, industry: 'general', enabledSkills: [] };
    ['tickets', 'tasks', 'internal_chat', 'announcements', 'staff_monitoring', 'customers'].forEach((id) =>
        assert.strictEqual(isSkillEnabled(bare, id), true, id)
    );
    const hidden = hiddenPagesForTenant(bare);
    ['tickets', 'tasks', 'internal-chat', 'announcements', 'supervision', 'staff-activity'].forEach((p) =>
        assert.ok(hidden.indexOf(p) < 0, p)
    );
    assert.ok(hidden.indexOf('processes') >= 0);
    assert.ok(hidden.indexOf('branches') >= 0);
});

test('industry modules are shared where businesses overlap', () => {
    assert.ok(industryModules('food_distribution').indexOf('inventory') >= 0);
    assert.ok(industryModules('manufacturing').indexOf('inventory') >= 0);
    assert.deepStrictEqual(industryModules('general'), []);
    assert.deepStrictEqual(industryModules('bogus'), []);
});

test('a clinic can add an exchange module as an extra', () => {
    const clinic = {
        id: 't',
        isPlatform: false,
        industry: 'health',
        enabledSkills: defaultSkillsFor('health').concat(['fx_rates']),
    };
    assert.strictEqual(disabledSkillForPath(clinic, '/api/rates'), null);
    assert.strictEqual(disabledSkillForPath(clinic, '/api/services').id, 'exchange_services');
});

test('exchange desks get FX modules; clinics do not', () => {
    assert.ok(defaultSkillsFor('exchange').indexOf('fx_rates') >= 0);
    assert.ok(defaultSkillsFor('health').indexOf('fx_rates') < 0);
    assert.ok(defaultSkillsFor('health').indexOf('appointments') >= 0);
    assert.deepStrictEqual(defaultSkillsFor('bogus'), defaultSkillsFor('general'));
});

test('legacy tenants and platform keep their exchange set, without new industry modules', () => {
    const legacy = { id: 't', isPlatform: false, enabledSkills: null };
    const platform = { id: 'p', isPlatform: true, enabledSkills: ['tickets'] };
    [legacy, platform].forEach((t) => {
        const hidden = hiddenPagesForTenant(t);
        ['rates', 'rates-charts', 'services', 'processes', 'branches'].forEach((p) => assert.ok(hidden.indexOf(p) < 0, p));
        assert.ok(hidden.indexOf('clinic-patients') >= 0);
        assert.strictEqual(disabledSkillForPath(t, '/api/rates'), null);
        assert.strictEqual(disabledSkillForPath(t, '/api/clinic/patients').id, 'patients');
        assert.strictEqual(isSkillEnabled(t, 'fx_rates'), true);
    });
});

test('module dependencies are pulled in automatically', () => {
    assert.deepStrictEqual(normalizeSkills(['appointments']), ['patients', 'doctors', 'appointments']);
});

test('API gate is not bypassed by letter case or duplicate slashes', () => {
    const plain = { id: 't', isPlatform: false, industry: 'general', enabledSkills: [] };
    assert.strictEqual(disabledSkillForPath(plain, '/API/Clinic/Patients').id, 'patients');
    assert.strictEqual(disabledSkillForPath(plain, '/api//clinic/appointments/x').id, 'appointments');
});

test('clinic hides FX pages and blocks FX API', () => {
    const clinic = { id: 't', isPlatform: false, industry: 'health', enabledSkills: defaultSkillsFor('health') };
    const hidden = hiddenPagesForTenant(clinic);
    ['rates', 'rates-charts', 'services'].forEach((p) => assert.ok(hidden.indexOf(p) >= 0, p));
    assert.ok(hidden.indexOf('tickets') < 0);
    assert.ok(hidden.indexOf('customers') < 0);
    assert.strictEqual(disabledSkillForPath(clinic, '/api/rates/ticker-config?x=1').id, 'fx_rates');
    assert.strictEqual(disabledSkillForPath(clinic, '/api/services').id, 'exchange_services');
    assert.strictEqual(disabledSkillForPath(clinic, '/api/ratesfoo'), null);
    assert.strictEqual(disabledSkillForPath(clinic, '/api/customers'), null);
    assert.strictEqual(isSkillEnabled(clinic, 'customers'), true);
});

test('skill hidden pages merge with manual hidden list without duplicates', () => {
    const t = { id: 't', isPlatform: false, enabledSkills: ['tasks'] };
    const merged = mergeSkillHidden(['tickets', 'rates'], t);
    assert.strictEqual(merged.filter((p) => p === 'tickets').length, 1);
    assert.ok(merged.indexOf('services') >= 0);
});

test('settings payload carries industry terminology', () => {
    const t = { id: 't', isPlatform: false, industry: 'health', enabledSkills: ['tickets'] };
    const out = attachTenantSkillsToSettings({ navHiddenSections: ['users'] }, t);
    assert.strictEqual(out.industry, 'health');
    assert.strictEqual(out.terminology.nav_customers.fa, 'مخاطبان');
    assert.ok(out.navHiddenSections.indexOf('users') >= 0);
    assert.ok(out.navHiddenSections.indexOf('processes') >= 0);
    assert.ok(out.navHiddenSections.indexOf('tasks') < 0);
    const plat = attachTenantSkillsToSettings({ hiddenSections: [] }, { isPlatform: true, industry: 'health' });
    assert.strictEqual(plat.industry, null);
    assert.deepStrictEqual(plat.terminology, {});
    assert.deepStrictEqual(terminologyForIndustry('exchange'), {});
});

test('public catalog exposes labels in all three languages', () => {
    const cat = publicCatalog();
    assert.ok(cat.industries.length >= 7);
    cat.skills.concat(cat.industries).forEach((row) => {
        ['fa', 'en', 'tr'].forEach((l) => assert.ok(row.label[l], row.id + ':' + l));
    });
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

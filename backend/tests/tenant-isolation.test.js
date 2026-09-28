/**
 * جداسازی سازمان: توکن، Host جعلی، و کوئری‌های update/delete
 */
'use strict';

const assert = require('assert');
const { Op, Sequelize, DataTypes } = require('sequelize');
const { requestHostname } = require('../lib/tenantHost');
const { runWithTenant } = require('../lib/tenantContext');
const { mergeTenantWhere, applyTenantScope } = require('../lib/tenantScope');
const { assertUserMatchesRequestTenant } = require('../middleware/auth');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        const run = fn();
        if (run && typeof run.then === 'function') {
            return run.then(
                () => {
                    passed++;
                    console.log('  ✓', name);
                },
                (err) => {
                    failed++;
                    console.error('  ✗', name, '→', err.message);
                }
            );
        }
        passed++;
        console.log('  ✓', name);
        return Promise.resolve();
    } catch (err) {
        failed++;
        console.error('  ✗', name, '→', err.message);
        return Promise.resolve();
    }
}

function expectThrow(fn) {
    assert.throws(fn, (err) => err && err.code === 'WRONG_TENANT');
}

console.log('tenant isolation unit tests\n');

const queue = [];

queue.push(test('spoofed X-Forwarded-Host does not replace Host', () => {
    const host = requestHostname({
        headers: {
            host: 'kaya.fxguard.io',
            'x-forwarded-host': 'acme.app.fxguard.io',
        },
    });
    assert.strictEqual(host, 'kaya.fxguard.io');
}));

queue.push(test('platform token cannot enter another company', () => {
    expectThrow(() => assertUserMatchesRequestTenant(
        { tenant: { id: 'company-1', slug: 'acme', isPlatform: false } },
        { tenantId: 'platform-1' }
    ));
}));

queue.push(test('company user cannot enter the platform panel', () => {
    expectThrow(() => assertUserMatchesRequestTenant(
        { tenant: { id: 'platform-1', slug: 'platform', isPlatform: true } },
        { tenantId: 'company-1' }
    ));
}));

queue.push(test('legacy staff stay on the platform panel', () => {
    assertUserMatchesRequestTenant(
        { tenant: { id: 'platform-1', slug: 'platform', isPlatform: true } },
        { tenantId: null }
    );
    assertUserMatchesRequestTenant(
        { tenant: { id: 'platform-1', slug: 'platform', isPlatform: true } },
        { tenantId: 'platform-1' }
    );
}));

queue.push(test('unknown panel rejects every account', () => {
    expectThrow(() => assertUserMatchesRequestTenant(
        { tenant: { id: null, slug: 'missing', missing: true, isPlatform: false } },
        { tenantId: 'company-1' }
    ));
    expectThrow(() => assertUserMatchesRequestTenant(
        { tenant: { id: null, slug: 'missing', missing: true, isPlatform: false } },
        { tenantId: null }
    ));
}));

queue.push(test('tenant filter keeps OR conditions', () => {
    runWithTenant({ id: 'tid-1', slug: 'acme', isPlatform: false }, () => {
        const options = { where: { [Op.or]: [{ status: 'open' }, { status: 'pending' }] } };
        mergeTenantWhere(options);
        assert.strictEqual(options.where[Op.and][1].tenantId, 'tid-1');
        assert.strictEqual(options.where[Op.and][0][Op.or].length, 2);
    });
}));

queue.push(test('skipTenantScope leaves the query untouched', () => {
    runWithTenant({ id: 'tid-1', slug: 'acme', isPlatform: false }, () => {
        const options = { where: { id: 'x' }, skipTenantScope: true };
        mergeTenantWhere(options);
        assert.strictEqual(options.where.tenantId, undefined);
        assert.strictEqual(options.where.id, 'x');
    });
}));

queue.push(test('update and delete stay inside the company database rows', async () => {
    const sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    const Item = sequelize.define('IsoItem', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        tenantId: DataTypes.STRING,
        name: DataTypes.STRING,
    });
    applyTenantScope(Item);
    await sequelize.sync();
    await Item.bulkCreate([
        { tenantId: 'a', name: 'a1' },
        { tenantId: 'b', name: 'b1' },
    ], { hooks: false });

    await runWithTenant({ id: 'a', slug: 'a', isPlatform: false }, async () => {
        const rows = await Item.findAll();
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].name, 'a1');
        const updated = await Item.update({ name: 'a1-edited' }, { where: {} });
        assert.strictEqual(updated[0], 1);
        const removed = await Item.destroy({ where: {} });
        assert.strictEqual(removed, 1);
    });

    const left = await Item.findAll({ skipTenantScope: true });
    assert.strictEqual(left.length, 1);
    assert.strictEqual(left[0].name, 'b1');
    await sequelize.close();
}));

Promise.all(queue).then(() => {
    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
});

/**
 * جداسازی سازمان: توکن، Host جعلی، و کوئری‌های update/delete
 */
'use strict';

const assert = require('assert');
const { Op, Sequelize, DataTypes } = require('sequelize');
const { requestHostname } = require('../lib/tenantHost');
const { runWithTenant, setPlatformTenantCache } = require('../lib/tenantContext');
const {
    mergeTenantWhere,
    applyTenantScope,
    TENANT_SCOPED_MODELS,
    TENANT_OWNED_MODELS,
} = require('../lib/tenantScope');
const { backfillOwnedTenantIds } = require('../services/tenantPlatform');
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
        assert.strictEqual(await Item.sum('id'), rows[0].id);
        assert.strictEqual(await Item.max('id', { where: { name: 'a1' } }), rows[0].id);
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

queue.push(test('every owner of a dependent table is backfilled before it', () => {
    const ready = new Set(TENANT_SCOPED_MODELS);
    for (const { model, owners } of TENANT_OWNED_MODELS) {
        for (const owner of owners) {
            assert.ok(ready.has(owner.model), model + ' depends on ' + owner.model + ' which is not ready yet');
        }
        ready.add(model);
    }
}));

queue.push(test('row without request context takes the company of its parent', async () => {
    const sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    const Parent = sequelize.define('IsoParent', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        tenantId: DataTypes.STRING,
    });
    const Child = sequelize.define('IsoChild', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        tenantId: DataTypes.STRING,
        parentId: DataTypes.INTEGER,
    });
    applyTenantScope(Parent);
    applyTenantScope(Child, [{ model: 'IsoParent', on: ['id', 'parentId'] }]);
    await sequelize.sync();
    const parent = await Parent.create({ tenantId: 'company-b' });
    const child = await Child.create({ parentId: parent.id });
    assert.strictEqual(child.tenantId, 'company-b');
    await sequelize.close();
}));

queue.push(test('ownerless row without request context is never handed to the platform company', async () => {
    const sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    const Loose = sequelize.define('IsoLoose', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        tenantId: DataTypes.STRING,
    });
    applyTenantScope(Loose, []);
    await sequelize.sync();
    setPlatformTenantCache({ id: 'kaya-tenant', slug: 'platform', isPlatform: true });
    try {
        const row = await Loose.create({});
        await row.reload();
        assert.strictEqual(row.tenantId, null);
    } finally {
        setPlatformTenantCache(null);
        await sequelize.close();
    }
}));

queue.push(test('backfill: once other companies exist, unknown rows after their signup stay unassigned', async () => {
    const sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    const Tenant = sequelize.define('Tenant', {
        id: { type: DataTypes.STRING, primaryKey: true },
    });
    const Tag = sequelize.define('Tag', {
        id: { type: DataTypes.STRING, primaryKey: true },
        tenantId: DataTypes.STRING,
    });
    await sequelize.sync();
    const signup = new Date('2026-06-01T00:00:00Z');
    await Tenant.bulkCreate([
        { id: 'kaya-tenant', createdAt: new Date('2025-01-01T00:00:00Z') },
        { id: 'company-a', createdAt: signup },
    ]);
    await Tag.bulkCreate([
        { id: 'tag-old', createdAt: new Date('2026-05-01T00:00:00Z') },
        { id: 'tag-new', createdAt: new Date('2026-07-01T00:00:00Z') },
    ]);

    await backfillOwnedTenantIds(sequelize, 'kaya-tenant', null);

    assert.strictEqual((await Tag.findByPk('tag-old')).tenantId, 'kaya-tenant');
    assert.strictEqual((await Tag.findByPk('tag-new')).tenantId, null);
    await sequelize.close();
}));

queue.push(test('backfill gives old rows to the parent company, orphans to the only company', async () => {
    const sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    const User = sequelize.define('User', {
        id: { type: DataTypes.STRING, primaryKey: true },
        tenantId: DataTypes.STRING,
    });
    const Announcement = sequelize.define('Announcement', {
        id: { type: DataTypes.STRING, primaryKey: true },
        tenantId: DataTypes.STRING,
        fromUserId: DataTypes.STRING,
    });
    const Tag = sequelize.define('Tag', {
        id: { type: DataTypes.STRING, primaryKey: true },
        tenantId: DataTypes.STRING,
    });
    await sequelize.sync();
    await User.bulkCreate([{ id: 'u-a', tenantId: 'company-a' }, { id: 'u-p', tenantId: 'platform' }]);
    await Announcement.bulkCreate([
        { id: 'an-a', fromUserId: 'u-a' },
        { id: 'an-p', fromUserId: 'u-p' },
        { id: 'an-orphan', fromUserId: 'deleted-user' },
        { id: 'an-kept', fromUserId: 'u-a', tenantId: 'company-z' },
    ]);
    await Tag.bulkCreate([{ id: 'tag-1' }]);

    await backfillOwnedTenantIds(sequelize, 'platform', null);

    const owners = Object.fromEntries((await Announcement.findAll()).map((r) => [r.id, r.tenantId]));
    assert.deepStrictEqual(owners, {
        'an-a': 'company-a',
        'an-p': 'platform',
        'an-orphan': 'platform',
        'an-kept': 'company-z',
    });
    assert.strictEqual((await Tag.findByPk('tag-1')).tenantId, 'platform');
    await sequelize.close();
}));

Promise.all(queue).then(() => {
    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
});

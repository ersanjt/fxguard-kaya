/**
 * General modules (tags, templates, announcements, exchange services) must stay inside each company.
 */
'use strict';

process.env.USE_SQLITE = 'true';
process.env.JWT_SECRET = 'test-jwt-secret-32-chars-minimum!!';
process.env.ENCRYPT_SECRET = 'test-encrypt-secret-32-chars-min!';
process.env.MAIN_ADMIN_EMAIL = 'admin@test.com';
process.env.MAIN_ADMIN_PASSWORD = 'Admin@Test123!';
process.env.NODE_ENV = 'test';
process.env.PORT = '3105';
process.env.DISABLE_RATE_LIMIT = 'true';
process.env.WEBHOOK_SECRET = '';
process.env.SELF_SERVE_SIGNUP = 'true';
process.env.TENANT_BASE_HOST = 'app.fxguard.io';
process.env.SELF_SERVE_PUBLIC_PROTO = 'http';
delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
delete process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

const assert = require('assert');
const supertest = require('supertest');

let passed = 0;
let failed = 0;

async function test(name, fn) {
    try {
        await fn();
        console.log('  ✓', name);
        passed++;
    } catch (err) {
        console.error('  ✗', name);
        console.error('    →', err.message);
        failed++;
    }
}

const PASSWORD = 'Secret123';

async function main() {
    console.log('tenant shared modules tests\n');
    const serverModule = require('../server');
    const req = supertest(serverModule.app);
    await serverModule.ready;
    const models = require('../models');

    async function signup(slug) {
        const r = await req
            .post('/api/tenants/signup')
            .set('Host', 'app.fxguard.io')
            .send({ slug, email: 'owner@' + slug + '.test', password: PASSWORD, companyName: slug, industry: 'exchange' });
        assert.strictEqual(r.status, 201, JSON.stringify(r.body));
    }

    async function session(slug) {
        const host = slug + '.app.fxguard.io';
        const login = await req.post('/api/auth/login').set('Host', host)
            .send({ email: 'owner@' + slug + '.test', password: PASSWORD });
        assert.strictEqual(login.status, 200, JSON.stringify(login.body));
        const cookie = login.headers['set-cookie'] || '';
        const token = login.body.token ? 'Bearer ' + login.body.token : '';
        const wrap = (r) => r.set('Host', host).set('Cookie', cookie).set('Authorization', token);
        return {
            get: (url) => wrap(req.get(url)),
            post: (url, body) => wrap(req.post(url)).send(body || {}),
            put: (url, body) => wrap(req.put(url)).send(body || {}),
        };
    }

    try {
        await signup('shared-a');
        await signup('shared-b');
        const a = await session('shared-a');
        const b = await session('shared-b');
        const state = {};

        await test('tags are per company and the same name is allowed in two companies', async () => {
            const ta = await a.post('/api/tags', { name: 'VIP' });
            assert.strictEqual(ta.status, 201, JSON.stringify(ta.body));
            state.tagA = ta.body.id;
            assert.strictEqual((await a.post('/api/tags', { name: 'VIP' })).status, 400);

            const tb = await b.post('/api/tags', { name: 'VIP' });
            assert.strictEqual(tb.status, 201, JSON.stringify(tb.body));
            const listB = await b.get('/api/tags');
            assert.deepStrictEqual(listB.body.data.map((t) => t.id), [tb.body.id]);
            assert.strictEqual((await b.put('/api/tags/' + state.tagA, { name: 'stolen' })).status, 404);
        });

        await test('workflow templates are invisible to another company', async () => {
            const tpl = await a.post('/api/processes/templates', { name: 'Onboarding', stages: [{ name: 'Call' }] });
            assert.strictEqual(tpl.status, 201, JSON.stringify(tpl.body));
            const listB = await b.get('/api/processes/templates');
            assert.strictEqual(listB.status, 200, JSON.stringify(listB.body));
            assert.strictEqual(listB.body.data.length, 0);
            assert.strictEqual((await b.get('/api/processes/templates/' + tpl.body.data.id)).status, 404);
        });

        await test('announcements to "all" reach only the sender company', async () => {
            const ann = await a.post('/api/announcements', { title: 'Staff meeting', body: 'At 10', targetType: 'all' });
            assert.strictEqual(ann.status, 201, JSON.stringify(ann.body));
            const forB = await b.get('/api/announcements/for-me');
            assert.strictEqual(forB.status, 200);
            assert.strictEqual(forB.body.data.length, 0);
            const forA = await a.get('/api/announcements/for-me');
            assert.strictEqual(forA.body.data.length, 1);
        });

        await test('exchange services are per company', async () => {
            const svc = await a.post('/api/services', { name: 'Wire transfer' });
            assert.strictEqual(svc.status, 201, JSON.stringify(svc.body));
            assert.strictEqual((await b.get('/api/services/' + svc.body.id)).status, 404);
        });

        await test('paid plan: cash boxes and bank accounts stay inside each company', async () => {
            const { invalidatePlanCache } = require('../lib/planLimits');
            for (const slug of ['shared-a', 'shared-b']) {
                const tenant = await models.Tenant.findOne({ where: { slug } });
                await models.PanelSetting.update({ planTier: 'business' }, { where: { id: tenant.panelKey } });
            }
            invalidatePlanCache();

            const box = await a.post('/api/exchange/cash-boxes', { name: 'USD box', currency: 'USD', balance: 1000 });
            assert.strictEqual(box.status, 201, JSON.stringify(box.body));
            const bank = await a.post('/api/exchange/bank-accounts', { name: 'Main account' });
            assert.strictEqual(bank.status, 201, JSON.stringify(bank.body));

            const boxesB = await b.get('/api/exchange/cash-boxes');
            assert.strictEqual(boxesB.status, 200, JSON.stringify(boxesB.body));
            assert.strictEqual(boxesB.body.length, 0);
            const banksB = await b.get('/api/exchange/bank-accounts');
            assert.strictEqual(banksB.body.length, 0);
            assert.strictEqual((await b.put('/api/exchange/cash-boxes/' + box.body.id, { balance: 0 })).status, 404);
        });

        await test('rate settings shared by the server are read-only for companies', async () => {
            const r = await a.put('/api/rates/adjustments', { USD: { type: 'percent', value: 5 } });
            assert.strictEqual(r.status, 403, JSON.stringify(r.body));
            assert.strictEqual(r.body.code, 'RATES_SETTINGS_READ_ONLY');
            assert.strictEqual((await a.put('/api/rates/api-keys', { navasanApiKey: 'x' })).status, 403);
            assert.strictEqual((await a.post('/api/rates/currencies', { key: 'XAU', label: 'Gold' })).status, 403);
        });

        await test('background writes take the company of their parent row', async () => {
            const tenantA = await models.Tenant.findOne({ where: { slug: 'shared-a' } });
            const customer = await models.Customer.create({
                tenantId: tenantA.id,
                phone: '+4915100000001',
                name: 'Webhook contact',
            });
            const doc = await models.CustomerDocument.create({
                customerId: customer.id,
                category: 'other',
                title: 'passport',
                filePath: 'uploads/customers/_test/passport.jpg',
                fileName: 'passport.jpg',
                fileType: 'image',
                source: 'conversation',
            });
            assert.strictEqual(doc.tenantId, tenantA.id);
        });
    } finally {
        console.log(`\nResults: ${passed} passed, ${failed} failed`);
        process.exit(failed > 0 ? 1 : 0);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

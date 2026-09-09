/**
 * Self-serve tenant signup HTTP tests (SQLite in-process)
 */
'use strict';

process.env.USE_SQLITE = 'true';
process.env.JWT_SECRET = 'test-jwt-secret-32-chars-minimum!!';
process.env.ENCRYPT_SECRET = 'test-encrypt-secret-32-chars-min!';
process.env.MAIN_ADMIN_EMAIL = 'admin@test.com';
process.env.MAIN_ADMIN_PASSWORD = 'Admin@Test123!';
process.env.NODE_ENV = 'test';
process.env.PORT = '3101';
process.env.DISABLE_RATE_LIMIT = 'true';
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
const failures = [];

async function test(name, fn) {
    try {
        await fn();
        console.log('  ✓', name);
        passed++;
    } catch (err) {
        console.error('  ✗', name);
        console.error('    →', err.message);
        failed++;
        failures.push({ name, error: err.message });
    }
}

async function main() {
    console.log('tenant signup HTTP tests\n');
    const serverModule = require('../server');
    const req = supertest(serverModule.app);
    await serverModule.ready;

    try {
        await test('GET /api/config exposes selfServe when flag on', async () => {
            const r = await req.get('/api/config').set('Host', 'app.fxguard.io');
            assert.strictEqual(r.status, 200);
            assert.strictEqual(r.body.selfServe.enabled, true);
            assert.strictEqual(r.body.selfServe.trialDays, 7);
            assert.strictEqual(r.body.selfServe.parentHost, 'app.fxguard.io');
        });

        await test('signup is hidden on kaya host even with flag', async () => {
            const r = await req.get('/api/config').set('Host', 'kaya.fxguard.io');
            assert.strictEqual(r.status, 200);
            assert.strictEqual(r.body.selfServe.enabled, false);
            const denied = await req.post('/api/tenants/signup').set('Host', 'kaya.fxguard.io').send({
                slug: 'blocked',
                email: 'x@test.com',
                password: 'Secret123',
                companyName: 'Nope',
            });
            assert.strictEqual(denied.status, 404);
        });

        await test('POST /api/tenants/signup creates trial desk', async () => {
            const r = await req
                .post('/api/tenants/signup')
                .set('Host', 'app.fxguard.io')
                .send({
                    slug: 'acme',
                    email: 'owner@acme.test',
                    password: 'Secret123',
                    companyName: 'Acme Desk',
                });
            assert.strictEqual(r.status, 201, JSON.stringify(r.body));
            assert.strictEqual(r.body.ok, true);
            assert.strictEqual(r.body.slug, 'acme');
            assert.strictEqual(r.body.status, 'trial');
            assert.ok(String(r.body.loginUrl).indexOf('app.fxguard.io/login?panel=acme') >= 0);
            assert.ok(String(r.body.dashboardUrl).indexOf('/dashboard') >= 0);
            assert.ok(r.body.session && r.body.session.user && r.body.session.user.email === 'owner@acme.test');
            assert.ok(r.headers['set-cookie']);
        });

        await test('duplicate slug is rejected', async () => {
            const r = await req.post('/api/tenants/signup').set('Host', 'app.fxguard.io').send({
                slug: 'acme',
                email: 'other@acme.test',
                password: 'Secret123',
                companyName: 'Other',
            });
            assert.strictEqual(r.status, 409);
        });

        await test('owner logs in on apex with panel query, not bare apex', async () => {
            const onTenant = await req
                .post('/api/auth/login')
                .set('Host', 'acme.app.fxguard.io')
                .send({ email: 'owner@acme.test', password: 'Secret123' });
            assert.strictEqual(onTenant.status, 200, JSON.stringify(onTenant.body));
            assert.ok(onTenant.body.user && onTenant.body.user.email === 'owner@acme.test');

            const onApexPanel = await req
                .post('/api/auth/login?panel=acme')
                .set('Host', 'app.fxguard.io')
                .send({ email: 'owner@acme.test', password: 'Secret123' });
            assert.strictEqual(onApexPanel.status, 200, JSON.stringify(onApexPanel.body));

            const onApex = await req
                .post('/api/auth/login')
                .set('Host', 'app.fxguard.io')
                .send({ email: 'owner@acme.test', password: 'Secret123' });
            assert.strictEqual(onApex.status, 401);
        });

        await test('GET /api/tenants/me returns trial desk', async () => {
            const login = await req
                .post('/api/auth/login')
                .set('Host', 'acme.app.fxguard.io')
                .send({ email: 'owner@acme.test', password: 'Secret123' });
            assert.strictEqual(login.status, 200);
            const token = login.body.token || '';
            const cookie = login.headers['set-cookie'];
            const me = await req
                .get('/api/tenants/me')
                .set('Host', 'acme.app.fxguard.io')
                .set('Cookie', cookie || '')
                .set('Authorization', token ? 'Bearer ' + token : '');
            assert.strictEqual(me.status, 200, JSON.stringify(me.body));
            assert.strictEqual(me.body.ok, true);
            assert.strictEqual(me.body.tenant.slug, 'acme');
            assert.strictEqual(me.body.tenant.status, 'trial');
            assert.strictEqual(me.body.tenant.locked, false);
            const authMe = await req
                .get('/api/auth/me')
                .set('Host', 'acme.app.fxguard.io')
                .set('Cookie', cookie || '')
                .set('Authorization', token ? 'Bearer ' + token : '');
            assert.strictEqual(authMe.status, 200);
            assert.strictEqual(authMe.body.tenant.slug, 'acme');
        });

        await test('platform admin cannot login on tenant host', async () => {
            const r = await req
                .post('/api/auth/login')
                .set('Host', 'acme.app.fxguard.io')
                .send({ email: 'admin@test.com', password: 'Admin@Test123!' });
            assert.strictEqual(r.status, 401);
        });

        await test('expired trial returns 402 on CRM APIs', async () => {
            const { Tenant } = require('../models');
            const row = await Tenant.findOne({ where: { slug: 'acme' } });
            await row.update({ trialEndsAt: new Date(Date.now() - 60 * 1000), status: 'trial' });
            const login = await req
                .post('/api/auth/login')
                .set('Host', 'acme.app.fxguard.io')
                .send({ email: 'owner@acme.test', password: 'Secret123' });
            assert.strictEqual(login.status, 200);
            const token = login.body.token || '';
            const cookie = login.headers['set-cookie'];
            const customers = await req
                .get('/api/customers')
                .set('Host', 'acme.app.fxguard.io')
                .set('Cookie', cookie || '')
                .set('Authorization', token ? 'Bearer ' + token : '');
            assert.strictEqual(customers.status, 402);
            assert.strictEqual(customers.body.code, 'TRIAL_EXPIRED');
            const meLocked = await req
                .get('/api/tenants/me')
                .set('Host', 'acme.app.fxguard.io')
                .set('Cookie', cookie || '')
                .set('Authorization', token ? 'Bearer ' + token : '');
            assert.strictEqual(meLocked.status, 200);
            assert.strictEqual(meLocked.body.tenant.locked, true);
            assert.strictEqual(meLocked.body.tenant.lockCode, 'TRIAL_EXPIRED');
        });
    } finally {
        try {
            const { sequelize } = require('../models');
            await sequelize.close();
        } catch (_) {}
        try {
            if (serverModule.server && serverModule.server.close) {
                await new Promise((resolve) => serverModule.server.close(() => resolve()));
            }
        } catch (_) {}
    }

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    if (failed) {
        failures.forEach((f) => console.error(' -', f.name, f.error));
    }
    process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

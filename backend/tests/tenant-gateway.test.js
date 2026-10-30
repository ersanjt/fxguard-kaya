/**
 * Per-company WhatsApp gateway: enabled only by the platform admin, server-managed URL/secret,
 * webhooks land in the right company, WhatsApp numbers stay per company.
 */
'use strict';

process.env.USE_SQLITE = 'true';
process.env.JWT_SECRET = 'test-jwt-secret-32-chars-minimum!!';
process.env.ENCRYPT_SECRET = 'test-encrypt-secret-32-chars-min!';
process.env.MAIN_ADMIN_EMAIL = 'admin@test.com';
process.env.MAIN_ADMIN_PASSWORD = 'Admin@Test123!';
process.env.NODE_ENV = 'test';
process.env.PORT = '3106';
process.env.DISABLE_RATE_LIMIT = 'true';
process.env.WEBHOOK_SECRET = '';
process.env.SELF_SERVE_SIGNUP = 'true';
process.env.TENANT_BASE_HOST = 'app.fxguard.io';
process.env.SELF_SERVE_PUBLIC_PROTO = 'http';
process.env.TENANT_GATEWAY_SPAWN = 'false';
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
    console.log('tenant gateway tests\n');
    const serverModule = require('../server');
    const req = supertest(serverModule.app);
    await serverModule.ready;
    const models = require('../models');
    const { tenantWebhookSecret, tenantGatewayApiSecret, GATEWAY_TENANT_HEADER } = require('../lib/tenantGateway');

    async function signup(slug) {
        const r = await req
            .post('/api/tenants/signup')
            .set('Host', 'app.fxguard.io')
            .send({ slug, email: 'owner@' + slug + '.test', password: PASSWORD, companyName: slug, industry: 'general' });
        assert.strictEqual(r.status, 201, JSON.stringify(r.body));
    }

    async function session(host, email, password) {
        const login = await req.post('/api/auth/login').set('Host', host).send({ email, password });
        assert.strictEqual(login.status, 200, JSON.stringify(login.body));
        const cookie = login.headers['set-cookie'] || '';
        const token = login.body.token ? 'Bearer ' + login.body.token : '';
        const wrap = (r) => r.set('Host', host).set('Cookie', cookie).set('Authorization', token);
        return {
            get: (url) => wrap(req.get(url)),
            post: (url, body) => wrap(req.post(url)).send(body || {}),
            put: (url, body) => wrap(req.put(url)).send(body || {}),
            patch: (url, body) => wrap(req.patch(url)).send(body || {}),
        };
    }

    const tenantSession = (slug) => session(slug + '.app.fxguard.io', 'owner@' + slug + '.test', PASSWORD);

    try {
        await signup('gw-a');
        await signup('gw-b');
        const a = await tenantSession('gw-a');
        const admin = await session('app.fxguard.io', 'admin@test.com', 'Admin@Test123!');
        const tenantA = await models.Tenant.findOne({ where: { slug: 'gw-a' } });
        const tenantB = await models.Tenant.findOne({ where: { slug: 'gw-b' } });

        await test('QR is off for a new company: cloud only and start-gateway refused', async () => {
            const conn = await a.get('/api/whatsapp/connection');
            assert.strictEqual(conn.status, 200, JSON.stringify(conn.body));
            assert.strictEqual(conn.body.selfServeCloudOnly, true);
            assert.strictEqual(conn.body.gatewayManaged, true);
            assert.strictEqual(conn.body.gatewayUrl, '');
            const start = await a.post('/api/admin/start-gateway');
            assert.strictEqual(start.status, 403, JSON.stringify(start.body));
            assert.strictEqual(start.body.code, 'GATEWAY_NOT_ENABLED');
        });

        await test('company admins cannot reach the platform admin endpoints', async () => {
            assert.strictEqual((await a.get('/api/tenants/admin/list')).status, 404);
            assert.strictEqual((await a.post('/api/tenants/admin/' + tenantB.id + '/gateway', { enabled: true })).status, 404);
        });

        await test('only the platform admin sees the companies console link', async () => {
            const meAdmin = await admin.get('/api/auth/me');
            assert.strictEqual(meAdmin.status, 200, JSON.stringify(meAdmin.body));
            assert.strictEqual(meAdmin.body.canManageTenants, true);
            const meA = await a.get('/api/auth/me');
            assert.strictEqual(meA.body.canManageTenants, false);
        });

        await test('company list carries access state and payment details', async () => {
            await tenantB.update({ cryptoTxId: 'a'.repeat(64), cryptoNetwork: 'usdt_trc20', cryptoPaymentStatus: 'pending' });
            const list = await admin.get('/api/tenants/admin/list');
            const row = list.body.tenants.find((t) => t.slug === 'gw-b');
            assert.strictEqual(row.access, 'ok');
            assert.strictEqual(row.payment.status, 'pending');
            assert.strictEqual(row.payment.network, 'usdt_trc20');
        });

        await test('platform admin lists companies and enables QR with an allocated port', async () => {
            const list = await admin.get('/api/tenants/admin/list');
            assert.strictEqual(list.status, 200, JSON.stringify(list.body));
            const row = list.body.tenants.find((t) => t.slug === 'gw-a');
            assert(row, 'gw-a missing from list');
            assert.strictEqual(row.ownerEmail, 'owner@gw-a.test');
            assert.strictEqual(row.gatewayEnabled, false);
            assert(!list.body.tenants.some((t) => t.slug === 'platform'));

            const on = await admin.post('/api/tenants/admin/' + tenantA.id + '/gateway', { enabled: true });
            assert.strictEqual(on.status, 200, JSON.stringify(on.body));
            await tenantA.reload();
            assert.strictEqual(tenantA.gatewayEnabled, true);
            assert(Number.isInteger(tenantA.gatewayPort) && tenantA.gatewayPort > 0);
        });

        await test('enabled company gets the QR tab but cannot point the gateway anywhere', async () => {
            const conn = await a.get('/api/whatsapp/connection');
            assert.strictEqual(conn.body.selfServeCloudOnly, false);
            assert.strictEqual(conn.body.gatewayManaged, true);

            const put = await a.put('/api/whatsapp/connection', {
                connectionMode: 'gateway',
                gatewayEnabled: true,
                gatewayUrl: 'http://169.254.169.254',
                gatewayApiSecret: 'attacker-secret',
            });
            assert.strictEqual(put.status, 200, JSON.stringify(put.body));
            const row = await models.WhatsappConnection.findByPk(tenantA.panelKey);
            assert(!row.gatewayUrl, 'gatewayUrl must stay server-managed');
            assert(!row.gatewayApiSecret, 'gatewayApiSecret must stay server-managed');
        });

        await test('connection loader derives the local URL and secret per company', async () => {
            const { runWithTenant } = require('../lib/tenantContext');
            const loader = require('../lib/whatsappConnectionLoader');
            loader.invalidateCache();
            const shape = (t) => ({
                id: t.id, slug: t.slug, panelKey: t.panelKey,
                gatewayEnabled: t.gatewayEnabled, gatewayPort: t.gatewayPort,
            });
            const cfgA = await runWithTenant(shape(tenantA), () => loader.getWhatsappConnectionConfig());
            assert.strictEqual(cfgA.gatewayUrl, 'http://127.0.0.1:' + tenantA.gatewayPort);
            assert.strictEqual(cfgA.gatewayApiSecret, tenantGatewayApiSecret(tenantA.id));
            const cfgB = await runWithTenant(shape(tenantB), () => loader.getWhatsappConnectionConfig());
            assert.strictEqual(cfgB.gatewayEnabled, false);
            assert.strictEqual(cfgB.gatewayUrl, '');
        });

        await test('gateway webhook lands in its own company; wrong secret is rejected', async () => {
            const phone = '4915100000777';
            const payload = {
                id: 'tgw-in-1',
                from: phone + '@c.us',
                body: 'hello from tenant gateway',
                timestamp: Math.floor(Date.now() / 1000),
                fromMe: false,
                type: 'chat',
                contact: { number: phone, name: 'Tenant customer' },
                chat: { id: phone + '@c.us', isGroup: false },
            };
            const bad = await req.post('/api/webhook/incoming-message')
                .set('Host', '127.0.0.1')
                .set(GATEWAY_TENANT_HEADER, tenantA.id)
                .set('x-webhook-secret', tenantWebhookSecret(tenantB.id))
                .send(payload);
            assert.strictEqual(bad.status, 401, JSON.stringify(bad.body));

            const ok = await req.post('/api/webhook/incoming-message')
                .set('Host', '127.0.0.1')
                .set(GATEWAY_TENANT_HEADER, tenantA.id)
                .set('x-webhook-secret', tenantWebhookSecret(tenantA.id))
                .send(payload);
            assert.strictEqual(ok.status, 200, JSON.stringify(ok.body));
            const customers = await models.Customer.findAll({ where: { phone }, skipTenantScope: true });
            assert.strictEqual(customers.length, 1);
            assert.strictEqual(customers[0].tenantId, tenantA.id);
        });

        await test('WhatsApp numbers (primary slot) are separate per company', async () => {
            const { runWithTenant } = require('../lib/tenantContext');
            const numbers = require('../services/whatsappNumbers');
            const shape = (t) => ({ id: t.id, slug: t.slug, panelKey: t.panelKey });
            await runWithTenant(shape(tenantA), () => numbers.ensurePrimaryNumber());
            await runWithTenant(shape(tenantB), () => numbers.ensurePrimaryNumber());
            const rows = await models.WhatsappNumber.findAll({
                where: { slotKey: numbers.PRIMARY_SLOT, tenantId: [tenantA.id, tenantB.id] },
                skipTenantScope: true,
            });
            assert.strictEqual(rows.length, 2);
            const ownB = rows.filter((r) => r.tenantId === tenantB.id).map((r) => r.id);
            const listB = await runWithTenant(shape(tenantB), () => numbers.listNumbers());
            assert.deepStrictEqual(listB.numbers.map((n) => n.id), ownB);
        });

        await test('disabling QR clears the company gateway again', async () => {
            const off = await admin.post('/api/tenants/admin/' + tenantA.id + '/gateway', { enabled: false });
            assert.strictEqual(off.status, 200, JSON.stringify(off.body));
            await tenantA.reload();
            assert.strictEqual(tenantA.gatewayEnabled, false);
            const conn = await a.get('/api/whatsapp/connection');
            assert.strictEqual(conn.body.selfServeCloudOnly, true);
        });

        await test('platform admin issues a one-time owner password; company admins cannot', async () => {
            assert.strictEqual((await a.post('/api/tenants/admin/' + tenantB.id + '/owner-password')).status, 404);
            const r = await admin.post('/api/tenants/admin/' + tenantB.id + '/owner-password');
            assert.strictEqual(r.status, 200, JSON.stringify(r.body));
            assert.strictEqual(r.body.email, 'owner@gw-b.test');
            assert(/panel=gw-b|gw-b\./.test(r.body.loginUrl), r.body.loginUrl);
            const host = 'gw-b.app.fxguard.io';
            const oldLogin = await req.post('/api/auth/login').set('Host', host)
                .send({ email: 'owner@gw-b.test', password: PASSWORD });
            assert.strictEqual(oldLogin.status, 401);
            const newLogin = await req.post('/api/auth/login').set('Host', host)
                .send({ email: 'owner@gw-b.test', password: r.body.password });
            assert.strictEqual(newLogin.status, 200, JSON.stringify(newLogin.body));
        });

        await test('platform admin reopens an expired trial; company admins cannot', async () => {
            assert.strictEqual((await a.post('/api/tenants/admin/' + tenantA.id + '/extend-trial', { days: 14 })).status, 404);
            await tenantA.update({ status: 'trial', trialEndsAt: new Date(Date.now() - 60 * 1000) });
            assert.strictEqual((await a.get('/api/customers')).status, 402);
            const r = await admin.post('/api/tenants/admin/' + tenantA.id + '/extend-trial', { days: 14 });
            assert.strictEqual(r.status, 200, JSON.stringify(r.body));
            assert.strictEqual(r.body.days, 14);
            await tenantA.reload();
            const left = new Date(tenantA.trialEndsAt).getTime() - Date.now();
            assert(left > 13 * 86400000 && left <= 14 * 86400000, 'trial should end ~14 days from now');
            assert.notStrictEqual((await a.get('/api/customers')).status, 402);
        });

        await test('platform admin sees per-company usage, users and customers', async () => {
            assert.strictEqual((await a.get('/api/tenants/admin/' + tenantA.id + '/details')).status, 404);
            const list = await admin.get('/api/tenants/admin/list');
            const row = list.body.tenants.find((t) => t.slug === 'gw-a');
            assert.strictEqual(row.usage.users, 1);
            assert.strictEqual(row.usage.customers, 1);
            assert(row.usage.messages >= 1, JSON.stringify(row.usage));
            const d = await admin.get('/api/tenants/admin/' + tenantA.id + '/details');
            assert.strictEqual(d.status, 200, JSON.stringify(d.body));
            assert.strictEqual(d.body.tenant.slug, 'gw-a');
            assert.deepStrictEqual(d.body.users.map((u) => u.email), ['owner@gw-a.test']);
            assert(!('password' in d.body.users[0]), 'password hash must never leave the server');
            assert.strictEqual(d.body.customers[0].phone, '4915100000777');
        });

        await test('platform admin creates a company user who logs in with a username', async () => {
            const body = { name: 'Sara', email: 'sara@gw-a.test', username: 'sara.gwa', role: 'agent' };
            assert.strictEqual((await a.post('/api/tenants/admin/' + tenantA.id + '/users', body)).status, 404);
            const r = await admin.post('/api/tenants/admin/' + tenantA.id + '/users', body);
            assert.strictEqual(r.status, 201, JSON.stringify(r.body));
            assert.strictEqual(r.body.user.role, 'agent');
            const login = await req.post('/api/auth/login').set('Host', 'gw-a.app.fxguard.io')
                .send({ username: 'sara.gwa', password: r.body.password });
            assert.strictEqual(login.status, 200, JSON.stringify(login.body));
            const user = await models.User.findOne({ where: { email: 'sara@gw-a.test' }, skipTenantScope: true });
            assert.strictEqual(user.tenantId, tenantA.id);
            const dup = await admin.post('/api/tenants/admin/' + tenantB.id + '/users', { email: 'x@gw-b.test', username: 'sara.gwa' });
            assert.strictEqual(dup.status, 409, JSON.stringify(dup.body));
        });

        await test('platform admin sets a new password, disables a user and keeps the last owner', async () => {
            const sara = await models.User.findOne({ where: { email: 'sara@gw-a.test' }, skipTenantScope: true });
            const base = '/api/tenants/admin/' + tenantA.id + '/users/';
            const weak = await admin.patch(base + sara.id, { password: 'short' });
            assert.strictEqual(weak.status, 400);
            const pw = await admin.patch(base + sara.id, { password: 'NewSecret99' });
            assert.strictEqual(pw.status, 200, JSON.stringify(pw.body));
            const login = await req.post('/api/auth/login').set('Host', 'gw-a.app.fxguard.io')
                .send({ email: 'sara@gw-a.test', password: 'NewSecret99' });
            assert.strictEqual(login.status, 200, JSON.stringify(login.body));
            const off = await admin.patch(base + sara.id, { isActive: false });
            assert.strictEqual(off.body.user.isActive, false);
            const blocked = await req.post('/api/auth/login').set('Host', 'gw-a.app.fxguard.io')
                .send({ email: 'sara@gw-a.test', password: 'NewSecret99' });
            assert.notStrictEqual(blocked.status, 200);

            const owner = await models.User.findOne({ where: { email: 'owner@gw-a.test' }, skipTenantScope: true });
            const demote = await admin.patch(base + owner.id, { role: 'admin' });
            assert.strictEqual(demote.status, 400, JSON.stringify(demote.body));
            assert.strictEqual(demote.body.code, 'LAST_OWNER');
            const other = await models.User.findOne({ where: { email: 'owner@gw-b.test' }, skipTenantScope: true });
            assert.strictEqual((await admin.patch(base + other.id, { name: 'x' })).status, 404);
        });

        await test('SQLite migration drops a global inline UNIQUE so two companies can share a value', async () => {
            const { dropGlobalColumnUnique } = require('../services/tenantPlatform');
            const { sequelize } = models;
            await sequelize.query('DROP TABLE IF EXISTS `tgw_probe`');
            await sequelize.query(
                'CREATE TABLE `tgw_probe` (`id` INTEGER PRIMARY KEY AUTOINCREMENT, `tenantId` VARCHAR(36), ' +
                    '`slotKey` VARCHAR(40) NOT NULL UNIQUE, `label` VARCHAR(40))'
            );
            await sequelize.query('CREATE INDEX `tgw_probe_tenant` ON `tgw_probe` (`tenantId`)');
            await sequelize.query("INSERT INTO `tgw_probe` (tenantId, slotKey) VALUES ('t1', 'primary')");
            await dropGlobalColumnUnique(sequelize, 'tgw_probe', 'slotKey', null);
            await sequelize.query("INSERT INTO `tgw_probe` (tenantId, slotKey) VALUES ('t2', 'primary')");
            const [rows] = await sequelize.query('SELECT COUNT(*) AS n FROM `tgw_probe`');
            assert.strictEqual(Number(rows[0].n), 2);
            const [idx] = await sequelize.query("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'tgw_probe_tenant'");
            assert.strictEqual(idx.length, 1, 'non-unique indexes must survive the rebuild');
            await sequelize.query('DROP TABLE `tgw_probe`');
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

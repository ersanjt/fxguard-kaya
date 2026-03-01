/**
 * Test Suite — Auth, Users, Customers, Conversations, Security, Permissions
 * اجرا: node tests/suite.test.js
 * از SQLite in-memory استفاده می‌کند — نیازی به DB خارجی نیست
 * سرور را in-process بالا می‌آورد (بدون spawn)
 */
'use strict';

// ─── Environment setup (before any require) ──────────────────────────────────
process.env.USE_SQLITE = 'true';
process.env.JWT_SECRET = 'test-jwt-secret-32-chars-minimum!!';
process.env.ENCRYPT_SECRET = 'test-encrypt-secret-32-chars-min!';
process.env.MAIN_ADMIN_EMAIL = 'admin@test.com';
process.env.MAIN_ADMIN_PASSWORD = 'Admin@Test123!';
process.env.NODE_ENV = 'test';
process.env.PORT = '3099';
process.env.DISABLE_RATE_LIMIT = 'true';
process.env.SKIP_MONGO = 'true';

const path = require('path');
const assert = require('assert');
const http = require('http');

const BASE = 'http://127.0.0.1:3099';

// ─── HTTP helpers ────────────────────────────────────────────────────────────

function request(method, urlPath, body, token) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlPath, BASE);
        const payload = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: '127.0.0.1',
            port: 3099,
            path: url.pathname + url.search,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
            },
            timeout: 8000
        };
        const req = http.request(opts, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data), headers: res.headers }); }
                catch { resolve({ status: res.statusCode, body: data, headers: res.headers }); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        if (payload) req.write(payload);
        req.end();
    });
}

const get = (p, tok) => request('GET', p, null, tok);
const post = (p, b, tok) => request('POST', p, b, tok);
const put = (p, b, tok) => request('PUT', p, b, tok);
const patch = (p, b, tok) => request('PATCH', p, b, tok);
const del = (p, tok) => request('DELETE', p, null, tok);

// ─── Test runner ─────────────────────────────────────────────────────────────

let passed = 0, failed = 0;
const failures = [];

async function test(name, fn) {
    try {
        await fn();
        console.log(`  ✓ ${name}`);
        passed++;
    } catch (err) {
        console.error(`  ✗ ${name}`);
        console.error(`    → ${err.message}`);
        failed++;
        failures.push({ name, error: err.message });
    }
}

function section(name) {
    console.log(`\n── ${name} ──`);
}

// ─── State ───────────────────────────────────────────────────────────────────

let adminToken = null;
let agentToken = null;
let createdUserId = null;
let createdCustomerId = null;

// ─── Tests ───────────────────────────────────────────────────────────────────

async function runTests() {

    // ── Health & Public ──────────────────────────────────────────────────────
    section('Health & Public Endpoints');

    await test('GET /health returns 200 with status ok', async () => {
        const r = await get('/health');
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body.status, 'ok');
        assert(r.body.uptime >= 0);
    });

    await test('GET /api/ping returns ok:true', async () => {
        const r = await get('/api/ping');
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body.ok, true);
    });

    await test('GET /api/config returns timezone', async () => {
        const r = await get('/api/config');
        assert.strictEqual(r.status, 200);
        assert(r.body.timezone, 'Expected timezone in config');
    });

    // ── Auth: Login ──────────────────────────────────────────────────────────
    section('Auth — Login');

    await test('Login with wrong password returns 401', async () => {
        const r = await post('/api/auth/login', { email: 'admin@test.com', password: 'WrongPass!' });
        assert.strictEqual(r.status, 401);
        assert(r.body.error);
    });

    await test('Login with non-existent user returns 401', async () => {
        const r = await post('/api/auth/login', { email: 'nobody@test.com', password: 'Test123!' });
        assert.strictEqual(r.status, 401);
    });

    await test('Login with missing password returns 400', async () => {
        const r = await post('/api/auth/login', { email: 'admin@test.com' });
        assert.strictEqual(r.status, 400);
    });

    await test('Login with valid admin credentials returns token', async () => {
        const r = await post('/api/auth/login', {
            email: 'admin@test.com',
            password: 'Admin@Test123!'
        });
        assert.strictEqual(r.status, 200, `Login failed: ${JSON.stringify(r.body)}`);
        assert(r.body.token, 'Expected token');
        assert(r.body.user, 'Expected user');
        assert.strictEqual(r.body.user.email, 'admin@test.com');
        assert(!r.body.user.password, 'Password must not be in response');
        adminToken = r.body.token;
    });

    // ── Auth: /me ────────────────────────────────────────────────────────────
    section('Auth — /me');

    await test('GET /api/auth/me without token returns 401', async () => {
        const r = await get('/api/auth/me');
        assert.strictEqual(r.status, 401);
    });

    await test('GET /api/auth/me with valid token returns user without password', async () => {
        const r = await get('/api/auth/me', adminToken);
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body.email, 'admin@test.com');
        assert(!r.body.password, 'Password must not be in /me response');
    });

    // ── Auth: Presence ───────────────────────────────────────────────────────
    section('Auth — Presence');

    await test('PATCH /me/presence with invalid status returns 400', async () => {
        const r = await patch('/api/auth/me/presence', { status: 'invalid_status' }, adminToken);
        assert.strictEqual(r.status, 400);
    });

    await test('PATCH /me/presence with valid status returns correct status', async () => {
        const r = await patch('/api/auth/me/presence', { status: 'away' }, adminToken);
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body.status, 'away');
    });

    await test('PATCH /me/presence without token returns 401', async () => {
        const r = await patch('/api/auth/me/presence', { status: 'online' });
        assert.strictEqual(r.status, 401);
    });

    // ── Auth: Password Reset ─────────────────────────────────────────────────
    section('Auth — Password Reset');

    await test('Forgot-password with non-existent email returns 200 (no enumeration)', async () => {
        const r = await post('/api/auth/forgot-password', { email: 'nobody@nowhere.com' });
        assert.strictEqual(r.status, 200);
        assert(r.body.message);
    });

    await test('Forgot-password without email returns 400', async () => {
        const r = await post('/api/auth/forgot-password', {});
        assert.strictEqual(r.status, 400);
    });

    await test('Reset-password with invalid token returns 400', async () => {
        const r = await post('/api/auth/reset-password', { token: 'fake-token', newPassword: 'NewPass@123!' });
        assert.strictEqual(r.status, 400);
    });

    // ── Users: Create ────────────────────────────────────────────────────────
    section('Users — Create');

    await test('POST /api/users without auth returns 401', async () => {
        const r = await post('/api/users', { name: 'Test', email: 'test@test.com', password: 'Test@123!' });
        assert.strictEqual(r.status, 401);
    });

    await test('POST /api/users with invalid email returns 400', async () => {
        const r = await post('/api/users', { name: 'Test', email: 'not-an-email', password: 'Test@123!' }, adminToken);
        assert.strictEqual(r.status, 400);
    });

    await test('POST /api/users with weak password returns 400', async () => {
        const r = await post('/api/users', { name: 'Test', email: 'agent@test.com', password: '123' }, adminToken);
        assert.strictEqual(r.status, 400);
    });

    await test('POST /api/users with invalid role returns 400', async () => {
        const r = await post('/api/users', { name: 'Test', email: 'agent@test.com', password: 'Test@123!', role: 'superadmin' }, adminToken);
        assert.strictEqual(r.status, 400);
    });

    await test('POST /api/users with non-UUID departmentId returns 400', async () => {
        const r = await post('/api/users', { name: 'Test', email: 'agent2@test.com', password: 'Test@123!', departmentId: 'not-a-uuid' }, adminToken);
        assert.strictEqual(r.status, 400);
    });

    await test('POST /api/users creates agent successfully', async () => {
        const r = await post('/api/users', {
            name: 'Test Agent',
            email: 'agent@test.com',
            password: 'Agent@Test123!',
            role: 'agent'
        }, adminToken);
        assert.strictEqual(r.status, 201, `Create user failed: ${JSON.stringify(r.body)}`);
        assert(r.body.id, 'Expected id');
        assert.strictEqual(r.body.email, 'agent@test.com');
        assert(!r.body.password, 'Password must not be in response');
        createdUserId = r.body.id;
    });

    await test('POST /api/users with duplicate email returns 400', async () => {
        const r = await post('/api/users', { name: 'Dup', email: 'agent@test.com', password: 'Test@123!' }, adminToken);
        assert.strictEqual(r.status, 400);
    });

    // ── Users: Agent Login ───────────────────────────────────────────────────
    section('Users — Agent Login');

    await test('Agent can login with created credentials', async () => {
        const r = await post('/api/auth/login', { email: 'agent@test.com', password: 'Agent@Test123!' });
        assert.strictEqual(r.status, 200);
        assert(r.body.token);
        agentToken = r.body.token;
    });

    // ── Users: Read ──────────────────────────────────────────────────────────
    section('Users — Read');

    await test('GET /api/users returns list without passwords', async () => {
        const r = await get('/api/users', adminToken);
        assert.strictEqual(r.status, 200);
        assert(Array.isArray(r.body.data));
        assert(r.body.data.length >= 2);
        r.body.data.forEach(u => assert(!u.password, `Password leaked for user ${u.email}`));
    });

    await test('GET /api/users/:id with valid UUID returns user', async () => {
        const r = await get(`/api/users/${createdUserId}`, adminToken);
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body.id, createdUserId);
    });

    await test('GET /api/users/:id with invalid UUID returns 400', async () => {
        const r = await get('/api/users/not-a-uuid', adminToken);
        assert.strictEqual(r.status, 400);
    });

    await test('GET /api/users/:id with non-existent UUID returns 404', async () => {
        const r = await get('/api/users/00000000-0000-0000-0000-000000000000', adminToken);
        assert.strictEqual(r.status, 404);
    });

    // ── Users: Update ────────────────────────────────────────────────────────
    section('Users — Update');

    await test('PUT /api/users/:id updates name', async () => {
        const r = await put(`/api/users/${createdUserId}`, { name: 'Updated Agent' }, adminToken);
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body.name, 'Updated Agent');
    });

    await test('PATCH /api/users/me updates own profile', async () => {
        const r = await patch('/api/users/me', { name: 'Agent Updated' }, agentToken);
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body.name, 'Agent Updated');
    });

    await test('PATCH /api/users/me with javascript: avatar returns 400', async () => {
        const r = await patch('/api/users/me', { avatar: 'javascript:alert(1)' }, agentToken);
        assert.strictEqual(r.status, 400);
    });

    await test('PATCH /api/users/me with data: avatar returns 400', async () => {
        const r = await patch('/api/users/me', { avatar: 'data:text/html,<script>alert(1)</script>' }, agentToken);
        assert.strictEqual(r.status, 400);
    });

    await test('PATCH /api/users/me with valid https avatar is accepted', async () => {
        const r = await patch('/api/users/me', { avatar: 'https://example.com/avatar.jpg' }, agentToken);
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body.avatar, 'https://example.com/avatar.jpg');
    });

    // ── Customers: Create ────────────────────────────────────────────────────
    section('Customers — Create');

    await test('POST /api/customers without auth returns 401', async () => {
        const r = await post('/api/customers', { name: 'Test', phone: '09121234567' });
        assert.strictEqual(r.status, 401);
    });

    await test('POST /api/customers without name or phone returns 400', async () => {
        const r = await post('/api/customers', { email: 'test@test.com' }, adminToken);
        assert.strictEqual(r.status, 400);
    });

    await test('POST /api/customers with invalid status is sanitized to active', async () => {
        const r = await post('/api/customers', {
            name: 'Status Test',
            phone: '09000000001',
            status: 'hacked_status'
        }, adminToken);
        assert.strictEqual(r.status, 201);
        assert.strictEqual(r.body.status, 'active', 'Invalid status must be sanitized');
    });

    await test('POST /api/customers creates customer successfully', async () => {
        const r = await post('/api/customers', {
            name: 'Ali Mohammadi',
            phone: '09121234567',
            email: 'ali@test.com',
            status: 'active'
        }, adminToken);
        assert.strictEqual(r.status, 201, `Create customer failed: ${JSON.stringify(r.body)}`);
        assert(r.body.id);
        assert.strictEqual(r.body.name, 'Ali Mohammadi');
        createdCustomerId = r.body.id;
    });

    await test('POST /api/customers cannot inject id field', async () => {
        const r = await post('/api/customers', {
            name: 'Hacker',
            phone: '09999999999',
            id: '00000000-0000-0000-0000-deadbeef0000',
        }, adminToken);
        assert.strictEqual(r.status, 201);
        assert.notStrictEqual(r.body.id, '00000000-0000-0000-0000-deadbeef0000', 'ID must not be injectable');
    });

    // ── Customers: Read ──────────────────────────────────────────────────────
    section('Customers — Read');

    await test('GET /api/customers returns paginated list', async () => {
        const r = await get('/api/customers', adminToken);
        assert.strictEqual(r.status, 200);
        assert(Array.isArray(r.body.data));
        assert(typeof r.body.total === 'number');
    });

    await test('GET /api/customers?search=Ali returns results', async () => {
        const r = await get('/api/customers?search=Ali', adminToken);
        assert.strictEqual(r.status, 200);
        assert(Array.isArray(r.body.data));
    });

    await test('GET /api/customers?search= with LIKE wildcard chars is safe', async () => {
        const r = await get('/api/customers?search=test%25_test', adminToken);
        assert.strictEqual(r.status, 200);
    });

    await test('GET /api/customers/:id returns customer', async () => {
        const r = await get(`/api/customers/${createdCustomerId}`, adminToken);
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body.id, createdCustomerId);
    });

    await test('GET /api/customers/:id with invalid UUID returns 400', async () => {
        const r = await get('/api/customers/not-a-uuid', adminToken);
        assert.strictEqual(r.status, 400);
    });

    await test('GET /api/customers/:id with non-existent UUID returns 404', async () => {
        const r = await get('/api/customers/00000000-0000-0000-0000-000000000000', adminToken);
        assert.strictEqual(r.status, 404);
    });

    // ── Customers: Update ────────────────────────────────────────────────────
    section('Customers — Update');

    await test('PUT /api/customers/:id updates name', async () => {
        const r = await put(`/api/customers/${createdCustomerId}`, { name: 'Updated Name' }, adminToken);
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body.name, 'Updated Name');
    });

    await test('PUT /api/customers/:id with invalid UUID returns 400', async () => {
        const r = await put('/api/customers/bad-id', { name: 'X' }, adminToken);
        assert.strictEqual(r.status, 400);
    });

    // ── Conversations ────────────────────────────────────────────────────────
    section('Conversations');

    await test('GET /api/conversations without auth returns 401', async () => {
        const r = await get('/api/conversations');
        assert.strictEqual(r.status, 401);
    });

    await test('GET /api/conversations returns paginated list', async () => {
        const r = await get('/api/conversations', adminToken);
        assert.strictEqual(r.status, 200);
        assert(Array.isArray(r.body.data));
        assert(typeof r.body.total === 'number');
    });

    await test('GET /api/conversations/:id with invalid UUID returns 400', async () => {
        const r = await get('/api/conversations/not-a-uuid', adminToken);
        assert.strictEqual(r.status, 400);
    });

    await test('GET /api/conversations/:id with non-existent UUID returns 404', async () => {
        const r = await get('/api/conversations/00000000-0000-0000-0000-000000000000', adminToken);
        assert.strictEqual(r.status, 404);
    });

    await test('GET /api/conversations/:id/messages with invalid before param returns 400', async () => {
        const r = await get('/api/conversations/00000000-0000-0000-0000-000000000001/messages?before=not-uuid', adminToken);
        assert([400, 404].includes(r.status), `Expected 400 or 404, got ${r.status}`);
    });

    // ── Security: Auth Boundaries ────────────────────────────────────────────
    section('Security — Auth Boundaries');

    await test('Agent cannot create users (403)', async () => {
        const r = await post('/api/users', {
            name: 'Unauthorized',
            email: 'unauth@test.com',
            password: 'Test@123!'
        }, agentToken);
        assert.strictEqual(r.status, 403);
    });

    await test('Agent cannot delete customers (403)', async () => {
        const r = await del(`/api/customers/${createdCustomerId}`, agentToken);
        assert.strictEqual(r.status, 403);
    });

    await test('All main routes require auth (401 without token)', async () => {
        const routes = ['/api/users', '/api/customers', '/api/conversations'];
        for (const route of routes) {
            const r = await get(route);
            assert.strictEqual(r.status, 401, `Expected 401 for ${route}, got ${r.status}`);
        }
    });

    // ── Security: UUID Injection ─────────────────────────────────────────────
    section('Security — UUID Injection');

    await test('GET /api/users with SQL-like UUID returns 400', async () => {
        const r = await get("/api/users/'; DROP TABLE Users; --", adminToken);
        assert([400, 404].includes(r.status));
    });

    await test('GET /api/customers/12345 returns 400', async () => {
        const r = await get('/api/customers/12345', adminToken);
        assert.strictEqual(r.status, 400);
    });

    // ── Permissions: isMainAdmin ─────────────────────────────────────────────
    section('Permissions — isMainAdmin');

    await test('isMainAdmin returns true for configured admin', async () => {
        const { isMainAdmin } = require('../lib/permissions');
        assert.strictEqual(isMainAdmin({ email: 'admin@test.com' }), true);
    });

    await test('isMainAdmin returns false for non-admin', async () => {
        const { isMainAdmin } = require('../lib/permissions');
        assert.strictEqual(isMainAdmin({ email: 'agent@test.com' }), false);
    });

    await test('isMainAdmin returns false for null user', async () => {
        const { isMainAdmin } = require('../lib/permissions');
        assert.strictEqual(isMainAdmin(null), false);
        assert.strictEqual(isMainAdmin({}), false);
    });

    // ── Validation Library ───────────────────────────────────────────────────
    section('Validation Library');

    await test('isValidUUID accepts valid UUIDs', async () => {
        const { isValidUUID } = require('../lib/validation');
        assert.strictEqual(isValidUUID('550e8400-e29b-41d4-a716-446655440000'), true);
        assert.strictEqual(isValidUUID('00000000-0000-0000-0000-000000000000'), true);
    });

    await test('isValidUUID rejects invalid values', async () => {
        const { isValidUUID } = require('../lib/validation');
        assert.strictEqual(isValidUUID('not-a-uuid'), false);
        assert.strictEqual(isValidUUID(''), false);
        assert.strictEqual(isValidUUID(null), false);
        assert.strictEqual(isValidUUID(undefined), false);
        assert.strictEqual(isValidUUID('12345'), false);
        assert.strictEqual(isValidUUID("'; DROP TABLE--"), false);
    });

    await test('parsePagination returns correct page/limit/offset', async () => {
        const { parsePagination } = require('../lib/validation');
        const r = parsePagination('2', '20', 100);
        assert.strictEqual(r.page, 2);
        assert.strictEqual(r.limit, 20);
        assert.strictEqual(r.offset, 20);
    });

    await test('parsePagination enforces maxLimit', async () => {
        const { parsePagination } = require('../lib/validation');
        assert.strictEqual(parsePagination('1', '9999', 50).limit, 50);
    });

    await test('parsePagination handles invalid inputs', async () => {
        const { parsePagination } = require('../lib/validation');
        const r = parsePagination('abc', 'xyz', 100);
        assert.strictEqual(r.page, 1);
        assert(r.limit > 0);
        assert.strictEqual(r.offset, 0);
    });

    // ── Password Validation ──────────────────────────────────────────────────
    section('Password Validation');

    await test('validatePassword rejects short passwords', async () => {
        const { validatePassword } = require('../lib/passwordValidation');
        assert.strictEqual(validatePassword('Ab1!').valid, false);
    });

    await test('validatePassword rejects passwords without special char', async () => {
        const { validatePassword } = require('../lib/passwordValidation');
        assert.strictEqual(validatePassword('Password123').valid, false);
    });

    await test('validatePassword accepts strong passwords', async () => {
        const { validatePassword } = require('../lib/passwordValidation');
        assert.strictEqual(validatePassword('StrongPass@123').valid, true);
    });

    // ── Customers: Delete ────────────────────────────────────────────────────
    section('Customers — Delete');

    await test('DELETE /api/customers/:id with invalid UUID returns 400', async () => {
        const r = await del('/api/customers/bad-id', adminToken);
        assert.strictEqual(r.status, 400);
    });

    await test('DELETE /api/customers/:id deletes customer', async () => {
        const r = await del(`/api/customers/${createdCustomerId}`, adminToken);
        assert.strictEqual(r.status, 200);
    });

    await test('GET /api/customers/:id after delete returns 404', async () => {
        const r = await get(`/api/customers/${createdCustomerId}`, adminToken);
        assert.strictEqual(r.status, 404);
    });

    // ── Users: Deactivate ────────────────────────────────────────────────────
    section('Users — Deactivate');

    await test('delete-with-transfer without transferToUserId returns 400', async () => {
        const r = await post(`/api/users/${createdUserId}/delete-with-transfer`, {}, adminToken);
        assert.strictEqual(r.status, 400);
    });

    await test('delete-with-transfer with invalid UUID returns 400', async () => {
        const r = await post('/api/users/bad-id/delete-with-transfer', { transferToUserId: createdUserId }, adminToken);
        assert.strictEqual(r.status, 400);
    });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('🚀 Starting in-process test server...\n');

    // Start server in-process
    const serverModule = require('../server');
    const { io } = serverModule;

    // Wait for server to be ready
    await new Promise(r => setTimeout(r, 2000));

    // Verify server is up
    try {
        const r = await get('/health');
        if (r.status !== 200) throw new Error(`Health check failed: ${r.status}`);
        console.log('✓ Server ready\n');
    } catch (e) {
        console.error('❌ Server not responding:', e.message);
        process.exit(1);
    }

    try {
        await runTests();
    } finally {
        // Cleanup
        try {
            const { sequelize } = require('../models');
            await sequelize.close();
        } catch (_) {}
    }

    console.log('\n' + '─'.repeat(50));
    console.log(`Results: ${passed} passed, ${failed} failed`);
    if (failures.length) {
        console.log('\nFailed tests:');
        failures.forEach(f => console.log(`  ✗ ${f.name}\n    → ${f.error}`));
    }
    console.log('─'.repeat(50));

    process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
    console.error('Fatal:', err.message);
    process.exit(1);
});

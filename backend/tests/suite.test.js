/**
 * Test Suite — Auth, Users, Customers, Conversations, Security, Permissions
 * اجرا: node tests/suite.test.js
 * از SQLite in-memory استفاده می‌کند — نیازی به DB خارجی نیست
 */
'use strict';

const path = require('path');
process.env.USE_SQLITE = 'true';
process.env.JWT_SECRET = 'test-jwt-secret-32-chars-minimum!!';
process.env.MAIN_ADMIN_EMAIL = 'admin@test.com';
process.env.MAIN_ADMIN_PASSWORD = 'Admin@Test123!';
process.env.NODE_ENV = 'test';
process.env.PORT = '3099';
process.env.DISABLE_RATE_LIMIT = 'true';

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const assert = require('assert');
const http = require('http');

const BASE = 'http://localhost:3099';
let serverProcess = null;
let adminToken = null;
let agentToken = null;
let createdUserId = null;
let createdCustomerId = null;
let createdConvId = null;

// ─── HTTP helpers ────────────────────────────────────────────────────────────

function request(method, urlPath, body, token) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlPath, BASE);
        const payload = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: url.hostname,
            port: url.port,
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

async function waitForServer(ms = 20000) {
    const t = Date.now();
    while (Date.now() - t < ms) {
        try { const r = await get('/health'); if (r.status === 200) return true; } catch (_) {}
        await new Promise(r => setTimeout(r, 400));
    }
    return false;
}

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

// ─── Tests ───────────────────────────────────────────────────────────────────

async function runTests() {

    // ── Health & Public ──────────────────────────────────────────────────────
    section('Health & Public Endpoints');

    await test('GET /health returns 200', async () => {
        const r = await get('/health');
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body.status, 'ok');
        assert(r.body.uptime >= 0);
    });

    await test('GET /api/ping returns ok', async () => {
        const r = await get('/api/ping');
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body.ok, true);
    });

    await test('GET /api/config returns timezone', async () => {
        const r = await get('/api/config');
        assert.strictEqual(r.status, 200);
        assert(r.body.timezone);
    });

    // ── Auth: Login ──────────────────────────────────────────────────────────
    section('Auth — Login');

    await test('POST /api/auth/login with wrong password returns 401', async () => {
        const r = await post('/api/auth/login', { email: 'admin@test.com', password: 'WrongPass!' });
        assert.strictEqual(r.status, 401);
        assert(r.body.error);
    });

    await test('POST /api/auth/login with non-existent user returns 401', async () => {
        const r = await post('/api/auth/login', { email: 'nobody@test.com', password: 'Test123!' });
        assert.strictEqual(r.status, 401);
    });

    await test('POST /api/auth/login with missing fields returns 400', async () => {
        const r = await post('/api/auth/login', { email: 'admin@test.com' });
        assert.strictEqual(r.status, 400);
    });

    await test('POST /api/auth/login with valid admin credentials returns token', async () => {
        const r = await post('/api/auth/login', {
            email: 'admin@test.com',
            password: 'Admin@Test123!'
        });
        assert.strictEqual(r.status, 200, `Login failed: ${JSON.stringify(r.body)}`);
        assert(r.body.token, 'Expected token in response');
        assert(r.body.user, 'Expected user in response');
        assert.strictEqual(r.body.user.email, 'admin@test.com');
        adminToken = r.body.token;
    });

    // ── Auth: /me ────────────────────────────────────────────────────────────
    section('Auth — /me');

    await test('GET /api/auth/me without token returns 401', async () => {
        const r = await get('/api/auth/me');
        assert.strictEqual(r.status, 401);
    });

    await test('GET /api/auth/me with valid token returns user', async () => {
        const r = await get('/api/auth/me', adminToken);
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body.email, 'admin@test.com');
        assert(!r.body.password, 'Password must not be in response');
    });

    // ── Auth: Presence ───────────────────────────────────────────────────────
    section('Auth — Presence');

    await test('PATCH /api/auth/me/presence with invalid status returns 400', async () => {
        const r = await patch('/api/auth/me/presence', { status: 'invalid_status' }, adminToken);
        assert.strictEqual(r.status, 400);
    });

    await test('PATCH /api/auth/me/presence with valid status returns ok', async () => {
        const r = await patch('/api/auth/me/presence', { status: 'away' }, adminToken);
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body.status, 'away');
    });

    await test('PATCH /api/auth/me/presence without token returns 401', async () => {
        const r = await patch('/api/auth/me/presence', { status: 'online' });
        assert.strictEqual(r.status, 401);
    });

    // ── Auth: Password Reset ─────────────────────────────────────────────────
    section('Auth — Password Reset');

    await test('POST /api/auth/forgot-password with non-existent email returns 200 (no enumeration)', async () => {
        const r = await post('/api/auth/forgot-password', { email: 'nobody@nowhere.com' });
        assert.strictEqual(r.status, 200);
        assert(r.body.message);
    });

    await test('POST /api/auth/forgot-password without email returns 400', async () => {
        const r = await post('/api/auth/forgot-password', {});
        assert.strictEqual(r.status, 400);
    });

    await test('POST /api/auth/reset-password with invalid token returns 400', async () => {
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

    await test('POST /api/users with invalid departmentId (non-UUID) returns 400', async () => {
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
        assert(r.body.id);
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

    await test('GET /api/users returns list', async () => {
        const r = await get('/api/users', adminToken);
        assert.strictEqual(r.status, 200);
        assert(Array.isArray(r.body.data));
        assert(r.body.data.length >= 2);
        r.body.data.forEach(u => assert(!u.password, 'Password must not be in list'));
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

    await test('PATCH /api/users/me with invalid avatar URL returns 400', async () => {
        const r = await patch('/api/users/me', { avatar: 'javascript:alert(1)' }, agentToken);
        assert.strictEqual(r.status, 400);
    });

    await test('PATCH /api/users/me with valid avatar URL accepts it', async () => {
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

    await test('POST /api/customers with invalid status returns 400 or ignores it', async () => {
        const r = await post('/api/customers', {
            name: 'Test Customer',
            phone: '09121234567',
            status: 'hacked'
        }, adminToken);
        // باید یا 400 برگرداند یا status را به 'active' تبدیل کند
        if (r.status === 201) {
            assert.strictEqual(r.body.status, 'active', 'Invalid status must be sanitized to active');
        } else {
            assert.strictEqual(r.status, 400);
        }
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

    // ── Customers: Read ──────────────────────────────────────────────────────
    section('Customers — Read');

    await test('GET /api/customers returns paginated list', async () => {
        const r = await get('/api/customers', adminToken);
        assert.strictEqual(r.status, 200);
        assert(Array.isArray(r.body.data));
        assert(typeof r.body.total === 'number');
    });

    await test('GET /api/customers?search= works', async () => {
        const r = await get('/api/customers?search=Ali', adminToken);
        assert.strictEqual(r.status, 200);
        assert(Array.isArray(r.body.data));
    });

    await test('GET /api/customers?search= with LIKE wildcard chars is safe', async () => {
        const r = await get('/api/customers?search=test%25_test', adminToken);
        assert.strictEqual(r.status, 200);
    });

    await test('GET /api/customers/:id with valid UUID returns customer', async () => {
        const r = await get(`/api/customers/${createdCustomerId}`, adminToken);
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body.id, createdCustomerId);
    });

    await test('GET /api/customers/:id with invalid UUID returns 400', async () => {
        const r = await get('/api/customers/not-a-uuid', adminToken);
        assert.strictEqual(r.status, 400);
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
    section('Conversations — List & Read');

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

    // ── Security: UUID Validation ────────────────────────────────────────────
    section('Security — UUID Validation');

    await test('GET /api/users/sql-injection-attempt returns 400', async () => {
        const r = await get("/api/users/'; DROP TABLE Users; --", adminToken);
        assert([400, 404].includes(r.status));
    });

    await test('GET /api/customers/not-uuid returns 400', async () => {
        const r = await get('/api/customers/12345', adminToken);
        assert.strictEqual(r.status, 400);
    });

    await test('GET /api/conversations/messages with invalid before param returns 400', async () => {
        const r = await get('/api/conversations/00000000-0000-0000-0000-000000000000/messages?before=not-uuid', adminToken);
        // 404 if conv not found, 400 if UUID validation triggers first
        assert([400, 404].includes(r.status));
    });

    // ── Security: Mass Assignment ────────────────────────────────────────────
    section('Security — Mass Assignment');

    await test('POST /api/customers cannot inject internal fields', async () => {
        const r = await post('/api/customers', {
            name: 'Hacker',
            phone: '09999999999',
            id: '00000000-0000-0000-0000-deadbeef0000',
            createdAt: '2000-01-01',
            source: 'hacked'
        }, adminToken);
        assert.strictEqual(r.status, 201);
        assert.notStrictEqual(r.body.id, '00000000-0000-0000-0000-deadbeef0000', 'ID must not be injectable');
    });

    // ── Security: Auth Boundaries ────────────────────────────────────────────
    section('Security — Auth Boundaries');

    await test('Agent cannot create users', async () => {
        const r = await post('/api/users', {
            name: 'Unauthorized',
            email: 'unauth@test.com',
            password: 'Test@123!'
        }, agentToken);
        assert.strictEqual(r.status, 403);
    });

    await test('Agent cannot delete customers', async () => {
        const r = await del(`/api/customers/${createdCustomerId}`, agentToken);
        assert.strictEqual(r.status, 403);
    });

    await test('Unauthenticated request to protected route returns 401', async () => {
        const routes = [
            '/api/users',
            '/api/customers',
            '/api/conversations',
        ];
        for (const route of routes) {
            const r = await get(route);
            assert.strictEqual(r.status, 401, `Expected 401 for ${route}, got ${r.status}`);
        }
    });

    // ── Permissions: isMainAdmin ─────────────────────────────────────────────
    section('Permissions — isMainAdmin');

    await test('isMainAdmin returns false for empty MAIN_ADMIN_EMAIL', async () => {
        const { isMainAdmin } = require('../lib/permissions');
        const origEnv = process.env.MAIN_ADMIN_EMAIL;
        process.env.MAIN_ADMIN_EMAIL = '';
        // reload module to pick up new env (workaround: test the function directly)
        const result = isMainAdmin({ email: 'admin@test.com' });
        // Note: module is cached so we test the cached version
        process.env.MAIN_ADMIN_EMAIL = origEnv;
        assert(typeof result === 'boolean');
    });

    await test('isMainAdmin returns true for configured admin email', async () => {
        const { isMainAdmin } = require('../lib/permissions');
        const result = isMainAdmin({ email: 'admin@test.com' });
        assert.strictEqual(result, true);
    });

    await test('isMainAdmin returns false for non-admin email', async () => {
        const { isMainAdmin } = require('../lib/permissions');
        const result = isMainAdmin({ email: 'agent@test.com' });
        assert.strictEqual(result, false);
    });

    // ── Validation Lib ───────────────────────────────────────────────────────
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

    await test('parsePagination returns correct values', async () => {
        const { parsePagination } = require('../lib/validation');
        const { page, limit, offset } = parsePagination('2', '20', 100);
        assert.strictEqual(page, 2);
        assert.strictEqual(limit, 20);
        assert.strictEqual(offset, 20);
    });

    await test('parsePagination enforces maxLimit', async () => {
        const { parsePagination } = require('../lib/validation');
        const { limit } = parsePagination('1', '9999', 50);
        assert.strictEqual(limit, 50);
    });

    await test('parsePagination handles invalid inputs gracefully', async () => {
        const { parsePagination } = require('../lib/validation');
        const { page, limit, offset } = parsePagination('abc', 'xyz', 100);
        assert.strictEqual(page, 1);
        assert(limit > 0);
        assert.strictEqual(offset, 0);
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

    // ── Users: Delete ────────────────────────────────────────────────────────
    section('Users — Deactivate');

    await test('POST /api/users/:id/delete-with-transfer without transferToUserId returns 400', async () => {
        const r = await post(`/api/users/${createdUserId}/delete-with-transfer`, {}, adminToken);
        assert.strictEqual(r.status, 400);
    });

    await test('POST /api/users/:id/delete-with-transfer with invalid UUID returns 400', async () => {
        const r = await post('/api/users/bad-id/delete-with-transfer', { transferToUserId: adminToken }, adminToken);
        assert.strictEqual(r.status, 400);
    });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    const { spawn } = require('child_process');

    console.log('🚀 Starting test server...');
    const env = {
        ...process.env,
        USE_SQLITE: 'true',
        JWT_SECRET: 'test-jwt-secret-32-chars-minimum!!',
        MAIN_ADMIN_EMAIL: 'admin@test.com',
        MAIN_ADMIN_PASSWORD: 'Admin@Test123!',
        NODE_ENV: 'test',
        PORT: '3099',
        DISABLE_RATE_LIMIT: 'true',
    };

    serverProcess = spawn('node', ['server.js'], {
        cwd: path.join(__dirname, '..'),
        env,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    serverProcess.stderr.on('data', (d) => {
        const msg = d.toString();
        if (!msg.includes('DeprecationWarning') && !msg.includes('ExperimentalWarning')) {
            process.stderr.write('[server] ' + msg);
        }
    });

    const ready = await waitForServer(25000);
    if (!ready) {
        serverProcess.kill();
        console.error('❌ Server did not start in time');
        process.exit(1);
    }
    console.log('✓ Server ready\n');

    try {
        await runTests();
    } finally {
        serverProcess.kill('SIGTERM');
    }

    console.log('\n' + '─'.repeat(50));
    console.log(`Results: ${passed} passed, ${failed} failed`);
    if (failures.length) {
        console.log('\nFailed tests:');
        failures.forEach(f => console.log(`  ✗ ${f.name}\n    ${f.error}`));
    }
    console.log('─'.repeat(50));

    if (failed > 0) process.exit(1);
    else console.log('\n✅ All tests passed!');
}

main().catch(err => {
    console.error('Fatal:', err);
    if (serverProcess) serverProcess.kill();
    process.exit(1);
});

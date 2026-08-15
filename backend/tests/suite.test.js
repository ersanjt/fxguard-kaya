/**
 * Test Suite — Auth, Users, Customers, Conversations, Security, Permissions
 * اجرا: node tests/suite.test.js
 * از SQLite in-memory و supertest استفاده می‌کند — نیازی به DB خارجی نیست
 */
'use strict';

// ─── Environment setup (must be before any require) ──────────────────────────
process.env.USE_SQLITE = 'true';
process.env.JWT_SECRET = 'test-jwt-secret-32-chars-minimum!!';
process.env.ENCRYPT_SECRET = 'test-encrypt-secret-32-chars-min!';
process.env.MAIN_ADMIN_EMAIL = 'admin@test.com';
process.env.MAIN_ADMIN_PASSWORD = 'Admin@Test123!';
process.env.NODE_ENV = 'test';
process.env.PORT = '3099';
process.env.DISABLE_RATE_LIMIT = 'true';

const assert = require('assert');
const supertest = require('supertest');

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

let req;
let adminToken = null;
let agentToken = null;
let createdUserId = null;
let createdCustomerId = null;
let createdConversationId = null;
let filterConversationId = null;

// ─── Tests ───────────────────────────────────────────────────────────────────

async function runTests() {

    // ── Health & Public ──────────────────────────────────────────────────────
    section('Health & Public Endpoints');

    await test('GET /health returns 200 with status ok', async () => {
        const r = await req.get('/health');
        assert.strictEqual(r.status, 200);
        assert(['ok', 'degraded'].includes(r.body.status), `Unexpected health status: ${r.body.status}`);
        assert(r.body.uptime >= 0);
    });

    await test('GET /metrics without METRICS_TOKEN returns 404', async () => {
        const prev = process.env.METRICS_TOKEN;
        delete process.env.METRICS_TOKEN;
        const r = await req.get('/metrics');
        if (prev != null) process.env.METRICS_TOKEN = prev;
        assert.strictEqual(r.status, 404);
    });

    await test('GET /api/ping returns ok:true', async () => {
        const r = await req.get('/api/ping');
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body.ok, true);
    });

    await test('GET /api/config returns timezone', async () => {
        const r = await req.get('/api/config');
        assert.strictEqual(r.status, 200);
        assert(r.body.timezone, 'Expected timezone in config');
    });

    // ── Auth: Login ──────────────────────────────────────────────────────────
    section('Auth — Login');

    await test('Login with wrong password returns 401', async () => {
        const r = await req.post('/api/auth/login')
            .send({ email: 'admin@test.com', password: 'WrongPass!' });
        assert.strictEqual(r.status, 401);
        assert(r.body.error);
    });

    await test('Login with non-existent user returns 401', async () => {
        const r = await req.post('/api/auth/login')
            .send({ email: 'nobody@test.com', password: 'Test123!' });
        assert.strictEqual(r.status, 401);
    });

    await test('Login with missing password returns 400', async () => {
        const r = await req.post('/api/auth/login')
            .send({ email: 'admin@test.com' });
        assert.strictEqual(r.status, 400);
    });

    await test('Login with valid admin credentials returns token', async () => {
        const r = await req.post('/api/auth/login')
            .send({ email: 'admin@test.com', password: 'Admin@Test123!' });
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
        const r = await req.get('/api/auth/me');
        assert.strictEqual(r.status, 401);
    });

    await test('GET /api/auth/me with valid token returns user without password', async () => {
        const r = await req.get('/api/auth/me')
            .set('Authorization', `Bearer ${adminToken}`);
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body.email, 'admin@test.com');
        assert(!r.body.password, 'Password must not be in /me response');
    });

    await test('GET /api/system-status without auth returns 401', async () => {
        const r = await req.get('/api/system-status');
        assert.strictEqual(r.status, 401);
    });

    await test('GET /api/system-status for admin returns health payload', async () => {
        const r = await req.get('/api/system-status')
            .set('Authorization', `Bearer ${adminToken}`);
        assert.ok([200, 503].includes(r.status), `Unexpected status ${r.status}`);
        assert(['ok', 'degraded', 'error'].includes(r.body.status), `Unexpected status: ${r.body.status}`);
        assert(r.body.checks && r.body.checks.database, 'Expected database check');
        assert(r.body.checks.gateway || r.body.checks.whatsapp, 'Expected gateway/whatsapp check');
        assert(r.body.process, 'Expected process info');
    });

    await test('GET /api/whatsapp/numbers seeds primary slot', async () => {
        const r = await req.get('/api/whatsapp/numbers')
            .set('Authorization', `Bearer ${adminToken}`);
        assert.strictEqual(r.status, 200);
        assert(Array.isArray(r.body.numbers), 'Expected numbers array');
        assert(r.body.numbers.some((n) => n.slotKey === 'primary' || n.role === 'primary'), 'Expected primary slot');
        assert.strictEqual(typeof r.body.failoverEnabled, 'boolean');
    });

    await test('POST /api/whatsapp/numbers creates empty standby slot', async () => {
        const r = await req.post('/api/whatsapp/numbers')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ label: 'Standby test slot' });
        assert.strictEqual(r.status, 201, JSON.stringify(r.body));
        assert.strictEqual(r.body.role, 'standby');
        assert.strictEqual(r.body.ready, false);
        assert(r.body.id, 'Expected id');
    });

    await test('GET /api/profile-image without auth returns 401', async () => {
        const r = await req.get('/api/profile-image?url=' + encodeURIComponent('https://pps.whatsapp.net/v/t61/test'));
        assert.strictEqual(r.status, 401);
    });

    await test('GET /api/profile-image with token rejects non-CDN host', async () => {
        const r = await req.get('/api/profile-image?url=' + encodeURIComponent('https://example.com/pic.jpg'))
            .set('Authorization', `Bearer ${adminToken}`);
        assert.strictEqual(r.status, 400);
        assert(r.body.error, 'Expected error body');
    });

    // ── Auth: Presence ───────────────────────────────────────────────────────
    section('Auth — Presence');

    await test('PATCH /me/presence with invalid status returns 400', async () => {
        const r = await req.patch('/api/auth/me/presence')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'invalid_status' });
        assert.strictEqual(r.status, 400);
    });

    await test('PATCH /me/presence with valid status returns correct status', async () => {
        const r = await req.patch('/api/auth/me/presence')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'away' });
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body.status, 'away');
    });

    await test('PATCH /me/presence without token returns 401', async () => {
        const r = await req.patch('/api/auth/me/presence')
            .send({ status: 'online' });
        assert.strictEqual(r.status, 401);
    });

    // ── Auth: Password Reset ─────────────────────────────────────────────────
    section('Auth — Password Reset');

    await test('Forgot-password with non-existent email returns 200 (no enumeration)', async () => {
        const r = await req.post('/api/auth/forgot-password')
            .send({ email: 'nobody@nowhere.com' });
        assert.strictEqual(r.status, 200);
        assert(r.body.message);
    });

    await test('Forgot-password without email returns 400', async () => {
        const r = await req.post('/api/auth/forgot-password')
            .send({});
        assert.strictEqual(r.status, 400);
    });

    await test('Reset-password with invalid token returns 400', async () => {
        const r = await req.post('/api/auth/reset-password')
            .send({ token: 'fake-token', newPassword: 'NewPass@123!' });
        assert.strictEqual(r.status, 400);
    });

    // ── Users: Create ────────────────────────────────────────────────────────
    section('Users — Create');

    await test('POST /api/users without auth returns 401', async () => {
        const r = await req.post('/api/users')
            .send({ name: 'Test', email: 'test@test.com', password: 'Test@123!' });
        assert.strictEqual(r.status, 401);
    });

    await test('POST /api/users with invalid email returns 400', async () => {
        const r = await req.post('/api/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Test', email: 'not-an-email', password: 'Test@123!' });
        assert.strictEqual(r.status, 400);
    });

    await test('POST /api/users with weak password returns 400', async () => {
        const r = await req.post('/api/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Test', email: 'agent@test.com', password: '123' });
        assert.strictEqual(r.status, 400);
    });

    await test('POST /api/users with invalid role returns 400', async () => {
        const r = await req.post('/api/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Test', email: 'agent@test.com', password: 'Test@123!', role: 'superadmin' });
        assert.strictEqual(r.status, 400);
    });

    await test('POST /api/users with non-UUID departmentId returns 400', async () => {
        const r = await req.post('/api/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Test', email: 'agent2@test.com', password: 'Test@123!', departmentId: 'not-a-uuid' });
        assert.strictEqual(r.status, 400);
    });

    await test('POST /api/users creates agent successfully', async () => {
        const r = await req.post('/api/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Test Agent', email: 'agent@test.com', password: 'Agent@Test123!', role: 'agent' });
        assert.strictEqual(r.status, 201, `Create user failed: ${JSON.stringify(r.body)}`);
        assert(r.body.id, 'Expected id');
        assert.strictEqual(r.body.email, 'agent@test.com');
        assert(!r.body.password, 'Password must not be in response');
        createdUserId = r.body.id;
    });

    await test('POST /api/users with duplicate email returns 400', async () => {
        const r = await req.post('/api/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Dup', email: 'agent@test.com', password: 'Test@123!' });
        assert.strictEqual(r.status, 400);
    });

    // ── Users: Agent Login ───────────────────────────────────────────────────
    section('Users — Agent Login');

    await test('Agent can login with created credentials', async () => {
        const r = await req.post('/api/auth/login')
            .send({ email: 'agent@test.com', password: 'Agent@Test123!' });
        assert.strictEqual(r.status, 200);
        assert(r.body.token);
        agentToken = r.body.token;
    });

    // ── Tickets: access scoping ───────────────────────────────────────────────
    section('Tickets — access filter');

    await test('GET /api/tickets for agent only returns own/dept tickets', async () => {
        const adminTicket = await req.post('/api/tickets')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ title: 'Admin-only ticket leak check', description: 'should not leak to agent', priority: 'low' });
        assert.strictEqual(adminTicket.status, 201, JSON.stringify(adminTicket.body));
        const agentTicket = await req.post('/api/tickets')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                title: 'Assigned to agent',
                description: 'visible',
                priority: 'normal',
                assignedTo: createdUserId,
            });
        assert.strictEqual(agentTicket.status, 201, JSON.stringify(agentTicket.body));

        const list = await req.get('/api/tickets')
            .set('Authorization', `Bearer ${agentToken}`);
        assert.strictEqual(list.status, 200);
        const rows = list.body.data || [];
        const ids = rows.map((t) => t.id);
        assert(ids.includes(agentTicket.body.id), 'agent should see assigned ticket');
        assert(!ids.includes(adminTicket.body.id), 'agent must not see unrelated admin ticket');

        const stats = await req.get('/api/tickets/stats')
            .set('Authorization', `Bearer ${agentToken}`);
        assert.strictEqual(stats.status, 200);
        assert.strictEqual(stats.body.total, rows.length, 'stats total should match scoped list length');
    });

    // ── Users: Read ──────────────────────────────────────────────────────────
    section('Users — Read');

    await test('GET /api/users returns list without passwords', async () => {
        const r = await req.get('/api/users')
            .set('Authorization', `Bearer ${adminToken}`);
        assert.strictEqual(r.status, 200);
        assert(Array.isArray(r.body.data));
        assert(r.body.data.length >= 2);
        r.body.data.forEach(u => assert(!u.password, `Password leaked for user ${u.email}`));
    });

    await test('GET /api/users/:id with valid UUID returns user', async () => {
        const r = await req.get(`/api/users/${createdUserId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body.id, createdUserId);
    });

    await test('GET /api/users/:id with invalid UUID returns 400', async () => {
        const r = await req.get('/api/users/not-a-uuid')
            .set('Authorization', `Bearer ${adminToken}`);
        assert.strictEqual(r.status, 400);
    });

    await test('GET /api/users/:id with non-existent UUID returns 404', async () => {
        const r = await req.get('/api/users/00000000-0000-0000-0000-000000000000')
            .set('Authorization', `Bearer ${adminToken}`);
        assert.strictEqual(r.status, 404);
    });

    // ── Users: Update ────────────────────────────────────────────────────────
    section('Users — Update');

    await test('PUT /api/users/:id updates name', async () => {
        const r = await req.put(`/api/users/${createdUserId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Updated Agent' });
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body.name, 'Updated Agent');
    });

    await test('PATCH /api/users/me updates own profile', async () => {
        const r = await req.patch('/api/users/me')
            .set('Authorization', `Bearer ${agentToken}`)
            .send({ name: 'Agent Updated' });
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body.name, 'Agent Updated');
    });

    await test('PATCH /api/users/me with javascript: avatar returns 400', async () => {
        const r = await req.patch('/api/users/me')
            .set('Authorization', `Bearer ${agentToken}`)
            .send({ avatar: 'javascript:alert(1)' });
        assert.strictEqual(r.status, 400);
    });

    await test('PATCH /api/users/me with data: avatar returns 400', async () => {
        const r = await req.patch('/api/users/me')
            .set('Authorization', `Bearer ${agentToken}`)
            .send({ avatar: 'data:text/html,<script>alert(1)</script>' });
        assert.strictEqual(r.status, 400);
    });

    await test('PATCH /api/users/me with valid https avatar is accepted', async () => {
        const r = await req.patch('/api/users/me')
            .set('Authorization', `Bearer ${agentToken}`)
            .send({ avatar: 'https://example.com/avatar.jpg' });
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body.avatar, 'https://example.com/avatar.jpg');
    });

    // ── Customers: Create ────────────────────────────────────────────────────
    section('Customers — Create');

    await test('POST /api/customers without auth returns 401', async () => {
        const r = await req.post('/api/customers')
            .send({ name: 'Test', phone: '09121234567' });
        assert.strictEqual(r.status, 401);
    });

    await test('POST /api/customers without name or phone returns 400', async () => {
        const r = await req.post('/api/customers')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ email: 'test@test.com' });
        assert.strictEqual(r.status, 400);
    });

    await test('POST /api/customers with invalid status is sanitized to active', async () => {
        const r = await req.post('/api/customers')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Status Test', phone: '09000000001', status: 'hacked_status' });
        assert.strictEqual(r.status, 201);
        assert.strictEqual(r.body.status, 'active', 'Invalid status must be sanitized');
    });

    await test('POST /api/customers creates customer successfully', async () => {
        const r = await req.post('/api/customers')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Ali Mohammadi', phone: '09121234567', email: 'ali@test.com', status: 'active' });
        assert.strictEqual(r.status, 201, `Create customer failed: ${JSON.stringify(r.body)}`);
        assert(r.body.id);
        assert.strictEqual(r.body.name, 'Ali Mohammadi');
        createdCustomerId = r.body.id;
    });

    await test('POST /api/customers cannot inject id field (mass assignment guard)', async () => {
        const r = await req.post('/api/customers')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Hacker', phone: '09999999999', id: '00000000-0000-0000-0000-deadbeef0000' });
        assert.strictEqual(r.status, 201);
        assert.notStrictEqual(r.body.id, '00000000-0000-0000-0000-deadbeef0000', 'ID must not be injectable');
    });

    // ── Customers: Read ──────────────────────────────────────────────────────
    section('Customers — Read');

    await test('GET /api/customers returns paginated list', async () => {
        const r = await req.get('/api/customers')
            .set('Authorization', `Bearer ${adminToken}`);
        assert.strictEqual(r.status, 200);
        assert(Array.isArray(r.body.data));
        assert(typeof r.body.total === 'number');
    });

    await test('GET /api/customers?search=Ali returns results', async () => {
        const r = await req.get('/api/customers?search=Ali')
            .set('Authorization', `Bearer ${adminToken}`);
        assert.strictEqual(r.status, 200);
        assert(Array.isArray(r.body.data));
    });

    await test('GET /api/customers?search= with LIKE wildcard chars is safe', async () => {
        const r = await req.get('/api/customers?search=test%25_test')
            .set('Authorization', `Bearer ${adminToken}`);
        assert.strictEqual(r.status, 200);
    });

    await test('GET /api/customers/:id returns customer', async () => {
        const r = await req.get(`/api/customers/${createdCustomerId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body.id, createdCustomerId);
    });

    await test('GET /api/customers/:id with invalid UUID returns 400', async () => {
        const r = await req.get('/api/customers/not-a-uuid')
            .set('Authorization', `Bearer ${adminToken}`);
        assert.strictEqual(r.status, 400);
    });

    await test('GET /api/customers/:id with non-existent UUID returns 404', async () => {
        const r = await req.get('/api/customers/00000000-0000-0000-0000-000000000000')
            .set('Authorization', `Bearer ${adminToken}`);
        assert.strictEqual(r.status, 404);
    });

    // ── Customers: Update ────────────────────────────────────────────────────
    section('Customers — Update');

    await test('PUT /api/customers/:id updates name', async () => {
        const r = await req.put(`/api/customers/${createdCustomerId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Updated Name' });
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body.name, 'Updated Name');
    });

    await test('PUT /api/customers/:id with invalid UUID returns 400', async () => {
        const r = await req.put('/api/customers/bad-id')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'X' });
        assert.strictEqual(r.status, 400);
    });

    // ── Conversations ────────────────────────────────────────────────────────
    section('Conversations');

    await test('GET /api/conversations without auth returns 401', async () => {
        const r = await req.get('/api/conversations');
        assert.strictEqual(r.status, 401);
    });

    await test('GET /api/conversations returns paginated list', async () => {
        const r = await req.get('/api/conversations')
            .set('Authorization', `Bearer ${adminToken}`);
        assert.strictEqual(r.status, 200);
        assert(Array.isArray(r.body.data));
        assert(typeof r.body.total === 'number');
        assert(typeof r.body.openCount === 'number');
        assert(typeof r.body.unreadCount === 'number');
    });

    await test('POST /api/conversations creates conversation for customer', async () => {
        const r = await req.post('/api/conversations')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ customerId: createdCustomerId });
        assert.strictEqual(r.status, 201);
        assert(r.body && r.body.id, 'Expected conversation id');
        createdConversationId = r.body.id;
    });

    await test('Agent cannot access unassigned conversation detail (403)', async () => {
        const r = await req.get(`/api/conversations/${createdConversationId}`)
            .set('Authorization', `Bearer ${agentToken}`);
        assert.strictEqual(r.status, 403);
    });

    await test('Agent cannot patch unassigned conversation (403)', async () => {
        const r = await req.patch(`/api/conversations/${createdConversationId}`)
            .set('Authorization', `Bearer ${agentToken}`)
            .send({ status: 'pending' });
        assert.strictEqual(r.status, 403);
    });

    await test('Agent cannot send message to unassigned conversation (403)', async () => {
        const r = await req.post(`/api/conversations/${createdConversationId}/send`)
            .set('Authorization', `Bearer ${agentToken}`)
            .send({ content: 'hello' });
        assert.strictEqual(r.status, 403);
    });

    await test('Agent cannot delete conversation (403)', async () => {
        const r = await req.delete(`/api/conversations/${createdConversationId}`)
            .set('Authorization', `Bearer ${agentToken}`);
        assert.strictEqual(r.status, 403);
    });

    await test('GET /api/conversations/:id with invalid UUID returns 400', async () => {
        const r = await req.get('/api/conversations/not-a-uuid')
            .set('Authorization', `Bearer ${adminToken}`);
        assert.strictEqual(r.status, 400);
    });

    await test('GET /api/conversations/:id with non-existent UUID returns 404', async () => {
        const r = await req.get('/api/conversations/00000000-0000-0000-0000-000000000000')
            .set('Authorization', `Bearer ${adminToken}`);
        assert.strictEqual(r.status, 404);
    });

    await test('GET /api/conversations/:id/messages with invalid before param returns 400', async () => {
        const r = await req.get('/api/conversations/00000000-0000-0000-0000-000000000001/messages?before=not-uuid')
            .set('Authorization', `Bearer ${adminToken}`);
        assert([400, 404].includes(r.status), `Expected 400 or 404, got ${r.status}`);
    });

    await test('POST /api/conversations/:id/read marks conversation as read (admin)', async () => {
        const r = await req.post(`/api/conversations/${createdConversationId}/read`)
            .set('Authorization', `Bearer ${adminToken}`);
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body.ok, true);
    });

    await test('Agent cannot mark unassigned conversation as read (403)', async () => {
        const r = await req.post(`/api/conversations/${createdConversationId}/read`)
            .set('Authorization', `Bearer ${agentToken}`);
        assert.strictEqual(r.status, 403);
    });

    await test('GET /api/conversations/:id/stats returns stats shape (admin)', async () => {
        const r = await req.get(`/api/conversations/${createdConversationId}/stats`)
            .set('Authorization', `Bearer ${adminToken}`);
        assert.strictEqual(r.status, 200);
        assert(typeof r.body.messageCount === 'number');
        assert(typeof r.body.outgoingCount === 'number');
        assert(typeof r.body.unreadCount === 'number');
        assert(Array.isArray(r.body.responders));
    });

    await test('Agent cannot read stats of unassigned conversation (403)', async () => {
        const r = await req.get(`/api/conversations/${createdConversationId}/stats`)
            .set('Authorization', `Bearer ${agentToken}`);
        assert.strictEqual(r.status, 403);
    });

    await test('PATCH /api/conversations/:id archive works for main admin', async () => {
        const r = await req.patch(`/api/conversations/${createdConversationId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'archived' });
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body.status, 'archived');
    });

    await test('POST /api/conversations/:id/send to archived conversation returns 400', async () => {
        const r = await req.post(`/api/conversations/${createdConversationId}/send`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ content: 'after archive' });
        assert.strictEqual(r.status, 400);
    });

    await test('GET /api/conversations?status=archived includes archived conversation', async () => {
        const r = await req.get('/api/conversations?status=archived&limit=50')
            .set('Authorization', `Bearer ${adminToken}`);
        assert.strictEqual(r.status, 200);
        assert(Array.isArray(r.body.data));
        assert(r.body.data.some(c => c.id === createdConversationId), 'Archived conversation should be in archived list');
    });

    await test('Prepare a second conversation for filters', async () => {
        const customerRes = await req.post('/api/customers')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Filter Test Customer', phone: '09009998877', status: 'active' });
        assert.strictEqual(customerRes.status, 201, `customer create failed: ${JSON.stringify(customerRes.body)}`);

        const convRes = await req.post('/api/conversations')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ customerId: customerRes.body.id });
        assert.strictEqual(convRes.status, 201, `conversation create failed: ${JSON.stringify(convRes.body)}`);
        filterConversationId = convRes.body.id;
        assert(filterConversationId, 'Expected filter conversation id');
    });

    await test('GET /api/conversations?unassigned=true returns only unassigned conversations', async () => {
        const assignRes = await req.patch(`/api/conversations/${filterConversationId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ assignedTo: null, departmentId: null, status: 'open' });
        assert.strictEqual(assignRes.status, 200);

        const r = await req.get('/api/conversations?unassigned=true&limit=50')
            .set('Authorization', `Bearer ${adminToken}`);
        assert.strictEqual(r.status, 200);
        assert(Array.isArray(r.body.data));
        assert(r.body.data.length > 0, 'Expected at least one unassigned conversation');
        assert(r.body.data.some(c => c.id === filterConversationId), 'Prepared unassigned conversation should be present');
        assert(r.body.data.every(c => !c.assignedTo && !c.departmentId), 'All results must be unassigned and without department');
    });

    await test('GET /api/conversations?assignedTo=<agent> for agent returns own conversations only', async () => {
        const assignRes = await req.patch(`/api/conversations/${filterConversationId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ assignedTo: createdUserId, status: 'open' });
        assert.strictEqual(assignRes.status, 200);

        const r = await req.get(`/api/conversations?assignedTo=${createdUserId}&limit=50`)
            .set('Authorization', `Bearer ${agentToken}`);
        assert.strictEqual(r.status, 200);
        assert(Array.isArray(r.body.data));
        assert(r.body.data.length > 0, 'Agent should see assigned conversation');
        assert(r.body.data.every(c => c.assignedTo === createdUserId), 'Agent result should be limited to own assignments');
    });

    await test('GET /api/conversations?unread=true includes conversation with unreadCount > 0', async () => {
        const { Conversation } = require('../models');
        const conv = await Conversation.findByPk(filterConversationId);
        assert(conv, 'Prepared conversation not found');
        await conv.update({ unreadCount: 2, status: 'open' });

        const r = await req.get('/api/conversations?unread=true&limit=50')
            .set('Authorization', `Bearer ${adminToken}`);
        assert.strictEqual(r.status, 200);
        assert(Array.isArray(r.body.data));
        assert(r.body.data.some(c => c.id === filterConversationId), 'Unread conversation should appear in unread filter');
        assert(r.body.data.every(c => (c.unreadCount || 0) > 0), 'Unread filter should only include unread conversations');
    });

    await test('GET /api/conversations?isGroup=true includes conversations with metadata.isGroup', async () => {
        const { Conversation } = require('../models');
        const conv = await Conversation.findByPk(filterConversationId);
        assert(conv, 'Prepared conversation not found');
        await conv.update({ metadata: { ...(conv.metadata || {}), isGroup: true, groupName: 'Test Group' } });

        const r = await req.get('/api/conversations?isGroup=true&limit=50')
            .set('Authorization', `Bearer ${adminToken}`);
        assert.strictEqual(r.status, 200);
        assert(Array.isArray(r.body.data));
        assert(r.body.data.some(c => c.id === filterConversationId), 'Group conversation should appear in group filter');
    });

    // ── Security: Auth Boundaries ────────────────────────────────────────────
    section('Security — Auth Boundaries');

    await test('Agent cannot create users (403)', async () => {
        const r = await req.post('/api/users')
            .set('Authorization', `Bearer ${agentToken}`)
            .send({ name: 'Unauthorized', email: 'unauth@test.com', password: 'Test@123!' });
        assert.strictEqual(r.status, 403);
    });

    await test('Agent cannot delete customers (403)', async () => {
        const r = await req.delete(`/api/customers/${createdCustomerId}`)
            .set('Authorization', `Bearer ${agentToken}`);
        assert.strictEqual(r.status, 403);
    });

    await test('All main routes require auth (401 without token)', async () => {
        const routes = ['/api/users', '/api/customers', '/api/conversations'];
        for (const route of routes) {
            const r = await req.get(route);
            assert.strictEqual(r.status, 401, `Expected 401 for ${route}, got ${r.status}`);
        }
    });

    // ── Security: UUID Injection ─────────────────────────────────────────────
    section('Security — UUID Injection');

    await test("GET /api/users/'; DROP TABLE-- returns 400", async () => {
        const r = await req.get("/api/users/'; DROP TABLE Users; --")
            .set('Authorization', `Bearer ${adminToken}`);
        assert([400, 404].includes(r.status));
    });

    await test('GET /api/customers/12345 returns 400', async () => {
        const r = await req.get('/api/customers/12345')
            .set('Authorization', `Bearer ${adminToken}`);
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

    await test('isMainAdmin returns false for null/empty user', async () => {
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

    await test('parsePagination handles invalid inputs gracefully', async () => {
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

    await test('validatePassword accepts passwords with letter and digit (no special char required)', async () => {
        const { validatePassword } = require('../lib/passwordValidation');
        assert.strictEqual(validatePassword('Password123').valid, true);
    });

    await test('validatePassword accepts strong passwords', async () => {
        const { validatePassword } = require('../lib/passwordValidation');
        assert.strictEqual(validatePassword('StrongPass@123').valid, true);
    });

    // ── Customers: Delete ────────────────────────────────────────────────────
    section('Customers — Delete');

    await test('DELETE /api/customers/:id soft-deletes without wiping messages', async () => {
        const { Message, Conversation, Customer } = require('../models');
        const uniquePhone = '0900' + String(Date.now()).slice(-7);
        const cr = await req.post('/api/customers')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Soft Del Msg', phone: uniquePhone, status: 'active' });
        assert.strictEqual(cr.status, 201, JSON.stringify(cr.body));
        const cid = cr.body.id;
        const conv = await Conversation.create({
            customerId: cid,
            status: 'open',
            priority: 'normal',
            source: 'whatsapp',
        });
        await Message.create({
            conversationId: conv.id,
            customerId: cid,
            content: 'must survive soft delete',
            direction: 'incoming',
            timestamp: new Date(),
        });
        const dr = await req.delete(`/api/customers/${cid}`)
            .set('Authorization', `Bearer ${adminToken}`);
        assert.strictEqual(dr.status, 200, JSON.stringify(dr.body));
        assert.strictEqual(dr.body.messagesPreserved, true);
        const msgCount = await Message.count({ where: { customerId: cid } });
        assert.strictEqual(msgCount, 1, 'messages must remain after soft delete');
        const cust = await Customer.findByPk(cid);
        assert(cust, 'customer row must remain');
        assert.strictEqual(cust.status, 'inactive');
        assert(cust.customFields && cust.customFields.softDeletedAt, 'softDeletedAt flag expected');
    });

    await test('DELETE /api/customers/:id succeeds when customer has documents and tags', async () => {
        const { CustomerDocument, Tag, Customer } = require('../models');
        const cr = await req.post('/api/customers')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Delete FK Test', phone: '09001112233', status: 'active' });
        assert.strictEqual(cr.status, 201, `create: ${JSON.stringify(cr.body)}`);
        const cid = cr.body.id;
        const tag = await Tag.findOne();
        if (tag) {
            const cust = await Customer.findByPk(cid);
            await cust.setTags([tag.id]);
        }
        await CustomerDocument.create({
            customerId: cid,
            category: 'other',
            title: 'doc',
            filePath: 'uploads/customers/_test/dummy.txt',
            fileName: 'dummy.txt',
            fileType: 'document',
            source: 'manual'
        });
        const dr = await req.delete(`/api/customers/${cid}`)
            .set('Authorization', `Bearer ${adminToken}`);
        assert.strictEqual(dr.status, 200, `delete: ${JSON.stringify(dr.body)}`);
    });

    await test('DELETE /api/customers/:id with invalid UUID returns 400', async () => {
        const r = await req.delete('/api/customers/bad-id')
            .set('Authorization', `Bearer ${adminToken}`);
        assert.strictEqual(r.status, 400);
    });

    await test('DELETE /api/customers/:id deletes customer', async () => {
        const r = await req.delete(`/api/customers/${createdCustomerId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        assert.strictEqual(r.status, 200);
    });

    await test('GET /api/customers/:id after delete returns 404', async () => {
        const r = await req.get(`/api/customers/${createdCustomerId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        assert.strictEqual(r.status, 404);
    });

    // ── Users: Deactivate ────────────────────────────────────────────────────
    section('Users — Deactivate');

    await test('delete-with-transfer without transferToUserId returns 400', async () => {
        const r = await req.post(`/api/users/${createdUserId}/delete-with-transfer`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({});
        assert.strictEqual(r.status, 400);
    });

    await test('delete-with-transfer with invalid UUID returns 400', async () => {
        const r = await req.post('/api/users/bad-id/delete-with-transfer')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ transferToUserId: createdUserId });
        assert.strictEqual(r.status, 400);
    });

    section('Staff supervision — canSuperviseStaff');
    const { canSuperviseStaff } = require('../lib/staffSupervision');
    const deptA = '11111111-1111-4111-8111-111111111111';
    const deptB = '22222222-2222-4222-8222-222222222222';

    await test('owner can supervise agent in any department', async () => {
        assert.strictEqual(canSuperviseStaff(
            { id: '1', role: 'owner' },
            { id: '2', role: 'agent', departmentId: deptB, isActive: true }
        ), true);
    });

    await test('manager supervises agent in same department only', async () => {
        assert.strictEqual(canSuperviseStaff(
            { id: '1', role: 'manager', departmentId: deptA },
            { id: '2', role: 'agent', departmentId: deptA, isActive: true }
        ), true);
        assert.strictEqual(canSuperviseStaff(
            { id: '1', role: 'manager', departmentId: deptA },
            { id: '2', role: 'agent', departmentId: deptB, isActive: true }
        ), false);
    });

    await test('supervisor cannot supervise manager or peer supervisor', async () => {
        assert.strictEqual(canSuperviseStaff(
            { id: '1', role: 'supervisor', departmentId: deptA },
            { id: '2', role: 'manager', departmentId: deptA, isActive: true }
        ), false);
        assert.strictEqual(canSuperviseStaff(
            { id: '1', role: 'supervisor', departmentId: deptA },
            { id: '2', role: 'agent', departmentId: deptA, isActive: true }
        ), true);
    });

    await test('agent cannot supervise anyone', async () => {
        assert.strictEqual(canSuperviseStaff(
            { id: '1', role: 'agent', departmentId: deptA },
            { id: '2', role: 'agent', departmentId: deptA, isActive: true }
        ), false);
    });

    section('Legacy cutover visibility');

    await test('chatIdVariants and normalizeLinkedNumber', async () => {
        const { chatIdVariants, normalizeLinkedNumber } = require('../services/legacyCrmLockdown');
        const v = chatIdVariants('905551112233@c.us');
        assert(v.includes('905551112233'));
        assert(v.includes('905551112233@c.us'));
        assert.strictEqual(normalizeLinkedNumber('+90 555 111 22 33'), '905551112233');
    });

    await test('restricted customer conversation is denied to assigned agent', async () => {
        const { canAccessConversation } = require('../lib/conversationAccess');
        const agent = { role: 'agent', departmentId: 'd1' };
        const conv = {
            id: 'c1',
            customerId: 'cust1',
            assignedTo: 'u1',
            departmentId: 'd1',
            isHiddenFromStaff: false,
            customer: { isRestrictedFromStaff: true },
        };
        assert.strictEqual(canAccessConversation(agent, 'u1', conv, null), false);
        const grants = { customerIds: new Set(['cust1']), conversationIds: new Set() };
        assert.strictEqual(canAccessConversation(agent, 'u1', conv, grants), true);
    });

    await test('timestamp chat uploads require auth', async () => {
        const { isSensitiveUploadPath } = require('../middleware/protectedUploads');
        assert.strictEqual(isSensitiveUploadPath('/1712345678901-voice.ogg'), true);
        assert.strictEqual(isSensitiveUploadPath('/customers/x.jpg'), true);
        assert.strictEqual(isSensitiveUploadPath('/branding/logo.png'), false);
    });

    await test('hidden conversations are excluded from default All list', async () => {
        const { Conversation } = require('../models');
        const conv = await Conversation.findByPk(filterConversationId);
        assert(conv, 'filter conversation missing');
        await conv.update({ isHiddenFromStaff: true, status: 'archived' });
        const all = await req.get('/api/conversations?limit=50')
            .set('Authorization', `Bearer ${adminToken}`);
        assert.strictEqual(all.status, 200);
        assert(!all.body.data.some((c) => c.id === filterConversationId), 'hidden conv must not appear in All');
        const hidden = await req.get('/api/conversations?hiddenOnly=true&limit=50')
            .set('Authorization', `Bearer ${adminToken}`);
        assert.strictEqual(hidden.status, 200);
        assert(hidden.body.data.some((c) => c.id === filterConversationId), 'hidden conv should appear in restricted tab');
    });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('🚀 Loading server (in-process)...\n');

    const serverModule = require('../server');
    req = supertest(serverModule.app);

    // Wait for DB init and admin user creation
    await serverModule.ready;

    try {
        await runTests();
    } finally {
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
    console.error('Fatal:', err.message, err.stack);
    process.exit(1);
});

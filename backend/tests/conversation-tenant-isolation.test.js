/**
 * Unit tests — مرز سازمان (tenant) در دسترسی مکالمه و roomهای سوکت
 * @file    backend/tests/conversation-tenant-isolation.test.js
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * اجرا: node tests/conversation-tenant-isolation.test.js  (بدون DB / HTTP)
 */
'use strict';

const assert = require('assert');
const {
    sameTenant,
    tenantRoom,
    isPlatformTenantId,
    setPlatformTenantCache,
} = require('../lib/tenantContext');
const { canAccessConversation } = require('../lib/conversationAccess');

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

console.log('conversation tenant isolation unit tests\n');

const PLATFORM_ID = '00000000-0000-4000-8000-000000000001';
const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';

setPlatformTenantCache({ id: PLATFORM_ID, slug: 'platform', isPlatform: true });

test('null and platform id are both the platform tenant', () => {
    assert.strictEqual(isPlatformTenantId(null), true);
    assert.strictEqual(isPlatformTenantId(undefined), true);
    assert.strictEqual(isPlatformTenantId(PLATFORM_ID), true);
    assert.strictEqual(isPlatformTenantId(TENANT_A), false);
});

test('sameTenant: legacy null rows stay visible to platform users', () => {
    assert.strictEqual(sameTenant(null, null), true);
    assert.strictEqual(sameTenant(PLATFORM_ID, null), true);
    assert.strictEqual(sameTenant(null, PLATFORM_ID), true);
    assert.strictEqual(sameTenant(TENANT_A, TENANT_A), true);
});

test('sameTenant: different self-serve tenants never match', () => {
    assert.strictEqual(sameTenant(TENANT_A, TENANT_B), false);
    assert.strictEqual(sameTenant(TENANT_A, null), false);
    assert.strictEqual(sameTenant(null, TENANT_B), false);
    assert.strictEqual(sameTenant(PLATFORM_ID, TENANT_B), false);
});

test('tenantRoom: platform and legacy share one room; tenants get their own', () => {
    assert.strictEqual(tenantRoom(null), 'tenant_platform');
    assert.strictEqual(tenantRoom(PLATFORM_ID), 'tenant_platform');
    assert.strictEqual(tenantRoom(TENANT_A), 'tenant_' + TENANT_A);
    assert.notStrictEqual(tenantRoom(TENANT_A), tenantRoom(TENANT_B));
});

const liveConvA = { id: 'c1', tenantId: TENANT_A, status: 'open', assignedTo: null, departmentId: null };

test('agent of tenant B cannot access live inbox conversation of tenant A', () => {
    const agentB = { role: 'agent', tenantId: TENANT_B, permissions: {} };
    assert.strictEqual(canAccessConversation(agentB, 'uB', liveConvA, null), false);
});

test('owner/admin of tenant B cannot access conversation of tenant A', () => {
    const ownerB = { role: 'owner', tenantId: TENANT_B, permissions: {} };
    const adminB = { role: 'admin', tenantId: TENANT_B, permissions: {} };
    assert.strictEqual(canAccessConversation(ownerB, 'oB', liveConvA, null), false);
    assert.strictEqual(canAccessConversation(adminB, 'aB', liveConvA, null), false);
});

test('platform staff cannot access self-serve tenant conversation', () => {
    const platformAdmin = { role: 'admin', tenantId: PLATFORM_ID, permissions: {} };
    const legacyAdmin = { role: 'admin', tenantId: null, permissions: {} };
    assert.strictEqual(canAccessConversation(platformAdmin, 'p1', liveConvA, null), false);
    assert.strictEqual(canAccessConversation(legacyAdmin, 'p2', liveConvA, null), false);
});

test('same-tenant agent keeps shared live inbox access', () => {
    const agentA = { role: 'agent', tenantId: TENANT_A, permissions: {} };
    assert.strictEqual(canAccessConversation(agentA, 'uA', liveConvA, null), true);
});

test('legacy platform conversation (tenantId null) stays open to platform agent', () => {
    const legacyConv = { id: 'c2', tenantId: null, status: 'open', assignedTo: null, departmentId: null };
    const platformAgent = { role: 'agent', tenantId: PLATFORM_ID, permissions: {} };
    const legacyAgent = { role: 'agent', tenantId: null, permissions: {} };
    assert.strictEqual(canAccessConversation(platformAgent, 'u1', legacyConv, null), true);
    assert.strictEqual(canAccessConversation(legacyAgent, 'u2', legacyConv, null), true);
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

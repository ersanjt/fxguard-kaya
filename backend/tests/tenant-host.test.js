/**
 * Unit tests for self-serve tenant host / slug / trial helpers
 */
'use strict';

const assert = require('assert');
const {
    normalizeSlug,
    slugError,
    isReservedSlug,
    parseTenantSlugFromHost,
    isSelfServeEnabled,
    isKayaStaffHost,
    isSelfServeStaffOrigin,
    panelKeyForSlug,
    tenantLoginUrl,
    publicSelfServeConfig,
    tenantBaseHost,
} = require('../lib/tenantHost');
const {
    trialEndsAtFromNow,
    tenantAccessState,
    isTrialGateExemptPath,
    publicTenantPayload,
} = require('../lib/tenantTrial');

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

console.log('tenant host / trial unit tests\n');

test('slug normalize and reserved', () => {
    assert.strictEqual(normalizeSlug('Acme-Desk'), 'acme-desk');
    assert.ok(slugError('ab'));
    assert.ok(slugError('kaya'));
    assert.ok(isReservedSlug('login'));
    assert.strictEqual(slugError('acme'), null);
    assert.strictEqual(panelKeyForSlug('acme'), 't-acme');
    assert.strictEqual(panelKeyForSlug('platform'), 'default');
});

test('host parse: apex app is platform, subdomain is slug', () => {
    const env = { TENANT_BASE_HOST: 'app.fxguard.io' };
    const apex = parseTenantSlugFromHost('app.fxguard.io', env);
    assert.strictEqual(apex.kind, 'platform');
    const sub = parseTenantSlugFromHost('acme.app.fxguard.io', env);
    assert.strictEqual(sub.kind, 'subdomain');
    assert.strictEqual(sub.slug, 'acme');
    const kaya = parseTenantSlugFromHost('kaya.fxguard.io', env);
    assert.strictEqual(kaya.kind, 'platform');
    const custom = parseTenantSlugFromHost('crm.example.com', env);
    assert.strictEqual(custom.kind, 'custom');
});

test('self-serve flag off on Kaya even if env is on', () => {
    const env = { SELF_SERVE_SIGNUP: 'true' };
    assert.strictEqual(isSelfServeEnabled(env, 'app.fxguard.io'), true);
    assert.strictEqual(isSelfServeEnabled(env, 'kaya.fxguard.io'), false);
    assert.strictEqual(isKayaStaffHost('staff.kaya.fxguard.io'), true);
    assert.strictEqual(isSelfServeEnabled({ SELF_SERVE_SIGNUP: '0' }, 'app.fxguard.io'), false);
});

test('CORS helper allows tenant subdomains of app host', () => {
    const env = { TENANT_BASE_HOST: 'app.fxguard.io' };
    assert.strictEqual(isSelfServeStaffOrigin('https://acme.app.fxguard.io', env), true);
    assert.strictEqual(isSelfServeStaffOrigin('https://app.fxguard.io', env), true);
    assert.strictEqual(isSelfServeStaffOrigin('https://evil.com', env), false);
});

test('login URL and public config', () => {
    const env = { TENANT_BASE_HOST: 'app.fxguard.io', SELF_SERVE_SIGNUP: '1', TENANT_TRIAL_DAYS: '7' };
    assert.strictEqual(tenantLoginUrl('acme', env, 'https'), 'https://app.fxguard.io/login?panel=acme');
    assert.strictEqual(
        tenantLoginUrl('acme', Object.assign({}, env, { TENANT_WILDCARD_DNS: 'true' }), 'https'),
        'https://acme.app.fxguard.io/login'
    );
    assert.strictEqual(tenantBaseHost(env), 'app.fxguard.io');
    const cfg = publicSelfServeConfig(env, 'app.fxguard.io');
    assert.strictEqual(cfg.enabled, true);
    assert.strictEqual(cfg.trialDays, 7);
    assert.strictEqual(cfg.signupPath, '/signup');
    assert.strictEqual(cfg.wildcardDns, false);
});

test('trial lock after end; platform never locked', () => {
    const now = new Date('2026-09-08T12:00:00Z');
    const ended = trialEndsAtFromNow(7, new Date('2026-08-01T00:00:00Z'));
    const expired = tenantAccessState(
        { isPlatform: false, status: 'trial', trialEndsAt: ended },
        now
    );
    assert.strictEqual(expired.ok, false);
    assert.strictEqual(expired.code, 'TRIAL_EXPIRED');
    const active = tenantAccessState({ isPlatform: false, status: 'active' }, now);
    assert.strictEqual(active.ok, true);
    const platform = tenantAccessState({ isPlatform: true, status: 'trial' }, now);
    assert.strictEqual(platform.ok, true);
    assert.strictEqual(isTrialGateExemptPath('POST', '/api/auth/login'), true);
    assert.strictEqual(isTrialGateExemptPath('GET', '/api/customers'), false);
    assert.strictEqual(isTrialGateExemptPath('POST', '/api/billing/checkout'), true);
    assert.strictEqual(isTrialGateExemptPath('GET', '/api/tenants/me'), true);
    const payload = publicTenantPayload({
        id: 't1',
        slug: 'acme',
        name: 'Acme',
        isPlatform: false,
        status: 'trial',
        trialEndsAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        planTier: 'start',
    }, now);
    assert.ok(payload);
    assert.strictEqual(payload.locked, false);
    assert.strictEqual(payload.remainingDays, 3);
    assert.strictEqual(publicTenantPayload({ isPlatform: true, id: 'p' }, now), null);
});

test('self-serve apex hides copied Kaya brand; tenant desks keep theirs', () => {
    const { overlaySelfServePlatformBranding, FXGUARD_LOGO } = require('../lib/selfServeBranding');
    const env = { SELF_SERVE_SIGNUP: 'true', TENANT_BASE_HOST: 'app.fxguard.io' };
    const kayaCopy = {
        siteName: 'KAYA HOLDING',
        logoUrl: '/brand/kaya-logo.png',
        loginLogoUrl: '/brand/kaya-logo.png',
        faviconUrl: '/brand/kaya-favicon-32.png',
        loginTitle: 'ورود | KAYA',
        pageTitle: 'ورود | KAYA',
    };
    const apex = overlaySelfServePlatformBranding(kayaCopy, { host: 'app.fxguard.io', env });
    assert.strictEqual(apex.siteName, 'FXGuard');
    assert.strictEqual(apex.logoUrl, FXGUARD_LOGO);
    assert.strictEqual(apex.loginLogoUrl, FXGUARD_LOGO);
    const tenant = overlaySelfServePlatformBranding(kayaCopy, { host: 'acme.app.fxguard.io', env });
    assert.strictEqual(tenant.siteName, 'KAYA HOLDING');
    assert.strictEqual(tenant.logoUrl, '/brand/kaya-logo.png');
    const kayaHost = overlaySelfServePlatformBranding(kayaCopy, {
        host: 'kaya.fxguard.io',
        env,
    });
    assert.strictEqual(kayaHost.siteName, 'KAYA HOLDING');
    const customFx = overlaySelfServePlatformBranding(
        { siteName: 'FXGuard', logoUrl: '/uploads/fx.png' },
        { host: 'app.fxguard.io', env }
    );
    assert.strictEqual(customFx.logoUrl, '/uploads/fx.png');
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

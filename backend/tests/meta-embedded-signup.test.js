/**
 * Kaya CRM — تست منطق Meta Embedded Signup
 * @file    backend/tests/meta-embedded-signup.test.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/META-TECH-PROVIDER-PLAN-FA.md
 */
'use strict';

const assert = require('assert');
const path = require('path');

const es = require(path.join(__dirname, '..', 'lib', 'metaEmbeddedSignup'));

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

function withEnv(map, fn) {
    const prev = {};
    for (const k of Object.keys(map)) {
        prev[k] = process.env[k];
        if (map[k] == null) delete process.env[k];
        else process.env[k] = map[k];
    }
    return Promise.resolve()
        .then(fn)
        .finally(() => {
            for (const k of Object.keys(map)) {
                if (prev[k] === undefined) delete process.env[k];
                else process.env[k] = prev[k];
            }
        });
}

async function main() {
    console.log('meta embedded signup tests\n');

    await test('config disabled when env missing', async () => {
        await withEnv(
            {
                META_APP_ID: null,
                META_APP_SECRET: null,
                META_EMBEDDED_SIGNUP_CONFIG_ID: null,
                WHATSAPP_CLOUD_APP_SECRET: null,
                FACEBOOK_APP_ID: null,
            },
            async () => {
                assert.strictEqual(es.isEmbeddedSignupConfigured(), false);
                const pub = es.getPublicEmbeddedSignupConfig();
                assert.strictEqual(pub.enabled, false);
                assert.strictEqual(pub.reason, 'missing_meta_env');
                assert.strictEqual(pub.appId, '');
                assert.strictEqual(pub.configId, '');
            }
        );
    });

    await test('config enabled when Meta env set', async () => {
        await withEnv(
            {
                META_APP_ID: '111',
                META_APP_SECRET: 'secret',
                META_EMBEDDED_SIGNUP_CONFIG_ID: 'cfg-9',
                BACKEND_PUBLIC_URL: 'https://app.fxguard.io',
            },
            async () => {
                assert.strictEqual(es.isEmbeddedSignupConfigured(), true);
                const pub = es.getPublicEmbeddedSignupConfig();
                assert.strictEqual(pub.enabled, true);
                assert.strictEqual(pub.appId, '111');
                assert.strictEqual(pub.configId, 'cfg-9');
                assert.strictEqual(pub.partnerType, 'tech_provider');
                assert.strictEqual(
                    pub.webhookCallbackUrl,
                    'https://app.fxguard.io/api/webhook/whatsapp-cloud'
                );
                assert.ok(!Object.prototype.hasOwnProperty.call(pub, 'appSecret'));
            }
        );
    });

    await test('parseCompletePayload validates ids', async () => {
        assert.throws(
            () => es.parseCompletePayload({}),
            (e) => e.code === 'ES_CODE_REQUIRED'
        );
        assert.throws(
            () => es.parseCompletePayload({ code: 'abc', wabaId: 'bad', phoneNumberId: '123456' }),
            (e) => e.code === 'ES_WABA_INVALID'
        );
        const ok = es.parseCompletePayload({
            code: 'oauth-code',
            waba_id: '1234567890',
            phone_number_id: '9876543210',
            display_phone_number: '+905551112233',
        });
        assert.strictEqual(ok.wabaId, '1234567890');
        assert.strictEqual(ok.phoneNumberId, '9876543210');
        assert.strictEqual(ok.displayPhone, '+905551112233');
    });

    await test('exchangeCodeForBusinessToken uses injected httpGet', async () => {
        await withEnv(
            {
                META_APP_ID: '111',
                META_APP_SECRET: 'secret',
                META_EMBEDDED_SIGNUP_CONFIG_ID: 'cfg-9',
            },
            async () => {
                const token = await es.exchangeCodeForBusinessToken('the-code', {
                    httpGet: async (url, config) => {
                        assert.ok(String(url).includes('/oauth/access_token'));
                        assert.strictEqual(config.params.code, 'the-code');
                        assert.strictEqual(config.params.client_id, '111');
                        return {
                            status: 200,
                            data: { access_token: 'EAA_TEST_TOKEN', expires_in: 3600 },
                        };
                    },
                });
                assert.strictEqual(token.accessToken, 'EAA_TEST_TOKEN');
                assert.strictEqual(token.expiresIn, 3600);
            }
        );
    });

    await test('overview exposes embeddedSignup public config', async () => {
        await withEnv(
            {
                META_APP_ID: '111',
                META_APP_SECRET: 'secret',
                META_EMBEDDED_SIGNUP_CONFIG_ID: 'cfg-9',
                BACKEND_PUBLIC_URL: 'https://app.fxguard.io',
            },
            async () => {
                const { buildWhatsappOverview } = require('../lib/whatsappOverview');
                const overview = await buildWhatsappOverview({
                    get: () => '',
                    protocol: 'https',
                    tenant: null,
                });
                assert.ok(overview.embeddedSignup);
                assert.strictEqual(overview.embeddedSignup.enabled, true);
                assert.strictEqual(overview.embeddedSignup.configId, 'cfg-9');
                assert.ok(Array.isArray(overview.channels.cloud.checks));
                assert.ok(overview.channels.cloud.checks.some((c) => c.id === 'embeddedSignup'));
            }
        );
    });

    await test('completeEmbeddedSignupFlow exchanges + subscribes', async () => {
        await withEnv(
            {
                META_APP_ID: '111',
                META_APP_SECRET: 'secret',
                META_EMBEDDED_SIGNUP_CONFIG_ID: 'cfg-9',
            },
            async () => {
                let subscribedUrl = '';
                const result = await es.completeEmbeddedSignupFlow(
                    {
                        code: 'c1',
                        wabaId: '100200300',
                        phoneNumberId: '400500600',
                    },
                    {
                        httpGet: async () => ({
                            status: 200,
                            data: { access_token: 'EAA_FLOW' },
                        }),
                        httpPost: async (url) => {
                            subscribedUrl = url;
                            return { status: 200, data: { success: true } };
                        },
                    }
                );
                assert.strictEqual(result.accessToken, 'EAA_FLOW');
                assert.strictEqual(result.wabaId, '100200300');
                assert.strictEqual(result.phoneNumberId, '400500600');
                assert.strictEqual(result.subscribed, true);
                assert.strictEqual(result.registered, false);
                assert.ok(String(subscribedUrl).includes('/100200300/subscribed_apps'));
            }
        );
    });

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

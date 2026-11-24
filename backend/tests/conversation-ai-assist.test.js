/**
 * Kaya CRM — reviewed AI pilot integration and privacy boundaries (synthetic data)
 * @file backend/tests/conversation-ai-assist.test.js
 * @layer backend
 * @owner Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see docs/CODEBASE-MAP.md
 */
'use strict';

Object.assign(process.env, {
    NODE_ENV: 'test',
    USE_SQLITE: 'true',
    PORT: '3197',
    JWT_SECRET: 'test-jwt-secret-32-chars-minimum!!',
    ENCRYPT_SECRET: 'test-encrypt-secret-32-chars-min!',
    MAIN_ADMIN_EMAIL: 'admin@test.com',
    MAIN_ADMIN_PASSWORD: 'Admin@Test123!',
    DISABLE_RATE_LIMIT: 'true',
    SELF_SERVE_SIGNUP: 'true',
    TENANT_BASE_HOST: 'app.fxguard.io',
    SELF_SERVE_PUBLIC_PROTO: 'http',
    AI_ASSISTANT_PILOT_ENABLED: 'true',
    OPENAI_API_KEY: 'sk-test-platform-key-must-not-be-used',
    AI_ASSISTANT_PILOT_PANELS: 'default,t-ai-pilot-a,t-ai-pilot-b',
});
delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
delete process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
const assert = require('assert');
const supertest = require('supertest');
const axios = require('axios');
const requests = [];
const originalPost = axios.post;
axios.post = async (url, body, options) => {
    assert.strictEqual(
        url,
        'https://api.openai.com/v1/chat/completions',
        'unexpected network destination'
    );
    requests.push({ body, options });
    return {
        data: { choices: [{ message: { content: 'پیش‌نویس آزمایشی برای بازبینی کارمند' } }] },
    };
};

let passed = 0;
async function test(name, fn) {
    await fn();
    passed++;
    console.log('  ✓ ' + name);
}

async function main() {
    const server = require('../server');
    const req = supertest(server.app);
    await server.ready;
    const models = require('../models');
    const { runWithTenant } = require('../lib/tenantContext');
    const { prepareTranscript, redactText } = require('../services/conversationAiAssist');
    const { isAIAnswerEnabled } = require('../services/aiResponseService');

    async function company(slug) {
        const signup = await req
            .post('/api/tenants/signup')
            .set('Host', 'app.fxguard.io')
            .send({
                slug,
                companyName: slug,
                email: 'owner@' + slug + '.test',
                password: 'Secret123',
                industry: 'retail',
            });
        assert.strictEqual(signup.status, 201, JSON.stringify(signup.body));
        const login = await req
            .post('/api/auth/login')
            .set('Host', slug + '.app.fxguard.io')
            .send({ email: 'owner@' + slug + '.test', password: 'Secret123' });
        assert.strictEqual(login.status, 200, JSON.stringify(login.body));
        const tenant = await models.Tenant.findOne({ where: { slug } });
        const wrap = (r) =>
            r
                .set('Host', slug + '.app.fxguard.io')
                .set('Cookie', login.headers['set-cookie'] || '')
                .set('Authorization', login.body.token ? 'Bearer ' + login.body.token : '');
        return {
            tenant,
            get: (url) => wrap(req.get(url)),
            post: (url, body) => wrap(req.post(url)).send(body || {}),
        };
    }

    const a = await company('ai-pilot-a');
    const b = await company('ai-pilot-b');
    const key = 'sk-test-organization-a-only-00001';
    let conversation;
    await runWithTenant(a.tenant, async () => {
        await models.WhatsappConfig.update(
            { openaiApiKey: key },
            { where: { id: a.tenant.panelKey } }
        );
        const customer = await models.Customer.create({
            name: 'Synthetic customer',
            phone: '905550000011',
        });
        conversation = await models.Conversation.create({
            customerId: customer.id,
            status: 'open',
        });
        for (let i = 0; i < 35; i++) {
            await models.Message.create({
                conversationId: conversation.id,
                customerId: customer.id,
                direction: 'incoming',
                content: 'Synthetic message ' + i + ' test.person@example.test +90 555 123 4567',
                timestamp: new Date(1700000000000 + i * 1000),
            });
        }
    });
    const path = '/api/conversations/' + conversation.id + '/ai-assist';
    const countsBefore = await models.Message.count();

    await test('unauthenticated generation is rejected before provider access', async () => {
        assert.strictEqual(
            (await req.post(path).set('Host', 'ai-pilot-a.app.fxguard.io').send({ kind: 'reply' }))
                .status,
            401
        );
        assert.strictEqual(requests.length, 0);
    });
    await test('status does not expose keys and does not spend a model request', async () => {
        const result = await a.get('/api/conversations/ai-assist/status');
        assert.strictEqual(result.status, 200);
        assert.strictEqual(result.body.configured, true);
        assert.strictEqual(JSON.stringify(result.body).includes(key), false);
        assert.strictEqual(requests.length, 0);
    });
    await test('tenant B cannot read or generate from tenant A even as owner', async () => {
        const r = await b.post(path, { kind: 'summary' });
        assert.ok([403, 404].includes(r.status), JSON.stringify(r.body));
        assert.strictEqual(requests.length, 0);
    });
    await test('invalid kinds and IDs are rejected without a model call', async () => {
        assert.strictEqual((await a.post(path, { kind: 'send' })).status, 400);
        assert.strictEqual(
            (await a.post('/api/conversations/not-a-uuid/ai-assist', { kind: 'reply' })).status,
            400
        );
        assert.strictEqual(requests.length, 0);
    });
    await test('draft uses only latest scoped messages, strips identifiers and never sends', async () => {
        const r = await a.post(path, { kind: 'reply', language: 'tr' });
        assert.strictEqual(r.status, 200, JSON.stringify(r.body));
        assert.strictEqual(r.body.requiresReview, true);
        assert.strictEqual(r.body.sourceMessageCount, 30);
        assert.strictEqual(r.body.conversationId, conversation.id);
        assert.strictEqual(requests[0].options.headers.Authorization, 'Bearer ' + key);
        const transcript = JSON.parse(requests[0].body.messages[1].content);
        assert.ok(transcript[0].text.startsWith('Synthetic message 5 '));
        assert.ok(transcript[29].text.startsWith('Synthetic message 34 '));
        assert.strictEqual(JSON.stringify(transcript).includes('test.person@'), false);
        assert.strictEqual(JSON.stringify(transcript).includes('555 123'), false);
        assert.strictEqual(await models.Message.count(), countsBefore);
    });
    await test('summary is employee-reviewed and has no outbound side effects', async () => {
        const r = await a.post(path, { kind: 'summary', language: 'fa' });
        assert.strictEqual(r.status, 200, JSON.stringify(r.body));
        assert.strictEqual(r.body.kind, 'summary');
        assert.strictEqual(r.body.requiresReview, true);
        assert.ok(requests[1].body.messages[0].content.includes('INTERNAL summary'));
        assert.strictEqual(await models.Message.count(), countsBefore);
    });
    await test('self-serve tenant without a key never borrows platform credentials', async () => {
        const status = await b.get('/api/conversations/ai-assist/status');
        assert.strictEqual(status.body.configured, false);
        await runWithTenant(a.tenant, () =>
            models.WhatsappConfig.update(
                { openaiApiKey: null },
                { where: { id: a.tenant.panelKey } }
            )
        );
        assert.strictEqual((await a.post(path, { kind: 'reply' })).body.error, 'AI_NOT_CONFIGURED');
        assert.strictEqual(requests.length, 2);
    });
    await test('pilot disables legacy automatic AI replies even with an environment key', async () => {
        assert.strictEqual(await isAIAnswerEnabled(), false);
    });
    await test('closed conversations are not sent to the model', async () => {
        await runWithTenant(a.tenant, () => conversation.update({ status: 'closed' }));
        assert.strictEqual((await a.post(path, { kind: 'reply' })).status, 409);
        assert.strictEqual(requests.length, 2);
    });
    await test('AI-labelled sends require explicit staff confirmation before transport', async () => {
        const r = await a.post('/api/conversations/' + conversation.id + '/send', {
            content: 'draft',
            aiAssisted: true,
        });
        assert.strictEqual(r.status, 400);
        assert.strictEqual(r.body.error, 'AI_REVIEW_REQUIRED');
        assert.strictEqual(await models.Message.count(), countsBefore);
    });
    await test('pilot off hides both the generation API and UI capability', async () => {
        process.env.AI_ASSISTANT_PILOT_ENABLED = 'false';
        assert.strictEqual((await a.post(path, { kind: 'reply' })).status, 404);
        assert.strictEqual(
            (await a.get('/api/conversations/ai-assist/status')).body.enabled,
            false
        );
        process.env.AI_ASSISTANT_PILOT_ENABLED = 'true';
    });
    await test('transcript bounds, attachment exclusion and credential redaction', async () => {
        const rows = Array.from({ length: 40 }, (_, i) => ({
            id: String(i),
            direction: 'incoming',
            content: 'x'.repeat(3000),
        }));
        const prepared = prepareTranscript(rows);
        assert.ok(prepared.reduce((n, row) => n + row.text.length, 0) <= 12000);
        assert.strictEqual(prepared[prepared.length - 1].id, '39');
        assert.deepStrictEqual(prepareTranscript([{ content: 'private file', type: 'image' }]), []);
        assert.strictEqual(
            redactText('Bearer abc123 sk-test-secret-0000000000').includes('abc123'),
            false
        );
    });
    await test('non-enrolled panels do not opt into the pilot', async () => {
        process.env.AI_ASSISTANT_PILOT_PANELS = 'default';
        assert.strictEqual(
            (await a.get('/api/conversations/ai-assist/status')).body.enabled,
            false
        );
        assert.strictEqual((await a.post(path, { kind: 'reply' })).status, 404);
        process.env.AI_ASSISTANT_PILOT_PANELS = 'default,t-ai-pilot-a,t-ai-pilot-b';
    });
    await test('generation limiter caps requests before any provider spend', async () => {
        process.env.DISABLE_RATE_LIMIT = 'false';
        for (let i = 0; i < 6; i++)
            assert.notStrictEqual((await b.post(path, { kind: 'reply' })).status, 429);
        const limited = await b.post(path, { kind: 'reply' });
        assert.strictEqual(limited.status, 429);
        assert.strictEqual(limited.body.error, 'AI_RATE_LIMIT');
        assert.strictEqual(requests.length, 2);
    });
    console.log('\n' + passed + ' AI pilot tests passed (no provider/WhatsApp network calls).');
}

main()
    .then(() => {
        axios.post = originalPost;
        process.exit(0);
    })
    .catch((err) => {
        console.error(err);
        axios.post = originalPost;
        process.exit(1);
    });

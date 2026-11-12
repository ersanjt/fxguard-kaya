/**
 * انتخاب سرویس هوش مصنوعی و شکل درخواست، بدون شبکه.
 * اجرا: node tests/ai-providers.test.js
 */
'use strict';

const assert = require('assert');
const {
    resolveActiveFromConfig,
    publicAiStatus,
    applyAiConfigUpdate,
    validateApiKey,
} = require('../lib/aiProviders');
const { buildProviderRequest, normalizeTurns, readResponseText } = require('../lib/aiChat');

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

const OPENAI_KEY = 'sk-test-openai-key-0000000001';
const CLAUDE_KEY = 'sk-ant-test-claude-key-0000001';

test('selected provider with a key wins', () => {
    const active = resolveActiveFromConfig({
        aiProvider: 'anthropic',
        aiProviderKeys: JSON.stringify({ anthropic: CLAUDE_KEY }),
        openaiApiKey: OPENAI_KEY,
    }, {});
    assert.strictEqual(active.provider, 'anthropic');
    assert.strictEqual(active.apiKey, CLAUDE_KEY);
    assert.strictEqual(active.fallback, false);
});

test('falls back to a saved key when the selected provider has none', () => {
    const active = resolveActiveFromConfig({
        aiProvider: 'gemini',
        openaiApiKey: OPENAI_KEY,
    }, {});
    assert.strictEqual(active.provider, 'openai');
    assert.strictEqual(active.fallback, true);
});

test('env key is used when the panel key is empty', () => {
    const active = resolveActiveFromConfig({ aiProvider: 'gemini' }, { GEMINI_API_KEY: 'AIzaSyTestGeminiKey0000000001' });
    assert.strictEqual(active.provider, 'gemini');
    assert.strictEqual(active.keySource, 'env');
});

test('public status never includes the raw key', () => {
    const status = publicAiStatus({
        aiProvider: 'openai',
        openaiApiKey: OPENAI_KEY,
        aiProviderKeys: JSON.stringify({ anthropic: CLAUDE_KEY }),
    }, {});
    const blob = JSON.stringify(status);
    assert.strictEqual(blob.includes(OPENAI_KEY), false);
    assert.strictEqual(blob.includes(CLAUDE_KEY), false);
    const openai = status.aiKeyStatus.find((row) => row.id === 'openai');
    const claude = status.aiKeyStatus.find((row) => row.id === 'anthropic');
    assert.strictEqual(openai.keySet, true);
    assert.strictEqual(openai.keySource, 'panel');
    assert.strictEqual(claude.keySet, true);
});

test('rejects a short or spaced key and an unknown provider', () => {
    assert.ok(validateApiKey('openai', 'short'));
    assert.ok(validateApiKey('gemini', 'this key has spaces and is long enough'));
    const cfg = { openaiApiKey: null, aiProviderKeys: null };
    const bad = applyAiConfigUpdate(cfg, { aiProvider: 'not-a-provider' });
    assert.ok(bad && bad.error);
    const badKey = applyAiConfigUpdate({ openaiApiKey: null, aiProviderKeys: null }, { aiKeys: { anthropic: 'too-short' } });
    assert.ok(badKey && badKey.error);
});

test('stores a non-OpenAI key beside the legacy OpenAI column', () => {
    const cfg = { openaiApiKey: OPENAI_KEY, aiProviderKeys: null, aiProvider: 'openai' };
    const result = applyAiConfigUpdate(cfg, { aiProvider: 'anthropic', aiKeys: { anthropic: CLAUDE_KEY } });
    assert.strictEqual(result, null);
    assert.strictEqual(cfg.aiProvider, 'anthropic');
    assert.strictEqual(cfg.openaiApiKey, OPENAI_KEY);
    assert.strictEqual(JSON.parse(cfg.aiProviderKeys).anthropic, CLAUDE_KEY);
    assert.strictEqual(JSON.parse(cfg.aiProviderKeys).openai, undefined);
});

test('request shape matches each provider and hides the key from the URL', () => {
    const turns = normalizeTurns([
        { role: 'assistant', content: 'سلام' },
        { role: 'user', content: 'نرخ' },
        { role: 'user', content: 'دلار' },
    ]);
    assert.strictEqual(turns[0].role, 'user');
    assert.strictEqual(turns[turns.length - 1].content.includes('نرخ'), true);
    assert.strictEqual(turns[turns.length - 1].content.includes('دلار'), true);

    const openai = buildProviderRequest('openai', OPENAI_KEY, 'gpt-4o-mini', {
        system: 'sys', messages: [{ role: 'user', content: 'سلام' }], temperature: 0.2, maxTokens: 100,
    });
    assert.strictEqual(openai.url, 'https://api.openai.com/v1/chat/completions');
    assert.strictEqual(openai.headers.Authorization, 'Bearer ' + OPENAI_KEY);
    assert.strictEqual(openai.data.messages[0].role, 'system');

    const claude = buildProviderRequest('anthropic', CLAUDE_KEY, 'claude-3-5-haiku-latest', {
        system: 'sys', messages: [{ role: 'user', content: 'سلام' }], temperature: 0.2, maxTokens: 100,
    });
    assert.strictEqual(claude.url, 'https://api.anthropic.com/v1/messages');
    assert.strictEqual(claude.headers['x-api-key'], CLAUDE_KEY);
    assert.strictEqual(claude.data.system, 'sys');

    const gemini = buildProviderRequest('gemini', 'AIzaSyTestGeminiKey0000000001', 'gemini-2.0-flash', {
        system: 'sys', messages: [{ role: 'assistant', content: 'پاسخ' }], temperature: 0.2, maxTokens: 100,
    });
    assert.strictEqual(gemini.url.includes('AIza'), false);
    assert.strictEqual(gemini.headers['x-goog-api-key'], 'AIzaSyTestGeminiKey0000000001');
    assert.strictEqual(gemini.data.contents[0].role, 'user');
    assert.ok(gemini.data.contents.some((row) => row.role === 'model'));

    assert.strictEqual(readResponseText('anthropic', { content: [{ text: 'سلام' }] }), 'سلام');
    assert.strictEqual(readResponseText('gemini', { candidates: [{ content: { parts: [{ text: 'نرخ' }] } }] }), 'نرخ');
    assert.strictEqual(readResponseText('openai', { choices: [{ message: { content: 'ok' } }] }), 'ok');
});

console.log(failed ? ('\n' + failed + ' failed') : ('\n' + passed + ' passed'));
process.exit(failed ? 1 : 0);

/**
 * کاتالوگ سرویس‌های هوش مصنوعی و انتخاب کلید فعال.
 * کلید خام هرگز به پاسخ API برنمی‌گردد.
 */

const PROVIDERS = [
    {
        id: 'openai',
        label: 'ChatGPT / OpenAI',
        env: 'OPENAI_API_KEY',
        modelEnv: 'OPENAI_MODEL',
        model: 'gpt-4o-mini',
        kind: 'openai',
        baseUrl: 'https://api.openai.com/v1/chat/completions',
    },
    {
        id: 'anthropic',
        label: 'Claude',
        env: 'ANTHROPIC_API_KEY',
        modelEnv: 'ANTHROPIC_MODEL',
        model: 'claude-3-5-haiku-latest',
        kind: 'anthropic',
    },
    {
        id: 'gemini',
        label: 'Gemini',
        env: 'GEMINI_API_KEY',
        altEnv: 'GOOGLE_API_KEY',
        modelEnv: 'GEMINI_MODEL',
        model: 'gemini-2.0-flash',
        kind: 'gemini',
    },
    {
        id: 'xai',
        label: 'Grok',
        env: 'XAI_API_KEY',
        modelEnv: 'XAI_MODEL',
        model: 'grok-3-mini',
        kind: 'openai',
        baseUrl: 'https://api.x.ai/v1/chat/completions',
    },
    {
        id: 'mistral',
        label: 'Mistral',
        env: 'MISTRAL_API_KEY',
        modelEnv: 'MISTRAL_MODEL',
        model: 'mistral-small-latest',
        kind: 'openai',
        baseUrl: 'https://api.mistral.ai/v1/chat/completions',
    },
    {
        id: 'groq',
        label: 'Groq',
        env: 'GROQ_API_KEY',
        modelEnv: 'GROQ_MODEL',
        model: 'llama-3.3-70b-versatile',
        kind: 'openai',
        baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    },
    {
        id: 'deepseek',
        label: 'DeepSeek',
        env: 'DEEPSEEK_API_KEY',
        modelEnv: 'DEEPSEEK_MODEL',
        model: 'deepseek-chat',
        kind: 'openai',
        baseUrl: 'https://api.deepseek.com/chat/completions',
    },
];

const BY_ID = Object.create(null);
PROVIDERS.forEach((p) => { BY_ID[p.id] = p; });

const CACHE_TTL_MS = 30 * 1000;
const _cache = new Map();

function getProvider(id) {
    return BY_ID[String(id || '').trim()] || null;
}

function normalizeProviderId(id) {
    const key = String(id || '').trim().toLowerCase();
    return BY_ID[key] ? key : 'openai';
}

function parseKeyMap(raw) {
    if (!raw) return {};
    if (typeof raw === 'object') return { ...raw };
    try {
        const parsed = JSON.parse(String(raw));
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? { ...parsed } : {};
    } catch (_e) {
        return {};
    }
}

function panelKeyMap(cfg) {
    const map = parseKeyMap(cfg && cfg.aiProviderKeys);
    const legacy = cfg && cfg.openaiApiKey && String(cfg.openaiApiKey).trim();
    if (legacy && !map.openai) map.openai = legacy;
    return map;
}

function envKey(provider, env) {
    const source = env || process.env;
    const primary = source[provider.env] && String(source[provider.env]).trim();
    if (primary) return primary;
    if (provider.altEnv && source[provider.altEnv]) return String(source[provider.altEnv]).trim();
    return '';
}

function keyFor(cfg, providerId, env) {
    const provider = getProvider(providerId);
    if (!provider) return { apiKey: '', source: null };
    const panel = String((panelKeyMap(cfg)[provider.id] || '')).trim();
    if (panel) return { apiKey: panel, source: 'panel' };
    const fromEnv = envKey(provider, env);
    if (fromEnv) return { apiKey: fromEnv, source: 'env' };
    return { apiKey: '', source: null };
}

function modelFor(providerId, env) {
    const provider = getProvider(providerId) || BY_ID.openai;
    const source = env || process.env;
    const custom = source[provider.modelEnv] && String(source[provider.modelEnv]).trim();
    return custom || provider.model;
}

function validateApiKey(providerId, key) {
    const provider = getProvider(providerId);
    if (!provider) return 'سرویس هوش مصنوعی ناشناخته است';
    const value = String(key || '').trim();
    if (!value) return null;
    if (value.length < 20 || value.length > 500 || /\s/.test(value)) return 'کلید API نامعتبر است';
    return null;
}

/**
 * سرویس انتخاب‌شده اگر کلید داشته باشد؛ وگرنه اولین سرویسی که کلید پنل یا env دارد.
 */
function resolveActiveFromConfig(cfg, env) {
    const source = env || process.env;
    const selected = normalizeProviderId((cfg && cfg.aiProvider) || source.AI_PROVIDER || 'openai');
    const selectedKey = keyFor(cfg, selected, source);
    if (selectedKey.apiKey) {
        return {
            provider: selected,
            apiKey: selectedKey.apiKey,
            keySource: selectedKey.source,
            model: modelFor(selected, source),
            fallback: false,
        };
    }
    for (let i = 0; i < PROVIDERS.length; i++) {
        const found = keyFor(cfg, PROVIDERS[i].id, source);
        if (!found.apiKey) continue;
        return {
            provider: PROVIDERS[i].id,
            apiKey: found.apiKey,
            keySource: found.source,
            model: modelFor(PROVIDERS[i].id, source),
            fallback: PROVIDERS[i].id !== selected,
        };
    }
    return {
        provider: selected,
        apiKey: '',
        keySource: null,
        model: modelFor(selected, source),
        fallback: false,
    };
}

function publicAiStatus(cfg, env) {
    const source = env || process.env;
    const selected = normalizeProviderId((cfg && cfg.aiProvider) || source.AI_PROVIDER || 'openai');
    return {
        aiProvider: selected,
        aiKeyStatus: PROVIDERS.map((p) => {
            const found = keyFor(cfg, p.id, source);
            return {
                id: p.id,
                label: p.label,
                keySet: !!found.apiKey,
                keySource: found.source,
            };
        }),
    };
}

function applyAiConfigUpdate(cfg, body) {
    const input = body || {};
    if (input.aiProvider !== undefined) {
        const id = String(input.aiProvider || '').trim().toLowerCase();
        if (!getProvider(id)) return { error: 'سرویس هوش مصنوعی ناشناخته است' };
        cfg.aiProvider = id;
    }
    const incoming = {};
    if (input.openaiApiKey !== undefined) incoming.openai = input.openaiApiKey;
    if (input.aiKeys && typeof input.aiKeys === 'object' && !Array.isArray(input.aiKeys)) {
        Object.keys(input.aiKeys).forEach((id) => { incoming[id] = input.aiKeys[id]; });
    }
    if (!Object.keys(incoming).length) return null;
    const stored = panelKeyMap(cfg);
    const ids = Object.keys(incoming);
    for (let i = 0; i < ids.length; i++) {
        const id = String(ids[i] || '').trim().toLowerCase();
        if (!getProvider(id)) return { error: 'سرویس هوش مصنوعی ناشناخته است' };
        const key = String(incoming[ids[i]] == null ? '' : incoming[ids[i]]).trim();
        if (!key) {
            delete stored[id];
            continue;
        }
        const invalid = validateApiKey(id, key);
        if (invalid) return { error: invalid };
        stored[id] = key;
    }
    cfg.openaiApiKey = stored.openai || null;
    const persisted = { ...stored };
    delete persisted.openai;
    cfg.aiProviderKeys = Object.keys(persisted).length ? JSON.stringify(persisted) : null;
    return null;
}

function cacheSlot() {
    try {
        const { getPanelSettingsKey } = require('./tenantContext');
        const key = getPanelSettingsKey();
        return key || '__none__';
    } catch (_e) {
        return '__none__';
    }
}

function clearAiProviderCache() {
    _cache.clear();
}

async function loadAiConfigRow() {
    const { WhatsappConfig } = require('../models');
    const { getPanelSettingsKey } = require('./tenantContext');
    const panelKey = getPanelSettingsKey();
    if (!panelKey) return null;
    const [cfg] = await WhatsappConfig.findOrCreate({
        where: { id: panelKey },
        defaults: {},
    });
    return cfg;
}

async function resolveActiveAi() {
    const slot = cacheSlot();
    const hit = _cache.get(slot);
    const now = Date.now();
    if (hit && (now - hit.at) < CACHE_TTL_MS) return hit.value;
    let cfg = null;
    try {
        cfg = await loadAiConfigRow();
    } catch (_e) {
        cfg = null;
    }
    const value = resolveActiveFromConfig(cfg, process.env);
    _cache.set(slot, { at: now, value, cfg });
    return value;
}

async function getConfiguredKey(providerId) {
    const slot = cacheSlot();
    let hit = _cache.get(slot);
    if (!hit || (Date.now() - hit.at) >= CACHE_TTL_MS) {
        await resolveActiveAi();
        hit = _cache.get(slot);
    }
    const found = keyFor(hit && hit.cfg, providerId, process.env);
    return found.apiKey || null;
}

// Explicit provider, no cross-provider fallback and no platform key for SaaS tenants.
async function resolveAiForProvider(providerId) {
    const provider = getProvider(providerId);
    if (!provider) return null;
    const { getCurrentTenant, isPlatformTenant, getPanelSettingsKey } = require('./tenantContext');
    if (!getPanelSettingsKey()) return null;
    let cfg;
    try {
        cfg = await loadAiConfigRow();
    } catch (_) {
        return null;
    }
    const env = isPlatformTenant(getCurrentTenant()) ? process.env : {};
    const found = keyFor(cfg, providerId, env);
    return {
        provider: providerId,
        apiKey: found.apiKey,
        keySource: found.source,
        model: modelFor(providerId, process.env),
    };
}

module.exports = {
    PROVIDERS,
    getProvider,
    normalizeProviderId,
    parseKeyMap,
    validateApiKey,
    resolveActiveFromConfig,
    publicAiStatus,
    applyAiConfigUpdate,
    clearAiProviderCache,
    resolveActiveAi,
    getConfiguredKey,
    modelFor,
    resolveAiForProvider,
};

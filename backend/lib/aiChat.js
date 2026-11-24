/**
 * یک فراخوانی چت برای OpenAI، Claude، Gemini و سرویس‌های سازگار با OpenAI.
 */
const axios = require('axios');
const logger = require('../config/logger');
const { getProvider, resolveActiveAi, resolveAiForProvider } = require('./aiProviders');

function normalizeTurns(messages) {
    const out = [];
    (messages || []).forEach((message) => {
        const role = message && message.role === 'assistant' ? 'assistant' : 'user';
        const content = String((message && message.content) || '').trim();
        if (!content) return;
        const prev = out[out.length - 1];
        if (prev && prev.role === role) prev.content += '\n' + content;
        else out.push({ role, content });
    });
    if (out.length && out[0].role === 'assistant') {
        out.unshift({ role: 'user', content: '(شروع گفتگو)' });
    }
    if (!out.length) out.push({ role: 'user', content: '...' });
    return out;
}

function buildProviderRequest(providerId, apiKey, model, { system, messages, temperature, maxTokens }) {
    const provider = getProvider(providerId);
    const turns = normalizeTurns(messages);
    const temp = Number.isFinite(temperature) ? temperature : 0.2;
    const maxOut = Number.isFinite(maxTokens) ? maxTokens : 600;
    const systemText = String(system || '');
    if (!provider) return null;
    if (provider.kind === 'anthropic') {
        return {
            url: 'https://api.anthropic.com/v1/messages',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json',
            },
            data: {
                model: model || provider.model,
                max_tokens: maxOut,
                temperature: temp,
                system: systemText,
                messages: turns.map((m) => ({ role: m.role, content: m.content })),
            },
        };
    }
    if (provider.kind === 'gemini') {
        const modelName = model || provider.model;
        return {
            url: 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(modelName) + ':generateContent',
            headers: {
                'x-goog-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            data: {
                systemInstruction: systemText ? { parts: [{ text: systemText }] } : undefined,
                contents: turns.map((m) => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content }],
                })),
                generationConfig: { temperature: temp, maxOutputTokens: maxOut },
            },
        };
    }
    return {
        url: provider.baseUrl,
        headers: {
            Authorization: 'Bearer ' + apiKey,
            'Content-Type': 'application/json',
        },
        data: {
            model: model || provider.model,
            messages: [{ role: 'system', content: systemText }].concat(turns),
            temperature: temp,
            max_tokens: maxOut,
        },
    };
}

function readResponseText(providerId, data) {
    const provider = getProvider(providerId);
    if (!provider || !data) return '';
    if (provider.kind === 'anthropic') {
        const blocks = Array.isArray(data.content) ? data.content : [];
        return blocks.map((b) => (b && b.text) || '').join('').trim();
    }
    if (provider.kind === 'gemini') {
        const parts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
        return Array.isArray(parts) ? parts.map((p) => (p && p.text) || '').join('').trim() : '';
    }
    const choice = data.choices && data.choices[0];
    return (choice && choice.message && choice.message.content) ? String(choice.message.content).trim() : '';
}

async function completeChat({ system, messages, temperature, maxTokens, timeoutMs, providerId, safeErrors = false }) {
    const active = providerId ? await resolveAiForProvider(providerId) : await resolveActiveAi();
    if (!active || !active.apiKey) {
        return { text: null, provider: active && active.provider, reason: 'no_key' };
    }
    const request = buildProviderRequest(active.provider, active.apiKey, active.model, {
        system,
        messages,
        temperature,
        maxTokens,
    });
    if (!request) return { text: null, provider: active.provider, reason: 'unknown_provider' };
    const timeout = timeoutMs || 20000;
    const send = () => axios.post(request.url, request.data, { headers: request.headers, timeout });
    try {
        let response;
        try {
            response = await send();
        } catch (err) {
            const retryable = err && (err.code === 'ECONNABORTED' || (err.response && err.response.status >= 500));
            if (!retryable || process.env.NODE_ENV === 'test') throw err;
            logger.info('AI request failed, retrying once', { provider: active.provider, status: err.response && err.response.status });
            response = await send();
        }
        const text = readResponseText(active.provider, response && response.data);
        return { text: text || null, provider: active.provider, reason: text ? null : 'empty' };
    } catch (err) {
        if (process.env.NODE_ENV !== 'test') {
            const errMsg = (err && err.response && err.response.data && (err.response.data.error && (err.response.data.error.message || err.response.data.error) || err.response.data.message)) || (err && err.message);
            logger.warn('AI request failed', { provider: active.provider, error: !safeErrors && typeof errMsg === 'string' ? errMsg : 'request failed' });
        }
        return { text: null, provider: active.provider, reason: 'error' };
    }
}

module.exports = {
    normalizeTurns,
    buildProviderRequest,
    readResponseText,
    completeChat,
};

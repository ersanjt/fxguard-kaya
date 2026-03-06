const axios = require('axios');
const logger = require('../config/logger');
const { getCompanyKnowledge, formatKnowledgeForPrompt } = require('../config/companyKnowledge');

/**
 * سرویس پاسخ‌دهی هوش مصنوعی با OpenAI
 * برای پاسخ خودکار به پیام‌های مشتریان در CRM صرافی/حواله
 */

const MAX_HISTORY_MESSAGES = 12;
const MAX_RESPONSE_TOKENS = parseInt(process.env.AI_MAX_RESPONSE_TOKENS, 10) || 600;
const REQUEST_TIMEOUT_MS = parseInt(process.env.AI_REQUEST_TIMEOUT_MS, 10) || 20000;
const AI_TEMPERATURE = parseFloat(process.env.AI_TEMPERATURE) || 0.3;
const MAX_RESPONSE_CHARS = 1200;

// پیام‌های کوتاه که نیاز به پاسخ AI ندارند
const ACK_PATTERNS = /^(مرسی|ممنون|ممنونم|متشکرم|متشکر|دستتون درد نکنه|مچکرم|اوکی|ok|okay|عالیه|عالی|باشه|باشه ممنون|خوبه|خوب است|ممنون از شما|سپاسگزارم|مرحبا|چشم|ارادت|teşekkürler|teşekkür|sağol|thanks|thank you|thx|got it|okey|tamam)$/i;

/**
 * بررسی نیاز به پاسخ AI — پیام‌های تأییدی/تشکری کوتاه نیاز به پاسخ ندارند
 */
function shouldSkipAIResponse(text) {
    const t = (text || '').trim();
    if (t.length < 2 || t.length > 80) return false;
    return ACK_PATTERNS.test(t.replace(/\s+/g, ' '));
}

const FEW_SHOT_EXAMPLES = `
نمونه‌های پاسخ درست:
مشتری: آدرس دفتر ترکیه؟
پاسخ: آدرس دفتر استانبول: [لینک از اطلاعات شرکت]. برای جزئیات بیشتر یک کارشناس به زودی در همین چت پاسخ خواهد داد.

مشتری: برای دریافت دلار در دبی چه مدارکی لازمه؟
پاسخ: برای دریافت پول (نقدی یا حواله) در دبی یا ترکیه، حتماً کارت شناسایی (ID) شخصی که از او پول درخواست می‌شود را ارسال کنید. یک کارشناس به زودی جزئیات بیشتر را در همین چت می‌دهد.

مشتری: نرخ دلار چنده؟
پاسخ: نرخ ارز متغیر است. یک کارشناس به زودی نرخ به‌روز را در همین چت ارسال می‌کند. لطفاً کمی صبر کنید.

مشتری: Hello I need USD
پاسخ: Hello! A specialist will respond shortly in this chat with the details you need. Please wait a moment.`;

function buildSystemPrompt(deptInfo, companyKnowledgeText) {
    const langRule = `- زبان پاسخ را با زبان مشتری یکی کن: فارسی↔فارسی، ترکی↔ترکی، انگلیسی↔انگلیسی. هرگز زبان را عوض نکن.`;
    const inSystemRule = `- مهم: همه چیز در همین چت است. هرگز نگو «تماس بگیرید» یا «زنگ بزنید». بگو: «یک کارشناس به زودی در همین چت پاسخ خواهد داد».`;

    const base = `شما دستیار حرفه‌ای صرافی کایا هستید. نقش شما: فهمیدن نیاز مشتری، پاسخ دقیق و کوتاه (۱ تا ۳ جمله)، هدایت به کارشناس در همین چت.

${langRule}
${inSystemRule}

قوانین سخت:
1. فقط از اطلاعات رسمی زیر استفاده کن. حدس نزن.
2. برای نرخ ارز، حواله، زمان واریز: پاسخ کلی بده و بگو کارشناس در همین چت جزئیات می‌دهد.
3. هرگز رمز، شماره کارت، یا اطلاعات حساس نده.
4. لحن گرم و حرفه‌ای. ایموجی به‌اندازه (حداکثر یک).
5. در پاسخ هیچ برچسب ([پشتیبانی] و غیره) و هیچ placeholder ([شماره تماس]) ننویس. فقط متن خالص.
6. اگر سوال درباره آدرس، ID، یا رویه است، از اطلاعات شرکت پاسخ بده.
${FEW_SHOT_EXAMPLES}`;

    let full = base;
    if (companyKnowledgeText) full += `\n\nاطلاعات رسمی شرکت (فقط از این استفاده کن):\n${companyKnowledgeText}`;
    if (deptInfo) full += `\n\n${deptInfo}`;
    return full;
}

/**
 * تبدیل تاریخچه به آرایه پیام‌های chat برای مدل
 */
function buildMessages(customerName, messageHistory, incomingMessage) {
    const messages = [];
    const history = messageHistory.slice(-MAX_HISTORY_MESSAGES);
    for (const m of history) {
        const content = (m.content || '').slice(0, 350).trim();
        if (!content) continue;
        const role = m.direction === 'incoming' ? 'user' : 'assistant';
        const prefix = role === 'user' ? `[مشتری] ` : `[پشتیبانی] `;
        messages.push({ role, content: prefix + content });
    }
    const lastUser = `[مشتری] ${incomingMessage}`;
    messages.push({ role: 'user', content: lastUser });
    return messages;
}

/**
 * تولید پاسخ هوشمند با استفاده از OpenAI
 * @param {Object} options
 * @param {Object} options.conversation - مکالمه
 * @param {Object} options.customer - مشتری
 * @param {string} options.incomingMessage - متن پیام ورودی
 * @param {Object[]} options.messageHistory - تاریخچه پیام‌ها (اختیاری)
 * @param {Object} options.department - دپارتمان تخصیص‌یافته (اختیاری)
 * @returns {Promise<string|null>} متن پاسخ یا null در صورت خطا
 */
async function generateAIResponse({ conversation, customer, incomingMessage, messageHistory = [], department = null }) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        if (process.env.NODE_ENV !== 'test') logger.warn('AI: OPENAI_API_KEY not set in .env');
        return null;
    }
    const text = (incomingMessage || '').trim();
    if (!text) return null;

    if (shouldSkipAIResponse(text)) return null;

    const companyKnowledge = getCompanyKnowledge();
    const companyText = formatKnowledgeForPrompt(companyKnowledge);
    const deptInfo = department ? `دپارتمان فعلی: ${department.name}. ${(department.description || '').slice(0, 150)}` : '';
    const systemPrompt = buildSystemPrompt(deptInfo, companyText);
    const chatMessages = buildMessages((customer && customer.name) || 'مشتری', messageHistory, text);

    const payload = {
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
            { role: 'system', content: systemPrompt },
            ...chatMessages.map(m => ({ role: m.role, content: m.content }))
        ],
        temperature: AI_TEMPERATURE,
        max_tokens: MAX_RESPONSE_TOKENS
    };

    const doRequest = () => axios.post('https://api.openai.com/v1/chat/completions', payload, {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        timeout: REQUEST_TIMEOUT_MS
    });

    try {
        let response;
        try {
            response = await doRequest();
        } catch (err) {
            const retryable = err?.code === 'ECONNABORTED' || err?.response?.status >= 500;
            if (retryable && process.env.NODE_ENV !== 'test') {
                logger.info('AI request failed, retrying once...', { code: err?.code, status: err?.response?.status });
                response = await doRequest();
            } else throw err;
        }

        const content = response.data?.choices?.[0]?.message?.content?.trim();
        if (!content) return null;

        let cleaned = content.replace(/^["']|["']$/g, '').trim();
        cleaned = cleaned.replace(/^\[پشتیبانی\]\s*/i, '').replace(/^\[Support\]\s*/i, '').replace(/^\[مشتری\]\s*/i, '');
        cleaned = cleaned.replace(/\[شماره تماس\]/g, '').replace(/\+\s*98\s*\[شماره تماس\]/g, '').trim();
        return cleaned.slice(0, MAX_RESPONSE_CHARS) || null;
    } catch (err) {
        if (process.env.NODE_ENV !== 'test') {
            const errMsg = err?.response?.data?.error?.message || err?.message;
            const errCode = err?.response?.data?.error?.code || err?.code;
            const status = err?.response?.status;
            const hint = errCode === 'insufficient_quota' ? ' → سقف اعتبار OpenAI تمام شده. به https://platform.openai.com/account/billing مراجعه کنید.' : '';
            logger.warn('AI response generation failed: ' + errMsg + hint, { code: errCode, status });
        }
        return null;
    }
}

/**
 * بررسی فعال بودن پاسخ AI
 */
function isAIAnswerEnabled() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return false;
    const enabled = process.env.AI_ANSWER_ENABLED;
    return enabled === undefined || enabled === '' || enabled === 'true' || enabled === '1';
}

module.exports = {
    generateAIResponse,
    isAIAnswerEnabled
};

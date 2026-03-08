const axios = require('axios');
const logger = require('../config/logger');
const { getCompanyKnowledge, formatKnowledgeForPrompt } = require('../config/companyKnowledge');
const { getOpenAIApiKey } = require('../lib/getOpenAIApiKey');

/**
 * سرویس پاسخ‌دهی هوش مصنوعی با OpenAI
 * برای پاسخ خودکار به پیام‌های مشتریان در CRM صرافی/حواله
 */

const MAX_HISTORY_MESSAGES = 12;
const MAX_RESPONSE_TOKENS = parseInt(process.env.AI_MAX_RESPONSE_TOKENS, 10) || 600;
const REQUEST_TIMEOUT_MS = parseInt(process.env.AI_REQUEST_TIMEOUT_MS, 10) || 20000;
const AI_TEMPERATURE = parseFloat(process.env.AI_TEMPERATURE) || 0.2;
const MAX_RESPONSE_CHARS = 1200;

// پیام‌های کوتاه که نیاز به پاسخ AI ندارند
const ACK_PATTERNS = /^(مرسی|ممنون|ممنونم|متشکرم|متشکر|دستتون درد نکنه|مچکرم|اوکی|ok|okay|عالیه|عالی|باشه|باشه ممنون|خوبه|خوب است|ممنون از شما|سپاسگزارم|مرحبا|چشم|ارادت|اعم|درسته|درست|teşekkürler|teşekkür|sağol|thanks|thank you|thx|got it|okey|tamam|evet|hayır|yes|no|شکرا|شكراً|ماشاءالله)$/i;

// حداکثر طول ورودی برای جلوگیری از اسپم/کپی‌پیست
const MAX_INPUT_CHARS = 800;

// عبارات ممنوع در پاسخ — اگر باشد پاسخ رد می‌شود
const FORBIDDEN_PHRASES = [
    /تماس\s*بگیرید?/i, /زنگ\s*بزنید?/i, /تلفن\s*بزنید?/i,
    /call\s+us/i, /contact\s+us/i, /call\s+me/i, /phone\s+number/i,
    /ara(yın|yıp)/i, /telefon\s*(ed|aç)/i,
    /\+\s*98\s*\d{9,}/i
];

/**
 * بررسی نیاز به پاسخ AI — پیام‌های تأییدی/تشکری کوتاه نیاز به پاسخ ندارند
 */
function shouldSkipAIResponse(text) {
    const t = (text || '').trim();
    if (t.length < 2 || t.length > 80) return false;
    return ACK_PATTERNS.test(t.replace(/\s+/g, ' '));
}

// سوالات ساده‌ای که AI می‌تواند حتی با مکالمه assign‌شده پاسخ دهد
const SIMPLE_FACTUAL_PATTERNS = [
    /\b(قیمت|نرخ|چنده|چند|نرخ لحظه|قیمت لحظه|کارمزد|هزینه)\b/i,
    /\b(آدرس|ادرس|دفتر|کجاست)\b/i,
    /\b(مدرک|مدارک|چی لازمه|چی بفرستم|id|پاسپورت)\b/i,
    /\b(price|rate|how much|what.?s the rate|commission|fee)\b/i,
    /\b(address|where is|location)\b/i,
    /\b(documents?|what do i need|id required)\b/i,
    /\b(fiyat|kur|nerede|adres|komisyon)\b/i,
    /\b(سعر|عنوان|عنواني|الوثائق)\b/i
];

/**
 * آیا پیام یک سوال ساده و واقعی است که AI می‌تواند پاسخ دهد؟
 */
function isSimpleFactualQuestion(text) {
    const t = (text || '').trim();
    if (t.length < 3 || t.length > 120) return false;
    return SIMPLE_FACTUAL_PATTERNS.some(p => p.test(t));
}

/**
 * بررسی اینکه ورودی قابل پردازش است (نه اسپم/کد)
 */
function isValidInput(text) {
    const t = (text || '').trim();
    if (t.length > MAX_INPUT_CHARS) return false;
    if (/^[\d\s\+\-\*\/\.\=\{\}\(\)\[\]]+$/.test(t) && t.length > 20) return false;
    return true;
}

const FEW_SHOT_EXAMPLES = `
نمونه‌های پاسخ درست:
مشتری: آدرس دفتر ترکیه؟
پاسخ: آدرس دفتر استانبول در اطلاعات شرکت ثبت شده. یک کارشناس به زودی لینک و جزئیات کامل را در همین چت ارسال می‌کند.

مشتری: برای دریافت دلار در دبی چه مدارکی لازمه؟
پاسخ: برای دریافت پول (نقدی یا حواله) در دبی یا ترکیه، حتماً کارت شناسایی (ID) شخصی که از او پول درخواست می‌شود را ارسال کنید. یک کارشناس به زودی جزئیات بیشتر را در همین چت می‌دهد.

مشتری: نرخ دلار چنده؟
پاسخ: نرخ ارز متغیر است. یک کارشناس به زودی نرخ به‌روز را در همین چت ارسال می‌کند. لطفاً کمی صبر کنید.

مشتری: Hello I need USD
پاسخ: Hello! A specialist will respond shortly in this chat with the details you need. Please wait a moment.

مشتری: Merhaba, Türkiye'de dolar almak istiyorum
پاسخ: Merhaba! Türkiye'de dolar almak için uzmanımız size nakit/havale seçenekleri ve güncel kuru bu sohbette iletecek. Bir dakika bekleyin.

مشتری: 1500 usd ihtiyacim var
پاسخ: 1500 USD için uzmanımız size kuru ve teslimat detaylarını (Türkiye mi, BAE mi?) bu sohbette gönderecek. Lütfen biraz bekleyin.

مشتری: سلام، میخوام ۲۰۰۰ دلار بفرستم ترکیه
پاسخ: برای حواله ۲۰۰۰ دلار به ترکیه، کارشناس ما نرخ، کارمزد و زمان واریز را در همین چت ارسال می‌کند. لطفاً کمی صبر کنید.

مشتری: چطور میتونم دلار بگیرم؟
پاسخ: برای خرید دلار می‌توانید نقدی یا حواله در ترکیه و دبی استفاده کنید. کارشناس ما مبلغ، محل تحویل و مدارک لازم را در همین چت می‌دهد.

مشتری: I need to send money to Turkey
پاسخ: For transfers to Turkey, our specialist will send you the rate, fees and process in this chat. Where will you send from — UAE, Iran, or elsewhere?

مشتری: عايز اعرف سعر الدولار
پاسخ: السعر يتغير. خبيرنا سيرسل لك السعر الحالي في هذه المحادثة قريباً.

مشتری: فقط دلار
پاسخ: برای خرید دلار، بفرمایید ترکیه یا امارات؟ نقدی یا حواله؟ کارشناس جزئیات را در همین چت ارسال می‌کند.

مشتری: قیمت چنده؟
پاسخ: نرخ ارز لحظه‌ای است. کارشناس ما نرخ به‌روز را در همین چت ارسال می‌کند. لطفاً کمی صبر کنید.

مشتری: آدرس دفتر کجاست؟
پاسخ: دفاتر ما در استانبول، مجدی‌کوی، دبی و چند شهر دیگر است. کارشناس لینک نقشه و آدرس دقیق را در همین چت می‌دهد.

نمونه‌های غلط (هرگز این‌طور ننویس):
- «تماس بگیرید» یا «زنگ بزنید» یا «call us» — ممنوع. همیشه بگو: کارشناس در همین چت پاسخ می‌دهد.
- [شماره تماس] یا [لینک] یا هر placeholder — ممنوع. فقط متن نهایی و واقعی بنویس.
- پاسخ خیلی کلی و بی‌محتوا (فقط «کارشناس به زودی پاسخ می‌دهد» بدون هیچ راهنمایی) — ممنوع. حتماً نکته‌ای مفید بده.`;

function buildSystemPrompt(deptInfo, companyKnowledgeText, options = {}) {
    const { customerName } = options;
    const langRule = `- زبان پاسخ: همیشه با زبان مشتری پاسخ بده. فارسی→فارسی، ترکی→ترکی، انگلیسی→انگلیسی، عربی→عربی. تشخیص: ihtiyacim/istiyorum/almak/göndermek → ترکی؛ need/want/send → انگلیسی؛ میخوام/نیاز/دارم → فارسی؛ عايز/سعر/درهم → عربی. اگر پیام کوتاه (سلام، hi) ولی تاریخچه قبلی مشخص است، به زبان همان تاریخچه پاسخ بده.`;
    const inSystemRule = `- مهم: همه چیز در همین چت است. هرگز نگو «تماس بگیرید» یا «زنگ بزنید». بگو: «یک کارشناس به زودی در همین چت پاسخ خواهد داد».`;

    const base = `شما دستیار حرفه‌ای صرافی کایا هستید. نقش شما: راهنمایی و کمک به مشتری، نه فقط گفتن «کارشناس پاسخ می‌دهد».

رفتار مطلوب:
- نیاز مشتری را مشخص تکرار کن (مثلاً: ۱۵۰۰ دلار در ترکیه).
- یک نکته مفید بده: ترکیه یا امارات؟ نقدی یا حواله؟ آدرس دفتر؟ مدارک لازم؟
- سپس بگو کارشناس جزئیات دقیق را در همین چت می‌دهد.
- پاسخ کوتاه ولی راهنما (۲ تا ۴ جمله). خیلی کلی و بی‌محتوا نباش.

${langRule}
${inSystemRule}

قوانین سخت:
1. فقط از اطلاعات رسمی زیر استفاده کن. حدس نزن.
2. برای نرخ ارز، حواله، زمان واریز: پاسخ کلی بده و بگو کارشناس در همین چت جزئیات می‌دهد.
3. هرگز رمز، شماره کارت، یا اطلاعات حساس نده.
4. لحن گرم و حرفه‌ای. ایموجی به‌اندازه (حداکثر یک).
5. در پاسخ هیچ برچسب ([پشتیبانی] و غیره) و هیچ placeholder ([شماره تماس]، [لینک]) ننویس. فقط متن نهایی و خالص.
6. اگر سوال درباره آدرس، ID، یا رویه است، از اطلاعات شرکت پاسخ بده.
7. خروجی: فقط متن پاسخ. بدون عنوان، بدون شماره‌گذاری، بدون markdown.
8. اگر مشتری پیام کوتاه فرستاد (سلام، hi، merhaba) ولی در تاریخچه درخواست مشخص داشت، همان درخواست را خلاصه کن و راهنمایی بده.
9. درخواست مبهم (فقط «دلار»، «پول»): بپرس ترکیه یا امارات؟ نقدی یا حواله؟ سپس بگو کارشناس جزئیات می‌دهد.
${FEW_SHOT_EXAMPLES}`;

    let full = base;
    if (customerName && String(customerName).trim() && customerName !== 'مشتری') {
        full += `\n\n[اختیاری: نام مشتری در چت: ${String(customerName).trim()}. در صورت مناسب بودن می‌توانی با نام خطاب کنی.]`;
    }
    if (companyKnowledgeText) full += `\n\nاطلاعات رسمی شرکت (فقط از این استفاده کن):\n${companyKnowledgeText}`;
    if (deptInfo) full += `\n\n${deptInfo}`;
    return full;
}

/**
 * پاک‌سازی و اعتبارسنجی پاسخ مدل
 */
function sanitizeResponse(content) {
    if (!content || typeof content !== 'string') return '';
    let s = content.trim();
    s = s.replace(/^["'`]|["'`]$/g, '');
    s = s.replace(/^\[پشتیبانی\]\s*/i, '').replace(/^\[Support\]\s*/i, '').replace(/^\[مشتری\]\s*/i, '');
    s = s.replace(/\[شماره تماس\]/g, '').replace(/\+\s*98\s*\[شماره تماس\]/g, '');
    s = s.replace(/\[[\w\s\u0600-\u06FF]+\]/g, ''); // حذف [placeholder]
    s = s.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/__([^_]+)__/g, '$1'); // مارک‌داون bold
    s = s.replace(/^#+\s*/gm, '').replace(/^\s*[-*]\s+/gm, ' '); // لیست مارک‌داون
    s = s.replace(/\s+/g, ' ').trim();
    return s.slice(0, MAX_RESPONSE_CHARS);
}

/**
 * بررسی اینکه پاسخ شامل عبارت ممنوع نباشد
 */
function hasForbiddenContent(text) {
    if (!text) return true;
    return FORBIDDEN_PHRASES.some(p => p.test(text));
}

/**
 * پاسخ امن پیش‌فرض وقتی اعتبارسنجی رد شود
 */
function getSafeFallback(langHint) {
    const fallbacks = {
        fa: 'متوجه شدم. یک کارشناس به زودی در همین چت پاسخ خواهد داد.',
        en: 'Understood. A specialist will respond shortly in this chat.',
        tr: 'Anlaşıldı. Uzmanımız kısa süre içinde bu sohbette yanıt verecektir.',
        ar: 'فهمت. سيررد عليك خبيرنا قريباً في هذه المحادثة.'
    };
    const h = langHint || '';
    if (/عايز|سعر|درهم|شكراً|محادثة/i.test(h)) return fallbacks.ar;
    if (/[ğüşıöçĞÜŞİÖÇ]/.test(h) || /ihtiyacim|istiyorum|almak|göndermek/.test(h)) return fallbacks.tr;
    if (/[\u0600-\u06FF]/.test(h)) return fallbacks.fa;
    return fallbacks.en;
}

/**
 * تبدیل تاریخچه به آرایه پیام‌های chat برای مدل
 */
function buildMessages(customerName, messageHistory, incomingMessage) {
    const messages = [];
    const history = messageHistory.slice(-MAX_HISTORY_MESSAGES);
    for (const m of history) {
        let content = (m.content || '').slice(0, 350).trim();
        content = content.replace(/^🤖\s*/, '').replace(/^AI KAYA:\s*/, '');
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
    const apiKey = await getOpenAIApiKey();
    if (!apiKey) {
        if (process.env.NODE_ENV !== 'test') logger.warn('AI: کلید OpenAI تنظیم نشده. از پنل واتساپ یا OPENAI_API_KEY در .env استفاده کنید.');
        return null;
    }
    const text = (incomingMessage || '').trim();
    if (!text) return null;

    if (shouldSkipAIResponse(text)) return null;
    if (!isValidInput(text)) return null;

    const companyKnowledge = getCompanyKnowledge();
    const companyText = formatKnowledgeForPrompt(companyKnowledge);
    const deptInfo = department ? `دپارتمان فعلی: ${department.name}. ${(department.description || '').slice(0, 150)}` : '';
    const customerName = (customer && customer.name && String(customer.name).trim()) ? customer.name : null;
    const systemPrompt = buildSystemPrompt(deptInfo, companyText, { customerName });
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

        const choice = response.data?.choices?.[0];
        const content = choice?.message?.content?.trim();
        if (!content) {
            if (choice?.finish_reason === 'content_filter' && process.env.NODE_ENV !== 'test') {
                logger.info('AI response filtered by OpenAI');
            }
            return null;
        }

        const cleaned = sanitizeResponse(content);
        if (!cleaned || cleaned.length < 5) return null;

        if (hasForbiddenContent(cleaned)) {
            if (process.env.NODE_ENV !== 'test') logger.info('AI response rejected: forbidden content', { preview: cleaned.slice(0, 80) });
            return getSafeFallback(text);
        }
        return cleaned;
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
 * @returns {Promise<boolean>}
 */
async function isAIAnswerEnabled() {
    const apiKey = await getOpenAIApiKey();
    if (!apiKey) return false;
    const enabled = process.env.AI_ANSWER_ENABLED;
    return enabled === undefined || enabled === '' || enabled === 'true' || enabled === '1';
}

module.exports = {
    generateAIResponse,
    isAIAnswerEnabled,
    isSimpleFactualQuestion
};

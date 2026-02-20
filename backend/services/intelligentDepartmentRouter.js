const axios = require('axios');

/**
 * سرویس هوشمند مسیریابی به دپارتمان
 * بر اساس فهم معنایی پیام مشتری، بهترین دپارتمان را انتخاب می‌کند.
 *
 * روش‌ها:
 * 1. تطابق کلمات کلیدی با امتیازدهی (هرچه تطابق بیشتر، امتیاز بالاتر)
 * 2. مترادف‌های رایج برای حوزه صرافی/حواله
 * 3. اختیاری: استفاده از OpenAI برای فهم معنایی عمیق‌تر
 */


// مترادف‌های رایج در حوزه صرافی، حواله، ارز
const SYNONYMS = {
    // حواله و انتقال
    'حواله': ['حواله', 'حواله ای', 'حواله‌ای', 'انتقال', 'وایر', 'wire', 'transfer', 'remittance', 'remit'],
    'انتقال': ['انتقال', 'حواله', 'وایر', 'transfer'],
    'وایر': ['وایر', 'wire', 'حواله', 'انتقال'],

    // ارزها
    'دلار': ['دلار', 'دلار آمریکا', 'usd', 'دلار امریکا', 'دلارامریکا'],
    'یورو': ['یورو', 'eur', 'یورو'],
    'درهم': ['درهم', 'aed', 'درهم امارات', 'درهم دبی'],
    'لیر': ['لیر', 'لیره', 'try', 'لیر ترکیه'],
    'پوند': ['پوند', 'gbp', 'پوند انگلیس'],

    // کشورها/مقاصد
    'امارات': ['امارات', 'دبی', 'uae', 'dubai', 'ابوظبی'],
    'ترکیه': ['ترکیه', 'ترکیه', 'turkey'],
    'اروپا': ['اروپا', 'europe', 'اتحادیه اروپا'],

    // عملیات
    'قیمت': ['قیمت', 'نرخ', 'rate', 'نرخ لحظه', 'قیمت لحظه'],
    'خرید': ['خرید', 'buy', 'خریداری'],
    'فروش': ['فروش', 'sell', 'فروشندگی'],
    'تبدیل': ['تبدیل', 'convert', 'تعویض', 'مبادله'],
    'مبلغ': ['مبلغ', 'مقدار', 'تعداد', 'amount', '100 هزار', 'هزار دلار', 'میلیون']
};

/**
 * کلمات پیام را نرمال‌سازی می‌کند و مترادف‌ها را گسترش می‌دهد
 */
function normalizeAndExpand(text) {
    if (!text || typeof text !== 'string') return [];
    const lower = text.toLowerCase().trim();
    const words = lower.split(/\s+/).filter(Boolean);
    const expanded = new Set(words);

    for (const word of words) {
        for (const [key, synonyms] of Object.entries(SYNONYMS)) {
            if (synonyms.some(s => word.includes(s) || s.includes(word))) {
                synonyms.forEach(s => expanded.add(s));
            }
        }
    }
    return Array.from(expanded);
}

/**
 * امتیاز تطابق یک دپارتمان با پیام را محاسبه می‌کند
 * @param {Object} dept - دپارتمان با keywords و description
 * @param {string} messageText - متن پیام
 * @returns {{ score: number, matchedKeywords: string[] }}
 */
function scoreDepartment(dept, messageText) {
    const msgLower = messageText.toLowerCase().trim();
    const msgWords = normalizeAndExpand(messageText);
    const matchedKeywords = [];

    if (!dept.keywords || !dept.keywords.trim()) {
        return { score: 0, matchedKeywords: [] };
    }

    const keywords = dept.keywords.split(',')
        .map(k => k.trim().toLowerCase())
        .filter(Boolean);

    let score = 0;

    for (const kw of keywords) {
        // تطابق مستقیم کلمه در متن
        if (msgLower.includes(kw)) {
            score += 10;
            matchedKeywords.push(kw);
            continue;
        }

        // تطابق با مترادف
        const kwSynonyms = Object.entries(SYNONYMS).find(([, syns]) =>
            syns.some(s => s === kw || kw.includes(s))
        );
        if (kwSynonyms) {
            const [, syns] = kwSynonyms;
            const hasMatch = syns.some(s => msgLower.includes(s));
            if (hasMatch) {
                score += 8;
                matchedKeywords.push(kw);
            }
        }

        // تطابق چندکلمه‌ای (عبارت کامل)
        if (kw.includes(' ') && msgLower.includes(kw)) {
            score += 5; // امتیاز اضافه برای عبارت کامل
        }
    }

    // اگر description هم تطابق داشته باشد، امتیاز اضافه
    if (dept.description) {
        const descWords = dept.description.toLowerCase().split(/\s+/);
        for (const w of descWords) {
            if (w.length > 2 && msgLower.includes(w)) {
                score += 2;
            }
        }
    }

    return { score, matchedKeywords };
}

/**
 * با استفاده از OpenAI (در صورت وجود کلید) فهم معنایی انجام می‌دهد
 */
async function detectDepartmentWithAI(messageText, departments) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || !messageText || !departments?.length) return null;

    const deptList = departments.map(d => ({
        id: d.id,
        name: d.name,
        keywords: d.keywords || '',
        description: (d.description || '').slice(0, 200)
    }));

    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `شما یک دستیار مسیریابی برای CRM صرافی هستید. بر اساس پیام مشتری، فقط ID دپارتمان مناسب را برگردانید.
دپارتمان‌ها:
${JSON.stringify(deptList, null, 2)}

فقط یک JSON برگردان: {"departmentId": "uuid"} یا {"departmentId": null} اگر هیچکدام مناسب نبود.`
                    },
                    {
                        role: 'user',
                        content: messageText
                    }
                ],
                temperature: 0.1,
                max_tokens: 100
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 8000
            }
        );

        const content = response.data?.choices?.[0]?.message?.content?.trim();
        if (!content) return null;

        const match = content.match(/\{"departmentId"\s*:\s*"([^"]+)"\}/) ||
            content.match(/departmentId["\s:]+([a-f0-9-]{36})/i);
        if (match) {
            const id = match[1];
            return departments.find(d => d.id === id) || null;
        }
        return null;
    } catch (err) {
        if (process.env.NODE_ENV !== 'test') console.warn('AI department detection failed:', err?.message);
        return null;
    }
}

/**
 * بهترین دپارتمان را برای پیام انتخاب می‌کند
 * @param {Object[]} departments - لیست دپارتمان‌های فعال
 * @param {string} messageContent - متن پیام مشتری
 * @param {Object} options - { useAI: boolean }
 * @returns {Promise<{ department: Object|null, method: string, confidence: number }>}
 */
async function selectBestDepartment(departments, messageContent, options = {}) {
    const useAI = options.useAI !== false && !!process.env.OPENAI_API_KEY;
    const text = (messageContent || '').trim();
    if (!text) {
        return { department: null, method: 'empty', confidence: 0 };
    }

    // 1. امتیازدهی بر اساس کلمات کلیدی
    const scored = departments.map(dept => {
        const { score, matchedKeywords } = scoreDepartment(dept, text);
        return { dept, score, matchedKeywords };
    }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);

    const best = scored[0];
    const secondBest = scored[1];

    // اگر بهترین امتیاز قابل قبول است و فاصله با دومین زیاد است
    const confidenceThreshold = 15;
    const gapThreshold = 5;
    const hasClearWinner = best &&
        best.score >= confidenceThreshold &&
        (!secondBest || (best.score - secondBest.score) >= gapThreshold);

    if (hasClearWinner) {
        return {
            department: best.dept,
            method: 'keywords',
            confidence: Math.min(100, best.score * 3),
            matchedKeywords: best.matchedKeywords
        };
    }

    // 2. اگر امتیاز کافی نبود و AI فعال است
    if (useAI) {
        const aiDept = await detectDepartmentWithAI(text, departments);
        if (aiDept) {
            return {
                department: aiDept,
                method: 'ai',
                confidence: 85
            };
        }
    }

    // 3. اگر باز هم بهترین امتیاز داریم (حتی کم)
    if (best && best.score > 0) {
        return {
            department: best.dept,
            method: 'keywords',
            confidence: Math.min(80, best.score * 2),
            matchedKeywords: best.matchedKeywords
        };
    }

    return { department: null, method: 'none', confidence: 0 };
}

module.exports = {
    selectBestDepartment,
    scoreDepartment,
    normalizeAndExpand,
    SYNONYMS
};

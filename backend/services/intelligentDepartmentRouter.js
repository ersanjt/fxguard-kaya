const axios = require('axios');
const logger = require('../config/logger');

/**
 * سرویس هوشمند مسیریابی به دپارتمان
 * بر اساس فهم معنایی پیام مشتری، بهترین دپارتمان را انتخاب می‌کند.
 *
 * روش‌ها:
 * 1. تطابق کلمات کلیدی با امتیازدهی (هرچه تطابق بیشتر، امتیاز بالاتر)
 * 2. مترادف‌های رایج برای حوزه صرافی/حواله
 * 3. اختیاری: استفاده از OpenAI برای فهم معنایی عمیق‌تر
 */


// مترادف‌ها و عبارات رایج در حوزه صرافی، حواله، ارز، پشتیبانی
const SYNONYMS = {
    // حواله و انتقال
    'حواله': ['حواله', 'حواله ای', 'حواله‌ای', 'حواله‌ای', 'انتقال', 'وایر', 'wire', 'transfer', 'remittance', 'remit', 'swift', 'سوئیفت', 'ارسال پول', 'فرستادن پول', 'پول فرستادن'],
    'انتقال': ['انتقال', 'حواله', 'وایر', 'transfer', 'انتقال وجه', 'انتقال ارز', 'انتقال پول'],
    'وایر': ['وایر', 'wire', 'حواله', 'انتقال', 'wire transfer', 'وایر ترنسفر'],
    'سوئیفت': ['swift', 'سوئیفت', 'swift code', 'کد سوئیفت'],

    // ارزها
    'دلار': ['دلار', 'دلار آمریکا', 'usd', 'دلار امریکا', 'دلارامریکا', '$', 'دلارامریکا', 'دلار آمریکایی'],
    'یورو': ['یورو', 'eur', '€', 'یورو اروپا'],
    'درهم': ['درهم', 'aed', 'درهم امارات', 'درهم دبی', 'درهم ابوظبی'],
    'لیر': ['لیر', 'لیره', 'try', 'لیر ترکیه', 'لیره ترکیه'],
    'پوند': ['پوند', 'gbp', 'پوند انگلیس', 'پوند انگلستان'],
    'ریال': ['ریال', 'ریال عربستان', 'sar', 'ریال سعودی'],
    'دینار': ['دینار', 'دینار عراق', 'دینار کویت', 'iqd', 'kwd'],
    'فرانک': ['فرانک', 'فرانک سوئیس', 'chf'],
    'ین': ['ین', 'ین ژاپن', 'jpy', 'yen'],
    'یوان': ['یوان', 'یوان چین', 'cny', 'rmb'],
    'ارز': ['ارز', 'currency', 'foreign exchange', 'فورکس', 'forex', 'صرافی'],

    // کشورها و مقاصد
    'امارات': ['امارات', 'دبی', 'uae', 'dubai', 'ابوظبی', 'شارجه', 'عجمان', 'راس الخیمه', 'فجیره', 'ام القیوین'],
    'ترکیه': ['ترکیه', 'turkey', 'استانبول', 'istanbul', 'آنکارا', 'ankara'],
    'اروپا': ['اروپا', 'europe', 'اتحادیه اروپا', 'eu', 'آلمان', 'فرانسه', 'ایتالیا', 'اسپانیا'],
    'عراق': ['عراق', 'iraq', 'بغداد', 'baghdad', 'ارbil', 'اربیل'],
    'کویت': ['کویت', 'kuwait', 'کویتی'],
    'عربستان': ['عربستان', 'saudi', 'سعودی', 'ریاض', 'جده'],
    'کانادا': ['کانادا', 'canada', 'تورنتو', 'ونکوور'],
    'استرالیا': ['استرالیا', 'australia', 'سیدنی', 'ملبورن'],
    'انگلیس': ['انگلیس', 'انگلستان', 'uk', 'لندن', 'london'],
    'چین': ['چین', 'china', 'هنگ کنگ', 'hong kong'],

    // عملیات و خدمات
    'قیمت': ['قیمت', 'نرخ', 'rate', 'نرخ لحظه', 'قیمت لحظه', 'نرخ امروز', 'قیمت امروز', 'چند', 'چقدر', 'مبلغ', 'هزینه'],
    'خرید': ['خرید', 'buy', 'خریداری', 'خریدن', 'میخوام بخرم', 'میخوام خرید'],
    'فروش': ['فروش', 'sell', 'فروشندگی', 'فروختن', 'میخوام بفروشم'],
    'تبدیل': ['تبدیل', 'convert', 'تعویض', 'مبادله', 'تعویض ارز', 'تبدیل ارز'],
    'مبلغ': ['مبلغ', 'مقدار', 'تعداد', 'amount', '100 هزار', 'هزار دلار', 'میلیون', 'میلیارد', 'تومان', 'مبلغ مورد نیاز', 'نیاز دارم', 'چند تا'],
    'کارمزد': ['کارمزد', 'کمیسیون', 'commission', 'هزینه انتقال', 'هزینه حواله'],
    'زمان': ['زمان', 'مدت', 'چند روز', 'چند ساعت', 'کی میرسه', 'کی واریز'],

    // پشتیبانی و شکایت
    'پشتیبانی': ['پشتیبانی', 'support', 'سوال', 'سوال دارم', 'راهنما', 'کمک', 'help'],
    'مشکل': ['مشکل', 'مشکلی', 'ایراد', 'خرابی', 'خطا', 'error', 'issue', 'باگ'],
    'شکایت': ['شکایت', 'اعتراض', 'complaint', 'ناراضی', 'نارضایتی'],
    'راهنما': ['راهنما', 'راهنمایی', 'guide', 'چطور', 'چگونه', 'چطوری', 'نحوه'],
    'سوال': ['سوال', 'سوال دارم', 'سوالی', 'question', 'پرسش'],

    // احراز هویت و مدارک
    'مدرک': ['مدرک', 'مدارک', 'document', 'شناسنامه', 'کارت ملی', 'پاسپورت', 'گذرنامه'],
    'احراز': ['احراز', 'احراز هویت', 'kyc', 'تایید', 'تایید هویت'],
    'ثبت نام': ['ثبت نام', 'ثبت‌نام', 'register', 'عضویت', 'اکانت'],

    // وضعیت و پیگیری
    'وضعیت': ['وضعیت', 'status', 'چطور شد', 'چی شد', 'رسید', 'واریز'],
    'پیگیری': ['پیگیری', 'track', 'tracking', 'ردیابی', 'کجا رسید'],
    'رسید': ['رسید', 'receipt', 'رسید حواله', 'receipt number'],

    // اصطلاحات عام
    'سلام': ['سلام', 'درود', 'hi', 'hello'],
    'نیاز': ['نیاز', 'نیاز دارم', 'میخوام', 'می‌خوام', 'خواستم', 'میخواستم']
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
            // امتیاز اضافه برای عبارت چندکلمه‌ای (مثل «دلار حواله ای»)
            if (kw.includes(' ') || kw.length >= 4) score += 2;
            continue;
        }

        // تطابق با مترادف
        const kwSynonyms = Object.entries(SYNONYMS).find(([, syns]) =>
            syns.some(s => s === kw || kw.includes(s) || s.includes(kw))
        );
        if (kwSynonyms) {
            const [, syns] = kwSynonyms;
            const matchedSyn = syns.find(s => msgLower.includes(s));
            if (matchedSyn) {
                score += 8;
                matchedKeywords.push(kw);
                // عبارت طولانی‌تر = امتیاز بیشتر
                if (matchedSyn.length >= 6) score += 2;
            }
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

    const timeout = parseInt(process.env.AI_REQUEST_TIMEOUT_MS, 10) || 12000;
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const systemPrompt = `شما دستیار مسیریابی CRM صرافی هستید. بر اساس پیام مشتری، فقط ID دپارتمان مناسب را برگردانید.
دپارتمان‌ها:
${JSON.stringify(deptList, null, 2)}

فقط یک JSON برگردانید. مثال: {"departmentId": "uuid"} یا {"departmentId": null} اگر هیچکدام مناسب نبود. هیچ متن دیگری ننویسید.`;

    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: messageText }
                ],
                temperature: 0.1,
                max_tokens: 120
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout
            }
        );

        const content = response.data?.choices?.[0]?.message?.content?.trim();
        if (!content) return null;

        // پارس departmentId از خروجی مدل
        let id = null;
        const uuidRegex = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i;
        const jsonBlock = content.match(/\{[\s\S]*\}/);
        if (jsonBlock) {
            try {
                const parsed = JSON.parse(jsonBlock[0]);
                id = (parsed?.departmentId && typeof parsed.departmentId === 'string') ? parsed.departmentId : null;
            } catch (_) { /* fallback to regex */ }
        }
        if (!id) {
            const m = content.match(/departmentId["\s:]+["']?([a-f0-9-]{36})["']?/i) || content.match(uuidRegex);
            id = m ? (m[1] || m[0]) : null;
        }
        if (id) return departments.find(d => d.id === id) || null;
        return null;
    } catch (err) {
        if (process.env.NODE_ENV !== 'test') logger.warn('AI department detection failed', { error: err?.message });
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

/**
 * امتیاز تطابق یک کاربر با پیام (بر اساس تخصص/کلمات کلیدی)
 */
function scoreUserSkills(user, messageText) {
    const skills = (user.settings && user.settings.skillsKeywords) || '';
    if (!skills || !messageText) return 0;
    const msgLower = messageText.toLowerCase().trim();
    const keywords = skills.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
    let score = 0;
    for (const kw of keywords) {
        if (msgLower.includes(kw)) {
            score += 10;
            continue;
        }
        const kwSynonyms = Object.entries(SYNONYMS).find(([, syns]) =>
            syns.some(s => s === kw || kw.includes(s) || s.includes(kw))
        );
        if (kwSynonyms && kwSynonyms[1].some(s => msgLower.includes(s))) score += 8;
    }
    return score;
}

/** امتیاز وضعیت آنلاین: online=20, away=10, busy=5, offline=0 */
const STATUS_SCORE = { online: 20, away: 10, busy: 5, offline: 0 };

/**
 * بهترین کارمند را برای مکالمه انتخاب می‌کند
 * @param {Object[]} users - لیست کاربران دپارتمان (با conversations برای load)
 * @param {string} messageContent - متن پیام مشتری
 * @param {Object} options - { customerId, previousAssigneeId }
 */
function selectBestUser(users, messageContent, options = {}) {
    if (!users || users.length === 0) return null;
    if (users.length === 1) return users[0];

    const text = (messageContent || '').trim();
    const { customerId, previousAssigneeId } = options;

    const scored = users.map(user => {
        let score = 0;
        const openCount = (user.conversations && user.conversations.length) || 0;

        // 1. تخصص (کلمات کلیدی کاربر) — امتیاز اصلی
        const skillsScore = scoreUserSkills(user, text);
        score += skillsScore;

        // 2. مشتری قبلاً با این کارمند کار کرده — تداوم رابطه
        if (previousAssigneeId && user.id === previousAssigneeId) {
            score += 25;
        }

        // 3. وضعیت آنلاین — اولویت با کسی که الان آنلاین است
        const statusScore = STATUS_SCORE[user.status] || 0;
        score += statusScore;

        // 4. بار کاری کمتر — امتیاز منفی برای load balancing
        score -= openCount * 3;

        return { user, score, openCount, skillsScore, statusScore };
    });

    scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.openCount - b.openCount; // در تساوی، کم‌بارتر
    });

    return scored[0] ? scored[0].user : users[0];
}

module.exports = {
    selectBestDepartment,
    selectBestUser,
    scoreDepartment,
    scoreUserSkills,
    normalizeAndExpand,
    SYNONYMS
};

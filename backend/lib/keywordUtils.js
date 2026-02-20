/**
 * نرمال‌سازی کلمات کلیدی دپارتمان
 * - جدا کردن با کاما
 * - حذف تکراری‌ها
 * - اصلاح غلط‌های رایج
 */
const TYPO_FIXES = {
    'سولیفت': 'سوئیفت',
    'سویفت': 'سوئیفت',
    'خوانه': 'حواله',
    'در هم': 'درهم',
    'درهم ': 'درهم',
    'ایما': 'امارات',
    'ایمارات': 'امارات',
    'واین': 'وایر',
    'واییر': 'وایر'
};

/**
 * رشته کلمات کلیدی را نرمال می‌کند
 * @param {string} raw - متن خام (مثلاً "حواله حواله ای انتقال دلار")
 * @returns {string} - "حواله, حواله ای, انتقال, دلار"
 */
function normalizeKeywords(raw) {
    if (!raw || typeof raw !== 'string') return '';
    let s = raw.trim();
    if (!s) return '';

    // جدا کردن با کاما، نقطه‌ویرگول، یا فاصله‌های متعدد
    const parts = s.split(/[,،;\s]+/).map(p => p.trim()).filter(Boolean);

    const seen = new Set();
    const result = [];

    for (let p of parts) {
        // ادغام «در» + «هم» → «درهم»
        if (p === 'هم' && result[result.length - 1] === 'در') {
            result.pop();
            p = 'درهم';
        }
        const fixed = TYPO_FIXES[p] || p;
        const key = fixed.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(fixed);
    }

    return result.join(', ');
}

/**
 * اصلاح غلط‌های رایج در توضیحات
 */
function normalizeDescription(raw) {
    if (!raw || typeof raw !== 'string') return raw;
    return raw
        .replace(/سفر کدوها/g, 'سایر کشورها')
        .replace(/واین/g, 'وایر')
        .replace(/ایما و/g, 'امارات و')
        .trim();
}

module.exports = { normalizeKeywords, normalizeDescription };

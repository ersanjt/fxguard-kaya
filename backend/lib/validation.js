/**
 * توابع کمکی اعتبارسنجی
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(str) {
    return str && typeof str === 'string' && UUID_REGEX.test(str.trim());
}

function parsePagination(page, limit, maxLimit = 200) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(maxLimit, Math.max(1, parseInt(limit, 10) || 20));
    return { page: p, limit: l, offset: (p - 1) * l };
}

/**
 * رشتهٔ ورودی را برای ذخیره/نمایش امن می‌کند: trim و محدودیت طول
 * @param {*} value - مقدار ورودی (معمولاً از req.body)
 * @param {number} maxLength - حداکثر طول مجاز (پیش‌فرض ۱۰۰۰۰)
 * @returns {string|null} - رشتهٔ امن یا null اگر ورودی معتبر نبود
 */
function safeString(value, maxLength = 10000) {
    if (value == null) return null;
    const s = String(value).trim();
    if (s.length === 0) return null;
    if (s.length > maxLength) return s.slice(0, maxLength);
    return s;
}

module.exports = { isValidUUID, parsePagination, safeString };

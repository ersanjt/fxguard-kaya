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

module.exports = { isValidUUID, parsePagination };

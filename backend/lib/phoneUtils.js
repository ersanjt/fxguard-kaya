/**
 * نرمال‌سازی شماره تلفن برای واتساپ
 * واتساپ فرمت 989121234567 (کد کشور + شماره بدون صفر اول) می‌خواهد.
 * شناسه‌های LID واتساپ (@lid) شمارهٔ واقعی نیستند و باید جداگانه مدیریت شوند.
 */

const PHONE_CC_PREFIXES = [
    '98', '90', '971', '966', '964', '93', '994', '992', '993', '996', '998',
    '1', '7', '20', '27', '30', '31', '32', '33', '34', '36', '39', '40', '41',
    '43', '44', '45', '46', '47', '48', '49', '51', '52', '53', '54', '55', '56',
    '57', '58', '60', '61', '62', '63', '64', '65', '66', '81', '82', '84', '86',
    '91', '92', '94', '95', '852', '853', '855', '856', '880', '886', '960', '961',
    '962', '963', '965', '967', '968', '970', '972', '973', '974', '975', '976', '977',
];

function stripWhatsAppSuffix(val) {
    return String(val || '')
        .trim()
        .replace(/@(c\.us|s\.whatsapp\.net|lid|g\.us)$/i, '');
}

function extractDigits(val) {
    return stripWhatsAppSuffix(val).replace(/\D/g, '');
}

/**
 * رقم‌های شماره را برای تشخیص E.164 آماده می‌کند:
 * ۰۰ بین‌المللی و صفر محلی (۰۹…) را حذف می‌کند.
 * بدون این، «۰۰۹۸۹…» به‌اشتباه LID می‌شود.
 */
function canonicalizePhoneDigits(val) {
    let s = extractDigits(val);
    while (s.startsWith('00')) s = s.slice(2);
    if (/^0\d{9,11}$/.test(s)) s = s.slice(1);
    return s;
}

function isKnownPhoneDigits(digits) {
    if (!digits) return false;
    if (/^989\d{9}$/.test(digits)) return true;
    if (/^90\d{10}$/.test(digits)) return true;
    if (/^971\d{8,9}$/.test(digits)) return true;
    return PHONE_CC_PREFIXES.some((cc) => digits.startsWith(cc) && digits.length >= cc.length + 8 && digits.length <= cc.length + 12);
}

/** آیا این مقدار شناسهٔ گروه واتساپ است؟ */
function isGroupJid(val) {
    return /@g\.us$/i.test(String(val || '').trim());
}

/** آیا این مقدار (یا رقم‌هایش) شبیه LID واتساپ است نه شمارهٔ E.164؟ */
function isLikelyWhatsAppLid(val) {
    const s = String(val || '').trim();
    if (isGroupJid(s) || /@(c\.us|s\.whatsapp\.net)$/i.test(s)) return false;
    const digits = canonicalizePhoneDigits(s);
    if (!digits || digits.length < 8 || digits.length > 20) return false;
    // شمارهٔ واقعی که فقط با @lid یا ۰۰ اشتباه ذخیره شده
    if (isKnownPhoneDigits(digits)) return false;
    if (/@lid$/i.test(s)) return true;
    // اگر با هیچ پیش‌شمارهٔ شناخته‌شده‌ای شروع نشود → LID
    return true;
}

function normalizePhone(val) {
    if (val == null || val === '') return '';
    const raw = String(val).trim();
    if (isGroupJid(raw)) return raw;
    let s = canonicalizePhoneDigits(raw);
    if (!s) return '';
    // LID واقعی: رقم‌ها را دست نزن / کد کشور نچسبان
    if (isLikelyWhatsAppLid(raw) && !isKnownPhoneDigits(s)) {
        return s;
    }
    // اگر کد کشور ندارد و طول مناسب است، 98 اضافه کن
    if (s && !s.startsWith('98') && s.length <= 10) s = '98' + s;
    return s;
}

/**
 * هدف ارسال پیام:
 * - گروه: شناسه کامل @g.us
 * - LID: digits@lid (نه @c.us)
 * - شماره: رقم‌های نرمال‌شده برای gateway/Cloud
 */
function getSendTarget(phone) {
    if (phone == null || phone === '') return '';
    const s = String(phone).trim();
    if (isGroupJid(s)) return s;
    const digits = canonicalizePhoneDigits(s);
    if (!digits) return '';
    // شمارهٔ واقعی که اشتباه با @lid یا ۰۰ ذخیره شده → رقم E.164
    if (isKnownPhoneDigits(digits) || (!/@lid$/i.test(s) && !isLikelyWhatsAppLid(s))) {
        return normalizePhone(s) || digits;
    }
    if (/@lid$/i.test(s) || isLikelyWhatsAppLid(s)) {
        return `${digits}@lid`;
    }
    return normalizePhone(s) || s;
}

/**
 * Chat ID کامل برای whatsapp-web.js
 */
function toWhatsAppChatId(phoneOrJid) {
    const target = getSendTarget(phoneOrJid);
    if (!target) return '';
    if (target.includes('@')) return target;
    return `${target}@c.us`;
}

module.exports = {
    normalizePhone,
    getSendTarget,
    toWhatsAppChatId,
    isLikelyWhatsAppLid,
    isGroupJid,
    extractDigits,
    stripWhatsAppSuffix,
};

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

/** آیا این مقدار شناسهٔ گروه واتساپ است؟ */
function isGroupJid(val) {
    return /@g\.us$/i.test(String(val || '').trim());
}

/** آیا این مقدار (یا رقم‌هایش) شبیه LID واتساپ است نه شمارهٔ E.164؟ */
function isLikelyWhatsAppLid(val) {
    const s = String(val || '').trim();
    if (/@lid$/i.test(s)) return true;
    if (isGroupJid(s) || /@(c\.us|s\.whatsapp\.net)$/i.test(s)) return false;
    const digits = extractDigits(s);
    if (!digits || digits.length < 8 || digits.length > 20) return false;
    // شماره‌های رایج منطقه ما را شماره حساب کن
    if (/^989\d{9}$/.test(digits)) return false;
    if (/^90\d{10}$/.test(digits)) return false;
    if (/^971\d{8,9}$/.test(digits)) return false;
    // اگر با هیچ پیش‌شمارهٔ شناخته‌شده‌ای شروع نشود → LID
    const matchedCc = PHONE_CC_PREFIXES.some((cc) => digits.startsWith(cc) && digits.length >= cc.length + 8);
    return !matchedCc;
}

function normalizePhone(val) {
    if (val == null || val === '') return '';
    const raw = String(val).trim();
    if (isGroupJid(raw)) return raw;
    if (/@lid$/i.test(raw) || isLikelyWhatsAppLid(raw)) {
        // LID را نرمال به رقم نکن / کد کشور نچسبان
        const digits = extractDigits(raw);
        return digits || '';
    }
    let s = extractDigits(raw);
    if (!s) return '';
    // حذف صفر اول برای شماره‌های ایرانی (مثل 09121234567)
    if (s.startsWith('0') && s.length > 10) s = s.slice(1);
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
    if (/@lid$/i.test(s)) {
        const digits = extractDigits(s);
        return digits ? `${digits}@lid` : s;
    }
    if (isLikelyWhatsAppLid(s)) {
        const digits = extractDigits(s);
        return digits ? `${digits}@lid` : '';
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

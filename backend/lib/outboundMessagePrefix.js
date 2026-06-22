'use strict';

const DEFAULT_PREFIX = 'این پیام از دپارتمان {{deptName}} {{name}} می‌باشد.';
const DEFAULT_CALL_INTRO =
    'از مجموعه {{orgName}}، دپارتمان {{deptName}}، {{honorific}}{{name}} با شما تماس می‌گیرد.';

/**
 * نام نمایشی کاربر در پیام‌های واتساپ (اولویت: whatsappSenderName)
 */
function getUserWhatsAppSenderName(user) {
    if (!user) return null;
    const dedicated = (user.whatsappSenderName || '').trim();
    if (dedicated) return dedicated;
    const fromParts = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    if (fromParts) return fromParts;
    const fromName = (user.name || '').trim();
    if (fromName) return fromName;
    return (user.username || '').trim() || null;
}

function getDepartmentName(department) {
    return (department && department.name && String(department.name).trim()) || 'پشتیبانی';
}

function getOrganizationName(siteName) {
    const n = (siteName && String(siteName).trim()) || '';
    return n || 'کایا هولدینگ';
}

/** آقای / خانم — از فیلد اختیاری یا خالی */
function getUserHonorific(user) {
    if (!user) return '';
    const h = (user.whatsappHonorific || '').trim();
    if (!h) return '';
    if (h === 'male' || h === 'm') return 'آقای ';
    if (h === 'female' || h === 'f') return 'خانم ';
    return h.endsWith(' ') ? h : `${h} `;
}

function applyStaffTemplate(tpl, { orgName, deptName, name, honorific }) {
    return tpl
        .replace(/\{\{orgName\}\}/g, orgName)
        .replace(/\{\{deptName\}\}/g, deptName)
        .replace(/\{\{honorific\}\}/g, honorific || '')
        .replace(/\{\{name\}\}/g, name);
}

function buildPrefixLine(user, department, template) {
    const name = getUserWhatsAppSenderName(user);
    if (!name) return null;
    const deptName = getDepartmentName(department);
    const tpl = (template && String(template).trim()) || DEFAULT_PREFIX;
    return applyStaffTemplate(tpl, { orgName: getOrganizationName(), deptName, name, honorific: '' });
}

/**
 * متن معرفی قبل از تماس واتساپ (ارسال به مشتری)
 */
function buildCallIntroText(user, department, orgName, template) {
    const name = getUserWhatsAppSenderName(user);
    if (!name) return null;
    const deptName = getDepartmentName(department);
    const tpl = (template && String(template).trim()) || DEFAULT_CALL_INTRO;
    return applyStaffTemplate(tpl, {
        orgName: getOrganizationName(orgName),
        deptName,
        name,
        honorific: getUserHonorific(user),
    });
}

/**
 * نام کوتاه برای مشتری — «E. Tabrizi» نه «Ersan Jahed Tabrizi»
 */
function getUserWhatsAppShortName(user) {
    if (!user) return null;
    const first = (user.firstName || '').trim();
    const last = (user.lastName || '').trim();
    if (first && last) {
        return `${first.charAt(0)}. ${last}`;
    }
    const full = getUserWhatsAppSenderName(user);
    if (!full) return null;
    const parts = full.split(/\s+/).filter(Boolean);
    if (parts.length <= 1) return parts[0] || null;
    return `${parts[0].charAt(0)}. ${parts[parts.length - 1]}`;
}

function isStaffSignaturePrefixEnabled() {
    const v = String(process.env.WHATSAPP_OUTBOUND_STAFF_PREFIX ?? '1').trim().toLowerCase();
    return v !== '0' && v !== 'false' && v !== 'no' && v !== 'off';
}

/**
 * متن ارسالی به مشتری — «E. Tabrizi: سلام» برای تشخیص کارشناس در چت مشترک
 */
function applyStaffSignatureToOutboundText(user, content) {
    const body = (content || '').trim();
    if (!body || !isStaffSignaturePrefixEnabled()) return body;
    const short = getUserWhatsAppShortName(user);
    if (!short) return body;
    const prefix = `${short}: `;
    if (body.startsWith(prefix)) return body;
    const esc = short.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`^${esc}\\s*:\\s*`, 'i').test(body)) return body;
    return prefix + body;
}

const MEDIA_KIND_ICONS = {
    image: '📷',
    video: '🎬',
    audio: '🎤',
    document: '📎',
};

/**
 * کپشن واتساپ برای مدیا بدون متن — «E. Tabrizi: 📷»
 */
function buildStaffMediaCaption(user, msgType, content) {
    const body = (content || '').trim();
    if (body) return applyStaffSignatureToOutboundText(user, body);
    if (!isStaffSignaturePrefixEnabled()) return '';
    const short = getUserWhatsAppShortName(user);
    if (!short) return '';
    const kind = String(msgType || 'document').toLowerCase();
    const icon = MEDIA_KIND_ICONS[kind] || MEDIA_KIND_ICONS.document;
    return `${short}: ${icon}`;
}

/**
 * متن فوروارد برای مشتری — «E. Tabrizi: ↪️ از علی\nمتن اصلی»
 */
function buildForwardOutboundText(user, content, forwardedFrom) {
    const body = (content || '').trim();
    const fromName =
        (forwardedFrom && (forwardedFrom.customerName || forwardedFrom.fromCustomerName || '')).trim() || '';
    const fwdTag = fromName ? `↪️ از ${fromName}` : '↪️ فوروارد';
    const combined = body ? `${fwdTag}\n${body}` : fwdTag;
    return applyStaffSignatureToOutboundText(user, combined);
}

/**
 * خط کوتاه قبل از PTT — روی caption ویس نمی‌رود تا دانلود خراب نشود
 */
function buildStaffVoiceIntroText(user, forwardedFrom) {
    if (forwardedFrom) {
        return buildForwardOutboundText(user, '🎤', forwardedFrom);
    }
    return applyStaffSignatureToOutboundText(user, '🎤');
}

/**
 * @returns {{ ok: boolean, error?: string }}
 */
function validateOutboundSender(user) {
    if (!user) {
        return { ok: false, error: 'کاربر ارسال‌کننده یافت نشد.' };
    }
    const name = getUserWhatsAppSenderName(user);
    if (name) return { ok: true };
    const short = getUserWhatsAppShortName(user);
    if (short) return { ok: true };
    const fallback = String(user.username || user.email || user.name || '').trim();
    if (fallback) return { ok: true };
    return {
        ok: false,
        error:
            'نام شما برای پیام‌های واتساپ ثبت نشده است. از مدیر سیستم بخواهید نام/نام‌خانوادگی یا «نام در پیام واتساپ» را در حساب کاربری شما تکمیل کند.',
    };
}

/**
 * متن ارسالی به واتساپ — بدون پیشوند تکراری (معرفی کارشناس جداگانه یک‌بار ارسال می‌شود).
 * @param {object} [options]
 * @param {boolean} [options.includePrefix=false] — فقط برای سازگاری قدیمی
 */
function buildWhatsAppOutboundText(user, department, content, options) {
    const opts =
        typeof options === 'string' ? { template: options, includePrefix: false } : options || {};
    const body = (content || '').trim();
    if (!opts.includePrefix) return body;
    const prefix = buildPrefixLine(user, department, opts.template);
    if (!prefix) return body;
    if (!body) return prefix;
    return `${prefix}\n\n${body}`;
}

module.exports = {
    getUserWhatsAppSenderName,
    getUserWhatsAppShortName,
    getDepartmentName,
    getOrganizationName,
    buildWhatsAppOutboundText,
    buildCallIntroText,
    validateOutboundSender,
    applyStaffSignatureToOutboundText,
    buildStaffMediaCaption,
    buildForwardOutboundText,
    buildStaffVoiceIntroText,
    isStaffSignaturePrefixEnabled,
    DEFAULT_PREFIX,
    DEFAULT_CALL_INTRO,
};

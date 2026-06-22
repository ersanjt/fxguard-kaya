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
 * @returns {{ ok: boolean, error?: string }}
 */
function validateOutboundSender(user) {
    const name = getUserWhatsAppSenderName(user);
    if (!name) {
        return {
            ok: false,
            error:
                'نام شما برای پیام‌های واتساپ ثبت نشده است. از مدیر سیستم بخواهید در حساب کاربری شما «نام در پیام واتساپ» را تکمیل کند.',
        };
    }
    return { ok: true };
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
    getDepartmentName,
    getOrganizationName,
    buildWhatsAppOutboundText,
    buildCallIntroText,
    validateOutboundSender,
    DEFAULT_PREFIX,
    DEFAULT_CALL_INTRO,
};

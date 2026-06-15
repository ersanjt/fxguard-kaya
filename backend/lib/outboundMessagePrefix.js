'use strict';

const DEFAULT_PREFIX = 'این پیام از دپارتمان {{deptName}} {{name}} می‌باشد.';

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

function buildPrefixLine(user, department, template) {
    const name = getUserWhatsAppSenderName(user);
    if (!name) return null;
    const deptName = getDepartmentName(department);
    const tpl = (template && String(template).trim()) || DEFAULT_PREFIX;
    return tpl.replace(/\{\{deptName\}\}/g, deptName).replace(/\{\{name\}\}/g, name);
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
 * متن ارسالی به واتساپ — با پیشوند معرفی کارمند
 */
function buildWhatsAppOutboundText(user, department, content, template) {
    const prefix = buildPrefixLine(user, department, template);
    if (!prefix) return content || '';
    const body = (content || '').trim();
    if (!body) return prefix;
    return `${prefix}\n\n${body}`;
}

module.exports = {
    getUserWhatsAppSenderName,
    buildWhatsAppOutboundText,
    validateOutboundSender,
    DEFAULT_PREFIX,
};

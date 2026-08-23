/**
 * پنهان‌سازی شماره تلفن مشتری برای کاربرانی که دسترسی view_customer_phone ندارند.
 * اگر نام مخاطب همان شماره باشد (واتساپ بدون اسم ذخیره‌شده)، نام هم باید پنهان شود.
 */
const { canViewCustomerPhone } = require('./permissions');
const {
    isGroupJid,
    isKnownPhoneDigits,
    canonicalizePhoneDigits,
    extractDigits,
} = require('./phoneUtils');

function toPlain(row) {
    if (!row) return row;
    if (typeof row.toJSON === 'function') return row.toJSON();
    return { ...row };
}

function looksLikePhoneValue(val, knownPhone) {
    const s = String(val || '').trim();
    if (!s) return false;
    if (isGroupJid(s)) return false;
    const stripped = s
        .replace(/^مشتری\s+/i, '')
        .replace(/^customer\s+/i, '')
        .replace(/^müşteri\s+/i, '')
        .trim();
    const digits = canonicalizePhoneDigits(stripped);
    if (isKnownPhoneDigits(digits)) return true;
    const compact = stripped.replace(/[\s\-.()+]/g, '');
    if (/^\d{8,15}$/.test(compact)) return true;
    if (/^\+?\d[\d\s\-()]{7,22}$/.test(stripped) && extractDigits(stripped).length >= 8) return true;
    if (knownPhone) {
        const phoneDigits = canonicalizePhoneDigits(knownPhone);
        const nameDigits = extractDigits(s);
        if (phoneDigits && phoneDigits.length >= 8 && nameDigits.includes(phoneDigits)) return true;
        const last10 = phoneDigits.slice(-10);
        if (last10.length >= 8 && nameDigits.includes(last10)) return true;
    }
    return false;
}

function redactCustomerPhone(customer, user) {
    if (!customer) return customer;
    const c = { ...toPlain(customer) };
    if (canViewCustomerPhone(user)) return c;
    if (isGroupJid(c.phone)) return c;
    if (looksLikePhoneValue(c.name, c.phone)) {
        c.name = '';
    }
    c.phone = null;
    return c;
}

function redactNestedCustomer(record, user) {
    if (!record) return record;
    const j = toPlain(record);
    if (j.customer) j.customer = redactCustomerPhone(j.customer, user);
    if (j.customerPhone && !canViewCustomerPhone(user)) j.customerPhone = null;
    if (j.phone && j.customerId && !canViewCustomerPhone(user) && !isGroupJid(j.phone)) {
        if (looksLikePhoneValue(j.phone)) j.phone = null;
    }
    return j;
}

function redactConversationPhones(conversation, user) {
    return redactNestedCustomer(conversation, user);
}

function redactConversationList(rows, user) {
    if (!Array.isArray(rows)) return rows;
    return rows.map((row) => redactConversationPhones(row, user));
}

function redactMessagePhones(message, user) {
    const m = toPlain(message);
    if (!m || canViewCustomerPhone(user)) return m;
    if (m.metadata && typeof m.metadata === 'object') {
        const meta = { ...m.metadata };
        const sid = meta.senderId;
        if (sid && (looksLikePhoneValue(sid) || /@(c\.us|s\.whatsapp\.net|lid)$/i.test(String(sid)))) {
            delete meta.senderId;
        }
        if (looksLikePhoneValue(meta.senderName, sid)) {
            meta.senderName = null;
        }
        m.metadata = meta;
    }
    return m;
}

function redactMessageList(rows, user) {
    if (!Array.isArray(rows)) return rows;
    return rows.map((row) => redactMessagePhones(row, user));
}

/** برای broadcast سوکت — شماره را هرگز نفرست (گیرندگان دسترسی‌های متفاوت دارند). */
function publicCustomerSocketPayload(customer) {
    if (!customer) return undefined;
    const c = toPlain(customer);
    const nameLooksLikePhone = looksLikePhoneValue(c.name, c.phone);
    return {
        id: c.id,
        name: nameLooksLikePhone ? '' : c.name,
        phone: null,
        profilePic: c.profilePic,
    };
}

module.exports = {
    looksLikePhoneValue,
    redactCustomerPhone,
    redactNestedCustomer,
    redactConversationPhones,
    redactConversationList,
    redactMessagePhones,
    redactMessageList,
    publicCustomerSocketPayload,
    canViewCustomerPhone,
};

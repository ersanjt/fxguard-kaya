/**
 * پنهان‌سازی شماره تلفن مشتری برای کاربرانی که دسترسی view_customer_phone ندارند.
 */
const { canViewCustomerPhone } = require('./permissions');

function toPlain(row) {
    if (!row) return row;
    if (typeof row.toJSON === 'function') return row.toJSON();
    return { ...row };
}

function redactCustomerPhone(customer, user) {
    if (!customer) return customer;
    if (canViewCustomerPhone(user)) return toPlain(customer);
    const c = { ...toPlain(customer) };
    c.phone = null;
    return c;
}

function redactConversationPhones(conversation, user) {
    if (!conversation) return conversation;
    const j = toPlain(conversation);
    if (!canViewCustomerPhone(user) && j.customer) {
        j.customer = redactCustomerPhone(j.customer, user);
    }
    return j;
}

function redactConversationList(rows, user) {
    if (!Array.isArray(rows)) return rows;
    return rows.map((row) => redactConversationPhones(row, user));
}

/** برای broadcast سوکت — شماره را هرگز نفرست (گیرندگان دسترسی‌های متفاوت دارند). */
function publicCustomerSocketPayload(customer) {
    if (!customer) return undefined;
    return {
        id: customer.id,
        name: customer.name,
        phone: null,
        profilePic: customer.profilePic,
    };
}

module.exports = {
    redactCustomerPhone,
    redactConversationPhones,
    redactConversationList,
    publicCustomerSocketPayload,
    canViewCustomerPhone,
};

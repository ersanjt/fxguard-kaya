/**
 * شناسایی کاربر CRM مرتبط با پیام‌های ارسالی از اپ واتساپ روی موبایل (fromMe).
 * شمارهٔ متصل Gateway معمولاً متعلق به مالک کسب‌وکار است — نباید به assignee مکالمه نسبت داده شود.
 */
const { User } = require('../models');
const { normalizePhone } = require('./phoneUtils');
const { gatewayGet } = require('./gatewayClient');

let _cached = { at: 0, userId: null, gatewayNumber: null, gatewayName: null };

async function resolveMobileWhatsappUser(logger) {
    const now = Date.now();
    if (_cached.at && now - _cached.at < 60000) {
        return { userId: _cached.userId, gatewayNumber: _cached.gatewayNumber, gatewayName: _cached.gatewayName };
    }

    let gatewayNumber = null;
    let gatewayName = null;
    try {
        const gw = await gatewayGet('/api/status', { timeout: 8000 });
        gatewayNumber = gw?.data?.number || null;
        gatewayName = gw?.data?.pushname || null;
    } catch (e) {
        if (logger && logger.warn) logger.warn('resolveMobileWhatsappUser: gateway status failed', { err: e?.message });
    }

    let userId = null;
    const normGw = gatewayNumber ? normalizePhone(gatewayNumber) : '';

    if (normGw) {
        const users = await User.findAll({
            where: { isActive: true },
            attributes: ['id', 'phone', 'role'],
            order: [['role', 'ASC']],
        });
        for (const u of users) {
            if (u.phone && normalizePhone(u.phone) === normGw) {
                userId = u.id;
                break;
            }
        }
    }

    if (!userId) {
        const owner = await User.findOne({
            where: { role: 'owner', isActive: true },
            order: [['createdAt', 'ASC']],
            attributes: ['id'],
        });
        if (owner) userId = owner.id;
    }

    _cached = { at: now, userId, gatewayNumber, gatewayName };
    return { userId, gatewayNumber, gatewayName };
}

module.exports = { resolveMobileWhatsappUser };

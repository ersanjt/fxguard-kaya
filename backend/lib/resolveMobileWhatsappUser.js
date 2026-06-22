/**
 * شناسایی کاربر CRM مرتبط با پیام‌های ارسالی از اپ واتساپ روی موبایل (fromMe).
 * خط واتساپ فقط دست مالک کسب‌وکار است — هرگز assignee، pushname واتساپ یا ادمین فنی نیست.
 */
const { Op } = require('sequelize');
const { User } = require('../models');
const { gatewayGet } = require('./gatewayClient');
const { MAIN_ADMIN_EMAILS } = require('./permissions');

const MOBILE_USER_ATTRS = ['id', 'name', 'username', 'avatar', 'firstName', 'lastName', 'whatsappSenderName', 'email', 'position'];

let _cached = { at: 0, userId: null, gatewayNumber: null, gatewayName: null, resolvedBy: null };

function parseMsgMetadata(raw) {
    if (!raw) return {};
    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw);
        } catch (_) {
            return {};
        }
    }
    return raw;
}

function isCrmPanelOutboundMessage(msg) {
    return parseMsgMetadata(msg && msg.metadata).sendSource === 'crm_panel';
}

function isWhatsappMobileOutboundMessage(msg) {
    return parseMsgMetadata(msg && msg.metadata).sendSource === 'whatsapp_mobile';
}

function isMainAdminEmail(email) {
    if (!email || !MAIN_ADMIN_EMAILS.length) return false;
    return MAIN_ADMIN_EMAILS.includes(String(email).trim().toLowerCase());
}

function isAllowedMobileOwnerUser(userRow) {
    if (!userRow || userRow.isActive === false) return false;
    return !isMainAdminEmail(userRow.email);
}

function configuredMobileEmails() {
    const emails = [];
    const single = String(process.env.WHATSAPP_MOBILE_USER_EMAIL || '').trim().toLowerCase();
    if (single) emails.push(single);
    const list = String(process.env.WHATSAPP_MOBILE_USER_EMAILS || '').split(',');
    for (const item of list) {
        const e = String(item || '').trim().toLowerCase();
        if (e && !emails.includes(e)) emails.push(e);
    }
    return emails;
}

function invalidateMobileWhatsappUserCache() {
    _cached = { at: 0, userId: null, gatewayNumber: null, gatewayName: null, resolvedBy: null };
}

async function resolveMobileWhatsappUser(logger) {
    const now = Date.now();
    if (_cached.at && now - _cached.at < 60000) {
        return {
            userId: _cached.userId,
            gatewayNumber: _cached.gatewayNumber,
            gatewayName: _cached.gatewayName,
            resolvedBy: _cached.resolvedBy,
        };
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
    let resolvedBy = null;

    const envMobileUserId = String(process.env.WHATSAPP_MOBILE_USER_ID || '').trim();
    if (envMobileUserId) {
        const envUser = await User.findByPk(envMobileUserId, { attributes: ['id', 'isActive', 'email'] });
        if (isAllowedMobileOwnerUser(envUser)) {
            userId = envUser.id;
            resolvedBy = 'WHATSAPP_MOBILE_USER_ID';
        }
    }

    if (!userId) {
        for (const email of configuredMobileEmails()) {
            const byEmail = await User.findOne({
                where: { email, isActive: true },
                attributes: ['id', 'email', 'isActive'],
            });
            if (isAllowedMobileOwnerUser(byEmail)) {
                userId = byEmail.id;
                resolvedBy = 'WHATSAPP_MOBILE_USER_EMAIL';
                break;
            }
        }
    }

    if (!userId) {
        const envUsername = String(process.env.WHATSAPP_MOBILE_USER_USERNAME || '').trim();
        if (envUsername) {
            const byUsername = await User.findOne({
                where: { username: envUsername, isActive: true },
                attributes: ['id', 'email', 'isActive'],
            });
            if (isAllowedMobileOwnerUser(byUsername)) {
                userId = byUsername.id;
                resolvedBy = 'WHATSAPP_MOBILE_USER_USERNAME';
            }
        }
    }

    if (!userId) {
        const ceoLike = await User.findOne({
            where: {
                isActive: true,
                [Op.or]: [
                    { position: { [Op.like]: '%مدیرعامل%' } },
                    { position: { [Op.like]: '%CEO%' } },
                    { position: { [Op.like]: '%مدیر عامل%' } },
                ],
            },
            order: [['createdAt', 'ASC']],
            attributes: ['id', 'email', 'isActive'],
        });
        if (isAllowedMobileOwnerUser(ceoLike)) {
            userId = ceoLike.id;
            resolvedBy = 'position_ceo';
        }
    }

    if (!userId) {
        const owners = await User.findAll({
            where: { role: 'owner', isActive: true },
            order: [['createdAt', 'ASC']],
            attributes: ['id', 'email', 'isActive'],
        });
        const businessOwner = owners.find((o) => isAllowedMobileOwnerUser(o));
        if (businessOwner) {
            userId = businessOwner.id;
            resolvedBy = 'owner_non_main_admin';
        }
    }

    if (!userId && logger && logger.warn) {
        logger.warn('resolveMobileWhatsappUser: no mobile owner — set WHATSAPP_MOBILE_USER_EMAIL (e.g. aliaksu754@gmail.com) or WHATSAPP_MOBILE_USER_ID');
    } else if (userId && logger && logger.info && resolvedBy !== 'WHATSAPP_MOBILE_USER_ID' && resolvedBy !== 'WHATSAPP_MOBILE_USER_EMAIL') {
        logger.info('resolveMobileWhatsappUser: resolved via fallback', { userId, resolvedBy });
    }

    _cached = { at: now, userId, gatewayNumber, gatewayName, resolvedBy };
    return { userId, gatewayNumber, gatewayName, resolvedBy };
}

async function loadMobileWhatsappUser(logger) {
    const { userId } = await resolveMobileWhatsappUser(logger);
    if (!userId) return null;
    return User.findByPk(userId, { attributes: MOBILE_USER_ATTRS });
}

function serializeMobileWhatsappUser(user) {
    if (!user) return null;
    if (typeof user.toJSON === 'function') return user.toJSON();
    return user;
}

/** پیام خروجی غیر پنل = ارسال از واتساپ موبایل */
function applyMobileWhatsappSenderToMessages(messages, mobileUser) {
    if (!mobileUser || !Array.isArray(messages)) return;
    const plainUser = serializeMobileWhatsappUser(mobileUser);
    for (const m of messages) {
        if (m.direction !== 'outgoing' || m.isAutoReply) continue;
        if (isCrmPanelOutboundMessage(m)) continue;
        if (typeof m.setDataValue === 'function') {
            m.setDataValue('user', plainUser);
        } else {
            m.user = plainUser;
        }
        const meta = { ...parseMsgMetadata(m.metadata) };
        if (meta.sendSource !== 'whatsapp_mobile') meta.sendSource = 'whatsapp_mobile';
        if (typeof m.setDataValue === 'function') {
            m.setDataValue('metadata', meta);
        } else {
            m.metadata = meta;
        }
    }
}

module.exports = {
    resolveMobileWhatsappUser,
    loadMobileWhatsappUser,
    applyMobileWhatsappSenderToMessages,
    isCrmPanelOutboundMessage,
    isWhatsappMobileOutboundMessage,
    parseMsgMetadata,
    configuredMobileEmails,
    invalidateMobileWhatsappUserCache,
    MOBILE_USER_ATTRS,
    serializeMobileWhatsappUser,
};

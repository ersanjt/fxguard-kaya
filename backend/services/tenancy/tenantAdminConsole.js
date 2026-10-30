/**
 * FXGuard — دادهٔ کنسول مدیر سکو: آمار هر سازمان، کاربران، مشتریان و مدیریت حساب کاربران
 * @file    backend/services/tenancy/tenantAdminConsole.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const crypto = require('crypto');
const { Op, fn, col } = require('sequelize');
const { Tenant, User, Customer, Conversation, Message } = require('../../models');
const { PLATFORM_SLUG } = require('../../lib/tenantHost');
const { validatePassword } = require('../../lib/passwordValidation');
const { displayableWhatsAppPhone } = require('../../lib/phoneUtils');
const { revokeStaffSessions } = require('../../lib/staffSession');

const ROLES = ['owner', 'admin', 'manager', 'supervisor', 'agent'];
const USERNAME_RE = /^[a-z0-9._-]{3,40}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RECENT_CUSTOMERS = 50;

function httpError(status, message, code) {
    const err = new Error(message);
    err.status = status;
    if (code) err.code = code;
    return err;
}

function generatePassword() {
    return 'Fx' + crypto.randomBytes(9).toString('base64url') + '7';
}

/** دادهٔ سازمان‌ها جدا از context درخواست (پنل سکو) خوانده می‌شود؛ بدون skipTenantScope نتیجه خالی است. */
async function countByTenant(Model, ids, extraWhere) {
    if (!ids.length) return new Map();
    const rows = await Model.count({
        where: { ...(extraWhere || {}), tenantId: ids },
        group: ['tenantId'],
        skipTenantScope: true,
    });
    return new Map(rows.map((r) => [String(r.tenantId), Number(r.count) || 0]));
}

async function lastActivityByTenant(ids) {
    if (!ids.length) return new Map();
    const rows = await Conversation.findAll({
        attributes: ['tenantId', [fn('MAX', col('lastMessageAt')), 'last']],
        where: { tenantId: ids },
        group: ['tenantId'],
        raw: true,
        skipTenantScope: true,
    });
    return new Map(rows.map((r) => [String(r.tenantId), r.last || null]));
}

async function tenantUsageMap(ids) {
    const [users, customers, conversations, openConversations, messages, lastActivity] = await Promise.all([
        countByTenant(User, ids),
        countByTenant(Customer, ids),
        countByTenant(Conversation, ids),
        countByTenant(Conversation, ids, { status: { [Op.in]: ['open', 'pending'] } }),
        countByTenant(Message, ids),
        lastActivityByTenant(ids),
    ]);
    const out = new Map();
    ids.forEach((id) => {
        const k = String(id);
        out.set(k, {
            users: users.get(k) || 0,
            customers: customers.get(k) || 0,
            conversations: conversations.get(k) || 0,
            openConversations: openConversations.get(k) || 0,
            messages: messages.get(k) || 0,
            lastActivityAt: lastActivity.get(k) || null,
        });
    });
    return out;
}

async function findManagedTenant(id) {
    const tenant = await Tenant.findByPk(id);
    if (!tenant || tenant.slug === PLATFORM_SLUG) throw httpError(404, 'سازمان پیدا نشد');
    return tenant;
}

function shapeUser(u) {
    return {
        id: u.id,
        name: u.name || '',
        email: u.email,
        username: u.username || null,
        role: u.role,
        isActive: u.isActive !== false,
        totpEnabled: u.totpEnabled === true,
        lastLoginAt: u.lastLoginAt || null,
        lastSeenAt: u.lastSeenAt || null,
        createdAt: u.createdAt,
    };
}

async function tenantDetails(id) {
    const tenant = await findManagedTenant(id);
    const [usage, users, customers] = await Promise.all([
        tenantUsageMap([tenant.id]),
        User.findAll({
            where: { tenantId: tenant.id },
            order: [['createdAt', 'ASC']],
            skipTenantScope: true,
        }),
        Customer.findAll({
            where: { tenantId: tenant.id },
            attributes: ['id', 'name', 'phone', 'email', 'source', 'status', 'totalMessages', 'lastContactAt', 'createdAt'],
            order: [['lastContactAt', 'DESC'], ['createdAt', 'DESC']],
            limit: RECENT_CUSTOMERS,
            skipTenantScope: true,
        }),
    ]);
    return {
        tenant,
        usage: usage.get(String(tenant.id)),
        users: users.map(shapeUser),
        customers: customers.map((c) => ({
            id: c.id,
            name: c.name || '',
            phone: displayableWhatsAppPhone(c.phone) || '',
            email: c.email || '',
            source: c.source,
            status: c.status,
            totalMessages: Number(c.totalMessages) || 0,
            lastContactAt: c.lastContactAt || null,
            createdAt: c.createdAt,
        })),
    };
}

function normEmail(v) {
    return String(v || '').trim().toLowerCase();
}

function normUsername(v) {
    return String(v || '').trim().toLowerCase();
}

async function assertIdentityFree({ email, username }, exceptId) {
    const notSelf = exceptId ? { id: { [Op.ne]: exceptId } } : {};
    if (email) {
        const taken = await User.findOne({ where: { ...notSelf, email }, attributes: ['id'], skipTenantScope: true });
        if (taken) throw httpError(409, 'این ایمیل قبلاً برای کاربر دیگری ثبت شده است', 'EMAIL_TAKEN');
    }
    if (username) {
        const taken = await User.findOne({ where: { ...notSelf, username }, attributes: ['id'], skipTenantScope: true });
        if (taken) throw httpError(409, 'این نام کاربری قبلاً گرفته شده است', 'USERNAME_TAKEN');
    }
}

function checkPassword(password) {
    const v = validatePassword(password);
    if (!v.valid) throw httpError(400, 'رمز باید حداقل ۸ کاراکتر و شامل حرف و عدد باشد', 'WEAK_PASSWORD');
}

function checkUsername(username) {
    if (username && !USERNAME_RE.test(username)) {
        throw httpError(400, 'نام کاربری ۳ تا ۴۰ کاراکتر: حروف انگلیسی کوچک، عدد، نقطه، خط تیره یا زیرخط', 'BAD_USERNAME');
    }
}

/** هر سازمان باید حداقل یک مالک فعال داشته باشد تا کسی از پنل خودش بیرون نماند. */
async function assertKeepsActiveOwner(tenantId, user, next) {
    const wasActiveOwner = user.role === 'owner' && user.isActive !== false;
    const staysActiveOwner = next.role === 'owner' && next.isActive !== false;
    if (!wasActiveOwner || staysActiveOwner) return;
    const others = await User.count({
        where: { tenantId, role: 'owner', isActive: true, id: { [Op.ne]: user.id } },
        skipTenantScope: true,
    });
    if (!others) throw httpError(400, 'این تنها مالک فعال سازمان است؛ اول یک مالک دیگر تعریف کنید', 'LAST_OWNER');
}

async function createTenantUser(tenantId, body) {
    const tenant = await findManagedTenant(tenantId);
    const b = body || {};
    const email = normEmail(b.email);
    const username = normUsername(b.username) || null;
    const role = ROLES.includes(b.role) ? b.role : 'admin';
    const name = String(b.name || '').trim().slice(0, 120);
    if (!EMAIL_RE.test(email)) throw httpError(400, 'ایمیل معتبر وارد کنید', 'BAD_EMAIL');
    checkUsername(username);
    const password = String(b.password || '') || generatePassword();
    checkPassword(password);
    await assertIdentityFree({ email, username });
    const user = await User.create({
        tenantId: tenant.id,
        email,
        username,
        name: name || email.split('@')[0],
        role,
        password,
        isActive: true,
    });
    return { user: shapeUser(user), password, tenant };
}

async function updateTenantUser(tenantId, userId, body) {
    const tenant = await findManagedTenant(tenantId);
    const user = await User.findOne({ where: { id: userId, tenantId: tenant.id }, skipTenantScope: true });
    if (!user) throw httpError(404, 'کاربر پیدا نشد');
    const b = body || {};
    const patch = {};
    if (b.name !== undefined) patch.name = String(b.name || '').trim().slice(0, 120) || user.name;
    if (b.email !== undefined) {
        const email = normEmail(b.email);
        if (!EMAIL_RE.test(email)) throw httpError(400, 'ایمیل معتبر وارد کنید', 'BAD_EMAIL');
        if (email !== user.email) patch.email = email;
    }
    if (b.username !== undefined) {
        const username = normUsername(b.username) || null;
        checkUsername(username);
        if (username !== (user.username || null)) patch.username = username;
    }
    if (b.role !== undefined) {
        if (!ROLES.includes(b.role)) throw httpError(400, 'نقش نامعتبر است', 'BAD_ROLE');
        patch.role = b.role;
    }
    if (b.isActive !== undefined) patch.isActive = b.isActive === true;

    let password = null;
    if (b.generatePassword === true) password = generatePassword();
    else if (b.password) password = String(b.password);
    if (password) {
        checkPassword(password);
        patch.password = password;
    }

    await assertIdentityFree({ email: patch.email, username: patch.username }, user.id);
    await assertKeepsActiveOwner(tenant.id, user, {
        role: patch.role !== undefined ? patch.role : user.role,
        isActive: patch.isActive !== undefined ? patch.isActive : user.isActive,
    });
    await user.update(patch);
    if (password || patch.isActive === false || patch.email || patch.username) {
        await revokeStaffSessions(user, null);
    }
    return { user: shapeUser(user), password, tenant };
}

module.exports = {
    ROLES,
    tenantUsageMap,
    tenantDetails,
    createTenantUser,
    updateTenantUser,
};

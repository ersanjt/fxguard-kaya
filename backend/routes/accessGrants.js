/**
 * API اعطای دسترسی به مشتری/مکالمهٔ محدودشده + قفل دادهٔ قبلی
 */
const express = require('express');
const router = express.Router();
const { User, Customer, Conversation } = require('../models');
const { isValidUUID } = require('../lib/validation');
const { canGrantStaffResourceAccess } = require('../lib/permissions');
const {
    listGrantsForResource,
    grantAccess,
    revokeAccess,
    grantCustomersToUser,
} = require('../lib/staffResourceGrants');
const {
    restoreLegacyCrmVisibility,
    getLockdownStats,
    handleGatewayNumberReady,
    enforceCurrentNumberInbox,
    loadGatewayChatIdsAndNumber,
    normalizeLinkedNumber,
} = require('../services/legacyCrmLockdown');
const { logActivity } = require('../services/activityLog');

function requireGrantAdmin(req, res) {
    if (!canGrantStaffResourceAccess(req.user)) {
        res.status(403).json({ error: 'فقط ادمین سطح بالا می‌تواند دسترسی اعطا کند' });
        return false;
    }
    return true;
}

/** GET /api/access-grants/stats — آمار قفل دادهٔ قبلی */
router.get('/stats', async (req, res, next) => {
    try {
        if (!requireGrantAdmin(req, res)) return;
        const stats = await getLockdownStats();
        res.json(stats);
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/access-grants/lockdown-legacy
 * شمارهٔ قبلی را آرشیو می‌کند و فقط چت‌های شمارهٔ فعلی Gateway را در لیست عادی باز می‌گذارد.
 */
router.post('/lockdown-legacy', async (req, res, next) => {
    try {
        if (!requireGrantAdmin(req, res)) return;

        const live = await loadGatewayChatIdsAndNumber();
        const gatewayNumber =
            live.number ||
            normalizeLinkedNumber(req.body && req.body.number) ||
            '';

        const result = await enforceCurrentNumberInbox(live.chatIds, gatewayNumber, {
            reason: 'manual_lockdown_legacy',
        });
        await logActivity({
            userId: req.userId,
            branchId: req.user.branchId,
            departmentId: req.user.departmentId,
            action: 'legacy_crm_lockdown',
            entityType: 'system',
            summary: 'مکالمات و مشتریان شمارهٔ قبلی آرشیو شدند؛ فقط شمارهٔ فعلی در لیست عادی است',
            metadata: { ...result, gatewayNumber, chatCount: live.chatIds.length },
        }).catch(() => {});
        const stats = result.stats || (await getLockdownStats());
        res.json({
            ok: true,
            ...(result.lockdown || {}),
            changed: true,
            gatewayNumber: gatewayNumber || result.number || null,
            opened: (result.visibility && result.visibility.opened) || 0,
            stats,
            message:
                'چت‌ها، گروه‌ها و مشتریان شمارهٔ قبلی آرشیو شدند و فقط ادمین می‌بیند. لیست عادی فقط شمارهٔ فعلی است.',
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/access-grants/restore-legacy
 * عمداً همه شماره‌ها را باز نمی‌کند — همان تفکیک شمارهٔ فعلی را اعمال می‌کند.
 */
router.post('/restore-legacy', async (req, res, next) => {
    try {
        if (!requireGrantAdmin(req, res)) return;
        const result = await restoreLegacyCrmVisibility({
            reason: 'manual_admin_restore',
        });
        await logActivity({
            userId: req.userId,
            branchId: req.user.branchId,
            departmentId: req.user.departmentId,
            action: 'legacy_crm_restore',
            entityType: 'system',
            summary: 'درخواست نمایش همه رد شد؛ فقط شمارهٔ فعلی در لیست عادی ماند',
            metadata: result,
        }).catch(() => {});
        res.json({
            ok: true,
            ...result,
            message:
                'نمایش همهٔ شماره‌ها غیرفعال است. چت‌های شمارهٔ قبلی آرشیو ماندند؛ لیست عادی فقط شمارهٔ فعلی است.',
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/access-grants/sync-gateway-number
 * ثبت/بررسی شمارهٔ فعلی Gateway و در صورت تعویض، قفل خودکار
 */
router.post('/sync-gateway-number', async (req, res, next) => {
    try {
        if (!requireGrantAdmin(req, res)) return;
        const number = (req.body && req.body.number) || null;
        const result = await handleGatewayNumberReady(number, { reason: 'manual_sync' });
        res.json({ ok: true, ...result });
    } catch (err) {
        next(err);
    }
});

/** GET /api/access-grants/customers/:id */
router.get('/customers/:id', async (req, res, next) => {
    try {
        if (!requireGrantAdmin(req, res)) return;
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const customer = await Customer.findByPk(req.params.id, { attributes: ['id', 'name', 'isRestrictedFromStaff'] });
        if (!customer) return res.status(404).json({ error: 'مشتری یافت نشد' });
        const grants = await listGrantsForResource('customer', req.params.id);
        res.json({
            customerId: customer.id,
            isRestrictedFromStaff: !!customer.isRestrictedFromStaff,
            grants: grants.map((g) => ({
                id: g.id,
                userId: g.userId,
                user: g.user,
                grantedBy: g.grantedBy,
                granter: g.granter,
                createdAt: g.createdAt,
            })),
        });
    } catch (err) {
        next(err);
    }
});

/** POST /api/access-grants/customers/:id  { userId } */
router.post('/customers/:id', async (req, res, next) => {
    try {
        if (!requireGrantAdmin(req, res)) return;
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const userId = req.body && req.body.userId;
        if (!isValidUUID(userId)) return res.status(400).json({ error: 'شناسه کاربر الزامی است' });
        const customer = await Customer.findByPk(req.params.id, { attributes: ['id'] });
        if (!customer) return res.status(404).json({ error: 'مشتری یافت نشد' });
        const target = await User.findByPk(userId, { attributes: ['id', 'name', 'isActive'] });
        if (!target || target.isActive === false) return res.status(404).json({ error: 'کاربر یافت نشد' });
        const row = await grantAccess({
            userId,
            resourceType: 'customer',
            resourceId: req.params.id,
            grantedBy: req.userId,
        });
        res.json({ ok: true, grant: { id: row.id, userId, resourceType: 'customer', resourceId: req.params.id } });
    } catch (err) {
        next(err);
    }
});

/** DELETE /api/access-grants/customers/:id/users/:userId */
router.delete('/customers/:id/users/:userId', async (req, res, next) => {
    try {
        if (!requireGrantAdmin(req, res)) return;
        if (!isValidUUID(req.params.id) || !isValidUUID(req.params.userId)) {
            return res.status(400).json({ error: 'شناسه نامعتبر است' });
        }
        await revokeAccess({
            userId: req.params.userId,
            resourceType: 'customer',
            resourceId: req.params.id,
        });
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/access-grants/customers/bulk
 * { userId, customerIds: [] } — اعطای چند مشتری به یک کاربر
 */
router.post('/customers-bulk', async (req, res, next) => {
    try {
        if (!requireGrantAdmin(req, res)) return;
        const userId = req.body && req.body.userId;
        const customerIds = (req.body && req.body.customerIds) || [];
        if (!isValidUUID(userId)) return res.status(400).json({ error: 'شناسه کاربر الزامی است' });
        if (!Array.isArray(customerIds) || customerIds.length === 0) {
            return res.status(400).json({ error: 'لیست مشتریان الزامی است' });
        }
        const target = await User.findByPk(userId, { attributes: ['id', 'isActive'] });
        if (!target || target.isActive === false) return res.status(404).json({ error: 'کاربر یافت نشد' });
        const result = await grantCustomersToUser({
            userId,
            customerIds: customerIds.filter(isValidUUID),
            grantedBy: req.userId,
        });
        res.json({ ok: true, ...result });
    } catch (err) {
        next(err);
    }
});

/** PATCH مشتری: رفع/اعمال محدودیت دستی */
router.patch('/customers/:id/restriction', async (req, res, next) => {
    try {
        if (!requireGrantAdmin(req, res)) return;
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const customer = await Customer.findByPk(req.params.id);
        if (!customer) return res.status(404).json({ error: 'مشتری یافت نشد' });
        const restricted = req.body && (req.body.isRestrictedFromStaff === true || req.body.isRestrictedFromStaff === 'true');
        await customer.update({ isRestrictedFromStaff: !!restricted });
        if (restricted) {
            await Conversation.update(
                { isHiddenFromStaff: true },
                { where: { customerId: customer.id, isHiddenFromStaff: false } }
            );
        }
        res.json({ ok: true, id: customer.id, isRestrictedFromStaff: !!customer.isRestrictedFromStaff });
    } catch (err) {
        next(err);
    }
});

/** GET /api/access-grants/conversations/:id */
router.get('/conversations/:id', async (req, res, next) => {
    try {
        if (!requireGrantAdmin(req, res)) return;
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const conversation = await Conversation.findByPk(req.params.id, {
            attributes: ['id', 'customerId', 'isHiddenFromStaff'],
        });
        if (!conversation) return res.status(404).json({ error: 'مکالمه یافت نشد' });
        const grants = await listGrantsForResource('conversation', req.params.id);
        const customerGrants = conversation.customerId
            ? await listGrantsForResource('customer', conversation.customerId)
            : [];
        res.json({
            conversationId: conversation.id,
            customerId: conversation.customerId,
            isHiddenFromStaff: !!conversation.isHiddenFromStaff,
            grants: grants.map((g) => ({
                id: g.id,
                userId: g.userId,
                user: g.user,
                grantedBy: g.grantedBy,
                createdAt: g.createdAt,
            })),
            customerGrants: customerGrants.map((g) => ({
                id: g.id,
                userId: g.userId,
                user: g.user,
                grantedBy: g.grantedBy,
                createdAt: g.createdAt,
            })),
        });
    } catch (err) {
        next(err);
    }
});

/** POST /api/access-grants/conversations/:id { userId } */
router.post('/conversations/:id', async (req, res, next) => {
    try {
        if (!requireGrantAdmin(req, res)) return;
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const userId = req.body && req.body.userId;
        if (!isValidUUID(userId)) return res.status(400).json({ error: 'شناسه کاربر الزامی است' });
        const conversation = await Conversation.findByPk(req.params.id, { attributes: ['id', 'customerId'] });
        if (!conversation) return res.status(404).json({ error: 'مکالمه یافت نشد' });
        const target = await User.findByPk(userId, { attributes: ['id', 'isActive'] });
        if (!target || target.isActive === false) return res.status(404).json({ error: 'کاربر یافت نشد' });
        // اعطای دسترسی در سطح مشتری (پوشش همهٔ مکالمات آن مشتری)
        const row = await grantAccess({
            userId,
            resourceType: 'customer',
            resourceId: conversation.customerId,
            grantedBy: req.userId,
        });
        res.json({
            ok: true,
            grant: {
                id: row.id,
                userId,
                resourceType: 'customer',
                resourceId: conversation.customerId,
                conversationId: conversation.id,
            },
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

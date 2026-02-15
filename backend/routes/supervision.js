const express = require('express');
const router = express.Router();
const { Sequelize, Conversation, Message, User, Branch, Department, Customer, ActivityLog } = require('../models');
const { Op } = require('sequelize');

function ownerOnly(req, res, next) {
    if (req.user.role === 'owner') return next();
    return res.status(403).json({ error: 'فقط مالک شرکت به این بخش دسترسی دارد' });
}

// مالک، ادمین، مدیر — برای مشاهده ورودها و وضعیت آنلاین کارکنان
function canViewStaffActivity(req, res, next) {
    if (['owner', 'admin', 'manager'].indexOf(req.user.role) !== -1) return next();
    return res.status(403).json({ error: 'دسترسی به این بخش محدود است' });
}

// لاگ ورود کارکنان — برای مدیر و بالاتر
router.get('/logins', canViewStaffActivity, async (req, res) => {
    try {
        const { limit = 50, page = 1 } = req.query;
        const { rows, count } = await ActivityLog.findAndCountAll({
            where: { action: 'user_login' },
            include: [
                { model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'], required: false },
                { model: Branch, as: 'branch', attributes: ['id', 'name', 'city', 'country'], required: false }
            ],
            order: [['createdAt', 'DESC']],
            limit: Math.min(parseInt(limit) || 50, 100),
            offset: (parseInt(page) - 1) * (parseInt(limit) || 50)
        });
        res.json({ data: rows, total: count, page: parseInt(page) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// لیست کارکنان آنلاین — برای مدیر و بالاتر
router.get('/online', canViewStaffActivity, async (req, res) => {
    try {
        const users = await User.findAll({
            where: { isActive: true, status: ['online', 'away', 'busy'] },
            attributes: ['id', 'name', 'email', 'role', 'status', 'lastLoginAt'],
            include: [{ model: Branch, as: 'branch', attributes: ['id', 'name', 'city'], required: false }],
            order: [['lastLoginAt', 'DESC']]
        });
        res.json({ data: users });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.use(ownerOnly);

// همه مکالمات با جزئیات شعبه، دپارتمان، کارمند — برای نظارت مالک
router.get('/conversations', async (req, res) => {
    try {
        const { branchId, departmentId, userId, status, limit = 50, page = 1 } = req.query;
        const where = {};
        if (branchId) where.branchId = branchId;
        if (departmentId) where.departmentId = departmentId;
        if (userId) where.assignedTo = userId;
        if (status) where.status = status;
        const { rows, count } = await Conversation.findAndCountAll({
            where,
            include: [
                { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'email'] },
                { model: User, as: 'assignee', attributes: ['id', 'name', 'email', 'role'], include: [{ model: Branch, as: 'branch', attributes: ['id', 'name', 'city', 'country'] }] },
                { model: Department, as: 'department', attributes: ['id', 'name'], include: [{ model: Branch, as: 'branch', attributes: ['id', 'name', 'city'] }] },
                { model: Branch, as: 'branch', attributes: ['id', 'name', 'city', 'country'], required: false }
            ],
            order: [['lastMessageAt', 'DESC']],
            limit: Math.min(parseInt(limit) || 50, 100),
            offset: (parseInt(page) - 1) * (parseInt(limit) || 50)
        });
        res.json({ data: rows, total: count, page: parseInt(page) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// لاگ فعالیت‌ها — چه کسی چه عملی انجام داده
router.get('/activity', async (req, res) => {
    try {
        const { branchId, userId, action, limit = 100, page = 1 } = req.query;
        const where = {};
        if (branchId) where.branchId = branchId;
        if (userId) where.userId = userId;
        if (action) where.action = action;
        const { rows, count } = await ActivityLog.findAndCountAll({
            where,
            include: [
                { model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'], required: false },
                { model: Branch, as: 'branch', attributes: ['id', 'name', 'city'], required: false },
                { model: Department, as: 'department', attributes: ['id', 'name'], required: false }
            ],
            order: [['createdAt', 'DESC']],
            limit: Math.min(parseInt(limit) || 100, 200),
            offset: (parseInt(page) - 1) * (parseInt(limit) || 100)
        });
        res.json({ data: rows, total: count, page: parseInt(page) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// خلاصه عملکرد به تفکیک شعبه و کاربر — برای مالک
router.get('/performance', async (req, res) => {
    try {
        const [branches, users, conversationCount, messageCount] = await Promise.all([
            Branch.findAll({ where: { isActive: true }, attributes: ['id', 'name', 'city', 'country'], order: [['name', 'ASC']] }),
            User.findAll({ where: { isActive: true }, attributes: ['id', 'name', 'email', 'role', 'branchId'], include: [{ model: Branch, as: 'branch', attributes: ['id', 'name', 'city'], required: false }] }),
            Conversation.count(),
            Message.count({ where: { direction: 'outgoing' } })
        ]);
        const branchIds = branches.map(b => b.id);
        const convCountByBranch = await Conversation.findAll({
            attributes: ['branchId', [Sequelize.fn('COUNT', '*'), 'count']],
            where: { branchId: { [Op.in]: branchIds } },
            group: ['branchId'],
            raw: true
        }).catch(() => []);
        const msgCountByUser = await Message.findAll({
            attributes: ['userId', [Sequelize.fn('COUNT', '*'), 'count']],
            where: { direction: 'outgoing', userId: { [Op.ne]: null } },
            group: ['userId'],
            raw: true
        }).catch(() => []);
        const countByBranch = {};
        convCountByBranch.forEach(r => { countByBranch[r.branchId] = parseInt(r.count, 10); });
        const countByUser = {};
        msgCountByUser.forEach(r => { countByUser[r.userId] = parseInt(r.count, 10); });
        res.json({
            summary: { conversationCount, messageCount },
            branches: branches.map(b => ({ ...b.toJSON(), conversationCount: countByBranch[b.id] || 0 })),
            users: users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, branch: u.branch, outgoingMessageCount: countByUser[u.id] || 0 }))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

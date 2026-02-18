const express = require('express');
const router = express.Router();
const { Announcement, AnnouncementRead, User, Department } = require('../models');
const { Op } = require('sequelize');
const { isMainAdmin } = require('../lib/permissions');

// لیست اعلان‌های برای من (با فلگ خوانده شده)
router.get('/for-me', async (req, res) => {
    try {
        const me = req.user;
        const where = {
            [Op.or]: [
                { targetType: 'all' },
                ...(me.departmentId ? [{ targetType: 'department', targetId: me.departmentId }] : []),
                { targetType: 'user', targetId: me.id }
            ]
        };
        const list = await Announcement.findAll({
            where,
            include: [
                { model: User, as: 'fromUser', attributes: ['id', 'name', 'email'] },
                { model: AnnouncementRead, as: 'reads', where: { userId: me.id }, required: false }
            ],
            order: [['createdAt', 'DESC']],
            limit: 100
        });
        const withRead = await Promise.all(list.map(async (a) => {
            const j = a.toJSON();
            j.read = (j.reads && j.reads.length > 0);
            delete j.reads;
            j.canDelete = (a.fromUserId === me.id) || isMainAdmin(me) || me.role === 'owner' || me.role === 'admin';
            if (a.targetType === 'department' && a.targetId) {
                const d = await Department.findByPk(a.targetId, { attributes: ['name'] });
                j.targetName = d ? d.name : null;
            } else if (a.targetType === 'user' && a.targetId) {
                const u = await User.findByPk(a.targetId, { attributes: ['name'] });
                j.targetName = u ? u.name : null;
            } else j.targetName = null;
            return j;
        }));
        res.json({ data: withRead });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// علامت‌گذاری به‌عنوان خوانده‌شده
router.post('/:id/read', async (req, res) => {
    try {
        const ann = await Announcement.findByPk(req.params.id);
        if (!ann) return res.status(404).json({ error: 'اعلان یافت نشد' });
        const me = req.user;
        const isForMe = ann.targetType === 'all' || (ann.targetType === 'department' && ann.targetId === me.departmentId) || (ann.targetType === 'user' && ann.targetId === me.id);
        if (!isForMe) return res.status(403).json({ error: 'این اعلان برای شما نیست' });
        await AnnouncementRead.findOrCreate({ where: { announcementId: ann.id, userId: me.id }, defaults: {} });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ارسال اعلان — مدیر فقط به دپارتمان خود؛ مالک/ادمین به کاربر/دپارتمان/همه
router.post('/', async (req, res) => {
    try {
        const { title, body, isImportant, targetType, targetId } = req.body;
        if (!title || !body) return res.status(400).json({ error: 'عنوان و متن الزامی است' });
        const me = req.user;
        let allowed = false;
        let finalTargetType = targetType;
        let finalTargetId = targetId || null;

        if (me.role === 'manager') {
            if (targetType !== 'department' || targetId !== me.departmentId) return res.status(403).json({ error: 'مدیر فقط می‌تواند به دپارتمان خود پیام بفرستد' });
            if (!me.departmentId) return res.status(403).json({ error: 'شما به هیچ دپارتمانی تخصیص ندارید' });
            finalTargetId = me.departmentId;
            allowed = true;
        } else if (isMainAdmin(me) || me.role === 'owner' || me.role === 'admin') {
            if (['user', 'department', 'all'].indexOf(targetType) === -1) return res.status(400).json({ error: 'targetType باید user، department یا all باشد' });
            if (targetType !== 'all' && !targetId) return res.status(400).json({ error: 'برای user و department باید targetId بفرستید' });
            allowed = true;
        }

        if (!allowed) return res.status(403).json({ error: 'دسترسی غیرمجاز' });

        const ann = await Announcement.create({
            fromUserId: me.id,
            title: String(title).trim(),
            body: String(body).trim(),
            isImportant: !!isImportant,
            targetType: finalTargetType,
            targetId: finalTargetId
        });
        const withUser = await Announcement.findByPk(ann.id, { include: [{ model: User, as: 'fromUser', attributes: ['id', 'name', 'email'] }] });
        if (ann.isImportant) {
            let recipientIds = [];
            if (finalTargetType === 'all') {
                const allUsers = await User.findAll({ where: { isActive: true }, attributes: ['id'] });
                recipientIds = allUsers.map(u => u.id);
            } else if (finalTargetType === 'department' && finalTargetId) {
                const deptUsers = await User.findAll({ where: { departmentId: finalTargetId, isActive: true }, attributes: ['id'] });
                recipientIds = deptUsers.map(u => u.id);
            } else if (finalTargetType === 'user' && finalTargetId) {
                recipientIds = [finalTargetId];
            }
            recipientIds = recipientIds.filter(id => String(id) !== String(me.id));
            const io = req.app.get('io');
            if (io && recipientIds.length > 0) {
                const payload = { id: ann.id, title: ann.title, body: ann.body, fromUser: withUser.fromUser };
                recipientIds.forEach(userId => io.to('user_' + userId).emit('important_announcement', payload));
            }
        }
        res.status(201).json(withUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// لیست کاربران و دپارتمان‌ها برای انتخاب گیرنده
router.get('/targets', async (req, res) => {
    try {
        const me = req.user;
        let users = [];
        let departments = [];
        if (me.role === 'manager' && me.departmentId) {
            departments = await Department.findAll({ where: { id: me.departmentId, isActive: true }, attributes: ['id', 'name'] });
            users = await User.findAll({ where: { departmentId: me.departmentId, isActive: true }, attributes: ['id', 'name', 'email'], include: [{ model: Department, as: 'department', attributes: ['id', 'name'], required: false }] });
        } else if (isMainAdmin(me) || me.role === 'owner' || me.role === 'admin') {
            [users, departments] = await Promise.all([
                User.findAll({ where: { isActive: true }, attributes: ['id', 'name', 'email'], include: [{ model: Department, as: 'department', attributes: ['id', 'name'], required: false }] }),
                Department.findAll({ where: { isActive: true }, attributes: ['id', 'name'] })
            ]);
        } else return res.status(403).json({ error: 'دسترسی غیرمجاز' });
        res.json({ users, departments });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// حذف اعلان — فقط فرستنده یا مالک/ادمین
router.delete('/:id', async (req, res) => {
    try {
        const me = req.user;
        const ann = await Announcement.findByPk(req.params.id);
        if (!ann) return res.status(404).json({ error: 'اعلان یافت نشد' });
        const canDelete = (ann.fromUserId === me.id) || isMainAdmin(me) || me.role === 'owner' || me.role === 'admin';
        if (!canDelete) return res.status(403).json({ error: 'شما اجازه حذف این اعلان را ندارید' });
        await AnnouncementRead.destroy({ where: { announcementId: ann.id } });
        await ann.destroy();
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// لیست اعلان‌های ارسال‌شده توسط من (برای مالک/ادمین/مدیر)
router.get('/sent', async (req, res) => {
    try {
        const me = req.user;
        if (!isMainAdmin(me) && me.role !== 'owner' && me.role !== 'admin' && me.role !== 'manager') return res.status(403).json({ error: 'دسترسی غیرمجاز' });
        const where = { fromUserId: me.id };
        const list = await Announcement.findAll({
            where,
            include: [{ model: User, as: 'fromUser', attributes: ['id', 'name', 'email'] }],
            order: [['createdAt', 'DESC']],
            limit: 100
        });
        const withTarget = await Promise.all(list.map(async (a) => {
            const j = a.toJSON();
            if (a.targetType === 'department' && a.targetId) {
                const d = await Department.findByPk(a.targetId, { attributes: ['id', 'name'] });
                j.targetName = d ? d.name : null;
            } else if (a.targetType === 'user' && a.targetId) {
                const u = await User.findByPk(a.targetId, { attributes: ['id', 'name'] });
                j.targetName = u ? u.name : null;
            } else j.targetName = 'all';
            return j;
        }));
        res.json({ data: withTarget });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

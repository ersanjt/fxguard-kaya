const express = require('express');
const router = express.Router();
const { Announcement, AnnouncementRead, User, Department } = require('../models');
const { Op } = require('sequelize');
const { isMainAdmin } = require('../lib/permissions');
const notificationService = require('../services/notificationService');
const logger = require('../config/logger');
const { isValidUUID } = require('../lib/validation');

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
        // batch-load target names to avoid N+1
        const deptIds = [...new Set(list.filter(a => a.targetType === 'department' && a.targetId).map(a => a.targetId))];
        const userIds = [...new Set(list.filter(a => a.targetType === 'user' && a.targetId).map(a => a.targetId))];
        const [depts, targetUsers] = await Promise.all([
            deptIds.length ? Department.findAll({ where: { id: deptIds }, attributes: ['id', 'name'] }) : [],
            userIds.length ? User.findAll({ where: { id: userIds }, attributes: ['id', 'name'] }) : []
        ]);
        const deptMap = Object.fromEntries(depts.map(d => [d.id, d.name]));
        const userMap = Object.fromEntries(targetUsers.map(u => [u.id, u.name]));

        const withRead = list.map((a) => {
            const j = a.toJSON();
            j.read = (j.reads && j.reads.length > 0);
            delete j.reads;
            j.canDelete = (a.fromUserId === me.id) || isMainAdmin(me) || me.role === 'owner' || me.role === 'admin';
            if (a.targetType === 'department' && a.targetId) j.targetName = deptMap[a.targetId] || null;
            else if (a.targetType === 'user' && a.targetId) j.targetName = userMap[a.targetId] || null;
            else j.targetName = null;
            return j;
        });
        res.json({ data: withRead });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// علامت‌گذاری به‌عنوان خوانده‌شده
router.post('/:id/read', async (req, res) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه اعلان نامعتبر است' });
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
        if (String(title).trim().length > 200) return res.status(400).json({ error: 'عنوان اعلان بیش از ۲۰۰ کاراکتر مجاز نیست' });
        if (String(body).trim().length > 5000) return res.status(400).json({ error: 'متن اعلان بیش از ۵,۰۰۰ کاراکتر مجاز نیست' });
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
            
            // استفاده از سرویس اطلاعات برای ارسال ایمیل و Socket.IO
            const io = req.app.get('io');
            setImmediate(() => {
                notificationService.notifyAnnouncement(withUser, recipientIds, io).catch(err => {
                    logger.error('Announcement notification error', { error: err.message });
                });
            });
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
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه اعلان نامعتبر است' });
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
        const sentDeptIds = [...new Set(list.filter(a => a.targetType === 'department' && a.targetId).map(a => a.targetId))];
        const sentUserIds = [...new Set(list.filter(a => a.targetType === 'user' && a.targetId).map(a => a.targetId))];
        const [sentDepts, sentTargetUsers] = await Promise.all([
            sentDeptIds.length ? Department.findAll({ where: { id: sentDeptIds }, attributes: ['id', 'name'] }) : [],
            sentUserIds.length ? User.findAll({ where: { id: sentUserIds }, attributes: ['id', 'name'] }) : []
        ]);
        const sentDeptMap = Object.fromEntries(sentDepts.map(d => [d.id, d.name]));
        const sentUserMap = Object.fromEntries(sentTargetUsers.map(u => [u.id, u.name]));

        const withTarget = list.map((a) => {
            const j = a.toJSON();
            if (a.targetType === 'department' && a.targetId) j.targetName = sentDeptMap[a.targetId] || null;
            else if (a.targetType === 'user' && a.targetId) j.targetName = sentUserMap[a.targetId] || null;
            else j.targetName = 'all';
            return j;
        });
        res.json({ data: withTarget });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

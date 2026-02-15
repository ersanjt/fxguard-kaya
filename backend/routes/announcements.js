const express = require('express');
const router = express.Router();
const { Announcement, AnnouncementRead, User, Department } = require('../models');
const { Op } = require('sequelize');

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
        const withRead = list.map(a => {
            const j = a.toJSON();
            j.read = (j.reads && j.reads.length > 0);
            delete j.reads;
            return j;
        });
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
        } else if (me.role === 'owner' || me.role === 'admin') {
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
        res.status(201).json(withUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// لیست کاربران و دپارتمان‌ها برای انتخاب گیرنده (فقط مالک/ادمین)
router.get('/targets', async (req, res) => {
    try {
        if (req.user.role !== 'owner' && req.user.role !== 'admin') return res.status(403).json({ error: 'فقط مالک یا ادمین' });
        const [users, departments] = await Promise.all([
            User.findAll({ where: { isActive: true }, attributes: ['id', 'name', 'email'], include: [{ model: Department, as: 'department', attributes: ['id', 'name'], required: false }] }),
            Department.findAll({ where: { isActive: true }, attributes: ['id', 'name'] })
        ]);
        res.json({ users, departments });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

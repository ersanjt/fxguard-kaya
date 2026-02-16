const express = require('express');
const router = express.Router();
const { Task, TaskUpdate, User, Department, Branch } = require('../models');
const { Op } = require('sequelize');
const { isMainAdmin } = require('../lib/permissions');

/** ساخت شرط دسترسی: ادمین/مالک همه؛ مدیر دپارتمان خودش؛ کارمند/ناظر تسک‌های اختصاص‌یافته به خود + تسک‌های دپارتمان خود */
async function taskAccessWhere(req) {
    const u = req.user;
    if (isMainAdmin(u) || u.role === 'owner' || u.role === 'admin') return {};
    if ((u.role === 'manager' || u.role === 'supervisor') && u.departmentId) {
        const deptUserIds = await User.findAll({
            where: { departmentId: u.departmentId, isActive: true },
            attributes: ['id']
        }).then(rows => rows.map(r => r.id));
        return {
            [Op.or]: [
                { assignedToDepartmentId: u.departmentId },
                { assignedTo: { [Op.in]: deptUserIds } },
                { assignedTo: u.id },
                { createdBy: u.id }
            ]
        };
    }
    return {
        [Op.or]: [
            { assignedTo: u.id },
            ...(u.departmentId ? [{ assignedToDepartmentId: u.departmentId }] : [])
        ]
    };
}

/** بررسی دسترسی به یک تسک (خواندن/ویرایش) */
async function canAccessTask(req, taskId) {
    const task = await Task.findByPk(taskId);
    if (!task) return { ok: false, status: 404 };
    const u = req.user;
    if (isMainAdmin(u) || u.role === 'owner' || u.role === 'admin') return { ok: true, task };
    if ((u.role === 'manager' || u.role === 'supervisor') && u.departmentId) {
        const deptUserIds = await User.findAll({
            where: { departmentId: u.departmentId },
            attributes: ['id']
        }).then(rows => rows.map(r => r.id));
        const ok =
            task.assignedToDepartmentId === u.departmentId ||
            (task.assignedTo && deptUserIds.includes(task.assignedTo)) ||
            task.assignedTo === u.id ||
            task.createdBy === u.id;
        return ok ? { ok: true, task } : { ok: false, status: 403 };
    }
    if (task.assignedTo === u.id || task.createdBy === u.id) return { ok: true, task };
    if (u.departmentId && task.assignedToDepartmentId === u.departmentId) return { ok: true, task };
    return { ok: false, status: 403 };
}

const includeList = [
    { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
    { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
    { model: User, as: 'completedByUser', attributes: ['id', 'name'], required: false },
    { model: Department, as: 'department', attributes: ['id', 'name'], required: false },
    { model: Branch, as: 'branch', attributes: ['id', 'name', 'city'], required: false }
];

// لیست تسک‌ها با فیلتر
router.get('/', async (req, res) => {
    try {
        const accessWhere = await taskAccessWhere(req);
        const { status, assignedTo, assignedToDepartmentId, branchId, createdBy, search, page = 1, limit = 50 } = req.query;
        const where = { ...accessWhere };
        if (status) where.status = status;
        if (assignedTo) where.assignedTo = assignedTo;
        if (assignedToDepartmentId) where.assignedToDepartmentId = assignedToDepartmentId;
        if (branchId) where.branchId = branchId;
        if (createdBy) where.createdBy = createdBy;
        if (search && String(search).trim()) {
            const term = '%' + String(search).trim() + '%';
            const searchOr = [
                { title: { [Op.like]: term } },
                { description: { [Op.like]: term } }
            ];
            where[Op.and] = where[Op.and] || [];
            where[Op.and].push({ [Op.or]: searchOr });
        }

        const { rows, count } = await Task.findAndCountAll({
            where,
            include: includeList,
            order: [['createdAt', 'DESC']],
            limit: Math.min(parseInt(limit) || 50, 100),
            offset: (parseInt(page) - 1) * (parseInt(limit) || 50)
        });
        res.json({ data: rows, total: count, page: parseInt(page) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// خلاصه برای نمایش به تفکیک کارمند/دپارتمان (برای مدیر کل و مدیر دپارتمان)
router.get('/summary', async (req, res) => {
    try {
        const accessWhere = await taskAccessWhere(req);
        const tasks = await Task.findAll({
            where: accessWhere,
            attributes: ['id', 'status', 'assignedTo', 'assignedToDepartmentId', 'createdBy'],
            include: [
                { model: User, as: 'assignee', attributes: ['id', 'name'] },
                { model: Department, as: 'department', attributes: ['id', 'name'], required: false }
            ]
        });
        const byUser = {};
        const byDept = {};
        tasks.forEach(t => {
            if (t.assignedTo && t.assignee) {
                const id = t.assignedTo;
                if (!byUser[id]) byUser[id] = { user: t.assignee, pending: 0, in_progress: 0, done: 0, cancelled: 0 };
                if (t.status in byUser[id]) byUser[id][t.status]++; else byUser[id][t.status] = 1;
            }
            if (t.assignedToDepartmentId && t.department) {
                const id = t.assignedToDepartmentId;
                if (!byDept[id]) byDept[id] = { department: t.department, pending: 0, in_progress: 0, done: 0, cancelled: 0 };
                if (t.status in byDept[id]) byDept[id][t.status]++; else byDept[id][t.status] = 1;
            }
        });
        res.json({ byUser: Object.values(byUser), byDepartment: Object.values(byDept) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// جزئیات یک تسک + بروزرسانی‌های پیگیری
router.get('/:id', async (req, res) => {
    try {
        const { ok, status, task } = await canAccessTask(req, req.params.id);
        if (!ok) return res.status(status).json({ error: status === 404 ? 'تسک یافت نشد' : 'دسترسی غیرمجاز' });
        const full = await Task.findByPk(task.id, {
            include: [
                ...includeList,
                { model: TaskUpdate, as: 'updates', include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }], order: [['createdAt', 'ASC']] }
            ]
        });
        res.json(full);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ایجاد تسک
router.post('/', async (req, res) => {
    try {
        const { title, description, assignedTo, assignedToDepartmentId, dueDate, priority, branchId } = req.body;
        if (!title || !title.trim()) return res.status(400).json({ error: 'عنوان تسک الزامی است' });
        if (!assignedTo && !assignedToDepartmentId) return res.status(400).json({ error: 'تسک باید به یک کارمند یا یک دپارتمان اختصاص داده شود' });

        const task = await Task.create({
            title: title.trim(),
            description: (description || '').trim(),
            createdBy: req.userId,
            assignedTo: assignedTo || null,
            assignedToDepartmentId: assignedToDepartmentId || null,
            dueDate: dueDate ? new Date(dueDate) : null,
            priority: priority || 'normal',
            branchId: branchId || null,
            status: 'pending'
        });
        const withIncludes = await Task.findByPk(task.id, { include: includeList });
        res.status(201).json(withIncludes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ویرایش تسک (وضعیت، تخصیص، عنوان، توضیحات، مهلت)
router.put('/:id', async (req, res) => {
    try {
        const { ok, status, task } = await canAccessTask(req, req.params.id);
        if (!ok) return res.status(status).json({ error: status === 404 ? 'تسک یافت نشد' : 'دسترسی غیرمجاز' });

        const { title, description, status: newStatus, assignedTo, assignedToDepartmentId, dueDate, priority, branchId } = req.body;
        if (title !== undefined) task.title = title.trim();
        if (description !== undefined) task.description = description;
        if (newStatus !== undefined) {
            task.status = newStatus;
            if (newStatus === 'done' || newStatus === 'cancelled') {
                task.completedAt = new Date();
                task.completedBy = req.userId;
            }
        }
        if (assignedTo !== undefined) task.assignedTo = assignedTo || null;
        if (assignedToDepartmentId !== undefined) task.assignedToDepartmentId = assignedToDepartmentId || null;
        if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;
        if (priority !== undefined) task.priority = priority;
        if (branchId !== undefined) task.branchId = branchId || null;
        await task.save();
        const updated = await Task.findByPk(task.id, { include: includeList });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// افزودن بروزرسانی/پیگیری به تسک
router.post('/:id/updates', async (req, res) => {
    try {
        const { ok, status, task } = await canAccessTask(req, req.params.id);
        if (!ok) return res.status(status).json({ error: status === 404 ? 'تسک یافت نشد' : 'دسترسی غیرمجاز' });

        const content = (req.body.content || '').trim();
        if (!content) return res.status(400).json({ error: 'متن پیگیری الزامی است' });
        const statusChange = req.body.statusChange || null;
        const validStatuses = ['pending', 'in_progress', 'done', 'cancelled'];
        if (statusChange && validStatuses.includes(statusChange)) {
            task.status = statusChange;
            if (statusChange === 'done' || statusChange === 'cancelled') {
                task.completedAt = new Date();
                task.completedBy = req.userId;
            }
            await task.save();
        }

        const update = await TaskUpdate.create({
            taskId: task.id,
            userId: req.userId,
            content,
            statusChange
        });
        const withUser = await TaskUpdate.findByPk(update.id, { include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }] });
        res.status(201).json(withUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

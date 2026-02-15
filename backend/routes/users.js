const express = require('express');
const router = express.Router();
const { User, Department, Branch } = require('../models');

router.get('/', async (req, res) => {
    try {
        const where = {};
        if (req.user.role !== 'owner' && req.user.role !== 'admin' && req.user.branchId) {
            where.branchId = req.user.branchId;
        }
        const users = await User.findAll({
            where,
            attributes: { exclude: ['password'] },
            include: [
                { model: Department, as: 'department', attributes: ['id', 'name'], required: false },
                { model: Branch, as: 'branch', attributes: ['id', 'name', 'city'], required: false }
            ]
        });
        res.json({ data: users });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// پروفایل کاربر جاری — فقط نام، تلفن، رمز، آواتار قابل ویرایش؛ ایمیل و دپارتمان فقط نمایش
router.get('/me', (req, res) => {
    const u = req.user;
    res.json({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        avatar: u.avatar,
        role: u.role,
        departmentId: u.departmentId,
        branchId: u.branchId,
        status: u.status,
        department: u.department,
        branch: u.branch
    });
});

router.patch('/me', async (req, res) => {
    try {
        const user = req.user;
        const { name, phone, password, avatar } = req.body;
        if (name !== undefined && String(name).trim()) user.name = String(name).trim();
        if (phone !== undefined) user.phone = phone ? String(phone).trim() : null;
        if (avatar !== undefined) user.avatar = avatar ? String(avatar) : null;
        if (password !== undefined && password) user.password = password;
        await user.save();
        const u = user.toJSON();
        delete u.password;
        res.json(u);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, {
            attributes: { exclude: ['password'] },
            include: [{ model: Department, as: 'department' }]
        });
        if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'owner') return res.status(403).json({ error: 'فقط ادمین یا مالک' });
        const { name, email, password, role, departmentId, branchId } = req.body;
        if (!name || !email || !password) return res.status(400).json({ error: 'نام، ایمیل و رمز الزامی است' });
        const finalBranchId = (req.user.role === 'owner' || req.user.role === 'admin') ? (branchId || null) : (req.user.branchId || null);
        const user = await User.create({
            name,
            email,
            password,
            role: role || 'agent',
            departmentId: departmentId || null,
            branchId: finalBranchId
        });
        const u = user.toJSON();
        delete u.password;
        res.status(201).json(u);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
        const { name, email, role, departmentId, branchId, isActive } = req.body;
        if (name !== undefined) user.name = name;
        if (email !== undefined) user.email = email;
        if (role !== undefined) user.role = role;
        if (departmentId !== undefined) user.departmentId = departmentId;
        if (branchId !== undefined && (req.user.role === 'owner' || req.user.role === 'admin')) user.branchId = branchId || null;
        if (isActive !== undefined) user.isActive = !!isActive;
        if (req.body.password) user.password = req.body.password;
        await user.save();
        const u = user.toJSON();
        delete u.password;
        res.json(u);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

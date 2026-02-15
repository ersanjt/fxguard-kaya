const express = require('express');
const router = express.Router();
const { User, Department, Branch } = require('../models');
const { getPermissions, isMainAdmin } = require('../lib/permissions');

router.get('/', async (req, res) => {
    try {
        if (!req.canAccess('users')) return res.status(403).json({ error: 'دسترسی به بخش کاربران ندارید' });
        const where = {};
        if (!req.canManageUsers() && req.user.branchId) {
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
        const canManage = req.canManageUsers();
        const list = users.map(u => {
            const j = u.toJSON();
            if (canManage) j.permissions = getPermissions(u);
            if (!canManage && u.id !== req.userId) j.email = undefined;
            return j;
        });
        res.json({ data: list });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/me', (req, res) => {
    const u = req.user;
    const out = {
        id: u.id,
        username: u.username,
        name: u.name,
        firstName: u.firstName,
        lastName: u.lastName,
        dateOfBirth: u.dateOfBirth,
        email: u.email,
        phone: u.phone,
        avatar: u.avatar,
        role: u.role,
        departmentId: u.departmentId,
        branchId: u.branchId,
        status: u.status,
        lastLoginAt: u.lastLoginAt,
        department: u.department,
        branch: u.branch,
        permissions: req.permissions,
        totpEnabled: !!u.totpEnabled
    };
    res.json(out);
});

router.patch('/me', async (req, res) => {
    try {
        const user = req.user;
        const { username, firstName, lastName, dateOfBirth, name, phone, password, avatar } = req.body;
        if (username !== undefined) {
            const trimmed = String(username).trim();
            if (trimmed) {
                if (!/^[a-zA-Z0-9_\u0600-\u06FF.-]+$/.test(trimmed)) return res.status(400).json({ error: 'نام کاربری فقط حروف، عدد، خط تیره و نقطه مجاز است' });
                const existing = await User.findOne({ where: { username: trimmed } });
                if (existing && existing.id !== user.id) return res.status(400).json({ error: 'این نام کاربری قبلاً استفاده شده است' });
                user.username = trimmed;
            }
        }
        if (firstName !== undefined) user.firstName = firstName ? String(firstName).trim() : null;
        if (lastName !== undefined) user.lastName = lastName ? String(lastName).trim() : null;
        if (firstName !== undefined || lastName !== undefined) {
            const first = (user.firstName || '').trim();
            const last = (user.lastName || '').trim();
            user.name = [first, last].filter(Boolean).join(' ').trim() || user.name || '';
        }
        if (name !== undefined) {
            const trimmed = String(name).trim();
            if (trimmed) user.name = trimmed;
        }
        if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth ? String(dateOfBirth).trim() || null : null;
        if (phone !== undefined) user.phone = phone ? String(phone).trim() : null;
        if (avatar !== undefined) user.avatar = avatar ? String(avatar).trim() || null : undefined;
        if (password !== undefined && password) {
            if (String(password).length < 6) return res.status(400).json({ error: 'رمز عبور حداقل ۶ کاراکتر باشد' });
            user.password = password;
        }
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
        if (!req.canAccess('users')) return res.status(403).json({ error: 'دسترسی به بخش کاربران ندارید' });
        const user = await User.findByPk(req.params.id, {
            attributes: { exclude: ['password'] },
            include: [{ model: Department, as: 'department' }, { model: Branch, as: 'branch', required: false }]
        });
        if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
        const j = user.toJSON();
        if (req.canManageUsers()) j.permissions = getPermissions(user);
        if (!req.canManageUsers() && user.id !== req.userId) j.email = undefined;
        res.json(j);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        if (!req.canManageUsers()) return res.status(403).json({ error: 'فقط مدیر مجموعه یا کسی که دسترسی مدیریت کاربران دارد می‌تواند کاربر جدید بسازد' });
        const { name, email, password, role, departmentId, branchId, permissions } = req.body;
        if (!name || !email || !password) return res.status(400).json({ error: 'نام، ایمیل و رمز الزامی است' });
        const finalBranchId = req.canManageUsers() ? (branchId || null) : (req.user.branchId || null);
        const user = await User.create({
            name,
            email,
            password,
            role: role || 'agent',
            departmentId: departmentId || null,
            branchId: finalBranchId,
            permissions: permissions && typeof permissions === 'object' ? permissions : {}
        });
        const u = user.toJSON();
        delete u.password;
        u.permissions = getPermissions(user);
        res.status(201).json(u);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ویرایش کاربر: فقط ادمین اصلی یا کسی که دسترسی manage_users دارد. ادمین اصلی (MAIN_ADMIN_EMAIL) تنها کسی است که نقش و دسترسی بقیه را تعیین/محدود/افزایش می‌دهد و خودش توسط هیچ‌کس دیگر قابل ویرایش یا محدود شدن نیست.
router.put('/:id', async (req, res) => {
    try {
        if (!req.canManageUsers()) return res.status(403).json({ error: 'فقط مدیر مجموعه یا کسی که دسترسی مدیریت کاربران دارد می‌تواند کاربر را ویرایش کند' });
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
        if (isMainAdmin(user) && !isMainAdmin(req.user)) return res.status(403).json({ error: 'امکان ویرایش یا محدود کردن ادمین اصلی پنل وجود ندارد' });
        const { name, email, role, departmentId, branchId, isActive, permissions } = req.body;
        if (name !== undefined) user.name = name;
        if (email !== undefined && !isMainAdmin(user)) user.email = email;
        if (role !== undefined && !isMainAdmin(user)) user.role = role;
        if (departmentId !== undefined) user.departmentId = departmentId;
        if (branchId !== undefined && req.canManageUsers()) user.branchId = branchId || null;
        if (isActive !== undefined) { if (isMainAdmin(user)) user.isActive = true; else user.isActive = !!isActive; }
        if (req.body.password) user.password = req.body.password;
        if (permissions !== undefined && typeof permissions === 'object' && !isMainAdmin(user)) {
            const merged = { ...(user.permissions || {}) };
            Object.keys(permissions).forEach(k => { merged[k] = !!permissions[k]; });
            if (!isMainAdmin(req.user) && req.user.role !== 'owner' && req.user.role !== 'admin') {
                delete merged.manage_users;
            }
            user.permissions = merged;
        }
        await user.save();
        const u = user.toJSON();
        delete u.password;
        u.permissions = getPermissions(user);
        res.json(u);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

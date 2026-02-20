const express = require('express');
const router = express.Router();
const { User, Department, Branch, Conversation, Message, Task, Ticket, ProcessInstance, ProcessInstanceStep, ActivityLog, TaskUpdate, TicketReply, AnnouncementRead, InternalThreadParticipant, InternalMessage, CustomerNote, Transaction, PasswordResetToken } = require('../models');
const { getPermissions, isMainAdmin } = require('../lib/permissions');
const { getPanelSettings, getPanelEmailConfig } = require('../services/panelSettingsLoader');

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
        const { username, firstName, lastName, dateOfBirth, name, phone, password, avatar, email } = req.body;
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
        if (email !== undefined && req.canManageUsers()) {
            const trimmed = String(email).trim().toLowerCase();
            if (!trimmed) return res.status(400).json({ error: 'ایمیل الزامی است' });
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return res.status(400).json({ error: 'فرمت ایمیل نامعتبر است' });
            if (isMainAdmin(user)) return res.status(403).json({ error: 'امکان تغییر ایمیل ادمین اصلی وجود ندارد' });
            const existing = await User.findOne({ where: { email: trimmed } });
            if (existing && existing.id !== user.id) return res.status(400).json({ error: 'این ایمیل قبلاً استفاده شده است' });
            user.email = trimmed;
        }
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
        const { name, username, email, password, role, departmentId, branchId, permissions, skillsKeywords } = req.body;
        if (!name || !email || !password) return res.status(400).json({ error: 'نام، ایمیل و رمز الزامی است' });
        if (username !== undefined && username) {
            const trimmed = String(username).trim();
            if (!/^[a-zA-Z0-9_\u0600-\u06FF.-]+$/.test(trimmed)) return res.status(400).json({ error: 'نام کاربری فقط حروف، عدد، خط تیره و نقطه مجاز است' });
            const existing = await User.findOne({ where: { username: trimmed } });
            if (existing) return res.status(400).json({ error: 'این نام کاربری قبلاً استفاده شده است' });
        }
        const finalBranchId = req.canManageUsers() ? (branchId || null) : (req.user.branchId || null);
        const user = await User.create({
            name,
            username: (username && String(username).trim()) || null,
            email,
            password,
            role: role || 'agent',
            departmentId: departmentId || null,
            branchId: finalBranchId,
            permissions: permissions && typeof permissions === 'object' ? permissions : {},
            settings: skillsKeywords ? { notifications: true, soundAlerts: true, autoAssign: true, skillsKeywords: String(skillsKeywords).trim() } : undefined
        });
        const plainPassword = password;
        setImmediate(async () => {
            try {
                const emailService = require('../services/emailService');
                const settings = await getPanelSettings();
                const emailConfig = getPanelEmailConfig(settings);
                const siteName = (settings && settings.siteName) || 'پورتال کارکنان';
                await emailService.sendWelcomeCredentials(user, plainPassword, siteName, emailConfig);
            } catch (_) {}
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
        const { name, username, email, role, departmentId, branchId, isActive, permissions } = req.body;
        if (name !== undefined) user.name = name;
        if (username !== undefined && !isMainAdmin(user)) {
            const trimmed = String(username || '').trim();
            if (trimmed) {
                if (!/^[a-zA-Z0-9_\u0600-\u06FF.-]+$/.test(trimmed)) return res.status(400).json({ error: 'نام کاربری فقط حروف، عدد، خط تیره و نقطه مجاز است' });
                const existing = await User.findOne({ where: { username: trimmed } });
                if (existing && existing.id !== user.id) return res.status(400).json({ error: 'این نام کاربری قبلاً استفاده شده است' });
                user.username = trimmed;
            } else user.username = null;
        }
        if (email !== undefined && !isMainAdmin(user)) user.email = email;
        if (role !== undefined && !isMainAdmin(user)) user.role = role;
        if (departmentId !== undefined) user.departmentId = departmentId;
        if (branchId !== undefined && req.canManageUsers()) user.branchId = branchId || null;
        if (isActive !== undefined) { if (isMainAdmin(user)) user.isActive = true; else user.isActive = !!isActive; }
        if (req.body.password) {
            if (String(req.body.password).length < 6) return res.status(400).json({ error: 'رمز عبور حداقل ۶ کاراکتر باشد' });
            user.password = req.body.password;
        }
        if (permissions !== undefined && typeof permissions === 'object' && !isMainAdmin(user)) {
            const merged = { ...(user.permissions || {}) };
            Object.keys(permissions).forEach(k => { merged[k] = !!permissions[k]; });
            if (!isMainAdmin(req.user) && req.user.role !== 'owner' && req.user.role !== 'admin') {
                delete merged.manage_users;
            }
            user.permissions = merged;
        }
        if (req.body.skillsKeywords !== undefined) {
            const settings = { ...(user.settings || {}) };
            settings.skillsKeywords = req.body.skillsKeywords ? String(req.body.skillsKeywords).trim() : null;
            user.settings = settings;
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

// حذف کاربر با انتقال مکالمات، تسک‌ها، تیکت‌ها و فرایندها به کاربر دیگر
router.post('/:id/delete-with-transfer', async (req, res) => {
    try {
        if (!req.canManageUsers()) return res.status(403).json({ error: 'فقط مدیر مجموعه یا کسی که دسترسی مدیریت کاربران دارد می‌تواند کاربر را حذف کند' });
        const userId = req.params.id;
        const { transferToUserId } = req.body;
        if (!transferToUserId) return res.status(400).json({ error: 'انتخاب کاربر برای انتقال داده‌ها الزامی است' });
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
        if (isMainAdmin(user)) return res.status(403).json({ error: 'امکان حذف ادمین اصلی وجود ندارد' });
        const transferTo = await User.findByPk(transferToUserId);
        if (!transferTo || !transferTo.isActive) return res.status(400).json({ error: 'کاربر مقصد معتبر نیست' });
        if (transferTo.id === userId) return res.status(400).json({ error: 'کاربر مقصد نمی‌تواند خود کاربر حذفشونده باشد' });
        await Conversation.update({ assignedTo: transferToUserId }, { where: { assignedTo: userId } });
        await Task.update({ assignedTo: transferToUserId }, { where: { assignedTo: userId } });
        await Task.update({ createdBy: transferToUserId }, { where: { createdBy: userId } });
        await Ticket.update({ assignedTo: transferToUserId }, { where: { assignedTo: userId } });
        await Ticket.update({ createdBy: transferToUserId }, { where: { createdBy: userId } });
        await ProcessInstance.update({ assignedTo: transferToUserId }, { where: { assignedTo: userId } });
        await ProcessInstance.update({ createdBy: transferToUserId }, { where: { createdBy: userId } });
        await ProcessInstanceStep.update({ assignedTo: transferToUserId }, { where: { assignedTo: userId } });
        user.isActive = false;
        await user.save();
        const u = user.toJSON();
        delete u.password;
        res.json({ message: 'کاربر غیرفعال شد و داده‌ها منتقل شد', user: u });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// حذف دائمی کاربر از سیستم (انتقال داده‌ها سپس حذف رکورد)
router.post('/:id/permanent-delete', async (req, res) => {
    try {
        if (!req.canManageUsers()) return res.status(403).json({ error: 'فقط مدیر مجموعه یا کسی که دسترسی مدیریت کاربران دارد می‌تواند کاربر را حذف کند' });
        const userId = req.params.id;
        const { transferToUserId } = req.body;
        if (!transferToUserId) return res.status(400).json({ error: 'انتخاب کاربر برای انتقال داده‌ها الزامی است' });
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
        if (isMainAdmin(user)) return res.status(403).json({ error: 'امکان حذف ادمین اصلی وجود ندارد' });
        const transferTo = await User.findByPk(transferToUserId);
        if (!transferTo || !transferTo.isActive) return res.status(400).json({ error: 'کاربر مقصد معتبر نیست' });
        if (transferTo.id === userId) return res.status(400).json({ error: 'کاربر مقصد نمی‌تواند خود کاربر حذفشونده باشد' });

        await Conversation.update({ assignedTo: transferToUserId }, { where: { assignedTo: userId } });
        await Conversation.update({ closedBy: transferToUserId }, { where: { closedBy: userId } });
        if (Message) await Message.update({ userId: transferToUserId }, { where: { userId } });
        await Task.update({ assignedTo: transferToUserId }, { where: { assignedTo: userId } });
        await Task.update({ createdBy: transferToUserId }, { where: { createdBy: userId } });
        await Ticket.update({ assignedTo: transferToUserId }, { where: { assignedTo: userId } });
        await Ticket.update({ createdBy: transferToUserId }, { where: { createdBy: userId } });
        await ProcessInstance.update({ assignedTo: transferToUserId }, { where: { assignedTo: userId } });
        await ProcessInstance.update({ createdBy: transferToUserId }, { where: { createdBy: userId } });
        await ProcessInstanceStep.update({ assignedTo: transferToUserId }, { where: { assignedTo: userId } });

        if (ActivityLog) await ActivityLog.update({ userId: transferToUserId }, { where: { userId } });
        if (TaskUpdate) await TaskUpdate.update({ userId: transferToUserId }, { where: { userId } });
        if (TicketReply) await TicketReply.update({ userId: transferToUserId }, { where: { userId } });
        if (CustomerNote) await CustomerNote.update({ userId: transferToUserId }, { where: { userId } });
        if (Transaction) await Transaction.update({ userId: transferToUserId }, { where: { userId } });

        if (AnnouncementRead) await AnnouncementRead.destroy({ where: { userId } });
        if (InternalThreadParticipant) await InternalThreadParticipant.destroy({ where: { userId } });
        if (InternalMessage) await InternalMessage.update({ fromUserId: transferToUserId }, { where: { fromUserId: userId } });
        if (PasswordResetToken) await PasswordResetToken.destroy({ where: { userId } });

        await user.destroy();
        res.json({ message: 'کاربر به‌طور دائمی از سیستم حذف شد' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

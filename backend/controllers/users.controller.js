/**
 * Users controller — list, me, CRUD, delete-with-transfer
 */
const {
    User,
    Department,
    Branch,
    Conversation,
    Message,
    Task,
    Ticket,
    ProcessInstance,
    ProcessInstanceStep,
    ActivityLog,
    TaskUpdate,
    TicketReply,
    AnnouncementRead,
    InternalThreadParticipant,
    InternalMessage,
    CustomerNote,
    Transaction,
    PasswordResetToken,
    sequelize,
} = require('../models');
const { getPermissions, isMainAdmin, canDeleteCustomer, canDeleteUser, canManageTickets } = require('../lib/permissions');
const { validatePassword } = require('../lib/passwordValidation');
const { isValidUUID } = require('../lib/validation');
const { getPanelSettings, getPanelEmailConfig } = require('../services/panelSettingsLoader');

async function list(req, res, next) {
    try {
        if (!req.canAccess('users')) {
            return res.status(403).json({ error: 'دسترسی به بخش کاربران ندارید' });
        }
        const where = {};
        if (!req.canManageUsers() && req.user.branchId) {
            where.branchId = req.user.branchId;
        }
        const users = await User.findAll({
            where,
            attributes: { exclude: ['password'] },
            include: [
                { model: Department, as: 'department', attributes: ['id', 'name'], required: false },
                { model: Branch, as: 'branch', attributes: ['id', 'name', 'city'], required: false },
            ],
        });
        const canManage = req.canManageUsers();
        const list = users.map((u) => {
            const j = u.toJSON();
            j.isProtectedAdmin = isMainAdmin(u);
            if (canManage) j.permissions = getPermissions(u);
            if (!canManage && u.id !== req.userId) j.email = undefined;
            return j;
        });
        res.json({ data: list });
    } catch (err) {
        next(err);
    }
}

function me(req, res) {
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
        position: u.position,
        departmentId: u.departmentId,
        branchId: u.branchId,
        status: u.status,
        lastLoginAt: u.lastLoginAt,
        department: u.department,
        branch: u.branch,
        permissions: req.permissions,
        totpEnabled: !!u.totpEnabled,
        canDeleteCustomer: canDeleteCustomer(u),
        canDeleteUser: canDeleteUser(u),
        canManageTickets: canManageTickets(u),
        isProtectedAdmin: isMainAdmin(u),
    };
    res.json(out);
}

async function patchMe(req, res, next) {
    try {
        const user = req.user;
        const { username, firstName, lastName, dateOfBirth, name, phone, password, avatar, email } = req.body;
        if (username !== undefined) {
            const trimmed = String(username).trim();
            if (trimmed) {
                if (!/^[a-zA-Z0-9_\u0600-\u06FF.-]+$/.test(trimmed)) {
                    return res.status(400).json({ error: 'نام کاربری فقط حروف، عدد، خط تیره و نقطه مجاز است' });
                }
                const existing = await User.findOne({ where: { username: trimmed } });
                if (existing && existing.id !== user.id) {
                    return res.status(400).json({ error: 'این نام کاربری قبلاً استفاده شده است' });
                }
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
        if (avatar !== undefined) {
            const a = avatar ? String(avatar).trim() : null;
            if (a && !/^https?:\/\//i.test(a) && !a.startsWith('/uploads/')) {
                return res.status(400).json({ error: 'آدرس آواتار نامعتبر است' });
            }
            user.avatar = a || null;
        }
        if (email !== undefined && req.canManageUsers()) {
            const trimmed = String(email).trim().toLowerCase();
            if (!trimmed) return res.status(400).json({ error: 'ایمیل الزامی است' });
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                return res.status(400).json({ error: 'فرمت ایمیل نامعتبر است' });
            }
            const existing = await User.findOne({ where: { email: trimmed } });
            if (existing && existing.id !== user.id) {
                return res.status(400).json({ error: 'این ایمیل قبلاً استفاده شده است' });
            }
            user.email = trimmed;
        }
        if (password !== undefined && password) {
            const pwdCheck = validatePassword(password);
            if (!pwdCheck.valid) return res.status(400).json({ error: pwdCheck.message });
            user.password = password;
        }
        await user.save();
        const u = user.toJSON();
        delete u.password;
        res.json(u);
    } catch (err) {
        next(err);
    }
}

async function getById(req, res, next) {
    try {
        if (!req.canAccess('users')) {
            return res.status(403).json({ error: 'دسترسی به بخش کاربران ندارید' });
        }
        if (!isValidUUID(req.params.id)) {
            return res.status(400).json({ error: 'شناسه نامعتبر است' });
        }
        const user = await User.findByPk(req.params.id, {
            attributes: { exclude: ['password'] },
            include: [
                { model: Department, as: 'department' },
                { model: Branch, as: 'branch', required: false },
            ],
        });
        if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
        const j = user.toJSON();
        j.isProtectedAdmin = isMainAdmin(user);
        if (req.canManageUsers()) j.permissions = getPermissions(user);
        if (!req.canManageUsers() && user.id !== req.userId) j.email = undefined;
        res.json(j);
    } catch (err) {
        next(err);
    }
}

async function create(req, res, next) {
    try {
        if (!req.canManageUsers()) {
            return res.status(403).json({ error: 'فقط مدیر مجموعه یا کسی که دسترسی مدیریت کاربران دارد می‌تواند کاربر جدید بسازد' });
        }
        const { name, username, email, password, role, departmentId, branchId, permissions, skillsKeywords, position } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'نام، ایمیل و رمز الزامی است' });
        }
        const pwdCheck = validatePassword(password);
        if (!pwdCheck.valid) return res.status(400).json({ error: pwdCheck.message });
        const trimmedEmail = String(email).trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            return res.status(400).json({ error: 'فرمت ایمیل نامعتبر است' });
        }
        const existingEmail = await User.findOne({ where: { email: trimmedEmail } });
        if (existingEmail) return res.status(400).json({ error: 'این ایمیل قبلاً استفاده شده است' });
        if (username !== undefined && username) {
            const trimmed = String(username).trim();
            if (!/^[a-zA-Z0-9_\u0600-\u06FF.-]+$/.test(trimmed)) {
                return res.status(400).json({ error: 'نام کاربری فقط حروف، عدد، خط تیره و نقطه مجاز است' });
            }
            const existing = await User.findOne({ where: { username: trimmed } });
            if (existing) return res.status(400).json({ error: 'این نام کاربری قبلاً استفاده شده است' });
        }
        const validRoles = ['owner', 'admin', 'manager', 'supervisor', 'agent'];
        if (role && !validRoles.includes(role)) return res.status(400).json({ error: 'نقش نامعتبر است' });
        if (departmentId && !isValidUUID(departmentId)) {
            return res.status(400).json({ error: 'شناسه دپارتمان نامعتبر است' });
        }
        if (branchId && !isValidUUID(branchId)) return res.status(400).json({ error: 'شناسه شعبه نامعتبر است' });
        const finalBranchId = req.canManageUsers() ? (branchId || null) : (req.user.branchId || null);
        const user = await User.create({
            name,
            username: (username && String(username).trim()) || null,
            email: trimmedEmail,
            password,
            role: role || 'agent',
            position: position ? String(position).trim() : null,
            departmentId: departmentId || null,
            branchId: finalBranchId,
            permissions: permissions && typeof permissions === 'object' ? permissions : {},
            settings: skillsKeywords ? { notifications: true, soundAlerts: true, autoAssign: true, skillsKeywords: String(skillsKeywords).trim() } : undefined,
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
        next(err);
    }
}

async function update(req, res, next) {
    try {
        if (!req.canManageUsers()) {
            return res.status(403).json({ error: 'فقط مدیر مجموعه یا کسی که دسترسی مدیریت کاربران دارد می‌تواند کاربر را ویرایش کند' });
        }
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
        if (isMainAdmin(user)) {
            return res.status(403).json({
                error: 'اطلاعات ادمین اصلی سیستم غیر قابل ویرایش است. هیچ کاربری حتی با بالاترین سطح دسترسی امکان ویرایش ادمین اصلی را ندارد.',
            });
        }
        const { name, username, email, role, departmentId, branchId, isActive, permissions, position } = req.body;
        if (name !== undefined) {
            const trimmedName = String(name).trim();
            if (!trimmedName) return res.status(400).json({ error: 'نام نمی‌تواند خالی باشد' });
            user.name = trimmedName;
        }
        if (position !== undefined) user.position = position ? String(position).trim() : null;
        if (username !== undefined) {
            const trimmed = String(username || '').trim();
            if (trimmed) {
                if (!/^[a-zA-Z0-9_\u0600-\u06FF.-]+$/.test(trimmed)) {
                    return res.status(400).json({ error: 'نام کاربری فقط حروف، عدد، خط تیره و نقطه مجاز است' });
                }
                const existing = await User.findOne({ where: { username: trimmed } });
                if (existing && existing.id !== user.id) {
                    return res.status(400).json({ error: 'این نام کاربری قبلاً استفاده شده است' });
                }
                user.username = trimmed;
            } else user.username = null;
        }
        if (email !== undefined) {
            const trimmed = String(email).trim().toLowerCase();
            if (!trimmed) return res.status(400).json({ error: 'ایمیل الزامی است' });
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                return res.status(400).json({ error: 'فرمت ایمیل نامعتبر است' });
            }
            const existingEmail = await User.findOne({ where: { email: trimmed } });
            if (existingEmail && existingEmail.id !== user.id) {
                return res.status(400).json({ error: 'این ایمیل قبلاً استفاده شده است' });
            }
            user.email = trimmed;
        }
        if (role !== undefined) {
            const validRoles = ['owner', 'admin', 'manager', 'supervisor', 'agent'];
            if (!validRoles.includes(role)) return res.status(400).json({ error: 'نقش نامعتبر است' });
            if (user.id === req.userId && req.user.role === 'owner' && role !== 'owner') {
                return res.status(400).json({ error: 'مالک نمی‌تواند نقش خود را تغییر دهد' });
            }
            user.role = role;
        }
        if (departmentId !== undefined) {
            if (departmentId && !isValidUUID(departmentId)) {
                return res.status(400).json({ error: 'شناسه دپارتمان نامعتبر است' });
            }
            user.departmentId = departmentId || null;
        }
        if (branchId !== undefined && req.canManageUsers()) {
            if (branchId && !isValidUUID(branchId)) {
                return res.status(400).json({ error: 'شناسه شعبه نامعتبر است' });
            }
            user.branchId = branchId || null;
        }
        if (isActive !== undefined) user.isActive = !!isActive;
        if (req.body.password) {
            const pwdCheck = validatePassword(req.body.password);
            if (!pwdCheck.valid) return res.status(400).json({ error: pwdCheck.message });
            user.password = req.body.password;
        }
        if (permissions !== undefined && typeof permissions === 'object') {
            const merged = { ...(user.permissions || {}) };
            Object.keys(permissions).forEach((k) => { merged[k] = !!permissions[k]; });
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
        next(err);
    }
}

async function deleteWithTransfer(req, res, next) {
    try {
        if (!req.canDeleteUser()) {
            return res.status(403).json({ error: 'فقط مالک مجموعه (بالاترین سطح دسترسی) می‌تواند کاربر را حذف کند' });
        }
        const { isValidUUID } = require('../lib/validation');
        const userId = req.params.id;
        if (!isValidUUID(userId)) return res.status(400).json({ error: 'شناسه کاربر نامعتبر است' });
        const { transferToUserId } = req.body;
        if (!transferToUserId) return res.status(400).json({ error: 'انتخاب کاربر برای انتقال داده‌ها الزامی است' });
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
        if (isMainAdmin(user)) return res.status(403).json({ error: 'امکان حذف ادمین اصلی وجود ندارد' });
        const transferTo = await User.findByPk(transferToUserId);
        if (!transferTo || !transferTo.isActive) return res.status(400).json({ error: 'کاربر مقصد معتبر نیست' });
        if (transferTo.id === userId) return res.status(400).json({ error: 'کاربر مقصد نمی‌تواند خود کاربر حذفشونده باشد' });
        const t = await sequelize.transaction();
        try {
            await Conversation.update({ assignedTo: transferToUserId }, { where: { assignedTo: userId }, transaction: t });
            await Task.update({ assignedTo: transferToUserId }, { where: { assignedTo: userId }, transaction: t });
            await Task.update({ createdBy: transferToUserId }, { where: { createdBy: userId }, transaction: t });
            await Ticket.update({ assignedTo: transferToUserId }, { where: { assignedTo: userId }, transaction: t });
            await Ticket.update({ createdBy: transferToUserId }, { where: { createdBy: userId }, transaction: t });
            await ProcessInstance.update({ assignedTo: transferToUserId }, { where: { assignedTo: userId }, transaction: t });
            await ProcessInstance.update({ createdBy: transferToUserId }, { where: { createdBy: userId }, transaction: t });
            await ProcessInstanceStep.update({ assignedTo: transferToUserId }, { where: { assignedTo: userId }, transaction: t });
            await user.update({ isActive: false }, { transaction: t });
            await t.commit();
        } catch (txErr) {
            await t.rollback();
            throw txErr;
        }
        const u = user.toJSON();
        delete u.password;
        res.json({ message: 'کاربر غیرفعال شد و داده‌ها منتقل شد', user: u });
    } catch (err) {
        next(err);
    }
}

async function permanentDelete(req, res, next) {
    try {
        if (!req.canDeleteUser()) {
            return res.status(403).json({ error: 'فقط مالک مجموعه (بالاترین سطح دسترسی) می‌تواند کاربر را حذف کند' });
        }
        const userId = req.params.id;
        const { transferToUserId } = req.body;
        if (!transferToUserId) return res.status(400).json({ error: 'انتخاب کاربر برای انتقال داده‌ها الزامی است' });
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
        if (isMainAdmin(user)) return res.status(403).json({ error: 'امکان حذف ادمین اصلی وجود ندارد' });
        const transferTo = await User.findByPk(transferToUserId);
        if (!transferTo || !transferTo.isActive) return res.status(400).json({ error: 'کاربر مقصد معتبر نیست' });
        if (transferTo.id === userId) return res.status(400).json({ error: 'کاربر مقصد نمی‌تواند خود کاربر حذفشونده باشد' });
        const t = await sequelize.transaction();
        try {
            await Conversation.update({ assignedTo: transferToUserId }, { where: { assignedTo: userId }, transaction: t });
            await Conversation.update({ closedBy: transferToUserId }, { where: { closedBy: userId }, transaction: t });
            if (Message) await Message.update({ userId: transferToUserId }, { where: { userId }, transaction: t });
            await Task.update({ assignedTo: transferToUserId }, { where: { assignedTo: userId }, transaction: t });
            await Task.update({ createdBy: transferToUserId }, { where: { createdBy: userId }, transaction: t });
            await Ticket.update({ assignedTo: transferToUserId }, { where: { assignedTo: userId }, transaction: t });
            await Ticket.update({ createdBy: transferToUserId }, { where: { createdBy: userId }, transaction: t });
            await ProcessInstance.update({ assignedTo: transferToUserId }, { where: { assignedTo: userId }, transaction: t });
            await ProcessInstance.update({ createdBy: transferToUserId }, { where: { createdBy: userId }, transaction: t });
            await ProcessInstanceStep.update({ assignedTo: transferToUserId }, { where: { assignedTo: userId }, transaction: t });
            if (ActivityLog) await ActivityLog.update({ userId: transferToUserId }, { where: { userId }, transaction: t });
            if (TaskUpdate) await TaskUpdate.update({ userId: transferToUserId }, { where: { userId }, transaction: t });
            if (TicketReply) await TicketReply.update({ userId: transferToUserId }, { where: { userId }, transaction: t });
            if (CustomerNote) await CustomerNote.update({ userId: transferToUserId }, { where: { userId }, transaction: t });
            if (Transaction) await Transaction.update({ userId: transferToUserId }, { where: { userId }, transaction: t });
            if (AnnouncementRead) await AnnouncementRead.destroy({ where: { userId }, transaction: t });
            if (InternalThreadParticipant) await InternalThreadParticipant.destroy({ where: { userId }, transaction: t });
            if (InternalMessage) await InternalMessage.update({ fromUserId: transferToUserId }, { where: { fromUserId: userId }, transaction: t });
            if (PasswordResetToken) await PasswordResetToken.destroy({ where: { userId }, transaction: t });
            await user.destroy({ transaction: t });
            await t.commit();
        } catch (txErr) {
            await t.rollback();
            throw txErr;
        }
        res.json({ message: 'کاربر به‌طور دائمی از سیستم حذف شد' });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    list,
    me,
    patchMe,
    getById,
    create,
    update,
    deleteWithTransfer,
    permanentDelete,
};

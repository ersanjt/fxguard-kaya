const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { sequelize, Customer, Conversation, Message, CustomerNote, CustomerDocument, User, ActivityLog, Department, Transaction, CashBox, BankAccount, Tag } = require('../models');
const { logActivity } = require('../services/activityLog');
const { Op } = require('sequelize');
const { getAccessibleCustomerIds, canAccessCustomer } = require('../lib/customerAccess');
const { normalizePhone } = require('../lib/phoneUtils');
const { isValidUUID, parsePagination, safeString } = require('../lib/validation');
const { persistRemoteAvatarIfNeeded } = require('../lib/customerAvatar');
const { getCustomerAvatar } = require('./customerAvatar');
const { redactCustomerPhone } = require('../lib/customerPhoneVisibility');

// آپلود اسناد مشتری
const docStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/customers', req.params.id || 'tmp');
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
        cb(null, Date.now() + '_' + safe);
    }
});
const BLOCKED_EXTS = ['.php', '.asp', '.exe', '.bat', '.sh', '.js', '.html', '.htaccess'];
const docUpload = multer({
    storage: docStorage,
    limits: { fileSize: 30 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (BLOCKED_EXTS.includes(ext)) return cb(new Error('نوع فایل مجاز نیست'));
        cb(null, true);
    }
});

router.get('/', async (req, res, next) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی به بخش مشتریان ندارید' });
        const { page = 1, limit = 100, search, status } = req.query;
        const { page: p, limit: l, offset } = parsePagination(page, limit, 200);
        const customerIds = await getAccessibleCustomerIds(req);
        const where = {};
        if (customerIds && customerIds.length === 0) {
            return res.json({ data: [], total: 0, page: p, stats: { total: 0, active: 0, inactive: 0, blocked: 0 } });
        }
        if (customerIds) where.id = { [Op.in]: customerIds };
        if (status && ['active', 'inactive', 'blocked'].includes(status)) where.status = status;
        if (search && String(search).trim()) {
            const term = '%' + String(search).trim().replace(/[%_\\]/g, '\\$&') + '%';
            where[Op.or] = [
                { name: { [Op.like]: term } },
                { phone: { [Op.like]: term } },
                { email: { [Op.like]: term } }
            ];
        }
        const statsWhere = customerIds ? { id: { [Op.in]: customerIds } } : {};
        const [stats, { rows, count }] = await Promise.all([
            !search ? Customer.findAll({
                where: statsWhere,
                attributes: ['status', [sequelize.fn('COUNT', sequelize.col('status')), 'cnt']],
                group: ['status'],
                raw: true
            }).then(rows => {
                const map = {};
                let total = 0;
                for (const r of rows) { map[r.status] = parseInt(r.cnt, 10); total += parseInt(r.cnt, 10); }
                return { total, active: map.active || 0, inactive: map.inactive || 0, blocked: map.blocked || 0 };
            }) : Promise.resolve(null),
            Customer.findAndCountAll({
                where,
                order: [['lastContactAt', 'DESC']],
                limit: l,
                offset
            })
        ]);
        const custIds = rows.map(r => r.id);
        const latestConvs = custIds.length > 0 ? await Conversation.findAll({
            where: { customerId: { [Op.in]: custIds }, status: { [Op.ne]: 'closed' } },
            include: [
                { model: User, as: 'assignee', attributes: ['id', 'name'] },
                { model: Department, as: 'department', attributes: ['id', 'name'], required: false }
            ],
            order: [['lastMessageAt', 'DESC']],
            raw: false
        }).then(convs => {
            const byCust = {};
            convs.forEach(c => { if (!byCust[c.customerId]) byCust[c.customerId] = c; });
            return byCust;
        }) : {};
        const enriched = rows.map(c => {
            const plain = c.get ? c.get({ plain: true }) : c;
            const cid = plain.id;
            const lc = latestConvs[cid];
            const row = {
                ...plain,
                lastOpenConv: lc ? { id: lc.id, assignee: lc.assignee ? lc.assignee.get ? lc.assignee.get({ plain: true }) : lc.assignee : null, department: lc.department ? (lc.department.get ? lc.department.get({ plain: true }) : lc.department) : null, status: lc.status } : null
            };
            return redactCustomerPhone(row, req.user);
        });
        res.json({ data: enriched, total: count, page: p, stats: stats || null });
    } catch (err) {
        next(err);
    }
});

router.get('/:id/avatar', getCustomerAvatar);

router.get('/:id', async (req, res, next) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی به بخش مشتریان ندارید' });
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const customer = await Customer.findByPk(req.params.id, {
            include: [{ model: Tag, as: 'tags', attributes: ['id', 'name', 'color'], through: { attributes: [] } }]
        });
        if (!customer) return res.status(404).json({ error: 'مشتری یافت نشد' });
        const allowed = await canAccessCustomer(req, customer.id);
        if (!allowed) return res.status(403).json({ error: 'دسترسی به این مشتری ندارید' });
        res.json(redactCustomerPhone(customer, req.user));
    } catch (err) {
        next(err);
    }
});

router.get('/:id/conversations', async (req, res, next) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی به بخش مشتریان ندارید' });
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const allowed = await canAccessCustomer(req, req.params.id);
        if (!allowed) return res.status(403).json({ error: 'دسترسی به این مشتری ندارید' });
        const conversations = await Conversation.findAll({
            where: { customerId: req.params.id },
            include: [{ model: User, as: 'assignee', attributes: ['id', 'name', 'email'] }],
            order: [['lastMessageAt', 'DESC']]
        });
        const convIds = conversations.map(c => c.id);
        const countMap = {};
        const lastOutgoingMap = {};
        if (convIds.length > 0) {
            const [countRows, lastOutgoings] = await Promise.all([
                Message.findAll({
                    where: { conversationId: { [Op.in]: convIds } },
                    attributes: ['conversationId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
                    group: ['conversationId'],
                    raw: true
                }),
                Message.findAll({
                    where: { conversationId: { [Op.in]: convIds }, direction: 'outgoing' },
                    include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
                    order: [['timestamp', 'DESC']],
                    limit: Math.min(convIds.length * 5, 200),
                    raw: false
                })
            ]);
            countRows.forEach(r => { countMap[r.conversationId] = parseInt(r.count) || 0; });
            lastOutgoings.forEach(m => {
                if (!lastOutgoingMap[m.conversationId]) lastOutgoingMap[m.conversationId] = m.user ? m.user.name : null;
            });
        }
        const withCount = conversations.map((c) => {
            const lastOutgoing = lastOutgoingMap[c.id];
            return {
                id: c.id, status: c.status, priority: c.priority, lastMessageAt: c.lastMessageAt, messageCount: countMap[c.id] || 0, createdAt: c.createdAt,
                assignedTo: c.assignedTo, assignee: c.assignee, lastOutgoingBy: lastOutgoing,
                metadata: c.metadata || {}
            };
        });
        res.json({ data: withCount });
    } catch (err) {
        next(err);
    }
});

router.get('/:id/timeline', async (req, res, next) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی به بخش مشتریان ندارید' });
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const allowed = await canAccessCustomer(req, req.params.id);
        if (!allowed) return res.status(403).json({ error: 'دسترسی به این مشتری ندارید' });
        const customerId = req.params.id;
        let transactions = [];
        const [conversationsRaw, notes, activities, txList] = await Promise.all([
            Conversation.findAll({
                where: { customerId },
                include: [{ model: User, as: 'assignee', attributes: ['id', 'name'] }],
                order: [['lastMessageAt', 'DESC']]
            }),
            CustomerNote.findAll({
                where: { customerId },
                include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
                order: [['createdAt', 'DESC']]
            }),
            ActivityLog.findAll({
                where: { customerId },
                include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
                order: [['createdAt', 'DESC']],
                limit: 100
            }),
            Transaction.findAll({
                where: { customerId },
                order: [['transactionDate', 'DESC'], ['createdAt', 'DESC']],
                limit: 50
            }).catch(() => [])
        ]);
        transactions = Array.isArray(txList) ? txList : [];
        const convIds = conversationsRaw.map(c => c.id);
        const convCountMap = {};
        if (convIds.length > 0) {
            const countRows = await Message.findAll({
                where: { conversationId: { [Op.in]: convIds } },
                attributes: ['conversationId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
                group: ['conversationId'],
                raw: true
            });
            countRows.forEach(r => { convCountMap[r.conversationId] = parseInt(r.count) || 0; });
        }
        const convWithCount = conversationsRaw.map((c) => {
            const plain = c.get ? c.get({ plain: true }) : c;
            return { ...plain, messageCount: convCountMap[c.id] || 0 };
        });
        const items = [];
        convWithCount.forEach(c => {
            items.push({ type: 'conversation', date: c.lastMessageAt || c.createdAt, data: c, assignee: c.assignee });
        });
        notes.forEach(n => {
            items.push({ type: 'note', date: n.createdAt, data: n, user: n.user });
        });
        activities.forEach(a => {
            items.push({ type: 'activity', date: a.createdAt, data: a, user: a.user });
        });
        transactions.forEach(t => {
            items.push({ type: 'transaction', date: t.transactionDate || t.createdAt, data: t });
        });
        items.sort((a, b) => new Date(b.date) - new Date(a.date));
        res.json({ data: items });
    } catch (err) {
        next(err);
    }
});

router.post('/', async (req, res, next) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی به بخش مشتریان ندارید' });
        const { name, phone, email, notes, status, customFields, source, profilePic, tagIds,
            birthDate, nationalId, nationality, gender, occupation, companyName,
            address, city, country, postalCode, instagram, telegram, website } = req.body;
        if (!name && !phone) return res.status(400).json({ error: 'نام یا شماره تلفن الزامی است' });
        const allowedStatuses = ['active', 'inactive', 'blocked'];
        const customerData = {
            name: name ? String(name).trim() : null,
            phone: phone ? (normalizePhone(phone) || String(phone).trim()) : null,
            email: email ? String(email).trim().toLowerCase() : null,
            notes: notes ? String(notes).trim() : null,
            status: status && allowedStatuses.includes(status) ? status : 'active',
            customFields: customFields && typeof customFields === 'object' ? customFields : {},
            source: source || 'manual',
            profilePic: profilePic ? String(profilePic).trim() : null,
            birthDate: birthDate || null,
            nationalId: nationalId || null,
            nationality: nationality || null,
            gender: ['male','female','other'].includes(gender) ? gender : null,
            occupation: occupation || null,
            companyName: companyName || null,
            address: address || null,
            city: city || null,
            country: country || null,
            postalCode: postalCode || null,
            instagram: instagram || null,
            telegram: telegram || null,
            website: website || null,
        };
        const customer = await Customer.create(customerData);
        if (customerData.profilePic && String(customerData.profilePic).trim()) {
            try {
                const persisted = await persistRemoteAvatarIfNeeded(customer.id, String(customerData.profilePic).trim());
                if (persisted && persisted !== customer.profilePic) await customer.update({ profilePic: persisted });
            } catch (_) {}
        }
        if (tagIds && Array.isArray(tagIds) && tagIds.length) {
            await customer.setTags(tagIds);
        }
        const created = await Customer.findByPk(customer.id, {
            include: [{ model: Tag, as: 'tags', attributes: ['id', 'name', 'color'], through: { attributes: [] } }]
        });
        res.status(201).json(redactCustomerPhone(created || customer, req.user));
    } catch (err) {
        next(err);
    }
});

router.put('/:id', async (req, res, next) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی به بخش مشتریان ندارید' });
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const customer = await Customer.findByPk(req.params.id);
        if (!customer) return res.status(404).json({ error: 'مشتری یافت نشد' });
        const allowed = await canAccessCustomer(req, customer.id);
        if (!allowed) return res.status(403).json({ error: 'دسترسی به این مشتری ندارید' });
        const { name, phone, email, status, notes, customFields } = req.body;
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) {
            if (!req.canViewCustomerPhone || !req.canViewCustomerPhone()) {
                // بدون دسترسی مشاهده شماره، اجازهٔ تغییر تلفن نیست
            } else {
                updateData.phone = normalizePhone(phone) || phone;
            }
        }
        if (email !== undefined) updateData.email = email;
        if (notes !== undefined) updateData.notes = notes;
        if (customFields !== undefined) updateData.customFields = customFields;
        if (req.body.profilePic !== undefined) updateData.profilePic = req.body.profilePic;
        if (updateData.profilePic !== undefined && updateData.profilePic) {
            try {
                const persisted = await persistRemoteAvatarIfNeeded(customer.id, String(updateData.profilePic).trim());
                if (persisted) updateData.profilePic = persisted;
            } catch (_) {}
        }
        // فیلدهای شخصی
        const personalFields = ['birthDate', 'nationalId', 'nationality', 'gender', 'occupation', 'companyName', 'address', 'city', 'country', 'postalCode', 'instagram', 'telegram', 'website'];
        personalFields.forEach(f => { if (req.body[f] !== undefined) updateData[f] = req.body[f] || null; });
        const role = req.user.role;
        const canEditStatus = ['owner', 'admin', 'manager'].indexOf(role) !== -1 || (req.user.permissions && req.user.permissions.manage_users);
        if (status !== undefined && canEditStatus) updateData.status = status;
        await customer.update(updateData);
        res.json(redactCustomerPhone(customer, req.user));
    } catch (err) {
        next(err);
    }
});

// حذف مشتری — فقط ادمین یا مدیر (یا مالک)
router.delete('/:id', async (req, res, next) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی به بخش مشتریان ندارید' });
        if (!req.canDeleteCustomer()) return res.status(403).json({ error: 'فقط ادمین یا مدیر می‌توانند مشتری را حذف کنند' });
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const customer = await Customer.findByPk(req.params.id);
        if (!customer) return res.status(404).json({ error: 'مشتری یافت نشد' });
        const allowed = await canAccessCustomer(req, customer.id);
        if (!allowed) return res.status(403).json({ error: 'دسترسی به این مشتری ندارید' });

        const customerId = customer.id;
        const t = await sequelize.transaction();
        try {
            const convRows = await Conversation.findAll({ where: { customerId }, transaction: t });
            for (const conv of convRows) {
                await conv.setTags([], { transaction: t });
            }
            await Message.destroy({ where: { customerId }, transaction: t });
            await Conversation.destroy({ where: { customerId }, transaction: t });
            await customer.setTags([], { transaction: t });
            const docs = await CustomerDocument.findAll({ where: { customerId }, transaction: t });
            for (const doc of docs) {
                try {
                    const absPath = path.join(__dirname, '..', 'public', doc.filePath);
                    const absPath2 = path.join(__dirname, '..', String(doc.filePath).replace(/^\//, ''));
                    if (fs.existsSync(absPath2)) fs.unlinkSync(absPath2);
                    else if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
                } catch (_) {}
                await doc.destroy({ transaction: t });
            }
            await CustomerNote.destroy({ where: { customerId }, transaction: t });
            await ActivityLog.destroy({ where: { customerId }, transaction: t });
            await Transaction.update({ customerId: null }, { where: { customerId }, transaction: t });
            await customer.destroy({ transaction: t });
            await t.commit();
        } catch (txErr) {
            await t.rollback();
            throw txErr;
        }

        await logActivity({
            userId: req.userId,
            action: 'customer_deleted',
            entityType: 'customer',
            entityId: customerId,
            summary: 'مشتری حذف شد',
            metadata: { name: customer.name, phone: customer.phone }
        });
        res.json({ message: 'مشتری حذف شد' });
    } catch (err) {
        next(err);
    }
});

// ——— گزارش/یادداشت کارمند درباره مشتری (تاریخچه هر کارمند)
router.get('/:id/transactions', async (req, res, next) => {
    try {
        if (!req.canAccess('customers') && !req.canAccess('services')) return res.status(403).json({ error: 'دسترسی ندارید' });
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const allowed = await canAccessCustomer(req, req.params.id);
        if (!allowed) return res.status(403).json({ error: 'دسترسی به این مشتری ندارید' });
        let transactions = [];
        try {
            transactions = await Transaction.findAll({
                where: { customerId: req.params.id },
            include: [
                { model: User, as: 'user', attributes: ['id', 'name'] },
                { model: CashBox, as: 'fromCashBox', attributes: ['id', 'name'] },
                { model: CashBox, as: 'toCashBox', attributes: ['id', 'name'] },
                { model: BankAccount, as: 'fromBankAccount', attributes: ['id', 'name', 'bankName'] },
                { model: BankAccount, as: 'toBankAccount', attributes: ['id', 'name', 'bankName'] }
            ],
            order: [['transactionDate', 'DESC'], ['createdAt', 'DESC']],
            limit: 200
        });
        } catch (_) { transactions = []; }
        res.json({ data: transactions });
    } catch (err) {
        next(err);
    }
});

router.get('/:id/notes', async (req, res, next) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی به بخش مشتریان ندارید' });
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const allowed = await canAccessCustomer(req, req.params.id);
        if (!allowed) return res.status(403).json({ error: 'دسترسی به این مشتری ندارید' });
        const notes = await CustomerNote.findAll({
            where: { customerId: req.params.id },
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
            order: [['createdAt', 'DESC']]
        });
        res.json({ data: notes });
    } catch (err) {
        next(err);
    }
});

router.post('/:id/notes', async (req, res, next) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی به بخش مشتریان ندارید' });
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const customer = await Customer.findByPk(req.params.id);
        if (!customer) return res.status(404).json({ error: 'مشتری یافت نشد' });
        const allowed = await canAccessCustomer(req, customer.id);
        if (!allowed) return res.status(403).json({ error: 'دسترسی به این مشتری ندارید' });
        const content = safeString(req.body.content, 5000);
        if (!content) return res.status(400).json({ error: 'متن گزارش/یادداشت الزامی است' });
        const note = await CustomerNote.create({
            customerId: req.params.id,
            userId: req.userId,
            content
        });
        const withUser = await CustomerNote.findByPk(note.id, {
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }]
        });
        const { logActivity } = require('../services/activityLog');
        await logActivity({
            userId: req.userId,
            action: 'customer_note_added',
            entityType: 'customer_note',
            entityId: note.id,
            customerId: req.params.id,
            summary: 'گزارش/یادداشت ثبت شد',
            metadata: { contentLength: content.length }
        });
        res.status(201).json(withUser);
    } catch (err) {
        next(err);
    }
});

// ——— تگ‌های مشتری
router.get('/:id/tags', async (req, res, next) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی به بخش مشتریان ندارید' });
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const allowed = await canAccessCustomer(req, req.params.id);
        if (!allowed) return res.status(403).json({ error: 'دسترسی به این مشتری ندارید' });
        const customer = await Customer.findByPk(req.params.id, {
            include: [{ model: Tag, as: 'tags', attributes: ['id', 'name', 'color'], through: { attributes: [] } }]
        });
        if (!customer) return res.status(404).json({ error: 'مشتری یافت نشد' });
        res.json({ data: customer.tags || [] });
    } catch (err) {
        next(err);
    }
});

router.put('/:id/tags', async (req, res, next) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی به بخش مشتریان ندارید' });
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const customer = await Customer.findByPk(req.params.id);
        if (!customer) return res.status(404).json({ error: 'مشتری یافت نشد' });
        const allowed = await canAccessCustomer(req, customer.id);
        if (!allowed) return res.status(403).json({ error: 'دسترسی به این مشتری ندارید' });
        const tagIds = Array.isArray(req.body.tagIds) ? req.body.tagIds : (req.body.tagIds ? [req.body.tagIds] : []);
        const validIds = tagIds.filter(id => id && String(id).trim()).map(id => String(id).trim());
        await customer.setTags(validIds);
        const updated = await Customer.findByPk(req.params.id, {
            include: [{ model: Tag, as: 'tags', attributes: ['id', 'name', 'color'], through: { attributes: [] } }]
        });
        res.json({ data: updated.tags || [] });
    } catch (err) {
        next(err);
    }
});

// ——— اسناد و مدیا مشتری
router.get('/:id/documents', async (req, res, next) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی ندارید' });
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const allowed = await canAccessCustomer(req, req.params.id);
        if (!allowed) return res.status(403).json({ error: 'دسترسی به این مشتری ندارید' });
        if (!CustomerDocument) return res.json({ data: [] });
        const { category, fileType } = req.query;
        const where = { customerId: req.params.id };
        if (category) where.category = category;
        if (fileType) where.fileType = fileType;
        const docs = await CustomerDocument.findAll({
            where,
            include: [{ model: User, as: 'uploader', attributes: ['id', 'name'], required: false }],
            order: [['createdAt', 'DESC']]
        });
        res.json({ data: docs });
    } catch (err) {
        next(err);
    }
});

router.post('/:id/documents', docUpload.single('file'), async (req, res, next) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی ندارید' });
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const customer = await Customer.findByPk(req.params.id);
        if (!customer) return res.status(404).json({ error: 'مشتری یافت نشد' });
        const allowed = await canAccessCustomer(req, customer.id);
        if (!allowed) return res.status(403).json({ error: 'دسترسی به این مشتری ندارید' });
        if (!req.file) return res.status(400).json({ error: 'فایل ارسال نشده' });

        const mime = req.file.mimetype || '';
        let fileType = 'other';
        if (mime.startsWith('image/')) fileType = 'image';
        else if (mime.startsWith('video/')) fileType = 'video';
        else if (mime.startsWith('audio/')) fileType = 'audio';
        else if (mime.includes('pdf') || mime.includes('word') || mime.includes('excel') || mime.includes('text') || mime.includes('spreadsheet') || mime.includes('presentation')) fileType = 'document';

        const filePath = '/uploads/customers/' + req.params.id + '/' + req.file.filename;
        const doc = await CustomerDocument.create({
            customerId: req.params.id,
            title: req.body.title || req.file.originalname,
            description: req.body.description || null,
            category: req.body.category || 'other',
            filePath,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            fileType,
            source: 'manual',
            uploadedBy: req.userId,
            expiresAt: req.body.expiresAt || null,
            tags: (() => { try { return req.body.tags ? JSON.parse(req.body.tags) : []; } catch(_) { return []; } })()
        });
        const withUser = await CustomerDocument.findByPk(doc.id, {
            include: [{ model: User, as: 'uploader', attributes: ['id', 'name'], required: false }]
        });
        res.status(201).json(withUser);
    } catch (err) {
        next(err);
    }
});

router.put('/:id/documents/:docId', async (req, res, next) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی ندارید' });
        if (!isValidUUID(req.params.id) || !isValidUUID(req.params.docId)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const allowed = await canAccessCustomer(req, req.params.id);
        if (!allowed) return res.status(403).json({ error: 'دسترسی به این مشتری ندارید' });
        const doc = await CustomerDocument.findOne({ where: { id: req.params.docId, customerId: req.params.id } });
        if (!doc) return res.status(404).json({ error: 'سند یافت نشد' });
        const { title, description, category, expiresAt, tags } = req.body;
        const upd = {};
        if (title !== undefined) upd.title = title;
        if (description !== undefined) upd.description = description;
        if (category !== undefined) upd.category = category;
        if (expiresAt !== undefined) upd.expiresAt = expiresAt || null;
        if (tags !== undefined) upd.tags = typeof tags === 'string' ? (() => { try { return JSON.parse(tags); } catch(_) { return []; } })() : tags;
        await doc.update(upd);
        res.json(doc);
    } catch (err) {
        next(err);
    }
});

router.delete('/:id/documents/:docId', async (req, res, next) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی ندارید' });
        if (!isValidUUID(req.params.id) || !isValidUUID(req.params.docId)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const allowed = await canAccessCustomer(req, req.params.id);
        if (!allowed) return res.status(403).json({ error: 'دسترسی به این مشتری ندارید' });
        const doc = await CustomerDocument.findOne({ where: { id: req.params.docId, customerId: req.params.id } });
        if (!doc) return res.status(404).json({ error: 'سند یافت نشد' });
        // حذف فایل از دیسک
        try {
            const absPath = path.join(__dirname, '..', 'public', doc.filePath) ;
            const absPath2 = path.join(__dirname, '..', doc.filePath.replace(/^\//, ''));
            if (fs.existsSync(absPath2)) fs.unlinkSync(absPath2);
            else if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
        } catch (_) {}
        await doc.destroy();
        res.json({ message: 'سند حذف شد' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

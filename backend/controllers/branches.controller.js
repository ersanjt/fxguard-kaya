/**
 * Branches controller — business logic for branch routes
 */
const { Branch, User, Department } = require('../models');
const { isMainAdmin } = require('../lib/permissions');
const { isValidUUID } = require('../lib/validation');
const { assertCanAddBranch, planErrorPayload } = require('../lib/planLimits');

async function list(req, res, next) {
    try {
        if (!req.canAccess('branches')) {
            return res.status(403).json({ error: 'دسترسی به بخش شعب ندارید' });
        }
        const where = { isActive: true };
        if (!isMainAdmin(req.user) && req.user.role !== 'owner' && req.user.role !== 'admin') {
            if (req.user.branchId) where.id = req.user.branchId;
            else return res.json({ data: [] });
        }
        const branches = await Branch.findAll({
            where,
            order: [['name', 'ASC']],
            include: [
                {
                    model: User,
                    as: 'users',
                    attributes: ['id', 'name', 'email', 'role'],
                    required: false,
                },
                {
                    model: Department,
                    as: 'departments',
                    attributes: ['id', 'name'],
                    required: false,
                },
            ],
        });
        res.json({ data: branches });
    } catch (err) {
        next(err);
    }
}

async function getById(req, res, next) {
    if (!isValidUUID(req.params.id)) {
        return res.status(400).json({ error: 'شناسه شعبه نامعتبر است' });
    }
    try {
        if (!req.canAccess('branches')) {
            return res.status(403).json({ error: 'دسترسی به بخش شعب ندارید' });
        }
        const branch = await Branch.findByPk(req.params.id);
        if (!branch) return res.status(404).json({ error: 'شعبه یافت نشد' });
        if (
            !isMainAdmin(req.user) &&
            req.user.role !== 'owner' &&
            req.user.role !== 'admin' &&
            req.user.branchId !== branch.id
        ) {
            return res.status(403).json({ error: 'دسترسی غیرمجاز' });
        }
        res.json(branch);
    } catch (err) {
        next(err);
    }
}

async function create(req, res, next) {
    try {
        const { name, city, country, timezone } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'نام شعبه الزامی است' });
        }
        if (String(name).trim().length > 100) {
            return res.status(400).json({ error: 'نام شعبه حداکثر ۱۰۰ کاراکتر مجاز است' });
        }
        if (city && String(city).trim().length > 100) {
            return res.status(400).json({ error: 'نام شهر حداکثر ۱۰۰ کاراکتر مجاز است' });
        }
        if (country && String(country).trim().length > 100) {
            return res.status(400).json({ error: 'نام کشور حداکثر ۱۰۰ کاراکتر مجاز است' });
        }
        if (timezone && String(timezone).trim().length > 60) {
            return res.status(400).json({ error: 'نام timezone نامعتبر است' });
        }
        try {
            await assertCanAddBranch();
        } catch (limitErr) {
            const payload = planErrorPayload(limitErr);
            if (payload) return res.status(403).json(payload);
            throw limitErr;
        }
        const branch = await Branch.create({
            name: name.trim(),
            city: (city || '').trim() || null,
            country: (country || '').trim() || null,
            timezone: timezone ? String(timezone).trim() : 'Europe/Istanbul',
            isActive: true,
        });
        res.status(201).json(branch);
    } catch (err) {
        next(err);
    }
}

async function update(req, res, next) {
    if (!isValidUUID(req.params.id)) {
        return res.status(400).json({ error: 'شناسه شعبه نامعتبر است' });
    }
    try {
        const branch = await Branch.findByPk(req.params.id);
        if (!branch) return res.status(404).json({ error: 'شعبه یافت نشد' });
        const { name, city, country, timezone, isActive } = req.body;
        if (name !== undefined) {
            if (!name || !String(name).trim()) {
                return res.status(400).json({ error: 'نام شعبه نمی‌تواند خالی باشد' });
            }
            if (String(name).trim().length > 100) {
                return res.status(400).json({ error: 'نام شعبه حداکثر ۱۰۰ کاراکتر مجاز است' });
            }
            branch.name = name.trim();
        }
        if (city !== undefined) {
            if (city && String(city).trim().length > 100) {
                return res.status(400).json({ error: 'نام شهر حداکثر ۱۰۰ کاراکتر مجاز است' });
            }
            branch.city = city ? city.trim() : null;
        }
        if (country !== undefined) {
            if (country && String(country).trim().length > 100) {
                return res.status(400).json({ error: 'نام کشور حداکثر ۱۰۰ کاراکتر مجاز است' });
            }
            branch.country = country ? country.trim() : null;
        }
        if (timezone !== undefined) {
            if (timezone && String(timezone).trim().length > 60) {
                return res.status(400).json({ error: 'نام timezone نامعتبر است' });
            }
            branch.timezone = timezone ? String(timezone).trim() : null;
        }
        if (isActive !== undefined) branch.isActive = !!isActive;
        await branch.save();
        res.json(branch);
    } catch (err) {
        next(err);
    }
}

module.exports = { list, getById, create, update };

const express = require('express');
const router = express.Router();
const { Branch, User, Department, Conversation } = require('../models');
const { Op } = require('sequelize');

// فقط مالک یا ادمین می‌تواند شعبه اضافه/ویرایش کند
function ownerOrAdmin(req, res, next) {
    if (req.user.role === 'owner' || req.user.role === 'admin') return next();
    return res.status(403).json({ error: 'فقط مالک یا ادمین' });
}

// لیست شعب — مالک همه، بقیه فقط شعب خود
router.get('/', async (req, res) => {
    try {
        const where = { isActive: true };
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            if (req.user.branchId) where.id = req.user.branchId;
            else return res.json({ data: [] });
        }
        const branches = await Branch.findAll({
            where,
            order: [['name', 'ASC']],
            include: [
                { model: User, as: 'users', attributes: ['id', 'name', 'email', 'role'], required: false },
                { model: Department, as: 'departments', attributes: ['id', 'name'], required: false }
            ]
        });
        res.json({ data: branches });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// یک شعبه
router.get('/:id', async (req, res) => {
    try {
        const branch = await Branch.findByPk(req.params.id);
        if (!branch) return res.status(404).json({ error: 'شعبه یافت نشد' });
        if (req.user.role !== 'owner' && req.user.role !== 'admin' && req.user.branchId !== branch.id) {
            return res.status(403).json({ error: 'دسترسی غیرمجاز' });
        }
        res.json(branch);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ایجاد شعبه — فقط مالک/ادمین
router.post('/', ownerOrAdmin, async (req, res) => {
    try {
        const { name, city, country, timezone } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ error: 'نام شعبه الزامی است' });
        const branch = await Branch.create({
            name: name.trim(),
            city: (city || '').trim() || null,
            country: (country || '').trim() || null,
            timezone: timezone || 'Asia/Tehran',
            isActive: true
        });
        res.status(201).json(branch);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ویرایش شعبه
router.put('/:id', ownerOrAdmin, async (req, res) => {
    try {
        const branch = await Branch.findByPk(req.params.id);
        if (!branch) return res.status(404).json({ error: 'شعبه یافت نشد' });
        const { name, city, country, timezone, isActive } = req.body;
        if (name !== undefined) branch.name = name.trim();
        if (city !== undefined) branch.city = city ? city.trim() : null;
        if (country !== undefined) branch.country = country ? country.trim() : null;
        if (timezone !== undefined) branch.timezone = timezone;
        if (isActive !== undefined) branch.isActive = !!isActive;
        await branch.save();
        res.json(branch);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { Department, User, Branch } = require('../models');

router.get('/', async (req, res) => {
    try {
        if (!req.canAccess('departments')) return res.status(403).json({ error: 'دسترسی به بخش دپارتمان‌ها ندارید' });
        const where = {};
        if (req.query.all !== '1' || !req.canManageUsers()) where.isActive = true;
        if (!req.canManageUsers() && req.user.branchId) {
            where.branchId = req.user.branchId;
        }
        const departments = await Department.findAll({
            where,
            include: [
                { model: User, as: 'users', attributes: ['id', 'name', 'email'], required: false },
                { model: Branch, as: 'branch', attributes: ['id', 'name', 'city'], required: false }
            ]
        });
        res.json({ data: departments });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        if (!req.canAccess('departments')) return res.status(403).json({ error: 'دسترسی به بخش دپارتمان‌ها ندارید' });
        const body = { ...req.body };
        if (!req.canManageUsers() && req.user.branchId) {
            body.branchId = req.user.branchId;
        }
        const dept = await Department.create(body);
        res.status(201).json(dept);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        if (!req.canAccess('departments')) return res.status(403).json({ error: 'دسترسی به بخش دپارتمان‌ها ندارید' });
        const dept = await Department.findByPk(req.params.id, {
            include: [{ model: User, as: 'users' }]
        });
        if (!dept) return res.status(404).json({ error: 'دپارتمان یافت نشد' });
        res.json(dept);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        if (!req.canAccess('departments')) return res.status(403).json({ error: 'دسترسی به بخش دپارتمان‌ها ندارید' });
        const dept = await Department.findByPk(req.params.id);
        if (!dept) return res.status(404).json({ error: 'دپارتمان یافت نشد' });
        const { name, description, keywords, isDefault, isActive, color, branchId } = req.body;
        if (name !== undefined) dept.name = name;
        if (description !== undefined) dept.description = description;
        if (keywords !== undefined) dept.keywords = keywords;
        if (isDefault !== undefined) dept.isDefault = !!isDefault;
        if (isActive !== undefined) dept.isActive = !!isActive;
        if (color !== undefined) dept.color = color;
        if (branchId !== undefined && req.canManageUsers()) dept.branchId = branchId || null;
        await dept.save();
        res.json(dept);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

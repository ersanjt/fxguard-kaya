/**
 * Departments controller — business logic for department routes
 */
const { Op } = require('sequelize');
const { Department, User, Branch } = require('../models');
const { normalizeKeywords, normalizeDescription } = require('../lib/keywordUtils');
const { isValidUUID } = require('../lib/validation');

async function list(req, res) {
    try {
        if (!req.canAccess('departments')) {
            return res.status(403).json({ error: 'دسترسی به بخش دپارتمان‌ها ندارید' });
        }
        const where = {};
        if (req.query.all !== '1' || !req.canManageUsers()) where.isActive = true;
        if (!req.canManageUsers() && req.user.branchId) {
            where.branchId = req.user.branchId;
        }
        const departments = await Department.findAll({
            where,
            include: [
                {
                    model: User,
                    as: 'users',
                    attributes: ['id', 'name', 'email'],
                    required: false,
                },
                {
                    model: Branch,
                    as: 'branch',
                    attributes: ['id', 'name', 'city'],
                    required: false,
                },
            ],
        });
        res.json({ data: departments });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getById(req, res) {
    if (!isValidUUID(req.params.id)) {
        return res.status(400).json({ error: 'شناسه دپارتمان نامعتبر است' });
    }
    try {
        if (!req.canAccess('departments')) {
            return res.status(403).json({ error: 'دسترسی به بخش دپارتمان‌ها ندارید' });
        }
        const dept = await Department.findByPk(req.params.id, {
            include: [{ model: User, as: 'users' }],
        });
        if (!dept) return res.status(404).json({ error: 'دپارتمان یافت نشد' });
        res.json(dept);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function create(req, res) {
    try {
        if (!req.canAccess('departments')) {
            return res.status(403).json({ error: 'دسترسی به بخش دپارتمان‌ها ندارید' });
        }
        const body = { ...req.body };
        if (!req.canManageUsers() && req.user.branchId) {
            body.branchId = req.user.branchId;
        }
        if (body.keywords) body.keywords = normalizeKeywords(body.keywords);
        if (body.description) body.description = normalizeDescription(body.description);
        const dept = await Department.create(body);
        if (dept.isDefault) {
            await Department.update({ isDefault: false }, { where: { id: { [Op.ne]: dept.id } } });
        }
        res.status(201).json(dept);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function update(req, res) {
    if (!isValidUUID(req.params.id)) {
        return res.status(400).json({ error: 'شناسه دپارتمان نامعتبر است' });
    }
    try {
        if (!req.canAccess('departments')) {
            return res.status(403).json({ error: 'دسترسی به بخش دپارتمان‌ها ندارید' });
        }
        const dept = await Department.findByPk(req.params.id);
        if (!dept) return res.status(404).json({ error: 'دپارتمان یافت نشد' });
        const { name, description, keywords, isDefault, isActive, color, branchId } = req.body;
        if (name !== undefined) dept.name = name;
        if (description !== undefined) dept.description = normalizeDescription(description);
        if (keywords !== undefined) dept.keywords = normalizeKeywords(keywords);
        if (isDefault !== undefined) {
            dept.isDefault = !!isDefault;
            if (dept.isDefault) {
                await Department.update({ isDefault: false }, { where: { id: { [Op.ne]: dept.id } } });
            }
        }
        if (isActive !== undefined) dept.isActive = !!isActive;
        if (color !== undefined) dept.color = color;
        if (branchId !== undefined && req.canManageUsers()) dept.branchId = branchId || null;
        await dept.save();
        res.json(dept);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = { list, getById, create, update };

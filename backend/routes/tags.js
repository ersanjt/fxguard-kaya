const express = require('express');
const router = express.Router();
const { Tag, Customer, Conversation } = require('../models');
const { Op } = require('sequelize');
const { canAccessCustomer } = require('../lib/customerAccess');
const { isValidUUID } = require('../lib/validation');

// لیست همه تگ‌ها
router.get('/', async (req, res, next) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی به بخش مشتریان ندارید' });
        const tags = await Tag.findAll({
            order: [['name', 'ASC']],
            attributes: ['id', 'name', 'color', 'description']
        });
        res.json({ data: tags });
    } catch (err) {
        next(err);
    }
});

// ایجاد تگ جدید
router.post('/', async (req, res, next) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی به بخش مشتریان ندارید' });
        const { name, color, description } = req.body;
        if (!name || !String(name).trim()) return res.status(400).json({ error: 'نام تگ الزامی است' });
        const tag = await Tag.create({
            name: String(name).trim(),
            color: color || '#95a5a6',
            description: description ? String(description).trim() : null
        });
        res.status(201).json(tag);
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') return res.status(400).json({ error: 'تگ با این نام قبلاً وجود دارد' });
        next(err);
    }
});

// ویرایش تگ
router.put('/:id', async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه تگ نامعتبر است' });
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی به بخش مشتریان ندارید' });
        const tag = await Tag.findByPk(req.params.id);
        if (!tag) return res.status(404).json({ error: 'تگ یافت نشد' });
        const { name, color, description } = req.body;
        if (name !== undefined) tag.name = String(name).trim();
        if (color !== undefined) tag.color = color;
        if (description !== undefined) tag.description = description ? String(description).trim() : null;
        await tag.save();
        res.json(tag);
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') return res.status(400).json({ error: 'تگ با این نام قبلاً وجود دارد' });
        next(err);
    }
});

// حذف تگ
router.delete('/:id', async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه تگ نامعتبر است' });
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی به بخش مشتریان ندارید' });
        const tag = await Tag.findByPk(req.params.id);
        if (!tag) return res.status(404).json({ error: 'تگ یافت نشد' });
        await tag.setCustomers([]);
        await tag.setConversations([]);
        await tag.destroy();
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

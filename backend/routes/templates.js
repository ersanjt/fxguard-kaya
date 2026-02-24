const express = require('express');
const router = express.Router();
const { Template } = require('../models');

// لیست تمپلیت‌ها
router.get('/', async (req, res) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی ندارید' });
        const { category, isActive } = req.query;
        const where = {};
        if (category && String(category).trim()) where.category = String(category).trim();
        if (isActive !== undefined) where.isActive = isActive === 'true' || isActive === true;
        const templates = await Template.findAll({
            where,
            order: [['category', 'ASC'], ['name', 'ASC']]
        });
        res.json({ data: templates });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ایجاد تمپلیت
router.post('/', async (req, res) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی ندارید' });
        const { name, content, category, variables, isActive } = req.body;
        if (!name || !String(name).trim()) return res.status(400).json({ error: 'نام تمپلیت الزامی است' });
        if (!content || !String(content).trim()) return res.status(400).json({ error: 'محتوا الزامی است' });
        const vars = Array.isArray(variables) ? variables : (variables ? [variables] : []);
        const template = await Template.create({
            name: String(name).trim(),
            content: String(content).trim(),
            category: category ? String(category).trim() : null,
            variables: vars,
            isActive: isActive !== false
        });
        res.status(201).json(template);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// دریافت یک تمپلیت
router.get('/:id', async (req, res) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی ندارید' });
        const template = await Template.findByPk(req.params.id);
        if (!template) return res.status(404).json({ error: 'تمپلیت یافت نشد' });
        res.json(template);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ویرایش تمپلیت
router.put('/:id', async (req, res) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی ندارید' });
        const template = await Template.findByPk(req.params.id);
        if (!template) return res.status(404).json({ error: 'تمپلیت یافت نشد' });
        const { name, content, category, variables, isActive } = req.body;
        if (name !== undefined) template.name = String(name).trim();
        if (content !== undefined) template.content = String(content).trim();
        if (category !== undefined) template.category = category ? String(category).trim() : null;
        if (variables !== undefined) template.variables = Array.isArray(variables) ? variables : [];
        if (isActive !== undefined) template.isActive = !!isActive;
        await template.save();
        res.json(template);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// حذف تمپلیت
router.delete('/:id', async (req, res) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی ندارید' });
        const template = await Template.findByPk(req.params.id);
        if (!template) return res.status(404).json({ error: 'تمپلیت یافت نشد' });
        await template.destroy();
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// افزایش شمارنده استفاده
router.post('/:id/use', async (req, res) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی ندارید' });
        const template = await Template.findByPk(req.params.id);
        if (!template) return res.status(404).json({ error: 'تمپلیت یافت نشد' });
        await template.increment('usageCount');
        await template.reload();
        res.json(template);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

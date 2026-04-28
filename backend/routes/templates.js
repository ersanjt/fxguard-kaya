const express = require('express');
const router = express.Router();
const { Template } = require('../models');
const { isValidUUID, safeString } = require('../lib/validation');

// لیست تمپلیت‌ها
router.get('/', async (req, res, next) => {
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
        next(err);
    }
});

// ایجاد تمپلیت
router.post('/', async (req, res, next) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی ندارید' });
        const name = safeString(req.body.name, 255);
        const content = safeString(req.body.content, 50000);
        if (!name) return res.status(400).json({ error: 'نام تمپلیت الزامی است' });
        if (!content) return res.status(400).json({ error: 'محتوا الزامی است' });
        const { category, variables, isActive } = req.body;
        const vars = Array.isArray(variables) ? variables : (variables ? [variables] : []);
        const template = await Template.create({
            name,
            content,
            category: category ? String(category).trim() : null,
            variables: vars,
            isActive: isActive !== false
        });
        res.status(201).json(template);
    } catch (err) {
        next(err);
    }
});

// دریافت یک تمپلیت
router.get('/:id', async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه تمپلیت نامعتبر است' });
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی ندارید' });
        const template = await Template.findByPk(req.params.id);
        if (!template) return res.status(404).json({ error: 'تمپلیت یافت نشد' });
        res.json(template);
    } catch (err) {
        next(err);
    }
});

// ویرایش تمپلیت
router.put('/:id', async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه تمپلیت نامعتبر است' });
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی ندارید' });
        const template = await Template.findByPk(req.params.id);
        if (!template) return res.status(404).json({ error: 'تمپلیت یافت نشد' });
        const { category, variables, isActive } = req.body;
        const nameVal = safeString(req.body.name, 255);
        const contentVal = safeString(req.body.content, 50000);
        if (req.body.name !== undefined) template.name = nameVal != null ? nameVal : template.name;
        if (req.body.content !== undefined) template.content = contentVal != null ? contentVal : template.content;
        if (category !== undefined) template.category = category ? String(category).trim() : null;
        if (variables !== undefined) template.variables = Array.isArray(variables) ? variables : [];
        if (isActive !== undefined) template.isActive = !!isActive;
        await template.save();
        res.json(template);
    } catch (err) {
        next(err);
    }
});

// حذف تمپلیت
router.delete('/:id', async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه تمپلیت نامعتبر است' });
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی ندارید' });
        const template = await Template.findByPk(req.params.id);
        if (!template) return res.status(404).json({ error: 'تمپلیت یافت نشد' });
        await template.destroy();
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

// افزایش شمارنده استفاده
router.post('/:id/use', async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه تمپلیت نامعتبر است' });
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی ندارید' });
        const template = await Template.findByPk(req.params.id);
        if (!template) return res.status(404).json({ error: 'تمپلیت یافت نشد' });
        await template.increment('usageCount');
        await template.reload();
        res.json(template);
    } catch (err) {
        next(err);
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { ExchangeService } = require('../models');
const { isValidUUID } = require('../lib/validation');

router.get('/', async (req, res, next) => {
    try {
        if (!req.canAccess('services')) return res.status(403).json({ error: 'دسترسی به بخش خدمات صرافی ندارید' });
        const list = await ExchangeService.findAll({
            order: [['sortOrder', 'ASC'], ['name', 'ASC']]
        });
        res.json({ data: list });
    } catch (err) {
        next(err);
    }
});

router.get('/:id', async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه سرویس نامعتبر است' });
    try {
        if (!req.canAccess('services')) return res.status(403).json({ error: 'دسترسی به بخش خدمات صرافی ندارید' });
        const item = await ExchangeService.findByPk(req.params.id);
        if (!item) return res.status(404).json({ error: 'سرویس یافت نشد' });
        res.json(item);
    } catch (err) {
        next(err);
    }
});

router.post('/', async (req, res, next) => {
    try {
        if (!req.canAccess('services')) return res.status(403).json({ error: 'دسترسی به بخش خدمات صرافی ندارید' });
        const { name, code, description, category, isActive, sortOrder } = req.body;
        if (!name || !String(name).trim()) return res.status(400).json({ error: 'نام سرویس الزامی است' });
        const item = await ExchangeService.create({
            name: String(name).trim(),
            code: code ? String(code).trim() : null,
            description: description ? String(description).trim() : null,
            category: category ? String(category).trim() : null,
            isActive: isActive !== false,
            sortOrder: sortOrder != null ? parseInt(sortOrder, 10) : 0
        });
        res.status(201).json(item);
    } catch (err) {
        next(err);
    }
});

router.put('/:id', async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه سرویس نامعتبر است' });
    try {
        if (!req.canAccess('services')) return res.status(403).json({ error: 'دسترسی به بخش خدمات صرافی ندارید' });
        const item = await ExchangeService.findByPk(req.params.id);
        if (!item) return res.status(404).json({ error: 'سرویس یافت نشد' });
        const { name, code, description, category, isActive, sortOrder } = req.body;
        if (name !== undefined) item.name = String(name).trim() || item.name;
        if (code !== undefined) item.code = code ? String(code).trim() : null;
        if (description !== undefined) item.description = description ? String(description).trim() : null;
        if (category !== undefined) item.category = category ? String(category).trim() : null;
        if (isActive !== undefined) item.isActive = !!isActive;
        if (sortOrder !== undefined) item.sortOrder = parseInt(sortOrder, 10) || 0;
        await item.save();
        res.json(item);
    } catch (err) {
        next(err);
    }
});

router.delete('/:id', async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه سرویس نامعتبر است' });
    try {
        if (!req.canAccess('services')) return res.status(403).json({ error: 'دسترسی به بخش خدمات صرافی ندارید' });
        const item = await ExchangeService.findByPk(req.params.id);
        if (!item) return res.status(404).json({ error: 'سرویس یافت نشد' });
        await item.destroy();
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

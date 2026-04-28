const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { FileTemplate, User } = require('../models');
const logger = require('../config/logger');
const { isValidUUID } = require('../lib/validation');

// تنظیمات multer برای آپلود فایل
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/file-templates');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (err) {
            cb(err);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const nameWithoutExt = path.basename(file.originalname, ext);
        cb(null, nameWithoutExt + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // حداکثر 50MB
    },
    fileFilter: (req, file, cb) => {
        // فایل‌های مجاز
        const allowedMimes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/zip',
            'application/x-rar-compressed',
            'text/plain',
            'text/csv',
            'video/mp4',
            'audio/mpeg',
            'audio/mp3'
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('نوع فایل مجاز نیست'));
        }
    }
});

// لیست فایل‌های قالب
router.get('/', async (req, res, next) => {
    try {
        if (!req.canAccess('conversations')) {
            return res.status(403).json({ error: 'دسترسی ندارید' });
        }

        const { category, isActive, search } = req.query;
        const where = {};
        
        if (category && String(category).trim()) {
            where.category = String(category).trim();
        }
        
        if (isActive !== undefined) {
            where.isActive = isActive === 'true' || isActive === true;
        }

        const fileTemplates = await FileTemplate.findAll({
            where,
            include: [{
                model: User,
                as: 'uploader',
                attributes: ['id', 'name', 'email']
            }],
            order: [['usageCount', 'DESC'], ['createdAt', 'DESC']]
        });

        // فیلتر جستجو در سمت سرور
        let filtered = fileTemplates;
        if (search && String(search).trim()) {
            const searchLower = String(search).trim().toLowerCase();
            filtered = fileTemplates.filter(ft => {
                return (ft.name && ft.name.toLowerCase().includes(searchLower)) ||
                       (ft.description && ft.description.toLowerCase().includes(searchLower)) ||
                       (ft.filename && ft.filename.toLowerCase().includes(searchLower)) ||
                       (ft.category && ft.category.toLowerCase().includes(searchLower)) ||
                       (ft.tags && ft.tags.some(t => t.toLowerCase().includes(searchLower)));
            });
        }

        const result = filtered.map(ft => {
            const plain = ft.toJSON ? ft.toJSON() : ft;
            const fname = path.basename(plain.filepath || plain.filename || '');
            plain.url = fname ? '/uploads/file-templates/' + fname : null;
            return plain;
        });
        res.json({ data: result });
    } catch (err) {
        logger.error('Error loading file templates', { error: err.message });
        next(err);
    }
});

// آپلود فایل قالب جدید
router.post('/', upload.single('file'), async (req, res, next) => {
    try {
        if (!req.canAccess('conversations')) {
            return res.status(403).json({ error: 'دسترسی ندارید' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'فایل الزامی است' });
        }

        const { name, description, category, tags } = req.body;
        
        if (!name || !String(name).trim()) {
            // حذف فایل آپلود شده در صورت خطا
            await fs.unlink(req.file.path).catch(() => {});
            return res.status(400).json({ error: 'نام فایل الزامی است' });
        }

        const parsedTags = tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [];

        const fileTemplate = await FileTemplate.create({
            name: String(name).trim(),
            description: description ? String(description).trim() : null,
            category: category ? String(category).trim() : null,
            filename: req.file.originalname,
            filepath: req.file.path,
            filesize: req.file.size,
            mimetype: req.file.mimetype,
            uploadedBy: req.user.id,
            tags: Array.isArray(parsedTags) ? parsedTags : [],
            isActive: true
        });

        const result = await FileTemplate.findByPk(fileTemplate.id, {
            include: [{
                model: User,
                as: 'uploader',
                attributes: ['id', 'name', 'email']
            }]
        });

        const plain = result.toJSON ? result.toJSON() : result;
        const fname = path.basename(plain.filepath || plain.filename || '');
        plain.url = fname ? '/uploads/file-templates/' + fname : null;
        res.status(201).json(plain);
    } catch (err) {
        logger.error('Error uploading file template', { error: err.message });
        // حذف فایل در صورت خطا
        if (req.file && req.file.path) {
            await fs.unlink(req.file.path).catch(() => {});
        }
        next(err);
    }
});

// دریافت دسته‌بندی‌های موجود — باید قبل از /:id باشد
router.get('/meta/categories', async (req, res, next) => {
    try {
        if (!req.canAccess('conversations')) {
            return res.status(403).json({ error: 'دسترسی ندارید' });
        }

        const fileTemplates = await FileTemplate.findAll({
            attributes: ['category'],
            where: {
                category: { [require('sequelize').Op.ne]: null }
            },
            group: ['category']
        });

        const categories = [...new Set(fileTemplates.map(ft => ft.category).filter(Boolean))];
        res.json({ data: categories });
    } catch (err) {
        logger.error('Error getting file template categories', { error: err.message });
        next(err);
    }
});

// دریافت یک فایل قالب
router.get('/:id', async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه فایل نامعتبر است' });
    try {
        if (!req.canAccess('conversations')) {
            return res.status(403).json({ error: 'دسترسی ندارید' });
        }

        const fileTemplate = await FileTemplate.findByPk(req.params.id, {
            include: [{
                model: User,
                as: 'uploader',
                attributes: ['id', 'name', 'email']
            }]
        });

        if (!fileTemplate) {
            return res.status(404).json({ error: 'فایل یافت نشد' });
        }

        const plain = fileTemplate.toJSON ? fileTemplate.toJSON() : fileTemplate;
        const fname = path.basename(plain.filepath || plain.filename || '');
        plain.url = fname ? '/uploads/file-templates/' + fname : null;
        res.json(plain);
    } catch (err) {
        logger.error('Error getting file template', { error: err.message });
        next(err);
    }
});

// دانلود فایل قالب
router.get('/:id/download', async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه فایل نامعتبر است' });
    try {
        if (!req.canAccess('conversations')) {
            return res.status(403).json({ error: 'دسترسی ندارید' });
        }

        const fileTemplate = await FileTemplate.findByPk(req.params.id);

        if (!fileTemplate) {
            return res.status(404).json({ error: 'فایل یافت نشد' });
        }

        // بررسی وجود فایل
        try {
            await fs.access(fileTemplate.filepath);
        } catch {
            return res.status(404).json({ error: 'فایل در سرور یافت نشد' });
        }

        res.download(fileTemplate.filepath, fileTemplate.filename);
    } catch (err) {
        logger.error('Error downloading file template', { error: err.message });
        next(err);
    }
});

// ویرایش فایل قالب (فقط متادیتا)
router.put('/:id', async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه فایل نامعتبر است' });
    try {
        if (!req.canAccess('conversations')) {
            return res.status(403).json({ error: 'دسترسی ندارید' });
        }

        const fileTemplate = await FileTemplate.findByPk(req.params.id);

        if (!fileTemplate) {
            return res.status(404).json({ error: 'فایل یافت نشد' });
        }

        const { name, description, category, tags, isActive } = req.body;

        if (name !== undefined) {
            fileTemplate.name = String(name).trim();
        }
        if (description !== undefined) {
            fileTemplate.description = description ? String(description).trim() : null;
        }
        if (category !== undefined) {
            fileTemplate.category = category ? String(category).trim() : null;
        }
        if (tags !== undefined) {
            fileTemplate.tags = Array.isArray(tags) ? tags : [];
        }
        if (isActive !== undefined) {
            fileTemplate.isActive = !!isActive;
        }

        await fileTemplate.save();

        const result = await FileTemplate.findByPk(fileTemplate.id, {
            include: [{
                model: User,
                as: 'uploader',
                attributes: ['id', 'name', 'email']
            }]
        });

        const plain2 = result.toJSON ? result.toJSON() : result;
        const fname2 = path.basename(plain2.filepath || plain2.filename || '');
        plain2.url = fname2 ? '/uploads/file-templates/' + fname2 : null;
        res.json(plain2);
    } catch (err) {
        logger.error('Error updating file template', { error: err.message });
        next(err);
    }
});

// حذف فایل قالب
router.delete('/:id', async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه فایل نامعتبر است' });
    try {
        if (!req.canAccess('conversations')) {
            return res.status(403).json({ error: 'دسترسی ندارید' });
        }

        const fileTemplate = await FileTemplate.findByPk(req.params.id);

        if (!fileTemplate) {
            return res.status(404).json({ error: 'فایل یافت نشد' });
        }

        // حذف فایل از دیسک
        try {
            await fs.unlink(fileTemplate.filepath);
        } catch (err) {
            logger.warn('Error deleting file from disk', { error: err.message });
        }

        await fileTemplate.destroy();
        res.json({ ok: true });
    } catch (err) {
        logger.error('Error deleting file template', { error: err.message });
        next(err);
    }
});

// افزایش شمارنده استفاده
router.post('/:id/use', async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه فایل نامعتبر است' });
    try {
        if (!req.canAccess('conversations')) {
            return res.status(403).json({ error: 'دسترسی ندارید' });
        }

        const fileTemplate = await FileTemplate.findByPk(req.params.id);

        if (!fileTemplate) {
            return res.status(404).json({ error: 'فایل یافت نشد' });
        }

        await fileTemplate.increment('usageCount');
        await fileTemplate.reload();

        res.json(fileTemplate);
    } catch (err) {
        logger.error('Error incrementing file template usage', { error: err.message });
        next(err);
    }
});

module.exports = router;

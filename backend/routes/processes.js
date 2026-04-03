const express = require('express');
const router = express.Router();
const { ProcessTemplate, ProcessInstance, ProcessInstanceStep, User } = require('../models');
const { Op } = require('sequelize');
const { requireSection } = require('../middleware/auth');
const { isValidUUID } = require('../lib/validation');
const { isMainAdmin } = require('../lib/permissions');

/** برگرداندن شرط دسترسی برای instances — مالک/ادمین/مدیر همه؛ بقیه فقط موارد خودشان */
function instanceAccessWhere(req) {
    if (isMainAdmin(req.user) || ['owner', 'admin', 'manager'].indexOf(req.user.role || '') !== -1) return {};
    return { [Op.or]: [{ createdBy: req.userId }, { assignedTo: req.userId }] };
}

const templateInclude = [];
const instanceInclude = [
    { model: ProcessTemplate, as: 'template', attributes: ['id', 'name', 'stages'] },
    { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
    { model: User, as: 'assignee', attributes: ['id', 'name', 'email'], required: false }
];
const stepInclude = [
    { model: User, as: 'assignee', attributes: ['id', 'name', 'email'], required: false }
];

// ——— Process Templates ———

router.get('/templates', requireSection('processes'), async (req, res, next) => {
    try {
        const { isActive } = req.query;
        const where = {};
        if (isActive !== undefined) where.isActive = isActive === 'true' || isActive === '1';
        const list = await ProcessTemplate.findAll({
            where,
            order: [['name', 'ASC']],
            include: [{ model: ProcessInstance, as: 'instances', attributes: ['id'], required: false }]
        });
        const withCount = list.map(t => ({
            ...t.toJSON(),
            instanceCount: (t.instances || []).length
        }));
        res.json({ data: withCount });
    } catch (err) {
        next(err);
    }
});

router.post('/templates', requireSection('processes'), async (req, res, next) => {
    try {
        const { name, description, stages, referenceType } = req.body;
        if (!name || !Array.isArray(stages)) {
            return res.status(400).json({ error: 'name and stages (array) required' });
        }
        if (String(name).trim().length > 200) return res.status(400).json({ error: 'نام فرایند بیش از ۲۰۰ کاراکتر مجاز نیست' });
        if (stages.length > 50) return res.status(400).json({ error: 'حداکثر ۵۰ مرحله در هر فرایند مجاز است' });
        const sorted = [...stages]
            .filter(s => s && (s.name || s.nameEn))
            .map((s, i) => ({ name: s.name || s.nameEn || String(i), order: s.order ?? i }));
        const template = await ProcessTemplate.create({
            name,
            description: description || null,
            stages: sorted.length ? sorted : [{ name: 'Stage 1', order: 0 }],
            referenceType: referenceType || null,
            isActive: true
        });
        res.status(201).json({ data: template });
    } catch (err) {
        next(err);
    }
});

router.get('/templates/:id', requireSection('processes'), async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
    try {
        const template = await ProcessTemplate.findByPk(req.params.id);
        if (!template) return res.status(404).json({ error: 'Template not found' });
        res.json({ data: template });
    } catch (err) {
        next(err);
    }
});

router.put('/templates/:id', requireSection('processes'), async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
    try {
        const template = await ProcessTemplate.findByPk(req.params.id);
        if (!template) return res.status(404).json({ error: 'Template not found' });
        const { name, description, stages, isActive, referenceType } = req.body;
        if (name !== undefined) template.name = name;
        if (description !== undefined) template.description = description;
        if (referenceType !== undefined) template.referenceType = referenceType;
        if (isActive !== undefined) template.isActive = !!isActive;
        if (Array.isArray(stages) && stages.length) {
            const sorted = stages
                .filter(s => s && (s.name || s.nameEn))
                .map((s, i) => ({ name: s.name || s.nameEn || String(i), order: s.order ?? i }));
            template.stages = sorted;
        }
        await template.save();
        res.json({ data: template });
    } catch (err) {
        next(err);
    }
});

router.delete('/templates/:id', requireSection('processes'), async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
    try {
        const template = await ProcessTemplate.findByPk(req.params.id);
        if (!template) return res.status(404).json({ error: 'Template not found' });
        const count = await ProcessInstance.count({ where: { templateId: template.id } });
        if (count > 0) {
            return res.status(400).json({ error: 'Cannot delete template with existing instances' });
        }
        await template.destroy();
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

// ——— Process Instances ———

router.get('/instances', requireSection('processes'), async (req, res, next) => {
    try {
        const { status, templateId, assignedTo, createdBy } = req.query;
        const { page, limit, offset } = require('../lib/validation').parsePagination(req.query.page, req.query.limit, 100);
        const accessWhere = instanceAccessWhere(req);
        const where = { ...accessWhere };
        if (status) where.status = status;
        if (templateId && isValidUUID(templateId)) where.templateId = templateId;
        if (assignedTo && isValidUUID(assignedTo)) where.assignedTo = assignedTo;
        if (createdBy && isValidUUID(createdBy)) where.createdBy = createdBy;

        const { rows, count } = await ProcessInstance.findAndCountAll({
            where,
            include: instanceInclude,
            order: [['updatedAt', 'DESC']],
            limit,
            offset
        });
        res.json({ data: rows, total: count, page });
    } catch (err) {
        next(err);
    }
});

router.post('/instances', requireSection('processes'), async (req, res, next) => {
    try {
        const { templateId, title, referenceType, referenceId, assignedTo } = req.body;
        if (!templateId || !title) {
            return res.status(400).json({ error: 'templateId and title required' });
        }
        if (!isValidUUID(templateId)) return res.status(400).json({ error: 'شناسه قالب نامعتبر است' });
        if (String(title).trim().length > 300) return res.status(400).json({ error: 'عنوان فرایند بیش از ۳۰۰ کاراکتر مجاز نیست' });
        if (assignedTo && !isValidUUID(assignedTo)) return res.status(400).json({ error: 'شناسه کاربر تخصیص‌یافته نامعتبر است' });
        const template = await ProcessTemplate.findByPk(templateId);
        if (!template || !template.isActive) {
            return res.status(400).json({ error: 'Template not found or inactive' });
        }
        const stages = template.stages || [];
        const firstStage = stages[0];
        const firstStageName = firstStage ? firstStage.name : 'Start';

        const instance = await ProcessInstance.create({
            templateId,
            title: title.trim(),
            referenceType: referenceType || null,
            referenceId: referenceId || null,
            currentStageIndex: 0,
            status: 'active',
            createdBy: req.userId,
            assignedTo: assignedTo || null
        });

        await ProcessInstanceStep.create({
            instanceId: instance.id,
            stageIndex: 0,
            stageName: firstStageName,
            assignedTo: assignedTo || null,
            startedAt: new Date()
        });

        const loaded = await ProcessInstance.findByPk(instance.id, { include: instanceInclude });
        res.status(201).json({ data: loaded });
    } catch (err) {
        next(err);
    }
});

router.get('/instances/:id', requireSection('processes'), async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
    try {
        const instance = await ProcessInstance.findByPk(req.params.id, {
            include: [...instanceInclude, { model: ProcessInstanceStep, as: 'steps', include: stepInclude, separate: true, order: [['stageIndex', 'ASC'], ['startedAt', 'ASC']] }]
        });
        if (!instance) return res.status(404).json({ error: 'Instance not found' });
        const accessWhere = instanceAccessWhere(req);
        if (Object.keys(accessWhere).length > 0 && instance.createdBy !== req.userId && instance.assignedTo !== req.userId) {
            return res.status(403).json({ error: 'دسترسی به این فرایند ندارید' });
        }
        res.json({ data: instance });
    } catch (err) {
        next(err);
    }
});

router.put('/instances/:id', requireSection('processes'), async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
    try {
        const instance = await ProcessInstance.findByPk(req.params.id);
        if (!instance) return res.status(404).json({ error: 'Instance not found' });
        const accessWhere = instanceAccessWhere(req);
        if (Object.keys(accessWhere).length > 0 && instance.createdBy !== req.userId && instance.assignedTo !== req.userId) {
            return res.status(403).json({ error: 'دسترسی به این فرایند ندارید' });
        }
        if (instance.status !== 'active') {
            return res.status(400).json({ error: 'Only active instances can be updated' });
        }
        const { title, assignedTo, status } = req.body;
        if (title !== undefined) instance.title = title;
        if (assignedTo !== undefined) instance.assignedTo = assignedTo || null;
        if (status === 'cancelled') {
            instance.status = 'cancelled';
            instance.completedAt = new Date();
        }
        await instance.save();
        const loaded = await ProcessInstance.findByPk(instance.id, { include: instanceInclude });
        res.json({ data: loaded });
    } catch (err) {
        next(err);
    }
});

/** Advance to next stage (or complete). Body: { assignedTo?, notes? } */
router.post('/instances/:id/advance', requireSection('processes'), async (req, res, next) => {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
    try {
        const instance = await ProcessInstance.findByPk(req.params.id, {
            include: [{ model: ProcessTemplate, as: 'template' }, { model: ProcessInstanceStep, as: 'steps' }]
        });
        if (!instance) return res.status(404).json({ error: 'Instance not found' });
        const accessWhere = instanceAccessWhere(req);
        if (Object.keys(accessWhere).length > 0 && instance.createdBy !== req.userId && instance.assignedTo !== req.userId) {
            return res.status(403).json({ error: 'دسترسی به این فرایند ندارید' });
        }
        if (instance.status !== 'active') {
            return res.status(400).json({ error: 'Only active instances can be advanced' });
        }

        const { assignedTo, notes } = req.body || {};
        const stages = (instance.template && instance.template.stages) || [];
        const currentIdx = instance.currentStageIndex;
        const currentStep = (instance.steps || []).find(s => s.stageIndex === currentIdx);
        if (currentStep && !currentStep.completedAt) {
            currentStep.completedAt = new Date();
            if (notes) currentStep.notes = notes;
            await currentStep.save();
        }

        const nextIdx = currentIdx + 1;
        if (nextIdx >= stages.length) {
            instance.status = 'completed';
            instance.currentStageIndex = currentIdx;
            instance.assignedTo = null;
            instance.completedAt = new Date();
            await instance.save();
            const loaded = await ProcessInstance.findByPk(instance.id, {
                include: [...instanceInclude, { model: ProcessInstanceStep, as: 'steps', include: stepInclude }]
            });
            return res.json({ data: loaded, completed: true });
        }

        const nextStage = stages[nextIdx];
        const nextStageName = nextStage && nextStage.name ? nextStage.name : `Stage ${nextIdx + 1}`;
        instance.currentStageIndex = nextIdx;
        instance.assignedTo = assignedTo || null;
        await instance.save();

        await ProcessInstanceStep.create({
            instanceId: instance.id,
            stageIndex: nextIdx,
            stageName: nextStageName,
            assignedTo: assignedTo || null,
            startedAt: new Date()
        });

        const loaded = await ProcessInstance.findByPk(instance.id, {
            include: [...instanceInclude, { model: ProcessInstanceStep, as: 'steps', include: stepInclude }]
        });
        res.json({ data: loaded, completed: false });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

/**
 * Kaya CRM — staff-only AI assistance; generation has no outbound side effects
 * @file backend/routes/conversationAi.js
 * @layer backend
 * @owner Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see docs/CODEBASE-MAP.md
 */
'use strict';

const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { Conversation, Customer, Message } = require('../models');
const { canAccessConversationAsync } = require('../lib/conversationAccess');
const { isValidUUID } = require('../lib/validation');
const { isAiPilotEnabled } = require('../lib/aiPilot');
const { resolveAiForProvider } = require('../lib/aiProviders');
const { generateConversationAssist, HISTORY_LIMIT } = require('../services/conversationAiAssist');
const { logActivity } = require('../services/activityLog');

router.use((req, res, next) => {
    if (!req.path.endsWith('/ai-assist') && req.path !== '/ai-assist/status') return next('router');
    res.set('Cache-Control', 'no-store');
    if (!req.canAccess || !req.canAccess('conversations'))
        return res.status(403).json({ error: 'AI_FORBIDDEN' });
    next();
});

router.get('/ai-assist/status', async (req, res, next) => {
    try {
        const enabled = isAiPilotEnabled();
        const active = enabled ? await resolveAiForProvider('openai') : null;
        res.json({
            enabled,
            configured: !!(active && active.apiKey),
            provider: 'openai',
            requiresReview: true,
        });
    } catch (err) {
        next(err);
    }
});

const generateLimit = rateLimit({
    windowMs: 60000,
    limit: 6,
    keyGenerator: (req) => String((req.user && req.user.tenantId) || 'platform') + ':' + req.userId,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'AI_RATE_LIMIT' },
    skip: () => process.env.NODE_ENV === 'test' && process.env.DISABLE_RATE_LIMIT === 'true',
});

router.post('/:id/ai-assist', generateLimit, async (req, res, next) => {
    try {
        if (!isAiPilotEnabled()) return res.status(404).json({ error: 'AI_PILOT_DISABLED' });
        if (!isValidUUID(req.params.id))
            return res.status(400).json({ error: 'AI_INVALID_CONVERSATION' });
        const { kind, language = 'fa' } = req.body || {};
        if (!['reply', 'summary'].includes(kind) || !['fa', 'en', 'tr'].includes(language)) {
            return res.status(400).json({ error: 'AI_INVALID_REQUEST' });
        }
        const conversation = await Conversation.findByPk(req.params.id, {
            include: [
                { model: Customer, as: 'customer', attributes: ['id', 'isRestrictedFromStaff'] },
            ],
        });
        if (!conversation) return res.status(404).json({ error: 'AI_CONVERSATION_NOT_FOUND' });
        if (!(await canAccessConversationAsync(req.user, req.userId, conversation))) {
            return res.status(403).json({ error: 'AI_FORBIDDEN' });
        }
        if (
            ['archived', 'closed', 'resolved'].includes(conversation.status) ||
            (conversation.metadata || {}).isGroup
        ) {
            return res.status(409).json({ error: 'AI_CONVERSATION_INACTIVE' });
        }
        const rows = await Message.findAll({
            where: { conversationId: conversation.id },
            order: [
                ['timestamp', 'DESC'],
                ['id', 'DESC'],
            ],
            limit: HISTORY_LIMIT,
            attributes: ['id', 'content', 'direction', 'timestamp', 'type'],
        });
        const result = await generateConversationAssist({
            kind,
            language,
            messages: rows.reverse(),
        });
        if (result.error) return res.status(result.status).json({ error: result.error });
        // Permissions may have changed during the provider request.
        await conversation.reload({
            include: [
                { model: Customer, as: 'customer', attributes: ['id', 'isRestrictedFromStaff'] },
            ],
        });
        if (!(await canAccessConversationAsync(req.user, req.userId, conversation))) {
            return res.status(403).json({ error: 'AI_FORBIDDEN' });
        }
        await logActivity({
            userId: req.userId,
            action: 'conversation_ai_generated',
            entityType: 'conversation',
            entityId: conversation.id,
            metadata: { kind, provider: 'openai', messageCount: result.sourceMessageCount },
        });
        return res.json({ ...result, conversationId: conversation.id });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

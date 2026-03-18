/**
 * Job: بررسی مکالمات بدون پاسخ و ارسال اعلان / escalation
 */
const models = require('../models');
const { sequelize, Conversation, Customer, User, Department, WhatsappConfig } = models;
const { Op } = require('sequelize');

let _cfgCache = null;
let _cfgCacheAt = 0;
const CFG_CACHE_TTL_MS = 5 * 60 * 1000; // 5 دقیقه

async function checkUnansweredConversations(io, logger) {
    try {
        const nowMs = Date.now();
        if (!_cfgCache || (nowMs - _cfgCacheAt) > CFG_CACHE_TTL_MS) {
            const [cfg] = await WhatsappConfig.findOrCreate({
                where: { id: 'default' },
                defaults: { alertUnansweredAfterMinutes: 5, escalateUnansweredAfterMinutes: 15 }
            });
            _cfgCache = cfg;
            _cfgCacheAt = nowMs;
        }
        const cfg = _cfgCache;
        const alertMin = cfg.alertUnansweredAfterMinutes ?? 5;
        const escalateMin = cfg.escalateUnansweredAfterMinutes ?? 15;
        const escalationDeptId = cfg.escalationDepartmentId;

        let targetDeptCache = null;
        if (escalationDeptId) {
            targetDeptCache = await Department.findByPk(escalationDeptId);
        }
        if (!targetDeptCache) targetDeptCache = await Department.findOne({ where: { isDefault: true } });

        const now = new Date();
        const alertThreshold = new Date(now.getTime() - alertMin * 60000);
        const escalateThreshold = new Date(now.getTime() - escalateMin * 60000);

        const BATCH_SIZE = 200;
        let offset = 0;
        let unanswered = [];
        // Process in batches to avoid hard limit of 500 conversations
        let hasMoreBatches = true;
        while (hasMoreBatches) {
            const batch = await Conversation.findAll({
                where: {
                    status: { [Op.in]: ['open', 'pending'] },
                    lastIncomingMessageAt: { [Op.ne]: null, [Op.lte]: alertThreshold },
                    [Op.or]: [
                        { lastOutgoingMessageAt: null },
                        sequelize.where(sequelize.col('lastIncomingMessageAt'), Op.gt, sequelize.col('lastOutgoingMessageAt'))
                    ]
                },
                include: [
                    { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'] },
                    { model: User, as: 'assignee', attributes: ['id', 'name'] },
                    { model: Department, as: 'department', attributes: ['id', 'name'] }
                ],
                limit: BATCH_SIZE,
                offset
            });
            unanswered = unanswered.concat(batch);
            if (batch.length < BATCH_SIZE) hasMoreBatches = false;
            else offset += BATCH_SIZE;
        }

        for (const conv of unanswered) {
            const lastIn = conv.lastIncomingMessageAt ? new Date(conv.lastIncomingMessageAt) : null;
            if (!lastIn) continue;
            const minsWaiting = Math.floor((now - lastIn) / 60000);

            if (lastIn < escalateThreshold && (!conv.escalatedAt || new Date(conv.escalatedAt) < lastIn)) {
                if (targetDeptCache) {
                    await conv.update({
                        departmentId: targetDeptCache.id,
                        assignedTo: null,
                        escalatedAt: now
                    });
                    io.emit('conversation_escalated', {
                        conversationId: conv.id,
                        customer: conv.customer,
                        department: targetDeptCache.name,
                        minutesWaiting: minsWaiting
                    });
                    logger.info(`⬆️ Escalated conversation ${conv.id} to ${targetDeptCache.name} (${minsWaiting} min unanswered)`);
                }
            } else if (lastIn < alertThreshold && (!conv.unansweredAlertSentAt || new Date(conv.unansweredAlertSentAt) < lastIn)) {
                const payload = {
                    conversationId: conv.id,
                    customer: conv.customer,
                    minutesWaiting: minsWaiting,
                    assignee: conv.assignee,
                    department: conv.department
                };
                if (conv.assignedTo) {
                    io.to(`user_${conv.assignedTo}`).emit('unanswered_alert', payload);
                }
                if (conv.departmentId) {
                    io.to(`department_${conv.departmentId}`).emit('unanswered_alert', payload);
                }
                await conv.update({ unansweredAlertSentAt: now });
                logger.info(`🔔 Unanswered alert sent for conversation ${conv.id} (${minsWaiting} min)`);
            }
        }
    } catch (err) {
        logger.error('checkUnansweredConversations error', { error: err?.message || String(err) });
    }
}

module.exports = { checkUnansweredConversations };

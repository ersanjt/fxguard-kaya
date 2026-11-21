/**
 * Job: بررسی مکالمات بدون پاسخ و ارسال اعلان / escalation
 */
const models = require('../models');
const { sequelize, Conversation, Customer, User, Department, WhatsappConfig } = models;
const { Op } = require('sequelize');
const { publicCustomerSocketPayload } = require('../lib/customerPhoneVisibility');
const { sameTenant, tenantRoom, departmentRoom, normalizeTenantId } = require('../lib/tenantContext');

const _cfgByKey = new Map();
const CFG_CACHE_TTL_MS = 5 * 60 * 1000;

async function configForConversation(conv) {
    const { Tenant } = models;
    const { isPlatformTenantId } = require('../lib/tenantContext');
    let key = 'default';
    if (conv.tenantId && !isPlatformTenantId(conv.tenantId)) {
        const tenant = await Tenant.findByPk(conv.tenantId, { attributes: ['panelKey'] });
        if (tenant && tenant.panelKey) key = String(tenant.panelKey);
    }
    const hit = _cfgByKey.get(key);
    if (hit && Date.now() - hit.at < CFG_CACHE_TTL_MS) return hit.cfg;
    const [cfg] = await WhatsappConfig.findOrCreate({
        where: { id: key },
        defaults: { alertUnansweredAfterMinutes: 5, escalateUnansweredAfterMinutes: 15 },
    });
    _cfgByKey.set(key, { cfg, at: Date.now() });
    return cfg;
}

async function checkUnansweredConversations(io, logger) {
    try {
        const alertMin = 1;

        // این job خارج از زمینهٔ سازمان اجرا می‌شود؛ دپارتمان مقصد باید هم‌سازمانِ مکالمه باشد
        const defaultDepts = await Department.findAll({
            where: { isDefault: true },
            skipTenantScope: true,
        });
        const defaultDeptFor = (conv) => defaultDepts.find((d) => sameTenant(d.tenantId, conv.tenantId)) || null;

        const now = new Date();
        const alertThreshold = new Date(now.getTime() - alertMin * 60000);

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
                offset,
                // job سراسری است؛ نباید با ALS تصادفی یک سازمان فیلتر شود
                skipTenantScope: true,
            });
            unanswered = unanswered.concat(batch);
            if (batch.length < BATCH_SIZE) hasMoreBatches = false;
            else offset += BATCH_SIZE;
        }

        for (const conv of unanswered) {
            const lastIn = conv.lastIncomingMessageAt ? new Date(conv.lastIncomingMessageAt) : null;
            if (!lastIn) continue;
            const cfg = await configForConversation(conv);
            const convAlertMin = cfg.alertUnansweredAfterMinutes ?? 5;
            const convEscalateMin = cfg.escalateUnansweredAfterMinutes ?? 15;
            if ((now - lastIn) / 60000 < convAlertMin) continue;
            const minsWaiting = Math.floor((now - lastIn) / 60000);
            const escalateThreshold = new Date(now.getTime() - convEscalateMin * 60000);
            let configuredDept = null;
            if (cfg.escalationDepartmentId) {
                configuredDept = await Department.findByPk(cfg.escalationDepartmentId, { skipTenantScope: true });
            }
            const targetDept = (configuredDept && sameTenant(configuredDept.tenantId, conv.tenantId))
                ? configuredDept
                : defaultDeptFor(conv);

            if (lastIn < escalateThreshold && (!conv.escalatedAt || new Date(conv.escalatedAt) < lastIn)) {
                if (targetDept) {
                    await conv.update({
                        departmentId: targetDept.id,
                        assignedTo: null,
                        escalatedAt: now
                    });
                    io.to(tenantRoom(normalizeTenantId(conv.tenantId))).emit('conversation_escalated', {
                        conversationId: conv.id,
                        customer: publicCustomerSocketPayload(conv.customer),
                        department: targetDept.name,
                        minutesWaiting: minsWaiting
                    });
                    logger.info(`⬆️ Escalated conversation ${conv.id} to ${targetDept.name} (${minsWaiting} min unanswered)`);
                }
            } else if (!conv.unansweredAlertSentAt || new Date(conv.unansweredAlertSentAt) < lastIn) {
                const payload = {
                    conversationId: conv.id,
                    customer: publicCustomerSocketPayload(conv.customer),
                    minutesWaiting: minsWaiting,
                    assignee: conv.assignee,
                    department: conv.department
                };
                if (conv.assignedTo) {
                    io.to(`user_${conv.assignedTo}`).emit('unanswered_alert', payload);
                }
                if (conv.departmentId) {
                    const dRoom = departmentRoom(conv.tenantId, conv.departmentId);
                    if (dRoom) io.to(dRoom).emit('unanswered_alert', payload);
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

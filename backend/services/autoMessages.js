/**
 * پیام‌های خودکار: تخصیص دپارتمان و معرفی کارمند
 * متن‌ها از WhatsappConfig خوانده می‌شوند؛ خالی = پیش‌فرض
 */
const { gatewayPost } = require('../lib/gatewayClient');
const { getSendTarget } = require('../lib/phoneUtils');
const { Message, Customer, User, Department, Conversation, WhatsappConfig } = require('../models');
const logger = require('../config/logger');

const DEFAULT_DEPT_ASSIGNED = 'شما به دپارتمان {{deptName}} وصل شدید. به زودی پاسخگوی شما خواهیم بود.';
const DEFAULT_EMPLOYEE_INTRO = 'من {{name}} از دپارتمان {{deptName}} هستم.';

let rabbitChannel = null;

function setRabbitChannel(ch) {
    rabbitChannel = ch;
}

async function sendOutgoingAutoMessage(conversation, text) {
    try {
        const customer = await Customer.findByPk(conversation.customerId);
        if (!customer) {
            logger.warn('sendOutgoingAutoMessage: customer not found', { conversationId: conversation.id });
            return false;
        }
        const toPhone = getSendTarget(customer.phone) || customer.phone;
        if (rabbitChannel) {
            rabbitChannel.sendToQueue('outgoing_messages', Buffer.from(JSON.stringify({
                to: toPhone, message: text, conversationId: conversation.id
            })), { persistent: true });
        } else {
            await gatewayPost('/api/send-message', { to: toPhone, message: text }, { timeout: 10000 });
        }
        await Message.create({
            conversationId: conversation.id,
            customerId: customer.id,
            direction: 'outgoing',
            content: text,
            type: 'text',
            isAutoReply: true,
            timestamp: new Date()
        });
        const preview = (text || '').slice(0, 120) + ((text || '').length > 120 ? '…' : '');
        const now = new Date();
        const upd = { lastMessageAt: now, lastOutgoingMessageAt: now, lastMessagePreview: preview, unansweredAlertSentAt: null, escalatedAt: null };
        if (!conversation.firstReplyAt) upd.firstReplyAt = now;
        await conversation.update(upd);
        return true;
    } catch (err) {
        logger.error('sendOutgoingAutoMessage error', { error: err.message });
        return false;
    }
}

/** پیام خودکار: شما به دپارتمان X وصل شدید — فقط یک‌بار هنگام تخصیص/تغییر دپارتمان */
async function sendDeptAssignedMessage(conversation, department) {
    try {
        const conv = await Conversation.findByPk(conversation.id, { attributes: ['id', 'customerId', 'metadata', 'firstReplyAt'] });
        if (!conv) return;
        const meta = conv.metadata || {};
        const lastDeptId = meta.deptAssignedForDeptId;
        const newDeptId = department ? String(department.id) : null;
        if (lastDeptId === newDeptId && meta.deptAssignedMsgSent) return;
        const deptName = department && department.name ? department.name : 'پشتیبانی';
        let template = DEFAULT_DEPT_ASSIGNED;
        try {
            const cfg = await WhatsappConfig.findByPk('default').catch(() => null);
            if (cfg && cfg.deptAssignedMessage && String(cfg.deptAssignedMessage).trim()) {
                template = String(cfg.deptAssignedMessage).trim();
            }
        } catch (_) {}
        const text = template.replace(/\{\{deptName\}\}/g, deptName);
        // بررسی وجود پیام مشابه (fallback برای جلوگیری از ارسال تکراری)
        const existing = await Message.findOne({
            where: {
                conversationId: conversation.id,
                direction: 'outgoing',
                isAutoReply: true,
                content: text
            }
        });
        if (existing) return;
        if (await sendOutgoingAutoMessage(conv, text)) {
            const newMeta = { ...meta, deptAssignedMsgSent: true, deptAssignedForDeptId: newDeptId };
            await conv.update({ metadata: newMeta });
        }
    } catch (err) {
        logger.error('sendDeptAssignedMessage error', { error: err.message });
    }
}

/** پیام خودکار: من [نام] از دپارتمان X هستم — فقط قبل از اولین پاسخ کارمند */
async function maybeSendEmployeeIntro(conversation, userId, user, department) {
    try {
        if (!userId) return;
        const prevCount = await Message.count({
            where: { conversationId: conversation.id, userId, direction: 'outgoing' }
        });
        if (prevCount > 0) return;
        const name = (user && (user.name || user.username || user.email)) || 'کارشناس';
        const deptName = (department && department.name) ? department.name : 'پشتیبانی';
        let template = DEFAULT_EMPLOYEE_INTRO;
        try {
            const cfg = await WhatsappConfig.findByPk('default').catch(() => null);
            if (cfg && cfg.employeeIntroMessage && String(cfg.employeeIntroMessage).trim()) {
                template = String(cfg.employeeIntroMessage).trim();
            }
        } catch (_) {}
        const text = template.replace(/\{\{name\}\}/g, name).replace(/\{\{deptName\}\}/g, deptName);
        // جلوگیری از ارسال تکراری: اگر همین پیام قبلاً ارسال شده، ارسال نکن
        const existing = await Message.findOne({
            where: {
                conversationId: conversation.id,
                direction: 'outgoing',
                isAutoReply: true,
                content: text
            }
        });
        if (existing) return;
        await sendOutgoingAutoMessage(conversation, text);
    } catch (err) {
        logger.error('maybeSendEmployeeIntro error', { error: err.message });
    }
}

module.exports = {
    setRabbitChannel,
    sendDeptAssignedMessage,
    maybeSendEmployeeIntro
};

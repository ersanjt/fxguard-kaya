/**
 * پیام‌های خودکار: تخصیص دپارتمان و معرفی کارمند
 */
const { gatewayPost } = require('../lib/gatewayClient');
const { normalizePhone } = require('../lib/phoneUtils');
const { Message, Customer, User, Department } = require('../models');

let rabbitChannel = null;

function setRabbitChannel(ch) {
    rabbitChannel = ch;
}

async function sendOutgoingAutoMessage(conversation, text) {
    try {
        const customer = await Customer.findByPk(conversation.customerId);
        const toPhone = normalizePhone(customer.phone) || customer.phone;
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
        console.error('sendOutgoingAutoMessage error:', err.message);
        return false;
    }
}

/** پیام خودکار: شما به دپارتمان X وصل شدید */
async function sendDeptAssignedMessage(conversation, department) {
    try {
        const meta = conversation.metadata || {};
        const lastDeptId = meta.deptAssignedForDeptId;
        const newDeptId = department ? String(department.id) : null;
        if (lastDeptId === newDeptId && meta.deptAssignedMsgSent) return;
        const deptName = department && department.name ? department.name : 'پشتیبانی';
        const text = `شما به دپارتمان ${deptName} وصل شدید. به زودی پاسخگوی شما خواهیم بود.`;
        if (await sendOutgoingAutoMessage(conversation, text)) {
            meta.deptAssignedMsgSent = true;
            meta.deptAssignedForDeptId = newDeptId;
            await conversation.update({ metadata: meta });
        }
    } catch (err) {
        console.error('sendDeptAssignedMessage error:', err.message);
    }
}

/** پیام خودکار: من [نام] از دپارتمان X هستم — قبل از اولین پاسخ کارمند */
async function maybeSendEmployeeIntro(conversation, userId, user, department) {
    try {
        const prevCount = await Message.count({
            where: { conversationId: conversation.id, userId, direction: 'outgoing' }
        });
        if (prevCount > 0) return;
        const name = (user && (user.name || user.username || user.email)) || 'کارشناس';
        const deptName = (department && department.name) ? department.name : 'پشتیبانی';
        const text = `من ${name} از دپارتمان ${deptName} هستم.`;
        await sendOutgoingAutoMessage(conversation, text);
    } catch (err) {
        console.error('maybeSendEmployeeIntro error:', err.message);
    }
}

module.exports = {
    setRabbitChannel,
    sendDeptAssignedMessage,
    maybeSendEmployeeIntro
};

'use strict';

const { Message, WhatsappConfig } = require('../models');
const { logActivity } = require('../services/activityLog');
const { getPanelSettings } = require('../services/panelSettingsLoader');
const { gatewayPost } = require('./gatewayClient');
const {
    buildCallIntroText,
    validateOutboundSender,
    getUserWhatsAppSenderName,
    getDepartmentName,
} = require('./outboundMessagePrefix');

/**
 * شروع تماس واتساپ از پنل: معرفی کارمند به مشتری، ثبت در CRM، فراخوانی Gateway.
 * @returns {Promise<{ data?: object, error?: string, status?: number }>}
 */
async function startWaConversationCall(req, conversation, callType) {
    const { User, Department } = require('../models');
    const senderUser = await User.findByPk(req.userId, {
        include: [{ model: Department, as: 'department', required: false }],
    });
    const senderCheck = validateOutboundSender(senderUser);
    if (!senderCheck.ok) {
        return { error: senderCheck.error, status: 400 };
    }

    const senderDept = (senderUser && senderUser.department) || conversation.department || null;
    const [panelSettings, waCfg] = await Promise.all([
        getPanelSettings(),
        WhatsappConfig.findByPk('default'),
    ]);
    const introText = buildCallIntroText(
        senderUser,
        senderDept,
        panelSettings?.siteName,
        waCfg?.callIntroMessage
    );
    if (!introText) {
        return { error: senderCheck.error || 'نام فرستنده نامعتبر است', status: 400 };
    }

    const meta = conversation.metadata && typeof conversation.metadata === 'object' ? conversation.metadata : {};
    const isGroup = !!(meta.isGroup || (conversation.customer?.phone || '').includes('@g.us'));
    const target = (conversation.customer?.phone || '').trim();
    if (!target) {
        return {
            error: isGroup ? 'شناسه گروه واتساپ یافت نشد' : 'شماره مشتری یافت نشد',
            status: 400,
        };
    }

    const isVideo = callType === 'video';
    const staffName = getUserWhatsAppSenderName(senderUser);
    const deptName = getDepartmentName(senderDept);
    const callLabel = isVideo ? 'تماس تصویری' : 'تماس صوتی';
    const crmNote = `📞 ${callLabel} — ${staffName} (${deptName})`;

    const gwRes = await gatewayPost(
        '/api/calls/start',
        { to: target, type: isVideo ? 'video' : 'voice', isGroup, introText },
        { timeout: 45000 }
    );

    const now = new Date();
    const callMsg = await Message.create({
        conversationId: conversation.id,
        customerId: conversation.customerId,
        userId: req.userId,
        direction: 'outgoing',
        content: crmNote,
        type: 'text',
        status: 'sent',
        timestamp: now,
        metadata: {
            waCall: true,
            callType: isVideo ? 'video' : 'voice',
            introText,
            method: gwRes.data?.method || null,
            isGroup,
            staffName,
            departmentName: deptName,
            organizationName: panelSettings?.siteName || null,
        },
    });

    await conversation.update({
        lastMessageAt: now,
        lastOutgoingMessageAt: now,
        lastMessagePreview: crmNote.slice(0, 200),
    });

    await logActivity({
        userId: req.userId,
        branchId: req.user?.branchId || conversation.branchId,
        departmentId: senderUser?.departmentId || conversation.departmentId,
        action: 'wa_call_started',
        entityType: 'conversation',
        entityId: conversation.id,
        customerId: conversation.customerId,
        summary: `${callLabel} توسط ${staffName} (${deptName})`,
        metadata: {
            conversationId: conversation.id,
            callType: isVideo ? 'video' : 'voice',
            method: gwRes.data?.method || null,
            introText,
            messageId: callMsg.id,
            isGroup,
        },
    });

    return {
        data: {
            ...(gwRes.data || {}),
            introText,
            crmNote,
            messageId: callMsg.id,
            staffName,
            departmentName: deptName,
        },
    };
}

module.exports = { startWaConversationCall };

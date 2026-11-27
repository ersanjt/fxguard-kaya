/**
 * رسید تحویل Cloud API — sent / delivered / read / failed
 * Meta این وضعیت‌ها را داخل webhook فیلد messages می‌فرستد.
 * رتبه فقط جلو می‌رود؛ failed وضعیت read را برنمی‌گرداند.
 */
'use strict';

const RANK = { pending: 0, sent: 1, delivered: 2, read: 3 };

function advanceDeliveryStatus(current, incoming) {
    const next = String(incoming || '').toLowerCase();
    if (next !== 'sent' && next !== 'delivered' && next !== 'read' && next !== 'failed') return null;
    const cur = String(current || '').toLowerCase();
    if (next === 'failed') {
        if (cur === 'read' || cur === 'failed') return null;
        return 'failed';
    }
    const curRank = Object.prototype.hasOwnProperty.call(RANK, cur) ? RANK[cur] : -1;
    if (curRank >= RANK[next]) return null;
    return next;
}

async function applyCloudDeliveryStatus({ Message, io, whatsappId, status, errors }) {
    const id = String(whatsappId || '').trim();
    if (!id || !Message) return { updated: false, reason: 'missing' };
    const msg = await Message.findOne({
        where: { whatsappId: id },
        attributes: ['id', 'conversationId', 'status', 'metadata'],
    });
    if (!msg) return { updated: false, reason: 'not_found' };
    const next = advanceDeliveryStatus(msg.status, status);
    if (!next) return { updated: false, reason: 'stale' };
    const patch = { status: next };
    if (next === 'failed' && Array.isArray(errors) && errors.length) {
        const meta = msg.metadata && typeof msg.metadata === 'object' ? { ...msg.metadata } : {};
        const first = errors[0] || {};
        meta.cloudError = {
            code: first.code ?? null,
            title: first.title || null,
            message: first.message || first.error_data?.details || null,
        };
        patch.metadata = meta;
    }
    await msg.update(patch);
    if (io && msg.conversationId) {
        io.to(`conversation_${msg.conversationId}`).emit('message_status_updated', {
            messageId: msg.id,
            conversationId: msg.conversationId,
            status: next,
        });
    }
    return { updated: true, status: next, messageId: msg.id };
}

module.exports = { advanceDeliveryStatus, applyCloudDeliveryStatus };

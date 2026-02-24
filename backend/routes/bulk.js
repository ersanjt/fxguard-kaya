/**
 * ارسال پیام انبوه (Bulk Messaging)
 * ارسال به چندین مشتری با تأخیر قابل تنظیم و پشتیبانی از متغیرها
 */
const express = require('express');
const router = express.Router();
const { Customer, Conversation, Message } = require('../models');
const { gatewayPost } = require('../lib/gatewayClient');
const { normalizePhone } = require('../lib/phoneUtils');
const { getAccessibleCustomerIds } = require('../lib/customerAccess');
const { logActivity } = require('../services/activityLog');

const BULK_SEND_DELAY_MS = parseInt(process.env.BULK_SEND_DELAY_MS) || 5000;
const BULK_MAX_RECIPIENTS = parseInt(process.env.BULK_MAX_RECIPIENTS) || 100;

/** جایگزینی متغیرها در متن: {name}, {phone}, {date}, {time} */
function replaceTemplateVariables(text, customer) {
    if (!text || typeof text !== 'string') return text;
    const now = new Date();
    const dateStr = now.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    return text
        .replace(/\{name\}/gi, (customer && customer.name) || 'مشتری')
        .replace(/\{phone\}/gi, (customer && customer.phone) || '')
        .replace(/\{date\}/gi, dateStr)
        .replace(/\{time\}/gi, timeStr)
        .replace(/\{email\}/gi, (customer && customer.email) || '');
}

/** ارسال پیام انبوه — POST /api/bulk/send */
router.post('/send', async (req, res) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        const enableBulk = process.env.ENABLE_BULK_MESSAGING !== 'false';
        if (!enableBulk) return res.status(403).json({ error: 'ارسال انبوه غیرفعال است. ENABLE_BULK_MESSAGING را در .env فعال کنید.' });

        const { customerIds, message, templateId, delayMs = BULK_SEND_DELAY_MS, media } = req.body;
        if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
            return res.status(400).json({ error: 'لیست مشتریان (customerIds) الزامی است' });
        }
        if (customerIds.length > BULK_MAX_RECIPIENTS) {
            return res.status(400).json({ error: `حداکثر ${BULK_MAX_RECIPIENTS} مشتری در هر ارسال انبوه مجاز است` });
        }

        let content = (message || '').trim();
        if (!content && !media) return res.status(400).json({ error: 'متن پیام یا فایل الزامی است' });

        const accessibleIds = await getAccessibleCustomerIds(req);
        const customers = await Customer.findAll({
            where: { id: { [require('sequelize').Op.in]: customerIds } },
            attributes: ['id', 'name', 'phone', 'email']
        });

        const toSend = [];
        for (const c of customers) {
            if (accessibleIds && !accessibleIds.includes(c.id)) continue;
            const phone = normalizePhone(c.phone) || c.phone;
            if (!phone) continue;
            const finalContent = replaceTemplateVariables(content, c);
            toSend.push({ customer: c, phone, content: finalContent });
        }

        if (toSend.length === 0) return res.status(400).json({ error: 'هیچ مشتری معتبری برای ارسال یافت نشد' });

        const delay = Math.max(2000, Math.min(delayMs, 60000)); // 2–60 ثانیه
        const results = { total: toSend.length, sent: 0, failed: 0, errors: [] };

        res.json({
            ok: true,
            message: `ارسال به ${toSend.length} مشتری شروع شد. تأخیر بین هر پیام: ${delay / 1000} ثانیه`,
            jobId: `bulk_${Date.now()}`,
            total: toSend.length
        });

        // ارسال در پس‌زمینه
        (async () => {
            const { Template } = require('../models');
            for (let i = 0; i < toSend.length; i++) {
                const { customer, phone, content: finalContent } = toSend[i];
                try {
                    let conversation = await Conversation.findOne({
                        where: { customerId: customer.id, status: { [require('sequelize').Op.notIn]: ['closed', 'archived'] } }
                    });
                    if (!conversation) {
                        conversation = await Conversation.create({
                            customerId: customer.id,
                            status: 'open',
                            priority: 'normal',
                            source: 'whatsapp',
                            branchId: req.user.branchId || null
                        });
                    }

                    const msg = await Message.create({
                        conversationId: conversation.id,
                        customerId: customer.id,
                        userId: req.userId,
                        direction: 'outgoing',
                        content: finalContent,
                        type: media ? 'document' : 'text',
                        hasMedia: !!media,
                        mediaData: media || null,
                        status: 'pending',
                        isAutoReply: false,
                        timestamp: new Date()
                    });

                    const payload = { to: phone, message: finalContent };
                    if (media && media.url) payload.media = { url: media.url, mimetype: media.mimetype || '' };

                    await gatewayPost('/api/send-message', payload, { timeout: 15000 });
                    await msg.update({ status: 'sent' });
                    results.sent++;

                    if (templateId) {
                        const tpl = await Template.findByPk(templateId);
                        if (tpl) await tpl.increment('usageCount');
                    }
                } catch (err) {
                    results.failed++;
                    results.errors.push({ customerId: customer.id, phone: customer.phone, error: err.message });
                }

                if (i < toSend.length - 1) await new Promise(r => setTimeout(r, delay));
            }

            await logActivity({
                userId: req.userId,
                branchId: req.user.branchId,
                departmentId: req.user.departmentId,
                action: 'bulk_message_sent',
                entityType: 'bulk',
                summary: `ارسال انبوه: ${results.sent} موفق، ${results.failed} ناموفق از ${results.total}`,
                metadata: { results }
            });
        })();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

/**
 * ارسال پیام انبوه (Bulk Messaging)
 * ارسال به چندین مشتری با تأخیر قابل تنظیم و پشتیبانی از متغیرها
 */
const express = require('express');
const router = express.Router();
const { Customer, Conversation, Message } = require('../models');
const { sendWhatsAppMessage, getWhatsappConnectionConfig } = require('../lib/gatewayClient');
const { isCloudApiConfigured } = require('../lib/whatsappConnectionLoader');
const { normalizePhone } = require('../lib/phoneUtils');
const { getAccessibleCustomerIds } = require('../lib/customerAccess');
const { logActivity } = require('../services/activityLog');

const BULK_SEND_DELAY_MS = parseInt(process.env.BULK_SEND_DELAY_MS) || 5000;
const BULK_MAX_RECIPIENTS = parseInt(process.env.BULK_MAX_RECIPIENTS) || 100;

// نگهداری وضعیت job های در حال اجرا در حافظه
const bulkJobs = new Map();

/** GET /api/bulk/status/:jobId — وضعیت یک job */
router.get('/status/:jobId', (req, res) => {
    const job = bulkJobs.get(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'job یافت نشد یا منقضی شده است' });
    const isAdmin = req.user && ['owner', 'admin', 'manager'].indexOf(req.user.role || '') !== -1;
    if (!isAdmin && job.userId !== req.userId) return res.status(403).json({ error: 'دسترسی ندارید' });
    res.json(job);
});

/** GET /api/bulk/jobs — لیست job های این کاربر (ادمین همه را می‌بیند) */
router.get('/jobs', (req, res) => {
    const isAdmin = req.user && ['owner', 'admin', 'manager'].indexOf(req.user.role || '') !== -1;
    const jobs = [];
    for (const [id, job] of bulkJobs.entries()) {
        if (isAdmin || job.userId === req.userId) {
            jobs.push({ jobId: id, ...job });
        }
    }
    res.json({ jobs });
});

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
router.post('/send', async (req, res, next) => {
    try {
        if (!req.canAccess('conversations')) return res.status(403).json({ error: 'دسترسی به بخش مکالمات ندارید' });
        const enableBulk = process.env.ENABLE_BULK_MESSAGING !== 'false';
        if (!enableBulk) return res.status(403).json({ error: 'ارسال انبوه غیرفعال است. ENABLE_BULK_MESSAGING را در .env فعال کنید.' });

        const {
            customerIds,
            message,
            templateId,
            delayMs = BULK_SEND_DELAY_MS,
            media,
            useCloudTemplate,
            templateName,
            templateLanguage,
            templateBodyParams,
        } = req.body;
        if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
            return res.status(400).json({ error: 'لیست مشتریان (customerIds) الزامی است' });
        }
        if (customerIds.length > BULK_MAX_RECIPIENTS) {
            return res.status(400).json({ error: `حداکثر ${BULK_MAX_RECIPIENTS} مشتری در هر ارسال انبوه مجاز است` });
        }

        const content = (message || '').trim();
        const connCfg = await getWhatsappConnectionConfig();
        const cloudReady = await isCloudApiConfigured();
        const effectiveTemplate = String(templateName || connCfg.cloudBulkTemplateName || process.env.WHATSAPP_CLOUD_BULK_TEMPLATE_NAME || '').trim();
        const effectiveLang = String(templateLanguage || connCfg.cloudBulkTemplateLanguage || process.env.WHATSAPP_CLOUD_BULK_TEMPLATE_LANGUAGE || 'fa').trim() || 'fa';
        const sendAsTemplate = cloudReady && effectiveTemplate && useCloudTemplate !== false;

        if (!sendAsTemplate && !content && !media) return res.status(400).json({ error: 'متن پیام یا فایل الزامی است' });
        if (sendAsTemplate && !cloudReady) {
            return res.status(400).json({ error: 'ارسال با قالب Meta فقط با Cloud API فعال ممکن است' });
        }
        if (!sendAsTemplate && content.length > 4096) return res.status(400).json({ error: 'متن پیام بیش از ۴۰۹۶ کاراکتر مجاز نیست' });
        if (sendAsTemplate && media) {
            return res.status(400).json({ error: 'ارسال رسانه در حالت قالب Meta پشتیبانی نمی‌شود' });
        }

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
            const bodyParams = Array.isArray(templateBodyParams) && templateBodyParams.length
                ? templateBodyParams.map((p) => replaceTemplateVariables(String(p), c))
                : (finalContent ? [finalContent] : []);
            toSend.push({ customer: c, phone, content: finalContent, bodyParams });
        }

        if (toSend.length === 0) return res.status(400).json({ error: 'هیچ مشتری معتبری برای ارسال یافت نشد' });

        const delayMsNum = Number(delayMs);
        const delay = Math.max(2000, Math.min(Number.isFinite(delayMsNum) ? delayMsNum : BULK_SEND_DELAY_MS, 60000)); // 2–60 ثانیه
        const jobId = `bulk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        // ثبت job در حافظه
        const jobState = {
            status: 'running',
            total: toSend.length,
            sent: 0,
            failed: 0,
            current: 0,
            errors: [],
            startedAt: new Date().toISOString(),
            finishedAt: null,
            userId: req.userId,
            channel: sendAsTemplate ? 'cloud_template' : 'free_text',
            templateName: sendAsTemplate ? effectiveTemplate : null,
        };
        bulkJobs.set(jobId, jobState);

        // پاک کردن job های قدیمی (بیش از ۲ ساعت)
        for (const [id, job] of bulkJobs.entries()) {
            if (job.finishedAt && Date.now() - new Date(job.finishedAt).getTime() > 2 * 60 * 60 * 1000) {
                bulkJobs.delete(id);
            }
        }

        res.json({
            ok: true,
            message: sendAsTemplate
                ? `ارسال قالب «${effectiveTemplate}» به ${toSend.length} مشتری شروع شد. تأخیر بین هر پیام: ${delay / 1000} ثانیه`
                : `ارسال به ${toSend.length} مشتری شروع شد. تأخیر بین هر پیام: ${delay / 1000} ثانیه`,
            jobId,
            total: toSend.length,
            channel: jobState.channel,
            templateName: jobState.templateName,
            statusUrl: `/api/bulk/status/${jobId}`
        });

        // ارسال در پس‌زمینه با job tracking
        (async () => {
            const { Template } = require('../models');
            for (let i = 0; i < toSend.length; i++) {
                const { customer, phone, content: finalContent, bodyParams } = toSend[i];
                jobState.current = i + 1;
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
                        content: sendAsTemplate
                            ? `[Template: ${effectiveTemplate}] ${finalContent || bodyParams.join(' | ')}`
                            : finalContent,
                        type: media ? 'document' : 'text',
                        hasMedia: !!media,
                        mediaData: media || null,
                        status: 'pending',
                        isAutoReply: false,
                        timestamp: new Date(),
                        metadata: sendAsTemplate
                            ? { bulkTemplate: effectiveTemplate, bulkTemplateLanguage: effectiveLang, sendSource: 'crm_panel' }
                            : { sendSource: 'crm_panel' },
                    });

                    let payload;
                    if (sendAsTemplate) {
                        payload = {
                            to: phone,
                            templateName: effectiveTemplate,
                            templateLanguage: effectiveLang,
                            templateBodyParams: bodyParams,
                        };
                    } else {
                        payload = { to: phone, message: finalContent };
                        if (media && media.url) payload.media = { url: media.url, mimetype: media.mimetype || '' };
                    }

                    const sendRes = await sendWhatsAppMessage(payload, { timeout: 15000 });
                    const waId = sendRes?.data?.messageId || null;
                    await msg.update({ status: 'sent', ...(waId ? { whatsappId: waId } : {}) });
                    jobState.sent++;

                    if (templateId) {
                        const tpl = await Template.findByPk(templateId);
                        if (tpl) await tpl.increment('usageCount');
                    }
                } catch (err) {
                    jobState.failed++;
                    jobState.errors.push({ customerId: customer.id, phone: customer.phone, error: err.message });
                }

                if (i < toSend.length - 1) await new Promise(r => setTimeout(r, delay));
            }

            jobState.status = 'done';
            jobState.finishedAt = new Date().toISOString();

            await logActivity({
                userId: req.userId,
                branchId: req.user.branchId,
                departmentId: req.user.departmentId,
                action: 'bulk_message_sent',
                entityType: 'bulk',
                summary: `ارسال انبوه: ${jobState.sent} موفق، ${jobState.failed} ناموفق از ${jobState.total}`,
                metadata: { jobId, results: { sent: jobState.sent, failed: jobState.failed, total: jobState.total } }
            });
        })().catch(err => {
            jobState.status = 'error';
            jobState.finishedAt = new Date().toISOString();
            jobState.errors.push({ error: err.message });
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

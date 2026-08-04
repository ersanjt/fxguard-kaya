const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { Message } = require('../models');
const { logActivity } = require('../services/activityLog');
const { sendWhatsAppMessage } = require('../lib/gatewayClient');
const { getSendTarget } = require('../lib/phoneUtils');
const { validateOutboundSender, applyStaffSignatureToOutboundText, buildStaffMediaCaption, buildForwardOutboundText, buildStaffVoiceIntroText } = require('./outboundMessagePrefix');
const { getWhatsappConnectionConfig } = require('./whatsappConnectionLoader');
const {
    shouldSendViaTemplate,
    buildTemplatePayload,
    outsideSessionErrorMessage,
    isWithinCloudSessionWindow,
    getOutboundTemplateName,
} = require('./whatsappOutboundPolicy');
const {
    ensureVoiceFormat,
    isWhatsAppVoiceMime,
    WHATSAPP_VOICE_MIME,
    WHATSAPP_VOICE_FILENAME,
} = require('../lib/audioConverter');

function resolveUploadFilePath(uploadsDir, relUnderUploads) {
    let rel = String(relUnderUploads || '').replace(/^\/+/, '');
    if (!rel || rel.includes('..')) return null;
    try {
        rel = decodeURIComponent(rel);
    } catch (_) {
        /* keep raw */
    }
    if (rel.includes('..')) return null;
    const resolvedRoot = path.resolve(uploadsDir) + path.sep;
    const resolvedFile = path.resolve(uploadsDir, rel);
    if (resolvedFile !== path.resolve(uploadsDir) && !resolvedFile.startsWith(resolvedRoot)) return null;
    return resolvedFile;
}

/**
 * ارسال پیام خروجی به مشتری (متن/مدیا) و همگام‌سازی با واتساپ.
 * @returns {{ msg, error?: string, status?: number }}
 */
async function deliverOutboundConversationMessage(req, conversation, { content, media, replyTo, metadata, skipIntro }) {
    if (!conversation || !conversation.customer) {
        return { msg: null, error: 'مشتری مکالمه یافت نشد', status: 404 };
    }
    if (conversation.status === 'archived') {
        return { msg: null, error: 'امکان ارسال پیام به مکالمه آرشیو شده وجود ندارد. ابتدا وضعیت را تغییر دهید.', status: 400 };
    }
    const text = content || '';
    if (!text && !media) {
        return { msg: null, error: 'متن پیام یا فایل الزامی است', status: 400 };
    }

    const isForwarded = !!(metadata && metadata.forwardedFrom);
    const { User, Department } = require('../models');
    let senderUser = null;
    let senderDept = null;
    if (req.userId) {
        senderUser = await User.findByPk(req.userId, {
            include: [{ model: Department, as: 'department', required: false }],
        });
        // دپارتمان و نام همان کاربری که الان پیام می‌فرستد (نه لزوماً دپارتمان مکالمه)
        senderDept = (senderUser && senderUser.department) || conversation.department || null;
        const senderCheck = validateOutboundSender(senderUser);
        if (!senderCheck.ok) {
            return { msg: null, error: senderCheck.error, status: 400 };
        }
    }

    // پیام معرفی کارشناس: یک‌بار قبل از اولین پیامِ هر کارشناس به مشتری اطلاع می‌دهد
    // با کدام کارشناس/دپارتمان در حال گفتگوست (و هنگام تغییر کارشناس دوباره ارسال می‌شود).
    if (req.userId && !isForwarded && !skipIntro) {
        try {
            const { maybeSendEmployeeIntro } = require('../services/autoMessages');
            await maybeSendEmployeeIntro(conversation, req.userId, senderUser, senderDept);
        } catch (_) {}
    }

    const proto = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('host') || '';
    const baseUrl = process.env.BACKEND_PUBLIC_URL || (proto + '://' + host);
    let mediaUrl = null;
    let msgType = media?.type || 'text';
    let hasMedia = false;
    let mediaData = null;
    if (media && (media.url || media.filename)) {
        hasMedia = true;
        const relPath = media.url || ('/uploads/' + media.filename);
        if (relPath.startsWith('http')) {
            mediaUrl = relPath;
        } else {
            const root = (process.env.BACKEND_PUBLIC_URL && process.env.BACKEND_PUBLIC_URL.replace(/\/$/, '')) || baseUrl.replace(/\/$/, '');
            mediaUrl = root + (relPath.startsWith('/') ? relPath : '/' + relPath);
        }
        const mime = media.mimetype || '';
        if (mime.startsWith('image/')) msgType = 'image';
        else if (mime.startsWith('video/')) msgType = 'video';
        else if (mime.startsWith('audio/')) msgType = 'audio';
        else if (media.type && ['image', 'video', 'audio', 'document'].includes(media.type)) msgType = media.type;
        else msgType = 'document';
        mediaData = { url: relPath, filename: media.filename || media.name, mimetype: media.mimetype };
    }

    const isVoiceNoteEarly =
        (media?.type === 'audio' || media?.sendAsVoice === true)
        || (media?.mimetype || '').startsWith('audio/');

    let waCaption;
    if (isForwarded) {
        waCaption = buildForwardOutboundText(senderUser, text, metadata.forwardedFrom);
    } else if (hasMedia && !text.trim() && !isVoiceNoteEarly) {
        waCaption = buildStaffMediaCaption(senderUser, msgType, text);
    } else {
        waCaption = applyStaffSignatureToOutboundText(senderUser, text);
    }
    const voiceIntroLine =
        hasMedia && isVoiceNoteEarly && senderUser
            ? buildStaffVoiceIntroText(senderUser, isForwarded ? metadata.forwardedFrom : null)
            : null;

    const msgMeta = metadata && typeof metadata === 'object' ? { ...metadata } : {};
    msgMeta.sendSource = 'crm_panel';
    if (waCaption && waCaption !== text) msgMeta.customerWaText = waCaption;
    if (voiceIntroLine) msgMeta.staffVoiceIntro = voiceIntroLine;
    const msg = await Message.create({
        conversationId: conversation.id,
        customerId: conversation.customerId,
        userId: req.userId,
        direction: 'outgoing',
        content: text || (hasMedia ? (media.filename || media.name || '') : ''),
        type: msgType,
        hasMedia,
        mediaData,
        metadata: msgMeta,
        timestamp: new Date(),
    });

    let preview = (text || '').slice(0, 120) || (hasMedia ? '📎 فایل' : '');
    if ((text || '').length > 120) preview += '…';
    const now = new Date();
    const updateData = {
        lastMessageAt: now,
        lastOutgoingMessageAt: now,
        lastOutgoingIsAutoReply: false,
        lastMessagePreview: preview,
        unreadCount: 0,
        unansweredAlertSentAt: null,
        escalatedAt: null,
    };
    if (!conversation.firstReplyAt) updateData.firstReplyAt = now;
    if (!conversation.branchId && req.user && req.user.branchId) updateData.branchId = req.user.branchId;
    if (req.userId) {
        const meta = conversation.metadata && typeof conversation.metadata === 'object'
            ? { ...conversation.metadata }
            : {};
        meta.lastActiveOutgoingUserId = String(req.userId);
        updateData.metadata = meta;
    }
    await conversation.update(updateData);

    if (hasMedia && mediaData && conversation.customerId) {
        try {
            const { CustomerDocument } = require('../models');
            if (CustomerDocument) {
                const mime = mediaData.mimetype || '';
                let fType = 'other';
                if (mime.startsWith('image/')) fType = 'image';
                else if (mime.startsWith('video/')) fType = 'video';
                else if (mime.startsWith('audio/')) fType = 'audio';
                else if (mime.includes('pdf') || mime.includes('word') || mime.includes('excel') || mime.includes('text') || mime.includes('spreadsheet') || mime.includes('presentation')) fType = 'document';
                await CustomerDocument.create({
                    customerId: conversation.customerId,
                    title: mediaData.filename || 'فایل ارسالی',
                    category: 'media',
                    filePath: mediaData.url || '',
                    fileName: mediaData.filename || 'file',
                    mimeType: mime,
                    fileType: fType,
                    source: 'conversation',
                    messageId: msg.id,
                    conversationId: conversation.id,
                    uploadedBy: req.userId,
                });
            }
        } catch (_) {}
    }

    const toPhone = getSendTarget(conversation.customer.phone) || conversation.customer.phone;
    if (!toPhone) {
        await msg.update({ status: 'failed' });
        return { msg, error: 'شماره تلفن مشتری معتبر نیست. لطفاً در پروفایل مشتری شماره را با فرمت صحیح وارد کنید.', status: 400 };
    }

    const isVoiceNote =
        msgType === 'audio' || media?.sendAsVoice === true || media?.type === 'audio';
    const payload = { to: toPhone, message: waCaption };
    if (hasMedia && media && (media.url || media.filename)) {
        const relPath = media.url || ('/uploads/' + media.filename);
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        const relUnderUploads = String(relPath.replace(/^\/uploads\/?/, '') || media.filename || media.name || 'file').replace(/^\/+/, '');
        let readPath = resolveUploadFilePath(uploadsDir, relUnderUploads);
        let sendMimetype = media.mimetype || 'application/octet-stream';
        let sendFilename = media.filename || media.name || path.basename(relUnderUploads) || 'file';
        if (!relPath.startsWith('http') && readPath && fs.existsSync(readPath)) {
            try {
                if (isVoiceNote) {
                    const converted = await ensureVoiceFormat(readPath, sendMimetype, sendFilename);
                    readPath = converted.filePath;
                    sendMimetype = converted.mimetype;
                    sendFilename = converted.filename;
                    if (!isWhatsAppVoiceMime(sendMimetype)) {
                        await msg.update({ status: 'failed' });
                        return {
                            msg,
                            error: 'پیام صوتی به فرمت قابل پخش در واتساپ تبدیل نشد. ffmpeg را روی سرور بررسی کنید.',
                            status: 502,
                        };
                    }
                    const playbackRel = '/uploads/' + path.basename(readPath);
                    const playbackMedia = {
                        url: playbackRel,
                        filename: converted.filename,
                        mimetype: 'audio/ogg',
                    };
                    await msg.update({ mediaData: playbackMedia, type: 'audio', hasMedia: true });
                    mediaData = playbackMedia;
                    const root = (process.env.BACKEND_PUBLIC_URL && process.env.BACKEND_PUBLIC_URL.replace(/\/$/, '')) || baseUrl.replace(/\/$/, '');
                    mediaUrl = root + playbackRel;
                }
                const fileBuf = await fsPromises.readFile(readPath);
                const base64 = fileBuf.toString('base64');
                payload.media = { data: base64, mimetype: sendMimetype, filename: sendFilename };
                if (isVoiceNote) {
                    payload.media.sendAsVoice = true;
                    payload.media.mimetype = WHATSAPP_VOICE_MIME;
                    payload.media.filename = WHATSAPP_VOICE_FILENAME;
                }
            } catch (readErr) {
                if (isVoiceNote) {
                    await msg.update({ status: 'failed' });
                    return {
                        msg,
                        error:
                            'پیام صوتی آماده ارسال نشد: ' +
                            (readErr.message || 'خطا در خواندن یا تبدیل فایل'),
                        status: 502,
                    };
                }
                if (mediaUrl) {
                    payload.media = { url: mediaUrl, mimetype: media.mimetype || '' };
                }
            }
        } else if (mediaUrl) {
            if (isVoiceNote) {
                await msg.update({ status: 'failed' });
                return {
                    msg,
                    error: 'فایل صوتی روی سرور یافت نشد — ارسال ویس از URL پشتیبانی نمی‌شود.',
                    status: 502,
                };
            }
            payload.media = { url: mediaUrl, mimetype: media.mimetype || '' };
        } else if (isVoiceNote || (hasMedia && !readPath)) {
            await msg.update({ status: 'failed' });
            return { msg, error: 'فایل برای ارسال یافت نشد.', status: 502 };
        }
        // PTT must not carry staff prefix as caption (would break download on recipient phones)
        if (isVoiceNote) payload.message = '';
    }
    if (replyTo) payload.replyTo = replyTo;

    const connCfg = await getWhatsappConnectionConfig();
    const cloudActive = connCfg.cloudEnabled !== false
        && connCfg.cloudAccessToken
        && connCfg.cloudPhoneNumberId
        && connCfg.connectionMode !== 'gateway';

    if (cloudActive && !hasMedia && !payload.templateName) {
        if (shouldSendViaTemplate(conversation, connCfg, { hasMedia })) {
            const tplPayload = buildTemplatePayload(payload, waCaption || text, connCfg);
            if (tplPayload) {
                Object.assign(payload, tplPayload);
                const meta = { ...(msg.metadata || {}), sentViaTemplate: true, templateName: tplPayload.templateName };
                await msg.update({ metadata: meta });
            }
        } else if (!isWithinCloudSessionWindow(conversation)) {
            const blockMsg = outsideSessionErrorMessage(connCfg);
            const gatewayCanSend = connCfg.gatewayEnabled !== false && connCfg.connectionMode !== 'cloud';
            if (blockMsg && !gatewayCanSend) {
                await msg.update({ status: 'failed' });
                return { msg, error: blockMsg, status: 400 };
            }
        }
    }

    try {
        if (voiceIntroLine) {
            try {
                await sendWhatsAppMessage({ to: toPhone, message: voiceIntroLine }, { timeout: 10000 });
            } catch (_) {}
        }
        // فقط وقتی مسیر ارسال واقعاً Gateway است، ready را از قبل چک کن
        const toStr = String(toPhone || '');
        const { isLikelyWhatsAppLid, isGroupJid } = require('../lib/phoneUtils');
        const forceGateway =
            isGroupJid(toStr) || isLikelyWhatsAppLid(toStr) || /@lid\b/i.test(toStr);
        const cloudOk =
            connCfg.cloudEnabled !== false &&
            connCfg.cloudAccessToken &&
            connCfg.cloudPhoneNumberId &&
            connCfg.connectionMode !== 'gateway';
        const willUseGateway =
            connCfg.gatewayEnabled !== false &&
            (forceGateway || connCfg.connectionMode === 'gateway' || !cloudOk);

        if (willUseGateway) {
            const { gatewayGet } = require('../lib/gatewayClient');
            try {
                const st = await gatewayGet('/api/status', { timeout: 4000 });
                const ready = !!(st?.data?.whatsapp || st?.data?.status === 'ready');
                if (!ready) {
                    await msg.update({ status: 'failed' });
                    return {
                        msg,
                        error:
                            'واتساپ Gateway آماده نیست (وضعیت: ' +
                            String(st?.data?.status || 'disconnected') +
                            '). از تنظیمات واتساپ اتصال/QR را برقرار کنید.',
                        status: 503,
                    };
                }
            } catch (stErr) {
                await msg.update({ status: 'failed' });
                return {
                    msg,
                    error:
                        'به Gateway واتساپ وصل نشد (' +
                        (stErr?.code || stErr?.message || 'unreachable') +
                        '). سرویس crm-gateway-kaya و GATEWAY_URL را بررسی کنید.',
                    status: 503,
                };
            }
        }
        // باید از timeout ارسال Gateway (~45s) بیشتر باشد تا خطای واقعی برگردد نه abort خالی
        const gwRes = await sendWhatsAppMessage(payload, { timeout: 55000 });
        const waId = gwRes?.data?.messageId;
        const updateFields = { status: 'sent' };
        if (waId) updateFields.whatsappId = waId;
        if (gwRes?.data?.viaTemplate) {
            updateFields.metadata = {
                ...(msg.metadata || {}),
                sentViaTemplate: true,
                templateName: payload.templateName || getOutboundTemplateName(connCfg),
            };
        }
        await msg.update(updateFields);
    } catch (gwErr) {
        let errMsg = gwErr?.response?.data?.error || gwErr?.message || 'خطا در ارسال به واتساپ';
        if (typeof errMsg !== 'string') errMsg = String(errMsg?.message || errMsg || 'خطا در ارسال به واتساپ');
        if (gwErr?.code === 'ECONNREFUSED' || gwErr?.code === 'ENOTFOUND') {
            errMsg = 'Gateway واتساپ روشن نیست یا آدرس GATEWAY_URL اشتباه است';
        } else if (gwErr?.code === 'ECONNABORTED' || /timeout/i.test(errMsg)) {
            errMsg = 'زمان ارسال به Gateway تمام شد. وضعیت واتساپ (ready) را بررسی کنید';
        } else if (/not ready/i.test(errMsg)) {
            errMsg = 'واتساپ Gateway آماده نیست. ابتدا QR را اسکن کنید یا اتصال را برقرار کنید';
        }
        if (errMsg.includes('Invalid or unsafe media URL') || errMsg.includes('media URL')) {
            errMsg += ' — برای پیام صوتی/فایل، در Gateway: MEDIA_ALLOW_LOCALHOST=true یا MEDIA_URL_WHITELIST تنظیم کنید؛ در Backend: BACKEND_PUBLIC_URL را به آدرسی که Gateway به آن دسترسی دارد تنظیم کنید.';
        }
        await msg.update({ status: 'failed' });
        return { msg, error: 'پیام در پنل ذخیره شد اما به واتساپ ارسال نشد: ' + errMsg, status: 502 };
    }

    await logActivity({
        userId: req.userId,
        branchId: req.user.branchId || conversation.branchId,
        departmentId: req.user.departmentId || conversation.departmentId,
        action: 'message_sent',
        entityType: 'message',
        entityId: msg.id,
        customerId: conversation.customerId,
        summary: `پیام به مشتری ${conversation.customer.phone || conversation.customerId}`,
        metadata: {
            conversationId: conversation.id,
            contentLength: (text || '').length,
            hasMedia: !!hasMedia,
            forwarded: !!(metadata && metadata.forwardedFrom),
            forwardedTo: metadata && metadata.forwardedTo ? metadata.forwardedTo : undefined,
            mediaType: hasMedia ? msgType : undefined,
        },
    });

    return { msg };
}

module.exports = { deliverOutboundConversationMessage };

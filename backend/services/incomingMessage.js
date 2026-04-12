/**
 * پردازش پیام‌های ورودی واتساپ — خوش‌آمدگویی، auto-response، AI، تخصیص خودکار
 */
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const axios = require('axios');
const mongoose = require('mongoose');
const models = require('../models');
const { sequelize, Customer, Conversation, Message, User, Department, AutoResponse, WhatsappConfig } = models;
const { Op } = require('sequelize');
const { normalizePhone, getSendTarget } = require('../lib/phoneUtils');
const { sendWhatsAppMessage, isCloudApiConfigured } = require('../lib/gatewayClient');
const { gatewayGet } = require('../lib/gatewayClient');
const { sendDeptAssignedMessage, maybeSendEmployeeIntro } = require('./autoMessages');
const { selectBestDepartment, selectBestUser } = require('./intelligentDepartmentRouter');
const { persistRemoteAvatarIfNeeded, digitsOnlyChatPhone } = require('../lib/customerAvatar');
const { notifySystemEvent } = require('./systemEventNotifier');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch (_) {}

const AUTO_RESPONSE_CACHE_KEY = 'cache:autoresponse:active';
const AUTO_RESPONSE_CACHE_TTL = 60;

// پیشوند پیام AI به مشتری در واتساپ (ایموجی ربات به‌جای متن)
const AI_MESSAGE_PREFIX = '🤖 ';

// WhatsappConfig in-memory cache (30 seconds TTL) to avoid N+1 on every AI-enabled message
let _wcCache = null;
let _wcCacheAt = 0;
const WC_CACHE_TTL_MS = 30 * 1000;

// Cache avatar lookups to avoid hitting gateway on every message.
const AVATAR_LOOKUP_TTL_MS = 5 * 60 * 1000;
const _avatarLookupCache = new Map();

async function tryFetchProfilePicFromGateway(phone, logger) {
    const p = digitsOnlyChatPhone(phone);
    if (!p || p.length < 8) return null;
    const now = Date.now();
    const cached = _avatarLookupCache.get(p);
    if (cached && (now - cached.at) < AVATAR_LOOKUP_TTL_MS) {
        return cached.url || null;
    }
    try {
        const res = await gatewayGet('/api/contacts/profile-pic?phone=' + encodeURIComponent(p), { timeout: 4500 });
        const url = (res && res.data && res.data.profilePicUrl) ? String(res.data.profilePicUrl).trim() : '';
        _avatarLookupCache.set(p, { at: now, url: url || null });
        return url || null;
    } catch (err) {
        _avatarLookupCache.set(p, { at: now, url: null });
        logger.warn('profile pic lookup failed', { phone: p.slice(-6), error: err?.message });
        return null;
    }
}

async function getCachedWhatsappConfig() {
    const now = Date.now();
    if (_wcCache && (now - _wcCacheAt) < WC_CACHE_TTL_MS) return _wcCache;
    const [wc] = await WhatsappConfig.findOrCreate({ where: { id: 'default' }, defaults: { aiAnswerEnabled: true } });
    _wcCache = wc;
    _wcCacheAt = now;
    return wc;
}

async function resolveIncomingMedia(media, logger) {
    if (!media || !media.url) return media;
    const url = (media.url || '').trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (url.startsWith('/') && (url.startsWith('/uploads/') || url.includes('uploads')))
            return { url: url, filename: media.filename || media.caption, mimetype: media.mimetype };
        return media;
    }
    try {
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 30000,
            maxContentLength: 20 * 1024 * 1024,
            maxRedirects: 5,
            headers: { 'User-Agent': 'KayaCRM-Backend/1.0', 'Accept': 'image/*,video/*,audio/*,*/*' }
        });
        if (!res.data || (res.status !== 200 && res.status !== 206)) throw new Error('Bad response ' + res.status);
        const buf = Buffer.from(res.data);
        const ct = (res.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
        const suggestedName = media.filename || media.caption || 'file';
        let ext = (path.extname(suggestedName) || '').toLowerCase();
        if (!ext && ct) {
            if (ct.includes('image/jpeg') || ct.includes('image/jpg')) ext = '.jpg';
            else if (ct.includes('image/png')) ext = '.png';
            else if (ct.includes('image/gif')) ext = '.gif';
            else if (ct.includes('image/webp')) ext = '.webp';
            else if (ct.includes('video/')) ext = '.mp4';
            else if (ct.includes('audio/')) ext = '.mp3';
            else if (ct.includes('pdf')) ext = '.pdf';
            else ext = '.bin';
        }
        if (!ext) ext = '.bin';
        const safeName = (Date.now() + '-' + suggestedName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100)) + (ext.startsWith('.') ? ext : '.' + ext);
        const filePath = path.resolve(uploadsDir, safeName);
        const normalizedUploadsDir = path.resolve(uploadsDir);
        if (!filePath.startsWith(normalizedUploadsDir + path.sep) && filePath !== normalizedUploadsDir) {
            throw new Error('Path traversal detected in media filename');
        }
        await fsPromises.writeFile(filePath, buf);
        return { url: '/uploads/' + safeName, filename: media.filename || suggestedName, mimetype: media.mimetype || ct || null };
    } catch (err) {
        logger.warn('resolveIncomingMedia download failed', { url: url.slice(0, 80), error: err.message });
        return { url: null, filename: media.filename || media.caption || 'file', mimetype: media.mimetype };
    }
}

async function resolveIncomingMediaFromBase64(media, logger) {
    if (!media || !media.data) return media;
    try {
        const buf = Buffer.from(media.data, 'base64');
        const suggestedName = media.filename || media.caption || 'file';
        const ct = (media.mimetype || '').split(';')[0].trim().toLowerCase();
        let ext = (path.extname(suggestedName) || '').toLowerCase();
        if (!ext && ct) {
            if (ct.includes('image/jpeg') || ct.includes('image/jpg')) ext = '.jpg';
            else if (ct.includes('image/png')) ext = '.png';
            else if (ct.includes('image/gif')) ext = '.gif';
            else if (ct.includes('image/webp')) ext = '.webp';
            else if (ct.includes('video/')) ext = '.mp4';
            else if (ct.includes('audio/ogg') || ct.includes('audio/opus')) ext = '.ogg';
            else if (ct.includes('audio/')) ext = '.m4a';
            else if (ct.includes('pdf')) ext = '.pdf';
            else ext = '.bin';
        }
        if (!ext) ext = '.bin';
        const safeName = (Date.now() + '-' + suggestedName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100)) + (ext.startsWith('.') ? ext : '.' + ext);
        const filePath = path.resolve(uploadsDir, safeName);
        const normalizedUploadsDir = path.resolve(uploadsDir);
        if (!filePath.startsWith(normalizedUploadsDir + path.sep) && filePath !== normalizedUploadsDir) {
            throw new Error('Path traversal detected in media filename');
        }
        await fsPromises.writeFile(filePath, buf);
        return { url: '/uploads/' + safeName, filename: media.filename || suggestedName, mimetype: media.mimetype || ct || null };
    } catch (err) {
        logger.warn('resolveIncomingMediaFromBase64 failed', { error: err.message });
        return media;
    }
}

function inferMessageTypeFromMedia(media) {
    if (!media) return 'text';
    const mime = (media.mimetype || '').toLowerCase();
    const name = (media.filename || media.caption || '').toLowerCase();
    if (mime.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp)$/i.test(name)) return 'image';
    if (mime.startsWith('video/') || /\.(mp4|webm|mov|avi)$/i.test(name)) return 'video';
    if (mime.startsWith('audio/') || /\.(mp3|ogg|wav|m4a|opus|oga)$/i.test(name)) return 'audio';
    if (mime || name) return 'document';
    return 'text';
}

function matchesAutoResponseConditions(rule, conversation, now) {
    const cond = rule.conditions || {};
    if (!cond || typeof cond !== 'object') return true;
    if (cond.timeOfDay && typeof cond.timeOfDay === 'object') {
        const start = (cond.timeOfDay.start || '00:00').toString();
        const end = (cond.timeOfDay.end || '23:59').toString();
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        const nowMins = now.getHours() * 60 + now.getMinutes();
        const startMins = (sh || 0) * 60 + (sm || 0);
        const endMins = (eh || 0) * 60 + (em || 0);
        if (startMins <= endMins) {
            if (nowMins < startMins || nowMins > endMins) return false;
        } else {
            if (nowMins < startMins && nowMins > endMins) return false;
        }
    }
    if (cond.daysOfWeek && Array.isArray(cond.daysOfWeek) && cond.daysOfWeek.length > 0) {
        const day = now.getDay();
        if (!cond.daysOfWeek.includes(day)) return false;
    }
    if (cond.departmentId && conversation.departmentId) {
        if (String(conversation.departmentId) !== String(cond.departmentId)) return false;
    }
    return true;
}

async function getActiveAutoResponses(redisClient) {
    try {
        if (redisClient && typeof redisClient.get === 'function') {
            const cached = await redisClient.get(AUTO_RESPONSE_CACHE_KEY).catch(() => null);
            if (cached) return JSON.parse(cached);
        }
    } catch (_) {}
    const responses = await AutoResponse.findAll({
        where: { isActive: true },
        order: [['priority', 'DESC'], ['createdAt', 'ASC']]
    });
    try {
        if (redisClient && typeof redisClient.setEx === 'function') {
            await redisClient.setEx(AUTO_RESPONSE_CACHE_KEY, AUTO_RESPONSE_CACHE_TTL, JSON.stringify(responses)).catch(() => {});
        }
    } catch (_) {}
    return responses;
}

async function sendFirstMessageWelcome(conversation, customer, rabbitChannel, logger) {
    try {
        const [cfg] = await WhatsappConfig.findOrCreate({
            where: { id: 'default' },
            defaults: { welcomeMessage: null, welcomeEnabled: true }
        });
        if (!cfg.welcomeEnabled || !cfg.welcomeMessage || !String(cfg.welcomeMessage).trim()) return;
        await sendAutoReply(conversation, String(cfg.welcomeMessage).trim(), rabbitChannel, logger);
        logger.info(`👋 Welcome message sent to ${customer.phone} (first contact)`);
    } catch (error) {
        logger.error('First message welcome error', { error: error.message });
    }
}

async function checkAutoResponse(conversation, message, redisClient, rabbitChannel, logger) {
    try {
        const responses = await getActiveAutoResponses(redisClient);
        const messageText = (message.content || '').toLowerCase();
        const now = new Date();
        for (const rule of responses) {
            const keywords = (rule.keywords || '').split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
            if (keywords.length && keywords.some(keyword => messageText.includes(keyword))) {
                if (!matchesAutoResponseConditions(rule, conversation, now)) continue;
                await sendAutoReply(conversation, rule.response, rabbitChannel, logger);
                return true;
            }
        }
        return false;
    } catch (error) {
        logger.error('Auto-response error', { error: error.message });
        return false;
    }
}

async function sendAutoReply(conversation, responseText, rabbitChannel, logger, options = {}) {
    try {
        const customer = await Customer.findByPk(conversation.customerId);
        if (!customer) {
            logger.warn('sendAutoReply: customer not found', { conversationId: conversation.id });
            return null;
        }
        const toPhone = getSendTarget(customer.phone) || customer.phone;
        const isAI = !!options.isAI;
        const customerMessage = isAI ? AI_MESSAGE_PREFIX + responseText : responseText;
        const autoMsg = await Message.create({
            conversationId: conversation.id,
            customerId: customer.id,
            direction: 'outgoing',
            content: responseText,
            type: 'text',
            isAutoReply: true,
            status: 'pending',
            timestamp: new Date()
        });
        if (rabbitChannel && !isCloudApiConfigured()) {
            rabbitChannel.sendToQueue('outgoing_messages', Buffer.from(JSON.stringify({
                to: toPhone, message: customerMessage, conversationId: conversation.id, messageId: autoMsg.id
            })), { persistent: true });
        } else {
            try {
                await sendWhatsAppMessage({ to: toPhone, message: customerMessage }, { timeout: 10000 });
                await autoMsg.update({ status: 'sent' });
            } catch (err) {
                logger.error('Gateway send error', { error: err.message });
                await autoMsg.update({ status: 'failed' });
            }
        }
        const preview = (responseText || '').slice(0, 120);
        const now = new Date();
        const upd = { lastMessageAt: now, lastOutgoingMessageAt: now, lastMessagePreview: preview + ((responseText || '').length > 120 ? '…' : ''), unansweredAlertSentAt: null, escalatedAt: null, lastOutgoingIsAutoReply: true };
        if (!conversation.firstReplyAt) upd.firstReplyAt = now;
        await conversation.update(upd);
        logger.info(`🤖 Auto-reply sent to ${customer.phone}`);
        return autoMsg;
    } catch (error) {
        logger.error('Send auto-reply error', { error: error.message });
        return null;
    }
}

/**
 * اگر موضوع مکالمه عوض شده، به دپارتمان مناسب‌تر re-route کن
 */
async function tryRerouteIfTopicChanged(conversation, messageContent, customerId, logger) {
    try {
        const text = (messageContent || '').trim();
        if (text.length < 10) return;
        const departments = await Department.findAll({ where: { isActive: true } });
        const { department: smartDept, method, confidence } = await selectBestDepartment(
            departments,
            messageContent || '',
            { useAI: true }
        );
        if (!smartDept || confidence < 75) return;
        const currentDeptId = conversation.departmentId ? String(conversation.departmentId) : null;
        const newDeptId = String(smartDept.id);
        if (currentDeptId && currentDeptId === newDeptId) return;

        let previousAssigneeId = null;
        if (customerId) {
            const prevConv = await Conversation.findOne({
                where: { customerId, id: { [Op.ne]: conversation.id }, assignedTo: { [Op.ne]: null } },
                order: [['assignedAt', 'DESC']],
                attributes: ['assignedTo']
            });
            if (prevConv) previousAssigneeId = prevConv.assignedTo;
        }
        const users = await User.findAll({
            where: { departmentId: smartDept.id, isActive: true, role: { [Op.in]: ['agent', 'supervisor'] } },
            attributes: { include: ['status', 'settings'] },
            include: [{ model: Conversation, as: 'conversations', where: { status: { [Op.ne]: 'closed' } }, required: false }]
        });
        const selectedUser = selectBestUser(users, messageContent || '', { customerId, previousAssigneeId });
        if (selectedUser) {
            await conversation.update({
                departmentId: smartDept.id,
                assignedTo: selectedUser.id,
                assignedAt: new Date()
            });
            logger.info(`🔄 Re-routed to ${selectedUser.name} (${smartDept.name}) — topic change, confidence: ${confidence}%`);
            await sendDeptAssignedMessage(conversation, smartDept);
        }
    } catch (error) {
        logger.error('Re-route error', { error: error.message });
    }
}

async function autoAssignment(conversation, messageContent, customerId, logger) {
    try {
        const departments = await Department.findAll({ where: { isActive: true } });
        const { department: smartDept, method, confidence } = await selectBestDepartment(
            departments,
            messageContent || '',
            { useAI: true }
        );
        let assignedDepartment = smartDept;
        if (!assignedDepartment) {
            assignedDepartment = await Department.findOne({ where: { isDefault: true } });
        }
        if (assignedDepartment && method !== 'none') {
            logger.info(`🧠 Smart routing: ${assignedDepartment.name} (${method}, confidence: ${confidence}%)`);
        }
        if (assignedDepartment) {
            let previousAssigneeId = null;
            if (customerId) {
                const prevConv = await Conversation.findOne({
                    where: {
                        customerId,
                        id: { [Op.ne]: conversation.id },
                        assignedTo: { [Op.ne]: null }
                    },
                    order: [['assignedAt', 'DESC']],
                    attributes: ['assignedTo']
                });
                if (prevConv) previousAssigneeId = prevConv.assignedTo;
            }
            const users = await User.findAll({
                where: {
                    departmentId: assignedDepartment.id,
                    isActive: true,
                    role: { [Op.in]: ['agent', 'supervisor'] }
                },
                attributes: { include: ['status', 'settings'] },
                include: [{
                    model: Conversation,
                    as: 'conversations',
                    where: { status: { [Op.ne]: 'closed' } },
                    required: false
                }]
            });
            const selectedUser = selectBestUser(users, messageContent || '', {
                customerId,
                previousAssigneeId
            });
            if (selectedUser) {
                await conversation.update({
                    departmentId: assignedDepartment.id,
                    assignedTo: selectedUser.id,
                    assignedAt: new Date()
                });
                logger.info(`👤 Assigned to ${selectedUser.name} (${assignedDepartment.name})`);
                await sendDeptAssignedMessage(conversation, assignedDepartment);
            }
        }
    } catch (error) {
        logger.error('Auto-assignment error', { error: error.message });
    }
}

/**
 * پردازش پیام ورودی — باید io, rabbitChannel, redisClient, logger پاس داده شوند
 */
async function processIncomingMessage(messageData, { io, rabbitChannel, redisClient, logger }) {
    try {
        if (messageData.isStatus) return;
        const { body, contact, from, to, timestamp, hasMedia, media, chat } = messageData;
        const isFromMe = !!messageData.fromMe;
        const isGroup = !!(chat && chat.isGroup);

        // برای پیام‌های ارسالی از موبایل: شماره مشتری در to است نه from
        let rawPhone;
        if (isFromMe) {
            rawPhone = (contact && contact.number != null) ? contact.number : to;
        } else {
            rawPhone = isGroup ? (chat?.id || from) : ((contact && contact.number != null) ? contact.number : from);
        }
        if (rawPhone == null || rawPhone === '') return;
        const phone = isGroup ? String(rawPhone).trim() : (normalizePhone(rawPhone) || normalizePhone(isFromMe ? to : from));
        if (!phone) return;
        const rawType = (messageData.type || '').toLowerCase();
        if (rawType === 'reaction' || rawType === 'read_receipt' || rawType === 'delivery' || rawType === 'update') return;
        const hasText = body != null && String(body).trim().length > 0;
        const hasUsableMedia = hasMedia && media && (media.url || (media.filename && String(media.filename).trim()) || (media.caption && String(media.caption).trim()) || media.data);
        if (!hasText && !hasUsableMedia) return;

        let resolvedMedia = media || null;
        let msgType = (messageData.type || 'text').toLowerCase();
        if (msgType === 'ptt') msgType = 'audio';
        if (hasMedia && media) {
            if (media.url && (String(media.url).trim().startsWith('http://') || String(media.url).trim().startsWith('https://'))) {
                resolvedMedia = await resolveIncomingMedia(media, logger);
            } else if (media.data) {
                resolvedMedia = await resolveIncomingMediaFromBase64(media, logger);
            }
            if (resolvedMedia && (resolvedMedia.url || resolvedMedia.filename || resolvedMedia.data)) msgType = inferMessageTypeFromMedia(resolvedMedia);
        }
        if (msgType === 'ptt') msgType = 'audio';

        const groupNameFromChat = isGroup ? (chat?.name || chat?.subject || chat?.formattedTitle || '').toString().trim() : '';
        const contactName = isGroup ? (groupNameFromChat || `گروه ${phone}`) : ((contact && (contact.name || contact.pushname)) || `مشتری ${phone}`);
        let profilePic = isGroup ? null : (contact && contact.profilePicUrl) || null;
        if (!isGroup && !profilePic) {
            profilePic = await tryFetchProfilePicFromGateway(phone, logger);
        }

        let customer;
        let customerCreated = false;
        try {
            [customer, customerCreated] = await Customer.findOrCreate({
                where: { phone },
                defaults: { name: contactName, profilePic: profilePic, source: 'whatsapp' }
            });
        } catch (e) {
            if (e.name === 'SequelizeUniqueConstraintError') {
                customer = await Customer.findOne({ where: { phone } });
                customerCreated = false;
                if (!customer) throw e;
            } else throw e;
        }

        if (customerCreated) {
            logger.info(isGroup ? `✨ New group conversation: ${groupNameFromChat || phone}` : `✨ New customer created: ${phone}`);
            if (!isGroup && profilePic) {
                try {
                    const persisted = await persistRemoteAvatarIfNeeded(customer.id, profilePic);
                    if (persisted && persisted !== customer.profilePic) await customer.update({ profilePic: persisted });
                } catch (e) {
                    logger.warn('Avatar persist (new customer)', { err: String(e && e.message ? e.message : e) });
                }
            }
        } else {
            const tsContact = timestamp ? new Date((timestamp < 1e12 ? timestamp * 1000 : timestamp)) : new Date();
            const updatedContactName = isGroup ? groupNameFromChat : (contact && (contact.name || contact.pushname)) || null;
            const updates = { lastContactAt: tsContact };
            if (updatedContactName && String(updatedContactName).trim() && String(customer.name || '').trim() !== String(updatedContactName).trim()) updates.name = String(updatedContactName).trim();
            if (!isGroup && profilePic && profilePic !== customer.profilePic) updates.profilePic = profilePic;
            if (updates.profilePic) {
                try {
                    const persisted = await persistRemoteAvatarIfNeeded(customer.id, updates.profilePic);
                    if (persisted) updates.profilePic = persisted;
                } catch (e) {
                    logger.warn('Avatar persist', { err: String(e && e.message ? e.message : e) });
                }
            }
            await customer.update(updates);
        }

        let conversation = await Conversation.findOne({
            where: { customerId: customer.id, status: { [Op.ne]: 'closed' } }
        });

        if (!conversation) {
            const t = await sequelize.transaction();
            try {
                conversation = await Conversation.findOne({
                    where: { customerId: customer.id, status: { [Op.ne]: 'closed' } },
                    transaction: t,
                    lock: t.LOCK.UPDATE
                });
                if (!conversation) {
                    conversation = await Conversation.create({
                        customerId: customer.id,
                        status: 'open',
                        priority: 'normal',
                        source: 'whatsapp',
                        metadata: isGroup ? { isGroup: true, groupName: groupNameFromChat || null } : {}
                    }, { transaction: t });
                }
                await t.commit();
            } catch (txErr) {
                await t.rollback();
                conversation = await Conversation.findOne({
                    where: { customerId: customer.id, status: { [Op.ne]: 'closed' } }
                });
                if (!conversation) throw txErr;
            }
        } else if (isGroup && groupNameFromChat) {
            const meta = conversation.metadata || {};
            if (meta.groupName !== groupNameFromChat) {
                await conversation.update({ metadata: { ...meta, isGroup: true, groupName: groupNameFromChat } });
            }
        }

        const ts = timestamp ? new Date((timestamp < 1e12 ? timestamp * 1000 : timestamp)) : new Date();
        const previewText = body || (resolvedMedia && (resolvedMedia.filename || resolvedMedia.caption)) || '';
        let preview = previewText.slice(0, 120);
        if (previewText.length > 120) preview += '…';

        const prevLastIncoming = !isFromMe && conversation.lastIncomingMessageAt ? new Date(conversation.lastIncomingMessageAt) : null;
        const convUpdate = { lastMessageAt: ts, lastMessagePreview: preview };
        if (isFromMe) {
            convUpdate.lastOutgoingMessageAt = ts;
            if (!conversation.firstReplyAt) convUpdate.firstReplyAt = ts;
        } else {
            convUpdate.lastIncomingMessageAt = ts;
            convUpdate.unreadCount = sequelize.literal('COALESCE("unreadCount", 0) + 1');
        }
        await conversation.update(convUpdate);

        const msgMetadata = isGroup && (messageData.author || messageData.authorName)
            ? { senderId: messageData.author || null, senderName: messageData.authorName || (messageData.author && contact && (contact.name || contact.pushname)) || null }
            : {};

        if (isFromMe && body) {
            const bodyStr = String(body).trim();
            const contentToMatch = bodyStr.startsWith(AI_MESSAGE_PREFIX)
                ? bodyStr.slice(AI_MESSAGE_PREFIX.length).trim()
                : (bodyStr.startsWith('AI KAYA: ') ? bodyStr.slice(9).trim() : bodyStr);
            const recent = await Message.findOne({
                where: {
                    conversationId: conversation.id,
                    direction: 'outgoing',
                    isAutoReply: true
                },
                order: [['createdAt', 'DESC']]
            });
            const ageMs = recent ? (Date.now() - new Date(recent.createdAt).getTime()) : Infinity;
            if (recent && ageMs < 120000) {
                const storedContent = String(recent.content || '').trim();
                const match = storedContent === contentToMatch || bodyStr === storedContent
                    || (bodyStr.startsWith(AI_MESSAGE_PREFIX) && storedContent === contentToMatch)
                    || (bodyStr.startsWith('AI KAYA: ') && storedContent === contentToMatch);
                if (match) {
                    await recent.update({ whatsappId: messageData.id || null, status: 'sent' });
                    return;
                }
            }
        }

        const newMessage = await Message.create({
            conversationId: conversation.id,
            customerId: customer.id,
            whatsappId: messageData.id || null,
            direction: isFromMe ? 'outgoing' : 'incoming',
            content: body || (resolvedMedia && (resolvedMedia.filename || resolvedMedia.caption)) || '',
            type: msgType,
            hasMedia: !!(hasMedia && resolvedMedia),
            mediaData: resolvedMedia || null,
            timestamp: ts,
            metadata: Object.keys(msgMetadata).length ? msgMetadata : {}
        });

        // ذخیره خودکار فایل دریافتی در آرشیو مشتری
        if (hasMedia && resolvedMedia && customer.id) {
            try {
                const { CustomerDocument } = require('../models');
                if (CustomerDocument) {
                    const mime = resolvedMedia.mimetype || '';
                    let fType = 'other';
                    if (mime.startsWith('image/')) fType = 'image';
                    else if (mime.startsWith('video/')) fType = 'video';
                    else if (mime.startsWith('audio/')) fType = 'audio';
                    else if (mime.includes('pdf') || mime.includes('word') || mime.includes('excel') || mime.includes('text') || mime.includes('spreadsheet') || mime.includes('presentation')) fType = 'document';
                    await CustomerDocument.create({
                        customerId: customer.id,
                        title: resolvedMedia.filename || resolvedMedia.caption || 'فایل دریافتی',
                        category: 'media',
                        filePath: resolvedMedia.url || resolvedMedia.filename || '',
                        fileName: resolvedMedia.filename || 'file',
                        mimeType: mime,
                        fileType: fType,
                        source: 'conversation',
                        messageId: newMessage.id,
                        conversationId: conversation.id
                    });
                }
            } catch (_) {}
        }

        if (!isGroup && !isFromMe && customerCreated) {
            await sendFirstMessageWelcome(conversation, customer, rabbitChannel, logger);
        }

        if (!isGroup && !isFromMe) {
            if (!conversation.assignedTo) {
                await autoAssignment(conversation, body || '', customer.id, logger);
            } else {
                await tryRerouteIfTopicChanged(conversation, body || '', customer.id, logger);
            }
            await conversation.reload({ include: [{ model: Department, as: 'department', required: false }] });
        }

        const autoResponseSent = (isGroup || isFromMe) ? false : await checkAutoResponse(conversation, newMessage, redisClient, rabbitChannel, logger);

        if (!isGroup && !isFromMe && !autoResponseSent && hasText) {
            const { generateAIResponse, isAIAnswerEnabled, isSimpleFactualQuestion } = require('./aiResponseService');
            let aiEnabled = await isAIAnswerEnabled();
            if (!aiEnabled) logger.info('AI skipped: کلید OpenAI تنظیم نشده یا AI_ANSWER_ENABLED=false');
            try {
                const wc = await getCachedWhatsappConfig();
                if (wc && wc.aiAnswerEnabled === false) {
                    aiEnabled = false;
                    logger.info('AI skipped: disabled in WhatsappConfig panel');
                }
                if (aiEnabled && conversation.assignedTo) {
                    const lastHuman = await Message.findOne({
                        where: { conversationId: conversation.id, direction: 'outgoing', userId: { [Op.ne]: null } },
                        order: [['timestamp', 'DESC']],
                        attributes: ['timestamp']
                    });
                    const alertMin = (wc && (wc.alertUnansweredAfterMinutes ?? 5)) || 5;
                    const now = new Date();
                    const humanRepliedAfterLastIncoming = lastHuman && prevLastIncoming && lastHuman.timestamp >= prevLastIncoming;
                    const withinWaitWindow = prevLastIncoming && (now - prevLastIncoming) < alertMin * 60000;
                    const isSimpleQuestion = isSimpleFactualQuestion(body || '');

                    if (humanRepliedAfterLastIncoming) {
                        aiEnabled = false;
                        logger.info('AI skipped: human already replied to customer, assigned conversation');
                    } else if (withinWaitWindow && !isSimpleQuestion) {
                        aiEnabled = false;
                        logger.info('AI skipped: assigned, waiting for human (re-enter after ' + alertMin + ' min)');
                    } else if (withinWaitWindow && isSimpleQuestion) {
                        logger.info('AI allowed: simple factual question (price/address/docs) while assigned');
                    }
                }
            } catch (e) {
                logger.warn('WhatsappConfig aiAnswerEnabled check failed:', e?.message);
            }
            if (aiEnabled) {
                const lastAutoReply = await Message.findOne({
                    where: { conversationId: conversation.id, direction: 'outgoing', isAutoReply: true },
                    order: [['timestamp', 'DESC']],
                    attributes: ['timestamp']
                });
                const AI_THROTTLE_MIN = 2;
                if (lastAutoReply && lastAutoReply.timestamp) {
                    const minsSince = (Date.now() - new Date(lastAutoReply.timestamp).getTime()) / 60000;
                    if (minsSince < AI_THROTTLE_MIN) {
                        aiEnabled = false;
                        logger.info('AI skipped: throttle — auto-reply sent ' + minsSince.toFixed(1) + ' min ago');
                    }
                }
            }
            if (aiEnabled) {
                const convWithDept = conversation.department !== undefined ? conversation : await Conversation.findByPk(conversation.id, {
                    include: [{ model: Department, as: 'department', required: false }]
                });
                const history = await Message.findAll({
                    where: { conversationId: conversation.id },
                    order: [['timestamp', 'ASC']],
                    limit: 12,
                    attributes: ['direction', 'content']
                });
                const aiReply = await generateAIResponse({
                    conversation: convWithDept,
                    customer,
                    incomingMessage: body || '',
                    messageHistory: history,
                    department: convWithDept?.department || null
                });
                if (aiReply) {
                    const autoMsg = await sendAutoReply(conversation, aiReply, rabbitChannel, logger, { isAI: true });
                    if (autoMsg) {
                        io.emit('new_message', {
                            conversationId: conversation.id,
                            customerId: customer.id,
                            message: autoMsg,
                            customer: { id: customer.id, name: customer.name, phone: customer.phone, profilePic: customer.profilePic }
                        });
                    }
                    logger.info(`🤖 AI reply sent to ${customer.phone}`);
                } else {
                    logger.warn('AI returned no reply', { phone: customer.phone, incomingPreview: (body || '').slice(0, 50) });
                }
            }
        }

        io.emit('new_message', {
            conversationId: conversation.id,
            customerId: customer.id,
            message: newMessage,
            customer: { id: customer.id, name: customer.name, phone: customer.phone, profilePic: customer.profilePic }
        });

        if (conversation.assignedTo) {
            io.to(`user_${conversation.assignedTo}`).emit('assigned_message', {
                conversationId: conversation.id,
                message: newMessage
            });
        }

        if (mongoose.connection.readyState === 1 && mongoose.models.MessageLog) {
            const tsLog = timestamp != null ? (timestamp < 1e12 ? timestamp * 1000 : timestamp) : Date.now();
            await mongoose.model('MessageLog').create({
                conversationId: conversation.id,
                customerId: customer.id,
                messageId: newMessage.id,
                content: body,
                timestamp: new Date(tsLog),
                metadata: messageData
            });
        }

        logger.info(`📩 Message processed: ${phone}`);
        notifySystemEvent('message', 'Incoming Message Processed', {
            phone,
            conversationId: conversation.id,
            customerId: customer.id,
            type: msgType
        }).catch(() => {});
    } catch (error) {
        logger.error('Error processing incoming message:', {
            error: error.message,
            stack: error.stack,
            from: messageData?.from,
            type: messageData?.type
        });
        notifySystemEvent('error', 'Incoming Message Error', {
            from: messageData?.from || null,
            type: messageData?.type || null,
            error: error.message || String(error)
        }).catch(() => {});
        throw error;
    }
}

module.exports = {
    processIncomingMessage,
    sendAutoReply,
    maybeSendEmployeeIntro,
};

/**
 * پردازش پیام‌های ورودی واتساپ — خوش‌آمدگویی، auto-response، AI، تخصیص خودکار
 */
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const axios = require('axios');
const mongoose = require('mongoose');
const models = require('../models');
const {
    sequelize,
    Customer,
    Conversation,
    Message,
    User,
    Department,
    AutoResponse,
    WhatsappConfig,
} = models;
const { Op } = require('sequelize');
const {
    normalizePhone,
    getSendTarget,
    isLikelyWhatsAppLid,
    extractDigits,
    isGroupJid,
} = require('../lib/phoneUtils');
const { sendWhatsAppMessage, isCloudApiConfigured } = require('../lib/gatewayClient');
const { gatewayGet } = require('../lib/gatewayClient');
const { sendDeptAssignedMessage, maybeSendEmployeeIntro } = require('./autoMessages');
const { selectBestDepartment, selectBestUser } = require('./intelligentDepartmentRouter');
const {
    persistRemoteAvatarIfNeeded,
    digitsOnlyChatPhone,
    maybeRefreshWhatsappCustomerAvatar,
} = require('../lib/customerAvatar');
const { notifySystemEvent } = require('./systemEventNotifier');
const {
    resolveMobileWhatsappUser,
    isCrmPanelOutboundMessage,
    loadMobileWhatsappUser,
    applyMobileWhatsappSenderToMessages,
    parseMsgMetadata,
} = require('../lib/resolveMobileWhatsappUser');
const { publicCustomerSocketPayload } = require('../lib/customerPhoneVisibility');
const { emitNewMessageToAuthorized } = require('../lib/conversationRealtime');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir))
    try {
        fs.mkdirSync(uploadsDir, { recursive: true });
    } catch (_) {}

function buildSafeUploadName(suggestedName, ext) {
    let stem = String(suggestedName || 'file')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .slice(0, 100);
    const normalizedExt = ext && ext.startsWith('.') ? ext : ext ? '.' + ext : '';
    if (normalizedExt && !stem.toLowerCase().endsWith(normalizedExt.toLowerCase())) {
        stem += normalizedExt;
    } else if (!normalizedExt && !path.extname(stem)) {
        stem += '.bin';
    }
    return Date.now() + '-' + stem;
}

async function normalizeVoiceUploadForPlayback(filePath, mimetype, filename, logger) {
    try {
        const { ensureVoiceFormat } = require('../lib/audioConverter');
        const converted = await ensureVoiceFormat(filePath, mimetype, filename);
        return {
            url: '/uploads/' + path.basename(converted.filePath),
            filename: converted.filename,
            mimetype: 'audio/ogg',
        };
    } catch (err) {
        if (logger)
            logger.warn('Voice normalize for CRM playback failed', {
                error: err.message,
                file: path.basename(filePath),
            });
        return null;
    }
}

function isVoiceLikeMedia(media, isPtt) {
    if (isPtt) return true;
    const mime = String(media?.mimetype || '')
        .split(';')[0]
        .trim()
        .toLowerCase();
    const name = String(media?.filename || media?.caption || '').toLowerCase();
    return mime.startsWith('audio/') || /\.(ogg|opus|oga|webm|m4a|mp3|wav|aac)$/i.test(name);
}

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

async function tryFetchProfilePicFromGateway(phone, logger, extraIds) {
    const raw = String(phone || '').trim();
    const p = /@g\.us$/i.test(raw) ? raw : digitsOnlyChatPhone(raw);
    if (!p) return null;
    if (!/@g\.us$/i.test(p) && p.length < 8) return null;
    const now = Date.now();
    const cached = _avatarLookupCache.get(p);
    if (cached && now - cached.at < AVATAR_LOOKUP_TTL_MS) {
        return cached.url || null;
    }
    const ids = [p];
    if (Array.isArray(extraIds)) {
        for (const x of extraIds) {
            const s = String(x || '').trim();
            if (s && !ids.includes(s)) ids.push(s);
        }
    }
    let url = '';
    try {
        for (const id of ids) {
            const qs =
                /@g\.us$/i.test(id) || /@lid$/i.test(id) || /@/.test(id)
                    ? 'chatId=' + encodeURIComponent(id)
                    : 'phone=' + encodeURIComponent(id);
            const res = await gatewayGet('/api/contacts/profile-pic?' + qs, { timeout: 4500 });
            url =
                res && res.data && res.data.profilePicUrl
                    ? String(res.data.profilePicUrl).trim()
                    : '';
            if (url) break;
        }
        _avatarLookupCache.set(p, {
            at: url ? now : now - AVATAR_LOOKUP_TTL_MS + 10000,
            url: url || null,
        });
        return url || null;
    } catch (err) {
        _avatarLookupCache.set(p, { at: now - AVATAR_LOOKUP_TTL_MS + 10000, url: null });
        logger.warn('profile pic lookup failed', { phone: p.slice(-6), error: err?.message });
        return null;
    }
}

async function getCachedWhatsappConfig() {
    const now = Date.now();
    if (_wcCache && now - _wcCacheAt < WC_CACHE_TTL_MS) return _wcCache;
    const [wc] = await WhatsappConfig.findOrCreate({
        where: { id: 'default' },
        defaults: { aiAnswerEnabled: true },
    });
    _wcCache = wc;
    _wcCacheAt = now;
    return wc;
}

function asJidString(val) {
    if (val == null || val === '') return '';
    if (typeof val === 'string') return val.trim();
    if (typeof val === 'object') {
        if (val._serialized) return String(val._serialized).trim();
        if (val.user && val.server) return `${val.user}@${val.server}`;
        if (val.id) return asJidString(val.id);
    }
    return String(val).trim();
}

function realPhoneFromValue(raw) {
    const s = asJidString(raw);
    if (!s || isGroupJid(s)) return '';
    if (isLikelyWhatsAppLid(s) || /@lid$/i.test(s)) return '';
    return normalizePhone(s) || '';
}

function lidDigitsFromValue(raw) {
    const s = asJidString(raw);
    if (!s || isGroupJid(s)) return '';
    if (isLikelyWhatsAppLid(s) || /@lid$/i.test(s)) return extractDigits(s) || '';
    return '';
}

function collectIncomingIdentityHints(messageData, isFromMe) {
    const contact = messageData.contact || {};
    const chat = messageData.chat || {};
    // فقط طرف مقابل — to/from خودِ خط را مشتری حساب نکن
    const peer = isFromMe ? messageData.to : messageData.from;
    const hints = [chat.id, peer, contact.lid];
    let phone = '';
    let lid = '';
    for (const hint of hints) {
        if (!phone) phone = realPhoneFromValue(hint);
        if (!lid) lid = lidDigitsFromValue(hint);
        if (phone && lid) break;
    }
    // contact.number را وقتی LID داریم نادیده بگیر — اغلب شمارهٔ خودِ خط است نه مشتری
    if (!phone && !lid) phone = realPhoneFromValue(contact.number);
    return { phone, lid };
}

function isSameWaDigits(a, b) {
    const x = extractDigits(a);
    const y = extractDigits(b);
    if (!x || !y || x.length < 8 || y.length < 8) return false;
    return x === y || x.endsWith(y) || y.endsWith(x);
}

function placeholderForIncomingMedia(rawType) {
    const t = String(rawType || '').toLowerCase();
    if (t === 'image') return '📷 تصویر';
    if (t === 'video') return '🎬 ویدیو';
    if (t === 'ptt' || t === 'audio') return '🎤 پیام صوتی';
    if (t === 'document') return '📄 فایل';
    if (t === 'sticker') return '🌟 استیکر';
    return 'پیام رسانه‌ای';
}

function isIncomingMediaType(rawType, hasMedia) {
    const t = String(rawType || '').toLowerCase();
    return (
        !!hasMedia ||
        t === 'image' ||
        t === 'video' ||
        t === 'ptt' ||
        t === 'audio' ||
        t === 'document' ||
        t === 'sticker'
    );
}

async function pickPreferredIncomingCustomer(candidates) {
    const list = [];
    const seen = new Set();
    for (const c of candidates || []) {
        if (!c || !c.id || seen.has(c.id)) continue;
        seen.add(c.id);
        list.push(c);
    }
    if (!list.length) return null;
    if (list.length === 1) return list[0];
    const convs = await Conversation.findAll({
        where: {
            customerId: { [Op.in]: list.map((c) => c.id) },
            status: { [Op.ne]: 'closed' },
        },
        order: [
            ['lastMessageAt', 'DESC'],
            ['updatedAt', 'DESC'],
        ],
        limit: 8,
    });
    const best = convs.find((c) => !c.isHiddenFromStaff) || convs[0];
    if (best) return list.find((c) => c.id === best.customerId) || list[0];
    return list[0];
}

async function findCustomerByStoredLid(lidDigits) {
    if (!lidDigits) return null;
    const lid = String(lidDigits);
    const byPhone = await Customer.findOne({ where: { phone: lid } });
    if (byPhone) return byPhone;
    let rows = [];
    try {
        const dialect = sequelize.getDialect();
        if (dialect === 'postgres') {
            rows = await Customer.findAll({
                where: sequelize.where(sequelize.json('customFields.whatsappLid'), lid),
                limit: 8,
            });
        } else {
            rows = await Customer.findAll({
                where: sequelize.where(
                    sequelize.literal(`json_extract("customFields", '$.whatsappLid')`),
                    lid
                ),
                limit: 8,
            });
        }
    } catch (_) {
        rows = [];
    }
    const hit = rows.find((c) => String((c.customFields || {}).whatsappLid || '') === lid);
    if (hit) return hit;
    try {
        const conv = await Conversation.findOne({
            where: sequelize.where(sequelize.cast(sequelize.col('metadata'), 'CHAR'), {
                [Op.like]: `%"whatsappLid":"${lid}"%`,
            }),
            include: [{ model: Customer, as: 'customer', required: true }],
            order: [['lastMessageAt', 'DESC']],
        });
        if (conv && conv.customer && String((conv.metadata || {}).whatsappLid || '') === lid) {
            return conv.customer;
        }
    } catch (_) {}
    return null;
}

async function rememberCustomerLid(customer, lidDigits, conversation) {
    if (!customer || !lidDigits) return;
    const lid = String(lidDigits);
    const cf = { ...(customer.customFields || {}) };
    if (String(cf.whatsappLid || '') !== lid) {
        cf.whatsappLid = lid;
        await customer.update({ customFields: cf }).catch(() => {});
        customer.customFields = cf;
    }
    if (conversation) {
        const meta = { ...(conversation.metadata || {}) };
        if (String(meta.whatsappLid || '') !== lid) {
            meta.whatsappLid = lid;
            await conversation.update({ metadata: meta }).catch(() => {});
            conversation.metadata = meta;
        }
    }
}

async function resolveIncomingMedia(media, logger) {
    if (!media || !media.url) return media;
    const url = (media.url || '').trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (url.startsWith('/') && (url.startsWith('/uploads/') || url.includes('uploads')))
            return {
                url: url,
                filename: media.filename || media.caption,
                mimetype: media.mimetype,
            };
        return media;
    }
    try {
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 30000,
            maxContentLength: 20 * 1024 * 1024,
            maxRedirects: 5,
            headers: {
                'User-Agent': 'fxguard-kaya-backend/1.0',
                Accept: 'image/*,video/*,audio/*,*/*',
            },
        });
        if (!res.data || (res.status !== 200 && res.status !== 206))
            throw new Error('Bad response ' + res.status);
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
        const safeName = buildSafeUploadName(suggestedName, ext);
        const filePath = path.resolve(uploadsDir, safeName);
        const normalizedUploadsDir = path.resolve(uploadsDir);
        if (
            !filePath.startsWith(normalizedUploadsDir + path.sep) &&
            filePath !== normalizedUploadsDir
        ) {
            throw new Error('Path traversal detected in media filename');
        }
        await fsPromises.writeFile(filePath, buf);
        return {
            url: '/uploads/' + safeName,
            filename: media.filename || suggestedName,
            mimetype: media.mimetype || ct || null,
        };
    } catch (err) {
        logger.warn('resolveIncomingMedia download failed', {
            url: url.slice(0, 80),
            error: err.message,
        });
        return {
            url: null,
            filename: media.filename || media.caption || 'file',
            mimetype: media.mimetype,
        };
    }
}

async function resolveIncomingMediaFromBase64(media, logger, options = {}) {
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
        const safeName = buildSafeUploadName(suggestedName, ext);
        const filePath = path.resolve(uploadsDir, safeName);
        const normalizedUploadsDir = path.resolve(uploadsDir);
        if (
            !filePath.startsWith(normalizedUploadsDir + path.sep) &&
            filePath !== normalizedUploadsDir
        ) {
            throw new Error('Path traversal detected in media filename');
        }
        await fsPromises.writeFile(filePath, buf);
        if (isVoiceLikeMedia(media, options.isPtt)) {
            const normalized = await normalizeVoiceUploadForPlayback(
                filePath,
                media.mimetype || ct,
                suggestedName,
                logger
            );
            if (normalized) return normalized;
        }
        return {
            url: '/uploads/' + safeName,
            filename: media.filename || suggestedName,
            mimetype: media.mimetype || ct || null,
        };
    } catch (err) {
        logger.warn('resolveIncomingMediaFromBase64 failed', { error: err.message });
        return media;
    }
}

function inferMessageTypeFromMedia(media) {
    if (!media) return 'text';
    const mime = (media.mimetype || '').toLowerCase();
    const name = (media.filename || media.caption || '').toLowerCase();
    if (mime.startsWith('image/') || mime === 'image/webp' || /\.(jpe?g|png|gif|webp|bmp)$/i.test(name))
        return 'image';
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
        order: [
            ['priority', 'DESC'],
            ['createdAt', 'ASC'],
        ],
    });
    try {
        if (redisClient && typeof redisClient.setEx === 'function') {
            await redisClient
                .setEx(AUTO_RESPONSE_CACHE_KEY, AUTO_RESPONSE_CACHE_TTL, JSON.stringify(responses))
                .catch(() => {});
        }
    } catch (_) {}
    return responses;
}

async function sendFirstMessageWelcome(conversation, customer, rabbitChannel, logger) {
    try {
        const [cfg] = await WhatsappConfig.findOrCreate({
            where: { id: 'default' },
            defaults: { welcomeMessage: null, welcomeEnabled: true },
        });
        if (!cfg.welcomeEnabled || !cfg.welcomeMessage || !String(cfg.welcomeMessage).trim())
            return;
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
            const keywords = (rule.keywords || '')
                .split(',')
                .map((k) => k.trim().toLowerCase())
                .filter(Boolean);
            if (keywords.length && keywords.some((keyword) => messageText.includes(keyword))) {
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
            timestamp: new Date(),
        });
        if (rabbitChannel && !isCloudApiConfigured()) {
            rabbitChannel.sendToQueue(
                'outgoing_messages',
                Buffer.from(
                    JSON.stringify({
                        to: toPhone,
                        message: customerMessage,
                        conversationId: conversation.id,
                        messageId: autoMsg.id,
                    })
                ),
                { persistent: true }
            );
        } else {
            try {
                await sendWhatsAppMessage(
                    { to: toPhone, message: customerMessage },
                    { timeout: 10000 }
                );
                await autoMsg.update({ status: 'sent' });
            } catch (err) {
                logger.error('Gateway send error', { error: err.message });
                await autoMsg.update({ status: 'failed' });
            }
        }
        const preview = (responseText || '').slice(0, 120);
        const now = new Date();
        const upd = {
            lastMessageAt: now,
            lastOutgoingMessageAt: now,
            lastMessagePreview: preview + ((responseText || '').length > 120 ? '…' : ''),
            unansweredAlertSentAt: null,
            escalatedAt: null,
            lastOutgoingIsAutoReply: true,
        };
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
        const { department: smartDept, confidence } = await selectBestDepartment(
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
                where: {
                    customerId,
                    id: { [Op.ne]: conversation.id },
                    assignedTo: { [Op.ne]: null },
                },
                order: [['assignedAt', 'DESC']],
                attributes: ['assignedTo'],
            });
            if (prevConv) previousAssigneeId = prevConv.assignedTo;
        }
        const users = await User.findAll({
            where: {
                departmentId: smartDept.id,
                isActive: true,
                role: { [Op.in]: ['agent', 'supervisor'] },
            },
            attributes: { include: ['status', 'settings'] },
            include: [
                {
                    model: Conversation,
                    as: 'conversations',
                    where: { status: { [Op.ne]: 'closed' } },
                    required: false,
                },
            ],
        });
        const selectedUser = selectBestUser(users, messageContent || '', {
            customerId,
            previousAssigneeId,
        });
        if (selectedUser) {
            await conversation.update({
                departmentId: smartDept.id,
                assignedTo: selectedUser.id,
                assignedAt: new Date(),
            });
            logger.info(
                `🔄 Re-routed to ${selectedUser.name} (${smartDept.name}) — topic change, confidence: ${confidence}%`
            );
            await sendDeptAssignedMessage(conversation, smartDept);
        }
    } catch (error) {
        logger.error('Re-route error', { error: error.message });
    }
}

async function autoAssignment(conversation, messageContent, customerId, logger) {
    try {
        const departments = await Department.findAll({ where: { isActive: true } });
        const {
            department: smartDept,
            method,
            confidence,
        } = await selectBestDepartment(departments, messageContent || '', { useAI: true });
        let assignedDepartment = smartDept;
        if (!assignedDepartment) {
            assignedDepartment = await Department.findOne({ where: { isDefault: true } });
        }
        if (assignedDepartment && method !== 'none') {
            logger.info(
                `🧠 Smart routing: ${assignedDepartment.name} (${method}, confidence: ${confidence}%)`
            );
        }
        if (assignedDepartment) {
            let previousAssigneeId = null;
            if (customerId) {
                const prevConv = await Conversation.findOne({
                    where: {
                        customerId,
                        id: { [Op.ne]: conversation.id },
                        assignedTo: { [Op.ne]: null },
                    },
                    order: [['assignedAt', 'DESC']],
                    attributes: ['assignedTo'],
                });
                if (prevConv) previousAssigneeId = prevConv.assignedTo;
            }
            const users = await User.findAll({
                where: {
                    departmentId: assignedDepartment.id,
                    isActive: true,
                    role: { [Op.in]: ['agent', 'supervisor'] },
                },
                attributes: { include: ['status', 'settings'] },
                include: [
                    {
                        model: Conversation,
                        as: 'conversations',
                        where: { status: { [Op.ne]: 'closed' } },
                        required: false,
                    },
                ],
            });
            const selectedUser = selectBestUser(users, messageContent || '', {
                customerId,
                previousAssigneeId,
            });
            if (selectedUser) {
                await conversation.update({
                    departmentId: assignedDepartment.id,
                    assignedTo: selectedUser.id,
                    assignedAt: new Date(),
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
        const { contact, from, to, timestamp, hasMedia, media, chat } = messageData;
        let { body } = messageData;
        const isFromMe = !!messageData.fromMe;
        const groupChatId =
            [chat && chat.id, from, to]
                .map((v) => (v == null ? '' : String(v).trim()))
                .find((v) => isGroupJid(v)) || '';
        const isGroup = !!(chat && chat.isGroup) || !!groupChatId;

        // گروه: همیشه شناسهٔ گروه — حتی اگر پیام fromMe باشد (شمارهٔ خودِ خط را به‌جای گروه نگذار)
        let rawPhone;
        let incomingLid = '';
        if (isGroup) {
            rawPhone = groupChatId || (chat && chat.id) || (isFromMe ? to : from);
        } else {
            const identity = collectIncomingIdentityHints(messageData, isFromMe);
            incomingLid = identity.lid || '';
            rawPhone = identity.phone || identity.lid || (isFromMe ? to : from);
        }
        if (rawPhone == null || rawPhone === '') return;
        let phone;
        if (isGroup) {
            phone = String(rawPhone).trim();
        } else if (isLikelyWhatsAppLid(rawPhone) || /@lid$/i.test(String(rawPhone))) {
            const lidDigits = extractDigits(rawPhone);
            phone = lidDigits || String(rawPhone).trim();
            if (!incomingLid) incomingLid = lidDigits || '';
        } else {
            phone = normalizePhone(rawPhone) || normalizePhone(isFromMe ? to : from);
        }
        if (!phone) return;

        let linkedGw = null;
        let lockdownAt = null;
        try {
            const { WhatsappConnection } = require('../models');
            const { normalizeLinkedNumber } = require('./legacyCrmLockdown');
            const row = await WhatsappConnection.findByPk('default');
            linkedGw = normalizeLinkedNumber(row?.lastLinkedGatewayNumber) || null;
            lockdownAt = row?.legacyLockdownAt ? new Date(row.legacyLockdownAt) : null;
        } catch (_) {}

        if (!isGroup && incomingLid && linkedGw && isSameWaDigits(phone, linkedGw)) {
            phone = incomingLid;
        }
        const rawType = (messageData.type || '').toLowerCase();
        if (
            rawType === 'reaction' ||
            rawType === 'read_receipt' ||
            rawType === 'delivery' ||
            rawType === 'update'
        )
            return;
        const hasText = body != null && String(body).trim().length > 0;
        const hasUsableMedia =
            hasMedia &&
            media &&
            (media.url ||
                (media.filename && String(media.filename).trim()) ||
                (media.caption && String(media.caption).trim()) ||
                media.data);
        const isGroupSystemEvent =
            isGroup &&
            (rawType === 'gp2' ||
                rawType === 'group_notification' ||
                rawType === 'notification' ||
                rawType === 'notification_template' ||
                rawType === 'groups_v4_invite');
        if (!hasText && !hasUsableMedia) {
            if (isIncomingMediaType(rawType, hasMedia)) {
                body = placeholderForIncomingMedia(rawType);
            } else if (!isGroupSystemEvent) {
                return;
            } else {
                const joinName = (
                    (chat && (chat.name || chat.subject || chat.formattedTitle)) ||
                    ''
                )
                    .toString()
                    .trim();
                body = joinName ? `فعالیت در گروه «${joinName}»` : 'فعالیت در گروه واتساپ';
            }
        }

        const waMsgId = messageData.id ? String(messageData.id).trim() : null;
        if (waMsgId) {
            if (redisClient && !redisClient.isStub) {
                try {
                    const dedupeKey = `wa:incoming:${waMsgId}`;
                    const acquired = await redisClient.set(dedupeKey, '1', {
                        NX: true,
                        EX: 172800,
                    });
                    if (!acquired) {
                        logger.debug('Duplicate whatsapp message (redis)', { waMsgId });
                        return;
                    }
                } catch (_) {}
            }
            const existingEarly = await Message.findOne({
                where: { whatsappId: waMsgId },
                attributes: ['id'],
            });
            if (existingEarly) return;
        }

        let resolvedMedia = media || null;
        let msgType = (messageData.type || 'text').toLowerCase();
        if (msgType === 'ptt') msgType = 'audio';
        if (msgType === 'sticker') msgType = 'image';
        if (hasMedia && media) {
            if (
                media.url &&
                (String(media.url).trim().startsWith('http://') ||
                    String(media.url).trim().startsWith('https://'))
            ) {
                resolvedMedia = await resolveIncomingMedia(media, logger);
            } else if (media.data) {
                resolvedMedia = await resolveIncomingMediaFromBase64(media, logger, {
                    isPtt: (messageData.type || '').toLowerCase() === 'ptt',
                });
            }
            if (
                resolvedMedia &&
                (resolvedMedia.url || resolvedMedia.filename || resolvedMedia.data)
            )
                msgType = inferMessageTypeFromMedia(resolvedMedia);
        }
        if (msgType === 'ptt') msgType = 'audio';
        if (msgType === 'sticker') msgType = 'image';

        const groupNameFromChat = isGroup
            ? (chat?.name || chat?.subject || chat?.formattedTitle || '').toString().trim()
            : '';
        const contactName = isGroup
            ? groupNameFromChat || 'گروه واتساپ'
            : (contact && (contact.name || contact.pushname)) || `مشتری ${phone}`;
        let profilePic = (contact && contact.profilePicUrl) || (chat && chat.profilePicUrl) || null;
        if (!profilePic) {
            const extraIds = [];
            if (incomingLid) {
                extraIds.push(incomingLid);
                extraIds.push(
                    /@lid$/i.test(incomingLid)
                        ? incomingLid
                        : `${String(incomingLid).replace(/\D/g, '')}@lid`
                );
            }
            if (chat && chat.id) extraIds.push(chat.id);
            profilePic = await tryFetchProfilePicFromGateway(phone, logger, extraIds);
        }

        let customer;
        let customerCreated = false;
        try {
            if (!isGroup && incomingLid) {
                const lidCustomer = await findCustomerByStoredLid(incomingLid);
                const realPhone =
                    phone && !isLikelyWhatsAppLid(phone) && !/@lid$/i.test(String(phone))
                        ? phone
                        : '';
                const phoneCustomer = realPhone
                    ? await Customer.findOne({ where: { phone: realPhone } })
                    : null;
                customer = await pickPreferredIncomingCustomer([lidCustomer, phoneCustomer]);
                if (customer && customer.phone) phone = customer.phone;
            }
            if (!customer) {
                [customer, customerCreated] = await Customer.findOrCreate({
                    where: { phone },
                    defaults: { name: contactName, profilePic: profilePic, source: 'whatsapp' },
                });
            }
        } catch (e) {
            if (e.name === 'SequelizeUniqueConstraintError') {
                customer = await Customer.findOne({ where: { phone } });
                customerCreated = false;
                if (!customer) throw e;
            } else throw e;
        }

        if (!isGroup && incomingLid) {
            await rememberCustomerLid(customer, incomingLid, null);
        }

        if (customerCreated) {
            logger.info(
                isGroup
                    ? `✨ New group conversation: ${groupNameFromChat || phone}`
                    : `✨ New customer created: ${phone}`
            );
            if (profilePic) {
                try {
                    const persisted = await persistRemoteAvatarIfNeeded(customer.id, profilePic);
                    if (persisted && persisted !== customer.profilePic)
                        await customer.update({ profilePic: persisted });
                } catch (e) {
                    logger.warn('Avatar persist (new customer)', {
                        err: String(e && e.message ? e.message : e),
                    });
                }
            }
        } else {
            const tsContact = timestamp
                ? new Date(timestamp < 1e12 ? timestamp * 1000 : timestamp)
                : new Date();
            const updatedContactName = isGroup
                ? groupNameFromChat
                : (contact && (contact.name || contact.pushname)) || null;
            const updates = { lastContactAt: tsContact };
            if (
                updatedContactName &&
                String(updatedContactName).trim() &&
                String(customer.name || '').trim() !== String(updatedContactName).trim()
            )
                updates.name = String(updatedContactName).trim();
            if (profilePic && profilePic !== customer.profilePic) updates.profilePic = profilePic;
            if (updates.profilePic) {
                try {
                    const persisted = await persistRemoteAvatarIfNeeded(
                        customer.id,
                        updates.profilePic
                    );
                    if (persisted) updates.profilePic = persisted;
                } catch (e) {
                    logger.warn('Avatar persist', { err: String(e && e.message ? e.message : e) });
                }
            }
            await customer.update(updates);
        }

        let conversation = await Conversation.findOne({
            where: {
                customerId: customer.id,
                status: { [Op.notIn]: ['closed', 'archived'] },
                isHiddenFromStaff: false,
            },
            order: [
                ['lastMessageAt', 'DESC'],
                ['updatedAt', 'DESC'],
            ],
        });

        const incomingTs = timestamp
            ? new Date(timestamp < 1e12 ? timestamp * 1000 : timestamp)
            : new Date();
        const incomingTsMs = incomingTs.getTime();
        const ageMs = Number.isFinite(incomingTsMs) ? Date.now() - incomingTsMs : 0;
        const isRecentLive = !Number.isFinite(incomingTsMs) || ageMs < 20 * 60 * 1000;
        const isLiveAfterCutover =
            isRecentLive || !lockdownAt || incomingTsMs >= lockdownAt.getTime() - 5000;

        // آرشیو شمارهٔ قبلی را باز نکن — برای پیام زنده مکالمهٔ جدید بساز
        if (
            conversation &&
            (conversation.isHiddenFromStaff || conversation.status === 'archived')
        ) {
            conversation = null;
        }

        if (!isLiveAfterCutover) {
            logger.info('Skipped historical WhatsApp replay after legacy cutover', {
                customerId: customer.id,
                phone,
            });
            return { ok: true, skipped: 'legacy_history' };
        }

        if (customer.isRestrictedFromStaff) {
            await customer.update({ isRestrictedFromStaff: false });
        }

        if (!conversation) {
            const t = await sequelize.transaction();
            try {
                conversation = await Conversation.findOne({
                    where: {
                        customerId: customer.id,
                        status: { [Op.notIn]: ['closed', 'archived'] },
                        isHiddenFromStaff: false,
                    },
                    transaction: t,
                    lock: t.LOCK.UPDATE,
                });
                if (!conversation) {
                    const existingAny = await Conversation.findOne({
                        where: {
                            customerId: customer.id,
                            status: { [Op.ne]: 'closed' },
                        },
                        order: [
                            ['lastMessageAt', 'DESC'],
                            ['updatedAt', 'DESC'],
                        ],
                        transaction: t,
                        lock: t.LOCK.UPDATE,
                    });
                    if (existingAny) {
                        await existingAny.update(
                            {
                                status: 'open',
                                isHiddenFromStaff: false,
                                closedAt: null,
                            },
                            { transaction: t }
                        );
                        conversation = existingAny;
                    }
                }
                if (!conversation) {
                    const meta = isGroup
                        ? { isGroup: true, groupName: groupNameFromChat || null }
                        : {};
                    if (linkedGw) meta.linkedGatewayNumber = linkedGw;
                    conversation = await Conversation.create(
                        {
                            customerId: customer.id,
                            status: 'open',
                            priority: 'normal',
                            source: 'whatsapp',
                            isHiddenFromStaff: false,
                            metadata: meta,
                        },
                        { transaction: t }
                    );
                }
                await t.commit();
            } catch (txErr) {
                await t.rollback();
                conversation = await Conversation.findOne({
                    where: {
                        customerId: customer.id,
                        status: { [Op.notIn]: ['closed', 'archived'] },
                        isHiddenFromStaff: false,
                    },
                });
                if (!conversation) throw txErr;
            }
        } else if (isGroup && groupNameFromChat) {
            const meta = conversation.metadata || {};
            if (meta.groupName !== groupNameFromChat) {
                await conversation.update({
                    metadata: { ...meta, isGroup: true, groupName: groupNameFromChat },
                });
            }
        }

        if (!isGroup && incomingLid) {
            await rememberCustomerLid(customer, incomingLid, conversation);
        }

        const ts = timestamp
            ? new Date(timestamp < 1e12 ? timestamp * 1000 : timestamp)
            : new Date();
        const previewText =
            body || (resolvedMedia && (resolvedMedia.filename || resolvedMedia.caption)) || '';
        let preview = previewText.slice(0, 120);
        if (previewText.length > 120) preview += '…';

        const prevLastIncoming =
            !isFromMe && conversation.lastIncomingMessageAt
                ? new Date(conversation.lastIncomingMessageAt)
                : null;
        const convUpdate = { lastMessageAt: ts, lastMessagePreview: preview };
        if (isFromMe) {
            convUpdate.lastOutgoingMessageAt = ts;
            if (!conversation.firstReplyAt) convUpdate.firstReplyAt = ts;
        } else {
            convUpdate.lastIncomingMessageAt = ts;
            convUpdate.unreadCount = sequelize.literal('COALESCE("unreadCount", 0) + 1');
        }
        await conversation.update(convUpdate);

        const msgMetadata =
            isGroup && (messageData.author || messageData.authorName)
                ? {
                      senderId: messageData.author || null,
                      senderName:
                          messageData.authorName ||
                          (messageData.author && contact && (contact.name || contact.pushname)) ||
                          null,
                  }
                : {};

        if (isFromMe) {
            const bodyStr = String(body || '').trim();
            const contentToMatch = bodyStr.startsWith(AI_MESSAGE_PREFIX)
                ? bodyStr.slice(AI_MESSAGE_PREFIX.length).trim()
                : bodyStr.startsWith('AI KAYA: ')
                  ? bodyStr.slice(9).trim()
                  : bodyStr;

            if (bodyStr) {
                const recentAuto = await Message.findOne({
                    where: {
                        conversationId: conversation.id,
                        direction: 'outgoing',
                        isAutoReply: true,
                    },
                    order: [['createdAt', 'DESC']],
                });
                const autoAgeMs = recentAuto
                    ? Date.now() - new Date(recentAuto.createdAt).getTime()
                    : Infinity;
                if (recentAuto && autoAgeMs < 120000) {
                    const storedContent = String(recentAuto.content || '').trim();
                    const match =
                        storedContent === contentToMatch ||
                        bodyStr === storedContent ||
                        (bodyStr.startsWith(AI_MESSAGE_PREFIX) &&
                            storedContent === contentToMatch) ||
                        (bodyStr.startsWith('AI KAYA: ') && storedContent === contentToMatch);
                    if (match) {
                        await recentAuto.update({ whatsappId: waMsgId, status: 'sent' });
                        return;
                    }
                }
            }

            const recentStaff = await Message.findAll({
                where: {
                    conversationId: conversation.id,
                    direction: 'outgoing',
                    userId: { [Op.ne]: null },
                    timestamp: { [Op.gte]: new Date(Date.now() - 120000) },
                },
                order: [['timestamp', 'DESC']],
                limit: 8,
            });
            for (const cand of recentStaff) {
                // echo فقط برای پیام واقعاً ارسال‌شده از پنل CRM — نه ویس/متن موبایل که به assignee چسبیده
                if (!isCrmPanelOutboundMessage(cand)) continue;
                const stored = String(cand.content || '').trim();
                const candMeta = parseMsgMetadata(cand.metadata);
                const storedWa = candMeta.customerWaText
                    ? String(candMeta.customerWaText).trim()
                    : '';
                if (bodyStr && stored) {
                    let echoMatchesStored =
                        bodyStr === stored ||
                        stored === contentToMatch ||
                        (storedWa && bodyStr === storedWa);
                    if (!echoMatchesStored && stored.length >= 3) {
                        const sigMatch = bodyStr.match(/^[^:]+:\s+([\s\S]+)$/);
                        if (sigMatch && sigMatch[1].trim() === stored) echoMatchesStored = true;
                    }
                    if (echoMatchesStored && stored.length >= 3) {
                        if (waMsgId && !cand.whatsappId)
                            await cand.update({ whatsappId: waMsgId, status: 'sent' });
                        return;
                    }
                }
                if (
                    !bodyStr &&
                    !stored &&
                    cand.hasMedia &&
                    hasMedia &&
                    (msgType === 'audio' || rawType === 'ptt')
                ) {
                    const ageMs = Date.now() - new Date(cand.timestamp).getTime();
                    if (ageMs < 90000) {
                        if (waMsgId && !cand.whatsappId)
                            await cand.update({ whatsappId: waMsgId, status: 'sent' });
                        return;
                    }
                }
            }
        }

        // پیام خروجی واقعی از اپ واتساپ روی موبایل (نه echo پنل): به مالک/صاحب خط Gateway نسبت داده می‌شود.
        let outboundUserId = null;
        if (isFromMe) {
            msgMetadata.sendSource = 'whatsapp_mobile';
            const mobileSender = await resolveMobileWhatsappUser(logger);
            outboundUserId = mobileSender.userId || null;
            if (mobileSender.gatewayNumber) msgMetadata.gatewayNumber = mobileSender.gatewayNumber;
            if (mobileSender.gatewayName) msgMetadata.gatewayPushName = mobileSender.gatewayName;
        }
        let newMessage;
        try {
            newMessage = await Message.create({
                conversationId: conversation.id,
                customerId: customer.id,
                userId: isFromMe ? outboundUserId : null,
                whatsappId: messageData.id || null,
                direction: isFromMe ? 'outgoing' : 'incoming',
                content:
                    body ||
                    (resolvedMedia && (resolvedMedia.filename || resolvedMedia.caption)) ||
                    '',
                type: msgType,
                hasMedia: !!(hasMedia && resolvedMedia),
                mediaData: resolvedMedia || null,
                timestamp: ts,
                metadata: Object.keys(msgMetadata).length ? msgMetadata : {},
            });
        } catch (createErr) {
            if (createErr.name === 'SequelizeUniqueConstraintError' && waMsgId) return;
            throw createErr;
        }

        if (isFromMe && outboundUserId) {
            const activeMeta = {
                ...(conversation.metadata || {}),
                lastActiveOutgoingUserId: String(outboundUserId),
            };
            await conversation.update({ metadata: activeMeta }).catch(() => {});
            conversation.metadata = activeMeta;
            if (newMessage.userId !== outboundUserId) {
                await newMessage.update({ userId: outboundUserId }).catch(() => {});
            }
            try {
                const { User } = require('../models');
                const mobileUser = await User.findByPk(outboundUserId, {
                    attributes: [
                        'id',
                        'name',
                        'username',
                        'avatar',
                        'firstName',
                        'lastName',
                        'whatsappSenderName',
                    ],
                });
                if (mobileUser) newMessage.dataValues.user = mobileUser;
            } catch (_) {}
        }

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
                    else if (
                        mime.includes('pdf') ||
                        mime.includes('word') ||
                        mime.includes('excel') ||
                        mime.includes('text') ||
                        mime.includes('spreadsheet') ||
                        mime.includes('presentation')
                    )
                        fType = 'document';
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
                        conversationId: conversation.id,
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
            await conversation.reload({
                include: [{ model: Department, as: 'department', required: false }],
            });
        }

        const autoResponseSent =
            isGroup || isFromMe
                ? false
                : await checkAutoResponse(
                      conversation,
                      newMessage,
                      redisClient,
                      rabbitChannel,
                      logger
                  );

        if (!isGroup && !isFromMe && !autoResponseSent && hasText) {
            const {
                generateAIResponse,
                isAIAnswerEnabled,
                isSimpleFactualQuestion,
            } = require('./aiResponseService');
            let aiEnabled = await isAIAnswerEnabled();
            if (!aiEnabled)
                logger.info('AI skipped: کلید OpenAI تنظیم نشده یا AI_ANSWER_ENABLED=false');
            try {
                const wc = await getCachedWhatsappConfig();
                if (wc && wc.aiAnswerEnabled === false) {
                    aiEnabled = false;
                    logger.info('AI skipped: disabled in WhatsappConfig panel');
                }
                if (aiEnabled && conversation.assignedTo) {
                    const lastHuman = await Message.findOne({
                        where: {
                            conversationId: conversation.id,
                            direction: 'outgoing',
                            userId: { [Op.ne]: null },
                        },
                        order: [['timestamp', 'DESC']],
                        attributes: ['timestamp'],
                    });
                    const alertMin = (wc && (wc.alertUnansweredAfterMinutes ?? 5)) || 5;
                    const now = new Date();
                    const humanRepliedAfterLastIncoming =
                        lastHuman && prevLastIncoming && lastHuman.timestamp >= prevLastIncoming;
                    const withinWaitWindow =
                        prevLastIncoming && now - prevLastIncoming < alertMin * 60000;
                    const isSimpleQuestion = isSimpleFactualQuestion(body || '');

                    if (humanRepliedAfterLastIncoming) {
                        aiEnabled = false;
                        logger.info(
                            'AI skipped: human already replied to customer, assigned conversation'
                        );
                    } else if (withinWaitWindow && !isSimpleQuestion) {
                        aiEnabled = false;
                        logger.info(
                            'AI skipped: assigned, waiting for human (re-enter after ' +
                                alertMin +
                                ' min)'
                        );
                    } else if (withinWaitWindow && isSimpleQuestion) {
                        logger.info(
                            'AI allowed: simple factual question (price/address/docs) while assigned'
                        );
                    }
                }
            } catch (e) {
                logger.warn('WhatsappConfig aiAnswerEnabled check failed:', e?.message);
            }
            if (aiEnabled) {
                const lastAutoReply = await Message.findOne({
                    where: {
                        conversationId: conversation.id,
                        direction: 'outgoing',
                        isAutoReply: true,
                    },
                    order: [['timestamp', 'DESC']],
                    attributes: ['timestamp'],
                });
                const AI_THROTTLE_MIN = 2;
                if (lastAutoReply && lastAutoReply.timestamp) {
                    const minsSince =
                        (Date.now() - new Date(lastAutoReply.timestamp).getTime()) / 60000;
                    if (minsSince < AI_THROTTLE_MIN) {
                        aiEnabled = false;
                        logger.info(
                            'AI skipped: throttle — auto-reply sent ' +
                                minsSince.toFixed(1) +
                                ' min ago'
                        );
                    }
                }
            }
            if (aiEnabled) {
                const convWithDept =
                    conversation.department !== undefined
                        ? conversation
                        : await Conversation.findByPk(conversation.id, {
                              include: [{ model: Department, as: 'department', required: false }],
                          });
                const history = await Message.findAll({
                    where: { conversationId: conversation.id },
                    order: [['timestamp', 'ASC']],
                    limit: 12,
                    attributes: ['direction', 'content'],
                });
                const aiReply = await generateAIResponse({
                    conversation: convWithDept,
                    customer,
                    incomingMessage: body || '',
                    messageHistory: history,
                    department: convWithDept?.department || null,
                });
                if (aiReply) {
                    const autoMsg = await sendAutoReply(
                        conversation,
                        aiReply,
                        rabbitChannel,
                        logger,
                        { isAI: true }
                    );
                    if (autoMsg) {
                        await emitNewMessageToAuthorized(io, conversation, {
                            conversationId: conversation.id,
                            customerId: customer.id,
                            message: autoMsg,
                            isHiddenFromStaff: !!conversation.isHiddenFromStaff,
                            customer: publicCustomerSocketPayload(customer),
                        });
                    }
                    logger.info(`🤖 AI reply sent to ${customer.phone}`);
                } else {
                    logger.warn('AI returned no reply', {
                        phone: customer.phone,
                        incomingPreview: (body || '').slice(0, 50),
                    });
                }
            }
        }

        // عکس پروفایل: گاهی در رویداد اول null است — یک بار دیگر از گیت‌وی (با throttle داخلی) تلاش می‌کنیم تا کلاینت همان لحظه به‌روز شود.
        if (!isGroup && !isFromMe) {
            try {
                await maybeRefreshWhatsappCustomerAvatar(customer);
            } catch (_av) {}
        }
        await customer
            .reload({ attributes: ['id', 'name', 'phone', 'profilePic', 'source'] })
            .catch(() => {});

        if (isFromMe) {
            const mobileOwner = await loadMobileWhatsappUser(logger);
            applyMobileWhatsappSenderToMessages([newMessage], mobileOwner);
        }

        if (!conversation.customer) conversation.customer = customer;
        await emitNewMessageToAuthorized(io, conversation, {
            conversationId: conversation.id,
            customerId: customer.id,
            message: newMessage,
            isHiddenFromStaff: !!conversation.isHiddenFromStaff,
            customer: publicCustomerSocketPayload(customer),
        });

        if (conversation.assignedTo) {
            io.to(`user_${conversation.assignedTo}`).emit('assigned_message', {
                conversationId: conversation.id,
                message: newMessage,
                isHiddenFromStaff: !!conversation.isHiddenFromStaff,
            });
        }

        if (mongoose.connection.readyState === 1 && mongoose.models.MessageLog) {
            const tsLog =
                timestamp != null ? (timestamp < 1e12 ? timestamp * 1000 : timestamp) : Date.now();
            await mongoose.model('MessageLog').create({
                conversationId: conversation.id,
                customerId: customer.id,
                messageId: newMessage.id,
                content: body,
                timestamp: new Date(tsLog),
                metadata: messageData,
            });
        }

        logger.info(`📩 Message processed: ${phone}`);
    } catch (error) {
        logger.error('Error processing incoming message:', {
            error: error.message,
            stack: error.stack,
            from: messageData?.from,
            type: messageData?.type,
        });
        notifySystemEvent('error', 'Incoming Message Error', {
            from: messageData?.from || null,
            type: messageData?.type || null,
            error: error.message || String(error),
        }).catch(() => {});
        throw error;
    }
}

module.exports = {
    processIncomingMessage,
    sendAutoReply,
    maybeSendEmployeeIntro,
};

#!/usr/bin/env node
/**
 * برگرداندن مکالمات آرشیوِ ۳۰ روز اخیر از backups/archive-latest.json.gz
 * گروه‌های قدیمی (مثل ۵۲ روز) را برنمی‌گرداند.
 *
 *   node scripts/restore-recent-archive.js
 *   node scripts/restore-recent-archive.js --days 45
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { sequelize, Customer, Conversation, Message } = require('../models');

function backupsDir() {
    return process.env.BACKUP_DIR || path.join(__dirname, '..', '..', 'backups');
}

function looksLikeJidName(s) {
    return /@g\.us$/i.test(String(s || '')) || /^گروه\s+\d/i.test(String(s || ''));
}

function isKeepName(conv, customer) {
    const name = `${(customer && customer.name) || ''} ${(conv && conv.metadata && conv.metadata.groupName) || ''}`;
    return /فروش\s*کایا/i.test(name) || /kaya\s*sales/i.test(name);
}

function convTimeMs(conv) {
    const raw = conv.lastMessageAt || conv.updatedAt || conv.createdAt;
    const t = raw ? new Date(raw).getTime() : 0;
    return Number.isFinite(t) ? t : 0;
}

async function upsertCustomer(row) {
    if (!row || !row.id) return null;
    let existing = await Customer.findByPk(row.id);
    if (!existing && row.phone) {
        existing = await Customer.findOne({ where: { phone: row.phone } });
    }
    const data = {
        name: row.name && String(row.name).trim() ? row.name : 'گروه واتساپ',
        phone: row.phone,
        email: row.email && String(row.email).includes('@') ? row.email : null,
        source: row.source || 'whatsapp',
        profilePic: row.profilePic || null,
        isRestrictedFromStaff: false,
        status: row.status || 'active',
    };
    if (existing) {
        const patch = { isRestrictedFromStaff: false };
        if (row.name && !looksLikeJidName(row.name) && existing.name !== row.name) patch.name = row.name;
        if (row.profilePic && !existing.profilePic) patch.profilePic = row.profilePic;
        await existing.update(patch);
        return existing;
    }
    return Customer.create({ id: row.id, ...data });
}

async function upsertConversation(row, open) {
    if (!row || !row.id || !row.customerId) return null;
    const existing = await Conversation.findByPk(row.id);
    const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
    const payload = {
        customerId: row.customerId,
        branchId: row.branchId || null,
        departmentId: row.departmentId || null,
        assignedTo: row.assignedTo || null,
        status: open ? 'open' : 'archived',
        priority: row.priority || 'normal',
        source: row.source || 'whatsapp',
        unreadCount: row.unreadCount || 0,
        lastMessageAt: row.lastMessageAt || null,
        lastIncomingMessageAt: row.lastIncomingMessageAt || null,
        lastOutgoingMessageAt: row.lastOutgoingMessageAt || null,
        lastMessagePreview: row.lastMessagePreview || null,
        isHiddenFromStaff: !open,
        metadata: meta,
    };
    if (existing) {
        if (open) {
            await existing.update({
                status: 'open',
                isHiddenFromStaff: false,
                closedAt: null,
                lastMessageAt: existing.lastMessageAt || row.lastMessageAt || existing.lastMessageAt,
                lastMessagePreview: existing.lastMessagePreview || row.lastMessagePreview,
                metadata: { ...(existing.metadata || {}), ...meta, isHiddenFromStaff: undefined },
            });
        }
        return existing;
    }
    return Conversation.create({ id: row.id, ...payload });
}

async function upsertMessage(row) {
    if (!row || !row.id || !row.conversationId) return false;
    const existing = await Message.findByPk(row.id);
    if (existing) return false;
    if (row.whatsappId) {
        const byWa = await Message.findOne({ where: { whatsappId: row.whatsappId } });
        if (byWa) return false;
    }
    const allowedTypes = new Set(['text', 'image', 'video', 'audio', 'document', 'location', 'contact']);
    const msgType = allowedTypes.has(row.type) ? row.type : row.hasMedia ? 'document' : 'text';
    await Message.create({
        id: row.id,
        conversationId: row.conversationId,
        customerId: row.customerId,
        userId: row.userId || null,
        whatsappId: row.whatsappId || null,
        direction: row.direction === 'outgoing' ? 'outgoing' : 'incoming',
        content: row.content || '',
        type: msgType,
        hasMedia: !!row.hasMedia,
        mediaData: row.mediaData || null,
        status: row.status || 'sent',
        isAutoReply: !!row.isAutoReply,
        timestamp: row.timestamp || new Date(),
        metadata: row.metadata || {},
    });
    return true;
}

async function main() {
    const daysArg = process.argv.find((a) => a.startsWith('--days='));
    const days = daysArg ? parseInt(daysArg.split('=')[1], 10) : 45;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const latestPath = path.join(backupsDir(), 'archive-latest.json.gz');
    if (!fs.existsSync(latestPath)) {
        throw new Error('missing ' + latestPath);
    }
    const payload = JSON.parse(zlib.gunzipSync(fs.readFileSync(latestPath)).toString('utf8'));
    const customers = Array.isArray(payload.customers) ? payload.customers : [];
    const conversations = Array.isArray(payload.conversations) ? payload.conversations : [];
    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    const customerById = {};
    for (const c of customers) customerById[c.id] = c;

    const restoreConvIds = new Set();
    let skippedOld = 0;
    for (const conv of conversations) {
        const cust = customerById[conv.customerId] || null;
        const recent = convTimeMs(conv) >= cutoff;
        if (!recent && !isKeepName(conv, cust)) {
            skippedOld++;
            continue;
        }
        restoreConvIds.add(conv.id);
    }

    await sequelize.authenticate();
    let customersUpserted = 0;
    let convsUpserted = 0;
    let messagesUpserted = 0;

    for (const conv of conversations) {
        if (!restoreConvIds.has(conv.id)) continue;
        const custRow = customerById[conv.customerId];
        if (custRow) {
            await upsertCustomer(custRow);
            customersUpserted++;
        }
        await upsertConversation(conv, true);
        convsUpserted++;
    }

    for (const msg of messages) {
        if (!restoreConvIds.has(msg.conversationId)) continue;
        if (await upsertMessage(msg)) messagesUpserted++;
    }

    console.log(
        JSON.stringify(
            {
                ok: true,
                days,
                file: latestPath,
                inBackup: {
                    conversations: conversations.length,
                    messages: messages.length,
                    customers: customers.length,
                },
                restored: {
                    conversations: convsUpserted,
                    customers: customersUpserted,
                    messages: messagesUpserted,
                },
                skippedOld,
            },
            null,
            2
        )
    );
}

main()
    .catch((err) => {
        console.error(err && err.stack ? err.stack : err);
        process.exit(1);
    })
    .finally(async () => {
        try {
            await sequelize.close();
        } catch (_) {}
    });

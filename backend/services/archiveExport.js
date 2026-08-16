/**
 * بکاپ و پاک‌سازی مکالمات آرشیو / قفل‌شدهٔ شمارهٔ قبلی
 */
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { Op } = require('sequelize');
const { Conversation, Customer, Message, CustomerDocument } = require('../models');
const logger = require('../config/logger');

function archiveWhere() {
    return {
        [Op.or]: [{ status: 'archived' }, { isHiddenFromStaff: true }],
    };
}

function isKeepCurrent(conv, customer) {
    const name = `${(customer && customer.name) || ''} ${(conv.metadata && conv.metadata.groupName) || ''}`;
    if (/فروش\s*کایا/i.test(name)) return true;
    if (/kaya\s*sales/i.test(name)) return true;
    return false;
}

function backupsDir() {
    return process.env.BACKUP_DIR || path.join(__dirname, '..', '..', 'backups');
}

async function loadArchiveConversations() {
    return Conversation.findAll({
        where: archiveWhere(),
        include: [
            {
                model: Customer,
                as: 'customer',
                required: false,
            },
        ],
        order: [['updatedAt', 'DESC']],
        limit: 20000,
    });
}

async function exportArchiveToFile() {
    const convs = await loadArchiveConversations();
    const convIds = convs.map((c) => c.id);
    const customersById = {};
    for (const conv of convs) {
        if (conv.customer && conv.customer.id) {
            customersById[conv.customer.id] = conv.customer.toJSON();
        }
    }

    const messages = convIds.length
        ? await Message.findAll({
              where: { conversationId: { [Op.in]: convIds } },
              order: [['timestamp', 'ASC']],
              limit: 500000,
          })
        : [];

    const payload = {
        exportedAt: new Date().toISOString(),
        kind: 'kaya-archive-conversations',
        conversationCount: convs.length,
        messageCount: messages.length,
        customerCount: Object.keys(customersById).length,
        conversations: convs.map((c) => {
            const json = c.toJSON();
            delete json.customer;
            return json;
        }),
        customers: Object.values(customersById),
        messages: messages.map((m) => m.toJSON()),
    };

    const dir = backupsDir();
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `kaya-archive-${stamp}.json.gz`;
    const filePath = path.join(dir, fileName);
    const latestPath = path.join(dir, 'archive-latest.json.gz');
    const buf = zlib.gzipSync(Buffer.from(JSON.stringify(payload), 'utf8'), { level: 9 });
    fs.writeFileSync(filePath, buf);
    fs.copyFileSync(filePath, latestPath);

    logger.info('Archive export written', {
        fileName,
        conversations: payload.conversationCount,
        messages: payload.messageCount,
        bytes: buf.length,
    });

    return {
        filePath,
        latestPath,
        fileName,
        bytes: buf.length,
        conversationCount: payload.conversationCount,
        messageCount: payload.messageCount,
        customerCount: payload.customerCount,
    };
}

async function purgeArchive(opts = {}) {
    const keepCurrentGroups = opts.keepCurrentGroups !== false;
    const convs = await loadArchiveConversations();
    const keepIds = [];
    const deleteIds = [];
    const keepCustomerIds = new Set();

    for (const conv of convs) {
        if (keepCurrentGroups && isKeepCurrent(conv, conv.customer)) {
            keepIds.push(conv.id);
            if (conv.customerId) keepCustomerIds.add(conv.customerId);
            continue;
        }
        deleteIds.push(conv.id);
    }

    if (keepIds.length) {
        await Conversation.update(
            { status: 'open', isHiddenFromStaff: false, closedAt: null },
            { where: { id: { [Op.in]: keepIds } } }
        );
        if (keepCustomerIds.size) {
            await Customer.update(
                { isRestrictedFromStaff: false },
                { where: { id: { [Op.in]: [...keepCustomerIds] } } }
            );
        }
    }

    let messagesDeleted = 0;
    let documentsCleared = 0;
    const chunk = 250;
    for (let i = 0; i < deleteIds.length; i += chunk) {
        const slice = deleteIds.slice(i, i + chunk);
        messagesDeleted += await Message.destroy({ where: { conversationId: { [Op.in]: slice } } });
        if (CustomerDocument) {
            documentsCleared += await CustomerDocument.destroy({
                where: { conversationId: { [Op.in]: slice } },
            });
        }
        await Conversation.destroy({ where: { id: { [Op.in]: slice } } });
    }

    logger.warn('Purged archived conversations', {
        deleted: deleteIds.length,
        kept: keepIds.length,
        messagesDeleted,
        documentsCleared,
    });

    return {
        deletedConversations: deleteIds.length,
        keptConversations: keepIds.length,
        keptIds: keepIds,
        messagesDeleted,
        documentsCleared,
    };
}

module.exports = {
    archiveWhere,
    isKeepCurrent,
    exportArchiveToFile,
    purgeArchive,
};

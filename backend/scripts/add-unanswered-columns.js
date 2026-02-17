#!/usr/bin/env node
/**
 * اسکریپت افزودن ستون‌های مربوط به مکالمات بدون پاسخ
 * اجرا: node scripts/add-unanswered-columns.js
 */
require('dotenv').config();
const { sequelize, Conversation, WhatsappConfig, Message } = require('../models');
const { DataTypes } = require('sequelize');

async function run() {
    try {
        const qi = sequelize.getQueryInterface();
        const tableName = Conversation.tableName || 'Conversations';

        const cols = [
            { name: 'lastIncomingMessageAt', def: { type: DataTypes.DATE, allowNull: true } },
            { name: 'lastOutgoingMessageAt', def: { type: DataTypes.DATE, allowNull: true } },
            { name: 'unansweredAlertSentAt', def: { type: DataTypes.DATE, allowNull: true } },
            { name: 'escalatedAt', def: { type: DataTypes.DATE, allowNull: true } }
        ];

        const tableDesc = await qi.describeTable(tableName);
        for (const c of cols) {
            if (tableDesc && tableDesc[c.name]) {
                console.log('✅ Column', c.name, 'already exists');
            } else {
                await qi.addColumn(tableName, c.name, c.def);
                console.log('✅ Added column', c.name);
            }
        }

        const wcTable = WhatsappConfig.tableName || 'whatsapp_configs';
        await WhatsappConfig.sync();
        const wcDesc = await qi.describeTable(wcTable).catch(() => ({}));
        const wcCols = [
            { name: 'alertUnansweredAfterMinutes', def: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 5 } },
            { name: 'escalateUnansweredAfterMinutes', def: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 15 } },
            { name: 'escalationDepartmentId', def: { type: DataTypes.UUID, allowNull: true } }
        ];
        for (const c of wcCols) {
            if (wcDesc && wcDesc[c.name]) {
                console.log('✅ WhatsappConfig column', c.name, 'already exists');
            } else {
                await qi.addColumn(wcTable, c.name, c.def);
                console.log('✅ Added WhatsappConfig column', c.name);
            }
        }

        // Backfill lastIncomingMessageAt و lastOutgoingMessageAt برای مکالمات موجود
        const convs = await Conversation.findAll({ attributes: ['id'] });
        let backfilled = 0;
        for (const c of convs) {
            const lastIn = await Message.findOne({ where: { conversationId: c.id, direction: 'incoming' }, order: [['timestamp', 'DESC']], attributes: ['timestamp'] });
            const lastOut = await Message.findOne({ where: { conversationId: c.id, direction: 'outgoing' }, order: [['timestamp', 'DESC']], attributes: ['timestamp'] });
            if (lastIn || lastOut) {
                await c.update({ lastIncomingMessageAt: lastIn ? lastIn.timestamp : null, lastOutgoingMessageAt: lastOut ? lastOut.timestamp : null });
                backfilled++;
            }
        }
        if (backfilled > 0) console.log('✅ Backfilled', backfilled, 'conversations');

        console.log('Done.');
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}
run();

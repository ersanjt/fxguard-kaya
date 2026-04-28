#!/usr/bin/env node
/**
 * اسکریپت افزودن ستون lastMessagePreview به جدول Conversations
 * برای دیتابیس‌های موجود اجرا کنید: node scripts/add-last-message-preview.js
 */
require('dotenv').config();
const { sequelize, Conversation } = require('../models');
const { DataTypes } = require('sequelize');

async function run() {
    try {
        const tableName = Conversation.tableName || 'Conversations';
        const qi = sequelize.getQueryInterface();
        const tableDesc = await qi.describeTable(tableName);
        if (tableDesc && tableDesc.lastMessagePreview) {
            console.log('✅ Column lastMessagePreview already exists');
            process.exit(0);
            return;
        }
        await qi.addColumn(tableName, 'lastMessagePreview', { type: DataTypes.STRING(500), allowNull: true });
        console.log('✅ Column lastMessagePreview added successfully');
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}
run();

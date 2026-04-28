#!/usr/bin/env node
/**
 * افزودن ستون فعال/غیرفعال برای پیام‌های خودکار تخصیص و معرفی
 * اجرا: node scripts/add-auto-assignment-messages-enabled.js
 */
require('dotenv').config();
const { sequelize, WhatsappConfig } = require('../models');
const { DataTypes } = require('sequelize');

async function run() {
    try {
        const qi = sequelize.getQueryInterface();
        const tableName = WhatsappConfig.tableName || 'whatsapp_configs';
        const desc = await qi.describeTable(tableName).catch(() => ({}));

        const cols = [
            { name: 'autoAssignmentMessagesEnabled', def: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true } }
        ];

        for (const c of cols) {
            if (desc && desc[c.name]) {
                console.log('✅ Column', c.name, 'already exists');
            } else {
                await qi.addColumn(tableName, c.name, c.def);
                console.log('✅ Added column', c.name);
            }
        }

        console.log('Done.');
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}
run();

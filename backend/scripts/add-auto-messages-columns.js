#!/usr/bin/env node
/**
 * افزودن ستون‌های پیام‌های خودکار تخصیص دپارتمان و معرفی کارمند
 * اجرا: node scripts/add-auto-messages-columns.js
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
            { name: 'deptAssignedMessage', def: { type: DataTypes.TEXT, allowNull: true } },
            { name: 'employeeIntroMessage', def: { type: DataTypes.TEXT, allowNull: true } }
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

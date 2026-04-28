#!/usr/bin/env node
/**
 * افزودن ستون openaiApiKey به whatsapp_configs
 * اجرا: node scripts/add-openai-api-key-column.js
 */
require('dotenv').config();
const { sequelize, WhatsappConfig } = require('../models');
const { DataTypes } = require('sequelize');

async function run() {
    try {
        const qi = sequelize.getQueryInterface();
        const tableName = WhatsappConfig.tableName || 'whatsapp_configs';
        const desc = await qi.describeTable(tableName).catch(() => ({}));

        if (desc && desc.openaiApiKey) {
            console.log('✅ Column openaiApiKey already exists');
        } else {
            await qi.addColumn(tableName, 'openaiApiKey', { type: DataTypes.TEXT, allowNull: true });
            console.log('✅ Added column openaiApiKey');
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

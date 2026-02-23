#!/usr/bin/env node
/**
 * اسکریپت افزودن ستون aiAnswerEnabled به WhatsappConfig
 * اجرا: node scripts/add-ai-columns.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { sequelize, WhatsappConfig } = require('../models');
const { DataTypes } = require('sequelize');

async function run() {
    try {
        const qi = sequelize.getQueryInterface();
        const wcTable = WhatsappConfig.tableName || 'whatsapp_configs';
        await WhatsappConfig.sync();
        const wcDesc = await qi.describeTable(wcTable).catch(() => ({}));
        const col = { name: 'aiAnswerEnabled', def: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true } };
        if (wcDesc && wcDesc[col.name]) {
            console.log('✅ WhatsappConfig column', col.name, 'already exists');
        } else {
            await qi.addColumn(wcTable, col.name, col.def);
            console.log('✅ Added WhatsappConfig column', col.name);
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

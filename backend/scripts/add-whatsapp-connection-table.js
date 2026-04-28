#!/usr/bin/env node
/**
 * ایجاد جدول whatsapp_connections برای ذخیره تنظیمات اتصال از پنل
 * اجرا: node scripts/add-whatsapp-connection-table.js
 */
require('dotenv').config();
const { sequelize } = require('../models');
const { DataTypes } = require('sequelize');

async function run() {
    try {
        const qi = sequelize.getQueryInterface();

        const tableName = 'whatsapp_connections';
        let exists = false;
        try {
            await qi.describeTable(tableName);
            exists = true;
        } catch (_) { /* table does not exist */ }

        if (exists) {
            console.log('✅ Table whatsapp_connections already exists');
        } else {
            await qi.createTable(tableName, {
                id: { type: DataTypes.STRING(32), primaryKey: true, defaultValue: 'default' },
                connectionMode: { type: DataTypes.STRING(32), allowNull: true, defaultValue: 'cloud_first' },
                cloudEnabled: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true },
                cloudAccessToken: { type: DataTypes.TEXT, allowNull: true },
                cloudPhoneNumberId: { type: DataTypes.STRING(64), allowNull: true },
                cloudVerifyToken: { type: DataTypes.STRING(128), allowNull: true },
                gatewayEnabled: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true },
                gatewayUrl: { type: DataTypes.STRING(512), allowNull: true },
                gatewayApiSecret: { type: DataTypes.TEXT, allowNull: true },
                createdAt: { type: DataTypes.DATE, allowNull: false },
                updatedAt: { type: DataTypes.DATE, allowNull: false },
            });
            console.log('✅ Created table whatsapp_connections');
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

#!/usr/bin/env node
/**
 * افزودن ستون tokenVersion به Users — باطل‌سازی نشست بعد از logout / عوض رمز
 * اجرا: node scripts/add-token-version-column.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { sequelize, User } = require('../models');
const { DataTypes } = require('sequelize');

async function run() {
    try {
        const qi = sequelize.getQueryInterface();
        const table = User.tableName || 'Users';
        await User.sync();
        const desc = await qi.describeTable(table).catch(() => ({}));
        if (desc && desc.tokenVersion) {
            console.log('✅ Users.tokenVersion already exists');
        } else {
            await qi.addColumn(table, 'tokenVersion', {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            });
            console.log('✅ Added Users.tokenVersion');
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

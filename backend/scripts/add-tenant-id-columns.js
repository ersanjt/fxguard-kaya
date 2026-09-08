#!/usr/bin/env node
/**
 * ستون tenantId روی جداول CRM — باید قبل از sequelize.sync ایندکس ساخته شود.
 * اجرا: node scripts/add-tenant-id-columns.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { sequelize } = require('../models');
const { addTenantIdColumns } = require('../services/tenantPlatform');

async function run() {
    try {
        await sequelize.authenticate();
        await addTenantIdColumns(sequelize, console);
        console.log('Done.');
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

run();

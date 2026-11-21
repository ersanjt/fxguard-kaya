#!/usr/bin/env node
/**
 * Kaya CRM — ستون‌های Embedded Signup روی whatsapp_connections
 * @file    backend/scripts/add-embedded-signup-columns.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/META-TECH-PROVIDER-PLAN-FA.md
 *
 * اجرا: node scripts/add-embedded-signup-columns.js
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { sequelize } = require('../models');
const { DataTypes } = require('sequelize');

async function run() {
    try {
        const qi = sequelize.getQueryInterface();
        const table = 'whatsapp_connections';
        const desc = await qi.describeTable(table).catch(() => null);
        if (!desc) {
            console.error('Table whatsapp_connections missing. Run add-whatsapp-connection-table.js first.');
            process.exit(1);
        }
        const cols = [
            {
                name: 'cloudWabaId',
                def: { type: DataTypes.STRING(64), allowNull: true },
            },
            {
                name: 'embeddedSignupAt',
                def: { type: DataTypes.DATE, allowNull: true },
            },
        ];
        for (const c of cols) {
            if (desc[c.name] !== undefined) {
                console.log('✅ whatsapp_connections.' + c.name + ' already exists');
            } else {
                await qi.addColumn(table, c.name, c.def);
                console.log('✅ Added column whatsapp_connections.' + c.name);
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

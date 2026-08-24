#!/usr/bin/env node
/**
 * ستون‌های planTier (panel_settings) و trial* (whatsapp_configs)
 * اجرا: node scripts/add-plan-tier-trial-columns.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { sequelize } = require('../models');
const { DataTypes } = require('sequelize');

async function run() {
    try {
        const qi = sequelize.getQueryInterface();

        const psTable = 'panel_settings';
        const psDesc = await qi.describeTable(psTable).catch(() => ({}));
        if (psDesc && psDesc.planTier === undefined) {
            await qi.addColumn(psTable, 'planTier', {
                type: DataTypes.STRING(32),
                allowNull: true,
            });
            console.log('✅ Added column panel_settings.planTier');
        } else {
            console.log('✅ panel_settings.planTier already exists');
        }

        const wcTable = 'whatsapp_configs';
        const wcDesc = await qi.describeTable(wcTable).catch(() => ({}));
        const wcCols = [
            { name: 'trialStatus', def: { type: DataTypes.STRING(16), allowNull: true } },
            { name: 'trialStartedAt', def: { type: DataTypes.DATE, allowNull: true } },
            { name: 'trialEndsAt', def: { type: DataTypes.DATE, allowNull: true } },
        ];
        for (const c of wcCols) {
            if (wcDesc && wcDesc[c.name] !== undefined) {
                console.log('✅ whatsapp_configs.' + c.name + ' already exists');
            } else {
                await qi.addColumn(wcTable, c.name, c.def);
                console.log('✅ Added column whatsapp_configs.' + c.name);
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

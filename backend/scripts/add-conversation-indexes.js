#!/usr/bin/env node
/**
 * Migration: Add indexes for lastIncomingMessageAt, lastOutgoingMessageAt
 * Run: node backend/scripts/add-conversation-indexes.js
 */
require('dotenv').config();
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { sequelize } = require('../models');

async function run() {
    const dialect = sequelize.getDialect();
    if (dialect !== 'sqlite' && dialect !== 'postgres' && dialect !== 'mysql') {
        console.log('Skipping: unsupported dialect', dialect);
        process.exit(0);
    }

    const table = 'Conversations';
    const indexes = [
        { name: 'conversations_last_incoming_message_at', column: 'lastIncomingMessageAt' },
        { name: 'conversations_last_outgoing_message_at', column: 'lastOutgoingMessageAt' },
        { name: 'conversations_status_last_incoming_message_at', columns: ['status', 'lastIncomingMessageAt'] }
    ];

    try {
        for (const idx of indexes) {
            const col = idx.column || (idx.columns && idx.columns.join('_'));
            const cols = idx.columns || [idx.column];
            const idxName = idx.name || `idx_${table}_${col}`;
            try {
                if (dialect === 'sqlite') {
                    await sequelize.query(
                        `CREATE INDEX IF NOT EXISTS ${idxName} ON "${table}" (${cols.map(c => `"${c}"`).join(', ')})`
                    );
                } else if (dialect === 'postgres') {
                    await sequelize.query(
                        `CREATE INDEX IF NOT EXISTS "${idxName}" ON "${table}" (${cols.map(c => `"${c}"`).join(', ')})`
                    );
                } else if (dialect === 'mysql') {
                    try {
                        await sequelize.query(
                            `CREATE INDEX ${idxName} ON \`${table}\` (${cols.map(c => `\`${c}\``).join(', ')})`
                        );
                    } catch (mysqlErr) {
                        if (mysqlErr.message && (mysqlErr.message.includes('Duplicate') || mysqlErr.message.includes('already exists'))) {
                            console.log('Index exists:', idxName);
                        } else throw mysqlErr;
                    }
                }
                console.log('Index created/verified:', idxName);
            } catch (e) {
                if (e.message && (e.message.includes('already exists') || e.message.includes('Duplicate'))) {
                    console.log('Index exists:', idxName);
                } else {
                    throw e;
                }
            }
        }
        console.log('Migration completed.');
    } finally {
        await sequelize.close();
    }
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});

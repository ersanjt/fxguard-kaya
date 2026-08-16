#!/usr/bin/env node
/**
 * بکاپ مکالمات آرشیو. پاک‌سازی فقط با --purge --confirm
 *   node scripts/export-archive.js
 *   node scripts/export-archive.js --purge --confirm
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { sequelize } = require('../models');
const { exportArchiveToFile, purgeArchive } = require('../services/archiveExport');

async function main() {
    await sequelize.authenticate();
    const exported = await exportArchiveToFile();
    console.log(
        JSON.stringify(
            {
                ok: true,
                filePath: exported.filePath,
                latestPath: exported.latestPath,
                fileName: exported.fileName,
                bytes: exported.bytes,
                conversationCount: exported.conversationCount,
                messageCount: exported.messageCount,
                customerCount: exported.customerCount,
            },
            null,
            2
        )
    );

    if (process.argv.includes('--purge')) {
        if (!process.argv.includes('--confirm')) {
            console.error('Refusing purge without --confirm');
            process.exit(2);
        }
        const purged = await purgeArchive({
            keepCurrentGroups: !process.argv.includes('--purge-all'),
        });
        console.log(JSON.stringify({ ok: true, purged }, null, 2));
    }
}

main()
    .catch((err) => {
        console.error(err && err.stack ? err.stack : err);
        process.exit(1);
    })
    .finally(async () => {
        try {
            await sequelize.close();
        } catch (_) {}
    });

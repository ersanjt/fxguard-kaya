#!/usr/bin/env node
/**
 * یک‌بار: پیام‌های خروجی غیر پنل CRM را به مالک خط واتساپ موبایل (Ali / WHATSAPP_MOBILE_USER_*) نسبت می‌دهد.
 * Usage: node backend/scripts/backfill-mobile-wa-sender.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { Message, sequelize } = require('../models');
const { resolveMobileWhatsappUser, parseMsgMetadata } = require('../lib/resolveMobileWhatsappUser');

async function main() {
    const { userId } = await resolveMobileWhatsappUser(console);
    if (!userId) {
        console.error('Mobile WhatsApp user not resolved. Set WHATSAPP_MOBILE_USER_ID or WHATSAPP_MOBILE_USER_EMAIL.');
        process.exit(1);
    }

    const rows = await Message.findAll({
        where: { direction: 'outgoing', isAutoReply: false },
        attributes: ['id', 'metadata', 'userId'],
    });

    let updated = 0;
    for (const m of rows) {
        const meta = parseMsgMetadata(m.metadata);
        if (meta.sendSource === 'crm_panel') continue;
        const nextMeta = { ...meta, sendSource: 'whatsapp_mobile' };
        if (m.userId !== userId || meta.sendSource !== 'whatsapp_mobile') {
            await m.update({ userId, metadata: nextMeta });
            updated += 1;
        }
    }

    console.log(`Done. Updated ${updated} of ${rows.length} outgoing non-auto messages (skipped crm_panel).`);
    await sequelize.close();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

#!/usr/bin/env node
/**
 * قفل شمارهٔ قبلی: همهٔ چت‌ها/گروه‌ها/مشتریان آرشیو می‌شوند،
 * بعد فقط لیست زندهٔ Gateway (شمارهٔ فعلی) به مکالمات فعال برمی‌گردد.
 *
 *   node scripts/enforce-current-number.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { sequelize } = require('../models');
const {
    enforceCurrentNumberInbox,
    loadGatewayChatIdsAndNumber,
    getLockdownStats,
} = require('../services/legacyCrmLockdown');

async function main() {
    await sequelize.authenticate();
    const live = await loadGatewayChatIdsAndNumber();
    const result = await enforceCurrentNumberInbox(live.chatIds, live.number, {
        reason: 'script_enforce_current_number',
    });
    const stats = result.stats || (await getLockdownStats());
    console.log(
        JSON.stringify(
            {
                ok: true,
                number: live.number || result.number || null,
                gatewayChats: live.chatIds.length,
                opened: (result.visibility && result.visibility.opened) || 0,
                unrestricted: (result.visibility && result.visibility.unrestricted) || 0,
                lockdown: result.lockdown || null,
                stats,
            },
            null,
            2
        )
    );
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

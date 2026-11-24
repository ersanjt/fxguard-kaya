/**
 * Kaya CRM — employee-reviewed AI pilot policy
 * @file backend/lib/aiPilot.js
 * @layer backend
 * @owner Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see docs/CODEBASE-MAP.md
 */
'use strict';

function isAiPilotEnabled() {
    if (process.env.AI_ASSISTANT_PILOT_ENABLED !== 'true') return false;
    const { getPanelSettingsKey } = require('./tenantContext');
    const panels = String(process.env.AI_ASSISTANT_PILOT_PANELS || 'default')
        .split(',')
        .map((key) => key.trim())
        .filter(Boolean);
    return panels.includes(getPanelSettingsKey());
}

module.exports = { isAiPilotEnabled };

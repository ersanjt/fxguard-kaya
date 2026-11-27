'use strict';

/**
 * Why a Cloud API verify cannot call Graph yet.
 * A saved token and phone id must not be reported as a single opaque "not_configured".
 */
function describeCloudConfigGap(cfg) {
    const enabled = !!(cfg && cfg.cloudEnabled !== false);
    const token = !!(cfg && String(cfg.cloudAccessToken || '').trim().length > 10);
    const phoneId = !!(cfg && String(cfg.cloudPhoneNumberId || '').trim());
    const checks = { enabled, token, phoneId };
    if (!cfg || !enabled) return { ok: false, error: 'cloud_disabled', checks };
    if (!token && !phoneId) return { ok: false, error: 'not_configured', checks };
    if (!token) return { ok: false, error: 'missing_token', checks };
    if (!phoneId) return { ok: false, error: 'missing_phone', checks };
    return null;
}

module.exports = { describeCloudConfigGap };

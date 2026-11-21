'use strict';

/** App Secret متا برای تأیید webhook. META_APP_SECRET همان مقدار را هم می‌پذیرد. */
function getCloudAppSecret() {
    return String(process.env.WHATSAPP_CLOUD_APP_SECRET || process.env.META_APP_SECRET || '').trim();
}

function isCloudAppSecretConfigured() {
    return !!getCloudAppSecret();
}

module.exports = { getCloudAppSecret, isCloudAppSecretConfigured };

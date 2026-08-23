/**
 * Kaya CRM — انقضای آزمایش ۷روزه واتساپ (قطع نشست QR)
 * @file    backend/jobs/whatsappTrial.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */

'use strict';

const logger = require('../config/logger');
const { expireDueWhatsappTrial } = require('../lib/whatsappTrial');

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

let _intervalId = null;

function startWhatsappTrialJob() {
    if (process.env.NODE_ENV === 'test') return;
    if (_intervalId) return;
    _intervalId = setInterval(() => {
        expireDueWhatsappTrial(logger).catch((err) => {
            logger.warn('WhatsApp trial expire:', err.message);
        });
    }, CHECK_INTERVAL_MS);
    _intervalId.unref();
    expireDueWhatsappTrial(logger).catch((err) => {
        logger.warn('WhatsApp trial expire on start:', err.message);
    });
}

function stopWhatsappTrialJob() {
    if (_intervalId) {
        clearInterval(_intervalId);
        _intervalId = null;
    }
}

module.exports = { startWhatsappTrialJob, stopWhatsappTrialJob };

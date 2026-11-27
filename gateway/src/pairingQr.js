'use strict';

/**
 * WhatsApp pairing QR payload: ref,noisePub,identityPub,advSecret,platform.
 * A missing ref or secret is what the phone rejects as "couldn't link device".
 */
function isPublishablePairingQr(qr) {
    if (typeof qr !== 'string') return false;
    const parts = qr.split(',');
    if (parts.length < 5 || qr.length < 40) return false;
    return parts.every((part) => part && part !== 'undefined' && part !== 'null');
}

module.exports = { isPublishablePairingQr };

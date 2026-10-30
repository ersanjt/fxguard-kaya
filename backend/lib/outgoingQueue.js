/**
 * Kaya CRM — انتشار امضاشدهٔ پیام خروجی واتساپ روی RabbitMQ
 * @file    backend/lib/outgoingQueue.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 *
 * صف `outgoing_messages` مسیر HTTP و GATEWAY_API_SECRET را دور می‌زد؛ هرکس به RabbitMQ
 * دسترسی داشت می‌توانست از خط واتساپ پیام بفرستد. حالا هر پیام با HMAC-SHA256 روی بدنه
 * و کلید مشترک GATEWAY_API_SECRET امضا می‌شود و Gateway پیام بدون امضای معتبر را به DLQ می‌فرستد.
 */
'use strict';

const crypto = require('crypto');

const OUTGOING_QUEUE = 'outgoing_messages';
const SIGNATURE_HEADER = 'x-kaya-signature';

function currentSecret(env) {
    return String((env || process.env).GATEWAY_API_SECRET || '').trim();
}

function signOutgoingPayload(buf, secret) {
    const key = String(secret || '').trim();
    if (!key) return '';
    return crypto.createHmac('sha256', key).update(buf).digest('hex');
}

function verifyOutgoingSignature(buf, signature, secret) {
    const expected = signOutgoingPayload(buf, secret);
    if (!expected) return false;
    const given = String(signature || '').trim();
    if (given.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/**
 * @param {object} channel  کانال amqplib (ممکن است null باشد)
 * @param {object} payload  { to, message, media?, conversationId?, messageId? }
 * @param {object} [opts]   گزینه‌های اضافی sendToQueue
 * @returns {boolean|null}  نتیجهٔ sendToQueue، یا null اگر کانالی نبود
 */
function publishOutgoingMessage(channel, payload, opts = {}) {
    if (!channel || typeof channel.sendToQueue !== 'function') return null;
    const buf = Buffer.from(JSON.stringify(payload));
    const secret = currentSecret();
    const headers = { ...(opts.headers || {}) };
    if (secret) headers[SIGNATURE_HEADER] = signOutgoingPayload(buf, secret);
    return channel.sendToQueue(OUTGOING_QUEUE, buf, { persistent: true, ...opts, headers });
}

module.exports = {
    OUTGOING_QUEUE,
    SIGNATURE_HEADER,
    signOutgoingPayload,
    verifyOutgoingSignature,
    publishOutgoingMessage,
};

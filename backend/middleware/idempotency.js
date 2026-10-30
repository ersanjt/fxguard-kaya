/**
 * Kaya CRM — Idempotency-Key برای POSTهای مالی
 * @file    backend/middleware/idempotency.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 *
 * کلاینت هدر `Idempotency-Key` می‌فرستد (اختیاری؛ بدون هدر رفتار عادی).
 *  - اولین درخواست: ردیف in_progress ثبت می‌شود، هندلر اجرا و پاسخ (وضعیت + بدنه) ذخیره می‌شود.
 *  - تکرار همان کلید + همان بدنه: پاسخ ذخیره‌شده با هدر `Idempotent-Replayed: true` برمی‌گردد؛ هندلر اجرا نمی‌شود.
 *  - همان کلید + بدنهٔ متفاوت: 422 IDEMPOTENCY_KEY_REUSED.
 *  - هم‌زمان (هنوز in_progress): 409 IDEMPOTENCY_IN_PROGRESS.
 *  - پاسخ 5xx ذخیره نمی‌شود تا retry واقعی ممکن باشد.
 * دامنه: سازمان + کاربر + METHOD مسیر (با شناسهٔ منبع) + کلید.
 */
'use strict';

const crypto = require('crypto');
const logger = require('../config/logger');
const { normalizeTenantId } = require('../lib/tenantContext');

const KEY_PATTERN = /^[A-Za-z0-9_\-:.]{8,128}$/;
/** ردیف in_progress قدیمی‌تر از این، مال پروسه‌ای است که کرش کرده — قابل تصاحب */
const STALE_IN_PROGRESS_MS = 60 * 1000;
/** نگه‌داری کلیدها؛ بعد از آن تکرار همان کلید درخواست جدید محسوب می‌شود */
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const PURGE_INTERVAL_MS = 10 * 60 * 1000;

let lastPurgeAt = 0;

function hashBody(body) {
    const json = JSON.stringify(body === undefined ? null : body);
    return crypto.createHash('sha256').update(json).digest('hex');
}

function isUniqueViolation(err) {
    return !!err && (err.name === 'SequelizeUniqueConstraintError' || /unique|UNIQUE/i.test(err.message || ''));
}

function toPlain(body) {
    if (body === undefined) return null;
    try {
        return JSON.parse(JSON.stringify(body));
    } catch (_) {
        return null;
    }
}

async function purgeExpired(IdempotencyKey, ttlMs) {
    const now = Date.now();
    if (now - lastPurgeAt < PURGE_INTERVAL_MS) return;
    lastPurgeAt = now;
    const { Op } = require('sequelize');
    await IdempotencyKey.destroy({ where: { createdAt: { [Op.lt]: new Date(now - ttlMs) } } }).catch(() => {});
}

/**
 * @param {object} [opts]
 * @param {number} [opts.ttlMs]
 */
function idempotency(opts = {}) {
    const ttlMs = opts.ttlMs || DEFAULT_TTL_MS;

    return async function idempotencyMiddleware(req, res, next) {
        const raw = req.get('Idempotency-Key');
        if (!raw) return next();
        const key = String(raw).trim();
        if (!KEY_PATTERN.test(key)) {
            return res.status(400).json({
                error: 'Idempotency-Key نامعتبر است (۸ تا ۱۲۸ کاراکتر: حرف، عدد، - _ : .)',
                code: 'IDEMPOTENCY_KEY_INVALID',
            });
        }
        if (!req.user || !req.user.id) return next();

        const { IdempotencyKey } = require('../models');
        const tenantKey = normalizeTenantId(req.user.tenantId) || 'platform';
        const scope = `${req.method} ${req.baseUrl || ''}${req.path || ''}`.slice(0, 200);
        const requestHash = hashBody(req.body);
        const where = { tenantKey, userId: req.user.id, scope, key };

        let row;
        try {
            row = await IdempotencyKey.create({ ...where, requestHash, state: 'in_progress' });
        } catch (err) {
            if (!isUniqueViolation(err)) {
                logger.error('idempotency: store unavailable', { error: err.message });
                return res.status(503).json({ error: 'سرویس ثبت درخواست در دسترس نیست؛ دوباره تلاش کنید' });
            }
            const existing = await IdempotencyKey.findOne({ where }).catch(() => null);
            if (!existing) return next();

            const age = Date.now() - new Date(existing.updatedAt || existing.createdAt).getTime();
            if (existing.state === 'in_progress' && age > STALE_IN_PROGRESS_MS) {
                // پروسهٔ قبلی نیمه‌کاره مانده — تصاحب و اجرای دوباره
                await existing.update({ requestHash, state: 'in_progress', responseStatus: null, responseBody: null });
                row = existing;
            } else if (existing.requestHash !== requestHash) {
                return res.status(422).json({
                    error: 'این Idempotency-Key قبلاً با بدنهٔ درخواست دیگری استفاده شده است',
                    code: 'IDEMPOTENCY_KEY_REUSED',
                });
            } else if (existing.state !== 'completed') {
                return res.status(409).json({
                    error: 'درخواست قبلی با همین کلید هنوز در حال پردازش است',
                    code: 'IDEMPOTENCY_IN_PROGRESS',
                });
            } else {
                res.set('Idempotent-Replayed', 'true');
                return res.status(existing.responseStatus || 200).json(existing.responseBody);
            }
        }

        purgeExpired(IdempotencyKey, ttlMs).catch(() => {});

        let captured;
        const originalJson = res.json.bind(res);
        res.json = function patchedJson(body) {
            captured = body;
            return originalJson(body);
        };

        res.on('finish', () => {
            const status = res.statusCode;
            if (status >= 500) {
                // خطای سرور ذخیره نمی‌شود — کلاینت با همان کلید دوباره تلاش می‌کند
                row.destroy().catch(() => {});
                return;
            }
            row.update({ state: 'completed', responseStatus: status, responseBody: toPlain(captured) }).catch(
                (err) => logger.warn('idempotency: could not persist response', { error: err.message })
            );
        });

        next();
    };
}

module.exports = { idempotency, hashBody, KEY_PATTERN };

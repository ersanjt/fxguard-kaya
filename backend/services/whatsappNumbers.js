/**
 * مدیریت اسلات‌های شماره واتساپ + زنجیره Failover
 */
const { WhatsappNumber, WhatsappConnection } = require('../models');
const { getWhatsappConnectionConfig, invalidateCache } = require('../lib/whatsappConnectionLoader');

const PRIMARY_SLOT = 'primary';
const MAX_STANDBY = 5;

let _numbersCache = null;
let _numbersCacheTs = 0;
const NUMBERS_TTL_MS = 15000;

function invalidateNumbersCache() {
    _numbersCache = null;
    _numbersCacheTs = 0;
    invalidateCache();
}

function sanitizeNumberRow(row, { includeSecrets = false } = {}) {
    if (!row) return null;
    const j = typeof row.toJSON === 'function' ? row.toJSON() : { ...row };
    const out = {
        id: j.id,
        slotKey: j.slotKey,
        label: j.label || '',
        role: j.role || 'standby',
        priority: j.priority ?? 100,
        enabled: j.enabled !== false,
        transportPreference: j.transportPreference || 'inherit',
        displayPhone: j.displayPhone || '',
        cloudPhoneNumberId: j.cloudPhoneNumberId || '',
        cloudAccessTokenSet: !!(j.cloudAccessToken && String(j.cloudAccessToken).trim().length > 10),
        cloudVerifyTokenSet: !!(j.cloudVerifyToken && String(j.cloudVerifyToken).trim().length > 0),
        gatewayUrl: j.gatewayUrl || '',
        gatewayApiSecretSet: !!(j.gatewayApiSecret && String(j.gatewayApiSecret).trim().length > 0),
        gatewaySessionKey: j.gatewaySessionKey || '',
        useSharedGateway: j.useSharedGateway !== false,
        notes: j.notes || '',
        lastHealthyAt: j.lastHealthyAt || null,
        lastError: j.lastError || null,
        lastUsedAt: j.lastUsedAt || null,
        createdAt: j.createdAt,
        updatedAt: j.updatedAt,
        ready: false,
        readyReasons: [],
    };
    if (includeSecrets) {
        out.cloudAccessToken = j.cloudAccessToken || '';
        out.cloudVerifyToken = j.cloudVerifyToken || '';
        out.gatewayApiSecret = j.gatewayApiSecret || '';
    }
    return out;
}

function assessReady(sanitized, baseCfg) {
    const reasons = [];
    const pref = sanitized.transportPreference || 'inherit';
    const mode = pref === 'inherit' ? (baseCfg.connectionMode || 'cloud_first') : pref;
    const cloudTok = sanitized.cloudAccessTokenSet || !!(baseCfg.cloudAccessToken && sanitized.role === 'primary');
    const cloudPhone = !!(sanitized.cloudPhoneNumberId || (sanitized.role === 'primary' && baseCfg.cloudPhoneNumberId));
    const cloudOk = baseCfg.cloudEnabled !== false && cloudTok && cloudPhone;
    // For standby we require own Cloud credentials (or own gateway override) — shared gateway alone is not a second number.
    const ownCloud = sanitized.cloudAccessTokenSet && !!sanitized.cloudPhoneNumberId;
    const ownGateway = !!(sanitized.gatewayUrl && sanitized.gatewayUrl.trim());
    const sharedGw = sanitized.useSharedGateway !== false && baseCfg.gatewayEnabled !== false;

    if (sanitized.role === 'primary') {
        if (mode === 'gateway') {
            if (!sharedGw && !ownGateway) reasons.push('gateway_missing');
        } else if (mode === 'cloud') {
            if (!cloudOk) reasons.push('cloud_missing');
        } else {
            if (!cloudOk && !sharedGw && !ownGateway) reasons.push('no_transport');
        }
    } else {
        if (!ownCloud && !ownGateway) {
            reasons.push('standby_needs_own_cloud_or_gateway');
        }
    }

    sanitized.ready = reasons.length === 0;
    sanitized.readyReasons = reasons;
    return sanitized;
}

/**
 * اطمینان از وجود اسلات primary هم‌تراز با WhatsappConnection.default
 */
async function ensurePrimaryNumber() {
    let primary = null;
    try {
        primary = await WhatsappNumber.findOne({ where: { slotKey: PRIMARY_SLOT } });
    } catch (e) {
        if (/no such table|does not exist/i.test(String(e.message || ''))) return null;
        throw e;
    }

    const cfg = await getWhatsappConnectionConfig();
    let connRow = null;
    try {
        connRow = await WhatsappConnection.findByPk('default');
    } catch (_) {}

    const defaults = {
        label: 'شماره اصلی',
        role: 'primary',
        priority: 0,
        enabled: true,
        transportPreference: 'inherit',
        displayPhone: '',
        cloudAccessToken: (connRow && connRow.cloudAccessToken) || null,
        cloudPhoneNumberId: (connRow && connRow.cloudPhoneNumberId) || cfg.cloudPhoneNumberId || null,
        cloudVerifyToken: (connRow && connRow.cloudVerifyToken) || null,
        gatewayUrl: null,
        gatewayApiSecret: null,
        useSharedGateway: true,
        notes: 'اسلات اصلی — از تنظیمات اتصال واتساپ همگام می‌شود',
    };

    if (!primary) {
        primary = await WhatsappNumber.create({
            slotKey: PRIMARY_SLOT,
            ...defaults,
        });
        invalidateNumbersCache();
        return primary;
    }

    // Keep primary credentials mirrored from connection when primary fields empty or when syncing phone id
    let dirty = false;
    if (connRow) {
        if (connRow.cloudPhoneNumberId && primary.cloudPhoneNumberId !== connRow.cloudPhoneNumberId) {
            primary.cloudPhoneNumberId = connRow.cloudPhoneNumberId;
            dirty = true;
        }
        if (connRow.cloudAccessToken && primary.cloudAccessToken !== connRow.cloudAccessToken) {
            primary.cloudAccessToken = connRow.cloudAccessToken;
            dirty = true;
        }
        if (connRow.cloudVerifyToken != null && primary.cloudVerifyToken !== connRow.cloudVerifyToken) {
            primary.cloudVerifyToken = connRow.cloudVerifyToken;
            dirty = true;
        }
    }
    if (primary.role !== 'primary') {
        primary.role = 'primary';
        dirty = true;
    }
    if (primary.priority !== 0) {
        primary.priority = 0;
        dirty = true;
    }
    if (dirty) {
        await primary.save();
        invalidateNumbersCache();
    }
    return primary;
}

/**
 * پس از ذخیره تنظیمات اتصال اصلی، اسلات primary را همگام کن
 */
async function syncPrimaryFromConnection(connRow) {
    if (!connRow) return;
    try {
        const [primary] = await WhatsappNumber.findOrCreate({
            where: { slotKey: PRIMARY_SLOT },
            defaults: {
                label: 'شماره اصلی',
                role: 'primary',
                priority: 0,
                enabled: true,
                transportPreference: 'inherit',
                useSharedGateway: true,
            },
        });
        primary.role = 'primary';
        primary.priority = 0;
        if (connRow.cloudAccessToken !== undefined) primary.cloudAccessToken = connRow.cloudAccessToken;
        if (connRow.cloudPhoneNumberId !== undefined) primary.cloudPhoneNumberId = connRow.cloudPhoneNumberId;
        if (connRow.cloudVerifyToken !== undefined) primary.cloudVerifyToken = connRow.cloudVerifyToken;
        await primary.save();
        invalidateNumbersCache();
    } catch (e) {
        if (!/no such table|does not exist/i.test(String(e.message || ''))) {
            // non-fatal — connection still saved
            console.warn('[whatsappNumbers] syncPrimaryFromConnection:', e.message);
        }
    }
}

async function listNumbers() {
    const now = Date.now();
    if (_numbersCache && now - _numbersCacheTs < NUMBERS_TTL_MS) return _numbersCache;

    await ensurePrimaryNumber();
    const baseCfg = await getWhatsappConnectionConfig();
    let rows = [];
    try {
        rows = await WhatsappNumber.findAll({ order: [['priority', 'ASC'], ['createdAt', 'ASC']] });
    } catch (e) {
        if (/no such table|does not exist/i.test(String(e.message || ''))) return [];
        throw e;
    }
    const list = rows.map((r) => assessReady(sanitizeNumberRow(r), baseCfg));
    let failoverEnabled = true;
    try {
        const conn = await WhatsappConnection.findByPk('default');
        if (conn && conn.numberFailoverEnabled === false) failoverEnabled = false;
    } catch (_) {}

    const payload = {
        failoverEnabled,
        numbers: list,
        standbyCount: list.filter((n) => n.role === 'standby').length,
        readyStandbyCount: list.filter((n) => n.role === 'standby' && n.enabled && n.ready).length,
        canFailover: failoverEnabled && list.filter((n) => n.enabled && n.ready).length >= 2,
    };
    _numbersCache = payload;
    _numbersCacheTs = now;
    return payload;
}

function nextStandbySlotKey(existingKeys) {
    for (let i = 1; i <= MAX_STANDBY; i += 1) {
        const key = `standby-${i}`;
        if (!existingKeys.has(key)) return key;
    }
    return null;
}

async function createStandbyNumber(body = {}) {
    await ensurePrimaryNumber();
    const all = await WhatsappNumber.findAll({ attributes: ['slotKey', 'role'] });
    const standbyCount = all.filter((r) => r.role === 'standby').length;
    if (standbyCount >= MAX_STANDBY) {
        const err = new Error(`حداکثر ${MAX_STANDBY} شماره پشتیبان مجاز است`);
        err.status = 400;
        throw err;
    }
    const keys = new Set(all.map((r) => r.slotKey));
    const slotKey = nextStandbySlotKey(keys);
    if (!slotKey) {
        const err = new Error('اسلات پشتیبان خالی نیست');
        err.status = 400;
        throw err;
    }
    const priority = 10 + standbyCount * 10;
    const row = await WhatsappNumber.create({
        slotKey,
        label: String(body.label || `شماره پشتیبان ${standbyCount + 1}`).trim().slice(0, 128),
        role: 'standby',
        priority,
        enabled: body.enabled !== false,
        transportPreference: ['inherit', 'cloud', 'gateway', 'cloud_first'].includes(body.transportPreference)
            ? body.transportPreference
            : 'cloud',
        displayPhone: String(body.displayPhone || '').trim().slice(0, 32) || null,
        cloudAccessToken: body.cloudAccessToken ? String(body.cloudAccessToken).trim() : null,
        cloudPhoneNumberId: body.cloudPhoneNumberId ? String(body.cloudPhoneNumberId).trim() : null,
        cloudVerifyToken: body.cloudVerifyToken ? String(body.cloudVerifyToken).trim() : null,
        gatewayUrl: body.gatewayUrl ? String(body.gatewayUrl).trim().replace(/\/$/, '') : null,
        gatewayApiSecret: body.gatewayApiSecret ? String(body.gatewayApiSecret).trim() : null,
        gatewaySessionKey: body.gatewaySessionKey ? String(body.gatewaySessionKey).trim().slice(0, 64) : null,
        useSharedGateway: body.useSharedGateway !== false,
        notes: body.notes ? String(body.notes).trim().slice(0, 2000) : null,
    });
    invalidateNumbersCache();
    const baseCfg = await getWhatsappConnectionConfig();
    return assessReady(sanitizeNumberRow(row), baseCfg);
}

async function updateNumber(id, body = {}) {
    const row = await WhatsappNumber.findByPk(id);
    if (!row) {
        const err = new Error('شماره یافت نشد');
        err.status = 404;
        throw err;
    }
    if (body.label !== undefined) row.label = String(body.label || '').trim().slice(0, 128) || row.label;
    if (typeof body.enabled === 'boolean' && row.slotKey !== PRIMARY_SLOT) row.enabled = body.enabled;
    if (body.transportPreference && ['inherit', 'cloud', 'gateway', 'cloud_first'].includes(body.transportPreference)) {
        row.transportPreference = body.transportPreference;
    }
    if (body.displayPhone !== undefined) row.displayPhone = String(body.displayPhone || '').trim().slice(0, 32) || null;
    if (body.cloudAccessToken !== undefined) {
        const v = String(body.cloudAccessToken || '').trim();
        if (v) row.cloudAccessToken = v;
    }
    if (body.cloudPhoneNumberId !== undefined) {
        row.cloudPhoneNumberId = String(body.cloudPhoneNumberId || '').trim() || null;
    }
    if (body.cloudVerifyToken !== undefined) {
        row.cloudVerifyToken = String(body.cloudVerifyToken || '').trim() || null;
    }
    if (body.gatewayUrl !== undefined) {
        row.gatewayUrl = String(body.gatewayUrl || '').trim().replace(/\/$/, '') || null;
    }
    if (body.gatewayApiSecret !== undefined) {
        const v = String(body.gatewayApiSecret || '').trim();
        if (v) row.gatewayApiSecret = v;
    }
    if (body.gatewaySessionKey !== undefined) {
        row.gatewaySessionKey = String(body.gatewaySessionKey || '').trim().slice(0, 64) || null;
    }
    if (typeof body.useSharedGateway === 'boolean') row.useSharedGateway = body.useSharedGateway;
    if (body.notes !== undefined) row.notes = String(body.notes || '').trim().slice(0, 2000) || null;
    if (typeof body.priority === 'number' && row.role === 'standby') {
        row.priority = Math.max(1, Math.min(1000, Math.floor(body.priority)));
    }
    await row.save();

    // Mirror primary edits back to WhatsappConnection
    if (row.slotKey === PRIMARY_SLOT) {
        try {
            const [conn] = await WhatsappConnection.findOrCreate({
                where: { id: 'default' },
                defaults: { connectionMode: 'cloud_first' },
            });
            if (body.cloudAccessToken !== undefined && String(body.cloudAccessToken || '').trim()) {
                conn.cloudAccessToken = row.cloudAccessToken;
            }
            if (body.cloudPhoneNumberId !== undefined) conn.cloudPhoneNumberId = row.cloudPhoneNumberId;
            if (body.cloudVerifyToken !== undefined) conn.cloudVerifyToken = row.cloudVerifyToken;
            await conn.save();
        } catch (_) {}
    }

    invalidateNumbersCache();
    const baseCfg = await getWhatsappConnectionConfig();
    return assessReady(sanitizeNumberRow(row), baseCfg);
}

async function deleteNumber(id) {
    const row = await WhatsappNumber.findByPk(id);
    if (!row) {
        const err = new Error('شماره یافت نشد');
        err.status = 404;
        throw err;
    }
    if (row.slotKey === PRIMARY_SLOT || row.role === 'primary') {
        const err = new Error('شماره اصلی قابل حذف نیست');
        err.status = 400;
        throw err;
    }
    await row.destroy();
    invalidateNumbersCache();
    return { ok: true };
}

async function setFailoverEnabled(enabled) {
    const [conn] = await WhatsappConnection.findOrCreate({
        where: { id: 'default' },
        defaults: { connectionMode: 'cloud_first', numberFailoverEnabled: true },
    });
    conn.numberFailoverEnabled = !!enabled;
    await conn.save();
    invalidateNumbersCache();
    return !!conn.numberFailoverEnabled;
}

/**
 * ساخت تنظیمات ارسال مؤثر برای یک اسلات
 */
async function buildEffectiveConfigForNumber(numberRow, baseCfg) {
    const base = baseCfg || (await getWhatsappConnectionConfig());
    const j = typeof numberRow.toJSON === 'function' ? numberRow.toJSON() : numberRow;
    const pref = j.transportPreference || 'inherit';
    const mode = pref === 'inherit' ? (base.connectionMode || 'cloud_first') : pref;
    const isPrimary = j.slotKey === PRIMARY_SLOT || j.role === 'primary';

    const cloudAccessToken = (j.cloudAccessToken && String(j.cloudAccessToken).trim())
        || (isPrimary ? base.cloudAccessToken : '');
    const cloudPhoneNumberId = (j.cloudPhoneNumberId && String(j.cloudPhoneNumberId).trim())
        || (isPrimary ? base.cloudPhoneNumberId : '');
    const cloudVerifyToken = (j.cloudVerifyToken && String(j.cloudVerifyToken).trim())
        || (isPrimary ? base.cloudVerifyToken : '');

    const ownGw = j.gatewayUrl && String(j.gatewayUrl).trim();
    const useShared = j.useSharedGateway !== false;
    const gatewayUrl = ownGw || (useShared || isPrimary ? base.gatewayUrl : '');
    const gatewayApiSecret = (j.gatewayApiSecret && String(j.gatewayApiSecret).trim())
        || ((useShared || isPrimary) ? base.gatewayApiSecret : '');

    return {
        ...base,
        connectionMode: mode,
        cloudEnabled: isPrimary ? base.cloudEnabled !== false : !!(cloudAccessToken && cloudPhoneNumberId),
        cloudAccessToken,
        cloudPhoneNumberId,
        cloudVerifyToken,
        gatewayEnabled: isPrimary
            ? base.gatewayEnabled !== false
            : !!(ownGw || (useShared && base.gatewayEnabled !== false)),
        gatewayUrl,
        gatewayApiSecret,
        _numberId: j.id,
        _slotKey: j.slotKey,
        _role: j.role,
        _gatewaySessionKey: j.gatewaySessionKey || null,
    };
}

/**
 * زنجیره ارسال: primary سپس standbyهای آماده (اگر failover روشن باشد)
 */
async function resolveOutboundNumberChain(opts = {}) {
    const baseCfg = await getWhatsappConnectionConfig();
    let failoverEnabled = true;
    try {
        const conn = await WhatsappConnection.findByPk('default');
        if (conn && conn.numberFailoverEnabled === false) failoverEnabled = false;
    } catch (_) {}

    await ensurePrimaryNumber();
    let rows = [];
    try {
        rows = await WhatsappNumber.findAll({
            where: { enabled: true },
            order: [['priority', 'ASC'], ['createdAt', 'ASC']],
        });
    } catch (e) {
        if (/no such table|does not exist/i.test(String(e.message || ''))) {
            return [{ cfg: baseCfg, number: null }];
        }
        throw e;
    }

    if (!rows.length) return [{ cfg: baseCfg, number: null }];

    const preferredId = opts.preferredNumberId || null;
    if (preferredId) {
        rows = [
            ...rows.filter((r) => r.id === preferredId),
            ...rows.filter((r) => r.id !== preferredId),
        ];
    }

    const chain = [];
    for (const row of rows) {
        const cfg = await buildEffectiveConfigForNumber(row, baseCfg);
        const cloudOk = cfg.cloudEnabled && cfg.cloudAccessToken && cfg.cloudPhoneNumberId;
        const gwOk = cfg.gatewayEnabled && cfg.gatewayUrl;
        const isPrimary = row.role === 'primary' || row.slotKey === PRIMARY_SLOT;
        if (!isPrimary && !cloudOk && !gwOk) continue;
        if (!isPrimary && !failoverEnabled) continue;
        chain.push({ cfg, number: row });
        if (!failoverEnabled && isPrimary) break;
    }

    if (!chain.length) return [{ cfg: baseCfg, number: rows[0] || null }];
    return chain;
}

async function markNumberResult(numberId, { ok, error } = {}) {
    if (!numberId) return;
    try {
        const row = await WhatsappNumber.findByPk(numberId);
        if (!row) return;
        row.lastUsedAt = new Date();
        if (ok) {
            row.lastHealthyAt = new Date();
            row.lastError = null;
        } else if (error) {
            row.lastError = String(error).slice(0, 1000);
        }
        await row.save();
        invalidateNumbersCache();
    } catch (_) {}
}

module.exports = {
    PRIMARY_SLOT,
    MAX_STANDBY,
    invalidateNumbersCache,
    ensurePrimaryNumber,
    syncPrimaryFromConnection,
    listNumbers,
    createStandbyNumber,
    updateNumber,
    deleteNumber,
    setFailoverEnabled,
    buildEffectiveConfigForNumber,
    resolveOutboundNumberChain,
    markNumberResult,
    sanitizeNumberRow,
};

/**
 * Incident-style Telegram policy: threshold-based, low-noise, redacted.
 * Email and full logging stay elsewhere; this module gates operational TG alerts.
 *
 * Dedupe: optional per-key window to suppress duplicate Telegram bodies.
 * Correlation: short crm-* ids per incident for log/trace alignment.
 * Resolved: optional RECOVERED line for HTTP 5xx spike after quiet period.
 */
const crypto = require('crypto');
const logger = require('../config/logger');
const telegramService = require('./telegramService');
const { getPanelSettings, getPanelAlertConfig } = require('./config/panelSettingsLoader');

const SERVICE_NAME = process.env.INCIDENT_SERVICE_NAME || 'Kaya CRM Backend';
const ENV_LABEL = process.env.APP_ENV || process.env.NODE_ENV || 'development';
const IS_PROD = (process.env.NODE_ENV || 'development') === 'production';

const WINDOW_5XX_MS = parseInt(process.env.TELEGRAM_INCIDENT_5XX_WINDOW_MS || '300000', 10);
const THRESH_5XX = parseInt(process.env.TELEGRAM_INCIDENT_5XX_THRESHOLD || '20', 10);
const COOLDOWN_5XX_MS = parseInt(process.env.TELEGRAM_INCIDENT_5XX_COOLDOWN_MS || '120000', 10);

const WINDOW_LOGIN_FAIL_MS = parseInt(process.env.TELEGRAM_INCIDENT_LOGIN_FAIL_WINDOW_MS || '600000', 10);
const THRESH_LOGIN_FAIL = parseInt(process.env.TELEGRAM_INCIDENT_LOGIN_FAIL_THRESHOLD || '12', 10);
const COOLDOWN_LOGIN_FAIL_MS = parseInt(process.env.TELEGRAM_INCIDENT_LOGIN_FAIL_COOLDOWN_MS || '300000', 10);

const WINDOW_FE_MS = parseInt(process.env.TELEGRAM_INCIDENT_FE_ERR_WINDOW_MS || '300000', 10);
const THRESH_FE = parseInt(process.env.TELEGRAM_INCIDENT_FE_ERR_THRESHOLD || '8', 10);
const COOLDOWN_FE_MS = parseInt(process.env.TELEGRAM_INCIDENT_FE_ERR_COOLDOWN_MS || '120000', 10);

const WINDOW_BE_MS = parseInt(process.env.TELEGRAM_INCIDENT_BE_ERR_WINDOW_MS || '120000', 10);
const THRESH_BE = parseInt(process.env.TELEGRAM_INCIDENT_BE_ERR_THRESHOLD || '5', 10);
const COOLDOWN_BE_MS = parseInt(process.env.TELEGRAM_INCIDENT_BE_ERR_COOLDOWN_MS || '180000', 10);

const DEDUPE_TELEGRAM_MS = parseInt(process.env.TELEGRAM_INCIDENT_TELEGRAM_DEDUPE_MS || '90000', 10);
const RESOLVED_QUIET_MS = parseInt(process.env.TELEGRAM_INCIDENT_RESOLVED_QUIET_MS || '120000', 10);

const SENSITIVE_KEYS = new Set(
    [
        'password',
        'newpassword',
        'new_password',
        'token',
        'accesstoken',
        'access_token',
        'refreshtoken',
        'refresh_token',
        'authorization',
        'cookie',
        'set-cookie',
        'session',
        'sessionid',
        'otp',
        'totp',
        'secret',
        'apikey',
        'api_key',
        'clientsecret',
        'privatekey',
        'creditcard',
        'cardnumber',
        'cvv'
    ].map(k => k.toLowerCase())
);

const _5xxEvents = [];
let _last5xxAlert = 0;
const _feEvents = [];
let _lastFeAlert = 0;
const _loginFailByIp = new Map();
const _lastLoginFailAlertByIp = new Map();
const _beFingerprintEvents = new Map();
const _lastBeAlertByFp = new Map();

/** After a 5xx spike alert, set until traffic is healthy again (for one RESOLVED message). */
let _5xxSpikeOpenCorrelation = null;
let _last5xxAt = 0;
const _telegramDedupeAt = new Map();

function now() {
    return Date.now();
}

function prune(arr, windowMs) {
    const t = now();
    const cut = t - windowMs;
    while (arr.length && arr[0].t < cut) arr.shift();
}

function stripQuery(path) {
    const s = String(path || '');
    const i = s.indexOf('?');
    return i >= 0 ? s.slice(0, i) : s;
}

function escapeHtml(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function formatIncidentBlock(fields) {
    const lines = [
        `[${fields.severity}] ${fields.title}`,
        `Service: ${fields.service}`,
        `Env: ${fields.env}`,
        `Time: ${fields.time}`,
        fields.state ? `State: ${fields.state}` : null,
        fields.summary ? `Summary: ${fields.summary}` : null,
        fields.impact ? `Impact: ${fields.impact}` : null,
        fields.countRate ? `Count/Rate: ${fields.countRate}` : null,
        fields.identifiers ? `Route/User/IP: ${fields.identifiers}` : null,
        fields.suggestedAction ? `Suggested Action: ${fields.suggestedAction}` : null,
        fields.correlationId ? `Correlation ID: ${fields.correlationId}` : null
    ].filter(Boolean);
    return lines.join('\n');
}

function redactScalar(val) {
    let s = String(val);
    s = s.replace(/\bBearer\s+[\w-_.]+\b/gi, 'Bearer [redacted]');
    s = s.replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+\b/g, '[jwt_redacted]');
    if (s.length > 400) s = s.slice(0, 397) + '…';
    return s;
}

function redactPayload(obj, depth = 0) {
    if (obj == null || depth > 4) return obj;
    if (Array.isArray(obj)) return obj.slice(0, 20).map(x => redactPayload(x, depth + 1));
    if (typeof obj !== 'object') return redactScalar(obj);
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        const lk = k.toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (SENSITIVE_KEYS.has(lk)) {
            out[k] = '[redacted]';
            continue;
        }
        if (typeof v === 'object' && v !== null) out[k] = redactPayload(v, depth + 1);
        else if (typeof v === 'string') out[k] = redactScalar(v);
        else out[k] = v;
    }
    return out;
}

function payloadToIdentifiers(payload) {
    const p = redactPayload(payload || {});
    const parts = [];
    for (const k of ['path', 'pageUrl', 'method', 'userId', 'ip', 'identifier', 'conversationId', 'where']) {
        if (p[k] != null && p[k] !== '') parts.push(`${k}=${String(p[k]).slice(0, 160)}`);
    }
    return parts.length ? parts.join(' | ') : '—';
}

function formatSystemIncident(severity, title, summary, impact, countRate, payload, suggestedAction, correlationId, extra = {}) {
    return formatIncidentBlock({
        severity,
        title,
        service: SERVICE_NAME,
        env: ENV_LABEL,
        time: new Date().toISOString(),
        state: extra.state || null,
        summary,
        impact,
        countRate,
        identifiers: payloadToIdentifiers(payload),
        suggestedAction,
        correlationId: correlationId || null
    });
}

function newCorrelationId() {
    return `crm-${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Returns true if this Telegram send should be skipped (duplicate in window).
 * @param {string} key stable key per incident class
 * @param {number} [windowMs]
 */
function shouldSkipTelegramDedupe(key, windowMs) {
    if (!key) return false;
    const w = Number.isFinite(Number(windowMs)) ? Math.max(5000, Number(windowMs)) : DEDUPE_TELEGRAM_MS;
    const t = now();
    if (_telegramDedupeAt.size > 500) {
        for (const [k, ts] of _telegramDedupeAt) {
            if (t - ts > w * 4) _telegramDedupeAt.delete(k);
        }
    }
    const last = _telegramDedupeAt.get(key);
    if (last != null && t - last < w) return true;
    _telegramDedupeAt.set(key, t);
    return false;
}

function fingerprintBackendError(msg) {
    const s = String(msg || '').split('\n')[0].slice(0, 120);
    return s.replace(/\d+/g, '#');
}

/** HTTP finish hook — 5xx spikes, optional RESOLVED after quiet period. */
function onApiResponseFinished({ method, path, status, durationMs: _durationMs, userId, ip }) {
    const pathBase = stripQuery(path);
    const ip0 = String(ip || '').split(',')[0].trim() || '—';
    const t = now();

    if (status >= 500) {
        _last5xxAt = t;
        _5xxEvents.push({ t, status, path: pathBase, ip: ip0 });
        prune(_5xxEvents, WINDOW_5XX_MS);
        const c = _5xxEvents.length;
        if (c >= THRESH_5XX && t - _last5xxAlert >= COOLDOWN_5XX_MS) {
            _last5xxAlert = t;
            const correlationId = newCorrelationId();
            _5xxSpikeOpenCorrelation = correlationId;
            const uniq = [...new Set(_5xxEvents.map(e => e.path))].slice(0, 8).join(', ');
            const dedupeKey = `api_5xx_spike:${Math.floor(t / COOLDOWN_5XX_MS)}`;
            const text = formatSystemIncident(
                'CRITICAL',
                'HTTP 5xx spike',
                `At least ${c} server errors within ${Math.round(WINDOW_5XX_MS / 60000)} minutes.`,
                'Users may see failed actions; check logs and upstream services.',
                `${c} errors / ${Math.round(WINDOW_5XX_MS / 60000)} min window`,
                { method, path: pathBase, status, userId, ip: ip0, sampleRoutes: uniq },
                'Inspect error logs, DB, Redis, and gateway; scale or rollback if needed.',
                correlationId,
                { state: 'FIRING' }
            );
            return {
                text,
                kind: 'api_5xx_spike',
                meta: { dedupeKey, dedupeWindowMs: COOLDOWN_5XX_MS, correlationId }
            };
        }
    }

    prune(_5xxEvents, WINDOW_5XX_MS);
    if (
        _5xxSpikeOpenCorrelation &&
        t - _last5xxAt >= RESOLVED_QUIET_MS &&
        _5xxEvents.length === 0
    ) {
        const correlationId = _5xxSpikeOpenCorrelation;
        _5xxSpikeOpenCorrelation = null;
        const dedupeKey = `api_5xx_resolved:${correlationId}`;
        const text = formatSystemIncident(
            'INFO',
            'HTTP 5xx spike cleared',
            `No 5xx responses in the sliding window and no new 5xx for ${Math.round(RESOLVED_QUIET_MS / 1000)}s.`,
            'Service likely recovered; continue monitoring.',
            `Correlation: ${correlationId}`,
            { method, path: pathBase, userId, ip: ip0 },
            'Spot-check critical routes; close incident if all green.',
            correlationId,
            { state: 'RESOLVED' }
        );
        return {
            text,
            kind: 'api_5xx_resolved',
            meta: { dedupeKey, dedupeWindowMs: 86400000, correlationId }
        };
    }

    return null;
}

function recordLoginFailureForTelegram(ip) {
    const ip0 = String(ip || '').split(',')[0].trim() || 'unknown';
    const t = now();
    let arr = _loginFailByIp.get(ip0);
    if (!arr) {
        arr = [];
        _loginFailByIp.set(ip0, arr);
    }
    arr.push(t);
    prune(arr, WINDOW_LOGIN_FAIL_MS);
    return arr.length;
}

function shouldTelegramLoginFailure(ip) {
    const ip0 = String(ip || '').split(',')[0].trim() || 'unknown';
    const c = recordLoginFailureForTelegram(ip0);
    if (c < THRESH_LOGIN_FAIL) return { send: false, count: c };
    const t = now();
    const last = _lastLoginFailAlertByIp.get(ip0) || 0;
    if (t - last < COOLDOWN_LOGIN_FAIL_MS) return { send: false, count: c, cooldown: true };
    _lastLoginFailAlertByIp.set(ip0, t);
    return { send: true, count: c, ip: ip0 };
}

function recordFrontendErrorForTelegram() {
    const t = now();
    _feEvents.push({ t });
    prune(_feEvents, WINDOW_FE_MS);
    return _feEvents.length;
}

function shouldTelegramFrontendErrorBurst() {
    const c = recordFrontendErrorForTelegram();
    if (c < THRESH_FE) return { send: false, count: c };
    const t = now();
    if (t - _lastFeAlert < COOLDOWN_FE_MS) return { send: false, count: c, cooldown: true };
    _lastFeAlert = t;
    return { send: true, count: c };
}

function recordBackendErrorForTelegram(message) {
    const fp = fingerprintBackendError(message);
    const t = now();
    let arr = _beFingerprintEvents.get(fp);
    if (!arr) {
        arr = [];
        _beFingerprintEvents.set(fp, arr);
    }
    arr.push(t);
    prune(arr, WINDOW_BE_MS);
    return { count: arr.length, fp };
}

function shouldTelegramBackendError(message) {
    const { count, fp } = recordBackendErrorForTelegram(message);
    const t = now();
    const last = _lastBeAlertByFp.get(fp) || 0;
    const burst = count >= THRESH_BE;
    if (burst) {
        if (t - last < COOLDOWN_BE_MS) return { send: false, burst: true, count, cooldown: true };
        _lastBeAlertByFp.set(fp, t);
        return { send: true, burst: true, count, fp };
    }
    if (t - last >= COOLDOWN_BE_MS) {
        _lastBeAlertByFp.set(fp, t);
        return { send: true, burst: false, count, fp };
    }
    return { send: false, count, fp };
}

/**
 * Decides whether a systemEventNotifier-style event should hit Telegram,
 * and optionally replaces body with an incident-formatted string.
 */
function evaluateSystemEventTelegram(category, title, payload) {
    const t = String(title || '');

    if (t === 'Backend Started') return { mode: 'skip' };
    if (t === 'Login Success' || t === 'Login Success (2FA)' || t === 'Logout') return { mode: 'skip' };
    if (t === 'Login Failed') return { mode: 'skip' };
    if (t === 'Socket Connected' || t === 'Socket Disconnected') return { mode: 'skip' };
    if (t === 'Outgoing Message Sent') return { mode: 'skip' };
    if (t === 'Incoming Message Processed') return { mode: 'skip' };
    if (t === 'API Request') return { mode: 'skip' };
    if (t.indexOf('کاربر جدید') >= 0 || t.indexOf('تیکت') >= 0) return { mode: 'skip' };

    if (t === 'Backend Shutdown') {
        const correlationId = newCorrelationId();
        return {
            mode: 'send',
            bypassCategory: true,
            severity: 'CRITICAL',
            notifyMainAdmins: true,
            correlationId,
            mainAdminDedupeKey: 'ma:backend_shutdown',
            mainAdminDedupeWindowMs: 300000,
            text: formatSystemIncident(
                'CRITICAL',
                'Backend shutdown',
                'CRM API process is shutting down.',
                'Active sessions and webhooks may fail until restart.',
                null,
                redactPayload(payload),
                'Confirm intentional deploy/restart; watch health checks after up.',
                correlationId,
                { state: 'FIRING' }
            )
        };
    }

    if (t === 'Uncaught Exception' || t === 'Unhandled Rejection') {
        const rp = redactPayload(payload);
        const correlationId = newCorrelationId();
        return {
            mode: 'send',
            bypassCategory: true,
            severity: 'CRITICAL',
            notifyMainAdmins: true,
            correlationId,
            mainAdminDedupeKey: `ma:proc_fatal:${t}`,
            mainAdminDedupeWindowMs: 120000,
            text: formatSystemIncident(
                'CRITICAL',
                t,
                'Process-level failure — stability at risk.',
                'Requests may fail or process may exit.',
                null,
                rp,
                'Capture logs, fix code path, restart; inspect DB/Redis if related.',
                correlationId,
                { state: 'FIRING' }
            )
        };
    }

    if (t.indexOf('WhatsApp Gateway') >= 0) {
        const correlationId = newCorrelationId();
        return {
            mode: 'send',
            bypassCategory: true,
            severity: 'WARNING',
            notifyMainAdmins: true,
            correlationId,
            mainAdminDedupeKey: 'sysev:wa_gateway_disconnect',
            mainAdminDedupeWindowMs: 600000,
            dedupeKey: 'sysev:wa_gateway_disconnect',
            dedupeWindowMs: 600000,
            text: formatSystemIncident(
                'WARNING',
                'WhatsApp gateway disconnected',
                String((payload && payload.message) || t).slice(0, 400),
                'Outbound WhatsApp may stop until reconnected.',
                null,
                redactPayload(payload),
                'Check gateway session / QR; verify worker and network.',
                correlationId,
                { state: 'FIRING' }
            )
        };
    }

    if (category === 'error' && (t === 'Socket Send Message Error' || t === 'Incoming Message Error')) {
        const correlationId = newCorrelationId();
        return {
            mode: 'send',
            bypassCategory: true,
            severity: 'WARNING',
            notifyMainAdmins: true,
            correlationId,
            mainAdminDedupeKey: `ma:msg_err:${t}`,
            mainAdminDedupeWindowMs: DEDUPE_TELEGRAM_MS,
            dedupeKey: `sysev:msg_err:${t}`,
            dedupeWindowMs: DEDUPE_TELEGRAM_MS,
            text: formatSystemIncident(
                'WARNING',
                t,
                'Messaging pipeline reported an error.',
                'Staff or customers may not get messages.',
                null,
                redactPayload(payload),
                'Inspect gateway, queue, and DB; retry failed messages if safe.',
                correlationId,
                { state: 'FIRING' }
            )
        };
    }

    if (!IS_PROD && process.env.TELEGRAM_INCIDENT_DEV_VERBOSE !== '1') {
        if (category === 'system' && t !== 'Backend Shutdown') return { mode: 'skip' };
    }

    const correlationId = newCorrelationId();
    const sev = category === 'error' ? 'WARNING' : 'INFO';
    const dedupeKey = `sysev:${category}:${t.slice(0, 120)}`;
    return {
        mode: 'send',
        bypassCategory: false,
        severity: sev,
        dedupeKey,
        dedupeWindowMs: DEDUPE_TELEGRAM_MS,
        text: formatSystemIncident(
            sev,
            t,
            'System notification',
            'Review dashboard logs for full context.',
            null,
            redactPayload(payload),
            'Validate in panel and application logs.',
            correlationId,
            {}
        )
    };
}

async function deliverIncidentTelegram(text, kind, meta = {}) {
    try {
        const settings = await getPanelSettings();
        const cfg = getPanelAlertConfig(settings);

        if (kind === 'api_5xx_spike') {
            try {
                const { notifyMainAdminsIncident } = require('./mainAdminIncidentNotifier');
                await notifyMainAdminsIncident({
                    severity: 'CRITICAL',
                    kind: 'api_5xx_spike',
                    title: 'HTTP 5xx spike',
                    bodyText: text,
                    correlationId: meta.correlationId || null,
                    dedupeKey: meta.dedupeKey ? `ma:${meta.dedupeKey}` : 'ma:api_5xx_spike',
                    dedupeWindowMs: meta.dedupeWindowMs || COOLDOWN_5XX_MS
                });
            } catch (_) {}
        }

        if (!cfg.adminAlertsEnabled) return { ok: false, skipped: true, reason: 'alerts_disabled' };
        const tgConfig = {
            botToken: cfg.telegramBotToken,
            chatIds: cfg.telegramChatIds,
            timeoutMs: cfg.telegramTimeoutMs
        };
        if (!telegramService.isEnabled(tgConfig)) return { ok: false, skipped: true };

        if (
            (kind === 'api_5xx_spike' || kind === 'api_5xx_resolved') &&
            cfg.telegramNotifyErrorEvents === false
        ) {
            return { ok: false, skipped: true, reason: 'error_events_disabled' };
        }

        const win = meta.dedupeWindowMs != null ? Number(meta.dedupeWindowMs) : DEDUPE_TELEGRAM_MS;
        if (meta.dedupeKey && shouldSkipTelegramDedupe(meta.dedupeKey, win)) {
            return { ok: false, skipped: true, reason: 'telegram_deduped' };
        }

        return await telegramService.sendMessage(text, tgConfig, { parse_mode: null });
    } catch (err) {
        logger.warn('deliverIncidentTelegram failed', { error: err.message || String(err), kind });
        return { ok: false, error: err.message };
    }
}

module.exports = {
    redactPayload,
    formatSystemIncident,
    escapeHtml,
    onApiResponseFinished,
    evaluateSystemEventTelegram,
    deliverIncidentTelegram,
    shouldTelegramLoginFailure,
    shouldTelegramFrontendErrorBurst,
    shouldTelegramBackendError,
    shouldSkipTelegramDedupe,
    newCorrelationId,
    COOLDOWN_LOGIN_FAIL_MS,
    COOLDOWN_FE_MS,
    COOLDOWN_BE_MS,
    DEDUPE_TELEGRAM_MS,
    IS_PROD,
    ENV_LABEL,
    SERVICE_NAME
};

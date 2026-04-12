/**
 * Incident-style Telegram policy: threshold-based, low-noise, redacted.
 * Email and full logging stay elsewhere; this module gates operational TG alerts.
 */
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

function formatSystemIncident(severity, title, summary, impact, countRate, payload, suggestedAction, correlationId) {
    return formatIncidentBlock({
        severity,
        title,
        service: SERVICE_NAME,
        env: ENV_LABEL,
        time: new Date().toISOString(),
        summary,
        impact,
        countRate,
        identifiers: payloadToIdentifiers(payload),
        suggestedAction,
        correlationId: correlationId || null
    });
}

function fingerprintBackendError(msg) {
    const s = String(msg || '').split('\n')[0].slice(0, 120);
    return s.replace(/\d+/g, '#');
}

/** HTTP finish hook — 5xx spikes and login 401 bursts (same pattern as brute-force). */
function onApiResponseFinished({ method, path, status, durationMs: _durationMs, userId, ip }) {
    const pathBase = stripQuery(path);
    const ip0 = String(ip || '').split(',')[0].trim() || '—';
    const t = now();

    if (status >= 500) {
        _5xxEvents.push({ t, status, path: pathBase, ip: ip0 });
        prune(_5xxEvents, WINDOW_5XX_MS);
        const c = _5xxEvents.length;
        if (c >= THRESH_5XX && t - _last5xxAlert >= COOLDOWN_5XX_MS) {
            _last5xxAlert = t;
            const uniq = [...new Set(_5xxEvents.map(e => e.path))].slice(0, 8).join(', ');
            const text = formatSystemIncident(
                'CRITICAL',
                'HTTP 5xx spike',
                `At least ${c} server errors within ${Math.round(WINDOW_5XX_MS / 60000)} minutes.`,
                'Users may see failed actions; check logs and upstream services.',
                `${c} errors / ${Math.round(WINDOW_5XX_MS / 60000)} min window`,
                { method, path: pathBase, status, userId, ip: ip0, sampleRoutes: uniq },
                'Inspect error logs, DB, Redis, and gateway; scale or rollback if needed.',
                null
            );
            return { text, kind: 'api_5xx_spike' };
        }
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
        return {
            mode: 'send',
            bypassCategory: true,
            severity: 'CRITICAL',
            text: formatSystemIncident(
                'CRITICAL',
                'Backend shutdown',
                'CRM API process is shutting down.',
                'Active sessions and webhooks may fail until restart.',
                null,
                redactPayload(payload),
                'Confirm intentional deploy/restart; watch health checks after up.',
                null
            )
        };
    }

    if (t === 'Uncaught Exception' || t === 'Unhandled Rejection') {
        const rp = redactPayload(payload);
        return {
            mode: 'send',
            bypassCategory: true,
            severity: 'CRITICAL',
            text: formatSystemIncident(
                'CRITICAL',
                t,
                'Process-level failure — stability at risk.',
                'Requests may fail or process may exit.',
                null,
                rp,
                'Capture logs, fix code path, restart; inspect DB/Redis if related.',
                null
            )
        };
    }

    if (t.indexOf('WhatsApp Gateway') >= 0) {
        return {
            mode: 'send',
            bypassCategory: true,
            severity: 'WARNING',
            text: formatSystemIncident(
                'WARNING',
                'WhatsApp gateway disconnected',
                String((payload && payload.message) || t).slice(0, 400),
                'Outbound WhatsApp may stop until reconnected.',
                null,
                redactPayload(payload),
                'Check gateway session / QR; verify worker and network.',
                null
            )
        };
    }

    if (category === 'error' && (t === 'Socket Send Message Error' || t === 'Incoming Message Error')) {
        return {
            mode: 'send',
            bypassCategory: true,
            severity: 'WARNING',
            text: formatSystemIncident(
                'WARNING',
                t,
                'Messaging pipeline reported an error.',
                'Staff or customers may not get messages.',
                null,
                redactPayload(payload),
                'Inspect gateway, queue, and DB; retry failed messages if safe.',
                null
            )
        };
    }

    if (!IS_PROD && process.env.TELEGRAM_INCIDENT_DEV_VERBOSE !== '1') {
        if (category === 'system' && t !== 'Backend Shutdown') return { mode: 'skip' };
    }

    return {
        mode: 'send',
        bypassCategory: false,
        severity: category === 'error' ? 'WARNING' : 'INFO',
        text: formatSystemIncident(
            category === 'error' ? 'WARNING' : 'INFO',
            t,
            'System notification',
            'Review dashboard logs for full context.',
            null,
            redactPayload(payload),
            'Validate in panel and application logs.',
            null
        )
    };
}

async function deliverIncidentTelegram(text, kind) {
    try {
        const settings = await getPanelSettings();
        const cfg = getPanelAlertConfig(settings);
        if (!cfg.adminAlertsEnabled) return { ok: false, skipped: true, reason: 'alerts_disabled' };
        const tgConfig = {
            botToken: cfg.telegramBotToken,
            chatIds: cfg.telegramChatIds,
            timeoutMs: cfg.telegramTimeoutMs
        };
        if (!telegramService.isEnabled(tgConfig)) return { ok: false, skipped: true };

        if (kind === 'api_5xx_spike' && cfg.telegramNotifyErrorEvents === false) {
            return { ok: false, skipped: true, reason: 'error_events_disabled' };
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
    IS_PROD,
    ENV_LABEL,
    SERVICE_NAME
};

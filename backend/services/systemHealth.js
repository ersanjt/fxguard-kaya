/**
 * جمع‌آوری وضعیت سلامت سیستم (DB / Redis / Rabbit / Gateway / واتساپ / فرآیند / بکاپ)
 */
const fs = require('fs');
const path = require('path');
const { sequelize, Conversation, Message, Customer, User } = require('../models');
const { Op } = require('sequelize');
const { gatewayGet, getWhatsappConnectionConfig } = require('../lib/gatewayClient');

const startedAt = Date.now();

/** شمارنده‌های ساده در حافظه برای /metrics */
const counters = {
    httpRequestsTotal: 0,
    http5xxTotal: 0,
    gatewayStatusChecks: 0,
    gatewayStatusFailures: 0,
};

function bumpCounter(name, n = 1) {
    if (counters[name] == null) counters[name] = 0;
    counters[name] += n;
}

function recordHttpRequest(_method, status, durationMs) {
    counters.httpRequestsTotal += 1;
    if (status >= 500) counters.http5xxTotal += 1;
    if (typeof durationMs === 'number' && durationMs >= 0) {
        counters.httpDurationSumMs = (counters.httpDurationSumMs || 0) + durationMs;
        counters.httpDurationCount = (counters.httpDurationCount || 0) + 1;
    }
}

function getCounters() {
    return { ...counters };
}

async function checkDatabase() {
    const t0 = Date.now();
    try {
        await sequelize.authenticate();
        return { status: 'ok', latencyMs: Date.now() - t0 };
    } catch (e) {
        return { status: 'error', error: 'DB unreachable', latencyMs: Date.now() - t0 };
    }
}

async function checkRedis(redisClient) {
    const t0 = Date.now();
    try {
        if (!redisClient || redisClient.isStub) {
            return { status: 'disabled', latencyMs: 0 };
        }
        await redisClient.ping();
        return { status: 'ok', latencyMs: Date.now() - t0 };
    } catch (e) {
        return { status: 'error', error: 'Redis unreachable', latencyMs: Date.now() - t0 };
    }
}

function checkRabbit(getRabbitChannel) {
    const rabbitOk = typeof getRabbitChannel === 'function' ? !!getRabbitChannel() : false;
    const rabbitConfigured = !!process.env.RABBITMQ_URL;
    return {
        status: rabbitOk ? 'ok' : rabbitConfigured ? 'disconnected' : 'disabled',
        configured: rabbitConfigured,
    };
}

async function checkWhatsappGateway() {
    counters.gatewayStatusChecks += 1;
    const t0 = Date.now();
    try {
        const cfg = await getWhatsappConnectionConfig();
        const cloudOk = cfg.cloudEnabled && cfg.cloudAccessToken && cfg.cloudPhoneNumberId;
        const mode = cfg.connectionMode || 'cloud_first';
        const base = {
            mode,
            cloudConfigured: !!cloudOk,
            gatewayEnabled: cfg.gatewayEnabled !== false,
            latencyMs: 0,
        };

        if ((mode === 'cloud' || mode === 'cloud_first') && cloudOk && mode === 'cloud') {
            return {
                ...base,
                status: 'ok',
                channel: 'cloud',
                whatsapp: true,
                detail: 'Cloud API',
                latencyMs: Date.now() - t0,
            };
        }

        try {
            const r = await gatewayGet('/api/status', { timeout: 8000 });
            const data = r.data || {};
            const ready = !!(data.whatsapp || data.status === 'ready' || data.usable);
            base.latencyMs = Date.now() - t0;
            if (!ready) counters.gatewayStatusFailures += 1;
            return {
                ...base,
                status: ready ? 'ok' : data.status === 'starting' ? 'starting' : 'degraded',
                channel: 'gateway',
                whatsapp: ready,
                detail: data.status || (ready ? 'ready' : 'not_ready'),
                number: data.number || null,
                pushname: data.pushname || null,
                phase: data.phase || null,
                usable: !!data.usable,
            };
        } catch (gwErr) {
            counters.gatewayStatusFailures += 1;
            base.latencyMs = Date.now() - t0;
            if (cloudOk && mode === 'cloud_first') {
                return {
                    ...base,
                    status: 'degraded',
                    channel: 'cloud_fallback_available',
                    whatsapp: false,
                    detail: 'Gateway unreachable; Cloud may still send',
                    error: gwErr.code || gwErr.message || 'gateway_unreachable',
                };
            }
            return {
                ...base,
                status: 'error',
                channel: 'gateway',
                whatsapp: false,
                detail: 'Gateway unreachable',
                error: gwErr.response?.status === 401 ? 'auth_failed' : gwErr.code || gwErr.message || 'unreachable',
            };
        }
    } catch (e) {
        counters.gatewayStatusFailures += 1;
        return {
            status: 'error',
            whatsapp: false,
            error: e.message || 'whatsapp_check_failed',
            latencyMs: Date.now() - t0,
        };
    }
}

function checkBackups() {
    const backupDir = process.env.BACKUP_DIR || path.join(__dirname, '..', '..', 'backups');
    try {
        if (!fs.existsSync(backupDir)) {
            return { status: 'missing', path: backupDir, latest: null, count: 0 };
        }
        const files = fs
            .readdirSync(backupDir)
            .filter((f) => f.startsWith('db_') && f.endsWith('.sqlite'))
            .map((f) => {
                const full = path.join(backupDir, f);
                const st = fs.statSync(full);
                return { name: f, mtime: st.mtime.toISOString(), size: st.size };
            })
            .sort((a, b) => (a.mtime < b.mtime ? 1 : -1));
        if (!files.length) {
            return { status: 'empty', path: backupDir, latest: null, count: 0 };
        }
        const latest = files[0];
        const ageHours = (Date.now() - new Date(latest.mtime).getTime()) / 3600000;
        return {
            status: ageHours <= 36 ? 'ok' : ageHours <= 72 ? 'stale' : 'old',
            path: backupDir,
            latest,
            count: files.length,
            ageHours: Math.round(ageHours * 10) / 10,
        };
    } catch (e) {
        return { status: 'error', error: e.message };
    }
}

function processInfo() {
    const mem = process.memoryUsage();
    return {
        pid: process.pid,
        node: process.version,
        uptimeSec: Math.floor(process.uptime()),
        startedAt: new Date(startedAt).toISOString(),
        memory: {
            rss: mem.rss,
            heapUsed: mem.heapUsed,
            heapTotal: mem.heapTotal,
            external: mem.external,
        },
        env: process.env.NODE_ENV || 'development',
        sqlite: process.env.USE_SQLITE === 'true' || process.env.USE_SQLITE === '1',
    };
}

async function operationalCounts() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [openConversations, todayMessages, activeUsers, customers] = await Promise.all([
            Conversation.count({ where: { status: { [Op.in]: ['open', 'pending'] } } }),
            Message.count({ where: { timestamp: { [Op.gte]: today } } }),
            User.count({ where: { isActive: true } }),
            Customer.count({ where: { status: 'active' } }),
        ]);
        return { openConversations, todayMessages, activeUsers, customers };
    } catch (_) {
        return null;
    }
}

/**
 * @param {object} opts
 * @param {object} [opts.redisClient]
 * @param {function} [opts.getRabbitChannel]
 * @param {boolean} [opts.includeGateway=true]
 * @param {boolean} [opts.includeCounts=false]
 */
async function collectSystemHealth(opts = {}) {
    const includeGateway = opts.includeGateway !== false;
    const [database, redis, whatsapp, counts] = await Promise.all([
        checkDatabase(),
        checkRedis(opts.redisClient),
        includeGateway ? checkWhatsappGateway() : Promise.resolve({ status: 'skipped' }),
        opts.includeCounts ? operationalCounts() : Promise.resolve(null),
    ]);
    const rabbitmq = checkRabbit(opts.getRabbitChannel);
    const backups = checkBackups();
    const proc = processInfo();

    const gateway = includeGateway
        ? {
              status: whatsapp.status,
              channel: whatsapp.channel || null,
              latencyMs: whatsapp.latencyMs,
              detail: whatsapp.detail || null,
              error: whatsapp.error || null,
              usable: whatsapp.usable,
              number: whatsapp.number || null,
          }
        : { status: 'skipped' };

    const checks = { database, redis, rabbitmq, gateway, whatsapp, backups };
    let overall = 'ok';
    if (database.status === 'error') overall = 'error';
    else if (
        redis.status === 'error' ||
        rabbitmq.status === 'disconnected' ||
        whatsapp.status === 'error' ||
        whatsapp.status === 'degraded' ||
        backups.status === 'old' ||
        backups.status === 'error'
    ) {
        overall = 'degraded';
    } else if (whatsapp.status === 'starting' || backups.status === 'stale' || backups.status === 'empty') {
        overall = overall === 'ok' ? 'degraded' : overall;
    }

    const checkedAt = new Date().toISOString();
    return {
        status: overall,
        timestamp: checkedAt,
        checkedAt,
        uptime: proc.uptimeSec,
        checks,
        process: proc,
        counts: counts || undefined,
        counters: getCounters(),
    };
}

function toPrometheusText(health) {
    const lines = [];
    const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    lines.push('# HELP kaya_up 1 if overall status is ok');
    lines.push('# TYPE kaya_up gauge');
    lines.push(`kaya_up ${health.status === 'ok' ? 1 : 0}`);

    lines.push('# HELP kaya_status_code 0=ok 1=degraded 2=error');
    lines.push('# TYPE kaya_status_code gauge');
    lines.push(`kaya_status_code ${health.status === 'ok' ? 0 : health.status === 'degraded' ? 1 : 2}`);

    lines.push('# HELP kaya_process_uptime_seconds Process uptime');
    lines.push('# TYPE kaya_process_uptime_seconds gauge');
    lines.push(`kaya_process_uptime_seconds ${health.uptime || 0}`);

    lines.push('# HELP kaya_process_memory_rss_bytes RSS memory');
    lines.push('# TYPE kaya_process_memory_rss_bytes gauge');
    lines.push(`kaya_process_memory_rss_bytes ${(health.process && health.process.memory && health.process.memory.rss) || 0}`);

    const mapCheck = (name, c) => {
        const ok = c && (c.status === 'ok' || c.status === 'disabled' || c.status === 'skipped') ? 1 : 0;
        lines.push(`kaya_check_up{check="${esc(name)}"} ${ok}`);
        if (c && typeof c.latencyMs === 'number') {
            lines.push(`kaya_check_latency_ms{check="${esc(name)}"} ${c.latencyMs}`);
        }
    };
    lines.push('# HELP kaya_check_up Component health (1=ok/disabled)');
    lines.push('# TYPE kaya_check_up gauge');
    lines.push('# HELP kaya_check_latency_ms Component check latency');
    lines.push('# TYPE kaya_check_latency_ms gauge');
    if (health.checks) {
        Object.keys(health.checks).forEach((k) => mapCheck(k, health.checks[k]));
    }

    if (health.counts) {
        lines.push('# HELP kaya_open_conversations Open/pending conversations');
        lines.push('# TYPE kaya_open_conversations gauge');
        lines.push(`kaya_open_conversations ${health.counts.openConversations || 0}`);
        lines.push('# HELP kaya_messages_today Messages since local midnight');
        lines.push('# TYPE kaya_messages_today gauge');
        lines.push(`kaya_messages_today ${health.counts.todayMessages || 0}`);
    }

    const ctr = health.counters || {};
    lines.push('# HELP kaya_http_requests_total Approximate HTTP requests observed');
    lines.push('# TYPE kaya_http_requests_total counter');
    lines.push(`kaya_http_requests_total ${ctr.httpRequestsTotal || 0}`);
    lines.push('# HELP kaya_http_5xx_total Approximate HTTP 5xx responses');
    lines.push('# TYPE kaya_http_5xx_total counter');
    lines.push(`kaya_http_5xx_total ${ctr.http5xxTotal || 0}`);
    lines.push('# HELP kaya_gateway_status_checks_total Gateway status probes');
    lines.push('# TYPE kaya_gateway_status_checks_total counter');
    lines.push(`kaya_gateway_status_checks_total ${ctr.gatewayStatusChecks || 0}`);
    lines.push('# HELP kaya_gateway_status_failures_total Gateway status probe failures');
    lines.push('# TYPE kaya_gateway_status_failures_total counter');
    lines.push(`kaya_gateway_status_failures_total ${ctr.gatewayStatusFailures || 0}`);

    lines.push('');
    return lines.join('\n');
}

module.exports = {
    collectSystemHealth,
    toPrometheusText,
    bumpCounter,
    recordHttpRequest,
    getCounters,
    checkWhatsappGateway,
};

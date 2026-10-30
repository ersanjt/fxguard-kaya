/**
 * Kaya CRM — اجرای Gateway اختصاصی هر سازمان (یک پروسه و یک نشست واتساپ برای هر سازمان)
 * @file    backend/services/tenantGatewaySupervisor.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 *
 * مدیر سکو Gateway را برای سازمان روشن می‌کند؛ این سرویس پورت محلی می‌دهد، پروسه را با
 * secretهای مشتق‌شدهٔ همان سازمان اجرا می‌کند و اگر افتاد دوباره بالا می‌آورد.
 * نشست واتساپ بیرون از پوشهٔ کد نگه داشته می‌شود تا دیپلوی آن را پاک نکند.
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');
const { Op } = require('sequelize');
const {
    tenantGatewayApiSecret,
    tenantWebhookSecret,
    tenantGatewayUrl,
} = require('../lib/tenantGateway');
const { PLATFORM_SLUG } = require('../lib/tenantHost');

const GATEWAY_ENTRY = path.resolve(__dirname, '..', '..', 'gateway', 'src', 'index.js');
const BACKEND_UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');
const TENANT_ARG = '--tenant=';
const WATCHDOG_INTERVAL_MS = 60000;
const RESPAWN_COOLDOWN_MS = 120000;
const STOP_GRACE_MS = 10000;
const MAX_LOG_BYTES = 20 * 1024 * 1024;

/** فقط این متغیرها به Gateway سازمان می‌رسد؛ secretهای دیتابیس و JWT هرگز. */
const INHERITED_ENV = ['PATH', 'HOME', 'USER', 'LANG', 'TZ', 'NODE_ENV', 'LOG_LEVEL', 'FRONTEND_URL', 'REDIS_URL'];
const INHERITED_ENV_PREFIXES = ['PUPPETEER_', 'WHATSAPP_', 'MEDIA_', 'CHROME_'];

const lastSpawnAt = new Map();
let watchdogTimer = null;

function intEnv(name, fallback) {
    const n = parseInt(String(process.env[name] || ''), 10);
    return Number.isInteger(n) && n > 0 ? n : fallback;
}

function portBase() {
    return intEnv('TENANT_GATEWAY_PORT_BASE', 3400);
}

function maxGateways() {
    return intEnv('TENANT_GATEWAY_MAX', 20);
}

function dataRoot() {
    return process.env.TENANT_GATEWAY_DATA_DIR || path.join(os.homedir(), '.fxguard-tenant-gateways');
}

function spawnEnabled() {
    return process.env.TENANT_GATEWAY_SPAWN !== 'false' && process.env.NODE_ENV !== 'test';
}

function backendUrl() {
    return process.env.TENANT_GATEWAY_BACKEND_URL || 'http://127.0.0.1:' + (process.env.PORT || 3002);
}

function tenantDir(tenant) {
    return path.join(dataRoot(), String(tenant.id));
}

function pidFile(tenant) {
    return path.join(tenantDir(tenant), 'gateway.pid');
}

function versionFile(tenant) {
    return path.join(tenantDir(tenant), 'gateway.version');
}

let cachedCodeVersion = null;

/** هش کد و وابستگی‌های Gateway؛ اگر با نسخهٔ پروسهٔ در حال اجرا فرق کند، دیپلوی کد Gateway را عوض کرده است. */
function gatewayCodeVersion() {
    if (cachedCodeVersion !== null) return cachedCodeVersion;
    try {
        const hash = crypto.createHash('sha1');
        hash.update(fs.readFileSync(GATEWAY_ENTRY));
        const lock = path.resolve(path.dirname(GATEWAY_ENTRY), '..', 'package-lock.json');
        if (fs.existsSync(lock)) hash.update(fs.readFileSync(lock));
        cachedCodeVersion = hash.digest('hex').slice(0, 16);
    } catch (_) {
        cachedCodeVersion = '';
    }
    return cachedCodeVersion;
}

function runningVersion(tenant) {
    try {
        return fs.readFileSync(versionFile(tenant), 'utf8').trim();
    } catch (_) {
        return '';
    }
}

function httpError(status, code, message) {
    const err = new Error(message);
    err.status = status;
    err.code = code;
    return err;
}

function gatewayEnv(tenant) {
    const env = {};
    for (const [key, value] of Object.entries(process.env)) {
        if (INHERITED_ENV.includes(key) || INHERITED_ENV_PREFIXES.some((p) => key.startsWith(p))) {
            env[key] = value;
        }
    }
    const dir = tenantDir(tenant);
    return Object.assign(env, {
        NODE_ENV: process.env.NODE_ENV || 'production',
        PORT: String(tenant.gatewayPort),
        GATEWAY_TENANT_ID: String(tenant.id),
        GATEWAY_API_SECRET: tenantGatewayApiSecret(tenant.id),
        WEBHOOK_SECRET: tenantWebhookSecret(tenant.id),
        BACKEND_API_URL: backendUrl(),
        BACKEND_UPLOADS_DIR,
        UPLOADS_DIR: path.join(dir, 'uploads'),
        WHATSAPP_SESSION_PATH: path.join(dir, 'session'),
        GATEWAY_REDIS_PREFIX: 'tenant:' + tenant.id + ':',
        GATEWAY_DISABLE_RABBITMQ: 'true',
        INCOMING_VIA: 'http',
    });
}

/** پاسخ درست فقط از Gateway همین سازمان می‌آید (secret مشتق‌شده)، نه هر پروسه‌ای روی آن پورت. */
async function probeTenantGateway(tenant, timeout = 2500) {
    const url = tenantGatewayUrl(tenant.gatewayPort);
    if (!url) return { running: false, whatsapp: false, status: 'not_configured' };
    try {
        const res = await axios.get(url + '/api/status', {
            timeout,
            validateStatus: () => true,
            headers: { 'X-Gateway-Secret': tenantGatewayApiSecret(tenant.id) },
        });
        if (res.status === 401) return { running: false, whatsapp: false, status: 'port_conflict' };
        if (res.status !== 200) return { running: false, whatsapp: false, status: 'unhealthy' };
        const data = res.data || {};
        return {
            running: true,
            whatsapp: data.whatsapp === true,
            status: data.status || (data.whatsapp ? 'ready' : 'unknown'),
            number: data.number || null,
        };
    } catch (_) {
        return { running: false, whatsapp: false, status: 'stopped' };
    }
}

function readPid(tenant) {
    try {
        const pid = parseInt(fs.readFileSync(pidFile(tenant), 'utf8'), 10);
        return Number.isInteger(pid) && pid > 0 ? pid : null;
    } catch (_) {
        return null;
    }
}

/** شمارهٔ پروسهٔ قدیمی ممکن است به پروسهٔ دیگری رسیده باشد؛ روی لینوکس خط فرمان چک می‌شود. */
function pidBelongsToTenant(pid, tenant) {
    try {
        process.kill(pid, 0);
    } catch (_) {
        return false;
    }
    if (process.platform !== 'linux') return true;
    try {
        const cmdline = fs.readFileSync('/proc/' + pid + '/cmdline', 'utf8');
        return cmdline.includes(TENANT_ARG + tenant.slug);
    } catch (_) {
        return false;
    }
}

function spawnTenantGateway(tenant, logger) {
    if (!fs.existsSync(GATEWAY_ENTRY)) {
        throw httpError(500, 'GATEWAY_NOT_INSTALLED', 'فایل gateway/src/index.js روی سرور نیست');
    }
    const dir = tenantDir(tenant);
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const logPath = path.join(dir, 'gateway.log');
    try {
        if (fs.statSync(logPath).size > MAX_LOG_BYTES) fs.renameSync(logPath, logPath + '.1');
    } catch (_) {}
    const log = fs.openSync(logPath, 'a');
    try {
        // cwd پوشهٔ سازمان است تا gateway/.env سرور (مال Gateway سکو) خوانده نشود
        const child = spawn(process.execPath, [GATEWAY_ENTRY, TENANT_ARG + tenant.slug], {
            cwd: dir,
            env: gatewayEnv(tenant),
            detached: true,
            stdio: ['ignore', log, log],
        });
        child.unref();
        fs.writeFileSync(pidFile(tenant), String(child.pid));
        fs.writeFileSync(versionFile(tenant), gatewayCodeVersion());
        lastSpawnAt.set(tenant.id, Date.now());
        if (logger && logger.info) {
            logger.info('Tenant gateway started', { tenant: tenant.slug, port: tenant.gatewayPort, pid: child.pid });
        }
    } finally {
        fs.closeSync(log);
    }
}

async function startTenantGateway(tenant, logger) {
    const probe = await probeTenantGateway(tenant);
    if (probe.running) return probe;
    if (probe.status === 'port_conflict') {
        throw httpError(409, 'GATEWAY_PORT_CONFLICT', 'پورت Gateway این سازمان دست پروسهٔ دیگری است');
    }
    if (!spawnEnabled()) return probe;
    spawnTenantGateway(tenant, logger);
    return { running: false, whatsapp: false, status: 'starting' };
}

async function stopTenantGateway(tenant, logger) {
    const pid = readPid(tenant);
    try {
        fs.unlinkSync(pidFile(tenant));
    } catch (_) {}
    lastSpawnAt.delete(tenant.id);
    if (!pid || !pidBelongsToTenant(pid, tenant)) return;
    try {
        process.kill(pid, 'SIGTERM');
    } catch (_) {
        return;
    }
    const deadline = Date.now() + STOP_GRACE_MS;
    while (Date.now() < deadline && pidBelongsToTenant(pid, tenant)) {
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (pidBelongsToTenant(pid, tenant)) {
        try {
            process.kill(-pid, 'SIGKILL');
        } catch (_) {
            try {
                process.kill(pid, 'SIGKILL');
            } catch (_) {}
        }
    }
    if (logger && logger.info) logger.info('Tenant gateway stopped', { tenant: tenant.slug, pid });
}

async function allocatePort(Tenant, tenantId) {
    const rows = await Tenant.findAll({
        where: { gatewayPort: { [Op.ne]: null }, id: { [Op.ne]: tenantId } },
        attributes: ['gatewayPort'],
    });
    const used = new Set(rows.map((r) => r.gatewayPort));
    const base = portBase();
    for (let port = base; port < base + maxGateways(); port += 1) {
        if (!used.has(port)) return port;
    }
    throw httpError(409, 'TENANT_GATEWAY_LIMIT', 'سقف تعداد Gateway روی این سرور پر است');
}

async function loadCustomerTenant(tenantId) {
    const { Tenant } = require('../models');
    const row = await Tenant.findByPk(tenantId);
    if (!row) throw httpError(404, 'TENANT_NOT_FOUND', 'سازمان پیدا نشد');
    if (row.slug === PLATFORM_SLUG) {
        throw httpError(400, 'PLATFORM_TENANT', 'Gateway پنل سکو از تنظیمات سرور می‌آید');
    }
    return row;
}

async function invalidateWhatsappCaches() {
    const { invalidateCache } = require('../lib/whatsappConnectionLoader');
    invalidateCache();
    try {
        require('./whatsappNumbers').invalidateNumbersCache();
    } catch (_) {}
}

async function enableTenantGateway(tenantId, logger) {
    const { Tenant, WhatsappConnection } = require('../models');
    const row = await loadCustomerTenant(tenantId);
    if (!row.gatewayPort) row.gatewayPort = await allocatePort(Tenant, row.id);
    row.gatewayEnabled = true;
    await row.save();

    const [conn] = await WhatsappConnection.findOrCreate({
        where: { id: row.panelKey },
        defaults: { connectionMode: 'gateway', cloudEnabled: true, gatewayEnabled: true },
    });
    const cloudReady = !!(conn.cloudAccessToken && conn.cloudPhoneNumberId);
    conn.gatewayEnabled = true;
    conn.connectionMode = cloudReady ? 'cloud_first' : 'gateway';
    conn.gatewayUrl = null;
    conn.gatewayApiSecret = null;
    await conn.save();
    await invalidateWhatsappCaches();

    const gateway = await startTenantGateway(row, logger);
    return { tenantId: row.id, gatewayEnabled: true, gatewayPort: row.gatewayPort, gateway };
}

async function disableTenantGateway(tenantId, logger) {
    const { WhatsappConnection } = require('../models');
    const row = await loadCustomerTenant(tenantId);
    await stopTenantGateway(row, logger);
    row.gatewayEnabled = false;
    row.gatewayPort = null;
    await row.save();

    const conn = await WhatsappConnection.findByPk(row.panelKey);
    if (conn) {
        conn.gatewayEnabled = false;
        conn.connectionMode = 'cloud';
        await conn.save();
    }
    await invalidateWhatsappCaches();
    return { tenantId: row.id, gatewayEnabled: false };
}

async function restartTenantGateway(tenantId, logger) {
    const row = await loadCustomerTenant(tenantId);
    if (!row.gatewayEnabled || !row.gatewayPort) {
        throw httpError(400, 'GATEWAY_DISABLED', 'Gateway این سازمان خاموش است');
    }
    await stopTenantGateway(row, logger);
    const gateway = await startTenantGateway(row, logger);
    return { tenantId: row.id, gatewayEnabled: true, gatewayPort: row.gatewayPort, gateway };
}

/** Gatewayهای روشن را زنده نگه می‌دارد؛ بین دو اجرای مجدد فاصله می‌گذارد تا حلقهٔ کرش سرور را پر نکند. */
async function superviseTenantGateways(logger) {
    const { Tenant } = require('../models');
    const rows = await Tenant.findAll({
        where: { gatewayEnabled: true, gatewayPort: { [Op.ne]: null }, slug: { [Op.ne]: PLATFORM_SLUG } },
    });
    for (const row of rows) {
        const last = lastSpawnAt.get(row.id) || 0;
        if (Date.now() - last < RESPAWN_COOLDOWN_MS) continue;
        try {
            const current = gatewayCodeVersion();
            if (current && runningVersion(row) !== current && readPid(row)) {
                if (logger && logger.info) {
                    logger.info('Tenant gateway code changed — restarting', { tenant: row.slug });
                }
                await stopTenantGateway(row, logger);
            }
            await startTenantGateway(row, logger);
        } catch (err) {
            if (logger && logger.warn) {
                logger.warn('Tenant gateway supervise failed', { tenant: row.slug, error: err.message });
            }
        }
    }
}

function startTenantGatewayWatchdog(logger) {
    if (!spawnEnabled() || watchdogTimer) return;
    const tick = () => superviseTenantGateways(logger).catch((err) => {
        if (logger && logger.warn) logger.warn('Tenant gateway watchdog', { error: err.message });
    });
    tick();
    watchdogTimer = setInterval(tick, WATCHDOG_INTERVAL_MS);
    if (watchdogTimer.unref) watchdogTimer.unref();
}

function stopTenantGatewayWatchdog() {
    if (watchdogTimer) clearInterval(watchdogTimer);
    watchdogTimer = null;
}

module.exports = {
    enableTenantGateway,
    disableTenantGateway,
    restartTenantGateway,
    startTenantGateway,
    probeTenantGateway,
    startTenantGatewayWatchdog,
    stopTenantGatewayWatchdog,
};

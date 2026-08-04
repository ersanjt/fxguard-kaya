/**
 * بکاپ زمان‌بندی‌شده روزانه (DB + uploads + نشست واتساپ)
 * متغیرها:
 *   BACKUP_CRON_HOUR (پیش‌فرض 3) — ساعت محلی سرور
 *   BACKUP_CRON_MINUTE (پیش‌فرض 15)
 *   BACKUP_ENABLED=0 برای خاموش کردن
 * در PM2 cluster فقط instance 0 اجرا می‌کند.
 */
const logger = require('../config/logger');

const CHECK_INTERVAL_MS = 60 * 1000;
const BACKUP_HOUR = parseInt(process.env.BACKUP_CRON_HOUR || '3', 10);
const BACKUP_MINUTE = parseInt(process.env.BACKUP_CRON_MINUTE || '15', 10);

let _intervalId = null;
let _lastBackupDate = null;

function shouldSkipForThisWorker() {
    if (process.env.BACKUP_ALL_WORKERS === '1') return false;
    const inst = process.env.NODE_APP_INSTANCE;
    if (inst === undefined || inst === '') return false;
    return String(inst) !== '0';
}

async function runBackupOnce(reason) {
    if (process.env.BACKUP_ENABLED === '0' || process.env.BACKUP_ENABLED === 'false') {
        logger.info('Scheduled backup skipped (BACKUP_ENABLED=0)');
        return null;
    }
    if (shouldSkipForThisWorker()) return null;
    try {
        const { run } = require('../scripts/backup-all');
        const result = run();
        logger.info('Scheduled backup finished', {
            reason: reason || 'cron',
            ok: result && result.ok,
            files: result && result.files ? result.files.length : 0,
        });
        return result;
    } catch (err) {
        logger.error('Scheduled backup failed', { error: err.message });
        return null;
    }
}

function tick() {
    const now = new Date();
    const ymd = now.toISOString().slice(0, 10);
    if (_lastBackupDate === ymd) return;
    if (now.getHours() !== BACKUP_HOUR || now.getMinutes() !== BACKUP_MINUTE) return;
    _lastBackupDate = ymd;
    runBackupOnce('daily-cron').catch(() => {});
}

function startScheduledBackupJob() {
    if (_intervalId) return;
    if (process.env.NODE_ENV === 'test') {
        logger.info('Scheduled backup job disabled in test env');
        return;
    }
    _intervalId = setInterval(tick, CHECK_INTERVAL_MS);
    if (typeof _intervalId.unref === 'function') _intervalId.unref();
    logger.info('Scheduled backup job started', {
        hour: BACKUP_HOUR,
        minute: BACKUP_MINUTE,
        keep: process.env.BACKUP_KEEP_COUNT || '14',
    });
}

function stopScheduledBackupJob() {
    if (_intervalId) {
        clearInterval(_intervalId);
        _intervalId = null;
    }
}

module.exports = {
    startScheduledBackupJob,
    stopScheduledBackupJob,
    runBackupOnce,
};

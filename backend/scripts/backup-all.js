#!/usr/bin/env node
/**
 * بکاپ کامل سرور: دیتابیس SQLite + uploads + (اختیاری) نشست واتساپ Gateway
 * اجرا: node backend/scripts/backup-all.js
 * Cron داخل backend/jobs/scheduledBackup.js همین اسکریپت را صدا می‌زند.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const path = require('path');
const fs = require('fs');
const { execSync, execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const BACKEND = path.join(__dirname, '..');
const dbPath = process.env.SQLITE_PATH
    ? path.resolve(process.env.SQLITE_PATH)
    : path.join(BACKEND, 'database.sqlite');
const backupDir = process.env.BACKUP_DIR || path.join(ROOT, 'backups');
const keepCount = parseInt(process.env.BACKUP_KEEP_COUNT || '14', 10);
const sessionPath = process.env.WHATSAPP_SESSION_PATH
    ? path.resolve(process.env.WHATSAPP_SESSION_PATH)
    : path.join(ROOT, 'gateway', '.wwebjs_auth');
const uploadsPath = path.join(BACKEND, 'uploads');

function stamp() {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function rotate(prefix, ext) {
    const files = fs
        .readdirSync(backupDir)
        .filter((f) => f.startsWith(prefix) && f.endsWith(ext))
        .map((f) => ({ name: f, mtime: fs.statSync(path.join(backupDir, f)).mtime }))
        .sort((a, b) => b.mtime - a.mtime);
    while (files.length > keepCount) {
        const old = files.pop();
        try {
            fs.unlinkSync(path.join(backupDir, old.name));
            console.log('Removed old backup:', old.name);
        } catch (_) {}
    }
}

function copyDirRecursive(src, dest) {
    ensureDir(dest);
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const s = path.join(src, entry.name);
        const d = path.join(dest, entry.name);
        if (entry.isDirectory()) copyDirRecursive(s, d);
        else fs.copyFileSync(s, d);
    }
}

function tryTar(srcDir, destArchive) {
    try {
        execFileSync(
            'tar',
            ['-czf', destArchive, '-C', path.dirname(srcDir), path.basename(srcDir)],
            { stdio: 'pipe' }
        );
        return true;
    } catch (_) {
        return false;
    }
}

function backupDatabase(ts) {
    if (!fs.existsSync(dbPath)) {
        console.log('No database.sqlite found, skip DB backup');
        return null;
    }
    const name = `db_${ts}.sqlite`;
    const dest = path.join(backupDir, name);
    try {
        execSync(`sqlite3 "${dbPath}" "PRAGMA wal_checkpoint(FULL); VACUUM INTO '${dest.replace(/'/g, "''")}';"`, {
            stdio: 'pipe',
        });
    } catch (e) {
        // fallback: copy file (may be inconsistent under write load)
        fs.copyFileSync(dbPath, dest);
        const wal = dbPath + '-wal';
        const shm = dbPath + '-shm';
        if (fs.existsSync(wal)) fs.copyFileSync(wal, dest + '-wal');
        if (fs.existsSync(shm)) fs.copyFileSync(shm, dest + '-shm');
        console.warn('VACUUM INTO failed — used file copy fallback:', e.message);
    }
    if (!fs.existsSync(dest)) throw new Error('Backup file not created: ' + dest);
    const st = fs.statSync(dest);
    if (st.size < 1024) throw new Error('Backup file too small: ' + st.size);
    console.log('DB backup saved:', dest, `(${Math.round(st.size / 1024)} KB)`);
    rotate('db_', '.sqlite');
    return dest;
}

function backupFolder(label, src, prefix, ts) {
    if (!fs.existsSync(src)) {
        console.log(`No ${label} at ${src}, skip`);
        return null;
    }
    const tarName = `${prefix}_${ts}.tar.gz`;
    const tarDest = path.join(backupDir, tarName);
    if (tryTar(src, tarDest)) {
        console.log(`${label} backup saved:`, tarDest);
        rotate(prefix + '_', '.tar.gz');
        return tarDest;
    }
    const dirDest = path.join(backupDir, `${prefix}_${ts}`);
    copyDirRecursive(src, dirDest);
    console.log(`${label} backup copied to:`, dirDest);
    // rotation for directories
    const dirs = fs
        .readdirSync(backupDir)
        .filter((f) => f.startsWith(prefix + '_') && fs.statSync(path.join(backupDir, f)).isDirectory())
        .map((f) => ({ name: f, mtime: fs.statSync(path.join(backupDir, f)).mtime }))
        .sort((a, b) => b.mtime - a.mtime);
    while (dirs.length > keepCount) {
        const old = dirs.pop();
        fs.rmSync(path.join(backupDir, old.name), { recursive: true, force: true });
        console.log('Removed old backup dir:', old.name);
    }
    return dirDest;
}

function run() {
    const result = { ok: true, at: new Date().toISOString(), files: [] };
    try {
        ensureDir(backupDir);
        const ts = stamp();
        const db = backupDatabase(ts);
        if (db) result.files.push(db);
        const uploads = backupFolder('uploads', uploadsPath, 'uploads', ts);
        if (uploads) result.files.push(uploads);
        if (process.env.BACKUP_SKIP_WA_SESSION === '1') {
            console.log('WA session backup skipped (BACKUP_SKIP_WA_SESSION=1)');
        } else {
            const session = backupFolder('whatsapp-session', sessionPath, 'wa_session', ts);
            if (session) result.files.push(session);
        }
        const metaPath = path.join(backupDir, `backup_meta_${ts}.json`);
        fs.writeFileSync(metaPath, JSON.stringify(result, null, 2));
        console.log('Backup complete:', result.files.length, 'artifact(s)');
        return result;
    } catch (err) {
        console.error('Backup error:', err.message);
        result.ok = false;
        result.error = err.message;
        if (require.main === module) process.exit(1);
        throw err;
    }
}

if (require.main === module) {
    run();
}

module.exports = { run };

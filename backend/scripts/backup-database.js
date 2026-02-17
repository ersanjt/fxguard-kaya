#!/usr/bin/env node
/**
 * Backup دیتابیس SQLite — اجرا قبل از deploy یا به صورت cron
 * Run: node backend/scripts/backup-database.js
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const backupDir = process.env.BACKUP_DIR || path.join(__dirname, '..', '..', 'backups');
const keepCount = parseInt(process.env.BACKUP_KEEP_COUNT || '7', 10);

function run() {
  try {
    if (!fs.existsSync(dbPath)) {
      console.log('No database.sqlite found, skip backup');
      process.exit(0);
    }
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const name = `db_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.sqlite`;
    const dest = path.join(backupDir, name);
    fs.copyFileSync(dbPath, dest);
    console.log('Backup saved:', dest);

    const files = fs.readdirSync(backupDir)
      .filter((f) => f.startsWith('db_') && f.endsWith('.sqlite'))
      .map((f) => ({ name: f, mtime: fs.statSync(path.join(backupDir, f)).mtime }))
      .sort((a, b) => b.mtime - a.mtime);
    while (files.length > keepCount) {
      const old = files.pop();
      fs.unlinkSync(path.join(backupDir, old.name));
      console.log('Removed old backup:', old.name);
    }
  } catch (err) {
    console.error('Backup error:', err.message);
    process.exit(1);
  }
}

run();

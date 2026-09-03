#!/usr/bin/env node
/**
 * بعد از git reset روی سرور: gitSha و deployedAt را روی crm-build.json می‌نویسد
 * تا از روی https://kaya.fxguard.io/crm-build.json معلوم باشد کدام کامیت زنده است.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const file = path.join(__dirname, '..', 'public', 'crm-build.json');
const repoRoot = path.join(__dirname, '..', '..');

let gitSha = '';
let gitFull = '';
try {
    gitSha = execSync('git rev-parse --short HEAD', { cwd: repoRoot, encoding: 'utf8' }).trim();
    gitFull = execSync('git rev-parse HEAD', { cwd: repoRoot, encoding: 'utf8' }).trim();
} catch (_e) {}

let manifest = {};
try {
    manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (_e) {
    manifest = {};
}

manifest.gitSha = gitSha || manifest.gitSha || null;
manifest.gitCommit = gitFull || manifest.gitCommit || null;
manifest.deployedAt = new Date().toISOString();

fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log('[stamp-deploy]', JSON.stringify(manifest));

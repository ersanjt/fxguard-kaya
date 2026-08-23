#!/usr/bin/env node
/**
 * ادغام partialهای داشبورد به فایل‌های نهایی که Express سرو می‌کند.
 * - HTML: public/partials/dashboard/html-part-01.html … (به ترتیب عددی)
 * - JS:   public/js/dashboard/src/chunk-01.js … (به ترتیب عددی)
 * - نسخهٔ کش: یک BUILD_ID واحد در همه ?v= و crm-build.json
 *
 * استفاده: از پوشه backend اجرا کنید: npm run build:dashboard
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const BUILD_PLACEHOLDER = '__CRM_BUILD__';

function readNormalized(filePath) {
    return fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
}

function resolveBuildId() {
    const hash = crypto.createHash('sha256');
    const srcDir = path.join(root, 'public/js/dashboard/src');
    if (fs.existsSync(srcDir)) {
        fs.readdirSync(srcDir)
            .filter((f) => /^chunk-\d+\.js$/.test(f))
            .sort()
            .forEach((f) => hash.update(readNormalized(path.join(srcDir, f))));
    }
    const partialDir = path.join(root, 'public/partials/dashboard');
    if (fs.existsSync(partialDir)) {
        for (let i = 1; i < 100; i++) {
            const name = 'html-part-' + String(i).padStart(2, '0') + '.html';
            const p = path.join(partialDir, name);
            if (!fs.existsSync(p)) break;
            hash.update(readNormalized(p));
        }
    }
    const cssPath = path.join(root, 'public/css/dashboard.css');
    if (fs.existsSync(cssPath)) hash.update(readNormalized(cssPath));
    return hash.digest('hex').slice(0, 12);
}

function stampBuildId(content, buildId) {
    return content.split(BUILD_PLACEHOLDER).join(buildId);
}

function writeBuildManifest(buildId) {
    const manifest = {
        id: buildId,
        builtAt: new Date().toISOString()
    };
    const outPath = path.join(root, 'public', 'crm-build.json');
    fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    console.log('[bundle-dashboard] Wrote', outPath, '(' + buildId + ')');
}

function bundleJs() {
    const srcDir = path.join(root, 'public/js/dashboard/src');
    if (!fs.existsSync(srcDir)) {
        console.error('Missing:', srcDir);
        process.exit(1);
    }
    const files = fs
        .readdirSync(srcDir)
        .filter(function (f) {
            return /^chunk-\d+\.js$/.test(f);
        })
        .sort();
    if (files.length === 0) {
        console.error('No chunk-*.js files in', srcDir);
        process.exit(1);
    }
    let out = '';
    for (let i = 0; i < files.length; i++) {
        out += fs.readFileSync(path.join(srcDir, files[i]), 'utf8');
    }
    const outPath = path.join(root, 'public/js/dashboard.js');
    fs.writeFileSync(outPath, out, 'utf8');
    try {
        // Same parse the browser uses: a SyntaxError here would leave the live
        // panel stuck on an empty shell (window.showPage never assigned).
        // eslint-disable-next-line no-new-func
        new Function(out);
    } catch (e) {
        console.error('[bundle-dashboard] dashboard.js syntax error:', e && e.message);
        process.exit(1);
    }
    console.log('[bundle-dashboard] Wrote', outPath, '(' + files.length + ' chunks)');
}

function bundleHtml(buildId) {
    const partialDir = path.join(root, 'public/partials/dashboard');
    if (!fs.existsSync(partialDir)) {
        console.error('Missing:', partialDir);
        process.exit(1);
    }
    const files = [];
    for (let i = 1; i < 100; i++) {
        const name = 'html-part-' + String(i).padStart(2, '0') + '.html';
        const p = path.join(partialDir, name);
        if (!fs.existsSync(p)) break;
        files.push(p);
    }
    if (files.length === 0) {
        console.error('No html-part-*.html in', partialDir);
        process.exit(1);
    }
    let out = '';
    for (let i = 0; i < files.length; i++) {
        out += stampBuildId(fs.readFileSync(files[i], 'utf8'), buildId);
    }
    const outPath = path.join(root, 'public/dashboard.html');
    fs.writeFileSync(outPath, out, 'utf8');
    console.log('[bundle-dashboard] Wrote', outPath, '(' + files.length + ' partials)');
}

function stampLoginHtml(buildId) {
    const loginPath = path.join(root, 'public/login.html');
    if (!fs.existsSync(loginPath)) return;
    let raw = readNormalized(loginPath);
    raw = raw.replace(/\?v=[a-f0-9]+/gi, '?v=' + BUILD_PLACEHOLDER);
    raw = raw.replace(/content="[a-f0-9]+"/, 'content="' + BUILD_PLACEHOLDER + '"');
    fs.writeFileSync(loginPath, stampBuildId(raw, buildId), 'utf8');
    console.log('[bundle-dashboard] Stamped login.html');
}

const buildId = resolveBuildId();
writeBuildManifest(buildId);
bundleJs();
bundleHtml(buildId);
stampLoginHtml(buildId);
console.log('[bundle-dashboard] Build ID:', buildId);

#!/usr/bin/env node
/**
 * ادغام partialهای داشبورد به فایل‌های نهایی که Express سرو می‌کند.
 * - HTML: public/partials/dashboard/html-part-01.html … (به ترتیب عددی)
 * - JS:   public/js/dashboard/src/chunk-01.js … (به ترتیب عددی)
 *
 * استفاده: از پوشه backend اجرا کنید: npm run build:dashboard
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

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
    console.log('[bundle-dashboard] Wrote', outPath, '(' + files.length + ' chunks)');
}

function bundleHtml() {
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
        out += fs.readFileSync(files[i], 'utf8');
    }
    const outPath = path.join(root, 'public/dashboard.html');
    fs.writeFileSync(outPath, out, 'utf8');
    console.log('[bundle-dashboard] Wrote', outPath, '(' + files.length + ' partials)');
}

bundleJs();
bundleHtml();

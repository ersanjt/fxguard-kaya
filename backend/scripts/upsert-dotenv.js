#!/usr/bin/env node
/**
 * یک خط KEY=value را در فایل .env اضافه یا جایگزین می‌کند (مقدار تک‌خطی).
 */
'use strict';

const fs = require('fs');

function main() {
    const argv = process.argv.slice(2);
    if (argv.length < 3) {
        console.error('Usage: node upsert-dotenv.js <path-to-.env> <KEY> <value...>');
        process.exit(1);
    }
    const file = argv[0];
    const key = argv[1];
    const value = argv.slice(2).join('=');
    const keyPrefix = `${key}=`;

    let lines = [];
    try {
        const raw = fs.readFileSync(file, 'utf8');
        lines = raw.replace(/\r\n/g, '\n').split('\n');
    } catch (e) {
        if (e.code !== 'ENOENT') throw e;
    }

    let replaced = false;
    const out = lines.map((line) => {
        if (line.startsWith(keyPrefix)) {
            replaced = true;
            return keyPrefix + value;
        }
        return line;
    });
    if (!replaced) {
        out.push(keyPrefix + value);
    }
    fs.writeFileSync(file, out.join('\n').replace(/\n+$/, '') + '\n', 'utf8');
    console.error('upsert-dotenv:', key, 'ok');
}

main();

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const dash = fs.readFileSync(path.join(root, 'backend/public/js/dashboard.js'), 'utf8');
const faPath = path.join(root, 'backend/public/js/i18n-fa.js');
const faRaw = fs.readFileSync(faPath, 'utf8');
const vm = require('vm');
const ctx = { window: {} };
vm.runInNewContext(faRaw, ctx);
const faKeys = Object.keys(ctx.window.__I18N_FA || {});

const re = /\bt\s*\(\s*['"]([a-zA-Z0-9_]+)['"]/g;
const used = new Set();
let m;
while ((m = re.exec(dash))) used.add(m[1]);

const missing = [...used].filter((k) => !faKeys.includes(k)).sort();
console.log('t() keys in dashboard:', used.size);
console.log('i18n-fa keys:', faKeys.length);
console.log('Missing in i18n-fa:', missing.length);
if (missing.length) console.log(missing.join('\n'));

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const partial = fs.readFileSync(path.join(root, 'partials/site-footer.html'), 'utf8');
const match = partial.match(/<footer class="site-footer"[\s\S]*?<\/footer>/);
if (!match) throw new Error('no footer in partial');
const footer = match[0];
const skip = new Set(['privacy.html', 'terms.html', 'account-deletion.html', 'procurement.html']);

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === 'eu' || name === 'app.fxguard.io' || name === 'partials') continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (name.endsWith('.html') && !skip.has(name)) acc.push(full);
  }
  return acc;
}

let n = 0;
for (const file of walk(root)) {
  const html = fs.readFileSync(file, 'utf8');
  const next = html.replace(/<footer class="site-footer"[\s\S]*?<\/footer>/, footer);
  if (next !== html) {
    fs.writeFileSync(file, next);
    n += 1;
  }
}
console.log('footers updated', n);

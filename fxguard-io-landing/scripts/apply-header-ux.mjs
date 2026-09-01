import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VER = '20260901a';

const LANG_NEW = `<div class="lang-dropdown header-lang">
      <button type="button" class="lang-dropdown-toggle" aria-haspopup="listbox" aria-expanded="false" data-i18n-aria="aria_lang" aria-label="Language">
        <span class="lang-dropdown-code">EN</span>
        <svg class="lang-dropdown-chevron" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="lang-switch lang-dropdown-menu" role="listbox" hidden>
        <button type="button" data-lang="en" title="English" aria-label="English">English</button>
        <button type="button" data-lang="fa" title="فارسی" aria-label="فارسی">فارسی</button>
        <button type="button" data-lang="tr" title="Türkçe" aria-label="Türkçe">Türkçe</button>
        <button type="button" data-lang="ar" title="العربية" aria-label="العربية">العربية</button>
        <button type="button" data-lang="ru" title="Русский" aria-label="Русский">Русский</button>
      </div>
    </div>`;

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === 'app.fxguard.io') continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (name.endsWith('.html')) acc.push(full);
  }
  return acc;
}

const files = walk(root);
let changed = 0;
for (const file of files) {
  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  html = html.replace(
    /<div class="lang-switch header-lang" role="group" data-i18n-aria="aria_lang" aria-label="Language">[\s\S]*?<\/div>/,
    LANG_NEW
  );
  html = html.replace(/\/css\/landing\.css\?v=[^"']+/g, `/css/landing.css?v=${VER}`);
  html = html.replace(/\/css\/seo-pages\.css\?v=[^"']+/g, `/css/seo-pages.css?v=${VER}`);
  html = html.replace(/href="\/css\/seo-pages\.css"/g, `href="/css/seo-pages.css?v=${VER}"`);
  html = html.replace(/\/css\/blog\.css\?v=[^"']+/g, `/css/blog.css?v=${VER}`);
  html = html.replace(/\/js\/landing\.js\?v=[^"']+/g, `/js/landing.js?v=${VER}`);
  html = html.replace(/src="\/js\/landing\.js"/g, `src="/js/landing.js?v=${VER}"`);
  html = html.replace(/\/js\/gtm-i18n\.js\?v=[^"']+/g, `/js/gtm-i18n.js?v=${VER}`);
  html = html.replace(/\/js\/pages-i18n\.js\?v=[^"']+/g, `/js/pages-i18n.js?v=${VER}`);
  html = html.replace(/\/js\/site-yield\.js\?v=[^"']+/g, `/js/site-yield.js?v=${VER}`);
  if (html !== before) {
    fs.writeFileSync(file, html);
    changed += 1;
  }
}
console.log('updated', changed, 'of', files.length, 'html files');

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, '..', 'blog');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.html'));

function block(slug) {
  const base = `https://fxguard.io/blog/${slug}`;
  return [
    `    <link rel="alternate" hreflang="en" href="${base}?lang=en">`,
    `    <link rel="alternate" hreflang="fa" href="${base}?lang=fa">`,
    `    <link rel="alternate" hreflang="tr" href="${base}?lang=tr">`,
    `    <link rel="alternate" hreflang="ar" href="${base}?lang=ar">`,
    `    <link rel="alternate" hreflang="ru" href="${base}?lang=ru">`,
    `    <link rel="alternate" hreflang="x-default" href="${base}">`,
  ].join('\n');
}

for (const f of files) {
  const slug = f.replace(/\.html$/, '');
  const p = path.join(dir, f);
  let html = fs.readFileSync(p, 'utf8');
  const short = new RegExp(
    `    <link rel="alternate" hreflang="en" href="https://fxguard.io/blog/${slug}">\\r?\\n    <link rel="alternate" hreflang="x-default" href="https://fxguard.io/blog/${slug}">`
  );
  const full = block(slug);
  if (short.test(html)) {
    html = html.replace(short, full);
    fs.writeFileSync(p, html);
    console.log('updated', f);
  } else if (html.includes(`?lang=fa`) && html.includes(slug)) {
    console.log('already ok', f);
  } else {
    console.log('skip', f);
  }
}

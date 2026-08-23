import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sitemapPath = path.join(__dirname, '..', 'sitemap.xml');
let xml = fs.readFileSync(sitemapPath, 'utf8');

const slugs = [
  'where-whatsapp-on-personal-phones-costs-you',
  'whatsapp-team-inbox-vs-personal-phones',
  'self-hosted-whatsapp-crm-license',
  'whatsapp-crm-security-2fa',
  'multi-branch-whatsapp-for-exchange-offices',
  'buy-whatsapp-crm-cloud-vs-license-vs-managed',
  'how-to-try-fxguard-live-demo',
  'whatsapp-crm-pricing-explained',
  'whatsapp-crm-for-exchange-offices',
];

function hreflangBlock(slug) {
  const base = `https://fxguard.io/blog/${slug}`;
  return [
    `    <xhtml:link rel="alternate" hreflang="en" href="${base}?lang=en"/>`,
    `    <xhtml:link rel="alternate" hreflang="fa" href="${base}?lang=fa"/>`,
    `    <xhtml:link rel="alternate" hreflang="tr" href="${base}?lang=tr"/>`,
    `    <xhtml:link rel="alternate" hreflang="ar" href="${base}?lang=ar"/>`,
    `    <xhtml:link rel="alternate" hreflang="ru" href="${base}?lang=ru"/>`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${base}"/>`,
  ].join('\n');
}

for (const slug of slugs) {
  const loc = `    <loc>https://fxguard.io/blog/${slug}</loc>`;
  if (!xml.includes(loc)) continue;
  const re = new RegExp(
    `(  <url>\\r?\\n    <loc>https://fxguard.io/blog/${slug}</loc>)\\r?\\n    <lastmod>`,
    'm'
  );
  if (re.test(xml)) {
    xml = xml.replace(re, `$1\n${hreflangBlock(slug)}\n    <lastmod>`);
    console.log('patched', slug);
  } else {
    console.log('skip', slug);
  }
}

fs.writeFileSync(sitemapPath, xml);

/**
 * Build language homepages from index.html so crawlers see lang/dir/title/H1 in HTML.
 * Canonical paths: / (en) · /ir/ (fa) · /tr/ (tr) · /ae/ (ar) · /ru/ (ru)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const HREFLANG = `    <link rel="alternate" hreflang="x-default" href="https://fxguard.io/">
    <link rel="alternate" hreflang="en" href="https://fxguard.io/">
    <link rel="alternate" hreflang="en-GB" href="https://fxguard.io/eu/">
    <link rel="alternate" hreflang="fa" href="https://fxguard.io/ir/">
    <link rel="alternate" hreflang="fa-IR" href="https://fxguard.io/ir/">
    <link rel="alternate" hreflang="tr" href="https://fxguard.io/tr/">
    <link rel="alternate" hreflang="tr-TR" href="https://fxguard.io/tr/">
    <link rel="alternate" hreflang="ar" href="https://fxguard.io/ae/">
    <link rel="alternate" hreflang="ar-AE" href="https://fxguard.io/ae/">
    <link rel="alternate" hreflang="ru" href="https://fxguard.io/ru/">`;

const PAGES = [
  {
    dir: 'ir',
    lang: 'fa',
    textDir: 'rtl',
    canonical: 'https://fxguard.io/ir/',
    locale: 'fa_IR',
    geoRegion: 'IR',
    geoPlace: 'Tehran, Iran',
    crumb: 'ایران',
    title: 'واتساپ CRM صرافی و حواله ایران | نرخ روی همان پنل | fxguard.io',
    description: 'پنل واتساپ برای صرافی، حواله و میز مالی ایران. نرخ روی همان پنل. دفتر مشتری مال شرکت. ابر شروع ۴۹$/ماه (۱ شعبه، ۳ نفر). تجاری از ۲۴۹$ با بسته نرخ.',
    keywords: 'واتساپ CRM صرافی, پنل واتساپ صرافی, نرم‌افزار صرافی واتساپ, CRM حواله, نرخ ارز واتساپ',
    ogTitle: 'واتساپ CRM صرافی و حواله ایران | دفتر مشتری مال شرکت می‌ماند',
    ogDesc: 'نرخ را در واتساپ بگویید؛ دفتر مشتری مال شرکت بماند. ابر شروع ۴۹$ (۱ شعبه / ۳ نفر). تجاری از ۲۴۹$.',
    imageAlt: 'پنل کارکنان FXGuard: اینباکس واتساپ و نرخ ارز روی یک صفحه دسکتاپ',
    heroBadge: 'صرافی · حواله · فاینانس',
    heroTitle: 'نرخ را در واتساپ بدهید. دفتر مشتری مال شرکت بماند.',
    heroDesc: 'یک شماره برای شعبه. نیرو از پنل جواب می‌دهد. وقتی کسی می‌رود، چت و نرخ اعلام‌شده با شما می‌ماند — نه روی گوشی شخصی.',
    heroCtaWa: 'خرید در واتساپ',
    heroCtaDemo: 'دیدن پنل',
    heroCtaPrices: 'قیمت‌ها',
    heroOffer: 'از <strong>۴۹$/ماه</strong> · دمو با هماهنگی · بازگشت ۷روزه ماه اول ابر',
    heroCaption: 'همان پنلی که صراف با آن کار می‌کند — چت و نرخ کنار هم.',
  },
  {
    dir: 'tr',
    lang: 'tr',
    textDir: 'ltr',
    canonical: 'https://fxguard.io/tr/',
    locale: 'tr_TR',
    geoRegion: 'TR',
    geoPlace: 'Istanbul, Turkey',
    crumb: 'Türkiye',
    title: 'Döviz ve havale için WhatsApp CRM | FXGuard Türkiye',
    description: 'Kuru WhatsApp ile aynı panelde verin. Müşteri defteri şirkette kalır. Cloud Start $49/ay (1 şube, 3 personel). Business $249’dan FX paketiyle.',
    keywords: 'döviz WhatsApp CRM, havale WhatsApp, döviz bürosu CRM, şubeli WhatsApp paneli, FXGuard İstanbul',
    ogTitle: 'Döviz ve havale için WhatsApp CRM | FXGuard Türkiye',
    ogDesc: 'Kur, WhatsApp ile aynı panelde. Defter şirkette kalır. Cloud Start $49. Business $249’dan.',
    imageAlt: 'FXGuard personel paneli: WhatsApp gelen kutusu ve döviz kurları tek ekranda',
    heroBadge: 'Döviz · havale · finans',
    heroTitle: 'Kuru WhatsApp’tan verin. Defter personelle gitmesin.',
    heroDesc: 'Şirketin numarası. Ekip panelden yanıtlar. Biri ayrılınca sohbet ve söylenen kur sizde kalır — kişisel telefonda değil.',
    heroCtaWa: 'WhatsApp’tan satın al',
    heroCtaDemo: 'Paneli gör',
    heroCtaPrices: 'Fiyatlar',
    heroOffer: '<strong>$49/ay</strong>’dan · rehberli demo · ilk Cloud ayında 7 gün iade',
    heroCaption: 'Gişenin kullandığı panel — sohbet ve kur yan yana.',
  },
  {
    dir: 'ae',
    lang: 'ar',
    textDir: 'rtl',
    canonical: 'https://fxguard.io/ae/',
    locale: 'ar_AE',
    geoRegion: 'AE',
    geoPlace: 'Dubai, UAE',
    crumb: 'الإمارات',
    title: 'واتساب CRM للصرافة والحوالات | FXGuard الإمارات',
    description: 'سعر الصرف على نفس لوحة واتساب. دفتر العملاء ملك الشركة. بدء سحابي 49$/شهر. أعمال من 249$ مع حزمة الأسعار.',
    keywords: 'واتساب صرافة, CRM حوالات, لوحة واتساب شركات الصرافة, WhatsApp CRM دبي',
    ogTitle: 'واتساب CRM للصرافة والحوالات | FXGuard الإمارات',
    ogDesc: 'أعلن السعر على واتساب. دفتر العملاء يبقى للشركة. بدء 49$. أعمال من 249$.',
    imageAlt: 'لوحة موظفي FXGuard: صندوق وارد واتساب وأسعار الصرف على شاشة واحدة',
    heroBadge: 'صرافة · حوالة · مال',
    heroTitle: 'أعلن السعر على واتساب. دفتر العملاء يبقى للشركة.',
    heroDesc: 'رقم واحد للفرع. الموظفون يردّون من اللوحة. إذا غادر أحدهم، تبقى المحادثات والسعر المعلن عندكم — لا على هاتف شخصي.',
    heroCtaWa: 'اشترِ عبر واتساب',
    heroCtaDemo: 'شاهد اللوحة',
    heroCtaPrices: 'الأسعار',
    heroOffer: 'من <strong>49$/شهر</strong> · عرض موجّه · استرداد 7 أيام لأول شهر سحابي',
    heroCaption: 'اللوحة التي يستخدمها الصرّاف — الدردشة والأسعار معاً.',
  },
  {
    dir: 'ru',
    lang: 'ru',
    textDir: 'ltr',
    canonical: 'https://fxguard.io/ru/',
    locale: 'ru_RU',
    geoRegion: 'RU',
    geoPlace: 'Russia / CIS',
    crumb: 'Русский',
    title: 'WhatsApp CRM для обменников и переводов | FXGuard',
    description: 'Курс на той же панели, что и WhatsApp. Книга клиентов остаётся в компании. Cloud Start $49/мес. Business от $249 с FX.',
    keywords: 'WhatsApp CRM обменник, CRM для обменных пунктов, WhatsApp для денежных переводов, FXGuard',
    ogTitle: 'WhatsApp CRM для обменников и переводов | FXGuard',
    ogDesc: 'Назовите курс в WhatsApp. Книга клиентов остаётся в компании. Cloud Start $49.',
    imageAlt: 'Панель FXGuard: WhatsApp-inbox и курсы валют на одном экране',
    heroBadge: 'Обмен · переводы · финансы',
    heroTitle: 'Назовите курс в WhatsApp. Книга клиентов остаётся в компании.',
    heroDesc: 'Один номер компании. Сотрудники отвечают с панели. Если кто-то уходит, чаты и названная цена остаются у вас — не в личном телефоне.',
    heroCtaWa: 'Купить в WhatsApp',
    heroCtaDemo: 'Смотреть панель',
    heroCtaPrices: 'Цены',
    heroOffer: 'от <strong>$49/мес</strong> · демо с гидом · 7 дней возврата за первый месяц Cloud',
    heroCaption: 'Панель, которой пользуется кассир — чат и курсы рядом.',
  },
];

const EARLY_SCRIPT_OLD = `<script>
    (function () {
      try {
        var p = new URLSearchParams(location.search).get('lang');
        var s = null;
        try { s = localStorage.getItem('landing_lang'); } catch (e) {}
        var lang = p || s;
        if (!lang) {
          var langs = (navigator.languages || []).slice();
          langs.push(navigator.language || navigator.userLanguage || 'en');
          for (var i = 0; i < langs.length; i++) {
            var primary = String(langs[i] || '').toLowerCase().split('-')[0];
            if (primary === 'fa' || primary === 'ps') { lang = 'fa'; break; }
            if (primary === 'tr' || primary === 'az') { lang = 'tr'; break; }
            if (primary === 'ar') { lang = 'ar'; break; }
            if (primary === 'ru') { lang = 'ru'; break; }
          }
        }
        if (!lang) {
          try {
            var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
            var map = {
              'Asia/Tehran':'fa','Asia/Kabul':'fa','Europe/Istanbul':'tr',
              'Asia/Dubai':'ar','Asia/Riyadh':'ar','Asia/Qatar':'ar','Asia/Kuwait':'ar',
              'Asia/Bahrain':'ar','Asia/Muscat':'ar','Asia/Baghdad':'ar','Africa/Cairo':'ar',
              'Europe/Moscow':'ru'
            };
            lang = map[tz] || null;
          } catch (e2) {}
        }
        if (lang === 'fa' || lang === 'ar') {
          document.documentElement.lang = lang;
          document.documentElement.dir = 'rtl';
          document.documentElement.setAttribute('data-lang', lang);
        } else if (lang) {
          document.documentElement.lang = lang;
          document.documentElement.setAttribute('data-lang', lang);
        }
      } catch (e) {}
    })();
    </script>`;

function earlyScript(lang, textDir) {
  return `<script>
    (function () {
      try {
        document.documentElement.lang = '${lang}';
        document.documentElement.dir = '${textDir}';
        document.documentElement.setAttribute('data-lang', '${lang}');
        try { localStorage.setItem('landing_lang', '${lang}'); } catch (e) {}
      } catch (e2) {}
    })();
    </script>`;
}

function buildPage(src, p) {
  let html = src;
  html = html.replace('<html lang="en" dir="ltr">', `<html lang="${p.lang}" dir="${p.textDir}" data-lang="${p.lang}">`);
  const earlyRe = /<script>\s*\(function \(\) \{[\s\S]*?landing_lang[\s\S]*?<\/script>/;
  if (!earlyRe.test(html)) {
    throw new Error('index.html early lang script not found — update build-lang-homes.mjs');
  }
  html = html.replace(earlyRe, earlyScript(p.lang, p.textDir));
  html = html.replace(
    /<title>[\s\S]*?<\/title>/,
    `<title>${p.title}</title>`
  );
  html = html.replace(
    /<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${p.description}">`
  );
  html = html.replace(
    /<meta name="keywords" content="[^"]*">/,
    `<meta name="keywords" content="${p.keywords}">`
  );
  html = html.replace(/<meta name="geo\.region" content="[^"]*">/, `<meta name="geo.region" content="${p.geoRegion}">`);
  html = html.replace(/<meta name="geo\.placename" content="[^"]*">/, `<meta name="geo.placename" content="${p.geoPlace}">`);
  html = html.replace(
    /<link rel="canonical" href="[^"]*">[\s\S]*?<link rel="alternate" hreflang="x-default" href="https:\/\/fxguard\.io\/">/,
    `    <link rel="canonical" href="${p.canonical}">\n${HREFLANG}`
  );
  html = html.replace(/<meta property="og:locale" content="[^"]*">/, `<meta property="og:locale" content="${p.locale}">`);
  html = html.replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${p.canonical}">`);
  html = html.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${p.ogTitle}">`);
  html = html.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${p.ogDesc}">`);
  html = html.replace(/<meta property="og:image:alt" content="[^"]*">/, `<meta property="og:image:alt" content="${p.imageAlt}">`);
  html = html.replace(/<meta name="twitter:url" content="[^"]*">/, `<meta name="twitter:url" content="${p.canonical}">`);
  html = html.replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${p.ogTitle}">`);
  html = html.replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${p.ogDesc}">`);
  html = html.replace(/<meta name="twitter:image:alt" content="[^"]*">/, `<meta name="twitter:image:alt" content="${p.imageAlt}">`);

  html = html.replaceAll('href="/js/pages-i18n.js?v=20260825b"', 'href="/js/pages-i18n.js?v=20260826a"');
  html = html.replaceAll('href="/js/landing.js?v=20260825b"', 'href="/js/landing.js?v=20260826a"');
  html = html.replaceAll('href="/css/landing.css?v=20260825b"', 'href="/css/landing.css?v=20260826a"');
  html = html.replaceAll('src="/js/pages-i18n.js?v=20260825b"', 'src="/js/pages-i18n.js?v=20260826a"');
  html = html.replaceAll('src="/js/gtm-i18n.js?v=20260825b"', 'src="/js/gtm-i18n.js?v=20260826a"');
  html = html.replaceAll('src="/js/landing.js?v=20260825b"', 'src="/js/landing.js?v=20260826a"');

  html = html.replaceAll('<a href="/" class="logo" aria-label="FXGuard">', `<a href="${new URL(p.canonical).pathname}" class="logo" aria-label="FXGuard">`);
  html = html.replaceAll('<a href="/" class="logo footer-logo">', `<a href="${new URL(p.canonical).pathname}" class="logo footer-logo">`);

  const crumb = `                <div class="hero-copy">
                    <nav class="geo-crumb" aria-label="breadcrumb">
                      <a href="/">fxguard.io</a>
                      <span aria-hidden="true">/</span>
                      <span aria-current="page">${p.crumb}</span>
                    </nav>
                    <p class="hero-kicker" data-i18n="hero_badge">${p.heroBadge}</p>`;
  html = html.replace(
    `                <div class="hero-copy">
                    <p class="hero-kicker" data-i18n="hero_badge">Exchange · remittance · finance</p>`,
    crumb
  );
  html = html.replace(
    '<h1 id="hero-heading" data-i18n="hero_title">Quote the rate on WhatsApp. Keep the customer book.</h1>',
    `<h1 id="hero-heading" data-i18n="hero_title">${p.heroTitle}</h1>`
  );
  html = html.replace(
    '<p class="hero-desc" data-i18n="hero_desc">One company number. Staff reply from the panel. When someone leaves, chats and quoted prices stay with you — not on a personal phone.</p>',
    `<p class="hero-desc" data-i18n="hero_desc">${p.heroDesc}</p>`
  );
  html = html.replace(
    'data-i18n="hero_cta_wa">Buy on WhatsApp</a>',
    `data-i18n="hero_cta_wa">${p.heroCtaWa}</a>`
  );
  html = html.replace(
    'data-i18n="hero_cta_demo">See the panel</a>',
    `data-i18n="hero_cta_demo">${p.heroCtaDemo}</a>`
  );
  html = html.replace(
    'data-i18n="hero_cta_packages">Prices</a>',
    `data-i18n="hero_cta_packages">${p.heroCtaPrices}</a>`
  );
  html = html.replace(
    '<p class="hero-offer" data-i18n="hero_offer">From <strong>$49/mo</strong> · guided demo · 7-day money-back on first Cloud month</p>',
    `<p class="hero-offer" data-i18n="hero_offer">${p.heroOffer}</p>`
  );
  html = html.replace(
    '<figcaption data-i18n="hero_shot_caption">The panel your teller actually uses — chat and rates together.</figcaption>',
    `<figcaption data-i18n="hero_shot_caption">${p.heroCaption}</figcaption>`
  );
  html = html.replace(
    'alt="FXGuard panel: WhatsApp inbox and rates on one desktop screen"',
    `alt="${p.imageAlt}"`
  );

  html = html.replace(
    /"@id": "https:\/\/fxguard\.io\/#webpage",\s*"url": "https:\/\/fxguard\.io\/",\s*"name": "[^"]*"/,
    `"@id": "${p.canonical}#webpage",\n      "url": "${p.canonical}",\n      "name": "${p.ogTitle}"`
  );
  return html;
}

const src = readFileSync(join(root, 'index.html'), 'utf8');
for (const p of PAGES) {
  mkdirSync(join(root, p.dir), { recursive: true });
  writeFileSync(join(root, p.dir, 'index.html'), buildPage(src, p));
  console.log('wrote', p.dir + '/index.html');
}

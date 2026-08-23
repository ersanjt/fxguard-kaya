# همگام‌سازی لندینگ

## منبع اصلی (Source of Truth)

**`cpanel-landing/`** — نسخهٔ اصلی و حرفه‌ای لندینگ است.

## ساختار یکپارچه

| محیط | مسیر | فایل‌ها |
|------|------|---------|
| **cPanel** (kaya.fxguard.io) | `public_html/` | آپلود از `cpanel-landing/` |
| **Node.js** (kaya.fxguard.io) | `backend/public/` | همگام با cpanel-landing |

## تفاوت‌های backend

- **لینک‌ها:** `index.html` → `/`، `contact.html` → `/contact`
- **Get Started:** هدایت به `/dashboard` (پنل CRM)
- **PANEL_URL:** `/dashboard` در backend

## به‌روزرسانی

وقتی `cpanel-landing/` را تغییر می‌دهید، این فایل‌ها را در `backend/public/` به‌روز کنید:

- `landing.html` ← از `cpanel-landing/index.html` (با تطبیق لینک‌ها و `PANEL_URL=/dashboard`)
- `contact.html` ← از `cpanel-landing/contact.html`
- `pricing.html` / `whatsapp-crm.html` ← از `cpanel-landing/` (همان تطبیق `PANEL_URL`)
- `procurement.html` / `billing-success.html` ← از `cpanel-landing/` (صفحه تدارکات + بازگشت Stripe)
- `css/style.css` ← از `cpanel-landing/css/style.css`
- `css/landing.css` ← از `cpanel-landing/css/landing.css`
- `js/landing.js` ← از `cpanel-landing/js/landing.js`

## نگهداشت

- این کپی را **بدون تأیید جدا حذف نکنید**؛ برای همگام‌سازی با cPanel و سرو استاتیک Express (`/landing.html`) لازم است.
- مسیر ورود CRM همچنان `/` → `login.html` است؛ لندینگ مارکتینگ معمولاً روی `public_html` از `cpanel-landing/` سرو می‌شود.

# همگام‌سازی لندینگ

## منبع اصلی (Source of Truth)

**`cpanel-landing/`** — نسخهٔ اصلی و حرفه‌ای لندینگ است.

## ساختار یکپارچه

| محیط | مسیر | فایل‌ها |
|------|------|---------|
| **cPanel** (fxguard.io) | `public_html/` | آپلود از `cpanel-landing/` |
| **Node.js** (app.fxguard.io) | `backend/public/` | همگام با cpanel-landing |

## تفاوت‌های backend

- **لینک‌ها:** `index.html` → `/`، `contact.html` → `/contact`
- **Get Started:** هدایت به `/dashboard` (پنل CRM)
- **PANEL_URL:** `/dashboard` در backend

## به‌روزرسانی

وقتی `cpanel-landing/` را تغییر می‌دهید، این فایل‌ها را در `backend/public/` به‌روز کنید:

- `landing.html` ← از `cpanel-landing/index.html` (با تطبیق لینک‌ها)
- `contact.html` ← از `cpanel-landing/contact.html`
- `css/style.css` ← از `cpanel-landing/css/style.css`
- `js/landing.js` ← از `cpanel-landing/js/landing.js`

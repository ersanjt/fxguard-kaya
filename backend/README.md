# Backend — Kaya CRM API

> **نقشهٔ کامل:** [`docs/CODEBASE-MAP.md`](../docs/CODEBASE-MAP.md) · **مالک:** Ersan Jahed Tabrizi — [`docs/AUTHOR.md`](../docs/AUTHOR.md)

## ورود سریع

| کار | مسیر |
|-----|------|
| راه‌اندازی سرور | `server.js` |
| تنظیم Express / مسیرهای `/login` و `/dashboard` | `app/configureExpress.js` |
| همهٔ APIها | `routes/api.js` → `routes/*.js` |
| داشبورد استاتیک | `public/` — [`public/STRUCTURE.md`](public/STRUCTURE.md) |
| تست | `npm test` / `npm run test:all` |
| کیفیت | از ریشه: `npm run quality` |

## لایه‌ها (از بیرون به داخل)

```
HTTP Request
  → middleware/auth.js
  → routes/*.js          (نازک)
  → services/*.js        (منطق)
  → lib/*.js             (کمکی)
  → models/*.js          (Sequelize)
```

## پوشه‌های مهم

| پوشه | README / توضیح |
|------|----------------|
| `routes/` | یک فایل per resource — نگاشت در CODEBASE-MAP §۴.۱ |
| `services/` | [`services/README.md`](services/README.md) |
| `public/js/dashboard/src/` | منبع `dashboard.js` — [`public/js/dashboard/README.md`](public/js/dashboard/README.md) |
| `lib/projectMeta.js` | متادیتای مالک پروژه |

## دستورات (از `backend/`)

```bash
npm run build:dashboard   # بعد از ویرایش chunk یا html-part
npm run lint
npm run test:all
```

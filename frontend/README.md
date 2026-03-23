# `@kaya-crm/dashboard` — فرانت مدرن (Vite)

## ساختار

```
frontend/
  index.html          # فقط dev / smoke test (داشبورد کامل در backend است)
  vite.config.js
  jsconfig.json       # alias برای IDE (@core, @features, …)
  src/
    main.js           # ورودی باندل
    core/             # زمینه و قراردادها
    features/         # یک پوشه به ازای هر حوزه (مکالمات، مشتریان، …)
    shared/           # کمک‌توابع مشترک
    platform/         # اتصال سرور، بعداً bridge با legacy
```

## اسکریپت‌ها

| دستور | معنی |
|--------|------|
| `npm run dev` | سرور Vite + HMR (پورت ۵۱۷۳)، پروکسی `/api` و WebSocket به `:3000` |
| `npm run build` | خروجی در `../backend/public/js/app/` |
| `npm run preview` | پیش‌نمایش بیلد production |

## Aliasها (در import)

- `@/` → `src/`
- `@core`, `@features`, `@shared`, `@platform` — مطابق `vite.config.js`

## رابطه با `dashboard.js`

تا وقتی مهاجرت کامل نشده، کاربران نهایی همچنان **`/js/dashboard.js`** را از بک‌اند می‌گیرند. این پروژه **مسیر استاندارد برای کدهای جدید** است؛ جزئیات فازها در `docs/FRONTEND-MODERNIZATION.md`.

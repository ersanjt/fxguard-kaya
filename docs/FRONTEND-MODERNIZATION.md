# مدرن‌سازی فرانت داشبورد (مسیر صنعتی)

## وضعیت

| لایه | مسیر | نقش |
|------|------|-----|
| **Legacy (فعال در production)** | `backend/public/js/dashboard.js` | کل منطق فعلی؛ اسکریپت کلاسیک، `window.*` برای onclick |
| **منبع تکه‌ای legacy** | `backend/public/js/dashboard/src/chunk-*.js` | ویرایش راحت‌تر + `npm run build:dashboard` |
| **Stack جدید (ESM + Vite)** | `frontend/` | ساختار feature-based، import/export، بیلد با hash |

داشبورد کاربر هنوز از **`/dashboard`** و **`dashboard.js`** تغذیه می‌شود. پوشه **`frontend/`** برای **مهاجرت تدریجی** و استاندارد صنعتی است.

## چرا دو مسیر؟

- جابه‌جایی یک‌بارهٔ ~۱۰هزار خط به ES modules ریسک بالا دارد.
- با Vite می‌توان **ماژول به ماژول** منتقل کرد و هر مرحله را تست کرد.

## دستورات

از ریشهٔ مخزن:

```bash
cd frontend && npm install && npm run dev
```

- مرورگر: `http://127.0.0.1:5173` — صفحهٔ توسعهٔ سبک (نه کل داشبورد).
- بک‌اند API روی `3000` باید بالا باشد (پروکسی در `vite.config.js`).

بیلد استاتیک (خروجی در `backend/public/js/app/`):

```bash
cd frontend && npm run build
```

## فازهای پیشنهادی

1. **فاز ۰ (انجام شد)** — اسکلت `frontend/`، aliasها، مستندات.
2. **فاز ۱** — استخراج **هسته**: `apiFetch`، تنظیمات، نوع پاسخ API → `@core` / `@shared`.
3. **فاز ۲** — یک feature کوچک (مثلاً فقط helperهای مکالمات) بدون تغییر HTML.
4. **فاز ۳** — بارگذاری باندل Vite در `dashboard.html` به‌صورت `<script type="module">` **کنار** legacy، سپس حذف تدریجی تکرار.
5. **فاز ۴** — TypeScript جزیی (`allowJs`) یا کامل روی `frontend/src`.

## استانداردهای داخل `frontend/src`

- **`core/`** — زمینهٔ اپ، قرارداد سرویس‌ها (بدون وابستگی به DOM خاص یک صفحه).
- **`features/<name>/`** — منطق دامنهٔ یک بخش؛ بدون import از feature دیگر.
- **`shared/`** — توابع و کامپوننت‌های بی‌طرف.
- **`platform/`** — سوکت، bridge به `window`، سازگاری با legacy.

## مراجع

- `frontend/README.md`
- `backend/docs/FRONTEND-ARCHITECTURE.md`

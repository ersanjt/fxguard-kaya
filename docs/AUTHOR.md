# مالکیت و امضای کد — Kaya CRM

## مالک پروژه

| فیلد | مقدار |
|------|--------|
| **نام** | Ersan Jahed Tabrizi |
| **ایمیل** | ersanjahedtabrizi@gmail.com |
| **محصول** | Kaya CRM (مخزن: `fxguard-kaya`) |
| **دامنهٔ production** | https://kaya.fxguard.io |

---

## قرارداد امضا در فایل‌های جدید

هر فایل **منبع** (نه خروجی build) که ایجاد یا بازنویسی می‌شود، در **۱۰ خط اول** این بلوک را داشته باشد:

### JavaScript (Node / مرورگر)

```javascript
/**
 * Kaya CRM — [نام ماژول به فارسی یا انگلیسی]
 * @file    [مسیر نسبی فایل]
 * @layer   backend | gateway | frontend/dashboard | frontend/login
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
```

### HTML (partialها)

```html
<!-- Kaya CRM | Ersan Jahed Tabrizi | docs/CODEBASE-MAP.md | [نام بخش] -->
```

### CSS

```css
/* Kaya CRM | Ersan Jahed Tabrizi | docs/CODEBASE-MAP.md | [نام بخش] */
```

---

## فایل‌هایی که **نباید** دستی امضا یا ویرایش شوند

| فایل | دلیل |
|------|------|
| `backend/public/js/dashboard.js` | خروجی `npm run build:dashboard` — منبع: `chunk-*.js` |
| `backend/public/dashboard.html` | خروجی build — منبع: `partials/dashboard/html-part-*.html` |

همیشه **منبع** را ویرایش کن، سپس build بزن.

---

## متادیتای برنامه‌ای

برای نمایش در API یا لاگ (در صورت نیاز):

```javascript
const { PROJECT_META } = require('./lib/projectMeta');
// PROJECT_META.owner.name, PROJECT_META.owner.email
```

فایل: `backend/lib/projectMeta.js`

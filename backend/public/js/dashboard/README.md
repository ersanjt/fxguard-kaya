# منبع `dashboard.js`

> **نقشهٔ کامل پروژه:** [`../../../docs/CODEBASE-MAP.md`](../../../docs/CODEBASE-MAP.md)  
> **مالک:** Ersan Jahed Tabrizi — [`../../../docs/AUTHOR.md`](../../../docs/AUTHOR.md)

فایل **`public/js/dashboard.js`** در مرورگر سرو می‌شود و از ادغام این قطعه‌ها ساخته می‌شود.

## جدول chunkها — کجا را ویرایش کنم؟

| فایل | جستجو در فایل (نشانگر) | چه چیزی اینجاست |
|------|------------------------|-----------------|
| `src/chunk-01.js` | هدر `@file chunk-01` | `token`, `persistAuthToken`, نرخ ارز، تیکر، صرافی، سوکت پایه |
| `src/chunk-02.js` | `chunk-02 \| login` | **`login`**, **`logout`**, `apiFetch`, **`setupGlobalDelegatedHandlers`** |
| `src/chunk-03.js` | `chunk-03 \| مکالمات` | **`loadConversations`**, **`openChat`**, **`sendMsg`**, `setupGlobalEventHandlers` |
| `src/chunk-04.js` | `chunk-04 \| showPage` | **`showPage`**, `applyHashRoute`, **`loadPanelSettings`**, مشتریان، تسک |
| `src/chunk-05.js` | `chunk-05 \| کاربران` | **`renderUserList`**, تیکت، دپارتمان، شعب |
| `src/chunk-06.js` | `chunk-06 \| runAfterAuthReady` | واتساپ، قالب پیام، نظارت، **`runAfterAuthReady`**, **`restoreSessionFromServer`** |

> chunkهای ۰۲–۰۶ وسط یک IIFE ادغام می‌شوند؛ به‌تنهایی اجرا نکن — فقط منبع ویرایش هستند.

## ماژول‌های جدا (قبل از dashboard.js)

| فایل | نقش |
|------|-----|
| `js/modules/constants.js` | صفحات معتبر، `PAGE_TO_SECTION` |
| `js/modules/utils.js` | `escapeHtml`, `formatPrice` |
| `js/modules/api-client.js` | `CRM.Api.fetch` |
| `js/modules/dashboard-i18n.js` | `t()`, `setLang()` |
| `js/modules/dashboard-login-bootstrap.js` | برندینگ و bootstrap لاگین |
| `js/i18n-fa.js` / `en` / `tr` | ترجمه‌ها |

## HTML و CSS

| نوع | منبع |
|-----|------|
| HTML | `public/partials/dashboard/html-part-01.html` … `06` → [`../partials/dashboard/README.md`](../partials/dashboard/README.md) |
| CSS | `public/css/dashboard.css` |

## بعد از هر ویرایش

```bash
cd backend
npm run build:dashboard
```

سپس commit کن: `public/js/dashboard.js` و `public/dashboard.html`

## چرا یک فایل bundle؟

در اسکریپت کلاسیک، `let`/`const` بین چند `<script>` جدا share نمی‌شوند؛ خروجی **یک فایل** است. تفکیک واقعی ES modules در `frontend/` (Vite) — [`../../../docs/FRONTEND-MODERNIZATION.md`](../../../docs/FRONTEND-MODERNIZATION.md) در صورت وجود.

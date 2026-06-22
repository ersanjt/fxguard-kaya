# نمای کلی پروژه — Kaya CRM

مرجع سریع ساختار، بخش‌ها و فایل‌ها. **جزئیات کامل:** [docs/FOLDER-MAP-FA.md](docs/FOLDER-MAP-FA.md) · **فروش:** [docs/PRODUCT-MARKETING-FA.md](docs/PRODUCT-MARKETING-FA.md)

---

## معماری (۲۰۲۶)

```
/login  +  login.js/css     ← تنها ورود staff
/dashboard + dashboard.js   ← SPA (۶ chunk + ۶ partial HTML)
        ↕ REST + Socket.IO (backend)
Gateway (3001) + Meta Cloud ← WhatsApp
```

| لایه | پوشه |
|------|------|
| API + CRM | `backend/` |
| WhatsApp Web | `gateway/` |
| مستندات | `docs/` |
| Vite (آینده) | `frontend/` |

---

## بخش‌های پنل (۲۰+ ماژول)

| گروه | بخش‌ها |
|------|--------|
| **ارتباطات** | مکالمات واتساپ، مشتریان، تیکت، تمپلیت پیام |
| **سازمان** | وظایف، فرایندها، دپارتمان، کاربران، شعب |
| **نظارت** | supervision (مالک)، staff activity |
| **عملیات** | نرخ ارز، چارت، خدمات صرافی، ticker |
| **سیستم** | واتساپ (Cloud/Gateway)، ظاهر پنل، اعلان، چت داخلی، پروفایل |

---

## فایل‌های کلیدی فرانت

| منبع (ویرایش) | خروجی (build) |
|---------------|---------------|
| `partials/dashboard/html-part-*.html` | `public/dashboard.html` |
| `js/dashboard/src/chunk-*.js` | `public/js/dashboard.js` |
| `public/css/dashboard.css` | — |
| `login.html` + `login.css` + `login.js` | — |

```bash
cd backend && npm run build:dashboard
```

---

## chunkهای JS

| Chunk | مسئولیت |
|-------|---------|
| 01 | state، token، rates، socket |
| 02 | apiFetch، session teardown |
| 03 | **مکالمات**، voice، customers UI |
| 04 | routing، panel settings |
| 05 | users، tickets، departments |
| 06 | whatsapp، init، auth restore |

---

## بک‌اند — routes مهم

`auth` · `conversations` · `customers` · `whatsapp` · `bulk` · `rates` · `panelSettings` · `supervision`

**سرویس‌های هسته:** `incomingMessage.js` · `autoMessages.js` · `aiResponseService.js` · `conversationOutbound.js`

---

## URLها

| مسیر | توضیح |
|------|--------|
| `/` ، `/login` | صفحه ورود |
| `/dashboard` | پنل (نیاز به session) |
| `/api/*` | REST API |

---

## موبایل

- PWA از `/login`
- UI responsive (breakpoint 900px)
- APK از panel-settings
- Native Android: [android-app/README.md](android-app/README.md)

---

## دستورات

```bash
npm run quality          # lint + test + build
npm run build:dashboard  # از backend
./start-all.ps1          # Windows
```

---

*آخرین به‌روزرسانی: ژوئن ۲۰۲۶*

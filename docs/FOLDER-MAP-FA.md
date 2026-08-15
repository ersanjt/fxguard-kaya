# نقشهٔ کامل پوشه‌ها و فایل‌ها — Kaya CRM

> **هدف:** مرجع یکپارچه برای توسعه، فروش، onboarding تیم و deploy  
> **به‌روز:** ۱۸ ژوئن ۲۰۲۶ · **مخزن:** `kayaCRM-kaya`

---

## نمای کلی monorepo

```
kayaCRM-kaya/
├── backend/          ← API + داشبورد وب + login (قلب محصول)
├── gateway/          ← اتصال WhatsApp Web (QR) + ارسال/دریافت
├── frontend/         ← داشبورد Vite (آینده؛ خروجی در backend/public/js/app/)
├── android-app/      ← اپ کارکنان اندروید (Kotlin + Compose)
├── ios-app/          ← اپ کارکنان iOS (SwiftUI)
├── mobile-shared/    ← توکن‌های UI و قرارداد API مشترک
├── docs/             ← مستندات فنی، deploy، بازاریابی
├── cpanel-landing/   ← لندینگ برای cPanel
├── backups/          ← بک‌آپ (محلی)
├── scripts/          ← اسکریپت‌های ریشه
├── .github/          ← CI (GitHub Actions)
├── docker-compose*.yml
├── start-all.ps1 / .sh
├── AGENTS.md         ← راهنمای AI/Cursor
├── README.md         ← نصب و quick start
└── PROJECT-OVERVIEW.md
```

---

## backend/ — سرور اصلی CRM

| مسیر | نقش |
|------|-----|
| **`server.js`** | نقطهٔ ورود Node؛ راه‌اندازی Express + Socket.IO |
| **`app/configureExpress.js`** | میان‌افزار، routeها، static، uploads، login/dashboard |
| **`routes/`** | REST API — هر فایل یک حوزه |
| **`controllers/`** | منطق HTTP (analytics، departments، users) |
| **`services/`** | business logic — incoming WhatsApp، AI، autoMessages |
| **`models/`** | Sequelize — User، Conversation، Message، … |
| **`lib/`** | کتابخانه‌های مشترک (gatewayClient، permissions، audio) |
| **`middleware/`** | auth، socketAuth، protectedUploads، errorHandler |
| **`socket/handlers.js`** | رویدادهای real-time پنل |
| **`config/`** | env، logger، cors |
| **`scripts/`** | migrate، bundle-dashboard، add-*-columns |
| **`tests/`** | suite.test.js |
| **`public/`** | فایل‌های سرو‌شده به مرورگر |

### backend/routes/ — API

| فایل | مسیر API | کاربرد |
|------|----------|--------|
| `auth.js` | `/api/auth/*` | login، logout، TOTP، reset password |
| `conversations.js` | `/api/conversations/*` | چت واتساپ، ارسال، assign |
| `customers.js` | `/api/customers/*` | CRM مشتری، اسناد |
| `tickets.js` | `/api/tickets/*` | تیکت داخلی |
| `tasks.js` | `/api/tasks/*` | وظایف |
| `processes.js` | `/api/processes/*` | BPM |
| `departments.js` | `/api/departments/*` | دپارتمان |
| `users.js` | `/api/users/*` | کاربران |
| `branches.js` | `/api/branches/*` | شعب |
| `announcements.js` | `/api/announcements/*` | اعلان staff |
| `internal.js` | `/api/internal/*` | چت داخلی |
| `rates.js` | `/api/rates/*` | نرخ ارز + ticker |
| `services.js` | `/api/services/*` | خدمات صرافی |
| `panelSettings.js` | `/api/panel-settings/*` | white-label |
| `whatsapp.js` | `/api/whatsapp/*` | Cloud + connection |
| `bulk.js` | `/api/bulk/*` | ارسال انبوه |
| `analytics.js` | `/api/analytics/*` | داشبورد آماری |
| `supervision.js` | `/api/supervision/*` | نظارت مالک |
| `upload.js` | `/api/upload/*` | آپلود فایل |
| `api.js` | router اصلی | webhook، health، gateway proxy |

### backend/services/ — منطق هسته

| فایل | کار |
|------|-----|
| `incomingMessage.js` | پردازش پیام ورودی WA — AI، assign، media |
| `autoMessages.js` | معرفی کارشناس، خوش‌آمد، پایان مکالمه |
| `aiResponseService.js` | پاسخ OpenAI |
| `activityLog.js` | لاگ فعالیت |
| `panelSettingsLoader.js` | کش برندینگ |

### backend/lib/ — ماژول‌های مهم

| فایل | کار |
|------|-----|
| `gatewayClient.js` | HTTP به Gateway + Cloud send |
| `conversationOutbound.js` | ارسال پیام از پنل |
| `outboundMessagePrefix.js` | نام فرستنده WA |
| `whatsappCloudApi.js` | Meta Graph API |
| `whatsappOutboundPolicy.js` | Template 24h |
| `audioConverter.js` | ffmpeg voice → ogg |
| `permissions.js` | RBAC sections |
| `resolveMobileWhatsappUser.js` | پیام fromMe موبایل |
| `authCookie.js` | httpOnly session |

### backend/public/ — فرانت production

| مسیر | توضیح |
|------|--------|
| **`login.html`** + **`css/login.css`** + **`js/login.js`** | **تنها** صفحه ورود (lp-bg، blob) |
| **`dashboard.html`** | خروجی build — SPA داشبورد |
| **`partials/dashboard/html-part-01…06.html`** | **منبع HTML** |
| **`js/dashboard/src/chunk-01…06.js`** | **منبع JS** |
| **`js/dashboard.js`** | bundle نهایی |
| **`css/dashboard.css`** | ~۷۴۰۰ خط — responsive |
| **`js/i18n-fa.js`**, `i18n-en.js`, `i18n-tr.js` | ترجمه |
| **`js/modules/`** | api-client، constants، login-bootstrap |
| **`manifest.json`** | PWA |
| **`crm-build.json`** | Build ID کش |

**دستور build:** `cd backend && npm run build:dashboard`

### chunkهای JS — چه کجاست؟

| Chunk | محتوا |
|-------|--------|
| chunk-01 | state، token، rates، socket پایه |
| chunk-02 | apiFetch، teardown، notifications |
| chunk-03 | **مکالمات**، مشتریان، voice UI |
| chunk-04 | showPage، panel settings، sidebar |
| chunk-05 | users، tickets، departments |
| chunk-06 | whatsapp، init، restoreSession |

---

## gateway/ — WhatsApp Web

| مسیر | نقش |
|------|-----|
| **`src/index.js`** | Express + Socket.IO + whatsapp-web.js |
| **`src/sendRateLimiter.js`** | محدودیت ارسال |
| **`.env.example`** | GATEWAY_API_SECRET، PORT، Redis |

**پورت پیش‌فرض:** 3001  
**امنیت:** API با `X-Gateway-Secret`؛ Socket.IO با همان secret در handshake  
**Production:** فقط localhost — Backend proxy می‌کند (`/api/gateway/*`)

---

## frontend/ — Vite (مرحله بعد)

| مسیر | نقش |
|------|-----|
| `src/` | ماژول ES مدرن |
| `vite.config.js` | خروجی → `backend/public/js/app/` |

داشبورد **فعال** هنوز Vanilla در `backend/public/` است.

---

## docs/ — مستندات

| سند | مخاطب |
|-----|--------|
| **[CODEBASE-MAP.md](CODEBASE-MAP.md)** | توسعه‌دهنده — اولین مرجع |
| **[PRODUCT-MARKETING-FA.md](PRODUCT-MARKETING-FA.md)** | **فروش و بازاریابی** |
| **[FOLDER-MAP-FA.md](FOLDER-MAP-FA.md)** | این فایل |
| [PROJECT-STANDARDS.md](PROJECT-STANDARDS.md) | استاندارد مهندسی |
| [WHATSAPP-META-CHECKLIST-KAYA.md](WHATSAPP-META-CHECKLIST-KAYA.md) | Meta Cloud production |
| [DEPLOY-SERVER.md](DEPLOY-SERVER.md) | استقرار |
| [SECURITY-UPDATE-GUIDE.md](SECURITY-UPDATE-GUIDE.md) | امنیت |

---

## جریان داده (خلاصه)

```
مشتری (WhatsApp)
    ↓
Meta Cloud webhook  یا  Gateway (whatsapp-web.js)
    ↓
backend/services/incomingMessage.js
    ↓
PostgreSQL/SQLite + Socket.IO emit
    ↓
dashboard (chunk-03) — کارشناس پاسخ می‌دهد
    ↓
conversationOutbound.js → Gateway/Cloud → مشتری
```

---

## URLهای محصول

| URL | فایل/رفتار |
|-----|------------|
| `/` | `login.html` |
| `/login` | `login.html` |
| `/dashboard` | `dashboard.html` + auth check |
| `/api/*` | REST |
| `/uploads/*` | media (حساس: auth لازم) |

---

## دستورات روزمره

```bash
# کیفیت کامل
npm run quality

# فقط build داشبورد
cd backend && npm run build:dashboard

# start محلی
./start-all.ps1   # Windows
./start-all.sh    # Linux/Mac
```

---

## چک‌لیست «فایل درست را ویرایش کن»

| می‌خواهید… | ویرایش | نه |
|------------|--------|-----|
| متن login | `login.html`, `login.js` | `dashboard.html` |
| منوی sidebar | `html-part-01.html` | `dashboard.html` مستقیم |
| logic چت | `chunk-03.js` | `dashboard.js` |
| استایل موبایل | `dashboard.css` | inline |
| API مکالمه | `routes/conversations.js` | chunk |
| پیام معرفی کارشناس | `services/autoMessages.js` | chunk |
| Meta webhook | `routes/api.js` | gateway |

---

*برای فروش محصول → [PRODUCT-MARKETING-FA.md](PRODUCT-MARKETING-FA.md)*

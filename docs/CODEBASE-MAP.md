# نقشهٔ کدبیس Kaya CRM — راهنمای ناوبری برای انسان و AI

> **مالک:** Ersan Jahed Tabrizi — `docs/AUTHOR.md`  
> **استانداردها:** `docs/PROJECT-STANDARDS.md` · **راهنمای AI:** `AGENTS.md`

این سند **اولین مرجع** برای هر تغییر است: قبل از ویرایش کد، بخش «می‌خواهم X را عوض کنم» را پیدا کن و فقط همان لایه را لمس کن.

---

## ۱. نمای کلی معماری

```
┌─────────────────────────────────────────────────────────────────┐
│  مرورگر (کارمند)                                                │
│  /login  → login.html + login.css + login.js                      │
│  /dashboard → dashboard.html + dashboard.css + dashboard.js     │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP + Cookie (crm_token) + Socket.IO
┌───────────────────────────▼─────────────────────────────────────┐
│  backend/  (Express, پورت پیش‌فرض 3202)                        │
│  routes/ → services/ → models/ (Sequelize)                       │
│  public/  فایل‌های استاتیک داشبورد                               │
└───────────┬─────────────────────────────┬───────────────────────┘
            │ HTTP /api/send-message      │ RabbitMQ (اختیاری)
┌───────────▼───────────┐    ┌────────────▼──────────────────────┐
│  gateway/             │    │  PostgreSQL یا SQLite + MongoDB    │
│  whatsapp-web.js      │    │  (لاگ تحلیلی)                      │
└───────────────────────┘    └────────────────────────────────────┘
```

| لایه | پوشه | مسئولیت |
|------|------|---------|
| **API** | `backend/` | احراز هویت، CRM، مکالمات، تیکت، نرخ، تنظیمات |
| **Gateway** | `gateway/` | نشست WhatsApp Web، ارسال/دریافت پیام، تماس |
| **پنل وب (فعال)** | `backend/public/` | SPA داشبورد + صفحه ورود |
| **پنل مدرن (آینده)** | `frontend/` | Vite → `backend/public/js/app/` |
| **موبایل** | `android-app/`, `ios-app/`, `mobile-shared/` | اپ کارکنان (Compose + SwiftUI، توکن مشترک) — `docs/MOBILE-APP.md` |

---

## ۲. قانون طلایی: منبع ↔ خروجی (داشبورد)

| می‌خواهی عوض کنی… | **منبع (ویرایش)** | **خروجی (دست نزن)** | بعد از ویرایش |
|-------------------|-------------------|---------------------|---------------|
| اپ کارکنان iOS/اندروید | `ios-app/` · `android-app/` · `mobile-shared/` | — | `docs/MOBILE-APP.md` |
| منطق JS پنل | `backend/public/js/dashboard/src/chunk-NN.js` | `backend/public/js/dashboard.js` | `cd backend && npm run build:dashboard` |
| HTML پنل | `backend/public/partials/dashboard/html-part-NN.html` | `backend/public/dashboard.html` | همان |
| استایل پنل | `backend/public/css/dashboard.css` | — | bump `?v=` در partial-01 و partial-06 |
| صفحه ورود حرفه‌ای | `backend/public/login.html` + `css/login.css` + `js/login.js` | — | bump `?v=` در login.html |
| حریم خصوصی / شرایط / حذف حساب | `backend/public/privacy.html` · `terms.html` · `account-deletion.html` + `css/legal.css` + `js/legal.js` | مسیرهای `/privacy` `/terms` `/account-deletion` | بعد از دیپلوی برای ریویو استور |
| ترجمه فارسی/انگلیسی/ترکی | `backend/public/js/i18n-fa.js` و … | — | bump `?v=` در html-part-06 |
| ماژول‌های مشترک JS | `backend/public/js/modules/*.js` | — | bump `?v=` |

---

## ۳. نقشهٔ chunkهای داشبورد (مهم‌ترین بخش فرانت)

فایل‌ها در یک **IIFE** ادغام می‌شوند؛ فقط `chunk-01` و `chunk-02` و `chunk-06` هدر فایل دارند.

| Chunk | تقریباً | بخش‌های UI / منطق | توابع کلیدی |
|-------|---------|-------------------|-------------|
| **chunk-01** | ابتدا | state سراسری، نرخ ارز، تیکر پایین، صرافی/خدمات، سوکت پایه | `token`, `apiFetch` init, `fetchRates`, `connectSocket` |
| **chunk-02** | | **ورود/خروج/TOTP**، `apiFetch`، اعلان‌ها، **هندلرهای کلیک سراسری** | `login`, `logout`, `setupGlobalDelegatedHandlers`, `setupLoginEventHandlers` |
| **chunk-03** | | **مکالمات واتساپ**، مشتریان (شروع)، رویدادهای سراسری UI | `loadConversations`, `openChat`, `sendMsg`, `setupGlobalEventHandlers` |
| **chunk-04** | | مشتریان (رندر)، تسک، فرایند، **مسیریابی صفحات**، تنظیمات پنل | `showPage`, `applyHashRoute`, `loadPanelSettings`, `loadTickets` (شروع) |
| **chunk-05** | | تیکت، کاربران، دپارتمان، شعب | `renderUserList`, تسک‌ها، فرایندها |
| **chunk-06** | انتها | واتساپ، قالب پیام، نظارت، expose به `window`, **`runAfterAuthReady`** | `restoreSessionFromServer`, `loadWhatsappWelcomeConfig`, `runAfterAuthReady` |

### جدول سریع: «چه چیزی کجاست؟»

| نیاز | فایل | نکته |
|------|------|------|
| دکمه‌ها کار نمی‌کنند | `chunk-02.js` → `setupGlobalDelegatedHandlers` | باید `runAfterAuthReady` در `chunk-06` اجرا شود |
| لاگین / رفرش / نشست | `chunk-02.js` + `chunk-06.js` | کوکی `crm_token` + `restoreSessionFromServer` |
| استایل صفحه مکالمات | `css/dashboard.css` (بلاک `#conversations`) | additive CSS، specificity |
| لیست چت / حباب پیام | `chunk-03.js` + `html-part-02/03` | `#conversations`, `#chatMessages` |
| آواتار مخاطب واتساپ | `chunk-02.js` (`customerAvatarDisplaySrc`) + `routes/customerAvatar.js` + gateway `GET /api/contacts/profile-pic` | Store `eurl`؛ placeholder یعنی واکشی شکست |
| ارسال ویس/فایل | `chunk-03.js` + `backend/lib/conversationOutbound.js` + `lib/audioConverter.js` | |
| چت داخلی (صفحه) | `chunk-05.js` + `html-part-02/03` + `routes/internal.js` | `#internal-chat`, `#internalChatPane`, مودال گفتگوی جدید |
| پیوست چت داخلی | `chunk-02.js` → `renderInternalAttachment` | تصویر/ویدیو اینلاین؛ ذخیره فقط با `allowDownload` |
| پیام خودکار «کارشناس X» | `backend/services/autoMessages.js` + `routes/conversations.js` | |
| کاربران / کارت کاربر | `chunk-05.js` + `html-part-04` | `#users`, `renderUserList` |
| تنظیمات ظاهر پنل | `chunk-04.js` + `routes/panelSettings.js` | `#panel-settings` |
| اتصال واتساپ QR | `chunk-06.js` + `gateway/src/index.js` | |
| هدر / منو / سایدبار | `html-part-01/02` + `chunk-04.js` (`showPage`) | |

جزئیات chunk: `backend/public/js/dashboard/README.md`  
جزئیات HTML: `backend/public/partials/dashboard/README.md`

---

## ۴. backend — لایه‌ها و مسیر فایل

```
backend/
├── server.js              ← ورود سرور
├── app/configureExpress.js ← مسیرها، static، /login و /dashboard
├── routes/                ← HTTP endpoints (نازک — فقط routing)
├── services/              ← منطق کسب‌وکار
├── lib/                   ← توابع کمکی مشترک
├── models/                ← Sequelize (جدول DB)
├── middleware/            ← auth, webhook, socket
├── jobs/                  ← cron (نرخ، مکالمات بی‌پاسخ، انقضای حضور)
├── socket/                ← Socket.IO handlers
├── public/                ← داشبورد استاتیک
└── tests/                 ← تست‌ها
```

### ۴.۱ API — از URL به فایل

پیشوند همه: `/api/...` — تعریف تجمیعی: `backend/routes/api.js`

| مسیر API | فایل route | سرویس/منطق اصلی |
|----------|------------|------------------|
| `/api/auth/*` | `routes/auth.js` | ورود، me، TOTP، کوکی `crm_token` |
| `/api/conversations/*` | `routes/conversations.js` | `lib/conversationOutbound.js`, `services/autoMessages.js` |
| `/api/customers/*` | `routes/customers.js` | مدل `Customer` |
| `/api/customers/:id/avatar` | `routes/customerAvatar.js` | `lib/customerAvatar.js` — محلی یا Store واتساپ |
| `/api/tickets/*` | `routes/tickets.js` | |
| `/api/internal/*` | `routes/internal.js` | چت داخلی: ترد، پیام، کاربران، حضور زنده |
| `/api/tasks/*` | `routes/tasks.js` | |
| `/api/users/*` | `routes/users.js` | `lib/permissions.js` |
| `/api/departments/*` | `routes/departments.js` | |
| `/api/whatsapp/*` | `routes/whatsapp.js` | `models/WhatsappConfig.js` |
| `/api/panel-settings/*` | `routes/panelSettings.js` | `services/config/panelSettingsLoader.js` |
| `/api/rates/*` | `routes/rates.js` | `jobs/dailyRates.js` |
| `/api/gateway/*` | `routes/gateway.js` | پروکسی به gateway |
| `/api/supervision/*` | `routes/supervision.js` | آنلاین زنده: `lib/staffPresence.js` |
| Webhook واتساپ Cloud | `routes/api.js` | `services/incomingMessage.js` |

### ۴.۲ مدل‌های دادهٔ مهم

| موجودیت | فایل مدل | فیلدهای کلیدی |
|---------|----------|----------------|
| مکالمه | `models/Conversation.js` | `assignedTo`, `departmentId`, `status` |
| پیام | همان فایل (Message) | `userId`, `direction`, `isAutoReply` |
| کاربر | `models/User.js` | `role`, `departmentId`, `permissions`, `status`, `lastSeenAt` |
| تنظیمات واتساپ | `models/WhatsappConfig.js` | پیام‌های خودکار، AI |
| تنظیمات پنل | `models/PanelSetting.js` | برندینگ، SMTP، زبان |

### ۴.۳ جریان پیام واتساپ

```
مشتری → gateway (whatsapp-web.js)
      → RabbitMQ یا webhook → backend/services/incomingMessage.js
      → DB + Socket.IO → dashboard (chunk-03)

کارمند ارسال → POST /api/conversations/:id/send
      → lib/conversationOutbound.js
      → lib/gatewayClient.js → gateway POST /api/send-message
      → client.sendMessage()
```

---

## ۵. gateway — واتساپ

```
gateway/
├── src/index.js     ← Express + WhatsApp Client + RabbitMQ consumer
├── src/waCalls.js   ← تماس صوتی/تصویری (کلیک UI)
└── .env.example
```

| نیاز | فایل |
|------|------|
| ارسال پیام/مدیا | `src/index.js` → `POST /api/send-message` |
| QR / وضعیت اتصال | `src/index.js` |
| لیست چت/گروه از Store | `src/index.js` → `GET /api/chats` (نه `getChats()` / `getChat`) |
| عکس پروفایل مخاطب | `src/index.js` → `GET /api/contacts/profile-pic` (Store `eurl`، نه `getProfilePicUrl`) |
| تماس | `src/waCalls.js` |
| فرمت Prettier | `npm run format` در `gateway/` |

---

## ۶. امنیت (خلاصه)

| موضوع | محل |
|-------|-----|
| JWT + کوکی httpOnly | `backend/lib/authCookie.js`, `middleware/auth.js` |
| دسترسی نقش/بخش | `backend/lib/permissions.js` |
| دسترسی مکالمه | `backend/lib/conversationAccess.js` |
| CSP / هدرها | `backend/app/configureExpress.js` |
| Rate limit کارکنان | `backend/lib/apiRateLimit.js` + `app/configureExpress.js` |
| escape HTML در UI | `CRM.Utils.escapeHtml` در `js/modules/utils.js` |

---

## ۷. استقرار و CI

| Workflow | فایل | شاخه |
|----------|------|------|
| Lint + Test + Build | `.github/workflows/ci.yml` | `main` |
| Deploy SSH | `.github/workflows/deploy.yml` | `main` → سرور |

بعد از تغییر chunk یا partial: **حتماً** `npm run build:dashboard` و commit خروجی‌ها.

---

## ۸. چک‌لیست قبل از PR (خلاصه)

1. `docs/CODEBASE-MAP.md` — آیا فایل درست را ویرایش کردی؟
2. منبع را ویرایش کردی نه `dashboard.js` / `dashboard.html` خام؟
3. `npm run quality` از ریشه
4. bump `?v=` برای CSS/JS تغییر‌یافته
5. امضای مالک در فایل جدید (`docs/AUTHOR.md`)

---

## ۹. اسناد مرتبط

| سند | محتوا |
|-----|--------|
| `docs/AUTHOR.md` | امضا و مالکیت |
| `docs/PROJECT-STANDARDS.md` | استاندارد مهندسی |
| `backend/docs/FRONTEND-ARCHITECTURE.md` | معماری هدف فرانت |
| `backend/public/STRUCTURE.md` | تفکیک HTML/CSS/JS |
| `backend/services/README.md` | پوشه‌های services |
| `AGENTS.md` | راهنمای Cursor / AI |
| `docs/MOBILE-APP.md` | اپ کارکنان iOS + Android |
| `docs/STORE-RELEASE.md` | انتشار Google Play + App Store |

---

*آخرین به‌روزرسانی ساختار: ۲۰۲۶ — Ersan Jahed Tabrizi*

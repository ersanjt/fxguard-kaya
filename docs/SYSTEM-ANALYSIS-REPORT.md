# گزارش تحلیل جامع سیستم kayaCRM

**تاریخ بررسی:** مارس ۲۰۲۶  
**نسخه سند:** ۱.۰

---

## ۱. نمای کلی پروژه

**kayaCRM** یک سیستم **CRM سازمانی با محوریت واتساپ** است که شامل:

- **Backend** (Node.js + Express) — API، احراز هویت، دیتابیس، Socket.IO
- **Gateway واتساپ** (whatsapp-web.js) — اتصال واتساپ وِب و ارسال/دریافت پیام
- **پنل وب (SPA)** — داشبورد مدیریتی با Vanilla JS داخل `backend/public/`
- **لندینگ و تماس** — صفحات استاتیک (هم در backend و هم در `cpanel-landing/`)
- **اپ موبایل** — اندروید (Kotlin) و iOS (Swift) با اتصال به همان API

**حالت راه‌اندازی سریع:** فقط با Node.js 18+ و اسکریپت `start-all.ps1` (یا `start-all.sh`)؛ بدون نیاز به PostgreSQL/MongoDB/Redis/RabbitMQ در حالت ساده (با SQLite).

---

## ۲. معماری و جریان داده

### ۲.۱ لایه‌ها

```
┌─────────────────────────────────────────────────────────────┐
│  کلاینت: پنل وب (dashboard) | اپ اندروید | اپ iOS | لندینگ  │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS / WSS (Socket.IO)
┌───────────────────────────▼─────────────────────────────────┐
│  Backend (پورت ۳۰۰۲): Express, API، Socket.IO، فایل استاتیک │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐   ┌────────▼────────┐   ┌─────▼─────┐
│  Gateway     │   │  PostgreSQL/    │   │  Redis    │
│  (پورت ۳۰۰۱)│   │  SQLite +       │   │  (اختیاری)│
│  واتساپ وب   │   │  MongoDB (لاگ)  │   │  RabbitMQ │
└───────┬──────┘   └─────────────────┘   └───────────┘
        │
        └──► واتساپ (QR / Cloud API)
```

### ۲.۲ جریان پیام (واتساپ)

- **ورودی:** واتساپ → Gateway (whatsapp-web.js یا Cloud API) → Webhook به Backend → `processIncomingMessage` → ذخیره در Sequelize (Conversation, Message, Customer و…) و اختیاری MongoDB (MessageLog) → Socket.IO / REST → پنل یا اپ.
- **خروجی:** پنل/اپ → REST به Backend → Gateway (gatewayClient) → واتساپ.

### ۲.۳ نقطه ورود Backend

- **فایل:** `backend/server.js`
- **وظایف:** بارگذاری env، اتصال DBها (Sequelize + اختیاری MongoDB)، Redis، RabbitMQ، seed ادمین در صورت نیاز، کرون برای مکالمات بی‌پاسخ.
- **میدلورها:** Helmet (CSP)، CORS، compression، cookie-parser، body parser (حد مجزا برای webhook)، rate limit، سپس `app.use('/api', createApiRouter(...))`.
- **سرو کردن:** `/` → لندینگ یا ریدایرکت به `/dashboard`، `/dashboard` → `dashboard.html`، سپس `express.static('public')`، `/uploads`، و error handler.
- **پورت:** معمولاً `3002` (قابل تنظیم با `PORT`).

---

## ۳. Backend — تحلیل تفصیلی

### ۳.۱ تکنولوژی

| مورد | توضیح |
|------|--------|
| **Runtime** | Node.js 18+ |
| **فریمورک** | Express 4، express-async-errors، cookie-parser، cors، helmet، compression، express-rate-limit (اختیاری Redis)، express-validator |
| **دیتابیس اصلی** | Sequelize با **PostgreSQL** یا **SQLite** (`USE_SQLITE=true`) |
| **دیتابیس ثانویه** | MongoDB (اختیاری) برای MessageLog و لاگ |
| **کش / صف** | Redis (اختیاری)، RabbitMQ (اختیاری) |
| **Real-time** | Socket.IO روی همان سرور با احراز هویت (socketAuth) |

### ۳.۲ مسیرهای API (`backend/routes/api.js`)

همه زیر `/api` مونت شده‌اند:

| گروه | مسیر | توضیح کوتاه |
|------|------|-------------|
| عمومی | `GET /api/ping`, `GET /api/config` | سلامت و تنظیمات کلی |
| تماس / Gateway | `/` (contact), `/gateway/*` | فرم تماس، پراکسی Gateway |
| احراز هویت | `/auth` | ورود، خروج، TOTP، فراموشی رمز، `/auth/me` |
| کاربران | `/users` | CRUD کاربران (پشت auth) |
| مکالمات | `/conversations` | لیست، پیام‌ها، ارسال پیام |
| مشتریان | `/customers`, `/customers/import` | CRUD، یادداشت، اسناد، ایمپورت |
| تگ / قالب | `/tags`, `/message-templates`, `/file-templates` | تگ‌ها و قالب‌های پیام |
| انبوه | `/bulk` | ارسال انبوه |
| تیکت | `/tickets` | تیکت‌ها (نیاز به section `tickets`) |
| وظایف | `/tasks` | تسک‌ها (نیاز به section `tasks`) |
| فرایندها | `/processes` | قالب و نمونه فرایندها |
| دپارتمان / شعب | `/departments`, `/branches` | دپارتمان‌ها و شعب |
| نظارت | `/supervision` | نظارت و فعالیت کارکنان |
| نرخ / خدمات / صرافی | `/rates`, `/services`, `/exchange` | نرخ ارز، خدمات، صندوق، بانک، تراکنش |
| واتساپ | `/whatsapp` | تنظیمات و اتصال واتساپ |
| اعلان‌ها | `/announcements` | اعلان‌ها (نیاز به section) |
| چت داخلی | `/internal` | چت داخلی (نیاز به section `internal_chat`) |
| پنل / ایمیل | `/panel-settings`, `/company-emails` | ظاهر پنل، ایمیل‌های شرکتی |
| آپلود | `/upload` | آپلود فایل |
| Webhook | `POST /webhook/incoming-message`, `GET/POST /webhook/whatsapp-cloud`, `POST /webhook/message-status` | ورود پیام و وضعیت از Gateway/Cloud |

### ۳.۳ احراز هویت و دسترسی

- **روش‌ها:** Cookie (با نام از `authCookie`) یا هدر `Authorization: Bearer <token>`.
- **JWT:** با `JWT_SECRET` و انقضا (مثلاً ۷ روز).
- **میدلور:** `authMiddleware` در `middleware/auth.js` — بارگذاری کاربر، نقش، و `req.permissions` از `lib/permissions.js`.
- **بخش‌ها:** `requireSection(section)` برای محدود کردن دسترسی به بخش‌هایی مثل `tickets`, `tasks`, `announcements`, `internal_chat`, `processes`.
- **نقش‌ها و مجوزها:** owner, admin, manager, supervisor, agent با مجوزهای ریز (مثلاً manage_users، manage_tickets، حذف مشتری/کاربر، مدیریت مکالمات، مشاهده آرشیو).

### ۳.۴ مدل‌های داده (Sequelize)

بیش از **۳۴ مدل** در `backend/models/`، از جمله:

- **کاربر و سازمان:** User, Branch, Department, ActivityLog, Attendance, NotificationPreference
- **مشتری و ارتباط:** Customer, Conversation, Message, Tag, CustomerNote, CustomerDocument
- **مکانیک واتساپ:** WhatsappConfig, WhatsappConnection
- **قالب و اتوماسیون:** Template, FileTemplate, AutoResponse (در ماژول Conversation)
- **تیکت و وظیفه:** Ticket, TicketReply, Task, TaskUpdate
- **فرایند:** ProcessTemplate, ProcessInstance, ProcessInstanceStep
- **اعلان و چت داخلی:** Announcement, AnnouncementRead, InternalThread, InternalThreadParticipant, InternalMessage
- **مالی و صرافی:** RateAdjustment, RateCurrency, TickerConfig, ExchangeService, CashBox, BankAccount, Transaction
- **تنظیمات و امنیت:** PanelSetting, PasswordResetToken, CompanyEmail

روابط در `models/index.js` با `associate` تعریف شده‌اند.

### ۳.۵ سرویس‌ها و لایه منطق

- **اتصال دیتابیس:** `services/database.js`, `services/core/database.js` (Sequelize + MongoDB).
- **پیام ورودی:** `services/incomingMessage.js` — پردازش webhook و ذخیره Conversation/Message/Customer و…
- **اعلان:** `services/notificationService.js`
- **پاسخ خودکار / AI:** `services/aiResponseService.js`, `services/autoMessages.js`
- **سایر:** seed، panelSettingsLoader، intelligentDepartmentRouter، activityLog، configها و صف‌ها.

### ۳.۶ Socket.IO

- **احراز:** `middleware/socketAuth.js`
- **هندلرها:** `socket/handlers.js` — برای به‌روزرسانی زنده مکالمات، نوتیفیکیشن و غیره.

---

## ۴. Gateway واتساپ

- **ورود:** `gateway/src/index.js`
- **کتابخانه:** whatsapp-web.js برای اتصال واتساپ وِب؛ پشتیبانی از RabbitMQ و Redis.
- **ارتباط با Backend:** ارسال پیام‌های ورودی به Backend (webhook یا صف)؛ Backend برای ارسال/وضعیت/QR از `lib/gatewayClient.js` و `routes/gateway.js` به Gateway درخواست می‌زند.
- **پورت پیش‌فرض:** 3001 (قابل تنظیم با `.env`).

همچنین **WhatsApp Cloud API** در Backend پشتیبانی شده: verify و receive در `/api/webhook/whatsapp-cloud` و دانلود مدیا از Meta.

---

## ۵. فرانت‌اند (پنل وب)

### ۵.۱ ساختار

- **مکان:** `backend/public/`
- **صفحه اصلی پنل:** `dashboard.html` — یک SPA با همه بخش‌ها به صورت div (مثلاً `#pageDashboard`, `#pageConversations`, …).
- **منطق:** `js/dashboard.js` — حجم بسیار زیاد (~۶٬۷۰۰ خط و بیشتر در نسخه‌های مختلف)؛ روتینگ هش (`#dashboard`, `#conversations`, …)، فراخوانی API، i18n، سایدبار، و توابع بارگذاری هر صفحه.
- **استایل:** `css/dashboard.css`
- **ماژول‌های کمکی:** `js/modules/api-client.js`, `constants.js`, `utils.js`
- **i18n:** `js/i18n-fa.js`, `i18n-en.js`, `i18n-tr.js`؛ کلیدهای `data-i18n` و تابع `applyTranslations()`.

### ۵.۲ صفحات و توابع بارگذاری (نمونه)

| صفحه | ID | تابع بارگذاری اصلی | API مرتبط |
|------|-----|---------------------|------------|
| داشبورد | pageDashboard | loadDashboard() | /api/analytics |
| مکالمات | pageConversations | loadConversations(), loadMessages() | /api/conversations |
| مشتریان | pageCustomers | loadCustomers() | /api/customers |
| جزئیات مشتری | pageCustomerDetail | showCustomerHistory() | /api/customers/:id |
| تیکت‌ها | pageTickets | loadTickets(), loadTicketDetail() | /api/tickets |
| وظایف | pageTasks | loadTasks(), loadTaskDetail() | /api/tasks |
| فرایندها | pageProcesses | loadProcessTemplates(), loadProcessInstances() | /api/processes |
| دپارتمان‌ها | pageDepartments | loadDepartments() | /api/departments |
| کاربران | pageUsers | loadUsers() | /api/users |
| شعب | pageBranches | loadBranches() | /api/branches |
| پروفایل | pageProfile | loadProfile() | /api/auth/me |
| اعلان‌ها | pageAnnouncements | loadAnnouncements() | /api/announcements |
| چت داخلی | pageInternalChat | loadInternalThreads(), loadInternalMessages() | /api/internal |
| نظارت / ورودها | pageSupervision, pageStaffActivity | loadSupervisionPerformance(), loadStaffActivity() | /api/supervision |
| واتساپ | pageWhatsapp | loadWhatsappStatus() | /api/whatsapp |
| نرخ ارز | pageRates | loadRatesAdjustments(), loadCurrencies() | /api/rates |
| خدمات | pageServices | loadServices(), loadTransactions() | /api/services, /api/exchange |
| ظاهر پنل | pagePanelSettings | loadPanelSettings() | /api/panel-settings |

سایدبار و آیتم‌های مخفی (مثل نظارت و ورودها) بر اساس نقش و `applyNavByRole()` / `applyHiddenSections()` کنترل می‌شوند.

### ۵.۳ لندینگ و cPanel

- **backend/public:** `landing.html`, `contact.html`, `landing.js`, `landing.css`, `style.css`
- **cpanel-landing:** نسخهٔ استاتیک برای استقرار روی cPanel؛ با `backend/public` همگام‌سازی می‌شود (مستندات: `LANDING-SYNC.md`).

---

## ۶. اپ موبایل

- **اندروید:** Kotlin در `android-app/` — MainActivity، ViewModels (Login, Dashboard, Conversations, Customers, Tickets, Tasks, Profile, InternalChat)، Repository، DI.
- **iOS:** Swift در `ios-app/` — KayaCRMApp، Views و ViewModels مشابه، ApiService.
- هر دو از همان Base URL و APIهای Backend استفاده می‌کنند (مثلاً `/api/auth`, `/api/conversations`, `/api/customers`).

---

## ۷. امنیت و بهینه‌سازی‌ها

### ۷.۱ امنیت

- **Helmet** با CSP (اسکریپت، استایل، فونت، تصویر، اتصال و…) تنظیم شده.
- **CORS** با لیست originهای مجاز (`config/cors.js`).
- **Rate limiting** (با یا بدون Redis).
- **Webhook:** احراز با `webhookAuth` (مثلاً secret) برای `/webhook/incoming-message` و `/webhook/message-status`.
- **JWT + Cookie** برای احراز هویت؛ بررسی کاربر غیرفعال.
- **مجوزهای ریز** برای بخش‌ها و عملیات (حذف، مدیریت کاربران، تیکت، مکالمات و…).

### ۷.۲ دسترسی از ایران

- در کد **هیچ بلاک یا محدودیت بر اساس IP/کشور ایران وجود ندارد** (مستند: `docs/IRAN_ACCESS.md`).
- بهینه‌سازی‌ها برای محیط بدون دسترسی به گوگل: فونت گوگل به صورت async، STUN اضافه برای WebRTC تا در صورت عدم دسترسی به سرویس‌های گوگل، تماس داخلی همچنان ممکن باشد.

---

## ۸. مستندات موجود

- **راه‌اندازی و نصب:** README.md، QUICKSTART.md، راه‌اندازی-سریع، README-تحویل-مشتری
- **ساختار:** STRUCTURE.md، PROJECT-OVERVIEW.md، backend/public/STRUCTURE.md
- **دسترسی ایران:** docs/IRAN_ACCESS.md
- **واتساپ:** WHATSAPP-CONNECTION.md، WHATSAPP-CLOUD-API-SETUP.md، WEBHOOK-MEDIA.md
- **استقرار و امنیت:** DEPLOY-SERVER.md، DEPLOY-SETUP.md， PERSISTENCE.md، SECURITY-UPDATE-GUIDE.md
- **فرانت و بازساخت:** backend/docs/FRONTEND-ARCHITECTURE.md، docs/REFACTORING-PLAN.md
- **سایر:** AI-SETUP، EMAIL-SETUP، PERMISSION_AUDIT_REPORT، CONSOLE-FIXES، REVIEW-صرافی-کایا و…

---

## ۹. نقاط قوت

1. **معماری ماژولار Backend:** تفکیک routes، models، services، middleware، lib.
2. **انعطاف در دیتابیس:** PostgreSQL یا SQLite؛ MongoDB اختیاری برای لاگ.
3. **راه‌اندازی سریع:** فقط Node با اسکریپت start-all و بدون وابستگی سنگین.
4. **امکانات گسترده:** مکالمات، مشتریان، تیکت، تسک، فرایند، دپارتمان، شعب، نظارت، نرخ و خدمات صرافی، چت داخلی، اعلان‌ها، واتساپ (وب و Cloud API).
5. **چند پلتفرم:** وب، اندروید، iOS با یک API.
6. **i18n:** فارسی، انگلیسی، ترکی.
7. **احراز و مجوز:** JWT/Cookie، نقش‌ها و بخش‌ها (requireSection) و مجوزهای ریز.
8. **Real-time:** Socket.IO برای به‌روزرسانی زنده.
9. **مستندات و نقشه ساختار:** STRUCTURE، PROJECT-OVERVIEW، FRONTEND-ARCHITECTURE و REFACTORING-PLAN برای جهت‌گیری آینده.

---

## ۱۰. نقاط ضعف و ریسک‌ها

### ۱۰.۱ فرانت‌اند

- **حجم بسیار زیاد `dashboard.js`:** نگهداری و دیباگ سخت؛ بدون code splitting، همه منطق در یک فایل.
- **عدم تفکیک واضح ماژول‌ها:** منطق صفحه‌ها، API و state در یک فایل مخلوط است.
- **عدم pipeline ساخت:** بدون minify و bundle؛ بهینه‌سازی بارگذاری محدود.
- **HTML سنگین:** همه صفحات در یک `dashboard.html`.

### ۱۰.۲ Backend

- **منطق داخل routeها:** در بسیاری از مسیرها منطق مستقیم در route است؛ لایه Controller جداگانه به صورت یکنواخت وجود ندارد.
- **Validation پراکنده:** استفاده از express-validator در جاهای مختلف بدون تمرکز.
- **فایل `api.js` متمرکز:** جمع کردن همه routeها و webhookها در یک فایل؛ با رشد پروژه سنگین می‌شود.

### ۱۰.۳ عملیاتی

- **وابستگی اختیاری به Redis/RabbitMQ/MongoDB:** در حالت ساده بدون آن‌ها کار می‌کند ولی برای مقیاس و قابلیت‌های پیشرفته باید پیکربندی شوند.
- **Gateway واتساپ:** وابسته به whatsapp-web.js و پایداری اتصال؛ برای production معمولاً نیاز به مانیتورینگ و restart کنترل‌شده.

---

## ۱۱. پیشنهادهای بهبود (خلاصه)

1. **فرانت:** تفکیک تدریجی `dashboard.js` به ماژول‌های feature (مطابق FRONTEND-ARCHITECTURE و REFACTORING-PLAN)؛ در نهایت استفاده از build tool (مثل Vite) برای bundle و code splitting.
2. **Backend:** معرفی لایه Controller و انتقال منطق از routeها؛ تمرکز validation در یک لایه؛ در صورت نیاز تفکیک مسیرهای webhook و نسخه‌بندی API (مثلاً v1).
3. **تست:** گسترش تست‌های واحد و یکپارچگی برای routeها و سرویس‌های حیاتی.
4. **مانیتورینگ:** لاگ ساختاریافته (تا حدی با winston وجود دارد)، متریک و سلامت سرویس‌ها (مثلاً `/health`) برای استقرار production.

---

## ۱۲. خلاصه یک پاراگرافی

**kayaCRM** یک CRM سازمانی با هسته واتساپ است: Backend با Node/Express و Sequelize (PostgreSQL/SQLite) و Socket.IO، Gateway واتساپ (وب و Cloud API)، پنل SPA با Vanilla JS در یک فایل بزرگ، و اپ‌های اندروید و iOS. احراز با JWT/Cookie و سیستم مجوز بخش‌بندی‌شده دارد؛ مستندات و ساختار پروژه برای توسعه و بازساخت بعدی تا حد خوبی آماده است. اصلی‌ترین نقطه قابل بهبود، تفکیک و کوچک‌سازی فرانت‌اند (dashboard.js) و جداسازی منطق از routeها در Backend است.

---

*پایان گزارش تحلیل.*

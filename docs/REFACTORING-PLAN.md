# طرح بازساخت و حرفه‌ای‌سازی fxguard-kaya

**تاریخ:** مارس ۲۰۲۶  
**نسخه:** ۱.۰

---

## ۱. تحلیل وضعیت فعلی

### ۱.۱ ساختار کلی پروژه

```
fxguard-kaya/
├── backend/           # سرور Node.js + Express (پورت ۳۰۰۲)
├── gateway/           # سرویس WhatsApp Web.js (پورت ۳۰۰۱)
├── android-app/       # اپ موبایل اندروید (Kotlin)
├── ios-app/           # اپ موبایل iOS (Swift)
├── cpanel-landing/    # صفحه لندینگ (HTML/CSS)
├── docs/              # مستندات
├── scripts/           # اسکریپت‌های استقرار
├── .github/           # CI/CD
└── docker-compose*.yml
```

### ۱.۲ Backend – وضعیت فعلی

| بخش | تعداد | توضیح |
|-----|-------|-------|
| **Routes** | ۲۶ فایل | مسیرهای API؛ منطق در خود routeها |
| **Models** | ۳۴ فایل | Sequelize؛ سازمان‌دهی خوب |
| **Services** | ۱۶ فایل | منطق کسب‌وکار پراکنده |
| **Middleware** | چند فایل | auth, webhook, errorHandler |
| **Lib** | چند فایل | توابع کمکی |

**مشکلات:**
- عدم لایه Controller جداگانه؛ منطق داخل routeها
- validation پراکنده (express-validator در جاهای مختلف)
- auto-migration در `database.js`؛ بدون نسخه‌بندی
- فایل `api.js` بزرگ؛ gateway و contact در همانجا

### ۱.۳ Frontend – وضعیت فعلی

| مورد | وضعیت |
|------|--------|
| **تکنولوژی** | Vanilla JS SPA داخل `backend/public/` |
| **فایل اصلی** | `dashboard.js` حدود **۱۰,۵۰۰ خط** و **۸۲۵ KB** |
| **HTML** | `dashboard.html` + `landing.html` + `contact.html` |
| **CSS** | `dashboard.css`, `landing.css` |
| **i18n** | `i18n-fa.js`, `i18n-en.js`, `i18n-tr.js` |

**مشکلات:**
- تک فایل عظیم `dashboard.js`؛ نگهداری سخت
- عدم تفکیک صفحه‌ها، API، state، i18n
- Hash-based routing دستی
- عدم build pipeline؛ بدون minify و bundle

---

## ۲. ساختار پیشنهادی (حرفه‌ای)

### ۲.۱ Backend – ساختار هدف

```
backend/
├── src/
│   ├── config/           # تنظیمات
│   ├── controllers/      # لایه کنترلر (جدید)
│   │   ├── auth.controller.js
│   │   ├── users.controller.js
│   │   ├── conversations.controller.js
│   │   └── ...
│   ├── services/         # منطق کسب‌وکار
│   │   ├── core/
│   │   ├── messaging/
│   │   └── finance/
│   ├── repositories/     # لایه دسترسی داده (اختیاری)
│   ├── models/
│   ├── routes/
│   │   ├── index.js      # جمع‌آوری همه routeها
│   │   ├── v1/           # نسخه‌بندی API
│   │   │   ├── auth.routes.js
│   │   │   ├── users.routes.js
│   │   │   └── ...
│   │   └── webhooks/
│   ├── middleware/
│   ├── validators/       # schema validation (Zod/Joi)
│   ├── lib/
│   └── socket/
├── public/               # SPA فعلی (تا مهاجرت)
├── migrations/           # Sequelize migrations نسخه‌دار
├── tests/
├── server.js
└── package.json
```

### ۲.۲ Frontend – ساختار هدف (فاز بعدی)

```
frontend/                 # پروژه جدا یا داخل backend/public
├── src/
│   ├── api/              # کلاینت API
│   │   ├── client.js
│   │   ├── auth.js
│   │   ├── conversations.js
│   │   └── ...
│   ├── pages/            # هر صفحه یک ماژول
│   │   ├── dashboard/
│   │   ├── conversations/
│   │   ├── customers/
│   │   └── ...
│   ├── components/       # کامپوننت‌های مشترک
│   ├── state/            # state management
│   ├── i18n/             # ترجمه‌ها
│   ├── utils/
│   ├── router.js
│   └── app.js
├── dist/                 # خروجی build
└── package.json
```

### ۲.۳ دسته‌بندی domainها

| Domain | Routes | Models | Services |
|--------|--------|--------|----------|
| **Auth** | auth | User, PasswordResetToken | - |
| **Users & Org** | users, departments, branches | User, Department, Branch, Attendance | defaultDepartments |
| **Messaging** | conversations, internal | Conversation, Message, Internal* | incomingMessage, autoMessages, aiResponseService |
| **Customers** | customers, tags | Customer, Tag, CustomerNote, CustomerDocument | - |
| **Support** | tickets | Ticket, TicketReply, AutoResponse, Template | - |
| **Tasks & BPM** | tasks, processes | Task, TaskUpdate, Process* | - |
| **Finance** | rates, services, exchange | Rate*, ExchangeService, CashBox, BankAccount, Transaction | - |
| **Config** | whatsapp, panel-settings, company-emails | WhatsappConfig, PanelSetting, CompanyEmail | panelSettingsLoader |
| **Other** | announcements, analytics, supervision, upload, bulk | Announcement, ActivityLog, FileTemplate | activityLog, notificationService |

---

## ۳. طرح اجرا (مرحله‌ای)

### فاز ۱: کم‌ریسک (۱–۲ هفته)

| کار | توضیح |
|-----|-------|
| ۱.۱ | نصب و تنظیم ESLint + Prettier |
| ۱.۲ | تفکیک `dashboard.js` به ماژول‌های کوچک‌تر (API client، auth، i18n، router) |
| ۱.۳ | ایجاد migrationهای نسخه‌دار Sequelize؛ انتقال تدریجی auto-migrations |
| ۱.۴ | تفکیک routeهای gateway و contact از `api.js` به فایل‌های جدا |

### فاز ۲: Backend (۲–۳ هفته)

| کار | توضیح |
|-----|-------|
| ۲.۱ | اضافه کردن لایه Controller |
| ۲.۲ | معرفی validation schemas (مثلاً Zod) |
| ۲.۳ | استاندارد کردن format خطا و پاسخ API |
| ۲.۴ | API versioning (`/api/v1/`) |
| ۲.۵ | لاگینگ ساختاریافته |

### فاز ۳: Frontend (۳–۴ هفته)

| کار | توضیح |
|-----|-------|
| ۳.۱ | راه‌اندازی `frontend/` با Vite یا Webpack |
| ۳.۲ | تفکیک کامل `dashboard.js` به ماژول‌های صفحه‌ای |
| ۳.۳ | مهاجرت تدریجی به React/Vue (اختیاری) |
| ۳.۴ | Build pipeline و minify |

### فاز ۴: تکمیل (۱–۲ هفته)

| کار | توضیح |
|-----|-------|
| ۴.۱ | تست integration برای flowهای اصلی |
| ۴.۲ | مستندات OpenAPI/Swagger |
| ۴.۳ | به‌روزرسانی مستندات استقرار |

---

## ۴. اولویت‌های پیشنهادی

1. **تفکیک `dashboard.js`** – تأثیر مستقیم روی نگهداری
2. **Controller layer** – جداسازی منطق از routeها
3. **Validators** – امنیت و کیفیت ورودی
4. **Migrations** – کنترل بهتر تغییرات schema

---

## ۵. فایل‌بندی و فولدربندی پیشنهادی

### Routes – دسته‌بندی پیشنهادی

```
routes/
├── index.js              # Router اصلی
├── auth.routes.js
├── users.routes.js
├── conversations.routes.js
├── customers.routes.js
├── departments.routes.js
├── branches.routes.js
├── tickets.routes.js
├── tasks.routes.js
├── processes.routes.js
├── announcements.routes.js
├── internal.routes.js
├── analytics.routes.js
├── supervision.routes.js
├── finance/              # زیرپوشه برای domain مالی
│   ├── rates.routes.js
│   ├── services.routes.js
│   └── exchange.routes.js
├── config/               # تنظیمات و پنل
│   ├── whatsapp.routes.js
│   ├── panel-settings.routes.js
│   └── company-emails.routes.js
├── webhooks.routes.js
└── misc/                 # tags, templates, bulk, upload
```

### Services – دسته‌بندی پیشنهادی

```
services/
├── core/
│   ├── database.js
│   ├── activityLog.js
│   └── seed.js
├── messaging/
│   ├── incomingMessage.js
│   ├── autoMessages.js
│   ├── aiResponseService.js
│   └── intelligentDepartmentRouter.js
├── notifications/
│   ├── emailService.js
│   └── notificationService.js
├── config/
│   ├── panelSettingsLoader.js
│   └── defaultDepartments.js
└── queue/
    ├── rabbitmq.js
    └── redis.js
```

---

---

## ۶. پیشرفت انجام‌شده (فاز ۱)

| کار | وضعیت |
|-----|--------|
| ESLint + Prettier | ✅ |
| تفکیک routeهای gateway و contact | ✅ |
| سازماندهی services (queue, config) | ✅ |
| ماژول api-client برای dashboard | ✅ |
| ماژول constants (VALID_PAGES, PAGE_IDS, ...) | ✅ |
| سرویس‌های config (panelSettingsLoader, defaultDepartments) | ✅ |
| سرویس‌های core (database, activityLog, seed) | ✅ |
| لایه Controller (branches, departments, analytics) | ✅ |
| ماژول utils (escapeHtml, formatPrice, formatChange) | ✅ |
| Controller users (لیست، پروفایل، CRUD، حذف) | ✅ |
| تفکیک کامل dashboard.js به صفحات | 🔲 (آینده) |

---

*برای ادامه، تفکیک بیشتر صفحات dashboard و لایه Controller در backend پیشنهاد می‌شود.*

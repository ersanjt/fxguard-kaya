# گزارش بررسی سیستم دسترسی‌ها (Permission Audit)

## خلاصه

این سند نتیجه بررسی جامع سیستم دسترسی‌های پنل CRM و اصلاحات انجام‌شده را شرح می‌دهد تا اطمینان حاصل شود هر کاربر فقط به مکالمات، چت‌ها و بخش‌هایی که مجاز است دسترسی دارد.

---

## ساختار دسترسی‌ها

### نقش‌ها (Roles)
- **owner**: مالک — دسترسی کامل
- **admin**: ادمین — دسترسی کامل به‌جز نظارت مالک
- **manager**: مدیر — مدیریت دپارتمان، کاربران، تیکت‌ها
- **supervisor**: ناظر — مشاهده ورودها، کاربران (بدون مدیریت دپارتمان)
- **agent**: کارمند — دسترسی محدود به مکالمات تخصیص‌یافته و مشتریان مرتبط

### بخش‌های پنل (SECTION_KEYS)
| بخش | کلید | owner | admin | manager | supervisor | agent |
|-----|------|-------|-------|---------|------------|-------|
| داشبورد | dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| مکالمات | conversations | ✓ | ✓ | ✓ | ✓ | ✓ |
| مشتریان | customers | ✓ | ✓ | ✓ | ✓ | ✓ |
| تیکت‌ها | tickets | ✓ | ✓ | ✓ | ✓ | ✓ |
| وظایف | tasks | ✓ | ✓ | ✓ | ✓ | ✓ |
| دپارتمان‌ها | departments | ✓ | ✓ | ✓ | ✗ | ✗ |
| کاربران | users | ✓ | ✓ | ✓ | ✓ | ✗ |
| شعب | branches | ✓ | ✓ | ✓ | ✗ | ✗ |
| نظارت (مالک) | supervision | ✓ | ✗ | ✗ | ✗ | ✗ |
| ورودها و وضعیت آنلاین | staff_activity | ✓ | ✓ | ✓ | ✓ | ✗ |
| چت داخلی | internal_chat | ✓ | ✓ | ✓ | ✓ | ✓ |
| اعلان‌ها | announcements | ✓ | ✓ | ✓ | ✓ | ✓ |
| واتساپ | whatsapp | ✓ | ✓ | ✗ | ✗ | ✗ |
| نرخ ارز | rates | ✓ | ✓ | ✗ | ✗ | ✗ |
| خدمات | services | ✓ | ✓ | ✓ | ✓ | ✓ |
| تنظیمات پنل | panel_settings | ✓ | ✓ | ✗ | ✗ | ✗ |

---

## دسترسی به مکالمات (Conversations)

### منطق دسترسی (محدود — فقط تخصیص صریح)
کاربر به مکالمه دسترسی دارد اگر:
1. **ادمین اصلی / owner / admin / manager** → همه مکالمات
2. **تخصیص‌یافته به خود** (`assignedTo === userId`) — توسط سیستم، ادمین یا مدیر
3. **همان دپارتمان** (`departmentId` مکالمه = `departmentId` کاربر)

کاربران عادی **نمی‌توانند** مکالمات دیگران را ببینند؛ فقط مکالماتی که به آن‌ها یا دپارتمانشان تخصیص شده است.

### ارسال پیام
فقط کاربری که به مکالمه دسترسی دارد می‌تواند پیام بفرستد. بررسی در `POST /conversations/:id/send` انجام می‌شود.

---

## دسترسی به مشتریان (Customers)

### منطق
- **ادمین / owner / manager** → همه مشتریان
- **بقیه** → فقط مشتریان مکالمات تخصیص‌یافته به خود یا دپارتمان خود

---

## دسترسی به تیکت‌ها (Tickets) — اصلاح شده

### تغییرات
1. **requireSection('tickets')** در مسیر `/api/tickets`
2. **فیلتر سطح تیکت** برای کارمند/ناظر:
   - فقط تیکت‌های **تخصیص‌یافته به خود**
   - تیکت‌های **ایجادشده توسط خود**
   - تیکت‌های **دپارتمان خود**

### آمار تیکت‌ها
آمار (`/stats`) اکنون بر اساس تیکت‌های قابل دسترسی کاربر محاسبه می‌شود.

---

## دسترسی به وظایف (Tasks)

- **requireSection('tasks')** در مسیر `/api/tasks`
- منطق قبلی حفظ شده: ادمین/مالک همه؛ مدیر/ناظر دپارتمان خود؛ کارمند تسک‌های اختصاص‌یافته

---

## دسترسی به چت داخلی (Internal Chat)

- **requireSection('internal_chat')** در مسیر `/api/internal`
- دسترسی به ترد: فقط اگر کاربر در `InternalThreadParticipant` باشد
- لیست کاربران برای چت: مالک/ادمین همه؛ بقیه فقط هم‌شعبه‌ای‌ها

---

## دسترسی به شعب (Branches)

- **canAccess('branches')** در هر مسیر
- لیست: ادمین/مالک همه؛ بقیه فقط شعبه خود

---

## دسترسی به نظارت (Supervision)

- **canAccess('supervision')** برای مسیرهای مالک (conversations, activity, internal-chats, performance)
- **canAccess('staff_activity')** برای logins، online، user detail، attendance-report

---

## دسترسی به اعلان‌ها (Announcements)

- **requireSection('announcements')** در مسیر `/api/announcements`

---

## فرانت‌اند (Frontend)

### نمایش منو
- `applyNavByRole()` لینک‌های منو را بر اساس `currentUser.permissions` مخفی می‌کند
- `applyHiddenSections()` بخش‌های مخفی شده در تنظیمات پنل را مخفی می‌کند

### جلوگیری از دسترسی مستقیم
در `showPage()` بررسی می‌شود اگر کاربر به بخشی دسترسی ندارد (مثلاً با تایپ مستقیم در URL)، به داشبورد هدایت شود.

---

## فایل‌های تغییر یافته

| فایل | تغییرات |
|------|---------|
| `backend/server.js` | اضافه شدن requireSection برای tickets، tasks، internal، announcements |
| `backend/routes/tickets.js` | فیلتر دسترسی سطح تیکت، canAccessTicket برای هر عملیات |
| `backend/routes/branches.js` | canAccess('branches') در مسیرها |
| `backend/routes/supervision.js` | canAccess('supervision') و canAccess('staff_activity') |
| `backend/routes/analytics.js` | canAccess('dashboard') |
| `backend/public/js/dashboard.js` | بررسی دسترسی در showPage برای همه بخش‌ها |

---

## توصیه‌ها

1. **تست دسترسی**: با نقش‌های مختلف (agent، supervisor، manager) تست کنید که هر کاربر فقط داده‌های مجاز را می‌بیند.
2. **Override دسترسی**: در ویرایش کاربر می‌توان دسترسی هر بخش را به‌صورت جداگانه فعال/غیرفعال کرد.
3. **ادمین اصلی**: ایمیل‌های در `MAIN_ADMIN_EMAIL` (env) همیشه دسترسی کامل دارند.

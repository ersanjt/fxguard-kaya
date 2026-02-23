# ساختار پروژه WhatsApp Enterprise CRM

راهنمای مرجع برای ساختار صفحات، آیتم‌ها، سایدبارها و محل کد هر بخش.

---

## ۱. ساختار کلی پروژه

```
whatsapp-enterprise-crm/
├── backend/                 # سرور Node.js + Express
│   ├── server.js           # نقطه ورود، API، Socket.IO
│   ├── routes/             # مسیرهای API
│   ├── models/             # مدل‌های Sequelize
│   ├── middleware/         # احراز هویت و ...
│   ├── services/           # سرویس‌ها (ایمیل، تنظیمات، ...)
│   ├── config/             # تنظیمات دیتابیس
│   ├── lib/                # توابع کمکی
│   └── public/             # فایل‌های استاتیک فرانت
│       ├── dashboard.html  # صفحه اصلی SPA
│       ├── css/dashboard.css
│       └── js/dashboard.js
├── gateway/                # سرویس واتساپ وِب
└── STRUCTURE.md            # این فایل
```

---

## ۲. صفحات (Pages) و مسیرها

| صفحه | ID | Hash | توابع بارگذاری | مسیر API |
|------|-----|------|----------------|----------|
| داشبورد | `pageDashboard` | `#dashboard` | `loadDashboard()` | `/api/analytics` |
| مکالمات | `pageConversations` | `#conversations` | `loadConversations()`, `loadMessages()` | `/api/conversations` |
| مشتریان | `pageCustomers` | `#customers` | `loadCustomers()` | `/api/customers` |
| جزئیات مشتری | `pageCustomerDetail` | — | `showCustomerHistory()` | `/api/customers/:id` |
| تیکت‌ها | `pageTickets` | `#tickets` | `loadTickets()`, `loadTicketDetail()` | `/api/tickets` |
| دپارتمان‌ها | `pageDepartments` | `#departments` | `loadDepartments()` | `/api/departments` |
| کاربران | `pageUsers` | `#users` | `loadUsers()` | `/api/users` |
| وظایف‌و تسک‌ها | `pageTasks` | `#tasks` | `loadTasks()`, `loadTaskDetail()` | `/api/tasks` |
| فرایندها | `pageProcesses` | `#processes` | `loadProcessTemplates()`, `loadProcessInstances()` | `/api/processes` |
| پروفایل | `pageProfile` | `#profile` | `loadProfile()` | `/api/auth/me` |
| اعلان‌ها | `pageAnnouncements` | `#announcements` | `loadAnnouncements()` | `/api/announcements` |
| چت داخلی | `pageInternalChat` | `#internal-chat` | `loadInternalThreads()`, `loadInternalMessages()` | `/api/internal` |
| شعب | `pageBranches` | `#branches` | `loadBranches()` | `/api/branches` |
| ورودها و وضعیت | `pageStaffActivity` | `#staff-activity` | `loadStaffActivity()` | `/api/supervision` |
| نظارت | `pageSupervision` | `#supervision` | `loadSupervisionPerformance()` | `/api/supervision` |
| واتساپ | `pageWhatsapp` | `#whatsapp` | `loadWhatsappStatus()` | `/api/whatsapp` |
| نرخ ارزها | `pageRates` | `#rates` | `loadRatesAdjustments()`, `loadCurrencies()` | `/api/rates` |
| خدمات صرافی | `pageServices` | `#services` | `loadServices()`, `loadTransactions()` | `/api/services`, `/api/exchange` |
| ظاهر پنل | `pagePanelSettings` | `#panel-settings` | `loadPanelSettings()` | `/api/panel-settings` |

**نکته:** تابع `showPage(page)` در `dashboard.js` مسئول نمایش صفحه و به‌روزرسانی سایدبار است.

---

## ۳. سایدبار (Sidebar)

**مسیر HTML:** `dashboard.html` → خط ~۱۸۲–۲۱۲

**ساختار:**
- `.sidebar` (id: `sidebar`)
- `.nav-section` — هر بخش منو
- `.nav-section-title` — عنوان بخش (مثلاً «ارتباطات»)
- `.nav-link` — آیتم‌های منو با `data-page` و `data-section`

**بخش‌های منو:**

| بخش | data-section | آیتم‌ها |
|-----|--------------|---------|
| داشبورد | `dashboard` | داشبورد |
| ارتباطات | `conversations` | مکالمات، مشتریان، تیکت‌های داخلی |
| سازمان | `tasks` | وظایف، فرایندها، دپارتمان‌ها، کاربران، شعب، نظارت، ورودها |
| تنظیمات | `profile` | پروفایل، چت داخلی، اعلان‌ها، واتساپ، نرخ ارزها، خدمات، ظاهر پنل |

**آیتم‌های مخفی (فقط مالک):**
- `nav-supervision` — نظارت (مالک)
- `nav-staff-activity` — ورودها و وضعیت آنلاین

**کد:** `applyNavByRole()` و `applyHiddenSections()` در `dashboard.js` نمایش/مخفی‌سازی را کنترل می‌کنند.

---

## ۴. اسلایدرها و مارکی‌ها

### ۴.۱ نوار اعلان (Announcement Marquee)
- **مسیر HTML:** `dashboard.html` → `#announcementMarquee`
- **کلاس:** `.announcement-marquee`
- **محتوا:** `.announcement-marquee-inner` — آیتم‌های اعلان با انیمیشن
- **توابع:** `loadGeneralAnnouncementsMarquee()`, `pauseAnnouncementMarquee()`, `resumeAnnouncementMarquee()`
- **API:** `/api/announcements` (عمومی)

### ۴.۲ نوار قیمت (Price Ticker)
- **مسیر HTML:** `dashboard.html` → `#priceTicker` (نزدیک انتهای صفحه)
- **کلاس:** `.price-ticker`
- **عناصر:** `#tickerTimes`, `#tickerItemTrack`, `#tickerItems`
- **توابع:** `fetchRates()`, `startRatesInterval()`, `updateTickerTimeOnly()`
- **API:** `/api/rates`

---

## ۵. هدر و المان‌های مشترک

| المان | ID | مسیر |
|-------|-----|------|
| لوگو | `headerLogo`, `headerLogoIcon`, `headerLogoText` | `dashboard.html` |
| جستجو | `headerSearch`, `headerSearchModal` | `dashboard.html` |
| سوئیچ زبان | `headerLangFa`, `headerLangEn`, `headerLangTr` | `dashboard.html` |
| پروفایل کاربر | `userAvatar`, `userEmail` | `dashboard.html` |
| دکمه منو | `headerMenuBtn` | `dashboard.html` |
| فوتر اپ | `appFooter`, `appFooterBrand` | `dashboard.html` |

---

## ۶. مسیرهای API (Backend)

| مسیر | فایل | توضیح |
|------|------|-------|
| `/api/auth` | `routes/auth.js` | ورود، خروج، TOTP، فراموشی رمز |
| `/api/users` | `routes/users.js` | CRUD کاربران |
| `/api/conversations` | `routes/conversations.js` | مکالمات (شامل ارسال پیام) |
| `/api/customers` | `routes/customers.js` | مشتریان |
| `/api/departments` | `routes/departments.js` | دپارتمان‌ها |
| `/api/tickets` | `routes/tickets.js` | تیکت‌ها |
| `/api/tasks` | `routes/tasks.js` | تسک‌ها |
| `/api/processes` | `routes/processes.js` | فرایندها |
| `/api/branches` | `routes/branches.js` | شعب |
| `/api/announcements` | `routes/announcements.js` | اعلان‌ها |
| `/api/internal` | `routes/internal.js` | چت داخلی |
| `/api/rates` | `routes/rates.js` | نرخ ارزها |
| `/api/services` | `routes/services.js` | سرویس‌های صرافی |
| `/api/exchange` | `routes/exchange.js` | صندوق، بانک، تراکنش |
| `/api/whatsapp` | `routes/whatsapp.js` | تنظیمات واتساپ |
| `/api/panel-settings` | `routes/panelSettings.js` | ظاهر پنل |
| `/api/upload` | `routes/upload.js` | آپلود فایل |
| `/api/analytics` | `routes/analytics.js` | آمار داشبورد |
| `/api/supervision` | `routes/supervision.js` | نظارت و ورودها |

---

## ۷. مودال‌ها و پاپ‌آپ‌ها

| مودال | ID | توابع |
|-------|-----|-------|
| جستجو | `headerSearchModal` | `openHeaderSearchPopup()`, `closeHeaderSearchPopup()` |
| مکالمه جدید | — | `openNewConvModal()` |
| مشتری | `customerModal` | `openCustomerModal()` |
| تیکت | — | `toggleTicketForm()` |
| تسک | — | `toggleTaskForm()` |
| چت داخلی | `internalChatPopup` | `showInternalChatPopup()` |
| چت داخلی کامل | — | `closeInternalChatPopup()` |
| ظاهر پنل | — | تب‌های داخل `pagePanelSettings` |

---

## ۸. فایل‌های کلیدی و محل کد

| بخش | فایل | مسیر تقریبی |
|-----|------|----------------|
| روتینگ و نمایش صفحه | `dashboard.js` | `showPage()` ~ خط ۴۱۳۵ |
| سایدبار active | `dashboard.js` | `showPage()` ~ خط ۴۱۲۲ |
| بارگذاری داشبورد | `dashboard.js` | `loadDashboard()` ~ خط ۲۴۱۳ |
| بارگذاری مکالمات | `dashboard.js` | `loadConversations()` ~ خط ۲۸۱۲ |
| بارگذاری مشتریان | `dashboard.js` | `loadCustomers()` ~ خط ۳۳۰۵ |
| تیکت‌ها | `dashboard.js` | `loadTickets()` ~ خط ۴۲۱۰ |
| تسک‌ها | `dashboard.js` | `loadTasks()` ~ خط ۴۴۶۵ |
| اعلان‌ها | `dashboard.js` | `loadAnnouncements()` ~ خط ۲۶۲۴ |
| مارکی اعلان | `dashboard.js` | `loadGeneralAnnouncementsMarquee()` ~ خط ۲۵۲۲ |
| نوار قیمت | `dashboard.js` | `fetchRates()` ~ خط ۹۷۲ |
| تنظیمات پنل | `dashboard.js` | `loadPanelSettings()` ~ خط ۳۷۳۶ |
| استایل‌های اصلی | `dashboard.css` | کل فایل |
| استایل سایدبار | `dashboard.css` | `.sidebar` ~ خط ۲۶۳ |
| استایل ظاهر پنل | `dashboard.css` | `.page-panel-settings` ~ خط ۵۷۶ |
| استایل تیکر | `dashboard.css` | `.price-ticker` |

---

## ۹. i18n و ترجمه‌ها

| فایل | زبان |
|------|------|
| `js/i18n-fa.js` | فارسی |
| `js/i18n-tr.js` | ترکی |
| `js/dashboard.js` | انگلیسی (fallback + I18N درون‌خطی) |

**کلیدها:** `data-i18n`, `data-i18n-ph`, `data-i18n-title` — تابع `t(key)` و `applyTranslations()`.

---

## ۱۰. VALID_PAGES

لیست صفحات معتبر در `dashboard.js`:

```javascript
['dashboard', 'conversations', 'customers', 'departments', 'users', 'tickets', 
 'tasks', 'processes', 'whatsapp', 'branches', 'supervision', 'staff-activity', 
 'profile', 'announcements', 'internal-chat', 'rates', 'services', 'panel-settings']
```

---

## ۱۱. نقشه ID → صفحه

| page ID | element ID |
|---------|------------|
| dashboard | pageDashboard |
| conversations | pageConversations |
| customers | pageCustomers |
| departments | pageDepartments |
| users | pageUsers |
| tickets | pageTickets |
| tasks | pageTasks |
| processes | pageProcesses |
| profile | pageProfile |
| announcements | pageAnnouncements |
| internal-chat | pageInternalChat |
| branches | pageBranches |
| staff-activity | pageStaffActivity |
| supervision | pageSupervision |
| whatsapp | pageWhatsapp |
| rates | pageRates |
| services | pageServices |
| panel-settings | pagePanelSettings |
| (جزئیات مشتری) | pageCustomerDetail |

---

*آخرین به‌روزرسانی: فوریه ۲۰۲۶*

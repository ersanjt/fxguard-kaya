# معماری فرانت‌اند داشبورد (Dashboard)

این سند برای توسعه‌دهندگانی است که روی پنل SPA کار می‌کنند. هدف: ساختار حرفه‌ای، قابلیت کار موازی چند نفر، و نگه‌داری آسان.

---

## وضعیت فعلی

- **ترجمهٔ داشبورد:** متن‌های قابل نمایش از `i18n-fa.js` / `i18n-en.js` / `i18n-tr.js`؛ داخل `dashboard.js` دیگر بلوک بزرگ تکراری I18N نیست (جز ادغام در آبجکت `I18N` از همان فایل‌های خارجی).
- **ورود اسکریپت‌ها (ترتیب مهم است):**
  1. `Chart.js` (CDN)
  2. `socket.io.js`
  3. `js/modules/constants.js` — صفحات معتبر، نقشهٔ مسیرها، عناوین
  4. `js/modules/utils.js` — `escapeHtml`, `formatPrice`, `formatChange`
  5. `js/modules/api-client.js` — `CRM.Api.fetch`, `CRM.Api.getError`, `CRM.Api.init()`
  6. `js/i18n-fa.js`, `i18n-en.js`, `i18n-tr.js` — ترجمه‌ها
  7. `js/dashboard.js` — منطق اصلی پنل (حجم زیاد)

- **نام فضای سراسری:** `window.CRM`  
  - `CRM.Constants` — از constants.js  
  - `CRM.Utils` — از utils.js  
  - `CRM.Api` — از api-client.js (بعد از `init` از داخل dashboard استفاده می‌شود)

- **متغیرهای حیاتی داخل dashboard.js:**  
  `API`, `token`, `currentUser`, `LANG`, `t(key)`, `headers()`, `showPage()`, `apiFetch()`, و صدها تابع دیگر در یک فایل.

---

## هدف معماری (چند متخصص روی یک پایه)

1. **هستهٔ مشترک (Core)**  
   یک نقطهٔ واحد برای: آدرس API، توکن، کاربر جاری، زبان، ترجمه، درخواست API، و توابع مشترک (مثل toast، escapeHtml). هر ماژول فقط از این هسته استفاده کند.

2. **ماژول‌های بر اساس ویژگی (Feature modules)**  
   هر بخش پنل یک ماژول جدا با مسئولیت روشن:
   - **auth** — ورود، خروج، TOTP، مقداردهی اولیه بعد از `/api/auth/me`
   - **conversations** — لیست مکالمات، چت، ارسال پیام
   - **customers** — لیست مشتریان، کارت مشتری، یادداشت، اسناد
   - **tickets** — لیست تیکت‌ها، جزئیات، پاسخ
   - **tasks** — لیست تسک‌ها، جزئیات، آپدیت
   - **rates** — نرخ ارز، تیکر، نمودار، تنظیمات
   - **exchange** — صندوق، حساب بانکی، تراکنش، سرویس‌ها
   - **profile** — پروفایل کاربر، تغییر رمز، TOTP
   - **panel-settings** — ظاهر پنل، SMTP، ایمیل‌های شرکتی، زبان‌ها
   - **internal-chat** — چت داخلی
   - **announcements** — اعلان‌ها
   - **whatsapp** — اتصال واتساپ، QR
   - **supervision** — نظارت
   - **processes** — فرایندها
   - **departments** — دپارتمان‌ها
   - **users** — کاربران
   - **branches** — شعب
   - **message-templates** — قالب پیام

3. **قرارداد ماژول**
   - هر ماژول یک IIFE یا یک شیء با `init(app)` که از هسته (مثلاً `app.api`, `app.t`, `app.currentUser`) استفاده می‌کند.
   - ماژول‌ها به یکدیگر وابسته نباشند؛ فقط به هسته وابسته باشند.
   - نام‌گذاری: `js/modules/feature/conversations.js` یا `js/modules/conversations.js`.

4. **فایل اصلی (راه‌انداز)**  
   یک فایل کوچک (مثلاً `dashboard.js` یا `app.js`) که:
   - هسته را مقداردهی می‌کند،
   - `CRM.Api.init` را صدا می‌زند،
   - بعد از موفق بودن `/api/auth/me` ماژول‌ها را یکی‌یکی `init(app)` می‌کند،
   - و فقط مسیردهی اولیه و نمایش صفحهٔ خالی/لاگین را انجام می‌دهد.

---

## مراحل پیشنهادی برای تفکیک (تدریجی)

1. **هسته (Core)**  
   - یک فایل مثلاً `js/app/core.js` که از روی مقادیر فعلی dashboard استخراج شود:
     - `getApiBase()`, `getToken()`, `setToken()`, `getCurrentUser()`, `setCurrentUser()`
     - `getLang()`, `setLang()`, `t(key)`
     - `apiFetch` می‌تواند همان `CRM.Api.fetch` باشد که با این هسته `init` شود.
   - یا بدون فایل جدید، همان `api-client.js` و constants و utils را به‌عنوان «هسته» در نظر بگیرید و فقط قرارداد استفاده را ثابت کنید.

2. **استخراج یک ویژگی به‌عنوان نمونه**  
   - مثلاً **auth**: همهٔ کد مربوط به لاگین، فراموشی رمز، TOTP، و بلوک «بعد از /api/auth/me» (اعمال تنظیمات، ناو، سوکت، نرخ، حضور، TOTP بنر، آماده‌سازی app) را به `js/modules/auth.js` منتقل کنید.
   - در dashboard فقط: بارگذاری اسکریپت auth و بعد از موفق بودن me، فراخوانی `Auth.onReady(app)`.

3. **تکرار برای بقیهٔ بخش‌ها**  
   - هر بار یک بخش (مثلاً conversations، customers، …) را جدا کنید، در یک فایل ماژول قرار دهید، و در راه‌انداز فقط آن را init کنید.

4. **تست و رگرسیون**  
   - بعد از هر استخراج، تست دستی مسیرهای مربوط به آن بخش و یک بار کل فلوی ورود و ناوگیشن.

---

## قراردادهای کدنویسی

- **زبان:** برای رشته‌های قابل نمایش به کاربر از `t('key')` استفاده شود؛ کلیدها در i18n تعریف شوند.
- **خروجی امن:** هر جا متنی از سرور یا کاربر داخل DOM می‌رود (مثل innerHTML)، از `CRM.Utils.escapeHtml` یا معادل استفاده شود.
- **API:** همهٔ درخواست‌ها از طریق `CRM.Api.fetch` (بعد از init) یا تابعی که در هسته روی آن قرار گرفته است.
- **مسیر و صفحه:** استفاده از همان `showPage(id)` و ثابت‌های `CRM.Constants` برای جلوگیری از رشتهٔ جادویی.

---

## وابستگی اسکریپت‌ها در HTML

ترتیب پیشنهادی برای زمانی که ماژول‌های ویژگی اضافه شوند:

```html
<script src="/socket.io/socket.io.js"></script>
<script src="/js/modules/constants.js"></script>
<script src="/js/modules/utils.js"></script>
<script src="/js/modules/api-client.js"></script>
<script src="/js/i18n-fa.js"></script>
<script src="/js/i18n-en.js"></script>
<script src="/js/i18n-tr.js"></script>
<!-- ماژول‌های ویژگی (در صورت تفکیک) -->
<!-- <script src="/js/modules/auth.js"></script> -->
<!-- <script src="/js/modules/conversations.js"></script> -->
<script src="/js/dashboard.js"></script>
```

فعلاً فقط یک فایل dashboard بارگذاری می‌شود؛ با استخراج هر ماژول، یک خط `<script src="...">` قبل از dashboard اضافه می‌شود.

---

## خلاصه

- **الان:** یک فایل بزرگ dashboard + ماژول‌های constants، utils، api-client و i18n.
- **هدف:** هستهٔ مشترک مشخص + ماژول‌های feature با init و وابستگی فقط به هسته، تا چند نفر بتوانند هم‌زمان روی بخش‌های مختلف کار کنند بدون تداخل زیاد.
- **روش:** استخراج تدریجی، یک بخش در هر مرحله، با تست بعد از هر تغییر.

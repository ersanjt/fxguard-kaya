# بازآرایی داشبورد (Dashboard refactor)

## انجام‌شده (۲۰۲۵)

1. **حذف ~۷۸۰ خط تکراری I18N از `dashboard.js`**  
   قبلاً همان متن‌ها دوبار بود: یک‌بار خراب (encoding) داخل فایل و یک‌بار در `i18n-fa/en/tr.js`. الان ترجمه‌ها **فقط** از فایل‌های `i18n-*.js` پر می‌شوند.

2. **`t()` برای ترکی**  
   مثل فارسی/انگلیسی، زبان `tr` مستقیم از `window.__I18N_TR` خوانده می‌شود.

3. **کلیدهای گم‌شده در `i18n-fa.js`**  
   مثلاً `nav_panel_settings`, `voice_record`, `save_changes`, … اضافه شدند تا UI فارسی کامل بماند.

## بک‌اند (۲۰۲۶)

- **مایگریشن Conversations:** منطق تکراری `firstReplyAt` / `metadata` در `services/core/database.js` در یک حلقهٔ واحد ادغام شد.

## مسیر بعدی (طبق `FRONTEND-ARCHITECTURE.md`)

| مرحله | توضیح |
|--------|--------|
| هسته | استخراج `apiFetch` / وضعیت auth به `js/modules/dashboard-core.js` |
| ماژول‌ها | `auth.js`, `announcements.js`, `conversations.js`, … هر کدام `init(app)` |
| باندلر (اختیاری) | Vite/Rollup برای import واقعی و tree-shaking |

**تبدیل یکجای ۱۰k+ خط به ES modules بدون باندلر** در HTML یعنی ده‌ها تگ `<script>` و ترتیب دستی — توصیه: **تدریجی** یا **باندلر**.

## تست دستی پس از تغییر

- [ ] ورود + TOTP
- [ ] سوئیچ fa / en / tr روی صفحه ورود و داخل پنل
- [ ] یک صفحه با `t()` (مثلاً اعلان‌ها، ظاهر پنل)

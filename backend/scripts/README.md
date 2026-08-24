# اسکریپت‌های یک‌باره (backend/scripts)

بیشتر **اضافه‌کردن ستون‌ها و ایندکس‌ها** هنگام بالا آمدن سرور به‌صورت **خودکار** در `services/core/database.js` (تابع `connectDatabases`) انجام می‌شود.

| نوع فایل | کاربرد |
|-----------|--------|
| `add-*.js` | برای دیتابیس‌های **قدیمی** یا زمانی که auto-migrate اجرا نشده؛ معمولاً دیگر لازم نیست مگر عیب‌یابی. |
| `add-plan-tier-trial-columns.js` | `panel_settings.planTier` و `whatsapp_configs.trial*` — در deploy GitHub Actions هم اجرا می‌شود. |
| `check-env.js` | بررسی متغیرهای محیطی قبل از اجرا. |
| `backup-database.js` | پشتیبان‌گیری دستی. |
| `send-test-email.js`، `set-panel-smtp.js` | ایمیل و SMTP. |
| `test-ai-response.js` | تست پاسخ AI. |

قبل از اجرای هر اسکریپت، از پوشه `backend`: `node scripts/<نام-فایل>.js` و در صورت نیاز `.env` را بارگذاری کنید.

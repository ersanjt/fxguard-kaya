# چک‌لیست قبل از push به `master` (دیپلوی خودکار)

هر push به **`master`** روی سرور **git pull + npm install + PM2 reload** اجرا می‌کند. کاربران آنلاین هستند — تغییرات را **کوچک و قابل برگشت** نگه دارید.

## قبل از commit

- [ ] لوکال تست شده: `cd backend && npm test` و در صورت امکان `npm run lint`
- [ ] migrationهای جدید **ایدم‌پوتنت** باشند (چند بار اجرا = یک نتیجه)
- [ ] `.env` / رمز / کلید در diff نباشد
- [ ] اگر فرانت عوض شد: نسخهٔ `?v=` در `dashboard.html` برای دور زدن کش CDN/مرورگر

## بعد از deploy

- [ ] `curl -s https://YOUR_DOMAIN/api/ping` یا همان چک workflow
- [ ] یک بار لاگین و یک مسیر اصلی (مکالمات / داشبورد)

## ساختار کد (کجا چه بنویسیم)

| مسیر | نقش |
|------|-----|
| `backend/routes/` | تعریف مسیر API |
| `backend/controllers/` | منطق HTTP (در صورت جدا بودن) |
| `backend/models/` | Sequelize |
| `backend/migrations/` | تغییر schema رسمی (ترجیح بر اسکریپت یک‌باره) |
| `backend/public/js/` | پنل — `dashboard.js` بزرگ؛ ترجمه در `i18n-*.js` |
| `backend/scripts/` | اسکریپت‌های deploy/مهاجرت دستی |
| `gateway/src/` | فقط واتساپ و webhook به backend |

جزئیات فرانت: `backend/docs/FRONTEND-ARCHITECTURE.md`

## اگر چیزی خراب شد

روی سرور: `pm2 logs crm-backend` (یا نام اپ در `ecosystem.config.js`) — در صورت نیاز `git reset --hard ORIG_HEAD` و `npm install` و reload (با احتیاط).

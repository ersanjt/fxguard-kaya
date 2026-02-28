# Migrations

این پروژه از **auto-migration** در `services/database.js` استفاده می‌کند که در زمان اجرا ستون‌های جدید را اضافه می‌کند.

برای پروژه‌های بزرگ‌تر، توصیه می‌شود به **versioned migrations** با Sequelize CLI مهاجرت کنید:

```bash
# نصب sequelize-cli (در devDependencies هست)
npx sequelize-cli migration:generate --name migration-name
```

فایل‌های migration در این پوشه ایجاد می‌شوند و با `npm run migrate` اجرا می‌گردند.

## نکته
Auto-migrations فعلی برای سازگاری با نسخه‌های قبلی حفظ شده‌اند. در صورت استفاده از migrations نسخه‌دار، می‌توان آن‌ها را حذف کرد.

# چیدمان کد Backend (برای توسعهٔ امن روی production)

## جریان درخواست

```
HTTP → server.js (helmet, cors, json) → routes/api.js → route files → controllers / models
Socket → socket/handlers.js
```

## پوشه‌ها

| پوشه | محتوا |
|------|--------|
| `config/` | env، DB، logger، CORS |
| `middleware/` | auth، خطا، webhook |
| `routes/` | نقشهٔ URL به منطق |
| `controllers/` | منطق تجمیعی بعضی بخش‌ها |
| `models/` | جداول Sequelize |
| `services/` | DB seed، ایمیل، صف، Redis، incoming message |
| `lib/` | توابع مشترک (encrypt، permissions، …) |
| `jobs/` | cron / وظایف زمان‌بندی |
| `public/` | استاتیک + SPA داشبورد |
| `scripts/` | مهاجرت‌های دستی که deploy اجرا می‌کند |
| `tests/` | suite با SQLite in-memory |

## قوانین پیشنهادی

1. **API جدید:** ترجیحاً route جدا + validation؛ از `dashboard.js` کپی نکنید — همان endpoint را از فرانت صدا بزنید.
2. **تغییر DB:** migration رسمی یا اسکریپت در `scripts/` که چندبار اجرا بی‌ضرر باشد.
3. **Secrets:** فقط `process.env` — هرگز در repo.

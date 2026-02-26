# راهنمای به‌روزرسانی امنیتی

این راهنما برای اعمال به‌روزرسانی‌های امنیتی بدون خرابی سرور است.

---

## ⚠️ مهم: قبل از push به GitHub

این به‌روزرسانی چند متغیر جدید اجباری دارد. اگر این متغیرها در `.env` سرور نباشند،
**سرور بعد از deploy استارت نخواهد شد.**

---

## مرحله ۱ — آپدیت `.env` سرور (قبل از push)

### ۱.۱ اتصال به سرور

```bash
ssh fxguard@92.205.58.83
```

### ۱.۲ بررسی `.env` فعلی

```bash
cat /var/www/kayaCRM/backend/.env
```

### ۱.۳ تولید کلیدهای تصادفی

```bash
# یک بار اجرا کن و خروجی‌ها را ذخیره کن
echo "JWT_SECRET:    $(openssl rand -hex 32)"
echo "WEBHOOK_SECRET: $(openssl rand -hex 32)"
echo "ENCRYPT_SECRET: $(openssl rand -hex 32)"
```

### ۱.۴ ویرایش `.env` بکند

```bash
nano /var/www/kayaCRM/backend/.env
```

متغیرهای زیر را اضافه یا آپدیت کن:

```env
# ---- الزامی (اگر وجود ندارند اضافه کن) ----

# کلید JWT — از خروجی openssl بالا
JWT_SECRET=<مقدار تولیدشده>

# ادمین‌های اصلی (همان ایمیل‌هایی که قبلاً هاردکد بود)
MAIN_ADMIN_EMAIL=admin@kaya.fxguard.io,ersanjahedtabrizi@gmail.com
MAIN_ADMIN_PASSWORD=<پسورد فعلی ادمین>

# کلید احراز هویت webhook (جدید)
WEBHOOK_SECRET=<مقدار تولیدشده>

# ---- اختیاری ----
# کلید رمزنگاری ایمیل شرکتی (اگر تنظیم نشود از JWT_SECRET استفاده می‌شود)
# ENCRYPT_SECRET=<مقدار تولیدشده>
```

ذخیره: `Ctrl+O` → `Enter` → `Ctrl+X`

### ۱.۵ آپدیت `.env` گیت‌وی

```bash
nano /var/www/kayaCRM/gateway/.env
```

اضافه کن:

```env
# همان مقدار WEBHOOK_SECRET که در backend/.env گذاشتی
WEBHOOK_SECRET=<همان مقدار>
```

---

## مرحله ۲ — تست دستی روی سرور (اختیاری ولی توصیه می‌شود)

```bash
cd /var/www/kayaCRM

# بررسی syntax فایل‌های تغییر کرده
node --check backend/server.js
node --check backend/middleware/auth.js
node --check backend/middleware/socketAuth.js
node --check backend/lib/encrypt.js
node --check backend/routes/upload.js
node --check backend/routes/auth.js
node --check gateway/src/index.js

echo "✅ همه فایل‌ها syntax درست دارند"
```

---

## مرحله ۳ — push کد به GitHub

روی کامپیوتر محلی:

```bash
git add backend/.env.example
git add backend/lib/encrypt.js
git add backend/middleware/auth.js
git add backend/middleware/socketAuth.js
git add backend/routes/auth.js
git add backend/routes/upload.js
git add backend/server.js
git add docker-compose.yml
git add gateway/src/index.js
git add .github/workflows/deploy.yml
git add docs/SECURITY-UPDATE-GUIDE.md

git commit -m "security: رفع آسیب‌پذیری‌های بحرانی امنیتی"
git push origin master
```

GitHub Actions به صورت خودکار deploy را شروع می‌کند.

---

## مرحله ۴ — نظارت بر deploy

### از GitHub:
به `https://github.com/<repo>/actions` برو و وضعیت را ببین.

### از سرور (در صورت خطا):
```bash
ssh fxguard@92.205.58.83

# وضعیت سرویس‌ها
pm2 status

# لاگ‌های اخیر backend
pm2 logs crm-backend --lines 50 --nostream

# لاگ‌های اخیر gateway
pm2 logs crm-gateway --lines 30 --nostream

# تست سلامت
curl http://localhost:3002/api/ping
```

---

## مرحله ۵ — بازگشت به نسخه قبل (در صورت خطا)

اگر بعد از deploy مشکلی پیش آمد:

```bash
ssh fxguard@92.205.58.83
cd /var/www/kayaCRM

# برگشت به commit قبلی
git log --oneline -5
git reset --hard <hash-commit-قبلی>

# restart
pm2 reload ecosystem.config.js --update-env
pm2 logs crm-backend --lines 20 --nostream
```

---

## خلاصه تغییرات این به‌روزرسانی

| فایل | تغییر |
|------|-------|
| `backend/server.js` | حذف credentials هاردکد، CORS درست، rate limit لاگین، webhook auth |
| `backend/middleware/auth.js` | حذف JWT fallback ضعیف |
| `backend/middleware/socketAuth.js` | اجباری شدن احراز هویت Socket.IO |
| `backend/routes/auth.js` | حذف JWT fallback ضعیف |
| `backend/routes/upload.js` | فیلتر نوع فایل، جلوگیری از XSS |
| `backend/lib/encrypt.js` | کلید رمزنگاری جداگانه از JWT |
| `gateway/src/index.js` | ارسال WEBHOOK_SECRET به backend |
| `docker-compose.yml` | MongoDB با پسورد، پورت‌های DB بسته |

# رفع مشکل اتصال واتساپ (QR اسکن می‌شود ولی وصل نمی‌شود)

اگر QR را اسکن می‌کنید ولی وضعیت به «متصل» تغییر نمی‌کند، این موارد را بررسی کنید.

## ۱. محیط اجرای Gateway (سرور / لینوکس / Docker)

Gateway از Puppeteer (Chrome headless) استفاده می‌کند. روی سرورهای لینوکس این تنظیمات اعمال شده‌اند:

- **آرگومان‌های Puppeteer**: `--no-sandbox`, `--disable-setuid-sandbox`, `--disable-dev-shm-usage`, `--disable-gpu` و چند مورد دیگر برای پایداری در headless.
- **مسیر session**: با `path.resolve` مطلق شده و پوشه session قبل از شروع ساخته می‌شود.
- **auth_failure**: در صورت خطای احراز هویت در لاگ ثبت می‌شود.

اگر هنوز بعد از اسکن قطع می‌شود یا خطا می‌دهد، در **همان سروری که Gateway اجرا می‌شود** لاگ Gateway را ببینید:

```bash
# اگر با PM2 اجرا می‌کنید
pm2 logs whatsapp-gateway

# یا خروجی مستقیم
cd gateway && node src/index.js
```

به این پیام‌ها دقت کنید:

- `✅ WhatsApp Authenticated` → اسکن درست بوده؛ بعد از آن باید `✅ WhatsApp Client Ready` بیاید.
- `❌ WhatsApp Auth Failure` → مشکل از احراز هویت (مثلاً نسخه واتساپ وب یا اتصال).
- اگر هیچ کدام نیامد و فقط QR دوباره عوض شد → ممکن است Chrome/Puppeteer روی سرور کرش کند (حافظه یا دسترسی).

## ۲. مسیر Session قابل نوشتن باشد

نشست واتساپ در مسیر زیر (یا مسیر `WHATSAPP_SESSION_PATH`) ذخیره می‌شود. این پوشه باید **قابل نوشتن** توسط کاربری باشد که Gateway را اجرا می‌کند:

- پیش‌فرض: `gateway/.wwebjs_auth/`
- یا مسیر مشخص شده با متغیر محیطی: `WHATSAPP_SESSION_PATH`

مثال برای سرور:

```bash
export WHATSAPP_SESSION_PATH=/var/lib/whatsapp-crm/.wwebjs_auth
mkdir -p "$WHATSAPP_SESSION_PATH"
chown -R کاربر-gateway:گروه "$WHATSAPP_SESSION_PATH"
```

## ۳. فقط یک بار با این شماره وصل باشید

اگر همان شماره واتساپ در جای دیگری (مثلاً WhatsApp Web در مرورگر یا یک Gateway دیگر) لاگین باشد، واتساپ با دلیل `CONFLICT` قطع می‌کند. فقط یک اتصال فعال برای یک شماره مجاز است.

## ۴. آرگومان‌های اضافی Puppeteer (در صورت نیاز)

اگر روی محیط خاص (مثلاً Docker یا سخت‌افزار محدود) هنوز مشکل دارید، می‌توانید آرگومان‌های اضافی به Puppeteer بدهید:

```bash
# مثال
export PUPPETEER_ARGS="--single-process,--no-zygote"
```

(مقادیر را با کاما از هم جدا کنید، بدون فاصله بعد از کاما مشکلی ندارد.)

## ۵. افزایش زمان انتظار برای اسکن QR

پیش‌فرض ۹۰ ثانیه است. در صورت نیاز می‌توانید بیشتر کنید:

```bash
export WHATSAPP_AUTH_TIMEOUT_MS=120000
```

## خلاصه تغییرات انجام‌شده در کد

- آرگومان‌های بیشتر برای Puppeteer در حالت headless برای پایداری روی سرور.
- مسیر session مطلق و ساخت پوشه session قبل از شروع.
- رویداد `auth_failure` برای تشخیص خطای احراز هویت.
- `authTimeout` ۹۰ ثانیه (قابل تنظیم با `WHATSAPP_AUTH_TIMEOUT_MS`).
- لاگ مسیر session در شروع برای اشکال‌زدایی.

بعد از اعمال این تغییرات، Gateway را یک بار متوقف و دوباره اجرا کنید، سپس QR را دوباره اسکن کنید و در صورت ادامه مشکل، خروجی لاگ Gateway را بررسی کنید.

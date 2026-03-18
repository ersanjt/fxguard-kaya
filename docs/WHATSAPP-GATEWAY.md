# واتساپ Gateway — وقتی «روشن نیست» یا قطع/وصل کند است

## شرط کار کردن حالت Gateway (QR)

1. **پروسهٔ Gateway** روی سرور اجرا باشد (مثلاً `pm2` با نام `crm-gateway` روی پورت **3001**).
2. در **backend** مقدار **`GATEWAY_URL`** در `.env` همان آدرسی باشد که Backend به Gateway می‌زند (روی یک سرور معمولاً `http://127.0.0.1:3001`).
3. **`GATEWAY_API_SECRET`** در `gateway/.env` و **همان مقدار** در تنظیمات اتصال پنل (یا env بک‌اند) یکی باشد؛ وگرنه 401 و پنل می‌گوید Gateway نیست.

## بعد از تغییرات اخیر (پنل)

- تماس وضعیت به Gateway تا **۱۲ ثانیه** صبر می‌کند (شبکه کند).
- بعد از **شروع Gateway / شروع کلاینت / قطع و اتصال مجدد**، پنل چند بار پشت‌سرهم وضعیت را به‌روز می‌کند تا QR و وضعیت زودتر دیده شود.

## اگر هنوز کند است

- روی سرور: `pm2 logs crm-gateway --lines 50`
- مطمئن شوید فقط **یک** نمونه Gateway در حال اجراست.

## لاگ بک‌اند: `Gateway request failed` با status **429**

یعنی سقف **rate limit** سراسری Gateway برای مسیر `/api/*` پر شده. مسیرهای **`/api/status`** و **`/api/qr`** (پولینگ پنل) از این سقف معاف هستند؛ در نسخه‌های قدیمی به‌خاطر اشتباه مسیر در `skip` همهٔ درخواست‌ها شمرده می‌شد و 429 می‌داد. بعد از به‌روزرسانی `gateway/src/index.js`، روی سرور: `pm2 reload crm-gateway`. در صورت نیاز `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS` را در `.env` Gateway بالا ببرید.

## لاگ بک‌اند: **413** روی `POST /api/webhook/incoming-message` (`PayloadTooLargeError`)

پیام با رسانهٔ بزرگ (base64) از سقف بدنه عبور می‌کند. در بک‌اند ابتدا **`X-Webhook-Secret`** بررسی می‌شود، سپس بدنه با **`WEBHOOK_BODY_LIMIT`** (پیش‌فرض **25mb**، حداکثر **50mb**) پارس می‌شود. بعد از `git pull`: `pm2 reload crm-backend`. اگر 413 از **nginx** است، `client_max_body_size` را (مثلاً در `server` یا `location /api`) بالا ببرید.

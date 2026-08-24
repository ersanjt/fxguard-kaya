# واتساپ Gateway — وقتی «روشن نیست» یا قطع/وصل کند است

## Production kaya.fxguard.io (سرور FXGuard)

| مورد | مقدار |
|------|--------|
| PM2 | `crm-gateway-kaya` |
| پورت Gateway | **3201** (`gateway/.env` → `PORT=3201`) |
| Backend | **3202** · `GATEWAY_URL=http://127.0.0.1:3201` |
| مسیر | `/var/www/kayaCRM-kaya` |

> **پورت 3001** روی همان سرور = **حسابداری** (`kaya-accounting`)، نه Gateway CRM. برای تست:  
> `curl -H "X-Gateway-Secret: …" http://127.0.0.1:3201/api/status`

راهنمای کامل: [DEPLOY-KAYA-SERVER.md](DEPLOY-KAYA-SERVER.md)

---

## خطای `listen EADDRINUSE: address already in use :::3002` روی Gateway

یعنی در **`gateway/.env`** مقدار **`PORT=3002`** گذاشته شده (اشتباه؛ آن پورت برای Backend است). Gateway باید **`PORT=3001`** باشد. بعد از اصلاح: `pm2 restart crm-gateway --update-env`.

از نسخه‌های اخیر، در production اگر `PORT=3002` باشد فرایند با پیام خطا متوقف می‌شود تا دوباره با پورت اشتباه بالا نیاید.

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

## پیام از پنل ارسال می‌شود ولی جواب مشتری در CRM نمی‌آید

ارسال از CRM یعنی Gateway وصل است. دریافت جداست:

1. رویداد `message` گاهی برای پیام ورودی شلیک نمی‌شود (مالتی‌دیوایس / LID). Gateway باید همان پیام را از `message_create` هم به بک‌اند بفرستد.
2. اگر `getChat()` برای LID خطا بدهد، پیام نباید دور ریخته شود؛ با `from` / `id.remote` ادامه می‌دهد. شمارهٔ خودِ خط (`to`) را مشتری حساب نکن؛ جواب `@lid` باید به همان مکالمهٔ شمارهٔ واقعی بچسبد.
3. اگر هر دو رویداد واتساپ ساکت بمانند، Gateway از `Store.Msg` و خواندن دوره‌ای unread همان پیام را برمی‌دارد. در لاگ باید `Store inbound message hook attached` یا `via: store_poll` دیده شود.
4. برای ویس/استیکر/تصویر: اگر `downloadMedia` یا Store blob خالی باشد، Gateway با `mediaKey` + `directPath` فایل رمزشده را از CDN واتساپ می‌گیرد و در Node رمزگشایی می‌کند. در لاگ موفق باید `hasMediaBytes: true` یا `Inbound media decrypted from CDN` دیده شود؛ پیام‌های قدیمی که فقط به‌صورت «پیام صوتی» / «استیکر» ذخیره شده‌اند فایل ندارند و باید دوباره ارسال شوند.
5. روی سرور: `pm2 logs crm-gateway-kaya --lines 80` را برای `📨 Message received` یا `getChat failed` ببینید. بعد از به‌روزرسانی کد، Gateway را **یک‌بار** با stop → خواب ۳ ثانیه → `pkill -9 -f -- '--user-data-dir=…/sessions/session'` → حذف Singleton* → start بالا بیاورید و تا `WhatsApp Client Ready` صبر کنید. اگر لاگ فقط `QR Code Generated` می‌دهد، در پنل اسکن کنید و دوباره ری‌استارت نکنید.

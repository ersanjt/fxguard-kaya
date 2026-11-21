# راه‌اندازی WhatsApp Business Cloud API

با استفاده از Cloud API رسمی Meta می‌توانید بدون Gateway و بدون اسکن QR به واتساپ متصل شوید.

برای مسیر SaaS (مشتری خودش با یک دکمه وصل شود): برنامهٔ **Tech Provider + Embedded Signup** را در [META-TECH-PROVIDER-PLAN-FA.md](./META-TECH-PROVIDER-PLAN-FA.md) ببینید. تنظیم دستی زیر برای کایا/پشتیبانی و تا قبل از Approve متا کافی است.

## پیش‌نیاز

1. اپلیکیشن در [Meta for Developers](https://developers.facebook.com/)
2. دسترسی به WhatsApp Business API
3. Access Token و Phone Number ID از اپ شما

## تنظیم .env

در `backend/.env` این متغیرها را اضافه کنید:

```env
WHATSAPP_CLOUD_ACCESS_TOKEN=توکن_دسترسی_شما
WHATSAPP_CLOUD_PHONE_NUMBER_ID=شماره_آیدی_شماره_تان
WHATSAPP_CLOUD_VERIFY_TOKEN=یک_رشته_تصادفی_برای_تأیید_وب‌هوک
WHATSAPP_CLOUD_APP_SECRET=App_Secret_از_Meta_App_Settings_Basic
# اختیاری؛ پیش‌فرض نسخه پشتیبانی‌شده v26.0 است
WHATSAPP_CLOUD_GRAPH_API_VERSION=v26.0
```

- **WHATSAPP_CLOUD_ACCESS_TOKEN**: توکن دسترسی دائمی (یا بلندمدت) از Meta
- **WHATSAPP_CLOUD_PHONE_NUMBER_ID**: شناسه شماره واتساپ بیزنس
- **WHATSAPP_CLOUD_VERIFY_TOKEN**: هر رشته دلخواه؛ در Meta App هنگام ثبت Webhook باید همان را وارد کنید
- **WHATSAPP_CLOUD_APP_SECRET**: از Meta App → Settings → Basic — برای اعتبارسنجی امضای وب‌هوک (`X-Hub-Signature-256`) **الزامی** است
- **WHATSAPP_CLOUD_GRAPH_API_VERSION**: نسخه Graph؛ اگر خالی یا نامعتبر باشد `v26.0` استفاده می‌شود

همین مقادیر را می‌توانید از پنل **#whatsapp → Cloud API** هم ذخیره کنید (به‌جز App Secret که فقط در `.env` است).

## اگر شماره الان روی WhatsApp Business موبایل است (Coexistence)

اگر شماره مشتری (مثل `+90 533 947 08 80`) روی **اپ WhatsApp Business موبایل** فعال است و می‌خواهید همان اپ را نگه دارید و همزمان CRM را وصل کنید:

1. در Meta مسیر **Embedded Signup / Coexistence** را انتخاب کنید (نه مهاجرت کامل که اپ موبایل را قطع می‌کند).
2. WABA، Phone Number ID، System User token و App Secret را **فقط برای همان مشتری** بگیرید — توکن/شماره مشتری دیگر FXGuard را قاطی نکنید.
3. Webhook را روی دامنهٔ **همان پنل** بگذارید:
   - پنل کایا: `https://kaya.fxguard.io/api/webhook/whatsapp-cloud`
   - پنل خودخدمت: `https://<slug>.app.fxguard.io/api/webhook/whatsapp-cloud` (یا دامنه اختصاصی)
4. علاوه بر `messages`، فیلدهای Coexistence را Subscribe کنید: `smb_message_echoes`، `history`، `smb_app_state_sync`، `account_update`.
5. Verify Token و App Secret همان پنل را در Meta وارد کنید؛ inbound با `phone_number_id` به سازمان درست نگاشت می‌شود.
6. در ۲۴ ساعت اول بعد از onboarding: `POST /api/whatsapp/cloud/coexistence/sync` با `{ "syncType": "both" }` (ادمین/مالک).
7. در پنل حالت اتصال را **Cloud** یا **cloud_first** بگذارید و تست قالب/پیام + یک پاسخ از اپ موبایل را بزنید.

> Runbook کامل (چرا Token Alone کافی نیست، جدول فیلدها، تست): [WHATSAPP-COEXISTENCE-RUNBOOK.md](./WHATSAPP-COEXISTENCE-RUNBOOK.md)

> Gateway (QR) را برای همین شماره موازی روشن نکنید مگر فقط به‌عنوان fallback موقت روی پنل سکو و با آگاهی از تداخل نشست.

## قالب Meta برای ارسال انبوه

برای ارسال انبوه امن (خارج از پنجره ۲۴ ساعته) یک قالب تأییدشده در Meta Business بسازید و نام آن را تنظیم کنید:

```env
WHATSAPP_CLOUD_BULK_TEMPLATE_NAME=hello_world
WHATSAPP_CLOUD_BULK_TEMPLATE_LANGUAGE=en_US
```

**توجه:** `hello_world` فقط قالب نمونه انگلیسی (`en_US`) است. برای پیام فارسی و ارسال تجاری، یک قالب تأییدشده با زبان `fa` در Meta ایجاد و در پنل وارد کنید.

یا در پنل **#whatsapp** فیلدهای «قالب Meta (ارسال انبوه)» را پر کنید. در مودال **ارسال انبوه** گزینه «ارسال با قالب Meta» را فعال بگذارید.

## تست اتصال

در پنل **#whatsapp** دکمه **تست اتصال Meta** (یا `POST /api/whatsapp/cloud/verify`) Token و Phone Number ID را با Graph API بررسی می‌کند.

## تنظیم وب‌هوک در Meta

1. Meta for Developers → اپ شما → WhatsApp → Configuration
2. در بخش **Webhook** روی **Edit** بزنید
3. **Callback URL**:
   ```
   https://دامنه-شما.com/api/webhook/whatsapp-cloud
   ```
4. **Verify Token**: همان مقدار `WHATSAPP_CLOUD_VERIFY_TOKEN` را وارد کنید
5. **Webhook Fields**: حتماً `messages` را انتخاب کنید؛ برای Coexistence همچنین `smb_message_echoes`، `history`، `smb_app_state_sync`، `account_update`

## آدرس عمومی Backend

برای ارسال رسانه (تصویر، صوت، فایل) باید `BACKEND_PUBLIC_URL` تنظیم شود تا Meta بتواند فایل را دانلود کند:

```env
BACKEND_PUBLIC_URL=https://api.example.com
```

## Cloud API در برابر Gateway

| ویژگی        | Cloud API         | Gateway (whatsapp-web.js) |
|--------------|-------------------|---------------------------|
| QR / اسکن    | ❌ ندارد          | ✅ دارد                   |
| اتصال رسمی   | ✅ Meta           | غیررسمی                   |
| وب‌هوک ورودی | Meta به Backend   | Gateway به Backend        |
| ارسال پیام   | مستقیم از Backend | از طریق Gateway           |

اگر هر دو تنظیم شوند، **Cloud API اولویت دارد** و ارسال/دریافت از آن استفاده می‌شود.

---

**چک‌لیست گام‌به‌گام production:** [WHATSAPP-META-CHECKLIST-KAYA.md](./WHATSAPP-META-CHECKLIST-KAYA.md)

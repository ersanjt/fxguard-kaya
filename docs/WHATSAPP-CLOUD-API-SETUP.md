# راه‌اندازی WhatsApp Business Cloud API

با استفاده از Cloud API رسمی Meta می‌توانید بدون Gateway و بدون اسکن QR به واتساپ متصل شوید.

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
```

- **WHATSAPP_CLOUD_ACCESS_TOKEN**: توکن دسترسی دائمی (یا بلندمدت) از Meta
- **WHATSAPP_CLOUD_PHONE_NUMBER_ID**: شناسه شماره واتساپ بیزنس
- **WHATSAPP_CLOUD_VERIFY_TOKEN**: هر رشته دلخواه؛ در Meta App هنگام ثبت Webhook باید همان را وارد کنید
- **WHATSAPP_CLOUD_APP_SECRET**: از Meta App → Settings → Basic — برای اعتبارسنجی امضای وب‌هوک (`X-Hub-Signature-256`) **الزامی** است

همین مقادیر را می‌توانید از پنل **#whatsapp → Cloud API** هم ذخیره کنید (به‌جز App Secret که فقط در `.env` است).

## قالب Meta برای ارسال انبوه

برای ارسال انبوه امن (خارج از پنجره ۲۴ ساعته) یک قالب تأییدشده در Meta Business بسازید و نام آن را تنظیم کنید:

```env
WHATSAPP_CLOUD_BULK_TEMPLATE_NAME=hello_world
WHATSAPP_CLOUD_BULK_TEMPLATE_LANGUAGE=fa
```

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
5. **Webhook Fields**: حتماً `messages` را انتخاب کنید

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

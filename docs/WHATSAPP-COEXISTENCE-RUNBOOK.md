# Runbook — Meta Coexistence (WhatsApp Business App + FXGuard CRM)

راهنمای عملی برای شمارهٔ مشتری که **همین الان روی اپ WhatsApp Business موبایل فعال است** و باید همزمان در CRM دیده شود.

| مورد | مقدار نمونه (کایا) |
|------|---------------------|
| شماره | `+90 533 947 08 80` |
| پنل | `https://kaya.fxguard.io` |
| Webhook | `https://kaya.fxguard.io/api/webhook/whatsapp-cloud` |
| حالت اتصال پیشنهادی | `cloud` یا `cloud_first` |

> **جداسازی سازمان:** توکن، WABA، Phone Number ID و App Secret این مشتری را با مشتری دیگر FXGuard یکی نکنید. برای پنل خودخدمت، Callback همان دامنهٔ سازمان است نه دامنه کایا.

مرجع رسمی Meta: [Onboard WhatsApp Business app users](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users)

---

## چرا فقط وارد کردن Access Token کافی نیست؟

| لایه | Cloud معمولی | Coexistence (اپ Business فعال) |
|------|--------------|--------------------------------|
| ثبت شماره | شمارهٔ Cloud / تست | **Embedded Signup** با گزینهٔ همزیستی |
| پیام مشتری → CRM | webhook `messages` | همان |
| پیام مالک از موبایل → CRM | — | webhook **`smb_message_echoes`** |
| مخاطبین دفترچه | — | **`smb_app_state_sync`** بعد از `smb_app_data` |
| تاریخچهٔ قبلی | — | **`history`** بعد از `smb_app_data` (۲۴h اول، یک‌بار) |

بدون Subscribe و digest این فیلدها، مکالمهٔ CRM ناقص می‌ماند حتی اگر Token درست باشد.

---

## مراحل اتصال (کایا / هر پنل اختصاصی)

### ۱) آماده‌سازی پنل FXGuard

1. پنل فقط مال همین سازمان باشد (`kaya.fxguard.io` برای کایا).
2. در `.env` همان پنل:
   - `WHATSAPP_CLOUD_APP_SECRET`
   - `WHATSAPP_CLOUD_VERIFY_TOKEN`
   - `WHATSAPP_CLOUD_GRAPH_API_VERSION=v26.0`
   - بعد از ثبت Meta: Access Token + Phone Number ID (یا ذخیره در `#whatsapp`)
3. حالت اتصال: **Cloud** / **cloud_first**. Gateway QR را روی **همین شماره** موازی روشن نکنید.

### ۲) ثبت شماره با مسیر Coexistence (Meta)

1. مالک با حساب Meta مجاز وارد [developers.facebook.com](https://developers.facebook.com/) / Business شود.
2. مسیر **Embedded Signup** با گزینهٔ **WhatsApp Business app / Coexistence** (نه مهاجرتی که اپ موبایل را قطع می‌کند).
3. در اپ موبایل تأیید اشتراک تاریخچه (در صورت تمایل) انجام شود.
4. خروجی لازم برای CRM:
   - WABA ID
   - **Phone Number ID**
   - Access Token (ترجیحاً System User بلندمدت)
5. اختیاری: Graph روی Phone Number ID فیلدهای `is_on_biz_app` و `platform_type` را چک کنید تا همزیستی تأیید شود.

### ۳) Webhook در Meta

Callback همان پنل، مثلاً:

`https://kaya.fxguard.io/api/webhook/whatsapp-cloud`

Subscribe حداقل به:

- `messages`
- `smb_message_echoes`
- `history`
- `smb_app_state_sync`
- `account_update` (چرخهٔ عمر / قطع همزیستی)

Verify Token و App Secret باید با `.env` همان پنل یکی باشند. Backend امضای `X-Hub-Signature-256` را الزامی می‌کند.

### ۴) همگام‌سازی مخاطبین و تاریخچه (۲۴ ساعت اول)

بعد از onboarding موفق، **حداکثر ۲۴ ساعت** وقت دارید:

```http
POST /api/whatsapp/cloud/coexistence/sync
Authorization: Bearer <JWT ادمین/مالک>
Content-Type: application/json

{ "syncType": "both" }
```

یا جداگانه: `"contacts"` سپس `"history"`.

CRM درخواست‌ها را به Graph `/{phone-number-id}/smb_app_data` می‌فرستد؛ نتیجه از webhook می‌آید:

1. `smb_app_state_sync` → upsert مشتری (حذف دفترچه موبایل، رکورد CRM را پاک نمی‌کند)
2. `history` → پیام‌های تا ~۱۸۰ روز (رسانهٔ قدیمی ممکن است `media_placeholder` باشد)
3. از این به بعد `smb_message_echoes` → پیام‌های ارسال‌شده از اپ Business با `fromMe`

اگر history رد شود (مثلاً کد `2593109`)، در لاگ `Cloud coexistence history declined or failed` می‌آید؛ مکالمهٔ زنده همچنان کار می‌کند.

### ۵) تست عملی

1. `POST /api/whatsapp/cloud/verify`
2. پیام از شمارهٔ مشتری به خط Business → در `#conversations` به‌عنوان ورودی
3. پاسخ از **اپ Business موبایل** → باید به‌عنوان خروجی (`smb_message_echoes`) دیده شود
4. پاسخ از **پنل CRM** → خروجی Cloud معمولی
5. `GET /api/whatsapp/cloud/diagnostics` — URL وب‌هوک + لیست `coexistenceFields`

---

## وضعیت کد در این ریپو

| قابلیت | وضعیت |
|--------|--------|
| ارسال/دریافت Cloud (`messages`) | ✅ |
| Graph نسخهٔ قابل تنظیم (پیش‌فرض v26.0) | ✅ |
| Digest `smb_message_echoes` / `history` / `smb_app_state_sync` / `account_update` | ✅ |
| `POST /api/whatsapp/cloud/coexistence/sync` | ✅ |
| UI کامل Embedded Signup داخل داشبورد | ❌ دستی در Meta (برای پنل تک‌مشتری مثل کایا کافی است) |
| Partner multi-tenant Embedded Signup SDK | ❌ خارج از scope فعلی کایا |

---

## امنیت

- هرگز Access Token / App Secret را در issue، چت یا commit نگذارید.
- Webhook بدون App Secret معتبر روی سرور `503` می‌شود.
- برای `app.fxguard.io` هر سازمان Callback و توکن خودش را دارد؛ تنظیمات کایا را کپی نکنید.

---

## اسناد مرتبط

- [WHATSAPP-CLOUD-API-SETUP.md](./WHATSAPP-CLOUD-API-SETUP.md)
- [WHATSAPP-META-CHECKLIST-KAYA.md](./WHATSAPP-META-CHECKLIST-KAYA.md)
- [DEPLOY-KAYA-SERVER.md](./DEPLOY-KAYA-SERVER.md)

# چک‌لیست گام‌به‌گام Meta Cloud API — kaya.fxguard.io

راهنمای عملی راه‌اندازی **WhatsApp Business Platform (Cloud API)** برای سرور production:

| مورد | مقدار |
|------|--------|
| **دامنه پنل** | `https://kaya.fxguard.io` |
| **Webhook Callback** | `https://kaya.fxguard.io/api/webhook/whatsapp-cloud` |
| **Health** | `https://kaya.fxguard.io/health` |
| **مسیر deploy** | `/var/www/kayaCRM-kaya` |
| **PM2** | `crm-backend-kaya`, `crm-gateway-kaya` |
| **Backend (local)** | `http://127.0.0.1:3202` |
| **Gateway (local)** | `http://127.0.0.1:3201` — `GATEWAY_URL` در `backend/.env` |

> جزئیات پورت‌ها و deploy: [DEPLOY-KAYA-SERVER.md](DEPLOY-KAYA-SERVER.md)

> **اولویت:** برای حفظ شماره و ارسال انبوه امن، **Meta Cloud** را کامل کنید. Gateway (QR) فقط fallback یا توسعه است — هر دو روی یک شماره همزمان کار نمی‌کنند.

---

## فاز ۰ — قبل از Meta (سرور)

### گام ۰.۱ — Health سرور

```bash
curl https://kaya.fxguard.io/health
```

**انتظار:** `"status":"ok"` و `"database":{"status":"ok"}`

```
┌─────────────────────────────────────┐
│  GET /health                        │
│  status: ok                         │
│  database: ok                       │
│  redis: ok (یا disabled)            │
└─────────────────────────────────────┘
```

### گام ۰.۲ — فایل `.env` بک‌اند

در `/var/www/kayaCRM-kaya/backend/.env`:

```env
BACKEND_PUBLIC_URL=https://kaya.fxguard.io

WHATSAPP_CLOUD_ACCESS_TOKEN=
WHATSAPP_CLOUD_PHONE_NUMBER_ID=
WHATSAPP_CLOUD_VERIFY_TOKEN=
WHATSAPP_CLOUD_APP_SECRET=

# قالب برای bulk و پیام بعد از ۲۴h
WHATSAPP_CLOUD_BULK_TEMPLATE_NAME=
WHATSAPP_CLOUD_BULK_TEMPLATE_LANGUAGE=fa
```

بعد از ویرایش:

```bash
cd /var/www/kayaCRM-kaya
git pull origin main
cd backend && npm run build:dashboard
pm2 reload crm-backend-kaya --update-env
```

---

## فاز ۱ — ساخت App در Meta

### گام ۱.۱ — ورود به Developers

1. بروید به [developers.facebook.com](https://developers.facebook.com/)
2. **My Apps** → **Create App**
3. نوع: **Business** (یا Other → Business)

```
┌──────────────────────────────────────────┐
│  Meta for Developers                     │
│  ┌────────────┐  ┌─────────────────────┐ │
│  │ My Apps ▼  │  │  + Create App       │ │
│  └────────────┘  └─────────────────────┘ │
│                                          │
│  Use case: Connect with customers        │
│  via WhatsApp                            │
└──────────────────────────────────────────┘
```

### گام ۱.۲ — افزودن محصول WhatsApp

1. داشبورد App → **Add Product**
2. **WhatsApp** → **Set up**

```
┌──────────────────────────────────────────┐
│  App Dashboard > Add products              │
│  ┌────────────────────────────────────┐  │
│  │ WhatsApp                    [Set up]│  │
│  │ Send and receive messages...        │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

### گام ۱.۳ — شماره تست یا Production

**WhatsApp → API Setup:**

```
┌──────────────────────────────────────────┐
│  WhatsApp > API Setup                    │
│  ─────────────────────────────────────   │
│  Temporary access token    [Copy]        │
│  Phone number ID: 1007665702430638  [Copy]│
│  WhatsApp Business Account ID: ...       │
│  To: [Select recipient]  [Send message]  │
└──────────────────────────────────────────┘
```

- **Phone number ID** → `WHATSAPP_CLOUD_PHONE_NUMBER_ID` یا پنل `#whatsapp`
- **Access Token** (System User توکن دائمی بهتر است) → `WHATSAPP_CLOUD_ACCESS_TOKEN`

### گام ۱.۴ — System User Token (Production)

1. [business.facebook.com](https://business.facebook.com/) → **Business Settings**
2. **Users** → **System users** → **Add**
3. **Generate token** → App خود را انتخاب کنید → دسترسی `whatsapp_business_messaging`, `whatsapp_business_management`
4. توکن را در `.env` و پنل ذخیره کنید (دیگر نمایش داده نمی‌شود)

---

## فاز ۲ — Webhook

### گام ۲.۱ — Verify Token

یک رشته تصادفی بسازید (مثلاً `openssl rand -hex 16`):

```env
WHATSAPP_CLOUD_VERIFY_TOKEN=kaya_verify_a1b2c3d4
```

همان مقدار را در پنل **#whatsapp → Verify Token** هم ذخیره کنید.

### گام ۲.۲ — App Secret

1. App → **Settings** → **Basic**
2. **App Secret** → Show → کپی

```env
WHATSAPP_CLOUD_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> بدون App Secret، وب‌هوک POST رد می‌شود (امنیت).

### گام ۲.۳ — ثبت Webhook در Meta

**WhatsApp → Configuration → Webhook → Edit:**

```
┌──────────────────────────────────────────┐
│  Configure webhook                         │
│  Callback URL:                             │
│  https://kaya.fxguard.io/api/webhook/      │
│    whatsapp-cloud                          │
│  Verify token:                             │
│  kaya_verify_a1b2c3d4                       │
│  [Verify and save]                         │
└──────────────────────────────────────────┘
```

Meta یک GET می‌زند:

`GET /api/webhook/whatsapp-cloud?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...`

**موفق:** پاسخ متن خام = همان `hub.challenge`  
**ناموفق:** `Verification failed`

تست دستی (با توکن اشتباه — باید 403):

```bash
curl "https://kaya.fxguard.io/api/webhook/whatsapp-cloud?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=12345"
# → Verification failed
```

با توکن درست:

```bash
curl "https://kaya.fxguard.io/api/webhook/whatsapp-cloud?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=12345"
# → 12345
```

### گام ۲.۴ — Subscribe به messages

در همان صفحه Webhook، فیلد **messages** را Subscribe کنید:

```
┌──────────────────────────────────────────┐
│  Webhook fields                          │
│  ☑ messages                               │
│  ☐ message_template_status_update (اختیاری)│
└──────────────────────────────────────────┘
```

---

## فاز ۳ — پنل Kaya CRM

### گام ۳.۱ — مرکز کنترل `#whatsapp`

```
┌──────────────────────────────────────────┐
│  #whatsapp > Connection > Cloud API      │
│  ☑ Cloud فعال                            │
│  Access Token: [••••••••] ✓               │
│  Phone Number ID: 1007665702430638       │
│  Verify Token: kaya_verify_...           │
│  قالب Meta: hello_world                  │
│  زبان قالب: fa                           │
│  [تست اتصال Meta]  [ارسال تست]          │
└──────────────────────────────────────────┘
```

چک‌لیست overview باید همه ✓ باشد:

| چک | منبع |
|----|------|
| Access Token | پنل یا `.env` |
| Phone Number ID | پنل یا `.env` |
| Verify Token | پنل یا `.env` |
| App Secret | **فقط `.env`** |
| BACKEND_PUBLIC_URL | `.env` |
| قالب Meta | پنل (اختیاری ولی برای bulk/۲۴h توصیه) |

### گام ۳.۲ — تست اتصال Meta

دکمه **تست اتصال Meta** یا:

`POST /api/whatsapp/cloud/verify` (با JWT ادمین)

**انتظار:** `{ "ok": true, "displayPhone": "+98...", "verifiedName": "..." }`

### گام ۳.۳ — ارسال تست

در پنل: شماره خودتان (با کد کشور، بدون +) → **ارسال تست**

یا API:

```json
POST /api/whatsapp/cloud/test-send
{ "to": "98912xxxxxxx", "message": "سلام تست", "useTemplate": false }
```

- داخل **۲۴ ساعت** بعد از آخرین پیام مشتری: `useTemplate: false` کار می‌کند
- خارج از ۲۴h: `useTemplate: true` + نام قالب تأییدشده

### گام ۳.۴ — Diagnostics

`GET /api/whatsapp/cloud/diagnostics` — وضعیت Token، webhook URL، App Secret (بله/خیر)

---

## فاز ۴ — قالب Meta (Template)

### گام ۴.۱ — ساخت قالب

**WhatsApp Manager** → **Message templates** → **Create template**

```
┌──────────────────────────────────────────┐
│  Create template                           │
│  Name: kaya_followup (lowercase, _)       │
│  Category: Utility / Marketing             │
│  Language: Persian (fa)                    │
│  Body: سلام {{1}}، {{2}}                  │
│  [Submit]                                  │
└──────────────────────────────────────────┘
```

منتظر **Approved** بمانید.

### گام ۴.۲ — تنظیم در CRM

```
cloudBulkTemplateName = kaya_followup
cloudBulkTemplateLanguage = fa
```

### گام ۴.۳ — رفتار خودکار CRM

| سناریو | رفتار |
|--------|--------|
| چت عادی (< ۲۴h از آخرین پیام مشتری) | متن آزاد Cloud |
| چت قدیمی (> ۲۴h) | خودکار **Template** (اگر نام قالب تنظیم شده) |
| Meta خطای 131047 | Retry با Template |
| ارسال انبوه | پیش‌فرض Template (Cloud) |
| Gateway فقط | بدون Template Meta — ریسک ban |

---

## فاز ۵ — Connection Mode

در `#whatsapp`:

| Mode | کاربرد |
|------|--------|
| **cloud_first** (پیشنهادی) | Cloud اگر تنظیم باشد، وگرنه Gateway |
| **cloud** | فقط Meta |
| **gateway** | فقط QR (توسعه / موقت) |

Production با شماره واقعی: **`cloud`** یا **`cloud_first`** + Cloud کامل.

---

## فاز ۶ — Deploy نهایی

```bash
cd /var/www/kayaCRM-kaya
git pull origin main
cd backend && npm run build:dashboard
pm2 reload crm-backend-kaya crm-gateway-kaya --update-env
```

Hard refresh پنل (Ctrl+Shift+R).

---

## عیب‌یابی سریع

| علامت | علت محتمل | اقدام |
|--------|-----------|--------|
| Webhook Verify failed | Verify Token mismatch | `.env` = Meta = پنل |
| POST webhook 401 | App Secret اشتباه/خالی | `WHATSAPP_CLOUD_APP_SECRET` |
| POST webhook 503 | App Secret تنظیم نشده | همان |
| ارسال 131047 | خارج ۲۴h | قالب Meta |
| overview قرمز App Secret | فقط env | در Meta Basic کپی کنید |
| پیام duplicate | Gateway + Cloud همزمان | یک کانال فعال |
| bulk ban | Gateway bulk | Cloud + Template |

---

## ترتیب پیشنهادی (خلاصه)

1. ✅ `.env` + `BACKEND_PUBLIC_URL`
2. ✅ Meta App + Phone ID + Token
3. ✅ Webhook verify + subscribe messages
4. ✅ App Secret
5. ✅ پنل `#whatsapp` + تست اتصال + ارسال تست
6. ✅ Template تأییدشده + bulk/۲۴h
7. ⚙️ Gateway را fallback نگه دارید یا خاموش (شماره production روی Cloud)

مرجع تکمیلی: [WHATSAPP-CLOUD-API-SETUP.md](./WHATSAPP-CLOUD-API-SETUP.md)

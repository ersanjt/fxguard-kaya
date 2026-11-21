# برنامهٔ کامل Tech Provider + Embedded Signup — FXGuard / Kaya CRM

**مالک:** Ersan Jahed Tabrizi — `docs/AUTHOR.md`  
**هدف:** مشتری بعد از ثبت‌نام در CRM، با یک دکمه واتساپ رسمی Meta را وصل کند؛ بدون وارد کردن دستی Token.

> وضعیت پیاده‌سازی در مخزن: API و UI Embedded Signup آماده است. فعال‌سازی واقعی پس از Business Verification، App Review و پر کردن envهای Meta روی سرور **app** است.

---

## ۰. تصمیم محصولی (ثابت)

| انتخاب | دلیل |
|--------|------|
| مسیر رسمی: **Tech Provider** | مناسب SaaS چندمستأجره؛ هر مشتری WABA/شمارهٔ خودش را دارد |
| Onboarding: **Embedded Signup v4** | جریان استاندارد Meta داخل پنل |
| Webhook مشترک سکو | همهٔ tenantها به یک callback؛ نگاشت با `phone_number_id` |
| QR Gateway | فقط آزمایش/fallback؛ جایگزین مسیر رسمی نیست |
| Billing مشتری | به‌عنوان Tech Provider، کارت را خود مشتری روی Messaging account می‌گذارد |

دامنهٔ هدف SaaS: **`app.fxguard.io`** (نه کایا). کایا پنل اختصاصی سازمانی می‌ماند.

---

## ۱. فازها و خروجی

| فاز | کار | خروجی | مسئول |
|-----|-----|--------|--------|
| **A** | Business Verification + صفحات حقوقی زنده | Meta Business تأییدشده | شما (عملیات Meta) |
| **B** | Meta App + Login for Business + Tech Provider terms + webhook | App آمادهٔ Review | شما + env سرور |
| **C** | Prototype Connect در پنل + ویدیوهای App Review | Advanced Access | مخزن (انجام‌شده) + شما (فیلم/Submit) |
| **D** | Config ID Embedded Signup v4 + env production | دکمهٔ Connect زنده برای tester | شما |
| **E** | تست sandbox + اولین مشتری واقعی | onboarding خودکار | شما |
| **F** | (اختیاری) افزایش سقف / Tech Partner / BSP | مقیاس بیشتر | بعداً |

---

## ۲. چک‌لیست Meta (دستی — بدون این، دکمه کار نمی‌کند)

### A — شرکت
- [ ] Meta Business Portfolio برای نهاد حقوقی FXGuard
- [ ] Business Verification کامل
- [ ] `https://fxguard.io` و صفحات Privacy / Terms / Contact در دسترس عمومی
- [ ] توضیح محصول: CRM چندمستأجره برای کسب‌وکارها

### B — App
- [ ] Create App → Business + محصول WhatsApp
- [ ] Facebook Login for Business
- [ ] پذیرش شرایط Tech Provider
- [ ] Webhook Callback (پیشنهادی SaaS):
  - `https://app.fxguard.io/api/webhook/whatsapp-cloud`
  - Verify Token = `WHATSAPP_CLOUD_VERIFY_TOKEN`
  - Fields: `messages`, `account_update` (+ coexistence در صورت نیاز)
- [ ] App Secret → `WHATSAPP_CLOUD_APP_SECRET` و/یا `META_APP_SECRET`

### C — App Review
فقط این دو permission با **توضیح و ویدیوی جدا**:
- [ ] `whatsapp_business_messaging` — ارسال/دریافت از پنل بعد از Connect
- [ ] `whatsapp_business_management` — نمایش شماره/وضعیت/template بعد از Connect

اسکریپت فیلم (انگلیسی UI یا زیرنویس انگلیسی):
1. Signup / login به پنل خودخدمت → `#whatsapp` → **Connect with Meta** → تکمیل flow → تست ارسال پیام
2. بعد از اتصال: نمایش Phone Number ID / تست اتصال / یا مدیریت template

### D — Embedded Signup Configuration
- [ ] Facebook Login for Business → Configurations → WhatsApp Embedded Signup
- [ ] Assets: WhatsApp accounts
- [ ] Permissions: فقط همان دو مورد
- [ ] Configuration ID → `META_EMBEDDED_SIGNUP_CONFIG_ID`
- [ ] App ID → `META_APP_ID`
- [ ] تست با Sandbox در Partner Tools

### E — سقف onboarding
- پیش‌فرض حدود ۱۰ حساب جدید / ۷ روز
- بعد از verification + review معمولاً تا حدود ۲۰۰ / ۷ روز

---

## ۳. env سکو (فقط سرور app — هرگز commit نشود)

```env
META_APP_ID=
META_APP_SECRET=
META_EMBEDDED_SIGNUP_CONFIG_ID=
# اختیاری؛ پیش‌فرض از WHATSAPP_CLOUD_GRAPH_API_VERSION یا v21.0 برای SDK
META_EMBEDDED_SIGNUP_GRAPH_VERSION=v21.0
WHATSAPP_CLOUD_VERIFY_TOKEN=
WHATSAPP_CLOUD_APP_SECRET=
BACKEND_PUBLIC_URL=https://app.fxguard.io
```

`META_APP_SECRET` می‌تواند همان App Secret باشد؛ اگر خالی باشد از `WHATSAPP_CLOUD_APP_SECRET` استفاده می‌شود.

---

## ۴. معماری فنی در Kaya (پیاده‌سازی‌شده)

```
مشتری در پنل (#whatsapp)
        │  دکمه Connect with Meta
        ▼
Facebook JS SDK + Embedded Signup
        │  code + waba_id + phone_number_id
        ▼
POST /api/whatsapp/embedded-signup/complete
        │  exchange code → business token (server-side)
        │  subscribe app to WABA
        │  optional register phone
        ▼
WhatsappConnection (per tenant)
  cloudAccessToken, cloudPhoneNumberId, cloudWabaId, embeddedSignupAt
        │
        ▼
Webhook مشترک → inboundTenant با phone_number_id → سازمان درست
```

| بخش | مسیر |
|-----|------|
| سرویس Meta | `backend/lib/metaEmbeddedSignup.js` |
| API | `GET/POST …/api/whatsapp/embedded-signup/*` در `routes/whatsapp.js` |
| مدل | `WhatsappConnection.cloudWabaId` · `embeddedSignupAt` |
| مایگریشن | `backend/scripts/add-embedded-signup-columns.js` |
| UI | `html-part-03.html` + `chunk-06.js` |
| i18n | `i18n-fa.js` / `en` / `tr` |
| تست | `backend/tests/meta-embedded-signup.test.js` |

---

## ۵. تجربهٔ مشتری نهایی

1. ثبت‌نام در `/signup` (Cloud Start)
2. ورود به پنل → اتصال واتساپ
3. **اتصال با Meta** (نه کپی Token)
4. ساخت/انتخاب Business + شماره + تأیید SMS
5. CRM توکن را ذخیره می‌کند و webhook را subscribe می‌کند
6. پیام راهنما: افزودن کارت پرداخت در WhatsApp Manager (الزام Tech Provider)
7. تست اتصال Meta + ارسال پیام

مسیر دستی Token برای پشتیبانی/کایا باقی می‌ماند.

---

## ۶. معیار اتمام

- [x] برنامه و نقشهٔ کد در docs
- [x] API config + complete
- [x] UI دکمه + SDK loader
- [x] ذخیره WABA / phone / token per-tenant
- [x] تست واحد منطق exchange/config
- [x] بستهٔ App Review + اسکریپت فیلم (`META-APP-REVIEW-PACK.md`)
- [x] راهنمای عملیات سرور app (`META-EMBEDDED-SIGNUP-OPS-FA.md`)
- [x] حریم خصوصی: بند Meta/WhatsApp Cloud
- [x] بعد از signup → `#whatsapp` + onboarding واتساپ
- [ ] Meta Business Verification *(فقط با اکانت Meta شما)*
- [ ] App Review approved *(Submit با متن‌های بستهٔ Review)*
- [ ] env روی production app *(بعد از Approve)*
- [ ] اولین onboarding واقعی خارج از sandbox

---

## ۷. اسناد همکار در مخزن

| سند | کاربرد |
|-----|--------|
| [META-APP-REVIEW-PACK.md](./META-APP-REVIEW-PACK.md) | کپی‌پیست به فرم Meta |
| [META-EMBEDDED-SIGNUP-OPS-FA.md](./META-EMBEDDED-SIGNUP-OPS-FA.md) | env و webhook روی app |
| [WHATSAPP-CLOUD-API-SETUP.md](./WHATSAPP-CLOUD-API-SETUP.md) | اتصال دستی Cloud |

## ۸. مراجع Meta

- [Embedded Signup](https://developers.facebook.com/docs/whatsapp/embedded-signup/)
- [App Review for Embedded Signup](https://developers.facebook.com/docs/whatsapp/embedded-signup/app-review/)
- [Become a Partner](https://whatsappbusiness.com/partners/become-a-partner/)

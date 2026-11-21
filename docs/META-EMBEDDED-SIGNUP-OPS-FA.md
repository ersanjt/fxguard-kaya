# عملیات فعال‌سازی Embedded Signup روی app.fxguard.io

**مرجع برنامه:** [META-TECH-PROVIDER-PLAN-FA.md](./META-TECH-PROVIDER-PLAN-FA.md)  
**متن Review:** [META-APP-REVIEW-PACK.md](./META-APP-REVIEW-PACK.md)

این سند برای وقتی است که Meta تأیید کرده (یا در حال تست با نقش Developer هستید).

---

## ۱) متغیرهای env روی پروسهٔ `crm-backend-app`

در `backend/.env` سرور app (هرگز روی کایا برای ثبت‌نام عمومی):

```env
SELF_SERVE_SIGNUP=true
TENANT_BASE_HOST=app.fxguard.io
BACKEND_PUBLIC_URL=https://app.fxguard.io

META_APP_ID=...
META_APP_SECRET=...
META_EMBEDDED_SIGNUP_CONFIG_ID=...
META_EMBEDDED_SIGNUP_GRAPH_VERSION=v21.0

WHATSAPP_CLOUD_VERIFY_TOKEN=...
WHATSAPP_CLOUD_APP_SECRET=...
# می‌تواند با META_APP_SECRET یکی باشد
```

سپس:

```bash
cd /path/to/app-repo/backend
node scripts/add-embedded-signup-columns.js   # اختیاری اگر auto-migrate روشن است
pm2 reload crm-backend-app --update-env
```

---

## ۲) Webhook در Meta App

| فیلد | مقدار |
|------|--------|
| Callback URL | `https://app.fxguard.io/api/webhook/whatsapp-cloud` |
| Verify Token | همان `WHATSAPP_CLOUD_VERIFY_TOKEN` |
| Fields | `messages`, `account_update` (+ coexistence در صورت نیاز) |

همهٔ tenantها به همین URL می‌آیند؛ نگاشت با `phone_number_id`.

---

## ۳) تست سریع

1. با نقش Developer روی App وارد پنل خودخدمت شوید
2. `#whatsapp` → باید باکس **اتصال با Meta** دیده شود (نه پیام «فعال نشده»)
3. Connect → sandbox یا شماره تست
4. `POST /api/whatsapp/cloud/verify` سبز شود
5. پیام تست بفرستید و inbound را چک کنید

API وضعیت بدون secret:

`GET /api/whatsapp/embedded-signup/config` → `{ "enabled": true, ... }`

---

## ۴) بعد از اولین مشتری واقعی

- به مشتری بگویید کارت پرداخت را در WhatsApp Manager اضافه کند (Tech Provider)
- سقف onboarding پیش‌فرض ~۱۰ / ۷ روز را در Partner overview ببینید
- QR Gateway را برای همان شماره موازی روشن نکنید

---

## ۵) اگر دکمه ظاهر نشد

| علامت | علت محتمل |
|--------|-----------|
| `enabled: false` / `missing_meta_env` | یکی از META_* خالی است |
| پنجره Meta باز نمی‌شود | App ID اشتباه / دامنه در App settings |
| code می‌آید ولی complete خطا | App Secret اشتباه |
| inbound به tenant اشتباه | `cloudPhoneNumberId` ذخیره نشده / شماره تکراری |

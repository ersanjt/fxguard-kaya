# Production kaya.fxguard.io — سرور FXGuard

> **مسیر deploy:** `/var/www/kayaCRM-kaya`  
> **دامنه:** https://kaya.fxguard.io  
> **PM2:** `crm-backend-kaya` · `crm-gateway-kaya`

این سند تنظیمات **واقعی production کایا** روی سرور مشترک `92.205.58.83` را ثبت می‌کند تا با tenantهای دیگر (app، حسابداری) اشتباه گرفته نشود.

---

## نقشهٔ پورت‌ها (مهم)

| پورت | سرویس | PM2 |
|------|--------|-----|
| **3202** | Backend CRM کایا | `crm-backend-kaya` |
| **3201** | WhatsApp Gateway کایا | `crm-gateway-kaya` |
| 3002 | Backend tenant دیگر (app) | `crm-backend-app` |
| 3001 | حسابداری هلدینگ | `kaya-accounting` — **نه Gateway** |

> **اشتباه رایج:** `curl localhost:3001/api/status` به **حسابداری** می‌خورد، نه Gateway کایا. Gateway کایا همیشه **`3201`** است.

---

## فایل‌های `.env` (production)

### `backend/.env`

```env
NODE_ENV=production
PORT=3202
USE_SQLITE=true
FRONTEND_URL=https://kaya.fxguard.io
CORS_ORIGINS=https://kaya.fxguard.io
GATEWAY_URL=http://127.0.0.1:3201
GATEWAY_API_SECRET=<همان مقدار gateway/.env>
```

### `gateway/.env`

```env
NODE_ENV=production
PORT=3201
BACKEND_API_URL=http://127.0.0.1:3202
GATEWAY_API_SECRET=<حداقل ۳۲ کاراکتر>
```

`GATEWAY_API_SECRET` در **هر دو** فایل باید **یکسان** باشد.

### جدول `whatsapp_connections`

```sql
UPDATE whatsapp_connections
SET gatewayUrl='http://127.0.0.1:3201'
WHERE id='default';
```

اولویت Backend: مقدار DB > `GATEWAY_URL` در `.env`.

---

## Deploy خودکار (GitHub Actions)

- Workflow: `.github/workflows/deploy.yml`
- Trigger: push موفق به `main` (بعد از CI)
- مسیر روی سرور: `/var/www/kayaCRM-kaya`
- PM2: `crm-backend-kaya` + `crm-gateway-kaya` (نه `ecosystem.config.js` عمومی)

Migrationها بعد از هر deploy (شامل `add-plan-tier-trial-columns.js` برای `planTier` / `trialStatus`).

### Deploy دستی (اگر Actions قطع بود)

```bash
cd /var/www/kayaCRM-kaya
git fetch origin && git reset --hard origin/main
cd backend && npm ci --omit=dev
node scripts/add-plan-tier-trial-columns.js
node scripts/add-unanswered-columns.js
node scripts/add-auto-messages-columns.js
node scripts/add-conversation-indexes.js
node scripts/add-ai-columns.js
node scripts/add-customer-profile-fields.js
cd ../gateway && npm ci --omit=dev
cd ..
pm2 reload crm-backend-kaya --update-env
pm2 stop crm-gateway-kaya || true
sleep 3
rm -f gateway/sessions/session/SingletonLock gateway/sessions/session/SingletonCookie gateway/sessions/session/SingletonSocket
pm2 start crm-gateway-kaya --update-env
pm2 save
```

---

## دیباگ سریع

```bash
cd /var/www/kayaCRM-kaya/backend
BACKEND_PORT=$(grep '^PORT=' .env | cut -d= -f2 | tr -d ' "')
BACKEND_PORT=${BACKEND_PORT:-3202}
GW_PORT=$(grep '^PORT=' ../gateway/.env | cut -d= -f2 | tr -d ' "')
GW_PORT=${GW_PORT:-3201}
SECRET=$(grep '^GATEWAY_API_SECRET=' ../gateway/.env | cut -d= -f2-)

pm2 list
curl -sS "http://127.0.0.1:${BACKEND_PORT}/health?deep=1" | python3 -m json.tool
curl -sS -H "X-Gateway-Secret: $SECRET" "http://127.0.0.1:${GW_PORT}/api/status" | python3 -m json.tool
```

انتظار Gateway: `"status":"ready"` یا `"phase":"qr"` (بعد از اسکن QR).

---

## واتساپ — ری‌استارت تمیز Gateway

```bash
pm2 stop crm-gateway-kaya
pkill -9 -f "kayaCRM-kaya/gateway" 2>/dev/null || true
rm -f /var/www/kayaCRM-kaya/gateway/sessions/session/Singleton*
pm2 start crm-gateway-kaya --update-env
```

اگر فقط QR می‌خواهید و نشست خراب است، **بدون backup** session را پاک نکنید مگر بدانید باید دوباره QR بزنید.

---

## مستندات مرتبط

- [SERVER-STATUS-COMMANDS.md](SERVER-STATUS-COMMANDS.md) — دستورات وضعیت
- [WHATSAPP-GATEWAY.md](WHATSAPP-GATEWAY.md) — عیب‌یاب Gateway
- [WHATSAPP-META-CHECKLIST-KAYA.md](WHATSAPP-META-CHECKLIST-KAYA.md) — Meta Cloud API
- [DEPLOY-SETUP.md](DEPLOY-SETUP.md) — Secrets گیت‌هاب

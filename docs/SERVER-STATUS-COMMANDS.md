# دستورات بررسی وضعیت روی سرور

---

## Production: kaya.fxguard.io (اولویت)

مسیر: `/var/www/kayaCRM-kaya` · PM2: `crm-backend-kaya` + `crm-gateway-kaya`

| سرویس | پورت |
|--------|------|
| Backend CRM | **3202** |
| WhatsApp Gateway | **3201** |

> پورت **3001** = حسابداری (`kaya-accounting`) — برای Gateway کایا استفاده **نکن**.

جزئیات کامل: [DEPLOY-KAYA-SERVER.md](DEPLOY-KAYA-SERVER.md)

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
pm2 logs crm-backend-kaya --lines 30 --nostream
pm2 logs crm-gateway-kaya --lines 30 --nostream
```

---

## ۱. اگر با PM2 اجرا کرده‌ای (توسعه / tenant عمومی)

از **ریشهٔ پروژه** (همان پوشه‌ای که `ecosystem.config.js` هست):

```bash
# لیست همهٔ پروسس‌ها و وضعیت (آپ؟ خطا؟ ریستارت؟)
pm2 list

# یا با نام واضح‌تر
pm2 status
```

خروجی چیزی شبیه این است:
- **crm-backend** — پورت ۳۰۰۲ (سرور اصلی)
- **crm-gateway** — پورت ۳۰۰۱ (واتساپ)

### لاگ‌ها

```bash
# آخرین لاگ‌های هر دو
pm2 logs

# فقط Backend
pm2 logs crm-backend

# فقط Gateway (واتساپ)
pm2 logs crm-gateway

# بدون دنبال کردن (فقط یک‌بار نشان بده)
pm2 logs --lines 100
```

### جزئیات یک اپ

```bash
pm2 show crm-backend
pm2 show crm-gateway
```

### مانیتور زنده (CPU و حافظه)

```bash
pm2 monit
```

---

## ۲. چک کردن از طریق HTTP (روی خود سرور)

Backend یک endpoint سلامت دارد. اگر Backend روی پورت ۳۰۰۲ بالا باشد:

```bash
# سلامت کلی + دیتابیس، Redis، RabbitMQ
curl -s http://localhost:3002/health
```

اگر روی سرور `jq` نصب است برای خواناتر شدن خروجی:
```bash
curl -s http://localhost:3002/health | jq
```
(نصب در اوبونتو: `sudo apt install jq`)

خروجی نمونه:
- `status: "ok"` یعنی سرویس و دیتابیس اوکی
- `status: "degraded"` یعنی یکی از چیزها (مثلاً DB) خطا دارد
- `checks.database`, `checks.redis`, `checks.rabbitmq` وضعیت هرکدام را نشان می‌دهند

### چک سریع API

```bash
curl -s http://localhost:3002/api/ping
```

باید جوابی مثل `{"ok":true,"message":"API در دسترس است"}` بگیری.

---

## ۳. اگر با Docker اجرا کرده‌ای

از پوشه‌ای که `docker-compose` را از آن اجرا کرده‌ای:

```bash
# وضعیت کانتینرها (در حال اجرا؟ خروج؟)
docker-compose -f docker-compose.simple.yml ps

# یا با فایل اصلی
docker-compose ps
```

```bash
# لاگ سرویس Backend
docker-compose -f docker-compose.simple.yml logs backend

# لاگ Gateway
docker-compose -f docker-compose.simple.yml logs gateway
```

بعد همان `curl`های بالا را بزن (یا به جای localhost آدرس کانتینر را بگذار اگر از بیرون کانتینر تست می‌کنی).

---

## ۴. اگر با node مستقیم اجرا کرده‌ای (بدون PM2/Docker)

پروسس‌ها را ببین:

```bash
# چی روی پورت ۳۰۰۲ و ۳۰۰۱ در حال اجراست
ss -tlnp | grep -E '3001|3002'
# یا
netstat -tlnp | grep -E '3001|3002'
```

سپس:
```bash
curl -s http://localhost:3002/health
curl -s http://localhost:3002/api/ping
```

---

## ۵. خلاصهٔ سریع (معمولاً با PM2)

```bash
pm2 list
curl -s http://localhost:3002/health | jq
```

اول ببین پروسس‌ها بالا هستند (`pm2 list`)، بعد سلامت Backend و دیتابیس را با `/health` چک کن.

**Production کایا:** از بخش اول این سند (پورت‌های 3202 / 3201) استفاده کن.

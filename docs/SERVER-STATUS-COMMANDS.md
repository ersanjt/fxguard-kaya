# دستورات بررسی وضعیت روی سرور

وقتی داخل سرور (SSH) هستی، با این دستورات می‌توانی وضعیت سرویس‌ها را ببینی.

---

## ۱. اگر با PM2 اجرا کرده‌ای

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

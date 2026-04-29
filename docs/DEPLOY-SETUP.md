# راه‌اندازی Deploy خودکار با Git Push

وقتی به شاخه `master` push می‌کنید، سرور VPS به‌صورت خودکار به‌روزرسانی می‌شود.

---

## پیش‌نیاز

1. **Secrets در GitHub:**  
   در تنظیمات ریپو: **Settings → Secrets and variables → Actions** این موارد را اضافه کنید:

   | Secret | توضیح | مثال |
   |--------|-------|------|
   | `SSH_PRIVATE_KEY` | کلید خصوصی SSH برای اتصال به سرور | محتوای فایل `~/.ssh/id_rsa` |
   | `DEPLOY_HOST` | IP یا دامنه سرور | `92.205.58.83` |
   | `DEPLOY_USER` | نام کاربر SSH | `fxguard` یا `root` |
   | `DEPLOY_PATH` | مسیر پروژه روی سرور | `/var/www/fxguard-kaya` |

2. **روی سرور:**  
   پروژه باید قبلاً کلون شده و با PM2 اجرا شده باشد (طبق `docs/DEPLOY-SERVER.md`).

---

## اولین بار روی سرور

```bash
cd /var/www
git clone https://github.com/YOUR_USER/fxguard-kaya.git
cd fxguard-kaya

# Backend
cd backend
cp .env.example .env
# ویرایش .env
npm install --omit=dev
node seed-admin.js

# Gateway
cd ../gateway
cp .env.example .env
# ویرایش .env (BACKEND_API_URL=http://127.0.0.1:3002)
npm install --omit=dev

# PM2
cd ..
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## جریان کار

1. تغییرات را commit و push کنید به `master`
2. GitHub Actions به سرور SSH می‌زند
3. اسکریپت `scripts/deploy.sh` اجرا می‌شود:
   - `git pull origin master`
   - `npm install` برای backend و gateway
   - `pm2 reload` برای هر دو سرویس

---

## تغییر مسیر یا هاست

اگر مسیر پروژه یا IP سرور عوض شد، در GitHub → Settings → Secrets مقدار `DEPLOY_PATH` یا `DEPLOY_HOST` را به‌روز کنید.

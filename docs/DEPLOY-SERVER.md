# راهنمای آپلود و راه‌اندازی سیستم روی سرور (Ubuntu)

این راهنما برای سرور **FXGuard** (Ubuntu 22.04، IP: `92.205.58.83`) است.

---

## پیش‌نیاز

- دسترسی SSH به سرور (از پنل هاستینگ گزینه **Server Actions** → **Access console** یا با کلید SSH از کامپیوتر خودتان).
- دامنه (اختیاری؛ برای HTTPS). اگر دامنه ندارید می‌توانید با IP و پورت مستقیم استفاده کنید.

---

## روش ۱: راه‌اندازی سریع (یک اسکریپت)

### مرحله ۱: اتصال به سرور

```bash
ssh root@92.205.58.83
```

(یا با کاربری که پنل به شما داده، مثلاً `ubuntu`.)

### مرحله ۲: اجرای اسکریپت نصب

روی سرور این دستورات را بزنید (یا فایل `scripts/setup-server.sh` را از پروژه کپی کنید و اجرا کنید):

```bash
# به‌روزرسانی سیستم
apt update && apt upgrade -y

# نصب Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# نصب PM2 (مدیر پروسس)
npm install -g pm2

# نصب Git
apt install -y git
```

### مرحله ۳: کلون کردن پروژه از گیت‌هاب

```bash
cd /var/www   # یا هر مسیر دلخواه
git clone https://github.com/ersanjt/kayaCRM.git
cd kayaCRM/backend
```

### مرحله ۴: نصب وابستگی‌ها و تنظیم محیط

```bash
npm install --production
```

ساخت فایل `.env` برای محیط production:

```bash
nano .env
```

محتویات پیشنهادی (با **SQLite** برای سادگی؛ بدون نیاز به PostgreSQL):

```env
NODE_ENV=production
PORT=3002
USE_SQLITE=true
JWT_SECRET=یک_رشته_خیلی_طولانی_و_تصادفی_برای_امنیت
CORS_ORIGINS=https://دامنه-شما.com,http://92.205.58.83:3002
FRONTEND_URL=https://دامنه-شما.com
GATEWAY_URL=http://127.0.0.1:3001
```

- اگر دامنه ندارید: `CORS_ORIGINS=http://92.205.58.83:3002` و `FRONTEND_URL=http://92.205.58.83:3002` بگذارید.
- `JWT_SECRET` را حتماً عوض کنید (مثلاً یک رشته ۳۲ کاراکتری تصادفی).

### مرحله ۵: ایجاد کاربر ادمین و اجرا

```bash
node seed-admin.js
pm2 start server.js --name crm-backend
pm2 save
pm2 startup
```

بعد از این مرحله، API و **همین پنل (داشبورد)** روی پورت **3002** در دسترس است؛ از بیرون با آدرس `http://92.205.58.83:3002` در مرورگر باز کنید (همان آدرس هم API است هم رابط کاربری).

---

## روش ۲: راه‌اندازی با Nginx و (اختیاری) HTTPS

اگر می‌خواهید از پورت 80/443 استفاده کنید یا دامنه و SSL داشته باشید:

### نصب Nginx

```bash
apt install -y nginx
```

### ساخت فایل تنظیم Nginx

```bash
nano /etc/nginx/sites-available/crm
```

محتوا (با IP؛ اگر دامنه دارید به‌جای `92.205.58.83` دامنه را بگذارید):

```nginx
server {
    listen 80;
    server_name 92.205.58.83;
    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 20M;
    }
}
```

فعال‌سازی و ریستارت:

```bash
ln -s /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

الان با آدرس `http://92.205.58.83` (بدون پورت) به همان بک‌اند متصل می‌شوید.

### نصب SSL (اختیاری؛ با دامنه)

اگر دامنه را به این IP اشاره دادید:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com
```

---

## به‌روزرسانی بعدی (بعد از تغییر در گیت)

**خودکار:** با هر push به `master`، GitHub Actions سرور را به‌روز می‌کند. راهنما: [DEPLOY-SETUP.md](DEPLOY-SETUP.md)

**دستی** روی سرور:

```bash
cd /var/www/kayaCRM
bash scripts/deploy.sh
```

---

## پورت‌ها و فایروال

- اگر فایروال دارید، پورت **80** (و در صورت نیاز **443** و **3002**) را باز کنید.
- از پنل هاستینگ هم می‌توانید قوانین فایروال را بررسی کنید.

---

## خلاصه دستورات (کپی‌پیست)

```bash
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git nginx
npm install -g pm2
mkdir -p /var/www && cd /var/www
git clone https://github.com/ersanjt/kayaCRM.git
cd kayaCRM/backend
npm install --production
# بعد .env را بسازید و مقداردهی کنید
node seed-admin.js
pm2 start server.js --name crm-backend
pm2 save && pm2 startup
```

بعد از ساخت و فعال کردن سایت Nginx، با `http://92.205.58.83` یا دامنه‌ی خود به سیستم دسترسی دارید.

---

## اگر دیپلوی GitHub Actions خطای «i/o timeout» داد

وقتی در GitHub Actions خطای `dial tcp 92.205.58.83:22: i/o timeout` می‌بینید، یعنی رانر GitHub به پورت ۲۲ سرور شما وصل نمی‌شود (فایروال، یا سرور از IPهای GitHub در دسترس نیست). در این حالت می‌توانید **دیپلوی دستی** انجام دهید.

### از کامپیوتر خود (با SSH به سرور)

۱. مطمئن شوید آخرین کد روی `master` در GitHub است (push کرده‌اید).  
۲. با SSH به سرور وصل شوید (با همان کاربری که در workflow استفاده می‌کنید، مثلاً `fxguard`):

```bash
ssh fxguard@92.205.58.83
```

۳. روی سرور این دستورات را بزنید (همان منطق workflow):

```bash
set -e
cd /var/www/kayaCRM
git fetch origin
git reset --hard origin/master
cd backend
node scripts/backup-database.js || true
npm ci --only=production
node scripts/add-unanswered-columns.js
node scripts/add-conversation-indexes.js
pm2 reload ecosystem.config.js --update-env || pm2 start ecosystem.config.js --update-env
pm2 save
```

بعد از این، نسخهٔ جدید (از جمله تغییرات واتساپ/QR) روی سرور فعال است.

### اگر می‌خواهید دیپلوی خودکار دوباره کار کند

- در فایروال سرور (یا پنل هاست) مطمئن شوید پورت **۲۲** از اینترنت (یا حداقل از محدودهٔ IPهای GitHub Actions) باز است.
- گاهی ارائه‌دهندهٔ سرور فقط از IP خاصی SSH را باز می‌کند؛ در آن صورت یا محدودهٔ GitHub را اضافه کنید یا فقط از دیپلوی دستی استفاده کنید.

# 🚀 راهنمای شروع سریع - WhatsApp Enterprise CRM

## شروع در 5 دقیقه!

### گام 1: پیش‌نیازها

```bash
# بررسی نصب Node.js
node --version  # باید >= 18.x باشد

# بررسی نصب Docker (اختیاری)
docker --version
```

---

### گام 2: نصب با Docker (ساده‌ترین روش)

```bash
# 1. کلون پروژه
git clone https://github.com/your-company/whatsapp-crm.git
cd whatsapp-crm

# 2. کپی فایل محیطی
cp .env.example .env

# 3. راه‌اندازی
docker-compose up -d

# 4. بررسی وضعیت
docker-compose ps
```

**✅ تمام! سیستم آماده است.**

- Frontend: http://localhost:3000
- Backend API: http://localhost:3002
- Gateway: http://localhost:3001
- RabbitMQ Management: http://localhost:15672

---

### گام 3: نصب دستی (بدون Docker)

```bash
# 1. نصب دیتابیس‌ها
# PostgreSQL
sudo apt install postgresql
sudo -u postgres createdb whatsapp_crm

# MongoDB
sudo apt install mongodb
sudo systemctl start mongodb

# Redis
sudo apt install redis-server
sudo systemctl start redis

# RabbitMQ
sudo apt install rabbitmq-server
sudo systemctl start rabbitmq-server

# 2. نصب Gateway
cd gateway
npm install
cp .env.example .env
npm start

# 3. نصب Backend (در Terminal جدید)
cd ../backend
npm install
cp .env.example .env
npm run migrate
npm run seed
npm start

# 4. نصب Frontend (در Terminal جدید)
cd ../frontend
npm install
npm start
```

---

### گام 4: ورود اولیه

1. باز کردن مرورگر: http://localhost:3000

2. اطلاعات ورود پیش‌فرض:
   ```
   ایمیل: admin@kaya.fxguard.io
   رمز عبور: Admin@123
   ```

3. بعد از ورود، به **تنظیمات > اتصال WhatsApp** بروید

4. QR Code را اسکن کنید

---

### گام 5: تنظیمات اولیه

#### A. ایجاد دپارتمان اول:

```
مسیر: تنظیمات > دپارتمان‌ها > افزودن دپارتمان

📝 مثال:
نام: پشتیبانی
کلمات کلیدی: مشکل,خرابی,ارور,پشتیبانی,راهنمایی
پیش‌فرض: بله
```

#### B. افزودن کارمند اول:

```
مسیر: کاربران > کاربر جدید

📝 مثال:
نام: علی احمدی
ایمیل: ali@kaya.fxguard.io
رمز عبور: Ali@123
نقش: Agent
دپارتمان: پشتیبانی
```

#### C. تنظیم پاسخ خودکار:

```
مسیر: اتوماسیون > پاسخ خودکار > افزودن پاسخ

📝 مثال:
نام: خوش‌آمدگویی
کلمات کلیدی: سلام,درود,hello,hi
پاسخ: سلام! به پشتیبانی ما خوش آمدید 👋
       چطور می‌تونم کمکتون کنم؟
```

---

### گام 6: تست سیستم

1. از شماره دیگری به شماره WhatsApp متصل شده پیام بدهید

2. در Dashboard باید پیام جدید را ببینید

3. پاسخ دهید و نتیجه را در WhatsApp بررسی کنید

---

## 🎯 سناریوهای متداول

### سناریو 1: ارسال پیام انبوه

```bash
مسیر: پیام‌رسانی > ارسال انبوه

1. آپلود فایل Excel مخاطبین (شامل: نام، شماره)
2. نوشتن پیام با متغیرها: "سلام {name} عزیز..."
3. تنظیم تأخیر بین پیام‌ها (پیشنهاد: 5-10 ثانیه)
4. ارسال

✅ سیستم به صورت خودکار پیام‌ها را ارسال می‌کند
```

### سناریو 2: تخصیص خودکار

```
وقتی مشتری پیام می‌فرستد:
  ↓
سیستم کلمات کلیدی را چک می‌کند
  ↓
دپارتمان مناسب را پیدا می‌کند
  ↓
کارمند با کمترین بار کاری را انتخاب می‌کند
  ↓
مکالمه تخصیص داده می‌شود
  ↓
کارمند نوتیفیکیشن دریافت می‌کند
```

### سناریو 3: گزارش‌گیری

```bash
مسیر: گزارشات > داشبورد

نمایش:
- تعداد پیام‌های امروز: 1,245
- زمان میانگین پاسخ: 2.5 دقیقه
- نرخ رضایت: 95%
- مکالمات فعال: 43

📊 گزارش Excel:
  گزارشات > Export > تاریخ مورد نظر > دانلود
```

---

## 🔧 عیب‌یابی سریع

### مشکل: WhatsApp متصل نمی‌شود

```bash
# راه‌حل 1: پاک کردن Session
cd gateway/sessions
rm -rf *
# اسکن مجدد QR Code

# راه‌حل 2: Restart Gateway
docker-compose restart whatsapp-gateway
# یا
pm2 restart whatsapp-gateway
```

### مشکل: پیام‌ها دریافت نمی‌شوند

```bash
# بررسی RabbitMQ
docker-compose logs rabbitmq

# Restart همه سرویس‌ها
docker-compose restart
```

### مشکل: نمی‌توانم ورود کنم

```bash
# Reset رمز Admin
cd backend
npm run reset-admin-password

# یا در دیتابیس:
psql -U crm_user whatsapp_crm
UPDATE "Users" SET password = '$2b$10$...' WHERE email = 'admin@kaya.fxguard.io';
```

---

## 📱 دسترسی از موبایل

برای دسترسی از موبایل به Dashboard:

```bash
# 1. پیدا کردن IP لوکال
ifconfig  # یا ipconfig در Windows

# مثلاً IP شما: 192.168.1.100

# 2. باز کردن در مرورگر موبایل:
http://192.168.1.100:3000
```

---

## 🌐 راه‌اندازی در سرور (Production)

### با دامنه (Domain):

```bash
# 1. نصب Nginx
sudo apt install nginx

# 2. تنظیمات Nginx
sudo nano /etc/nginx/sites-available/whatsapp-crm

# محتوا:
server {
    listen 80;
    server_name kaya.fxguard.io;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3002;
    }
}

# 3. فعال‌سازی
sudo ln -s /etc/nginx/sites-available/whatsapp-crm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 4. نصب SSL (رایگان)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d kaya.fxguard.io
```

---

## 🔐 امنیت Production

```bash
# 1. تغییر رمزهای پیش‌فرض در .env
JWT_SECRET=YourVeryStrongSecretKey123456789!
DB_PASSWORD=StrongDatabasePassword!
REDIS_PASSWORD=StrongRedisPassword!

# 2. فعال‌سازی Firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# 3. نصب Fail2Ban
sudo apt install fail2ban

# 4. Backup خودکار
crontab -e
# اضافه کردن:
0 2 * * * /path/to/backup.sh
```

---

## 📊 Monitoring (نظارت)

دسترسی به پنل‌های نظارتی:

- **Grafana:** http://localhost:3003
  - Username: admin
  - Password: admin

- **Prometheus:** http://localhost:9090

- **RabbitMQ Management:** http://localhost:15672
  - Username: admin
  - Password: RabbitMQ123!

---

## 📚 منابع بیشتر

- [مستندات کامل](README.md)
- [API Documentation](docs/API.md)
- [راهنمای توسعه](docs/DEVELOPMENT.md)
- [سوالات متداول](docs/FAQ.md)
- [تیکت پشتیبانی](https://github.com/company/whatsapp-crm/issues)

---

## 🎉 موفق باشید!

حالا شما یک سیستم CRM حرفه‌ای WhatsApp دارید که می‌تواند:

✅ پیام‌های واتساپ را به صورت Real-time دریافت کند  
✅ پاسخ‌های خودکار بفرستد  
✅ مکالمات را بین دپارتمان‌ها تقسیم کند  
✅ پیام انبوه ارسال کند  
✅ گزارش‌های تحلیلی تولید کند  
✅ و خیلی چیزهای دیگر...

**نکته مهم:** حتماً رمزهای پیش‌فرض را تغییر دهید! 🔐

---

**سوال یا مشکل؟**  
📧 support@kaya.fxguard.io
💬 @company_support

**آیا این پروژه به شما کمک کرد؟**  
⭐ Star بدهید و با دوستان به اشتراک بگذارید!

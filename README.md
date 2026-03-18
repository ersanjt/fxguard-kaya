# 🚀 WhatsApp Enterprise CRM - راهنمای نصب و راه‌اندازی

> **شروع سریع (بدون Docker):** فقط Node.js لازم است. از پوشه پروژه اجرا کنید: `.\start-all.ps1` (ویندوز) یا `./start-all.sh` (لینوکس/مک). سپس در مرورگر باز کنید: **http://localhost:3002/** — ورود: `admin@company.com` / `Admin@123`.  
> راهنمای تحویل به مشتری و استفاده روزمره: **[README-تحویل-مشتری.md](README-تحویل-مشتری.md)** | خلاصه راه‌اندازی: **[راه‌اندازی-سریع.md](راه‌اندازی-سریع.md)**

**ساختار مخزن:** `backend/` (API + داشبورد در `public/`) · `gateway/` (واتساپ) · `docs/`  
**استاندارد توسعه:** از ریشهٔ پروژه — `npm run lint` · `npm test` · [docs/PROJECT-STANDARDS.md](docs/PROJECT-STANDARDS.md) · [docs/README.md](docs/README.md) · [CONTRIBUTING.md](CONTRIBUTING.md)

---

## ⚡ شروع سریع (Quick Start)

**پیش‌نیاز:** فقط Node.js 18+ لازم است. بدون PostgreSQL، MongoDB، Redis یا RabbitMQ.

### ویندوز (PowerShell)
```powershell
.\start-all.ps1
```

### لینوکس / مک
```bash
chmod +x start-all.sh
./start-all.sh
```

### با Docker
```bash
docker-compose -f docker-compose.simple.yml up -d
```

بعد از اجرا:
- **داشبورد:** http://localhost:3002/  
- **ورود:** `admin@company.com` / `Admin@123`  
- به بخش «اتصال واتساپ» بروید و QR را با گوشی اسکن کنید.

---

## 📋 فهرست مطالب
1. [پیش‌نیازها](#پیشنیازها)
2. [معماری سیستم](#معماری-سیستم)
3. [نصب](#نصب)
4. [پیکربندی](#پیکربندی)
5. [راه‌اندازی](#راهاندازی)
6. [امکانات](#امکانات)
7. [API Documentation](#api-documentation)

---

## 🎯 پیش‌نیازها

### نرم‌افزارهای مورد نیاز:
- **Node.js** >= 18.x
- **PostgreSQL** >= 14.x
- **MongoDB** >= 5.x
- **Redis** >= 7.x
- **RabbitMQ** >= 3.11.x
- **Docker** (اختیاری)

### سیستم عامل:
- Windows 10/11
- macOS 12+
- Linux (Ubuntu 20.04+, CentOS 8+)

---

## 🏗️ معماری سیستم

```
┌───────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Admin      │  │   Manager    │  │    Agent     │    │
│  │  Dashboard   │  │  Dashboard   │  │  Dashboard   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────┬─────────────────────────────────┘
                          │ HTTPS/WSS
┌─────────────────────────▼─────────────────────────────────┐
│                   API GATEWAY LAYER                        │
│              (Load Balancer + Rate Limiter)                │
└─────────────────────────┬─────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼──────┐  ┌──────▼───────┐  ┌─────▼────────┐
│   WhatsApp   │  │   CRM API    │  │  Analytics   │
│   Gateway    │  │   Backend    │  │   Service    │
│   (Local)    │  │              │  │              │
└───────┬──────┘  └──────┬───────┘  └─────┬────────┘
        │                │                 │
        └────────────────┼─────────────────┘
                         │
┌────────────────────────▼─────────────────────────┐
│              MESSAGE QUEUE LAYER                  │
│         RabbitMQ + Redis (Pub/Sub)               │
└────────────────────────┬─────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼──────┐  ┌─────▼─────┐  ┌──────▼──────┐
│  PostgreSQL  │  │  MongoDB  │  │    Redis    │
│  (Relational)│  │  (Logs)   │  │   (Cache)   │
└──────────────┘  └───────────┘  └─────────────┘
```

---

## 📦 نصب

### 1️⃣ نصب با Docker (پیشنهادی)

```bash
# کلون پروژه
git clone https://github.com/your-company/whatsapp-crm.git
cd whatsapp-crm

# اجرای Docker Compose
docker-compose up -d

# بررسی وضعیت
docker-compose ps
```

### 2️⃣ نصب دستی

#### A. نصب دیتابیس‌ها

**PostgreSQL:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS
brew install postgresql@14

# ایجاد دیتابیس
sudo -u postgres psql
CREATE DATABASE whatsapp_crm;
CREATE USER crm_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE whatsapp_crm TO crm_user;
\q
```

**MongoDB:**
```bash
# Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# macOS
brew tap mongodb/brew
brew install mongodb-community@5.0
brew services start mongodb-community@5.0
```

**Redis:**
```bash
# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis

# macOS
brew install redis
brew services start redis
```

**RabbitMQ:**
```bash
# Ubuntu/Debian
sudo apt install rabbitmq-server
sudo systemctl start rabbitmq-server
sudo systemctl enable rabbitmq-server
sudo rabbitmq-plugins enable rabbitmq_management

# macOS
brew install rabbitmq
brew services start rabbitmq
```

#### B. نصب WhatsApp Gateway

```bash
cd gateway
npm install
cp .env.example .env
# ویرایش .env
npm start
```

#### C. نصب Backend API

```bash
cd backend
npm install
cp .env.example .env
# ویرایش .env
npm run migrate
npm run seed
npm start
```

#### D. داشبورد وب (همان Backend)

رابط کاربری اصلی داخل **`backend/public`** (مثلاً `dashboard.html`) سرو می‌شود؛ پوشهٔ جداگانهٔ `frontend` در این مخزن **وجود ندارد**. پس از `npm install` و `npm start` در backend، آدرس پنل همان `http://localhost:3002/` است.

---

## ⚙️ پیکربندی

### 📄 فایل `.env` برای Gateway:

```env
# Server
PORT=3001
NODE_ENV=production

# WhatsApp
WHATSAPP_SESSION_PATH=./sessions
WHATSAPP_CLIENT_ID=enterprise-crm

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672

# Redis
REDIS_URL=redis://localhost:6379

# Backend API
BACKEND_API_URL=http://localhost:3002

# Frontend
FRONTEND_URL=http://localhost:3000

# Security
SESSION_SECRET=your_super_secret_key_here

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/gateway.log
```

### 📄 فایل `.env` برای Backend:

```env
# Server
PORT=3002
NODE_ENV=production

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=whatsapp_crm
DB_USER=crm_user
DB_PASSWORD=your_password

# MongoDB
MONGODB_URL=mongodb://localhost:27017/whatsapp_crm

# Redis
REDIS_URL=redis://localhost:6379

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Webhook (در production اجباری — حداقل ۱۶ کاراکتر)
WEBHOOK_SECRET=your_webhook_secret

# Frontend
FRONTEND_URL=http://localhost:3000

# WhatsApp Gateway
GATEWAY_URL=http://localhost:3001

# Email (اختیاری)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

---

## 🚀 راه‌اندازی

### روش 1: با PM2 (پیشنهادی برای Production)

```bash
# نصب PM2
npm install -g pm2

# راه‌اندازی Gateway
cd gateway
pm2 start src/index.js --name "whatsapp-gateway"

# راه‌اندازی Backend (داشبورد از همین سرویس روی پورت 3002)
cd ../backend
pm2 start server.js --name "crm-backend"

# ذخیره تنظیمات
pm2 save

# راه‌اندازی خودکار با بوت سیستم
pm2 startup
```

### روش 2: با Docker Compose

```bash
docker-compose up -d
```

### روش 3: Development Mode

```bash
# Terminal 1: Gateway
cd gateway
npm run dev

# Terminal 2: Backend (پنل در /dashboard همان سرور)
cd backend
npm run dev
```

---

## 🎁 امکانات

### ✅ امکانات اصلی:

#### 1. **مدیریت مشتریان (Customer Management)**
- ✅ ایجاد و ویرایش اطلاعات مشتریان
- ✅ نمایش تاریخچه کامل مکالمات
- ✅ سیستم تگ‌گذاری
- ✅ فیلدهای سفارشی (Custom Fields)
- ✅ آپلود و نمایش عکس پروفایل

#### 2. **سیستم پیام‌رسانی (Messaging System)**
- ✅ دریافت پیام‌های WhatsApp به صورت Real-time
- ✅ ارسال پیام تکی
- ✅ ارسال پیام انبوه (Bulk Messaging) با قابلیت تأخیر
- ✅ پشتیبانی از انواع مدیا (تصویر، ویدیو، صوت، سند)
- ✅ Reply و Forward پیام‌ها
- ✅ وضعیت پیام‌ها (ارسال شده، دریافت شده، خوانده شده)

#### 3. **سیستم دپارتمان‌ها (Department Management)**
- ✅ ایجاد دپارتمان‌های مختلف (فروش، پشتیبانی، مالی و...)
- ✅ تخصیص خودکار بر اساس کلمات کلیدی
- ✅ توزیع بار کاری هوشمند
- ✅ مدیریت کارمندان هر دپارتمان

#### 4. **سیستم کاربران (User Management)**
- ✅ سطوح دسترسی مختلف (Admin, Manager, Supervisor, Agent)
- ✅ مدیریت مجوزها (Permissions)
- ✅ نمایش وضعیت آنلاین/آفلاین کاربران
- ✅ گزارش عملکرد هر کارمند

#### 5. **پاسخ‌های خودکار (Auto-Response)**
- ✅ تعریف قوانین پاسخ خودکار
- ✅ شرط‌گذاری پیشرفته
- ✅ پاسخ بر اساس کلمات کلیدی
- ✅ پاسخ بر اساس زمان روز

#### 6. **تمپلیت‌ها (Message Templates)**
- ✅ ذخیره پیام‌های پرکاربرد
- ✅ متغیرهای داینامیک ({name}, {date}, ...)
- ✅ دسته‌بندی تمپلیت‌ها
- ✅ آمار استفاده

#### 7. **گزارشات و تحلیل (Analytics & Reports)**
- ✅ داشبورد مدیریتی
- ✅ آمار تعداد پیام‌ها (دریافتی/ارسالی)
- ✅ نمودار زمان پاسخگویی
- ✅ نرخ رضایت مشتریان
- ✅ گزارش عملکرد کارمندان
- ✅ Export به Excel/PDF

#### 8. **مدیریت مکالمات (Conversation Management)**
- ✅ نمایش مکالمات باز/بسته
- ✅ اولویت‌بندی (کم، عادی، زیاد، فوری)
- ✅ تخصیص به کارمند
- ✅ انتقال بین کارمندان
- ✅ بستن و آرشیو مکالمات
- ✅ رتبه‌دهی و نظرسنجی

#### 9. **جستجو و فیلتر (Search & Filter)**
- ✅ جستجوی پیشرفته در پیام‌ها
- ✅ فیلتر بر اساس تاریخ، دپارتمان، وضعیت
- ✅ جستجو در مشتریان
- ✅ ذخیره فیلترهای سفارشی

#### 10. **امنیت (Security)**
- ✅ احراز هویت دو مرحله‌ای (2FA)
- ✅ رمزنگاری پیام‌ها
- ✅ لاگ تمام فعالیت‌ها
- ✅ محدودیت IP
- ✅ Session Management

#### 11. **اعلان‌ها (Notifications)**
- ✅ اعلان Real-time برای پیام‌های جدید
- ✅ اعلان صوتی
- ✅ اعلان ایمیل
- ✅ اعلان Desktop
- ✅ تنظیمات شخصی‌سازی شده

#### 12. **یکپارچه‌سازی (Integrations)**
- ✅ Webhook برای اتصال به سیستم‌های دیگر
- ✅ REST API کامل
- ✅ Export/Import داده‌ها
- ✅ اتصال به CRM‌های خارجی

---

## 📱 راهنمای استفاده

### برای مدیر (Admin):

1. **ورود به سیستم:**
   - آدرس: `http://localhost:3000`
   - نام کاربری پیش‌فرض: `admin@company.com`
   - رمز عبور پیش‌فرض: `Admin@123`

2. **اسکن QR Code:**
   - بعد از ورود، به بخش "تنظیمات WhatsApp" بروید
   - QR Code را با WhatsApp خود اسکن کنید
   - بعد از اتصال، سیستم آماده است

3. **ایجاد دپارتمان:**
   ```
   مسیر: تنظیمات > دپارتمان‌ها > دپارتمان جدید
   
   مثال:
   نام: پشتیبانی فنی
   کلمات کلیدی: مشکل، خرابی، ارور، پشتیبانی
   رنگ: #e74c3c
   ```

4. **اضافه کردن کارمند:**
   ```
   مسیر: کاربران > کاربر جدید
   
   مثال:
   نام: علی احمدی
   ایمیل: ali@company.com
   نقش: Agent
   دپارتمان: پشتیبانی فنی
   ```

5. **تنظیم پاسخ خودکار:**
   ```
   مسیر: اتوماسیون > پاسخ خودکار > پاسخ جدید
   
   مثال:
   نام: خوش‌آمدگویی
   کلمات کلیدی: سلام، درود، hello
   پاسخ: سلام! به پشتیبانی ما خوش آمدید. چطور می‌تونم کمکتون کنم؟
   ```

### برای کارمند (Agent):

1. **ورود و نمایش پیام‌ها:**
   - پیام‌های تخصیص داده شده در Dashboard نمایش داده می‌شود
   - پیام‌های جدید با نوتیفیکیشن اطلاع داده می‌شود

2. **پاسخ به مشتری:**
   ```
   1. روی مکالمه کلیک کنید
   2. پیام خود را تایپ کنید
   3. Enter یا دکمه ارسال
   ```

3. **استفاده از تمپلیت:**
   ```
   1. روی آیکون تمپلیت کلیک کنید
   2. تمپلیت مورد نظر را انتخاب کنید
   3. متغیرها را پر کنید
   4. ارسال
   ```

4. **انتقال مکالمه:**
   ```
   1. در صفحه مکالمه، روی "انتقال" کلیک کنید
   2. دپارتمان یا کارمند مقصد را انتخاب کنید
   3. دلیل انتقال را بنویسید
   4. تأیید
   ```

---

## 🔌 API Documentation

### Authentication:

```javascript
// Login
POST /api/auth/login
{
  "email": "user@company.com",
  "password": "password123"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "User Name",
    "role": "agent"
  }
}
```

### Conversations:

```javascript
// Get All Conversations
GET /api/conversations
Headers: { Authorization: "Bearer {token}" }

Response:
{
  "data": [
    {
      "id": "uuid",
      "customer": { ... },
      "lastMessage": "...",
      "unreadCount": 5,
      "status": "open"
    }
  ],
  "total": 50,
  "page": 1
}

// Get Conversation Messages
GET /api/conversations/{id}/messages

// Send Message
POST /api/conversations/{id}/messages
{
  "content": "پیام شما",
  "type": "text"
}
```

### Customers:

```javascript
// Get All Customers
GET /api/customers

// Create Customer
POST /api/customers
{
  "name": "نام مشتری",
  "phone": "989123456789",
  "email": "customer@example.com"
}

// Update Customer
PUT /api/customers/{id}
{
  "name": "نام جدید",
  "customFields": {
    "company": "شرکت ABC"
  }
}
```

---

## 🔧 عیب‌یابی (Troubleshooting)

### مشکل: WhatsApp متصل نمی‌شود

```bash
# بررسی لاگ‌ها
cd gateway
tail -f combined.log

# راه‌حل:
1. پاک کردن Session قبلی:
   rm -rf sessions/*

2. Restart کردن Gateway:
   pm2 restart whatsapp-gateway

3. اسکن مجدد QR Code
```

### مشکل: پیام‌ها دریافت نمی‌شوند

```bash
# بررسی RabbitMQ
sudo rabbitmqctl list_queues

# باید صف whatsapp_messages را ببینید

# راه‌حل:
sudo systemctl restart rabbitmq-server
pm2 restart all
```

### مشکل: دیتابیس خطا می‌دهد

```bash
# بررسی اتصال PostgreSQL
psql -U crm_user -d whatsapp_crm -h localhost

# اجرای مجدد Migration
cd backend
npm run migrate

# Seed کردن داده‌های اولیه
npm run seed
```

---

## 📊 نمونه گزارشات

سیستم به صورت خودکار گزارشات زیر را تولید می‌کند:

1. **گزارش روزانه:**
   - تعداد پیام‌های دریافتی
   - تعداد پیام‌های ارسالی
   - میانگین زمان پاسخگویی
   - تعداد مکالمات جدید/بسته شده

2. **گزارش عملکرد کارمند:**
   - تعداد مکالمات پاسخ داده شده
   - زمان میانگین پاسخ
   - نرخ رضایت مشتری
   - تعداد ساعت کاری

3. **گزارش مشتریان:**
   - مشتریان جدید
   - مشتریان فعال
   - نرخ بازگشت مشتری

---

## 🔐 امنیت و Backup

### Backup خودکار:

```bash
# افزودن به Cron
crontab -e

# Backup روزانه در ساعت 2 بامداد
0 2 * * * /path/to/backup.sh
```

### Script Backup:

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/whatsapp-crm"

# PostgreSQL Backup
pg_dump whatsapp_crm > $BACKUP_DIR/postgres_$DATE.sql

# MongoDB Backup
mongodump --db whatsapp_crm --out $BACKUP_DIR/mongo_$DATE

# فایل‌ها
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz ./uploads

# حذف Backup‌های قدیمی (بیش از 30 روز)
find $BACKUP_DIR -mtime +30 -delete
```

---

## 📥 دانلود و بسته‌سازی (برای اشتراک‌گذاری)

**ویندوز (PowerShell):** در پوشه پروژه اجرا کنید تا یک فایل ZIP در پوشه بالاتر ساخته شود:

```powershell
.\create-package.ps1
```

فایل خروجی مثلاً: `whatsapp-crm-complete-20260215-1234.zip` — می‌توانید آن را دانلود یا ارسال کنید. بعد از استخراج ZIP، فایل `.env` را از روی `.env.example` بسازید و مراحل نصب را انجام دهید.

---

## 📞 پشتیبانی

- **ایمیل:** support@company.com
- **تلگرام:** @company_support
- **مستندات:** https://docs.company.com
- **GitHub Issues:** https://github.com/company/whatsapp-crm/issues

---

## 📝 لایسنس

این پروژه تحت لایسنس MIT منتشر شده است.

---

## ✨ ویژگی‌های آینده (Roadmap)

- [ ] اتصال به واتساپ Business API
- [ ] چت‌بات هوش مصنوعی
- [ ] پنل گزارشات پیشرفته
- [ ] اپلیکیشن موبایل
- [ ] اتصال به شبکه‌های اجتماعی دیگر
- [ ] سیستم تیکتینگ
- [ ] CRM خارجی (Salesforce, HubSpot)
- [ ] نوتیفیکیشن پوش
- [ ] چت صوتی/تصویری

---

**نسخه:** 1.0.0  
**آخرین بروزرسانی:** February 2026  
**توسعه‌دهندگان:** Your Company Team

---

© 2026 Your Company. All rights reserved.

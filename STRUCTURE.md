# 📁 ساختار پروژه WhatsApp Enterprise CRM

## نمای کلی ساختار:

```
whatsapp-enterprise-crm/
│
├── 📁 gateway/                          # WhatsApp Gateway Service
│   ├── src/
│   │   └── index.js                     # کد اصلی Gateway
│   ├── sessions/                        # WhatsApp sessions
│   ├── uploads/                         # فایل‌های دریافتی
│   ├── logs/                            # لاگ‌ها
│   ├── package.json
│   ├── Dockerfile
│   └── .env
│
├── 📁 backend/                          # Backend API & CRM Logic
│   ├── models/                          # مدل‌های دیتابیس
│   │   ├── index.js
│   │   ├── User.js
│   │   ├── Customer.js
│   │   ├── Conversation.js
│   │   └── Message.js
│   ├── routes/                          # API Routes
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── conversations.js
│   │   ├── messages.js
│   │   ├── departments.js
│   │   ├── analytics.js
│   │   ├── bulk.js
│   │   └── customers.js
│   ├── controllers/                     # Logic Controllers
│   ├── middleware/                      # Middleware (auth, validation)
│   ├── config/                          # تنظیمات
│   ├── migrations/                      # Database Migrations
│   ├── seeders/                         # داده‌های اولیه
│   ├── uploads/                         # فایل‌های آپلود شده
│   ├── logs/                            # لاگ‌ها
│   ├── server.js                        # سرور اصلی
│   ├── package.json
│   ├── Dockerfile
│   └── .env
│
├── 📁 frontend/                         # React Dashboard
│   ├── public/
│   ├── src/
│   │   ├── components/                  # کامپوننت‌های React
│   │   │   ├── Dashboard/
│   │   │   ├── Conversations/
│   │   │   ├── Messages/
│   │   │   ├── Customers/
│   │   │   ├── Users/
│   │   │   ├── Departments/
│   │   │   ├── Analytics/
│   │   │   └── Settings/
│   │   ├── pages/                       # صفحات اصلی
│   │   ├── services/                    # API calls
│   │   ├── utils/                       # توابع کمکی
│   │   ├── contexts/                    # React Contexts
│   │   ├── hooks/                       # Custom Hooks
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   ├── Dockerfile
│   └── .env
│
├── 📁 database/                         # Database Scripts
│   ├── postgres/
│   │   ├── schema.sql
│   │   └── seed.sql
│   └── mongodb/
│       └── indexes.js
│
├── 📁 docs/                             # مستندات
│   ├── API.md
│   ├── DEVELOPMENT.md
│   ├── FAQ.md
│   └── TROUBLESHOOTING.md
│
├── 📁 nginx/                            # Nginx Configuration
│   ├── nginx.conf
│   └── ssl/
│
├── 📁 monitoring/                       # Monitoring Config
│   ├── prometheus.yml
│   └── grafana/
│       ├── dashboards/
│       └── datasources/
│
├── 📁 scripts/                          # اسکریپت‌های کمکی
│   ├── backup.sh
│   ├── restore.sh
│   └── health-check.sh
│
├── docker-compose.yml                   # Docker Compose
├── .env.example                         # نمونه فایل محیطی
├── .gitignore
├── install.sh                           # اسکریپت نصب خودکار
├── README.md                            # مستندات کامل
├── QUICKSTART.md                        # راهنمای سریع
├── LICENSE
└── CHANGELOG.md

```

## 🎯 توضیح اجزای کلیدی:

### 1. Gateway Service (Port 3001)
**وظیفه:** اتصال به WhatsApp Web و دریافت/ارسال پیام‌ها

**فایل‌های کلیدی:**
- `src/index.js` - کد اصلی Gateway با whatsapp-web.js
- تماس با RabbitMQ برای ارسال پیام‌ها به Backend
- مدیریت QR Code و Session
- Real-time ارتباط با Dashboard از طریق Socket.IO

**API Endpoints:**
- `GET /api/status` - وضعیت Gateway
- `GET /api/qr` - دریافت QR Code
- `POST /api/send-message` - ارسال پیام تکی
- `POST /api/send-bulk` - ارسال پیام انبوه
- `GET /api/contacts` - لیست مخاطبین
- `GET /api/chats` - لیست چت‌ها

### 2. Backend API (Port 3002)
**وظیفه:** Logic اصلی CRM، مدیریت دیتابیس و API

**مدل‌های کلیدی:**
- `User` - کاربران سیستم (Admin, Manager, Agent)
- `Customer` - مشتریان
- `Conversation` - مکالمات
- `Message` - پیام‌ها
- `Department` - دپارتمان‌ها
- `AutoResponse` - پاسخ‌های خودکار
- `Template` - تمپلیت پیام‌ها
- `Tag` - تگ‌ها

**Features:**
- احراز هویت JWT
- Auto-Assignment (تخصیص خودکار)
- Auto-Response (پاسخ خودکار)
- Bulk Messaging
- Analytics & Reporting
- Real-time Notifications

### 3. Frontend Dashboard (Port 3000)
**وظیفه:** رابط کاربری برای مدیران و کارمندان

**بخش‌های اصلی:**
- **Dashboard** - آمار کلی
- **Conversations** - مدیریت مکالمات
- **Customers** - مدیریت مشتریان
- **Users** - مدیریت کاربران
- **Departments** - مدیریت دپارتمان‌ها
- **Analytics** - گزارشات و تحلیل
- **Settings** - تنظیمات
- **Bulk Messaging** - ارسال انبوه

### 4. Message Queue (RabbitMQ)
**صف‌ها:**
- `whatsapp_messages` - پیام‌های دریافتی از WhatsApp
- `outgoing_messages` - پیام‌های ارسالی به WhatsApp

**جریان داده:**
```
WhatsApp → Gateway → RabbitMQ → Backend → Database
                                    ↓
                              Process Logic
                              (Auto-Response,
                               Auto-Assignment)
                                    ↓
                              RabbitMQ → Gateway → WhatsApp
```

### 5. دیتابیس‌ها

**PostgreSQL (Primary Database):**
- Users, Customers, Conversations, Messages
- Departments, AutoResponses, Templates, Tags
- روابط Relational و Integrity

**MongoDB (Logs & Analytics):**
- Message Logs برای تحلیل
- Event Logs
- Analytics Data
- Historical Data

**Redis (Cache & Sessions):**
- Session Management
- Rate Limiting
- Cache برای Query‌های پرتکرار
- Pub/Sub برای Real-time

## 🔄 جریان کار سیستم:

### سناریو 1: دریافت پیام از مشتری

```
1. مشتری پیام می‌فرستد
   ↓
2. Gateway دریافت می‌کند (whatsapp-web.js)
   ↓
3. Gateway پیام را به RabbitMQ می‌فرستد
   ↓
4. Backend از RabbitMQ مصرف می‌کند
   ↓
5. Backend پردازش می‌کند:
   - ایجاد/بروزرسانی Customer
   - ایجاد/بروزرسانی Conversation
   - ذخیره Message
   - بررسی Auto-Response
   - تخصیص به دپارتمان/کارمند
   ↓
6. Backend از طریق Socket.IO به Dashboard اطلاع می‌دهد
   ↓
7. کارمند در Dashboard نوتیفیکیشن دریافت می‌کند
```

### سناریو 2: ارسال پیام توسط کارمند

```
1. کارمند در Dashboard پیام می‌نویسد
   ↓
2. Frontend از طریق Socket.IO به Backend ارسال می‌کند
   ↓
3. Backend ذخیره در Database
   ↓
4. Backend به RabbitMQ می‌فرستد
   ↓
5. Gateway از RabbitMQ دریافت می‌کند
   ↓
6. Gateway از طریق whatsapp-web.js ارسال می‌کند
   ↓
7. مشتری در WhatsApp دریافت می‌کند
```

### سناریو 3: ارسال انبوه

```
1. مدیر فایل Excel آپلود می‌کند
   ↓
2. Backend فایل را Parse می‌کند
   ↓
3. Backend Job در Background ایجاد می‌کند
   ↓
4. برای هر مخاطب:
   - پیام شخصی‌سازی می‌شود
   - به RabbitMQ ارسال می‌شود
   - تأخیر (برای جلوگیری از بن)
   ↓
5. Gateway ارسال می‌کند
   ↓
6. Progress به Dashboard گزارش می‌شود
```

## 🔐 امنیت:

- **JWT Authentication** - احراز هویت کاربران
- **Role-Based Access Control (RBAC)** - کنترل دسترسی
- **Rate Limiting** - محدودیت درخواست
- **Encryption** - رمزنگاری داده‌های حساس
- **HTTPS/WSS** - ارتباط امن
- **SQL Injection Prevention** - Sequelize ORM
- **XSS Protection** - Sanitization
- **CORS** - محدودیت دامنه

## 📊 مانیتورینگ:

- **Prometheus** - جمع‌آوری متریک‌ها
- **Grafana** - نمایش بصری
- **Winston** - Logging
- **PM2** - Process Management

## 🚀 Deployment:

**Development:**
```bash
npm run dev
```

**Production با PM2:**
```bash
pm2 start ecosystem.config.js
```

**Production با Docker:**
```bash
docker-compose up -d
```

## 📦 Dependencies اصلی:

**Gateway:**
- whatsapp-web.js
- socket.io
- amqplib (RabbitMQ)
- redis
- express

**Backend:**
- express
- sequelize (PostgreSQL ORM)
- mongoose (MongoDB ODM)
- jsonwebtoken (JWT)
- bcrypt (Password Hashing)
- socket.io
- amqplib
- redis

**Frontend:**
- React
- Material-UI / Ant Design
- Socket.IO Client
- Axios
- React Router
- Chart.js / Recharts

---

این ساختار به شما امکان می‌دهد:
✅ Scale کردن هر بخش به صورت مستقل
✅ Microservices Architecture
✅ High Availability
✅ Real-time Communication
✅ Comprehensive Analytics
✅ Enterprise-Grade Security

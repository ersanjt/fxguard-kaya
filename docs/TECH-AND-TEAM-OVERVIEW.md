# چطور توسعه داده شده، تکنولوژی‌ها و متخصص‌های kayaCRM

این سند توضیح می‌دهد **سیستم چطور ساخته شده**، **همهٔ تکنولوژی‌ها** و **چه نوع متخصص‌هایی روی آن کار کرده‌اند**.

---

## ۱. روش توسعه (چطوری توسعه داده شده)

### ۱.۱ سبک معماری

- **Backend مونولیتیک:** یک اپلیکیشن Node.js (Express) که همهٔ APIها، احراز هویت، دیتابیس و سرو استاتیک را با هم اجرا می‌کند.
- **Gateway جدا:** سرویس جدا برای واتساپ (whatsapp-web.js) تا اتصال واتساپ از منطق CRM جدا باشد و بتوان آن را جدا scale کرد.
- **پنل وب بدون فریمورک:** فرانتِ داشبورد با **Vanilla JavaScript** (بدون React/Vue/Angular)، یک SPA با روتینگ هش و یک فایل JS بزرگ.
- **اپ‌های موبایل native:** اندروید با Kotlin و iOS با Swift/SwiftUI؛ هر دو مستقیم به همان API وصل می‌شوند.

یعنی ترکیبی از **سرور یکپارچه + سرویس واتساپ جدا + فرانت ساده + اپ native** است.

### ۱.۲ روند توسعه (استنباط از ساختار کد)

1. **شروع با Backend و واتساپ:** احتمالاً اول API و اتصال واتساپ (Gateway) پیاده شده.
2. **پنل وب روی همان سرور:** فرانت در `backend/public/` قرار گرفته تا بدون سرور جدا، با یک deploy کار کند.
3. **اضافه شدن ماژول‌ها:** مکالمات، مشتریان، تیکت، تسک، فرایند، نرخ/صرافی، چت داخلی و… به صورت تدریجی به Backend و همان `dashboard.js` اضافه شده‌اند.
4. **اپ موبایل:** بعداً اپ اندروید (Kotlin) و iOS (Swift) برای استفاده از همان API نوشته شده‌اند.
5. **لندینگ جدا:** صفحهٔ لندینگ هم در `backend/public/` و هم در `cpanel-landing/` برای استقرار روی cPanel نگه داشته شده.

هیچ فریمورک full-stack یا مگافریمورک واحدی استفاده نشده؛ هر لایه با ابزارهای مرسوم همان اکوسیستم ساخته شده است.

---

## ۲. تمام تکنولوژی‌ها (به تفکیک بخش)

### ۲.۱ Backend (سرور اصلی CRM)

| دسته | تکنولوژی | نسخه/توضیح |
|------|----------|-------------|
| **زبان و Runtime** | Node.js | 18+ (توصیه README) |
| **فریمورک وب** | Express | 4.x |
| **اضافه‌های Express** | express-async-errors, cookie-parser, cors, compression | - |
| **امنیت** | helmet (CSP و هدرها), express-rate-limit, rate-limit-redis | - |
| **اعتبارسنجی** | express-validator | 7.x |
| **دیتابیس رابطه‌ای** | Sequelize + pg (PostgreSQL) یا sqlite3 (SQLite) | Sequelize 6.x |
| **دیتابیس NoSQL** | Mongoose (MongoDB) — اختیاری برای لاگ | 8.x |
| **صف پیام** | amqplib (RabbitMQ) — اختیاری | - |
| **کش** | redis | 4.x |
| **احراز هویت** | jsonwebtoken (JWT), bcrypt, otplib (TOTP 2FA) | - |
| **Real-time** | socket.io | 4.x |
| **درخواست HTTP** | axios | 1.x |
| **آپلود فایل** | multer | 1.x |
| **ایمیل** | nodemailer | 8.x |
| **صوت/ویدیو** | fluent-ffmpeg, @ffmpeg-installer/ffmpeg | - |
| **اکسل/خروجی** | exceljs, excel4node | - |
| **CSV** | csv-parser | - |
| **محاسبات عددی** | decimal.js | - |
| **QR و جغرافیا** | qrcode, geoip-lite | - |
| **کرون** | node-cron | - |
| **لاگ** | winston, winston-daily-rotate-file | - |
| **متغیر محیط** | dotenv | - |
| **ابزار توسعه** | nodemon, eslint, prettier, sequelize-cli, supertest | - |

### ۲.۲ Gateway واتساپ

| دسته | تکنولوژی | نسخه/توضیح |
|------|----------|-------------|
| **Runtime** | Node.js | 18+ |
| **فریمورک وب** | Express | 4.x |
| **اتصال واتساپ** | whatsapp-web.js | 1.26.x |
| **Real-time / وضعیت** | socket.io | 4.x |
| **صف/کش** | amqplib (RabbitMQ), redis | اختیاری |
| **درخواست به Backend** | axios | - |
| **QR** | qrcode, qrcode-terminal | - |
| **آپلود** | multer | - |
| **کرون** | node-cron | - |
| **لاگ** | winston | - |
| **متغیر محیط** | dotenv | - |

### ۲.۳ پنل وب (Frontend داشبورد)

| دسته | تکنولوژی | توضیح |
|------|----------|--------|
| **زبان** | JavaScript (Vanilla) | بدون فریمورک (بدون React/Vue/Angular) |
| **ساختار** | SPA با Hash Routing | یک HTML، یک JS بزرگ، روت دستی با `#dashboard`, `#conversations` و… |
| **استایل** | CSS خام | یک فایل اصلی `dashboard.css` |
| **نمودار** | Chart.js | 4.4.1 از CDN (cdn.jsdelivr.net) |
| **Real-time** | Socket.IO Client | از همان سرور Backend |
| **فونت** | Google Fonts (Inter, Vazirmatn) | با بارگذاری async برای بهینه‌سازی |
| **ماژول‌های داخلی** | constants.js, utils.js, api-client.js | توابع مشترک و درخواست API |
| **زبان‌ها** | i18n دستی | فایل‌های i18n-fa.js, i18n-en.js, i18n-tr.js |
| **Build** | ندارد | بدون Webpack/Vite؛ فایل‌ها مستقیم لود می‌شوند |

### ۲.۴ لندینگ و تماس

| دسته | تکنولوژی | توضیح |
|------|----------|--------|
| **ساختار** | HTML + CSS + JS ساده | landing.html, contact.html, landing.js, style.css |
| **مکان** | backend/public/ و cpanel-landing/ | همگام‌سازی دستی (مستند LANDING-SYNC) |

### ۲.۵ اپ اندروید

| دسته | تکنولوژی | نسخه/توضیح |
|------|----------|-------------|
| **زبان** | Kotlin | - |
| **پلتفرم** | Android (SDK) | compileSdk 34, minSdk 26 |
| **DI** | Hilt (Dagger) | - |
| **Build** | Gradle (Kotlin DSL), KSP | - |
| **Java** | 17 | - |
| **ساختار** | MVVM-style با ViewModelها | Login, Dashboard, Conversations, Customers, Tickets, Tasks, Profile, InternalChat |

### ۲.۶ اپ iOS

| دسته | تکنولوژی | توضیح |
|------|----------|--------|
| **زبان** | Swift | - |
| **UI** | SwiftUI | - |
| **ساختار** | View + ViewModel، ApiService مرکزی | - |
| **پروژه** | Xcode (KayaCRM.xcodeproj) | - |
| **RTL** | layoutDirection راست به چپ | برای فارسی/عربی |

### ۲.۷ دیتابیس و زیرساخت (استقرار)

| دسته | تکنولوژی | توضیح |
|------|----------|--------|
| **دیتابیس اصلی** | PostgreSQL یا SQLite | با Sequelize |
| **لاگ (اختیاری)** | MongoDB | با Mongoose |
| **کش (اختیاری)** | Redis | - |
| **صف (اختیاری)** | RabbitMQ | - |
| **کانتینر** | Docker | docker-compose (ساده و کامل) |
| **پروسس منیجر** | PM2 | ecosystem.config.js |
| **اسکریپت اجرا** | PowerShell (ویندوز), Bash (لینوکس/مک) | start-all.ps1, start-all.sh |

---

## ۳. چه متخصص‌هایی روی این سیستم کار کرده‌اند

بر اساس نوع کد و تکنولوژی‌ها، این نقش‌ها در توسعه دخیل بوده‌اند:

### ۳.۱ Backend / Node.js Developer

- طراحی و پیاده‌سازی API (Express، routeها، middleware).
- مدل‌های Sequelize، migration، ارتباط با PostgreSQL/SQLite و در صورت استفاده MongoDB.
- احراز هویت (JWT، Cookie، TOTP)، مجوزها و بخش‌ها (permissions, requireSection).
- سرویس‌های پردازش پیام (incomingMessage)، نوتیفیکیشن، پاسخ خودکار، AI.
- یکپارچه‌سازی با Gateway، Webhook واتساپ و در صورت استفاده RabbitMQ/Redis.
- Socket.IO برای به‌روزرسانی لحظه‌ای.

**تکنولوژی در دستش:** Node.js, Express, Sequelize, MongoDB/Mongoose, Redis, RabbitMQ, JWT, Socket.IO.

---

### ۳.۲ Frontend (وب) Developer

- ساخت پنل SPA با Vanilla JS (بدون فریمورک).
- روتینگ هش، بارگذاری داده از API، نمایش لیست‌ها و فرم‌ها (مکالمات، مشتریان، تیکت، تسک، نرخ، واتساپ و…).
- یکپارچه‌سازی با Socket.IO برای نوتیفیکیشن و به‌روزرسانی زنده.
- i18n (فا، انگلیسی، ترکی) و ظاهر RTL.
- استفاده از Chart.js برای نمودارها و استایل با CSS.

**تکنولوژی در دستش:** JavaScript, HTML, CSS, Chart.js, Socket.IO Client, REST API.

---

### ۳.۳ توسعه‌دهنده Gateway / واتساپ

- راه‌اندازی و نگهداری سرویس جدا با whatsapp-web.js.
- اتصال به واتساپ (QR، session)، دریافت و ارسال پیام، ارسال به Backend (webhook یا صف).
- در صورت استفاده: RabbitMQ، Redis، Socket.IO برای وضعیت/QR.

**تکنولوژی در دستش:** Node.js, Express, whatsapp-web.js, RabbitMQ, Redis, Socket.IO, Webhook.

---

### ۳.۴ توسعه‌دهنده اندروید (Kotlin)

- اپ native با Kotlin، معماری مبتنی بر ViewModel.
- ارتباط با API یکسان Backend (ورود، مکالمات، مشتریان، تیکت، تسک، چت داخلی و…).
- مدیریت احراز (مثلاً توکن)، ذخیرهٔ محلی و UI اندروید.

**تکنولوژی در دستش:** Kotlin, Android SDK, Gradle, Hilt, REST API, احتمالاً WebSocket/Socket.IO.

---

### ۳.۵ توسعه‌دهنده iOS (Swift)

- اپ native با Swift و SwiftUI.
- همان سناریوهای اندروید از نظر API (ورود، داشبورد، مکالمات، مشتریان، تیکت، تسک، چت داخلی).
- پشتیبانی RTL و یک ApiService مرکزی.

**تکنولوژی در دستش:** Swift, SwiftUI, Xcode, REST API.

---

### ۳.۶ طراح UI/UX (وب و احتمالاً موبایل)

- طراحی layout داشبورد، سایدبار، صفحات لیست و جزئیات، فرم‌ها و مودال‌ها.
- طراحی لندینگ و صفحه تماس.
- احتمالاً راهنما برای RTL و چندزبانگی (فا، انگلیسی، ترکی).

**خروجی کارش:** Wireframe/طراحی که در HTML/CSS و اپ موبایل پیاده شده.

---

### ۳.۷ DevOps / استقرار

- تنظیم Docker (docker-compose)، PM2، اسکریپت‌های start-all.
- تنظیم دیتابیس (PostgreSQL/SQLite)، در صورت استفاده Redis و RabbitMQ.
- مستندات استقرار (مثل DEPLOY-SERVER، DEPLOY-SETUP)، امنیت و بهینه‌سازی دسترسی (مثل IRAN_ACCESS).

**تکنولوژی در دستش:** Docker, Linux, PM2, Nginx/پروکسی در صورت استفاده، دیتابیس و Redis/RabbitMQ.

---

### ۳.۸ نقش‌های دیگر (در صورت وجود)

- **QA / تست:** تست دستی یا خودکار (supertest در Backend؛ تست‌های suite و integration).
- **مدیر محصول / آنالیز:** تعریف ماژول‌ها (مکالمات، تیکت، تسک، نرخ، صرافی، چت داخلی و…) و جریان کار.
- **مترجم / محتوای چندزبان:** پر کردن i18n-fa, i18n-en, i18n-tr.

---

## ۴. خلاصه جدول تکنولوژی (یک نگاه)

| لایه | تکنولوژی‌های اصلی |
|------|-------------------|
| **Backend** | Node.js, Express, Sequelize, PostgreSQL/SQLite, MongoDB (اختیاری), Redis, RabbitMQ, JWT, Socket.IO, Helmet, Winston |
| **Gateway** | Node.js, Express, whatsapp-web.js, Socket.IO, RabbitMQ, Redis |
| **پنل وب** | Vanilla JS, HTML5, CSS3, Chart.js, Socket.IO Client, i18n دستی |
| **لندینگ** | HTML, CSS, JS ساده |
| **اندروید** | Kotlin, Android SDK, Hilt, Gradle |
| **iOS** | Swift, SwiftUI, Xcode |
| **زیرساخت** | Docker, PM2, Bash/PowerShell |

---

## ۵. جمع‌بندی

- **روش توسعه:** Backend مونولیتیک + Gateway جدا + پنل وب Vanilla JS + اپ‌های native اندروید و iOS؛ بدون فریمورک یکپارچهٔ full-stack.
- **تکنولوژی‌ها:** در بالا به تفکیک Backend، Gateway، فرانت وب، لندینگ، اندروید، iOS و زیرساخت فهرست شدند.
- **متخصص‌ها:** Backend (Node/Express/DB)، Frontend وب (Vanilla JS)، توسعه‌دهنده Gateway/واتساپ، توسعه‌دهنده اندروید (Kotlin)، توسعه‌دهنده iOS (Swift)، طراح UI/UX، DevOps/استقرار، و در صورت وجود QA و مترجم.

اگر بخواهی برای هر نقش (مثلاً فقط Backend یا فقط موبایل) لیست دقیق‌تر تکنولوژی یا مسئولیت بنویسم، بگو تا همان بخش را تفصیلی کنم.

# اپلیکیشن اندروید صرافی کایا (Kaya CRM)

اپلیکیشن اندروید حرفه‌ای برای دسترسی به پورتال CRM واتساپ از طریق موبایل.

---

## 📥 ساخت APK برای نصب روی موبایل

### روش ۱: با Android Studio (پیشنهادی)

1. **Android Studio** را نصب کنید: https://developer.android.com/studio
2. پروژه را باز کنید: `File` → `Open` → پوشه `android-app` را انتخاب کنید
3. صبر کنید تا Gradle sync تمام شود
4. `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
5. بعد از اتمام، روی **locate** کلیک کنید یا به این مسیر بروید:
   ```
   android-app/app/build/outputs/apk/debug/app-debug.apk
   ```
6. فایل `app-debug.apk` را به موبایل منتقل کنید (کابل USB، تلگرام، واتساپ، و غیره)
7. روی موبایل فایل را باز کنید و نصب کنید

### روش ۲: با اسکریپت (اگر Android Studio نصب دارید)

1. روی فایل `build-apk.bat` دوبار کلیک کنید
2. صبر کنید تا ساخت تمام شود
3. APK در پوشه `app/build/outputs/apk/debug/` ساخته می‌شود

---

## ویژگی‌ها

- **ورود امن** با پشتیبانی از احراز هویت دو مرحله‌ای (TOTP)
- **تنظیم آدرس سرور** از صفحه ورود یا پروفایل (بدون نیاز به بیلد مجدد)
- **تشخیص وضعیت شبکه** و نمایش پیام «اتصال اینترنت برقرار نیست»
- **تلاش مجدد خودکار** در صورت خطای موقت شبکه
- **مکالمات واتساپ** لیست مکالمات با پیش‌نمایش آخرین پیام، pull-to-refresh، ارسال پیام، نمایش زمان
- **چت داخلی سازمان** گفتگو با همکاران، ایجاد ترد جدید، ارسال پیام، pull-to-refresh
- **داشبورد** با خلاصه آمار مکالمات، مشتریان، تیکت‌ها و تسک‌ها
- **مشتریان** مشاهده لیست مشتریان
- **تیکت‌ها** مدیریت تیکت‌های داخلی
- **وظایف** لیست تسک‌ها و وظایف
- **پروفایل** اطلاعات کاربر و خروج

## پیش‌نیازها

- Android Studio Hedgehog (2023.1.1) یا بالاتر
- JDK 17
- حداقل SDK: 26
- هدف: SDK 34

## نصب و اجرا

1. پروژه را در Android Studio باز کنید:
   ```
   File > Open > android-app
   ```

2. آدرس سرور API را در فایل `data/ApiConfig.kt` تنظیم کنید:
   ```kotlin
   const val BASE_URL = "https://YOUR-SERVER.com/"
   ```

3. پروژه را Build و Run کنید:
   ```
   Build > Make Project
   Run > Run 'app'
   ```

## ساختار پروژه

```
app/src/main/java/com/kaya/crm/
├── data/           # API، مدل‌ها، Repository
├── di/             # Hilt Dependency Injection
├── ui/             # Compose UI
│   ├── auth/       # ورود و TOTP
│   ├── main/       # صفحات اصلی
│   └── theme/      # تم و استایل
└── KayaCrmApp.kt   # Application
```

## تکنولوژی‌ها

- **Kotlin** + **Jetpack Compose** - UI مدرن
- **Material Design 3** - طراحی حرفه‌ای
- **Hilt** - تزریق وابستگی
- **Retrofit** - ارتباط با API
- **DataStore** - ذخیره توکن و تنظیمات

## اتصال به سرور

به‌طور پیش‌فرض اپ به آدرس `https://kaya.fxguard.io/api/` متصل می‌شود.

**برای تغییر آدرس سرور:**
فایل `data/ApiConfig.kt` را باز کنید و `BASE_URL` را تغییر دهید:
```kotlin
// برای تست لوکال (IP کامپیوترتان را بگذارید):
const val BASE_URL = "http://192.168.1.100:3002/"

// برای production:
const val BASE_URL = "https://kaya.fxguard.io/"
```

## APIهای استفاده‌شده

| مسیر | توضیح |
|------|-------|
| POST auth/login | ورود |
| POST auth/totp/verify-login | تأیید TOTP |
| GET auth/me | پروفایل کاربر |
| GET analytics/dashboard | آمار داشبورد |
| GET conversations | لیست مکالمات |
| GET conversations/:id/messages | پیام‌های مکالمه |
| POST conversations/:id/send | ارسال پیام |
| GET customers | لیست مشتریان |
| GET tickets | لیست تیکت‌ها |
| GET tasks | لیست تسک‌ها |
| GET announcements/for-me | اعلان‌ها |
| GET gateway/status | وضعیت واتساپ |
| GET internal/threads | تردهای چت داخلی |
| GET internal/threads/:id/messages | پیام‌های ترد |
| POST internal/threads/:id/messages | ارسال پیام چت داخلی |
| POST internal/threads | ایجاد ترد جدید |
| GET internal/users | لیست کاربران برای چت |

## پشتیبانی RTL

اپ به‌طور کامل از راست‌به‌چپ (فارسی) پشتیبانی می‌کند.

---

© صرافی کایا

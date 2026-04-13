# اپ اندروید — پورتال کارکنان (کلاینت رسمی CRM)

این اپ **کلاینت اختصاصی** همان سامانهٔ وب است؛ **نام سازمان، لوگوی ورود، لینک‌های نصب موبایل** و بخشی از هویت بصری از **تنظیمات پنل** (مسیر وب: **ظاهر پنل** / `#panel-settings`، API: `GET /api/panel-settings/public/branding`) خوانده می‌شود — بدون نیاز به بیلد مجدد APK برای تغییر عنوان سایت.

---

## ساختار پوشه‌ها (ماژول `app`)

```
app/src/main/java/com/kaya/crm/
├── data/              # API (Retrofit)، مدل‌ها، Repository، DataStore، شبکه
├── di/                # Hilt
├── media/             # ضبط صدا و …
├── update/            # به‌روزرسانی درون‌برنامه‌ای APK
├── ui/
│   ├── auth/          # ورود، TOTP، فراموشی رمز
│   ├── main/          # داشبورد، مکالمات، مشتریان، تیکت، چت داخلی، پروفایل
│   ├── theme/         # Material 3
│   └── util/          # ابزارهای UI (مثلاً حل URL فایل/لوگو)
├── MainActivity.kt
└── KayaCrmApp.kt      # کلاس Application (@HiltAndroidApp)
```

`AndroidManifest` برچسب لانچر را از `res/values/strings.xml` می‌گیرد (**نام کوتاه عمومی**). **عنوان کامل سازمان** در صفحهٔ ورود و هدر اصلی از API برندینگ پر می‌شود.

---

## پیش‌نیازها

- **Android Studio** Hedgehog یا جدیدتر — https://developer.android.com/studio  
- **JDK 17** (ترجیحاً همان **JBR** داخل Android Studio)  
- **minSdk** 26، **compileSdk / targetSdk** مطابق `app/build.gradle.kts` (فعلی: 36)

---

## نصب توسعه‌دهنده و اجرا

1. در Android Studio: **File → Open** → پوشه **`android-app`**
2. پس از sync، **Run → Run 'app'**
3. **آدرس سرور:** پیش‌فرض در `BuildConfig.API_BASE_URL` است؛ برای سرور دیگر از **آیکن چرخ‌دنده** روی صفحهٔ ورود آدرس پایه را ذخیره کنید و **یک‌بار اپ را ببندید و دوباره باز کنید** تا Retrofit با `baseUrl` جدید ساخته شود.

جزئیات فنی آدرس API: `app/src/main/java/com/kaya/crm/data/ApiConfig.kt` و `di/AppModule.kt`.

---

## ساخت APK

### Android Studio

**Build → Build Bundle(s) / APK(s) → Build APK(s)**  
خروجی معمول:

- دیباگ: `app/build/outputs/apk/debug/app-debug.apk`
- ریلیز: `app/build/outputs/apk/release/app-release.apk` (نیاز به امضا طبق `signingConfigs` در `build.gradle.kts`)

### خط فرمان (Windows)

متغیر **`JAVA_HOME`** باید به JDK 17 اشاره کند (مثلاً `C:\Program Files\Android\Android Studio\jbr`):

```powershell
cd android-app
.\gradlew.bat assembleDebug
```

### اسکریپت

در صورت وجود، `build-apk.bat` در همین پوشه.

---

## ویژگی‌های اصلی

- **Splash Screen** استاندارد (Android 12+ با سازگاری عقب‌گرد)
- ورود امن + **TOTP**
- **برندینگ پویا** از API (عنوان ورود، لوگو، بارگذاری/تازه‌سازی ظاهر، لینک‌های iOS/Android در پروفایل)
- **دسترسی‌پذیری**: توضیح برای TalkBack روی دکمه ورود، آیکن‌ها و فیلدها؛ **نمایش/مخفی رمز**؛ **imePadding** برای کیبورد
- **StrictMode** (فقط Debug) برای تشخیص زودهنگام مشکلات دیسک/منابع
- **رشته‌های انگلیسی** (`values-en/`) برای کاربران با زبان دستگاه English
- تنظیم آدرس سرور از ورود / پروفایل
- وضعیت شبکه، تلاش مجدد شبکه
- مکالمات، چت داخلی، داشبورد، مشتریان، تیکت‌ها، تسک‌ها، پروفایل

---

## APIهای پرکاربرد (نسبت به `/api/`)

| مسیر | کاربرد |
|------|--------|
| `GET panel-settings/public/branding` | نام سایت، لوگو، لینک اپ‌ها |
| `GET panel-settings/public/visibility` | بخش‌های مخفی منو |
| `POST auth/login` | ورود |
| `POST auth/totp/verify-login` | تأیید TOTP |
| `GET auth/me` | پروفایل |

لیست کامل‌تر در `ApiService.kt`.

---

## RTL

رابط کاربری برای **فارسی (RTL)** تنظیم شده است.

---

## مستندات مخزن

استانداردهای کل monorepo: **`../docs/PROJECT-STANDARDS.md`**  
راهنمای کوتاه برای ابزارها و مشارکت‌کنندگان: **`../AGENTS.md`**

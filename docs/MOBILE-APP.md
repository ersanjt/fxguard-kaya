# اپ کارکنان Kaya — نقشه راه و معماری

> **مالک:** Ersan Jahed Tabrizi — `docs/AUTHOR.md`  
> **ناوبری:** `docs/CODEBASE-MAP.md` · **توکن‌های UI:** `mobile-shared/design-tokens.json`

اپ موبایل **پورتال کارکنان** است (نه اپ مشتری). همان حساب وب، همان API، همان برندینگ پنل.

```
iOS (SwiftUI)  ─┐
                ├─ mobile-shared (توکن رنگ/فاصله + قرارداد API)
Android (Compose)┘
         │  HTTPS + Bearer JWT + Socket.IO
         ▼
backend /api  (پورت پیش‌فرض 3202 — production: https://kaya.fxguard.io)
```

هر دو کلاینت **یک معماری** دارند:

| لایه | Android | iOS | نقش |
|------|---------|-----|-----|
| UI | `ui/` Compose | `Features/` SwiftUI | صفحه، تم، i18n |
| Domain/state | ViewModel | `ObservableObject` | وضعیت صفحه |
| Data | `data/` | `Core/` + `Data/` | HTTP، مدل، نشست |
| Session | `SessionStore` | `SessionStore` | JWT در ذخیرهٔ امن، URL سرور، زبان |

## محصول فاز ۱ (همین «نسخهٔ نهایی قابل نصب»)

کارمند اپ را نصب می‌کند، سرور را می‌بیند (پیش‌فرض production)، وارد می‌شود، و کار روزمره را روی موبایل انجام می‌دهد.

| صفحه | کار |
|------|-----|
| ورود | ایمیل/نام کاربری + رمز — UI هم‌تراز `/login` |
| TOTP | کد ۶ رقمی در صورت فعال بودن ۲FA |
| شِل | هدر و تب پایین مثل وب موبایل: داشبورد / مکالمات / مشتریان / اعلان‌ها / بیشتر |
| داشبورد | آمار کلیدی از API، دکمه‌های سریع، کارت‌های بخش‌های پنل مثل وب موبایل؛ صفحهٔ ورودها و وضعیت آنلاین؛ فهرست کاربران با پیام داخلی |
| مکالمات | اینباکس واتساپ مثل وب موبایل: عنوان+رفرش، جستجو، فیلترهای سریع، FAB مکالمه جدید |
| مشتریان | لیست مثل وب موبایل: جستجو، فیلتر فعال/آرشیو، کارت + ارسال، FAB افزودن؛ جزئیات با تاریخچه و شروع چت |
| چت | داخل شِل (هدر مکالمات + تب پایین): ویس، فایل، ایموجی/استیکر/GIF، تماس صوتی/تصویری، پخش ویس با شکل‌موج و سرعت |
| بیشتر | تیکت‌های داخلی، وظایف، چت داخلی با FAB گفتگوی جدید و فهرست همکاران، پروفایل، خروج |
| پروفایل | کارت هویت، اطلاعات فقط‌خواندنی، زبان، سرور، خروج |
| نوتیفیکیشن (اندروید) | بنر هدآپ مثل واتساپ (صدا + لرزش + MessagingStyle) حتی اگر اپ باز باشد، مگر همان گفتگو روی صفحه باشد؛ سرویس پیش‌زمینه سوکت را زنده نگه می‌دارد. اپ کاملاً بسته: Firebase (پایین). |

برندینگ از `GET /api/panel-settings/public/branding` خوانده می‌شود — نام سازمان در UI هاردکد نیست.

### پوش FCM (اپ بسته)

1. در Firebase یک پروژه بسازید، اپ اندروید `io.fxguard.kaya.staff` را اضافه کنید، `google-services.json` را در `android-app/app/` بگذارید (نمونه: `google-services.json.example`).
2. SHA-1 کلید امضا را در Firebase ثبت کنید.
3. سرویس‌اکانت Firebase را روی سرور بگذارید: `FIREBASE_SERVICE_ACCOUNT_JSON` یا `FIREBASE_SERVICE_ACCOUNT_PATH` در `backend/.env`.
4. APK/AAB جدید بسازید، روی سرور بک‌اند را ری‌استارت کنید، از اپ خارج شوید و دوباره وارد شوید و اجازهٔ اعلان را بدهید.
5. در اپ: **بیشتر → پروفایل → ارسال اعلان آزمایشی**. اگر `no_firebase` آمد سرویس‌اکانت روی سرور نیست؛ اگر `no_token` آمد `google-services.json` در بیلد نیست یا SHA-1 در Firebase ثبت نشده.

بدون Firebase، تا وقتی اپ در پس‌زمینه کشته نشده باشد اعلان محلی کار می‌کند. iOS هنوز APNs ندارد.

## فازهای بعدی

| فاز | محتوا |
|-----|--------|
| **۲** | پوش iOS (APNs)، تنظیمات گفتگو داخل اپ |
| **۳** | اعلان سازمانی کامل‌تر، پیوست چت داخلی |
| **۴** | انتشار فروشگاهی: `docs/STORE-RELEASE.md` (Play AAB + App Store / TestFlight، امضا، listing) |

## ساخت

**اندروید (ویندوز/لینوکس/مک):** JDK 17 + Android SDK

```bash
cd android-app
./gradlew :app:assembleDebug
./gradlew :app:bundleRelease   # Play AAB — نیاز به keystore.properties
```

خروجی debug: `android-app/app/build/outputs/apk/debug/app-debug.apk`  
خروجی Play: `android-app/app/build/outputs/bundle/release/app-release.aab`

**iOS (فقط macOS + Xcode):** پروژه `ios-app/KayaStaff.xcodeproj` را باز کنید، Team را برای Signing بگذارید، روی دستگاه یا شبیه‌ساز Run کنید. انتشار: `docs/STORE-RELEASE.md`.

## امنیت

- توکن JWT در **EncryptedSharedPreferences** (اندروید) و **Keychain** (iOS)
- همهٔ درخواست‌های محافظت‌شده با `Authorization: Bearer`
- کوکی وب لازم نیست؛ بک‌اند از قبل Bearer را می‌پذیرد (`middleware/auth.js`)
- آدرس سرور قابل تنظیم است (white-label / محیط لوکال)

*آخرین به‌روزرسانی: اوت ۲۰۲۶ — Ersan Jahed Tabrizi*

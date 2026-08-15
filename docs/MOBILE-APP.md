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
| مکالمات | اینباکس واتساپ، جستجو، خوانده‌نشده |
| چت | تاریخچه + ارسال متن + تازه‌سازی زنده |
| مشتریان | فهرست و جستجو |
| تیکت‌ها | فهرست وضعیت/اولویت |
| پروفایل | نام، نقش، زبان، آدرس سرور، خروج |

برندینگ از `GET /api/panel-settings/public/branding` خوانده می‌شود — نام سازمان در UI هاردکد نیست.

## فازهای بعدی

| فاز | محتوا |
|-----|--------|
| **۲** | رسانه/ویس، پوش نوتیفیکیشن، علامت خوانده‌شدن لحظه‌ای قوی‌تر |
| **۳** | وظایف، چت داخلی، اعلان سازمانی |
| **۴** | TestFlight + Play Internal، امضای فروشگاهی، deep link از پنل |

## ساخت

**اندروید (ویندوز/لینوکس/مک):** JDK 17 + Android SDK

```bash
cd android-app
./gradlew :app:assembleDebug
```

خروجی: `android-app/app/build/outputs/apk/debug/app-debug.apk`

**iOS (فقط macOS + Xcode):** پروژه `ios-app/KayaStaff.xcodeproj` را باز کنید، Team را برای Signing بگذارید، روی دستگاه یا شبیه‌ساز Run کنید.

## امنیت

- توکن JWT در **EncryptedSharedPreferences** (اندروید) و **Keychain** (iOS)
- همهٔ درخواست‌های محافظت‌شده با `Authorization: Bearer`
- کوکی وب لازم نیست؛ بک‌اند از قبل Bearer را می‌پذیرد (`middleware/auth.js`)
- آدرس سرور قابل تنظیم است (white-label / محیط لوکال)

*آخرین به‌روزرسانی: اوت ۲۰۲۶ — Ersan Jahed Tabrizi*

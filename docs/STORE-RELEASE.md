# انتشار فروشگاهی Kaya Staff (Google Play + App Store)

> **مالک:** Ersan Jahed Tabrizi · `docs/AUTHOR.md`  
> **اپ:** `io.fxguard.kaya.staff` · نسخهٔ ۱.۰.۰ (versionCode / CFBundleVersion = 1)  
> **سیاست حریم خصوصی (الزامی فروشگاه):** https://kaya.fxguard.io/privacy

اپ کارکنان است، نه پیام‌رسان مصرف‌کننده. روی فروشگاه عمومی می‌ماند چون بدون حساب کارکنان فقط صفحهٔ ورود دیده می‌شود. بازبین‌های اپل و گوگل **حتماً** حساب دمو می‌خواهند (`store/REVIEWER-ACCOUNT.example.txt`).

## چیزی که از قبل در مخزن آماده است

| مورد | مسیر |
|------|------|
| متن Play (en / fa / tr) | `android-app/fastlane/metadata/android/` |
| متن App Store (en / fa / tr) | `ios-app/fastlane/metadata/` |
| Data safety / رده سنی Play | `store/play/` |
| یادداشت بازبینی اپل | `ios-app/fastlane/metadata/review_information/` |
| حریم خصوصی / شرایط / حذف حساب | `/privacy` `/terms` `/account-deletion` روی سرور |
| بنر Play ۱۰۲۴×۵۰۰ | `store/play/images/featureGraphic.png` |
| آیکون ۵۱۲ Play | `store/play/images/icon-512.png` |

## کارهایی که فقط انسان + حساب دولوپر می‌تواند بکند

هیچ عاملی نمی‌تواند به‌جای شما این‌ها را تمام کند:

1. **Google Play Console** — ثبت‌نام با حساب گوگل، پرداخت یک‌بار ۲۵ دلار، احراز هویت.
2. **Apple Developer Program** — عضویت سالانه ۹۹ دلار، Apple ID با ۲FA، احراز هویت. بیلد iOS **فقط روی مک + Xcode**.
3. **حساب دمو برای بازبین** — یک کاربر محدود روی https://kaya.fxguard.io (بدون ادمین).
4. **تأیید نهایی Publish** در کنسول پس از رد/قبول ریویو (۱ تا ۷ روز).

بعد از اینکه JSON سرویس‌اکانت Play و کلید API اپل را بگذارید، آپلود با Fastlane انجام می‌شود.

---

## گوگل پلی (ویندوز همین مخزن)

### ۱. کلید امضا (یک‌بار؛ بکاپ اجباری)

```powershell
powershell -File android-app/scripts/create-play-upload-keystore.ps1
```

خروجی gitignore شده:

- `android-app/keystore/kaya-staff-upload.jks`
- `android-app/keystore.properties`

اگر این فایل‌ها گم شوند، **نمی‌توانید آپدیت روی همان اپ Play بفرستید**. یک کپی آفلاین (پسوردمنجر / گاوصندوق) بگیرید.

### ۲. ساخت App Bundle

```powershell
cd android-app
.\gradlew.bat :app:bundleRelease
```

خروجی: `android-app/app/build/outputs/bundle/release/app-release.aab`

### ۳. کنسول (اولین اپ)

1. [Play Console](https://play.google.com/console) → Create app → نام **Kaya Staff**، زبان پیش‌فرض English (United States)، App or game: App، Free، declarations.
2. Package name باید دقیقاً `io.fxguard.kaya.staff` باشد (از AAB خوانده می‌شود).
3. Store listing: متن‌های `fastlane/metadata/android/` را پیست کنید. کشورها: همه (Worldwide).
4. Graphics: `store/play/images/icon-512.png` و `featureGraphic.png` + حداقل **چهار** اسکرین‌شات گوشی (۹:۱۶، مثلاً ۱۰۸۰×۲۴۰۰). اسکرین واقعی UI اپ را بگیرید؛ بنر تبلیغاتی به‌جای اسکرین قبول نمی‌شود.
   **هرگز** از حساب production با مشتری/شماره/عکس واقعی اسکرین نگیرید. از بیلد debug صفحهٔ `StorePreviewActivity` با دادهٔ ساختگی استفاده کنید:

   ```powershell
   cd android-app
   .\gradlew.bat :app:assembleDebug
   adb install -r app\build\outputs\apk\debug\app-debug.apk
   powershell -File scripts\capture-store-screens.ps1
   ```
5. App content: Data safety از `store/play/data-safety.md`، رده از `store/play/content-rating.md`، Privacy policy = `https://kaya.fxguard.io/privacy`، App access = حساب دمو.
6. Production → Create release → AAB را آپلود کنید → Countries/regions همه → Review → **Start rollout to Production**.

### ۴. آپلود بعدی با Fastlane (اختیاری)

سرویس‌اکانت Play با نقش Release to production / View app information:

```
android-app/fastlane/play-service-account.json   # gitignore
cd android-app
fastlane android internal     # ترک Internal، وضعیت draft
fastlane android production   # ترک Production، وضعیت draft
```

اولین انتشار را دستی در کنسول تأیید کنید تا فرم‌های Data safety کامل باشند.

---

## اپ استور (فقط macOS)

1. [Apple Developer](https://developer.apple.com/programs/) → عضویت.
2. [App Store Connect](https://appstoreconnect.apple.com) → New App → Bundle ID `io.fxguard.kaya.staff` (ابتدا در Certificates, Identifiers & Profiles بسازید).
3. Xcode: Team را روی `ios-app/KayaStaff.xcodeproj` بگذارید (Signing Automatic).
4. Product → Archive → Distribute App → App Store Connect.
   یا روی مک: `cd ios-app && fastlane ios build && fastlane ios beta`
5. Listing: متن `ios-app/fastlane/metadata/`، Privacy Policy URL، دسته Business، اسکرین آیفون ۶.۷" و ۶.۵" (حداقل).
6. App Privacy: با `PrivacyInfo.xcprivacy` هم‌خوان (User ID، Email، Other User Content — linked، not used for tracking).
7. App Review Information: حساب دمو + یادداشت `review_information/notes.txt`.
8. Pricing: Free · Availability: all countries. Submit for Review.

Export compliance: HTTPS استاندارد — `ITSAppUsesNonExemptEncryption = false`.

---

## بعد از ریویو

- لینک پلی: `https://play.google.com/store/apps/details?id=io.fxguard.kaya.staff`
- لینک اپ استور: پس از اختصاص Apple ID عددی در Connect.

صفحات قانونی باید روی production دیپلوی شده باشند (`/privacy`). بدون آن ریویو استور fail می‌شود.

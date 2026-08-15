# Kaya Staff — Android

اپ کارکنان با **Jetpack Compose**. همان API و همان UI توکن‌های ورود وب (`mobile-shared/design-tokens.json`).

## ساخت

نیاز: JDK 17، Android SDK.

```bash
cd android-app
# اگر gradle-wrapper.jar نبود:
powershell -File scripts/bootstrap-wrapper.ps1
./gradlew :app:assembleDebug
```

یا پروژه را در Android Studio باز کنید تا Wrapper ساخته شود.

APK: `app/build/outputs/apk/debug/app-debug.apk`

روی امولاتور، آدرس سرور لوکال را در صفحه ورود روی `http://10.0.2.2:3202` بگذارید. پیش‌فرض production: `https://kaya.fxguard.io`.

## معماری

`ui/` صفحه‌ها · `data/` HTTP و مدل · `di/AppGraph` ریشهٔ وابستگی · نشست JWT در EncryptedSharedPreferences.

# Kaya Staff — iOS

اپ کارکنان با **SwiftUI**. همان قرارداد API و همان توکن‌های UI که اندروید استفاده می‌کند.

## ساخت

فقط روی **macOS + Xcode 15+**:

1. `ios-app/KayaStaff.xcodeproj` را باز کنید.
2. Signing Team را برای Apple ID خود انتخاب کنید.
3. Run روی آیفون یا Simulator.

Bundle ID: `io.fxguard.kaya.staff`  
حداقل iOS: **17**

پیش‌فرض سرور: `https://kaya.fxguard.io` — از صفحه ورود یا پروفایل قابل تغییر است.

## معماری

`Features/` صفحه‌ها · `Core/` HTTP، Keychain، i18n · `Data/Models` · `StaffAppModel` معادل ViewModel اندروید.

/**
 * Kaya CRM — fa / en / tr
 * @file    ios-app/KayaStaff/Core/L10n.swift
 * @layer   ios
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     backend/public/js/login.js
 */
import Foundation

enum L10n {
    private static let fa: [String: String] = [
        "login_title": "پورتال کارکنان",
        "login_sub": "ورود به پورتال از سراسر دنیا",
        "login_email": "ایمیل یا نام کاربری",
        "login_pass": "رمز عبور",
        "login_btn": "ورود به سیستم",
        "login_loading": "در حال ورود...",
        "forgot": "فراموشی رمز عبور",
        "server": "آدرس سرور",
        "totp_title": "احراز هویت دو مرحله‌ای",
        "totp_sub": "کد شش‌رقمی اپلیکیشن Authenticator را وارد کنید.",
        "totp_btn": "تأیید و ورود",
        "back": "بازگشت",
        "inbox": "مکالمات",
        "customers": "مشتریان",
        "tickets": "تیکت‌ها",
        "profile": "پروفایل",
        "search": "جستجو",
        "send": "ارسال",
        "message_ph": "پیام خود را بنویسید…",
        "logout": "خروج از حساب",
        "language": "زبان",
        "empty_inbox": "مکالمه‌ای نیست",
        "empty_customers": "مشتری‌ای یافت نشد",
        "empty_tickets": "تیکتی نیست",
        "unread": "خوانده‌نشده",
        "role": "نقش",
        "save_server": "ذخیره آدرس سرور",
        "forgot_ok": "اگر حساب وجود داشته باشد، لینک بازیابی ارسال شد.",
        "forgot_send": "ارسال لینک بازیابی",
        "connect_fail": "اتصال به سرور برقرار نشد.",
        "required": "این فیلد الزامی است",
    ]

    private static let en: [String: String] = [
        "login_title": "Staff Portal",
        "login_sub": "Sign in to the portal from anywhere",
        "login_email": "Email or username",
        "login_pass": "Password",
        "login_btn": "Sign in",
        "login_loading": "Signing in...",
        "forgot": "Forgot password",
        "server": "Server URL",
        "totp_title": "Two-factor authentication",
        "totp_sub": "Enter the 6-digit Authenticator code.",
        "totp_btn": "Verify & sign in",
        "back": "Back",
        "inbox": "Inbox",
        "customers": "Customers",
        "tickets": "Tickets",
        "profile": "Profile",
        "search": "Search",
        "send": "Send",
        "message_ph": "Write a message…",
        "logout": "Sign out",
        "language": "Language",
        "empty_inbox": "No conversations",
        "empty_customers": "No customers found",
        "empty_tickets": "No tickets",
        "unread": "Unread",
        "role": "Role",
        "save_server": "Save server URL",
        "forgot_ok": "If an account exists, a reset link was sent.",
        "forgot_send": "Send reset link",
        "connect_fail": "Could not reach the server.",
        "required": "This field is required",
    ]

    private static let tr: [String: String] = [
        "login_title": "Personel Portalı",
        "login_sub": "Dünyanın her yerinden giriş yapın",
        "login_email": "E-posta veya kullanıcı adı",
        "login_pass": "Şifre",
        "login_btn": "Giriş yap",
        "login_loading": "Giriş yapılıyor...",
        "forgot": "Şifremi unuttum",
        "server": "Sunucu adresi",
        "totp_title": "İki faktörlü doğrulama",
        "totp_sub": "Authenticator uygulamasındaki 6 haneli kodu girin.",
        "totp_btn": "Doğrula ve giriş yap",
        "back": "Geri",
        "inbox": "Sohbetler",
        "customers": "Müşteriler",
        "tickets": "Ticketlar",
        "profile": "Profil",
        "search": "Ara",
        "send": "Gönder",
        "message_ph": "Mesaj yazın…",
        "logout": "Çıkış yap",
        "language": "Dil",
        "empty_inbox": "Sohbet yok",
        "empty_customers": "Müşteri bulunamadı",
        "empty_tickets": "Ticket yok",
        "unread": "Okunmamış",
        "role": "Rol",
        "save_server": "Sunucu adresini kaydet",
        "forgot_ok": "Hesap varsa sıfırlama bağlantısı gönderildi.",
        "forgot_send": "Sıfırlama bağlantısı gönder",
        "connect_fail": "Sunucuya ulaşılamadı.",
        "required": "Bu alan zorunludur",
    ]

    static func t(_ lang: String, _ key: String) -> String {
        let table = lang == "en" ? en : lang == "tr" ? tr : fa
        return table[key] ?? fa[key] ?? key
    }

    static func isRtl(_ lang: String) -> Bool { lang != "en" }
}

/**
 * Kaya CRM — fa / en / tr strings
 * @file    android-app/.../ui/i18n/L10n.kt
 * @layer   android
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     backend/public/js/login.js
 */
package io.fxguard.kaya.ui.i18n

object L10n {
    private val fa = mapOf(
        "login_title" to "پورتال کارکنان",
        "login_sub" to "ورود به پورتال از سراسر دنیا",
        "login_email" to "ایمیل یا نام کاربری",
        "login_pass" to "رمز عبور",
        "login_btn" to "ورود به سیستم",
        "login_loading" to "در حال ورود...",
        "forgot" to "فراموشی رمز عبور",
        "server" to "آدرس سرور",
        "totp_title" to "احراز هویت دو مرحله‌ای",
        "totp_sub" to "کد شش‌رقمی اپلیکیشن Authenticator را وارد کنید.",
        "totp_btn" to "تأیید و ورود",
        "back" to "بازگشت",
        "inbox" to "مکالمات",
        "customers" to "مشتریان",
        "tickets" to "تیکت‌ها",
        "profile" to "پروفایل",
        "search" to "جستجو",
        "send" to "ارسال",
        "message_ph" to "پیام خود را بنویسید…",
        "logout" to "خروج از حساب",
        "language" to "زبان",
        "empty_inbox" to "مکالمه‌ای نیست",
        "empty_customers" to "مشتری‌ای یافت نشد",
        "empty_tickets" to "تیکتی نیست",
        "unread" to "خوانده‌نشده",
        "role" to "نقش",
        "save_server" to "ذخیره آدرس سرور",
        "forgot_ok" to "اگر حساب وجود داشته باشد، لینک بازیابی ارسال شد.",
        "forgot_send" to "ارسال لینک بازیابی",
        "connect_fail" to "اتصال به سرور برقرار نشد.",
        "required" to "این فیلد الزامی است",
    )
    private val en = mapOf(
        "login_title" to "Staff Portal",
        "login_sub" to "Sign in to the portal from anywhere",
        "login_email" to "Email or username",
        "login_pass" to "Password",
        "login_btn" to "Sign in",
        "login_loading" to "Signing in...",
        "forgot" to "Forgot password",
        "server" to "Server URL",
        "totp_title" to "Two-factor authentication",
        "totp_sub" to "Enter the 6-digit Authenticator code.",
        "totp_btn" to "Verify & sign in",
        "back" to "Back",
        "inbox" to "Inbox",
        "customers" to "Customers",
        "tickets" to "Tickets",
        "profile" to "Profile",
        "search" to "Search",
        "send" to "Send",
        "message_ph" to "Write a message…",
        "logout" to "Sign out",
        "language" to "Language",
        "empty_inbox" to "No conversations",
        "empty_customers" to "No customers found",
        "empty_tickets" to "No tickets",
        "unread" to "Unread",
        "role" to "Role",
        "save_server" to "Save server URL",
        "forgot_ok" to "If an account exists, a reset link was sent.",
        "forgot_send" to "Send reset link",
        "connect_fail" to "Could not reach the server.",
        "required" to "This field is required",
    )
    private val tr = mapOf(
        "login_title" to "Personel Portalı",
        "login_sub" to "Dünyanın her yerinden giriş yapın",
        "login_email" to "E-posta veya kullanıcı adı",
        "login_pass" to "Şifre",
        "login_btn" to "Giriş yap",
        "login_loading" to "Giriş yapılıyor...",
        "forgot" to "Şifremi unuttum",
        "server" to "Sunucu adresi",
        "totp_title" to "İki faktörlü doğrulama",
        "totp_sub" to "Authenticator uygulamasındaki 6 haneli kodu girin.",
        "totp_btn" to "Doğrula ve giriş yap",
        "back" to "Geri",
        "inbox" to "Sohbetler",
        "customers" to "Müşteriler",
        "tickets" to "Ticketlar",
        "profile" to "Profil",
        "search" to "Ara",
        "send" to "Gönder",
        "message_ph" to "Mesaj yazın…",
        "logout" to "Çıkış yap",
        "language" to "Dil",
        "empty_inbox" to "Sohbet yok",
        "empty_customers" to "Müşteri bulunamadı",
        "empty_tickets" to "Ticket yok",
        "unread" to "Okunmamış",
        "role" to "Rol",
        "save_server" to "Sunucu adresini kaydet",
        "forgot_ok" to "Hesap varsa sıfırlama bağlantısı gönderildi.",
        "forgot_send" to "Sıfırlama bağlantısı gönder",
        "connect_fail" to "Sunucuya ulaşılamadı.",
        "required" to "Bu alan zorunludur",
    )

    fun t(lang: String, key: String): String {
        val table = when (lang) {
            "en" -> en
            "tr" -> tr
            else -> fa
        }
        return table[key] ?: fa[key] ?: key
    }

    fun isRtl(lang: String): Boolean = lang != "en"
}

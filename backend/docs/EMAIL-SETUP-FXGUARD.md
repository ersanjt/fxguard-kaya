# راه‌اندازی ایمیل fxguard.io (cPanel / GoDaddy SecureServer)

این راهنما برای دامنه **fxguard.io** است. DKIM، SPF، DMARC و PTR شما قبلاً تأیید شده‌اند.

---

## دو نوع سرویس ایمیل

### الف) cPanel (هاستینگ وب با ایمیل)

اگر ایمیل‌ها را در **cPanel → Email Accounts** ساخته‌اید:

| پارامتر | مقدار |
|---------|-------|
| **Host** | `mail.fxguard.io` یا `smtpout.secureserver.net` یا `143.182.205.92.host.secureserver.net` (Mail HELO) |
| **Port** | `587` (بدون SSL) یا `465` (با SSL ✓) |
| **Username** | `noreply@fxguard.io` |
| **Password** | رمز عبور ایمیل در cPanel |

### ب) GoDaddy Email & Office

اگر ایمیل‌ها را در **GoDaddy → Email & Office** ساخته‌اید:

| پارامتر | مقدار |
|---------|-------|
| **Host** | `smtpout.secureserver.net` |
| **Port** | `587` (بدون SSL) یا `465` (با SSL ✓) |
| **Username** | `noreply@fxguard.io` |
| **Password** | رمز عبور ایمیل در GoDaddy |

> **نکته:** پورت **۴۶۵** حتماً باید با گزینه SSL/TLS فعال باشد. پورت **۵۸۷** بدون SSL.

---

## روش ۱: تنظیم از داخل پنل

1. وارد پنل شوید → **تنظیمات** → تب **ایمیل**
2. مقادیر زیر را وارد کنید (برای cPanel):

```
Host:     mail.fxguard.io
Port:     587
نام کاربری: noreply@fxguard.io
رمز عبور: [رمز ایمیل noreply]
From:     noreply@fxguard.io
نام فرستنده: پورتال کارکنان
SSL/TLS:  خالی (برای پورت ۵۸۷)
```

3. **ذخیره** کنید و با دکمه **«ارسال تست»** یک ایمیل آزمایشی بفرستید.

---

## روش ۲: تنظیم از طریق `.env`

در فایل `backend/.env`:

**cPanel:**
```env
SMTP_HOST=mail.fxguard.io
SMTP_PORT=587
SMTP_USER=noreply@fxguard.io
SMTP_PASS=your_email_password_here
SMTP_FROM=noreply@fxguard.io
SMTP_FROM_NAME=پورتال کارکنان
SMTP_SECURE=false
EMAIL_LOGIN_NOTIFICATION=false
```

**GoDaddy Email & Office:**
```env
SMTP_HOST=smtpout.secureserver.net
SMTP_PORT=587
SMTP_USER=noreply@fxguard.io
SMTP_PASS=your_email_password_here
SMTP_FROM=noreply@fxguard.io
SMTP_FROM_NAME=پورتال کارکنان
SMTP_SECURE=false
EMAIL_LOGIN_NOTIFICATION=false
```

برای پورت **465** (هر دو سرویس):
```env
SMTP_PORT=465
SMTP_SECURE=true
```

---

## ایمیل‌های ارسالی توسط پنل

| نوع | زمان ارسال |
|-----|------------|
| خوش‌آمدگویی | هنگام ایجاد کاربر جدید توسط ادمین |
| بازیابی رمز | هنگام کلیک «فراموشی رمز» در صفحه ورود |
| اعلان ورود | (اختیاری) هر بار ورود کاربر به پنل |

---

## DMARC و گزارش‌ها

دامنه شما DMARC با `rua=mailto:dmarc_rua@onsecureserver.net` دارد. گزارش‌ها به GoDaddy ارسال می‌شوند. نیازی به تغییر نیست.

---

## عیب‌یابی

- **ارسال ایمیل ناموفق / Host، پورت و احراز هویت:**  
  - **cPanel:** Host را `mail.fxguard.io` بگذارید. پورت ۴۶۵ → SSL فعال ✓؛ پورت ۵۸۷ → SSL خالی. اگر `mail.fxguard.io` کار نکرد، در cPanel → Email Deliverability آدرس SMTP سرور را ببینید.  
  - **GoDaddy Email:** Host را `smtpout.secureserver.net` بگذارید. SMTP Authentication را در Email & Office → Manage → Settings فعال کنید.
- **خطای احراز هویت:** رمز عبور ایمیل را دقیقاً همان‌طور که در cPanel یا GoDaddy تنظیم کرده‌اید وارد کنید.
- **ایمیل در اسپم:** DKIM/SPF/PTR شما تأیید شده‌اند. محتوای ایمیل را کم‌حجم و بدون لینک مشکوک نگه دارید.
- **پورت بسته:** اگر ۵۸۷ کار نکرد، پورت ۴۶۵ را با SSL فعال امتحان کنید.

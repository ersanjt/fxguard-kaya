# راه‌اندازی ایمیل fxguard.io (GoDaddy SecureServer)

این راهنما برای دامنه **fxguard.io** با سرویس ایمیل GoDaddy SecureServer است. DKIM، SPF، DMARC و PTR شما قبلاً تأیید شده‌اند.

---

## ایمیل‌هایی که باید در GoDaddy ایجاد کنید

در **GoDaddy → Email & Office → Create Email Address** این آدرس‌ها را بسازید:

| ایمیل | کاربرد |
|-------|--------|
| **noreply@fxguard.io** | ایمیل‌های خودکار پنل (خوش‌آمدگویی، بازیابی رمز، اعلان ورود) |
| **support@fxguard.io** | پشتیبانی (صفحه تماس، لینک پشتیبانی در ورود) |
| **sales@fxguard.io** | فروش (صفحه تماس) |

> **نکته:** فقط **noreply@fxguard.io** برای ارسال خودکار پنل الزامی است. support و sales برای تماس دستی با مشتریان است.

---

## تنظیمات SMTP (GoDaddy SecureServer)

| پارامتر | مقدار |
|---------|-------|
| **Host** | `smtpout.secureserver.net` |
| **Port** | `465` (SSL) یا `587` (TLS) |
| **Secure** | برای پورت ۴۶۵: بله ✓ |
| **Username** | آدرس ایمیل کامل (مثلاً `noreply@fxguard.io`) |
| **Password** | رمز عبور ایمیل در GoDaddy |

> **توصیه:** پورت **587** با TLS کمتر بلاک می‌شود. برای ۵۸۷ گزینه Secure را خالی بگذارید.

---

## روش ۱: تنظیم از داخل پنل

1. وارد پنل شوید → **تنظیمات** → تب **ایمیل**
2. مقادیر زیر را وارد کنید:

```
Host:     smtpout.secureserver.net
Port:     587
نام کاربری: noreply@fxguard.io
رمز عبور: [رمز ایمیل noreply در GoDaddy]
From:     noreply@fxguard.io
نام فرستنده: پورتال کارکنان (یا نام دلخواه)
SSL/TLS:  خالی (برای پورت ۵۸۷)
```

3. **ذخیره** کنید و با دکمه **«ارسال تست»** یک ایمیل آزمایشی بفرستید.

---

## روش ۲: تنظیم از طریق `.env`

در فایل `backend/.env`:

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

برای پورت **465**:
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

- **خطای احراز هویت:** در GoDaddy مطمئن شوید SMTP Authentication فعال است (Email & Office → Manage → Settings).
- **ایمیل در اسپم:** DKIM/SPF/PTR شما تأیید شده‌اند. اگر هنوز اسپم می‌شود، محتوای ایمیل را بررسی کنید (کم‌حجم، بدون لینک مشکوک).
- **پورت بسته:** اگر ۵۸۷ کار نکرد، پورت ۴۶۵ را با `SMTP_SECURE=true` امتحان کنید.

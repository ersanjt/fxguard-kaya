# راهنمای DNS و ایمیل fxguard.io

راهنمای جامع برای تنظیمات DNS و ایمیل دامنه **fxguard.io**.

---

## رکوردهای DNS پیشنهادی (Cloudflare / GoDaddy)

### رکوردهای ضروری برای ایمیل

| Type | Name | Content/Value | Proxy | توضیح |
|------|------|---------------|-------|-------|
| **A** | mail | 143.182.205.92 | **DNS only** | سرور ایمیل — حتماً بدون Proxy |
| **MX** | @ | mail.fxguard.io (Priority: 0) | **DNS only** | دریافت ایمیل ورودی |
| **TXT** | @ | v=spf1 a mx ip4:92.205.182.143 ip4:143.182.205.92 ~all | DNS only | SPF — مجاز کردن سرورهای ارسال |
| **TXT** | default._domainkey | (مقدار DKIM از cPanel) | DNS only | DKIM — امضای ایمیل |
| **TXT** | _dmarc | v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:... | DNS only | DMARC — سیاست تحویل |

### رکوردهای وب

| Type | Name | Content | Proxy | توضیح |
|------|------|---------|-------|-------|
| A | @ | 92.205.182.143 | Proxied | دامنه اصلی |
| A | app | 92.205.58.83 | Proxied | پنل/اپلیکیشن |
| CNAME | www | fxguard.io | Proxied | ریدایرکت www |

---

## نکات مهم Cloudflare

1. **mail** و **MX** و رکوردهای **TXT** ایمیل باید **DNS only** باشند (بدون Proxy).
2. **Proxy** برای رکوردهای ایمیل باعث قطع ارسال و دریافت می‌شود.
3. رکورد **PTR** (Reverse DNS) توسط هاستینگ تنظیم می‌شود — در cPanel → Email Deliverability قابل مشاهده است.

---

## چک‌لیست تحویل ایمیل

- [ ] MX → mail.fxguard.io (Priority 0)
- [ ] A برای mail → 143.182.205.92
- [ ] SPF شامل ip4:143.182.205.92
- [ ] DKIM تأیید شده در cPanel
- [ ] DMARC با p=quarantine یا p=none
- [ ] mail و MX روی **DNS only** (در Cloudflare)
- [ ] Host در پنل: `mail.fxguard.io` (بدون نقطه در انتها)

---

## تست و عیب‌یابی

- **[mail-tester.com](https://www.mail-tester.com)** — امتیاز اسپم و DMARC
- **cPanel → Email Deliverability** — وضعیت DKIM, SPF, DMARC, PTR
- **Track Delivery** — لاگ ارسال و تحویل

---

## ساب‌دامین‌های اضافی (در صورت نیاز)

| Name | IP | کاربرد |
|------|-----|--------|
| kaya | 92.205.58.83 | پنل CRM (در صورت استفاده از kaya.fxguard.io) |

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
| A | app | 92.205.58.83 | Proxied | معرفی و فروش (لندینگ) — نه پنل یا اپلیکیشن |
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
| app | 92.205.58.83 | **فقط معرفی و فروش** — لندینگ، نه پنل یا اپلیکیشن |
| kaya | 92.205.58.83 | پنل CRM (در صورت استفاده از kaya.fxguard.io) |

---

## تنظیمات Cloudflare برای WebSocket (Socket.IO)

اگر `kaya.fxguard.io` پشت **Cloudflare Proxy** است و داشبورد از Socket.IO استفاده می‌کند:

1. **Cloudflare → Network → WebSockets** باید **فعال (On)** باشد
2. در **SSL/TLS** حالت **Full (Strict)** استفاده کنید اگر سرور SSL دارد، وگرنه **Full**
3. **Caching Rule**: مسیر `/socket.io/*` را از Cache حذف کنید (Bypass Cache)

### نمونه تنظیم Apache (reverse proxy برای Node.js)

اگر از Apache استفاده می‌کنید (cPanel)، در VirtualHost دامنه `kaya.fxguard.io`:

```apache
# Reverse proxy to Node.js backend
ProxyPreserveHost On
ProxyPass / http://127.0.0.1:3002/
ProxyPassReverse / http://127.0.0.1:3002/

# WebSocket support for Socket.IO
RewriteEngine On
RewriteCond %{HTTP:Upgrade} =websocket [NC]
RewriteRule /socket.io/(.*) ws://127.0.0.1:3002/socket.io/$1 [P,L]
```

### نمونه تنظیم Nginx

```nginx
location / {
    proxy_pass http://127.0.0.1:3002;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 86400;
}
```

### عیب‌یابی خطای 502 Bad Gateway

1. بررسی اجرای بک‌اند: `pm2 status` و `pm2 logs kayaCRM`
2. بررسی پورت: `curl http://127.0.0.1:3002/health`
3. لاگ Apache: `tail -f /var/log/apache2/error.log`
4. اگر Cloudflare 502 می‌دهد: موقتاً Proxy را خاموش کنید (DNS only) و تست کنید

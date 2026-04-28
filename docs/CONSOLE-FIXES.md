# رفع خطاهای Console و Issues

## خطاهای قابل رفع در کد (انجام شده)

1. **Meta tag**: اضافه شدن `mobile-web-app-capable` برای PWA
2. **Mixed Content**: تبدیل خودکار URLهای `http://` به `https://` در فرانت‌اند وقتی صفحه روی HTTPS است؛ استفاده از `X-Forwarded-Proto` در بک‌اند
3. **Autocomplete و aria-label**: اضافه شدن به ورودی‌های کلیدی

## خطاهای نیازمند تنظیم سرور

### 502 Bad Gateway برای socket.io

**علت:** پروکسی معکوس (مثلاً Nginx) درخواست‌های WebSocket را به درستی به بک‌اند فوروارد نمی‌کند.

**راه‌حل:** در تنظیمات Nginx برای سایت، این بلوک را اضافه کنید:

```nginx
location /socket.io/ {
    proxy_pass http://127.0.0.1:3002;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

و مطمئن شوید هدر `X-Forwarded-Proto` به بک‌اند ارسال می‌شود تا پروتکل صحیح (HTTPS) تشخیص داده شود.

### Content Security Policy و eval

**علت:** اگر CSP در سطح سرور یا هاست فعال است، ممکن است socket.io یا کتابخانه‌های دیگر که از `eval` استفاده می‌کنند مسدود شوند.

**راه‌حل:** 
- اگر از Nginx استفاده می‌کنید، هدر CSP را بررسی کنید
- برای socket.io معمولاً نیازی به `unsafe-eval` نیست؛ مطمئن شوید نسخه socket.io به‌روز است
- در صورت نیاز، می‌توانید `script-src` را طوری تنظیم کنید که اسکریپت‌های مورد اعتماد را مجاز کند (بدون استفاده از `unsafe-eval` در صورت امکان)

### BACKEND_PUBLIC_URL

برای جلوگیری از Mixed Content، در `.env` سرور این متغیر را تنظیم کنید:

```
BACKEND_PUBLIC_URL=https://kaya.fxguard.io
```

این باعث می‌شود URLهای رسانه و آپلودها همیشه با HTTPS ساخته شوند.

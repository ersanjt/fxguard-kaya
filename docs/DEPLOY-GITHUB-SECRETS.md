# Secrets برای GitHub Actions (دیپلوی خودکار)

> **قبل از اولین push بعد از این تغییر:** حتماً سه Secret زیر را در GitHub بسازید؛ وگرنه deploy خطا می‌دهد.

بعد از تغییر workflow، **آدرس و نام کاربری SSH دیگر داخل کد نیستند** و باید در GitHub تعریف شوند.

## مسیر

**Repository → Settings → Secrets and variables → Actions → New repository secret**

## متغیرهای لازم

| Name | مثال | توضیح |
|------|------|--------|
| `SSH_PRIVATE_KEY` | کلید خصوصی PEM | همان که قبلاً داشتید |
| `DEPLOY_HOST` | آدرس سرور (IP یا دامنه) | قبلاً در workflow بود |
| `DEPLOY_USER` | نام کاربر SSH | قبلاً در workflow بود |

تا وقتی `DEPLOY_HOST` و `DEPLOY_USER` را نسازید، job دیپلوی خطا می‌دهد.

## بعد از اولین push

یک بار **Actions** را باز کنید؛ اگر deploy قرمز شد، لاگ را ببینید و Secrets را چک کنید.

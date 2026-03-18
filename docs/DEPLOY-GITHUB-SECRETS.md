# Secrets برای GitHub Actions (دیپلوی خودکار)

**وضعیت فعلی workflow:** `host` و `username` SSH دوباره در `deploy.yml` ثابت هستند تا دیپلوی قطع نشود. فقط **`SSH_PRIVATE_KEY`** باید در Secrets باشد.

اگر بخواهی host/user را از repo حذف کنی: در workflow مقدار `host`/`username` را به `${{ secrets.DEPLOY_HOST }}` و `${{ secrets.DEPLOY_USER }}` عوض کن و همان Secrets را در GitHub بساز.

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

# راهنمای تنظیم هوش مصنوعی (OpenAI)

## قابلیت‌ها

1. **مسیریابی هوشمند به دپارتمان** — بر اساس فهم معنایی پیام مشتری، مکالمه به دپارتمان مناسب هدایت می‌شود.
2. **پاسخ خودکار هوش مصنوعی** — وقتی هیچ قانون پاسخ خودکار (کلمات کلیدی) جواب ندهد، AI به پیام مشتری پاسخ می‌دهد.

## نصب

### ۱. کلید API

1. به [platform.openai.com/api-keys](https://platform.openai.com/api-keys) بروید.
2. یک کلید API بسازید.
3. در فایل `backend/.env` اضافه کنید:

```
OPENAI_API_KEY=sk-your-api-key-here
AI_ANSWER_ENABLED=true
```

### ۲. Gateway (برای ارسال پاسخ به واتساپ)

پاسخ AI از طریق Gateway به مشتری ارسال می‌شود. در `backend/.env`:

```
GATEWAY_URL=http://localhost:3001
```

اگر Backend و Gateway روی سرورهای مختلف هستند، آدرس واقعی Gateway را قرار دهید.

### ۳. Migration (برای تنظیمات از پنل)

```bash
cd backend
node scripts/add-ai-columns.js
```

### ۴. مدل (اختیاری)

پیش‌فرض: `gpt-4o-mini`. برای تغییر:

```
OPENAI_MODEL=gpt-4o
```

## ترتیب پردازش پیام ورودی

1. پیام خوش‌آمدگویی (اولین تماس)
2. تخصیص خودکار به دپارتمان و کارمند (با AI یا کلمات کلیدی)
3. قوانین پاسخ خودکار (کلمات کلیدی)
4. **پاسخ AI** — فقط اگر هیچ قانونی جواب ندهد

## غیرفعال کردن

- **از پنل:** تنظیمات واتساپ → پاسخ خودکار هوش مصنوعی → غیرفعال
- **از .env:** `AI_ANSWER_ENABLED=false`

## هزینه

استفاده از OpenAI بر اساس توکن محاسبه می‌شود. مدل `gpt-4o-mini` ارزان‌تر است.

## عیب‌یابی

**AI پاسخ نمی‌دهد؟**

1. **تست API:** `node scripts/test-ai-response.js "سلام"`
2. **چک‌لیست:** `OPENAI_API_KEY`، `AI_ANSWER_ENABLED=true`، `GATEWAY_URL`، چک‌باکس AI در پنل
3. **Gateway:** واتساپ باید متصل باشد (وضعیت سبز)
4. **اعتبار OpenAI:** [platform.openai.com/account/billing](https://platform.openai.com/account/billing)

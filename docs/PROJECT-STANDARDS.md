# استانداردها و ساختار پروژه (Kaya CRM)

## ساختار مخزن (واقعی)

```
kayaCRM/
├── backend/           # API (Express) + داشبورد SPA (public/dashboard.html, public/js/)
├── gateway/           # واتساپ Web.js + اتصال به صف/Redis
├── cpanel-landing/    # لندینگ استاتیک (اختیاری)
├── docs/              # مستندات استقرار، دسترسی ایران، معماری فرانت
├── android-app/ / ios-app/   # کلاینت موبایل (در صورت استفاده)
├── package.json       # اسکریپت‌های یکپارچه از ریشه
└── start-all.ps1 / start-all.sh
```

**نکته:** پنل اصلی داخل `backend/public` است؛ پوشهٔ جدا به نام `frontend` برای اپ اصلی وجود ندارد.

---

## دستورات استاندارد (از ریشهٔ مخزن)

| دستور | توضیح |
|--------|--------|
| `npm run lint` | ESLint روی backend + gateway |
| `npm run lint:fix` | اصلاح خودکار قابل‌اعمال |
| `npm run format` | بررسی فرمت Prettier |
| `npm run format:write` | نوشتن فرمت روی فایل‌ها |
| `npm test` | تست‌های backend (SQLite in-memory) |

معادل فقط backend: `cd backend && npm run lint` و غیره.

---

## قرارداد کد

| موضوع | استاندارد |
|--------|-----------|
| Node | >= 18 |
| Backend JS | CommonJS، `eslint:recommended` + Prettier |
| فرانت داشبورد | اسکریپت کلاسیک؛ ترجمه در `i18n-fa/en/tr.js`؛ جزئیات در `backend/docs/FRONTEND-ARCHITECTURE.md` |
| رشتهٔ کاربر در DOM | `CRM.Utils.escapeHtml` / عدم تزریق خام در `innerHTML` |
| API | `CRM.Api.fetch` بعد از init |

---

## محیط و امنیت

- `.env` را commit نکنید؛ از `backend/.env.example` و `gateway/.env.example` کپی بگیرید.
- اسرار production فقط روی سرور یا Secret Manager.

---

## CI

GitHub Actions: `.github/workflows/ci.yml` — lint backend/gateway و `npm test` روی backend.

## فهرست مستندات

[README.md](README.md) — فهرست همهٔ مستندات این پوشه

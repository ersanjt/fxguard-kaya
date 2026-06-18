# استانداردها و ساختار پروژه (fxguard-kaya)

> **ناوبری سریع (انسان + AI):** [`CODEBASE-MAP.md`](CODEBASE-MAP.md) · **مالکیت:** [`AUTHOR.md`](AUTHOR.md)

این سند **قرارداد مهندسی** مخزن را مشخص می‌کند تا چیدمان، ابزارها و سبک کد با الگوهای رایج صنعتی (Open Source / Enterprise) هم‌راستا باشد.

---

## ساختار مخزن (واقعی — به‌روز)

```
fxguard-kaya/
├── backend/              # API (Express + Sequelize)، داشبورد کلاسیک (public/)، خروجی Vite در public/js/app/
├── frontend/             # داشبورد مدرن (Vite + ES modules) — `npm run build` → backend/public/js/app/
├── gateway/              # سرویس واتساپ (whatsapp-web.js، Redis، صف)
├── android-app/          # اپ اندروید (Kotlin، Jetpack Compose، Hilt، Retrofit)
├── ios-app/              # اپ iOS (Swift)
├── docs/                 # مستندات استقرار، امنیت، معماری
├── docker-compose*.yml   # اجرای محلی / سرور
├── package.json          # اسکریپت‌های یکپارچه از ریشه (lint، test، build داشبورد)
├── .editorconfig         # یکسان‌سازی charset، فاصله، EOL در همه ادیتورها
└── start-all.ps1 / start-all.sh
```

**پنل وب:** بخش اصلی همچنان از `backend/public` سرو می‌شود؛ ماژول **`frontend/`** برای توسعهٔ تدریجی با **Vite** است و خروجی production به مسیر ثابت داخل `backend/public/js/app/` می‌رود.

---

## مراجع بین‌المللی (الگو، نه الزام حرف‌به‌حرف)

| حوزه | مرجع |
|------|--------|
| Git / branch / commit | [Conventional Commits](https://www.conventionalcommits.org/)، PR کوچک و قابل بازبینی |
| Node / API | [Express.js best practices](https://expressjs.com/en/advanced/best-practice-security.html)، جداسازی route / service / model |
| امنیت وب | [OWASP ASVS](https://github.com/OWASP/ASVS) (سطح مناسب پروژه) |
| اندروید UI | [Jetpack Compose](https://developer.android.com/jetpack/compose)، [Architecture Guidelines](https://developer.android.com/topic/architecture) |
| Kotlin | [Kotlin Coding Conventions](https://kotlinlang.org/docs/coding-conventions.html) |
| فرمت فایل | [EditorConfig](https://editorconfig.org/) — فایل ریشه `.editorconfig` |

---

## دستورات استاندارد (از ریشهٔ مخزن)

| دستور | توضیح |
|--------|--------|
| `npm run quality` | **یک دروازهٔ کیفیت:** `lint` (backend + gateway) + `test` (backend) + `dashboard:build` (Vite) |
| `npm run lint` | ESLint روی `backend` و `gateway` |
| `npm run lint:fix` | اصلاح خودکار ESLint (جایی که امکان‌پذیر است) |
| `npm run format` / `format:write` | Prettier — backend و gateway (جداگانه از ریشه با `--prefix`) |
| `npm test` | تست‌های اصلی backend (SQLite in-process) |
| `npm run test:all` | همان تست‌ها + تست‌های integration سبک |

**اندروید (لوکال):** JDK 17+، سپس داخل `android-app/` اجرای `./gradlew lintDebug assembleDebug` (در CI نیز lint/compile اجرا می‌شود).

معادل per-package: `cd backend && npm run lint` و غیره.

---

## قرارداد کد — Node (backend / gateway)

| موضوع | استاندارد |
|--------|-----------|
| Runtime | Node **>= 18** (ترجیحاً 20 LTS در CI) |
| ماژول | **CommonJS** (`require` / `module.exports`) در backend فعلی؛ یکپارچگی با ESLint |
| سبک | `eslint:recommended` + **Prettier** (`.prettierrc` در ریشه و backend/gateway) |
| نام‌گذاری | فایل route: `camelCase.js` یا الگوی موجود مخزن؛ ثبات با فایل‌های مجاور مهم‌تر از rename گسترده است |
| لاگ | **Winston** (یا لایهٔ لاگ پروژه)؛ از `console.log` در مسیرهای حساس production پرهیز |
| تست | `tests/` — قبل از merge اجرای `npm run test:all` در backend توصیه می‌شود |

---

## قرارداد کد — اپ اندروید (`android-app`)

| لایه | مسیر نمونه | نقش |
|------|-------------|-----|
| UI | `app/.../ui/` | Compose Screens، theme، کامپوننت‌های مشترک |
| Data | `app/.../data/` | `api/`، `models/`، `repository/`، `preferences/`، `network/` |
| DI | `app/.../di/` | ماژول‌های Hilt |
| Root | `MainActivity.kt`، `KayaCrmApp.kt` (Application) | نقطهٔ ورود |

- **وابستگی‌ها:** Retrofit + OkHttp، Gson، Hilt با **KSP** (نه kapt).
- **شبکه:** اینترسپتور احراز هویت؛ در release لاگ بدنهٔ HTTP خاموش است (`BuildConfig.DEBUG`).
- **Lint:** اجرای `lintDebug` در CI؛ خطاهای Lint نباید بدون دلیل نادیده گرفته شوند.
- **سبک رسمی Kotlin:** در `android-app/gradle.properties` مقدار `kotlin.code.style=official` فعال است (هم‌خوان با [قرارداد رسمی JetBrains](https://kotlinlang.org/docs/coding-conventions.html)).
- **برندینگ سفارشی (white-label):** اپ اندروید **نام و لوگوی سازمان** را از API عمومی **`GET /api/panel-settings/public/branding`** می‌خواند (همان داده‌ای که در پنل وب از مسیر **ظاهر پنل** / `#panel-settings` تنظیم می‌شود). برچسب کوتاه نصب (لانچر) در `res/values/strings.xml` به‌صورت عمومی نگه داشته می‌شود تا وابستگی به یک نام ثابت تجاری در سطح OS کم باشد.

---

## قرارداد کد — داشبورد Vite (`frontend/`)

- ساختار ماژول ES؛ خروجی به `backend/public/js/app/` (مسیر در `vite.config.js`).
- قبل از merge: `npm run dashboard:build` از ریشه یا `npm run build` داخل `frontend/`.

---

## امنیت و محیط

- فایل **`.env`** را commit نکنید؛ از `backend/.env.example` و `gateway/.env.example` کپی بگیرید.
- اسرار production فقط روی سرور یا Secret Manager / GitHub Secrets.
- رشتهٔ کاربر در DOM داشبورد کلاسیک: الگوی موجود (`CRM.Utils.escapeHtml` و غیره) — بدون تزریق خام در `innerHTML`.

---

## CI (GitHub Actions)

Workflow: `.github/workflows/ci.yml`

- **backend:** `npm ci` → `lint` → `test:all`
- **gateway:** `npm ci` → `lint` → `format` (بررسی Prettier)
- **dashboard:** `npm ci` در `frontend/` → `build`
- **android:** JDK 17 + Android SDK setup → `lintDebug` + `assembleDebug`

---

## چک‌لیست قبل از Merge (خلاصه)

1. `npm run quality` از ریشه (یا معادل دستی همان مراحل).
2. برای تغییرات اندروید: `./gradlew lintDebug` در `android-app/`.
3. بدون commit کردن اسرار، لاگ حجیم حاوی توکن، یا فایل‌های build (`*.apk` در git — مگر سیاست مخزن صریحاً خلاف باشد).

---

## مستندات مرتبط

- [README.md](README.md) — فهرست سایر اسناد `docs/`
- چیدمان backend: [../backend/docs/CODEBASE-LAYOUT.md](../backend/docs/CODEBASE-LAYOUT.md)
- معماری فرانت کلاسیک: [../backend/docs/FRONTEND-ARCHITECTURE.md](../backend/docs/FRONTEND-ARCHITECTURE.md)

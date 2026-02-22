# راهنمای لندینگ cPanel

> **منبع اصلی:** این پوشه منبع اصلی لندینگ است. `backend/public/` باید با آن همگام باشد (رجوع به `backend/public/LANDING-SYNC.md`).

## ساختار فایل‌ها

```
cpanel-landing/
├── index.html
├── contact.html
├── .htaccess
├── robots.txt
├── sitemap.xml
├── css/style.css
├── js/landing.js
├── images/
│   ├── Desktop-Dashboard.png   ← اسکرین‌شات دسکتاپ
│   └── Mobile-View.png         ← اسکرین‌شات موبایل
├── README.md
└── CPANEL-CHECKLIST.md        ← چک‌لیست آپلود
```

## آپلود در cPanel

1. همه فایل‌ها را در `public_html` آپلود کنید
2. تصاویر را با نام‌های دقیق `Desktop-Dashboard.png` و `Mobile-View.png` در پوشه `images` قرار دهید
3. در `index.html` خط `PANEL_URL` را تنظیم کنید

## فرم تماس (Formspree)

1. به https://formspree.io بروید و ثبت‌نام کنید
2. یک فرم جدید بسازید
3. در `index.html` عبارت `YOUR_FORM_ID` را با Form ID خود جایگزین کنید

مثال: اگر Form ID شما `xyzabc` است:
```html
action="https://formspree.io/f/xyzabc"
```

## واتساپ

شماره واتساپ: **+90 501 067 6486** — در تمام صفحات قرار دارد.

## قیمت‌گذاری

قیمت‌های فعلی: **$49/ماه** و **$490/سال** (۲ ماه رایگان). در `index.html` قابل تغییر است.

## سئو (SEO)

- **Meta tags:** عنوان، توضیحات، کلمات کلیدی
- **Open Graph & Twitter Card:** برای اشتراک در شبکه‌های اجتماعی
- **JSON-LD:** داده ساختاریافته (Organization, WebSite, SoftwareApplication)
- **hreflang:** برای زبان‌های EN, FA, TR
- **sitemap.xml** و **robots.txt** برای موتورهای جستجو

فایل‌های sitemap.xml و robots.txt را در public_html آپلود کنید.

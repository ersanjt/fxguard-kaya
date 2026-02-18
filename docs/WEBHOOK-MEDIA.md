# وب‌هوک پیام ورودی و رسانه

## مسیر

`POST /api/webhook/incoming-message`

## بدنهٔ درخواست (خلاصه)

- **from** / **contact.number**: شماره فرستنده
- **body**: متن پیام (اختیاری برای پیام فقط رسانه)
- **timestamp**: زمان (ثانیه یا میلی‌ثانیه)
- **hasMedia**: `true` اگر پیام رسانه دارد
- **type**: نوع پیام از واتساپ (مثلاً `image`, `video`, `document`) — اختیاری؛ در صورت نبود از mimetype/filename استنتاج می‌شود
- **media**: شیء رسانه (زمانی که `hasMedia === true`)

## رسانه: دو روش پشتیبانی‌شده

### ۱. آدرس قابل دانلود (`media.url`)

اگر گیت‌وی یا سرویس دیگری فایل را روی یک آدرس HTTP/HTTPS در دسترس قرار دهد:

```json
{
  "hasMedia": true,
  "media": {
    "url": "https://example.com/files/photo.jpg",
    "filename": "photo.jpg",
    "mimetype": "image/jpeg"
  }
}
```

سرور فایل را دانلود می‌کند، در پوشهٔ `backend/uploads` ذخیره می‌کند و در دیتابیس `mediaData.url` را به صورت مسیر نسبی (مثل `/uploads/123-photo.jpg`) ذخیره می‌کند.

### ۲. دادهٔ base64 (`media.data`)

اگر گیت‌وی رسانه را به صورت base64 بفرستد (مثلاً پس از `msg.downloadMedia()` در whatsapp-web.js):

```json
{
  "hasMedia": true,
  "media": {
    "data": "<base64 string>",
    "filename": "WhatsApp Image 2026-02-18.jpeg",
    "mimetype": "image/jpeg"
  }
}
```

سرور بدون دانلود از شبکه، محتوا را decode می‌کند، در `backend/uploads` ذخیره می‌کند و `mediaData.url` را نسبی قرار می‌دهد.

## وقتی رسانه بدون آدرس/داده است

اگر فقط **body** (مثلاً نام فایل) یا **media.filename** بدون `media.url` و بدون `media.data` فرستاده شود، سرور پیام را ثبت می‌کند ولی در پنل فقط باکس فایل با نام فایل نمایش داده می‌شود (تصویر/پخش رسانه ممکن نیست).

## گیت‌وی این پروژه

گیت‌وی واتساپ (`gateway/`) پس از دریافت پیام، رسانه را با `msg.downloadMedia()` می‌گیرد و در بدنهٔ ارسالی به بک‌اند **media.data** (base64) را قرار می‌دهد تا بک‌اند بتواند فایل را در `uploads` ذخیره و در پنل نمایش دهد.

## فرانت‌اند (پنل)

- اگر `mediaData.url` موجود باشد، از روی **type** یا **mimetype/filename** تشخیص می‌دهد تصویر / ویدیو / صدا / سند و پیش‌نمایش یا لینک مناسب نشان می‌دهد.
- اگر `mediaData.url` خالی باشد ولی `hasMedia` و نام فایل باشد، باکس فایل با آیکون و نام فایل نمایش داده می‌شود (بدون جعبهٔ سبز خالی).

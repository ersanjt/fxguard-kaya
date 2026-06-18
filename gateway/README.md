# Gateway — WhatsApp Web Service

> **نقشهٔ کامل:** [`docs/CODEBASE-MAP.md`](../docs/CODEBASE-MAP.md) · **مالک:** Ersan Jahed Tabrizi

## نقش

سرویس جداگانهٔ Node که **whatsapp-web.js** را اجرا می‌کند و با `backend` از طریق HTTP و (اختیاری) RabbitMQ صحبت می‌کند.

## فایل‌های اصلی

| فایل | مسئولیت |
|------|---------|
| `src/index.js` | کلاینت WA، `POST /api/send-message`، QR، وضعیت، consumer صف |
| `src/waCalls.js` | تماس صوتی/تصویری از UI هدلس |

## دستورات

```bash
npm run lint
npm run format        # CI — باید سبز باشد
npm run format:write  # اصلاح خودکار Prettier
npm start
```

## وابستگی به backend

- Backend: `lib/gatewayClient.js` → `POST http://gateway:PORT/api/send-message`
- تنظیمات اتصال: `backend/routes/whatsapp.js` + مدل `WhatsappConnection`

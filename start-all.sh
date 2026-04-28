#!/bin/bash
# راه‌اندازی کامل سیستم واتساپ CRM (Backend + Gateway)
# یک شماره، همه کارمندان از پنل پاسخ می‌دهند
# داشبورد: http://localhost:3002/

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo ""
echo "========================================"
echo "  WhatsApp CRM - راه‌اندازی کامل"
echo "========================================"
echo ""

# بررسی Node.js
if ! command -v node &>/dev/null; then
    echo "[خطا] Node.js نصب نیست. از https://nodejs.org نصب کنید."
    exit 1
fi
echo "[OK] Node.js: $(node -v)"

# ایجاد .env برای Backend و Gateway
if [ ! -f backend/.env ] && [ -f backend/.env.example ]; then
    cp backend/.env.example backend/.env
    echo "[INFO] backend/.env ساخته شد."
fi
if [ ! -f gateway/.env ] && [ -f gateway/.env.example ]; then
    cp gateway/.env.example gateway/.env
    echo "[INFO] gateway/.env ساخته شد."
fi

# نصب وابستگی‌ها
cd "$ROOT/backend"
if [ ! -d node_modules ]; then
    echo "[...] نصب وابستگی‌های Backend..."
    npm install --silent
fi
echo "[OK] Backend آماده است."

cd "$ROOT/gateway"
if [ ! -d node_modules ]; then
    echo "[...] نصب وابستگی‌های Gateway..."
    npm install --silent
fi
echo "[OK] Gateway آماده است."

# ایجاد پوشه‌ها
mkdir -p backend/database gateway/sessions gateway/uploads backend/uploads gateway/logs

echo ""
echo "شروع Backend و Gateway..."
echo ""
echo "  داشبورد: http://localhost:3002/"
echo "  ورود پیش‌فرض: admin@kaya.fxguard.io / Admin@123"
echo ""
echo "  پس از ورود، به بخش «اتصال واتساپ» بروید و QR را اسکن کنید."
echo "  برای توقف: Ctrl+C"
echo ""

# تابع برای خروج تمیز
cleanup() {
    echo ""
    echo "در حال توقف..."
    kill $GATEWAY_PID 2>/dev/null || true
    kill $BACKEND_PID 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM

# اجرای Gateway در پس‌زمینه
cd "$ROOT/gateway"
node src/index.js &
GATEWAY_PID=$!

sleep 2

# اجرای Backend
export USE_SQLITE=true
export GATEWAY_URL="http://localhost:3001"
cd "$ROOT/backend"
node server.js &
BACKEND_PID=$!

wait $BACKEND_PID

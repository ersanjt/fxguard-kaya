#!/usr/bin/env bash
# Start Kaya CRM locally (Backend + WhatsApp Gateway).

set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo
echo "========================================"
echo "  Kaya CRM - local startup"
echo "========================================"
echo

if ! command -v node &>/dev/null; then
    echo "[ERROR] Install Node.js 18+ from https://nodejs.org"
    exit 1
fi
echo "[OK] Node.js: $(node -v)"

CREATED_BACKEND_ENV=0
GENERATED_PASSWORD=""
if [ ! -f backend/.env ]; then
    [ -f backend/.env.example ] || { echo "[ERROR] backend/.env.example not found"; exit 1; }
    cp backend/.env.example backend/.env
    JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
    ENCRYPT_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
    WEBHOOK_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
    GENERATED_PASSWORD="LocalAdmin-$(node -e "console.log(require('crypto').randomBytes(10).toString('hex'))")!"
    JWT_SECRET="$JWT_SECRET" ENCRYPT_SECRET="$ENCRYPT_SECRET" WEBHOOK_SECRET="$WEBHOOK_SECRET" \
        GENERATED_PASSWORD="$GENERATED_PASSWORD" node -e '
            const fs = require("fs");
            const p = "backend/.env";
            let s = fs.readFileSync(p, "utf8");
            const values = {
                JWT_SECRET: process.env.JWT_SECRET,
                ENCRYPT_SECRET: process.env.ENCRYPT_SECRET,
                WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
                MAIN_ADMIN_EMAIL: "admin@localhost",
                MAIN_ADMIN_PASSWORD: process.env.GENERATED_PASSWORD
            };
            for (const [key, value] of Object.entries(values)) {
                s = s.replace(new RegExp("^" + key + "=.*$", "m"), key + "=" + value);
            }
            fs.writeFileSync(p, s);
        '
    CREATED_BACKEND_ENV=1
    echo "[OK] Created backend/.env with random local secrets."
fi

if [ ! -f gateway/.env ]; then
    [ -f gateway/.env.example ] || { echo "[ERROR] gateway/.env.example not found"; exit 1; }
    cp gateway/.env.example gateway/.env
    WEBHOOK_SECRET="$(awk -F= '/^WEBHOOK_SECRET=/{print substr($0, index($0, "=") + 1); exit}' backend/.env)"
    if [ -n "$WEBHOOK_SECRET" ]; then
        WEBHOOK_SECRET="$WEBHOOK_SECRET" node -e '
            const fs = require("fs");
            const p = "gateway/.env";
            let s = fs.readFileSync(p, "utf8");
            const line = "WEBHOOK_SECRET=" + process.env.WEBHOOK_SECRET;
            if (/^WEBHOOK_SECRET=.*$/m.test(s)) s = s.replace(/^WEBHOOK_SECRET=.*$/m, line);
            else s += "\n" + line + "\n";
            fs.writeFileSync(p, s);
        '
    fi
    echo "[OK] Created gateway/.env."
fi

cd "$ROOT/backend"
if [ ! -d node_modules ]; then
    echo "[...] Installing Backend dependencies..."
    if [ -f package-lock.json ]; then npm ci; else npm install; fi
fi
echo "[OK] Backend ready."

cd "$ROOT/gateway"
if [ ! -d node_modules ]; then
    echo "[...] Installing Gateway dependencies..."
    if [ -f package-lock.json ]; then npm ci; else npm install; fi
fi
echo "[OK] Gateway ready."

cd "$ROOT"
mkdir -p backend/database gateway/sessions gateway/uploads backend/uploads gateway/logs

BACKEND_PORT="$(awk -F= '/^PORT=/{print $2; exit}' backend/.env)"
GATEWAY_PORT="$(awk -F= '/^PORT=/{print $2; exit}' gateway/.env)"
ADMIN_EMAIL="$(awk -F= '/^MAIN_ADMIN_EMAIL=/{print substr($0, index($0, "=") + 1); exit}' backend/.env)"
BACKEND_PORT="${BACKEND_PORT:-3002}"
GATEWAY_PORT="${GATEWAY_PORT:-3001}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@localhost}"

echo
echo "Backend: http://localhost:$BACKEND_PORT"
echo "Gateway: http://localhost:$GATEWAY_PORT"
echo "Login email: $ADMIN_EMAIL"
if [ "$CREATED_BACKEND_ENV" -eq 1 ]; then
    echo "Generated local password: $GENERATED_PASSWORD"
    echo "Save it now; it is also stored in backend/.env."
else
    echo "Password: use MAIN_ADMIN_PASSWORD from backend/.env"
fi
echo "Stop both services with Ctrl+C."
echo

GATEWAY_PID=""
BACKEND_PID=""
cleanup() {
    echo
    echo "Stopping services..."
    [ -z "$GATEWAY_PID" ] || kill "$GATEWAY_PID" 2>/dev/null || true
    [ -z "$BACKEND_PID" ] || kill "$BACKEND_PID" 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM

cd "$ROOT/gateway"
node src/index.js &
GATEWAY_PID=$!

sleep 2

export USE_SQLITE=true
export GATEWAY_URL="http://localhost:$GATEWAY_PORT"
cd "$ROOT/backend"
node server.js &
BACKEND_PID=$!

wait "$BACKEND_PID"

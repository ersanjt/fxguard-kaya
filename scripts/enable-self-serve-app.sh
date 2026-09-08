#!/usr/bin/env bash
# روشن کردن ثبت‌نام خودخدمت روی crm-backend-app (پورت 3002).
# هرگز روی kayaCRM-kaya / crm-backend-kaya اجرا نمی‌شود.
set -euo pipefail

KAYA_MARK="kayaCRM-kaya"
PM2_NAME="crm-backend-app"

abort() {
  echo "❌ $*" >&2
  exit 1
}

if ! command -v pm2 >/dev/null 2>&1; then
  abort "pm2 پیدا نشد"
fi
if ! command -v node >/dev/null 2>&1; then
  abort "node پیدا نشد"
fi

APP_CWD="$(PM2_NAME="$PM2_NAME" pm2 jlist | node -e "
let raw = '';
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  let list = [];
  try { list = JSON.parse(raw || '[]'); } catch (e) { process.exit(2); }
  const name = process.env.PM2_NAME || 'crm-backend-app';
  const p = (list || []).find((x) => x && x.name === name);
  const cwd = p && p.pm2_env && p.pm2_env.pm_cwd;
  if (!cwd) process.exit(3);
  process.stdout.write(String(cwd));
});
")" || abort "پروسهٔ ${PM2_NAME} در pm2 پیدا نشد"

case "$APP_CWD" in
  *"$KAYA_MARK"*) abort "cwd مربوط به کایاست ($APP_CWD). abort" ;;
esac

ROOT="$APP_CWD"
if [ -d "$APP_CWD/backend" ] && [ -f "$APP_CWD/backend/package.json" ]; then
  ROOT="$APP_CWD"
elif [ -f "$APP_CWD/package.json" ] && [ -d "$APP_CWD/../backend" ]; then
  ROOT="$(cd "$APP_CWD/.." && pwd)"
fi

case "$ROOT" in
  *"$KAYA_MARK"*) abort "root مربوط به کایاست ($ROOT). abort" ;;
esac

ENV_FILE=""
if [ -f "$APP_CWD/.env" ]; then
  ENV_FILE="$APP_CWD/.env"
elif [ -f "$ROOT/backend/.env" ]; then
  ENV_FILE="$ROOT/backend/.env"
fi
[ -n "$ENV_FILE" ] || abort "فایل .env برای app پیدا نشد (cwd=$APP_CWD)"

case "$ENV_FILE" in
  *"$KAYA_MARK"*) abort ".env کایا است. abort" ;;
esac

UPSERT=""
if [ -f "$ROOT/backend/scripts/upsert-dotenv.js" ]; then
  UPSERT="$ROOT/backend/scripts/upsert-dotenv.js"
elif [ -f "$APP_CWD/scripts/upsert-dotenv.js" ]; then
  UPSERT="$APP_CWD/scripts/upsert-dotenv.js"
else
  abort "upsert-dotenv.js پیدا نشد"
fi

echo "🔍 app cwd: $APP_CWD"
echo "🔍 env: $ENV_FILE"

node "$UPSERT" "$ENV_FILE" SELF_SERVE_SIGNUP true
node "$UPSERT" "$ENV_FILE" TENANT_BASE_HOST app.fxguard.io
node "$UPSERT" "$ENV_FILE" TENANT_TRIAL_DAYS 7

CORS_VAL="$(grep "^CORS_ORIGINS=" "$ENV_FILE" | cut -d= -f2- || true)"
if [ -n "$CORS_VAL" ] && printf '%s' "$CORS_VAL" | grep -Fvq "app.fxguard.io"; then
  node "$UPSERT" "$ENV_FILE" CORS_ORIGINS "${CORS_VAL},https://app.fxguard.io"
  echo "  ✅ CORS_ORIGINS شامل https://app.fxguard.io شد"
fi

FRONTEND_VAL="$(grep "^FRONTEND_URL=" "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d ' ' || true)"
if [ -z "$FRONTEND_VAL" ] || printf '%s' "$FRONTEND_VAL" | grep -Eq 'kaya\.fxguard\.io'; then
  if [ -n "$FRONTEND_VAL" ]; then
    echo "⚠️ FRONTEND_URL این پروسه روی کایا بود؛ برای crm-backend-app به app.fxguard.io عوض می‌شود"
  fi
  node "$UPSERT" "$ENV_FILE" FRONTEND_URL https://app.fxguard.io
fi

echo "🔄 restart ${PM2_NAME} ..."
pm2 restart "$PM2_NAME" --update-env

echo "✅ ثبت‌نام خودخدمت روی app روشن شد (SELF_SERVE_SIGNUP=true)."
echo "   nginx wildcard: deploy/nginx-app-wildcard.conf.example"
echo "   گواهی *.app.fxguard.io باید جداگانه با DNS-01 صادر شود."

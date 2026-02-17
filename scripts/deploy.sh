#!/bin/bash
# اسکریپت به‌روزرسانی خودکار روی سرور
# با هر push به master، GitHub Actions این اسکریپت را اجرا می‌کند
# یا دستی: bash scripts/deploy.sh

set -e
cd "$(dirname "$0")/.."
PROJECT_ROOT="$(pwd)"

echo "==> Deploying from $PROJECT_ROOT"

echo "==> Git pull..."
git pull origin master

mkdir -p backend/logs gateway/logs

echo "==> Install backend dependencies..."
cd "$PROJECT_ROOT/backend"
npm install --omit=dev

echo "==> Install gateway dependencies..."
cd "$PROJECT_ROOT/gateway"
npm install --omit=dev

echo "==> Reload PM2..."
cd "$PROJECT_ROOT"
pm2 reload ecosystem.config.js --update-env || pm2 start ecosystem.config.js

echo "==> Save PM2 config..."
pm2 save

echo "==> Done. Backend + Gateway updated."

#!/bin/bash
# نصب پیش‌نیازهای سرور Ubuntu 22.04 برای CRM
# اجرا: bash setup-server.sh (ترجیحاً با root یا sudo)

set -e
export DEBIAN_FRONTEND=noninteractive

echo "==> Update system..."
apt update && apt upgrade -y

echo "==> Install Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo "==> Install PM2..."
npm install -g pm2

echo "==> Install Git and Nginx..."
apt install -y git nginx

echo "==> Done. Next steps:"
echo "  cd /var/www"
echo "  git clone https://github.com/ersanjt/fxguard-kaya.git"
echo "  cd fxguard-kaya/backend"
echo "  npm install --production"
echo "  cp .env.example .env   # then edit .env"
echo "  node seed-admin.js"
echo "  pm2 start server.js --name crm-backend"
echo "  pm2 save && pm2 startup"

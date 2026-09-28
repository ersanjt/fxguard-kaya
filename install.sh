#!/bin/bash

# WhatsApp Enterprise CRM - Auto Installation Script
# این اسکریپت به صورت خودکار تمام سیستم را نصب و راه‌اندازی می‌کند

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║     WhatsApp Enterprise CRM - نصب خودکار                      ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# رنگ‌ها برای خروجی
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# توابع کمکی
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# بررسی سیستم عامل
check_os() {
    print_info "بررسی سیستم عامل..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        print_success "سیستم عامل: Linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="mac"
        print_success "سیستم عامل: macOS"
    else
        print_error "سیستم عامل پشتیبانی نمی‌شود"
        exit 1
    fi
}

# بررسی و نصب Node.js
check_nodejs() {
    print_info "بررسی Node.js..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ $NODE_VERSION -ge 18 ]; then
            print_success "Node.js نسخه $(node -v) نصب است"
        else
            print_warning "Node.js نسخه قدیمی است. نیاز به نسخه 18+"
            install_nodejs
        fi
    else
        print_warning "Node.js نصب نیست"
        install_nodejs
    fi
}

install_nodejs() {
    print_info "نصب Node.js..."
    
    if [ "$OS" == "linux" ]; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [ "$OS" == "mac" ]; then
        brew install node@18
    fi
    
    print_success "Node.js نصب شد"
}

# نصب دیتابیس‌ها
install_databases() {
    echo ""
    print_info "═══════════════════════════════════════════════════════════"
    print_info "نصب دیتابیس‌ها"
    print_info "═══════════════════════════════════════════════════════════"
    
    # PostgreSQL
    print_info "نصب PostgreSQL..."
    if [ "$OS" == "linux" ]; then
        sudo apt update
        sudo apt install -y postgresql postgresql-contrib
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
    elif [ "$OS" == "mac" ]; then
        brew install postgresql@14
        brew services start postgresql@14
    fi
    print_success "PostgreSQL نصب شد"
    
    # MongoDB
    print_info "نصب MongoDB..."
    if [ "$OS" == "linux" ]; then
        wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
        echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
        sudo apt update
        sudo apt install -y mongodb-org
        sudo systemctl start mongod
        sudo systemctl enable mongod
    elif [ "$OS" == "mac" ]; then
        brew tap mongodb/brew
        brew install mongodb-community@5.0
        brew services start mongodb-community@5.0
    fi
    print_success "MongoDB نصب شد"
    
    # Redis
    print_info "نصب Redis..."
    if [ "$OS" == "linux" ]; then
        sudo apt install -y redis-server
        sudo systemctl start redis
        sudo systemctl enable redis
    elif [ "$OS" == "mac" ]; then
        brew install redis
        brew services start redis
    fi
    print_success "Redis نصب شد"
    
    # RabbitMQ
    print_info "نصب RabbitMQ..."
    if [ "$OS" == "linux" ]; then
        sudo apt install -y rabbitmq-server
        sudo systemctl start rabbitmq-server
        sudo systemctl enable rabbitmq-server
        sudo rabbitmq-plugins enable rabbitmq_management
    elif [ "$OS" == "mac" ]; then
        brew install rabbitmq
        brew services start rabbitmq
    fi
    print_success "RabbitMQ نصب شد"
}

# ایجاد دیتابیس PostgreSQL
setup_postgres() {
    print_info "تنظیم PostgreSQL..."

    DB_PASSWORD="$(node -e "process.stdout.write(require('crypto').randomBytes(24).toString('hex'))")"
    sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='crm_user'" | grep -q 1 ||
        sudo -u postgres createuser crm_user
    sudo -u postgres psql -c "ALTER USER crm_user WITH ENCRYPTED PASSWORD '$DB_PASSWORD';"
    sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='whatsapp_crm'" | grep -q 1 ||
        sudo -u postgres createdb -O crm_user whatsapp_crm
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE whatsapp_crm TO crm_user;" 2>/dev/null || true

    print_success "دیتابیس PostgreSQL آماده است"
}

# نصب PM2
install_pm2() {
    print_info "نصب PM2..."
    
    if ! command -v pm2 &> /dev/null; then
        sudo npm install -g pm2
        print_success "PM2 نصب شد"
    else
        print_success "PM2 از قبل نصب است"
    fi
}

# نصب dependencies
install_dependencies() {
    echo ""
    print_info "═══════════════════════════════════════════════════════════"
    print_info "نصب وابستگی‌ها"
    print_info "═══════════════════════════════════════════════════════════"
    
    # Gateway
    print_info "نصب وابستگی‌های Gateway..."
    cd gateway
    npm ci
    cd ..
    print_success "Gateway dependencies نصب شد"
    
    # Backend
    print_info "نصب وابستگی‌های Backend..."
    cd backend
    npm ci
    cd ..
    print_success "Backend dependencies نصب شد"
    
    # Frontend
    print_info "نصب و ساخت Frontend..."
    cd frontend
    npm ci
    npm run build
    cd ..
    print_success "Frontend ساخته شد و داخل Backend قرار گرفت"
}

# تنظیم فایل‌های .env
setup_env_files() {
    echo ""
    print_info "═══════════════════════════════════════════════════════════"
    print_info "تنظیم فایل‌های محیطی"
    print_info "═══════════════════════════════════════════════════════════"
    
    if [ ! -f backend/.env ]; then
        cp backend/.env.example backend/.env
        GENERATED_PASSWORD="LocalAdmin-$(node -e "process.stdout.write(require('crypto').randomBytes(10).toString('hex'))")!"
        JWT_SECRET="$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))")"
        ENCRYPT_SECRET="$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))")"
        WEBHOOK_SECRET="$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))")"
        GATEWAY_API_SECRET="$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))")"
        GENERATED_PASSWORD="$GENERATED_PASSWORD" JWT_SECRET="$JWT_SECRET" ENCRYPT_SECRET="$ENCRYPT_SECRET" \
            DB_PASSWORD="${DB_PASSWORD:-}" \
            WEBHOOK_SECRET="$WEBHOOK_SECRET" GATEWAY_API_SECRET="$GATEWAY_API_SECRET" node <<'NODE'
const fs = require('fs');
const path = 'backend/.env';
let text = fs.readFileSync(path, 'utf8');
const values = {
    JWT_SECRET: process.env.JWT_SECRET,
    ENCRYPT_SECRET: process.env.ENCRYPT_SECRET,
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
    MAIN_ADMIN_EMAIL: 'admin@localhost',
    MAIN_ADMIN_PASSWORD: process.env.GENERATED_PASSWORD,
    GATEWAY_API_SECRET: process.env.GATEWAY_API_SECRET,
};
if (process.env.DB_PASSWORD) {
    Object.assign(values, {
        USE_SQLITE: 'false',
        DB_HOST: 'localhost',
        DB_PORT: '5432',
        DB_NAME: 'whatsapp_crm',
        DB_USER: 'crm_user',
        DB_PASSWORD: process.env.DB_PASSWORD,
    });
}
for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^#?\\s*${key}=.*$`, 'm');
    text = pattern.test(text) ? text.replace(pattern, line) : `${text}\n${line}\n`;
}
fs.writeFileSync(path, text);
NODE
        print_success "backend/.env با کلیدها و رمز تصادفی ساخته شد"
        print_warning "رمز محلی ایجادشده را ذخیره کنید: $GENERATED_PASSWORD"
    else
        print_warning "backend/.env از قبل وجود دارد و تغییر نکرد"
    fi

    if [ ! -f gateway/.env ]; then
        cp gateway/.env.example gateway/.env
        WEBHOOK_SECRET="$(awk -F= '/^WEBHOOK_SECRET=/{print substr($0, index($0, "=") + 1); exit}' backend/.env)"
        GATEWAY_API_SECRET="$(awk -F= '/^GATEWAY_API_SECRET=/{print substr($0, index($0, "=") + 1); exit}' backend/.env)"
        WEBHOOK_SECRET="$WEBHOOK_SECRET" GATEWAY_API_SECRET="$GATEWAY_API_SECRET" node <<'NODE'
const fs = require('fs');
const path = 'gateway/.env';
let text = fs.readFileSync(path, 'utf8');
for (const key of ['WEBHOOK_SECRET', 'GATEWAY_API_SECRET']) {
    const value = process.env[key];
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^#?\\s*${key}=.*$`, 'm');
    text = pattern.test(text) ? text.replace(pattern, line) : `${text}\n${line}\n`;
}
fs.writeFileSync(path, text);
NODE
        print_success "gateway/.env با کلیدهای مشترک ساخته شد"
    else
        print_warning "gateway/.env از قبل وجود دارد و تغییر نکرد"
    fi
}

# اجرای Migration
run_migrations() {
    print_info "اجرای Migration..."

    if (cd backend && npm run migrate && npm run seed); then
        cd ..
        print_success "Migration و Seed اجرا شدند"
    else
        cd .. 2>/dev/null || true
        print_error "اجرای Migration یا Seed شکست خورد؛ لاگ بالا را بررسی کنید"
        return 1
    fi
}

# ایجاد فولدرها
create_directories() {
    print_info "ایجاد فولدرهای لازم..."
    
    mkdir -p gateway/{sessions,uploads,logs}
    mkdir -p backend/{uploads,logs}
    mkdir -p backups
    
    print_success "فولدرها ایجاد شدند"
}

# راه‌اندازی سرویس‌ها با PM2
start_services() {
    echo ""
    print_info "═══════════════════════════════════════════════════════════"
    print_info "راه‌اندازی سرویس‌ها"
    print_info "═══════════════════════════════════════════════════════════"
    
    # Gateway
    print_info "راه‌اندازی Gateway..."
    cd gateway
    pm2 delete whatsapp-gateway 2>/dev/null || true
    pm2 start src/index.js --name "whatsapp-gateway"
    cd ..
    print_success "Gateway راه‌اندازی شد"
    
    # Backend
    print_info "راه‌اندازی Backend..."
    cd backend
    pm2 delete crm-backend 2>/dev/null || true
    pm2 start server.js --name "crm-backend"
    cd ..
    print_success "Backend راه‌اندازی شد"
    
    # ذخیره تنظیمات PM2
    pm2 save
    pm2 startup
    
    print_success "تمام سرویس‌ها راه‌اندازی شدند"
}

# نمایش اطلاعات نهایی
show_final_info() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                                                                ║"
    echo "║              🎉 نصب با موفقیت انجام شد! 🎉                    ║"
    echo "║                                                                ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    
    print_success "دسترسی به سیستم:"
    echo ""
    echo "  📱 Dashboard + Backend:   http://localhost:3002"
    echo "  🔧 Backend API:           http://localhost:3002"
    echo "  📡 WhatsApp Gateway:      http://localhost:3001"
    echo "  🐰 RabbitMQ Management:   http://localhost:15672"
    echo ""
    
    print_success "اطلاعات ورود:"
    echo ""
    echo "  از MAIN_ADMIN_EMAIL و MAIN_ADMIN_PASSWORD در backend/.env استفاده کنید."
    echo ""
    
    print_info "مدیریت سرویس‌ها:"
    echo ""
    echo "  pm2 status              # وضعیت سرویس‌ها"
    echo "  pm2 logs                # نمایش لاگ‌ها"
    echo "  pm2 restart all         # راه‌اندازی مجدد"
    echo "  pm2 stop all            # توقف سرویس‌ها"
    echo ""
    
    print_info "مستندات بیشتر:"
    echo ""
    echo "  📖 README.md            - مستندات کامل"
    echo "  🚀 QUICKSTART.md        - راهنمای سریع"
    echo ""
}

# ==================== اجرای اصلی ====================

main() {
    clear
    
    # بررسی‌های اولیه
    check_os
    check_nodejs
    
    # سوال از کاربر
    echo ""
    read -p "آیا می‌خواهید دیتابیس‌ها را نصب کنید؟ (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        install_databases
        setup_postgres
    fi
    
    # نصب PM2
    install_pm2
    
    # نصب Dependencies
    install_dependencies
    
    # تنظیمات
    setup_env_files
    create_directories
    
    # Migration
    run_migrations
    
    # راه‌اندازی
    read -p "آیا می‌خواهید سرویس‌ها را راه‌اندازی کنید؟ (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_services
    fi
    
    # اطلاعات نهایی
    show_final_info
}

# اجرا
main

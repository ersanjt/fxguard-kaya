# راه‌اندازی کامل سیستم واتساپ CRM (Backend + Gateway)
# یک شماره، همه کارمندان از پنل پاسخ می‌دهند
# داشبورد: http://localhost:3002/

$ErrorActionPreference = "Stop"
$rootPath = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WhatsApp CRM - راه‌اندازی کامل" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# بررسی Node.js
try {
    $nodeVer = node -v 2>$null
    if (-not $nodeVer) { throw "Node.js not found" }
    Write-Host "[OK] Node.js: $nodeVer" -ForegroundColor Green
} catch {
    Write-Host "[خطا] Node.js نصب نیست. از https://nodejs.org نصب کنید." -ForegroundColor Red
    exit 1
}

$backendPath = Join-Path $rootPath "backend"
$gatewayPath = Join-Path $rootPath "gateway"
if (-not (Test-Path $backendPath)) { Write-Host "[Error] backend folder not found. Run from project root." -ForegroundColor Red; exit 1 }
if (-not (Test-Path $gatewayPath)) { Write-Host "[Error] gateway folder not found. Run from project root." -ForegroundColor Red; exit 1 }

# ایجاد .env برای Backend و Gateway
$backendEnv = Join-Path $backendPath ".env"
$gatewayEnv = Join-Path $gatewayPath ".env"
if (-not (Test-Path $backendEnv) -and (Test-Path (Join-Path $backendPath ".env.example"))) {
    Copy-Item (Join-Path $backendPath ".env.example") $backendEnv
    Write-Host "[INFO] backend/.env ساخته شد." -ForegroundColor Yellow
}
if (-not (Test-Path $gatewayEnv) -and (Test-Path (Join-Path $gatewayPath ".env.example"))) {
    Copy-Item (Join-Path $gatewayPath ".env.example") $gatewayEnv
    Write-Host "[INFO] gateway/.env ساخته شد." -ForegroundColor Yellow
}

# نصب وابستگی‌های Backend
if (-not (Test-Path (Join-Path $backendPath "node_modules"))) {
    Write-Host "[...] نصب وابستگی‌های Backend..." -ForegroundColor Yellow
    Set-Location $backendPath
    npm install --silent 2>$null
    Set-Location $rootPath
    Write-Host "[OK] Backend آماده است." -ForegroundColor Green
}

# نصب وابستگی‌های Gateway
if (-not (Test-Path (Join-Path $gatewayPath "node_modules"))) {
    Write-Host "[...] نصب وابستگی‌های Gateway..." -ForegroundColor Yellow
    Set-Location $gatewayPath
    npm install --silent 2>$null
    Set-Location $rootPath
    Write-Host "[OK] Gateway آماده است." -ForegroundColor Green
}

# ایجاد پوشه‌های لازم
@("backend\database", "gateway\sessions", "gateway\uploads", "backend\uploads", "gateway\logs") | ForEach-Object {
    $p = Join-Path $rootPath $_
    if (-not (Test-Path $p)) { New-Item -ItemType Directory -Path $p -Force | Out-Null }
}

Write-Host ""
Write-Host "شروع Backend روی پورت 3002..." -ForegroundColor Green
Write-Host "شروع Gateway روی پورت 3001..." -ForegroundColor Green
Write-Host ""
Write-Host "  داشبورد: " -NoNewline
Write-Host "http://localhost:3002/" -ForegroundColor Cyan
Write-Host "  ورود پیش‌فرض: admin@kaya.fxguard.io / Admin@123" -ForegroundColor Gray
Write-Host ""
Write-Host "  پس از ورود، به بخش «اتصال واتساپ» بروید و QR را اسکن کنید." -ForegroundColor Gray
Write-Host "  Stop: Ctrl+C" -ForegroundColor Gray
Write-Host ""

# اجرای Gateway در پس‌زمینه
$gatewayProc = Start-Process -FilePath "node" -ArgumentList "src/index.js" -WorkingDirectory $gatewayPath -PassThru -WindowStyle Hidden

# کمی صبر برای بالا آمدن Gateway
Start-Sleep -Seconds 3

# اجرای Backend (در پیش‌زمینه)
try {
    Set-Location $backendPath
    $env:USE_SQLITE = "true"
    $env:GATEWAY_URL = "http://localhost:3001"
    node server.js
} finally {
    if ($gatewayProc -and -not $gatewayProc.HasExited) {
        Stop-Process -Id $gatewayProc.Id -Force -ErrorAction SilentlyContinue
    }
    Set-Location $rootPath
}

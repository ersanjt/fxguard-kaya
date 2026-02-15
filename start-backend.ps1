# راه‌اندازی سرور Backend واتساپ CRM
# پس از اجرا، داشبورد: http://localhost:3002/dashboard.html

$backendPath = Join-Path $PSScriptRoot "backend"
if (-not (Test-Path $backendPath)) {
    Write-Host "پوشه backend یافت نشد." -ForegroundColor Red
    exit 1
}

Set-Location $backendPath
if (-not (Test-Path "node_modules")) {
    Write-Host "نصب وابستگی‌ها..." -ForegroundColor Yellow
    npm install
}
Write-Host "شروع سرور Backend روی پورت 3002..." -ForegroundColor Green
Write-Host "داشبورد: http://localhost:3002/dashboard.html" -ForegroundColor Cyan
Write-Host "برای توقف: Ctrl+C" -ForegroundColor Gray
node server.js

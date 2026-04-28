# راه‌اندازی لوکال kayaCRM
# اجرا: .\start-local.ps1

$env:Path = "C:\Program Files\nodejs;" + $env:Path

Write-Host "Starting Backend (port 3002)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:Path = 'C:\Program Files\nodejs;' + `$env:Path; cd '$PSScriptRoot\backend'; npm start"

Start-Sleep -Seconds 3

Write-Host "Starting Gateway (port 3001)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:Path = 'C:\Program Files\nodejs;' + `$env:Path; cd '$PSScriptRoot\gateway'; npm start"

Write-Host ""
Write-Host "Backend:  http://localhost:3002" -ForegroundColor Green
Write-Host "Gateway:  http://localhost:3001" -ForegroundColor Green
Write-Host "Login:    admin@local.dev / Admin123" -ForegroundColor Yellow

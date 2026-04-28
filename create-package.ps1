# بسته‌سازی پروژه WhatsApp Enterprise CRM برای دانلود (ZIP)
# اجرا در PowerShell از پوشه پروژه: .\create-package.ps1

$projectRoot = $PSScriptRoot
$parentDir = Split-Path $projectRoot -Parent
$zipName = "whatsapp-crm-complete-" + (Get-Date -Format "yyyyMMdd-HHmm") + ".zip"
$zipPath = Join-Path $parentDir $zipName
$folderName = Split-Path $projectRoot -Leaf
$tempDir = Join-Path $env:TEMP "whatsapp-crm-pack"
$copyTarget = Join-Path $tempDir $folderName

if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $copyTarget -Force | Out-Null

Get-ChildItem -Path $projectRoot -Force | Where-Object { $_.Name -notin @(".git") } | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $copyTarget -Recurse -Force
}

# حذف node_modules در همه زیرپوشه‌ها
Get-ChildItem -Path $copyTarget -Recurse -Directory -Filter "node_modules" -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force
# حذف .env (محرمانه)
Get-ChildItem -Path $copyTarget -Recurse -Filter ".env" -File -ErrorAction SilentlyContinue | Remove-Item -Force
# حذف sessions و logs
Get-ChildItem -Path $copyTarget -Recurse -Directory -Filter "sessions" -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force
Get-ChildItem -Path $copyTarget -Recurse -Directory -Filter "logs" -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path $copyTarget -DestinationPath $zipPath -Force
Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Created: $zipPath" -ForegroundColor Green
Write-Host "Size: $([math]::Round((Get-Item $zipPath).Length / 1MB, 2)) MB"

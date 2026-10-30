# Start Kaya CRM locally (Backend + WhatsApp Gateway).
# This file intentionally uses ASCII-only executable text so Windows PowerShell 5.1
# can parse it even when the repository stores scripts as UTF-8 without BOM.

$ErrorActionPreference = "Stop"
$rootPath = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }

function New-HexSecret([int]$ByteCount = 32) {
    $bytes = New-Object byte[] $ByteCount
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $rng.GetBytes($bytes)
    } finally {
        $rng.Dispose()
    }
    return -join ($bytes | ForEach-Object { $_.ToString("x2") })
}

function Get-DotEnvValue([string]$Path, [string]$Name, [string]$Fallback = "") {
    if (-not (Test-Path $Path)) { return $Fallback }
    $line = Get-Content $Path | Where-Object { $_ -match ("^" + [regex]::Escape($Name) + "=") } | Select-Object -First 1
    if (-not $line) { return $Fallback }
    return ($line -replace ("^" + [regex]::Escape($Name) + "="), "").Trim()
}

function Install-NodeDependencies([string]$Path, [string]$Label) {
    if (Test-Path (Join-Path $Path "node_modules")) { return }
    Write-Host "[...] Installing $Label dependencies..." -ForegroundColor Yellow
    Push-Location $Path
    try {
        if (Test-Path "package-lock.json") {
            npm ci
        } else {
            npm install
        }
        if ($LASTEXITCODE -ne 0) { throw "$Label dependency installation failed." }
    } finally {
        Pop-Location
    }
    Write-Host "[OK] $Label dependencies installed." -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Kaya CRM - local startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

try {
    $nodeVer = node -v 2>$null
    if (-not $nodeVer) { throw "Node.js not found" }
    Write-Host "[OK] Node.js: $nodeVer" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Install Node.js 18+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}

$backendPath = Join-Path $rootPath "backend"
$gatewayPath = Join-Path $rootPath "gateway"
if (-not (Test-Path $backendPath)) { throw "backend folder not found: $backendPath" }
if (-not (Test-Path $gatewayPath)) { throw "gateway folder not found: $gatewayPath" }

$backendEnv = Join-Path $backendPath ".env"
$gatewayEnv = Join-Path $gatewayPath ".env"
$createdBackendEnv = $false
$generatedPassword = ""

if (-not (Test-Path $backendEnv)) {
    $example = Join-Path $backendPath ".env.example"
    if (-not (Test-Path $example)) { throw "backend/.env.example not found" }
    $jwtSecret = New-HexSecret
    $encryptSecret = New-HexSecret
    $webhookSecret = New-HexSecret
    $generatedPassword = "LocalAdmin-$(New-HexSecret 10)!"
    $content = Get-Content $example -Raw
    $content = $content -replace "(?m)^JWT_SECRET=.*$", "JWT_SECRET=$jwtSecret"
    $content = $content -replace "(?m)^ENCRYPT_SECRET=.*$", "ENCRYPT_SECRET=$encryptSecret"
    $content = $content -replace "(?m)^WEBHOOK_SECRET=.*$", "WEBHOOK_SECRET=$webhookSecret"
    $content = $content -replace "(?m)^MAIN_ADMIN_EMAIL=.*$", "MAIN_ADMIN_EMAIL=admin@localhost"
    $content = $content -replace "(?m)^MAIN_ADMIN_PASSWORD=.*$", "MAIN_ADMIN_PASSWORD=$generatedPassword"
    [System.IO.File]::WriteAllText($backendEnv, $content, (New-Object System.Text.UTF8Encoding($false)))
    $createdBackendEnv = $true
    Write-Host "[OK] Created backend/.env with random local secrets." -ForegroundColor Green
}

if (-not (Test-Path $gatewayEnv)) {
    $example = Join-Path $gatewayPath ".env.example"
    if (-not (Test-Path $example)) { throw "gateway/.env.example not found" }
    Copy-Item $example $gatewayEnv
    $webhookSecret = Get-DotEnvValue $backendEnv "WEBHOOK_SECRET"
    if ($webhookSecret) {
        Add-Content -Path $gatewayEnv -Value "`nWEBHOOK_SECRET=$webhookSecret"
    }
    Write-Host "[OK] Created gateway/.env." -ForegroundColor Green
}

Install-NodeDependencies $backendPath "Backend"
Install-NodeDependencies $gatewayPath "Gateway"

@("backend\database", "gateway\sessions", "gateway\uploads", "backend\uploads", "gateway\logs") | ForEach-Object {
    $dir = Join-Path $rootPath $_
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
}

$backendPort = Get-DotEnvValue $backendEnv "PORT" "3002"
$gatewayPort = Get-DotEnvValue $gatewayEnv "PORT" "3001"
$adminEmail = Get-DotEnvValue $backendEnv "MAIN_ADMIN_EMAIL" "admin@localhost"

Write-Host ""
Write-Host "Backend: http://localhost:$backendPort" -ForegroundColor Cyan
Write-Host "Gateway: http://localhost:$gatewayPort" -ForegroundColor Cyan
Write-Host "Login email: $adminEmail" -ForegroundColor Gray
if ($createdBackendEnv) {
    Write-Host "Generated local password: $generatedPassword" -ForegroundColor Yellow
    Write-Host "Save it now; it is also stored in backend/.env." -ForegroundColor Yellow
} else {
    Write-Host "Password: use MAIN_ADMIN_PASSWORD from backend/.env" -ForegroundColor Gray
}
Write-Host "Stop both services with Ctrl+C." -ForegroundColor Gray
Write-Host ""

$gatewayProc = $null
try {
    $gatewayProc = Start-Process -FilePath "node" -ArgumentList "src/index.js" -WorkingDirectory $gatewayPath -PassThru -WindowStyle Hidden
    Start-Sleep -Seconds 3

    Set-Location $backendPath
    $env:USE_SQLITE = "true"
    $env:GATEWAY_URL = "http://localhost:$gatewayPort"
    node server.js
    if ($LASTEXITCODE -ne 0) { throw "Backend exited with code $LASTEXITCODE." }
} finally {
    if ($gatewayProc -and -not $gatewayProc.HasExited) {
        Stop-Process -Id $gatewayProc.Id -Force -ErrorAction SilentlyContinue
    }
    Set-Location $rootPath
}

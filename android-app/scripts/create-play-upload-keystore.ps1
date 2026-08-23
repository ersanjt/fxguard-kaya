# Creates the Play upload keystore + keystore.properties (gitignored).
# Run once. Back up the JKS and the properties file; losing them blocks Play updates.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$storeDir = Join-Path $root "keystore"
$jks = Join-Path $storeDir "kaya-staff-upload.jks"
$props = Join-Path $root "keystore.properties"

if (Test-Path $jks) {
    Write-Host "Keystore already exists: $jks"
    exit 0
}

New-Item -ItemType Directory -Force -Path $storeDir | Out-Null
$pass = -join ((48..57 + 65..90 + 97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
$keytool = Get-Command keytool -ErrorAction SilentlyContinue
if (-not $keytool) {
    $javaHome = $env:JAVA_HOME
    if ($javaHome) { $keytoolPath = Join-Path $javaHome "bin\keytool.exe" }
    if (-not $keytoolPath -or -not (Test-Path $keytoolPath)) {
        throw "keytool not found. Install JDK 17 and add it to PATH."
    }
} else {
    $keytoolPath = $keytool.Source
}

& $keytoolPath -genkeypair -v `
    -keystore $jks `
    -alias kaya-staff-upload `
    -keyalg RSA `
    -keysize 2048 `
    -validity 10000 `
    -storepass $pass `
    -keypass $pass `
    -dname "CN=Kaya Staff, OU=Mobile, O=Kaya CRM, L=Worldwide, ST=NA, C=TR"

$storePath = $jks.Replace("\", "/")
@"
storePassword=$pass
keyPassword=$pass
keyAlias=kaya-staff-upload
storeFile=$storePath
"@ | Set-Content -Path $props -Encoding ASCII -NoNewline

Write-Host "Wrote $jks"
Write-Host "Wrote $props"
Write-Host "BACK THESE UP OFFLINE. They are gitignored."

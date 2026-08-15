# Downloads the official Gradle 8.9 wrapper JAR (needed once if missing).
$ErrorActionPreference = "Stop"
$dest = Join-Path $PSScriptRoot "..\gradle\wrapper\gradle-wrapper.jar"
New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/gradle/gradle/v8.9.0/gradle/wrapper/gradle-wrapper.jar" -OutFile $dest
Write-Output "Wrote $dest ($((Get-Item $dest).Length) bytes)"

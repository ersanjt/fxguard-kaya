# Capture Play listing screenshots from StorePreviewActivity (fictional data).
$ErrorActionPreference = "Stop"
$sdk = @($env:ANDROID_HOME, $env:ANDROID_SDK_ROOT, "$env:LOCALAPPDATA\Android\Sdk") |
    Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $sdk) { throw "Android SDK not found" }
$adb = Join-Path $sdk "platform-tools\adb.exe"
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not (Test-Path (Join-Path $root "store"))) {
    $root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
}
$pkg = "io.fxguard.kaya.staff"
$act = "io.fxguard.kaya.store.StorePreviewActivity"
$destRepo = Join-Path $root "store\play\images\phoneScreenshots"
$destLane = Join-Path $root "android-app\fastlane\metadata\android\en-US\images\phoneScreenshots"
$destDesk = Join-Path $env:USERPROFILE "Desktop\Kaya-Play-Listing"
New-Item -ItemType Directory -Force -Path $destRepo, $destLane | Out-Null
if (Test-Path $destDesk) { New-Item -ItemType Directory -Force -Path $destDesk | Out-Null }

$shots = @(
    @{ screen = "dashboard"; file = "01-dashboard.png"; lane = "01.png"; listing = "screen-01-dashboard.png" },
    @{ screen = "inbox"; file = "02-inbox.png"; lane = "02.png"; listing = "screen-02-inbox.png" },
    @{ screen = "customers"; file = "03-customers.png"; lane = "03.png"; listing = "screen-03-customers.png" },
    @{ screen = "announcements"; file = "04-notifications.png"; lane = "04.png"; listing = "screen-04-notifications.png" }
)

& $adb shell am force-stop $pkg | Out-Null
Start-Sleep -Seconds 1
foreach ($s in $shots) {
    & $adb shell am start -S -n "$pkg/$act" --es screen $s.screen | Out-Null
    Start-Sleep -Seconds 4
    $tmp = Join-Path $env:TEMP ("kaya-store-" + $s.screen + ".png")
    cmd /c "`"$adb`" exec-out screencap -p > `"$tmp`""
    Copy-Item $tmp (Join-Path $destRepo $s.file) -Force
    Copy-Item $tmp (Join-Path $destLane $s.lane) -Force
    if (Test-Path $destDesk) {
        Copy-Item $tmp (Join-Path $destDesk $s.listing) -Force
    }
    Write-Host "captured $($s.screen) -> $($s.file)"
}
Write-Host "done"

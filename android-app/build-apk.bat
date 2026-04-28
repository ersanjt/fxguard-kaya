@echo off
echo ========================================
echo   ساخت APK اپ صرافی کایا
echo ========================================
echo.

REM اگر Android Studio نصب دارید، مسیر JBR را تنظیم کنید:
if exist "C:\Program Files\Android\Android Studio\jbr" (
    set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
    echo Java از Android Studio استفاده می‌شود.
) else if exist "%LOCALAPPDATA%\Programs\Android Studio\jbr" (
    set "JAVA_HOME=%LOCALAPPDATA%\Programs\Android Studio\jbr"
    echo Java از Android Studio استفاده می‌شود.
) else (
    echo خطا: Java یافت نشد!
    echo لطفاً Android Studio نصب کنید یا JAVA_HOME را تنظیم کنید.
    pause
    exit /b 1
)

echo.
echo در حال ساخت APK...
call gradlew.bat assembleDebug

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================
    echo   APK با موفقیت ساخته شد!
    echo ========================================
    echo.
    echo مسیر فایل:
    echo   app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo این فایل را به موبایل منتقل کنید و نصب کنید.
    echo.
    start "" "app\build\outputs\apk\debug"
) else (
    echo.
    echo خطا در ساخت. لطفاً Android Studio را باز کنید و Build ^> Build APK را امتحان کنید.
)

pause

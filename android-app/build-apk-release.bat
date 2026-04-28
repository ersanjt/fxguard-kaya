@echo off
echo ========================================
echo   ساخت APK نسخه Release (برای تست نصب)
echo ========================================
echo.
echo نسخه Release ممکن است روی گوشی Tecno و Android 15 بهتر نصب شود.
echo.

REM Java از Android Studio
if exist "C:\Program Files\Android\Android Studio\jbr" (
    set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
) else if exist "%LOCALAPPDATA%\Programs\Android Studio\jbr" (
    set "JAVA_HOME=%LOCALAPPDATA%\Programs\Android Studio\jbr"
) else (
    echo خطا: Java یافت نشد! Android Studio نصب کنید.
    pause
    exit /b 1
)

echo در حال ساخت APK Release...
call gradlew.bat assembleRelease

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================
    echo   APK Release ساخته شد!
    echo ========================================
    echo.
    echo مسیر: app\build\outputs\apk\release\app-release.apk
    echo.
    start "" "app\build\outputs\apk\release"
) else (
    echo خطا در ساخت. از Android Studio: Build ^> Build Bundle(s) ^> Build APK(s)
    echo و گزینه release را انتخاب کنید.
)

pause

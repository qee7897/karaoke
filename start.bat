@echo off
chcp 65001 >nul 2>&1
title 🎤 Karaoke Search
echo.
echo ═══════════════════════════════════════════
echo   🎤 Karaoke Search - กำลังเริ่มต้น...
echo ═══════════════════════════════════════════
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ไม่พบ Node.js!
    echo.
    echo กรุณาติดตั้ง Node.js จาก: https://nodejs.org
    echo แล้วลองรันใหม่อีกครั้ง
    echo.
    pause
    exit /b 1
)

echo ✅ พบ Node.js
echo 🚀 กำลังเริ่มเซิร์ฟเวอร์...
echo.

node server.js

pause

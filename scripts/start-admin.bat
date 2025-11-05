@echo off
echo ========================================
echo    Relay GO 管理後台啟動腳本
echo ========================================
echo.

cd /d "%~dp0.."

echo 檢查 Node.js 環境...
node --version >nul 2>&1
if errorlevel 1 (
    echo 錯誤: 未找到 Node.js，請先安裝 Node.js
    pause
    exit /b 1
)

echo 檢查依賴套件...
if not exist "node_modules" (
    echo 安裝依賴套件...
    npm install
)

echo.
echo 啟動管理後台服務...
echo 服務地址: http://localhost:3001
echo 測試帳號: admin@example.com
echo 測試密碼: admin123456
echo.
echo 按 Ctrl+C 停止服務
echo ========================================

npm run dev

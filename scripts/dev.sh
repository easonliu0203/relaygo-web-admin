#!/bin/bash

# 包車服務管理後台 - 開發環境啟動腳本

set -e

echo "🚀 啟動包車服務管理後台"
echo "========================"

# 檢查是否在正確的目錄
if [ ! -f "package.json" ]; then
    echo "❌ 錯誤: 請在 web-admin 目錄中執行此腳本"
    exit 1
fi

# 檢查環境變數
if [ ! -f ".env.local" ]; then
    echo "❌ 錯誤: 未找到 .env.local 檔案"
    echo "請先執行 ./scripts/setup.sh 進行環境設定"
    exit 1
fi

# 檢查依賴是否已安裝
if [ ! -d "node_modules" ]; then
    echo "📦 安裝專案依賴..."
    npm install
fi

# 檢查後端 API 是否運行
echo "🔍 檢查後端 API 連接..."
source .env.local
API_URL=${NEXT_PUBLIC_API_URL:-"http://localhost:3000"}

if curl -s "$API_URL/api/health" > /dev/null 2>&1; then
    echo "✅ 後端 API 連接正常 ($API_URL)"
else
    echo "⚠️  警告: 無法連接到後端 API ($API_URL)"
    echo "請確認後端服務正在運行"
    echo ""
    read -p "是否繼續啟動管理後台? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "已取消啟動"
        exit 1
    fi
fi

# 檢查埠號是否被佔用
PORT=3001
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  警告: 埠號 $PORT 已被佔用"
    echo "請關閉佔用該埠號的程序，或修改 package.json 中的啟動埠號"
    exit 1
fi

# 顯示啟動資訊
echo ""
echo "🎯 啟動資訊:"
echo "   - 管理後台: http://localhost:$PORT"
echo "   - 後端 API: $API_URL"
echo "   - 健康檢查: http://localhost:$PORT/health"
echo ""
echo "🔐 測試帳號:"
echo "   - 帳號: admin@example.com"
echo "   - 密碼: admin123456"
echo ""

# 啟動開發伺服器
echo "🚀 啟動開發伺服器..."
echo "按 Ctrl+C 停止服務"
echo ""

npm run dev

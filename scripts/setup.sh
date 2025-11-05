#!/bin/bash

# 包車服務管理後台 - 環境設定腳本
# 此腳本會自動設定開發環境並啟動管理後台

set -e

echo "🚀 包車服務管理後台 - 環境設定"
echo "=================================="

# 檢查 Node.js 版本
echo "📋 檢查系統環境..."
if ! command -v node &> /dev/null; then
    echo "❌ 錯誤: 未安裝 Node.js"
    echo "請先安裝 Node.js 18.0.0 或更高版本"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ 錯誤: Node.js 版本過低 (當前: $NODE_VERSION, 需要: $REQUIRED_VERSION+)"
    exit 1
fi

echo "✅ Node.js 版本: $NODE_VERSION"

# 檢查 npm 版本
NPM_VERSION=$(npm -v)
echo "✅ npm 版本: $NPM_VERSION"

# 檢查是否在正確的目錄
if [ ! -f "package.json" ]; then
    echo "❌ 錯誤: 請在 web-admin 目錄中執行此腳本"
    exit 1
fi

# 安裝依賴
echo ""
echo "📦 安裝專案依賴..."
npm install

# 檢查環境變數檔案
echo ""
echo "🔧 檢查環境配置..."
if [ ! -f ".env.local" ]; then
    if [ -f ".env.local.example" ]; then
        echo "📋 複製環境變數範例檔案..."
        cp .env.local.example .env.local
        echo "⚠️  請編輯 .env.local 檔案並填入正確的配置值"
    else
        echo "⚠️  未找到 .env.local 檔案，請手動建立並配置環境變數"
    fi
else
    echo "✅ 環境變數檔案已存在"
fi

# 檢查必要的環境變數
echo ""
echo "🔍 檢查環境變數配置..."
source .env.local 2>/dev/null || true

MISSING_VARS=()

if [ -z "$NEXT_PUBLIC_API_URL" ]; then
    MISSING_VARS+=("NEXT_PUBLIC_API_URL")
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    MISSING_VARS+=("NEXT_PUBLIC_SUPABASE_URL")
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    MISSING_VARS+=("NEXT_PUBLIC_SUPABASE_ANON_KEY")
fi

if [ -z "$NEXT_PUBLIC_FIREBASE_PROJECT_ID" ]; then
    MISSING_VARS+=("NEXT_PUBLIC_FIREBASE_PROJECT_ID")
fi

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo "⚠️  警告: 以下環境變數尚未設定:"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "請編輯 .env.local 檔案並填入正確的配置值"
    echo "參考文件: README.md"
else
    echo "✅ 環境變數配置完整"
fi

# 類型檢查
echo ""
echo "🔍 執行類型檢查..."
npm run type-check

# 程式碼檢查
echo ""
echo "🔍 執行程式碼檢查..."
npm run lint

echo ""
echo "✅ 環境設定完成！"
echo ""
echo "🎉 接下來的步驟:"
echo "1. 確認 .env.local 中的環境變數已正確設定"
echo "2. 確認後端 API 服務正在運行 (http://localhost:3000)"
echo "3. 執行 'npm run dev' 啟動開發伺服器"
echo "4. 訪問 http://localhost:3001 開始使用管理後台"
echo ""
echo "📚 更多資訊請參考 README.md"

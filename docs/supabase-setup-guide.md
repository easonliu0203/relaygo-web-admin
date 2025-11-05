# Supabase 資料庫設定指南

## 🎯 概述

本指南將協助您完成 Supabase PostgreSQL 資料庫的完整設定，包括專案建立、資料表建立、測試資料插入等步驟。

## 📋 前置需求

- 網路連接
- 現代瀏覽器 (Chrome, Firefox, Safari, Edge)
- 電子郵件帳號 (用於註冊 Supabase)

## 🚀 步驟 1: 建立 Supabase 專案

### 1.1 註冊 Supabase 帳號

1. 訪問 [Supabase 官網](https://supabase.com)
2. 點擊右上角 "Start your project" 按鈕
3. 選擇註冊方式：
   - **推薦**: 使用 GitHub 帳號 (方便後續整合)
   - 或使用 Google 帳號
   - 或使用電子郵件註冊

### 1.2 建立新專案

1. 登入後點擊 "New Project" 按鈕
2. 選擇或建立組織 (Organization)
3. 填寫專案資訊：
   ```
   Project Name: ride-booking-system
   Database Password: 設定強密碼 (請記住此密碼！)
   Region: Southeast Asia (Singapore) - 最接近台灣
   Pricing Plan: Free (封測階段足夠使用)
   ```
4. 點擊 "Create new project"
5. 等待 1-2 分鐘讓專案建立完成

### 1.3 獲取連接資訊

1. 專案建立完成後，點擊左側選單 "Settings" → "API"
2. 複製以下重要資訊：
   ```
   Project URL: https://your-project-id.supabase.co
   Project API keys:
   - anon (public): eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   - service_role (secret): eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

## 🔧 步驟 2: 配置環境變數

### 2.1 編輯環境變數檔案

在 `web-admin/.env.local` 檔案中填入 Supabase 資訊：

```env
# Supabase 配置 (主要資料庫)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2.2 重要提醒

- ⚠️ **service_role key** 具有完整資料庫權限，請妥善保管
- ⚠️ 不要將 service_role key 提交到版本控制系統
- ✅ anon key 可以安全地在前端使用

## 🗄️ 步驟 3: 建立資料庫結構

### 3.1 使用 SQL 編輯器

1. 在 Supabase 專案中，點擊左側選單 "SQL Editor"
2. 點擊 "New query" 建立新查詢
3. 複製 `web-admin/database/supabase-setup.sql` 的完整內容
4. 貼上到 SQL 編輯器中
5. 點擊 "Run" 按鈕執行腳本

### 3.2 驗證資料表建立

1. 點擊左側選單 "Table Editor"
2. 確認以下資料表已成功建立：
   - ✅ users (用戶表)
   - ✅ bookings (訂單表)
   - ✅ payments (支付表)
   - ✅ chat_rooms (聊天室表)
   - ✅ chat_messages (聊天訊息表)
   - ✅ driver_documents (司機文件表)
   - ✅ driver_locations (司機位置表)
   - ✅ system_settings (系統設定表)

### 3.3 檢查預設資料

1. 點擊 "users" 表，確認有一筆管理員資料：
   ```
   email: admin@example.com
   name: 系統管理員
   role: admin
   ```

2. 點擊 "system_settings" 表，確認有預設系統設定

## 📊 步驟 4: 插入測試資料 (可選)

### 4.1 執行測試資料腳本

1. 在 SQL 編輯器中建立新查詢
2. 複製 `web-admin/database/test-data.sql` 的完整內容
3. 貼上並執行腳本

### 4.2 驗證測試資料

執行後應該會有：
- 5 個測試客戶
- 5 個測試司機
- 5 個測試訂單
- 相關的支付記錄和聊天記錄

## 🔒 步驟 5: 設定安全性 (重要)

### 5.1 Row Level Security (RLS)

腳本已自動啟用 RLS 並建立基本政策：
- 管理員可以存取所有資料
- 用戶只能存取自己的資料
- 客戶只能查看自己的訂單
- 司機只能查看指派給自己的訂單

### 5.2 API 金鑰管理

- **anon key**: 用於前端，權限受 RLS 限制
- **service_role key**: 用於後端 API，具有完整權限

## 🧪 步驟 6: 測試連接

### 6.1 啟動管理後台

```bash
cd web-admin
npm run dev
```

### 6.2 訪問健康檢查頁面

訪問 http://localhost:3001/health 檢查 Supabase 連接狀態

### 6.3 測試登入

使用預設管理員帳號登入：
- 帳號: admin@example.com
- 密碼: admin123456

## 💰 Supabase 免費方案限制

### 免費方案包含：
- ✅ 500MB 資料庫儲存空間
- ✅ 5GB 頻寬/月
- ✅ 50,000 月活躍用戶
- ✅ 500MB 檔案儲存
- ✅ 即時功能
- ✅ 7 天資料備份

### 封測階段建議：
- 免費方案完全足夠封測使用
- 可支援數百個測試用戶
- 建議定期清理測試資料

## 🔧 常見問題

### Q1: 忘記資料庫密碼怎麼辦？
A: 在專案設定中可以重設資料庫密碼，但會影響現有連接。

### Q2: 如何備份資料？
A: Supabase 提供自動備份，也可以在 Settings → Database 中手動備份。

### Q3: 如何查看資料庫使用量？
A: 在專案儀表板中可以查看儲存空間和頻寬使用情況。

### Q4: RLS 政策如何修改？
A: 在 Authentication → Policies 中可以管理 RLS 政策。

### Q5: 如何升級到付費方案？
A: 在 Settings → Billing 中可以升級方案。

## 📞 技術支援

如遇到問題，可以參考：
- [Supabase 官方文件](https://supabase.com/docs)
- [Supabase 社群論壇](https://github.com/supabase/supabase/discussions)
- 專案 README.md 檔案

## ✅ 設定完成檢查清單

- [ ] Supabase 專案已建立
- [ ] 環境變數已正確配置
- [ ] 資料庫結構已建立
- [ ] 預設管理員帳號存在
- [ ] 系統設定已插入
- [ ] 測試資料已插入 (可選)
- [ ] RLS 政策已啟用
- [ ] 管理後台可以正常連接
- [ ] 健康檢查顯示正常

完成以上步驟後，您的 Supabase 資料庫就設定完成了！

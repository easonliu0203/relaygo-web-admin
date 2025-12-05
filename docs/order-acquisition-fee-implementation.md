# 訂單促成費功能實作文件

## 📋 功能概述

在 Web Admin（公司端）新增「廣告與行銷」設定頁面，允許管理員設定和管理「訂單促成費」。

### 核心特性
- ✅ 管理員可隨時修改訂單促成費金額
- ✅ 金額修改僅適用於新訂單（快照機制）
- ✅ 已成交訂單金額不會回溯修改
- ✅ 支援啟用/停用功能
- ✅ 提供統計視圖追蹤費用

---

## 🗄️ 資料庫設計

### 1. System Settings 表新增設定

```sql
-- 新增訂單促成費設定
INSERT INTO system_settings (key, value, description) 
VALUES (
  'order_acquisition_fee',
  '{"amount": 500, "currency": "TWD", "enabled": true, "updated_at": "2025-12-05T00:00:00Z"}',
  '訂單促成費設定（Order Acquisition Fee / Referral Fee）'
);
```

**設定結構**：
```json
{
  "amount": 500,           // 促成費金額（新台幣）
  "currency": "TWD",       // 幣別
  "enabled": true,         // 是否啟用
  "updated_at": "2025-12-05T00:00:00Z"  // 最後更新時間
}
```

### 2. Bookings 表新增欄位

```sql
ALTER TABLE bookings 
ADD COLUMN acquisition_fee_snapshot DECIMAL(10,2) DEFAULT 0,
ADD COLUMN acquisition_fee_applied BOOLEAN DEFAULT false;
```

**欄位說明**：
- `acquisition_fee_snapshot`: 訂單建立時的促成費金額（快照）
- `acquisition_fee_applied`: 是否已套用促成費

### 3. 統計視圖

```sql
CREATE OR REPLACE VIEW order_acquisition_fee_stats AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_orders,
  COUNT(CASE WHEN acquisition_fee_applied = true THEN 1 END) as orders_with_fee,
  SUM(CASE WHEN acquisition_fee_applied = true THEN acquisition_fee_snapshot ELSE 0 END) as total_fees,
  AVG(CASE WHEN acquisition_fee_applied = true THEN acquisition_fee_snapshot END) as avg_fee_per_order
FROM bookings
WHERE status NOT IN ('cancelled', 'refunded')
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## 🖥️ Web Admin 介面

### 頁面路徑
- **URL**: `/settings/marketing`
- **檔案**: `src/app/settings/marketing/page.tsx`

### 功能特性

#### 1. 當前設定統計卡片
- 顯示當前訂單促成費金額
- 顯示啟用狀態
- 顯示最後更新時間

#### 2. 設定表單
- **訂單促成費金額**：InputNumber 輸入框
  - 最小值：0
  - 最大值：10,000
  - 步進：100
  - 前綴：NT$
  
- **啟用狀態**：Switch 開關
  - 已啟用 / 已停用

#### 3. 重要提示
- 提醒管理員修改僅適用於新訂單
- 說明已成交訂單不會回溯修改

#### 4. 功能說明文件
- 什麼是訂單促成費
- 如何運作
- 注意事項

### 使用流程

1. 進入「系統設定」→「廣告與行銷」
2. 查看當前設定統計
3. 修改訂單促成費金額或啟用狀態
4. 點擊「儲存設定」
5. 系統顯示成功訊息
6. 新設定將套用於後續建立的訂單

---

## 📁 檔案清單

### 新增檔案
1. `database/migrations/add_order_acquisition_fee.sql` - 資料庫 Migration
2. `src/app/settings/marketing/page.tsx` - 廣告與行銷設定頁面
3. `docs/order-acquisition-fee-implementation.md` - 實作文件（本文件）

### 修改檔案
1. `src/app/settings/page.tsx` - 新增「廣告與行銷」選單項目

---

## 🚀 部署狀態

### ✅ 已完成
1. 資料庫 Migration 已執行
2. Web Admin 程式碼已推送到 GitHub
3. Vercel 將自動部署到生產環境

### 📍 部署資訊
- **GitHub Repo**: https://github.com/easonliu0203/relaygo-web-admin
- **Commit**: 3872a5c
- **Vercel URL**: https://admin.relaygo.pro

---

## ✅ 測試檢查清單

### 功能測試
- [ ] 頁面正常載入
- [ ] 顯示當前設定統計
- [ ] 可以修改促成費金額
- [ ] 可以切換啟用狀態
- [ ] 儲存設定成功
- [ ] 取消變更功能正常
- [ ] 重新整理功能正常

### 資料驗證
- [x] 設定正確儲存到資料庫
- [x] bookings 表新增欄位成功
- [x] 統計視圖建立成功

---

## 📝 變更記錄

### 2025-12-05
- ✅ 建立資料庫 Schema
- ✅ 新增 Web Admin 設定頁面
- ✅ 更新設定選單
- ✅ 執行資料庫 Migration
- ✅ 推送程式碼到 GitHub
- ✅ 建立實作文件


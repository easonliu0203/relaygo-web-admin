# 修復：客戶推廣人管理詳情頁面崩潰問題

## 🐛 問題描述

**錯誤類型**: `TypeError: Cannot read properties of null (reading 'substring')`

**發生位置**: 客戶推廣人管理 > 查看詳情頁面

**錯誤堆疊**:
```
TypeError: Cannot read properties of null (reading 'substring')
    at render (page-f8dafed2c0505bb4.js:1:1622)
```

## 🔍 根本原因

在推廣人詳情頁面中，有兩個表格欄位直接調用 `.substring()` 方法而沒有檢查值是否為 `null`：

1. **推薦記錄表格** - `first_booking_id` 欄位（第 184 行）
2. **分潤記錄表格** - `booking_id` 欄位（第 200 行）

當推薦記錄中的 `first_booking_id` 或分潤記錄中的 `booking_id` 為 `null` 時，調用 `.substring(0, 8)` 會導致頁面崩潰。

## ✅ 修復內容

### 1. 修復推薦記錄表格（第 181-185 行）

**修復前**:
```typescript
{
  title: '首次訂單 ID',
  dataIndex: 'first_booking_id',
  key: 'first_booking_id',
  render: (id: string) => <Text code>{id.substring(0, 8)}...</Text>,
},
```

**修復後**:
```typescript
{
  title: '首次訂單 ID',
  dataIndex: 'first_booking_id',
  key: 'first_booking_id',
  render: (id: string | null) => id ? <Text code>{id.substring(0, 8)}...</Text> : <Text type="secondary">-</Text>,
},
```

### 2. 修復分潤記錄表格（第 196-201 行）

**修復前**:
```typescript
{
  title: '訂單 ID',
  dataIndex: 'booking_id',
  key: 'booking_id',
  render: (id: string) => <Text code>{id.substring(0, 8)}...</Text>,
},
```

**修復後**:
```typescript
{
  title: '訂單 ID',
  dataIndex: 'booking_id',
  key: 'booking_id',
  render: (id: string | null) => id ? <Text code>{id.substring(0, 8)}...</Text> : <Text type="secondary">-</Text>,
},
```

### 3. 更新 TypeScript 接口定義

**Referral 接口**（第 57-63 行）:
```typescript
interface Referral {
  id: string;
  referee_id: string;
  referee_name: string;
  first_booking_id: string | null;  // ✅ 允許 null
  created_at: string;
}
```

**CommissionRecord 接口**（第 65-74 行）:
```typescript
interface CommissionRecord {
  id: string;
  booking_id: string | null;  // ✅ 允許 null
  order_amount: number;
  commission_amount: number;
  commission_type: 'fixed' | 'percent';
  commission_rate: number | null;
  commission_status: 'pending' | 'paid' | 'cancelled';
  used_at: string;
}
```

### 4. 額外修復：網紅管理頁面

**文件**: `web-admin/src/app/marketing/influencers/page.tsx`

為了防止類似問題，也為網紅 ID 欄位添加了 null 檢查（第 142-157 行）。

## 📝 修改的文件

1. ✅ `web-admin/src/app/marketing/affiliates/[id]/page.tsx`
   - 修復推薦記錄表格的 `first_booking_id` 渲染
   - 修復分潤記錄表格的 `booking_id` 渲染
   - 更新 TypeScript 接口定義

2. ✅ `web-admin/src/app/marketing/influencers/page.tsx`
   - 為網紅 ID 欄位添加 null 檢查（預防性修復）

## 🧪 測試步驟

1. 啟動 Web Admin 開發服務器
2. 導航到「客戶推廣人管理」頁面
3. 點擊任意推廣人的「查看詳情」按鈕
4. 確認頁面正常渲染，沒有 JavaScript 錯誤
5. 檢查推薦記錄和分潤記錄表格是否正確顯示
6. 對於 `null` 值的訂單 ID，應該顯示 `-`

## 🎯 預期結果

- ✅ 頁面不再崩潰
- ✅ 當訂單 ID 為 `null` 時，顯示 `-` 而不是錯誤
- ✅ 當訂單 ID 存在時，正常顯示前 8 個字符
- ✅ TypeScript 類型檢查通過

## 📌 相關問題

這個問題與推廣人系統 Phase 2 實現相關，特別是在處理推薦記錄時，某些推薦可能還沒有關聯的首次訂單（`first_booking_id` 為 `null`）。

## 🔧 最佳實踐

在處理可能為 `null` 或 `undefined` 的值時，應該：

1. **添加 null 檢查**: 使用三元運算符或可選鏈
2. **更新類型定義**: 在 TypeScript 接口中明確標記可為 `null` 的字段
3. **提供後備顯示**: 當值為 `null` 時顯示有意義的替代內容（如 `-`）

**示例**:
```typescript
render: (value: string | null) => 
  value ? <Text>{value.substring(0, 8)}...</Text> : <Text type="secondary">-</Text>
```

## ✅ 修復狀態

- [x] 問題已識別
- [x] 代碼已修復
- [x] TypeScript 類型已更新
- [x] 無編譯錯誤
- [ ] 需要測試驗證

---

**修復日期**: 2026-01-20  
**修復人員**: AI Assistant  
**相關文檔**: `AFFILIATE_SYSTEM_PHASE3_COMPLETE.md`


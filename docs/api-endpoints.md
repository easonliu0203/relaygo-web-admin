# 訂單促成費 API 端點文件

## 概述

本文件說明訂單促成費功能使用的 API 端點。

---

## 端點列表

### 1. 讀取訂單促成費設定

**端點**: 透過 Supabase 直接查詢  
**方法**: `GET`  
**資料表**: `system_settings`

#### 請求範例

```typescript
const { data, error } = await supabase
  .from('system_settings')
  .select('value')
  .eq('key', 'order_acquisition_fee')
  .single();
```

#### 回應範例

```json
{
  "value": {
    "amount": 500,
    "currency": "TWD",
    "enabled": true,
    "updated_at": "2025-12-05T00:00:00Z"
  }
}
```

#### 回應欄位說明

| 欄位 | 類型 | 說明 |
|------|------|------|
| `amount` | number | 訂單促成費金額（新台幣） |
| `currency` | string | 幣別（固定為 "TWD"） |
| `enabled` | boolean | 是否啟用 |
| `updated_at` | string | 最後更新時間（ISO 8601 格式） |

---

### 2. 更新訂單促成費設定

**端點**: 透過 Supabase 直接更新  
**方法**: `UPDATE`  
**資料表**: `system_settings`

#### 請求範例

```typescript
const newConfig = {
  amount: 600,
  currency: 'TWD',
  enabled: true,
  updated_at: new Date().toISOString(),
};

const { error } = await supabase
  .from('system_settings')
  .update({ 
    value: newConfig,
    updated_at: new Date().toISOString(),
  })
  .eq('key', 'order_acquisition_fee');
```

#### 請求參數

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `amount` | number | 是 | 訂單促成費金額（0-10000） |
| `currency` | string | 是 | 幣別（固定為 "TWD"） |
| `enabled` | boolean | 是 | 是否啟用 |
| `updated_at` | string | 是 | 更新時間（ISO 8601 格式） |

#### 回應範例

```json
{
  "error": null
}
```

---

### 3. 查詢訂單促成費統計

**端點**: 透過 Supabase 查詢視圖  
**方法**: `GET`  
**資料表**: `order_acquisition_fee_stats` (VIEW)

#### 請求範例

```typescript
const { data, error } = await supabase
  .from('order_acquisition_fee_stats')
  .select('*')
  .order('date', { ascending: false })
  .limit(30);
```

#### 回應範例

```json
[
  {
    "date": "2025-12-05",
    "total_orders": 10,
    "orders_with_fee": 8,
    "total_fees": 4000,
    "avg_fee_per_order": 500
  },
  {
    "date": "2025-12-04",
    "total_orders": 15,
    "orders_with_fee": 12,
    "total_fees": 6000,
    "avg_fee_per_order": 500
  }
]
```

#### 回應欄位說明

| 欄位 | 類型 | 說明 |
|------|------|------|
| `date` | string | 日期 |
| `total_orders` | number | 當日總訂單數 |
| `orders_with_fee` | number | 套用促成費的訂單數 |
| `total_fees` | number | 當日促成費總額 |
| `avg_fee_per_order` | number | 平均每筆訂單促成費 |

---

## 錯誤處理

### 常見錯誤

#### 1. 設定不存在

```json
{
  "error": {
    "message": "No rows found",
    "code": "PGRST116"
  }
}
```

**解決方案**: 執行 Migration 腳本建立預設設定

#### 2. 權限不足

```json
{
  "error": {
    "message": "permission denied",
    "code": "42501"
  }
}
```

**解決方案**: 確認使用正確的 Supabase Key（ANON_KEY 或 SERVICE_ROLE_KEY）

#### 3. 資料驗證失敗

```json
{
  "error": {
    "message": "invalid input syntax for type numeric",
    "code": "22P02"
  }
}
```

**解決方案**: 確認 amount 為有效數字（0-10000）

---

## 安全性考量

### 1. 權限控制
- 只有管理員可以修改設定
- 使用 Supabase Row Level Security (RLS) 保護資料

### 2. 資料驗證
- 前端驗證：金額範圍 0-10000
- 後端驗證：資料類型和格式檢查

### 3. 審計追蹤
- 每次更新都記錄 `updated_at` 時間戳
- 可追蹤設定變更歷史

---

## 使用範例

### 完整流程範例

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 1. 讀取當前設定
async function getCurrentFee() {
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'order_acquisition_fee')
    .single();

  if (error) {
    console.error('讀取失敗:', error);
    return null;
  }

  return data.value;
}

// 2. 更新設定
async function updateFee(amount: number, enabled: boolean) {
  const newConfig = {
    amount,
    currency: 'TWD',
    enabled,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('system_settings')
    .update({ 
      value: newConfig,
      updated_at: new Date().toISOString(),
    })
    .eq('key', 'order_acquisition_fee');

  if (error) {
    console.error('更新失敗:', error);
    return false;
  }

  return true;
}

// 3. 查詢統計
async function getStats(days: number = 30) {
  const { data, error } = await supabase
    .from('order_acquisition_fee_stats')
    .select('*')
    .order('date', { ascending: false })
    .limit(days);

  if (error) {
    console.error('查詢統計失敗:', error);
    return [];
  }

  return data;
}
```

---

## 相關資源

- [Supabase 文件](https://supabase.com/docs)
- [實作文件](./order-acquisition-fee-implementation.md)
- [資料庫 Migration](../database/migrations/add_order_acquisition_fee.sql)


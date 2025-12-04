# 司機位置追蹤功能說明

## 功能概述

在公司端 Web Admin 的訂單詳情頁面中新增了司機位置追蹤顯示功能，讓管理員可以即時查看司機的位置資訊。

## 功能特點

### 三種定位資料

1. **出發定位** 🚗
   - 司機點擊「出發」按鈕時的位置座標
   - 顯示出發時間
   - 一次性記錄，不會更新

2. **到達定位** 📍
   - 司機到達目的地時的位置座標
   - 顯示到達時間
   - 一次性記錄，不會更新

3. **即時定位** 📡
   - 司機在行程中的即時位置
   - 當司機端 APP 在前景使用時，每分鐘更新一次
   - 顯示最後更新時間
   - 訂單進行中時，Web Admin 每 30 秒自動刷新

### 顯示內容

每個定位資料包含：
- 📍 **位置座標**：經度、緯度（精確到小數點後 6 位）
- 🕐 **時間戳記**：格式 YYYY-MM-DD HH:mm:ss
- 🗺️ **地圖連結**：可點擊的 Google Maps 和 Apple Maps 連結
- 📡 **狀態**：即時定位顯示司機線上/離線狀態

## 技術實現

### 後端 API

**端點**: `GET /api/admin/bookings/:id/locations`

**功能**:
- 從 Firebase Firestore 獲取位置資料
- 整合出發、到達和即時定位資料
- 返回格式化的位置資訊

**資料來源**:
- Firebase Firestore: `/bookings/{bookingId}/location_history` - 出發和到達定位
- Firebase Firestore: `/driver_locations/{driverId}` - 即時定位

**回應格式**:
```json
{
  "success": true,
  "data": {
    "departureLocation": {
      "latitude": 25.0330,
      "longitude": 121.5654,
      "googleMapsUrl": "https://maps.google.com/?q=25.0330,121.5654",
      "appleMapsUrl": "https://maps.apple.com/?q=25.0330,121.5654",
      "timestamp": "2025-11-22T14:30:00.000Z"
    },
    "arrivalLocation": { /* 同上 */ },
    "realtimeLocation": {
      /* 同上 */
      "isOnline": true
    }
  }
}
```

### 前端組件

**組件**: `DriverLocationTracking.tsx`

**功能**:
- 顯示三種定位資料
- 自動刷新即時定位（訂單進行中時每 30 秒）
- 手動刷新按鈕
- 空狀態處理

**使用方式**:
```tsx
<DriverLocationTracking 
  bookingId={orderId} 
  orderStatus={order.status} 
/>
```

### 頁面整合

**位置**: `src/app/orders/[id]/page.tsx`

**顯示條件**: 訂單已分配司機時顯示

**顯示位置**: 司機資訊卡片之後，路線資訊卡片之前

## 部署資訊

### Git 提交

1. **主要功能提交** (commit: `9243a20`)
   - 創建 API 端點
   - 創建前端組件
   - 整合到訂單詳情頁面

2. **依賴安裝提交** (commit: `838df27`)
   - 安裝 `firebase-admin` 依賴

### 環境配置

**必要環境變數** (`.env.local`):
```env
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

**注意**: `.env.local` 不會提交到 Git，需要在 Vercel 部署環境中手動配置。

### Vercel 部署

- **專案**: `relaygo-web-admin-ujnf`
- **域名**: `admin.relaygo.pro`
- **自動部署**: 推送到 `main` 分支後自動觸發

**部署狀態**: ✅ 已成功部署

## 使用說明

### 查看司機位置

1. 進入公司端 Web Admin
2. 導航到「訂單管理」
3. 點擊任一訂單查看詳情
4. 如果訂單已分配司機，會看到「司機位置追蹤」區塊
5. 點擊地圖連結可在新分頁中打開地圖應用程式

### 自動更新

- 訂單狀態為「進行中」或「已配對」時，即時定位每 30 秒自動更新
- 訂單完成後，顯示最後一次記錄的位置

### 手動刷新

點擊右上角的「重新整理」按鈕可手動刷新所有位置資料。

## 資料流程

```
司機 APP (Flutter)
    ↓ 點擊「出發」
Backend API
    ↓ 儲存位置
Firebase Firestore: /bookings/{id}/location_history
    ↓ 讀取
Web Admin API: /api/admin/bookings/:id/locations
    ↓ 顯示
Web Admin 訂單詳情頁面
```

## 相關文件

- **API 端點**: `src/app/api/admin/bookings/[id]/locations/route.ts`
- **前端組件**: `src/components/DriverLocationTracking.tsx`
- **訂單詳情頁**: `src/app/orders/[id]/page.tsx`
- **後端通知服務**: `backend/src/services/notification/NotificationService.ts`

## 已知限制

1. 即時定位依賴司機端 APP 在前景運行
2. 位置更新頻率為每分鐘一次（司機端）
3. Web Admin 自動刷新頻率為每 30 秒一次
4. 需要 Firebase Service Account Key 才能運作

## 未來改進建議

1. 使用 Firebase Realtime Listeners 實現真正的即時更新
2. 在地圖上顯示位置標記（整合 Google Maps API）
3. 顯示司機移動軌跡
4. 添加位置歷史記錄查詢功能
5. 支援多司機位置同時顯示（地圖視圖）

---

**建立日期**: 2025-11-22  
**版本**: 1.0.0  
**狀態**: ✅ 已部署到生產環境


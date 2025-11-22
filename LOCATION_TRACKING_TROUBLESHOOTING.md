# 司機位置追蹤功能故障排除指南

## 問題診斷

### 當前錯誤

```
SyntaxError: Unterminated string in JSON at position 674
```

**原因**: Vercel 環境變數中的 `FIREBASE_SERVICE_ACCOUNT_KEY` JSON 格式不正確。

---

## 解決方案

### 方法 1: 使用分離的環境變數（推薦）

不要將整個 JSON 作為單一環境變數，而是分別設置各個欄位：

**在 Vercel 專案設定中添加以下環境變數**:

```env
FIREBASE_PROJECT_ID=ride-platform-f1676
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@ride-platform-f1676.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
[從 firebase/service-account-key.json 複製完整的私鑰內容]
-----END PRIVATE KEY-----
```

**注意**: 
- `FIREBASE_PRIVATE_KEY` 應該包含完整的私鑰，包括 `-----BEGIN PRIVATE KEY-----` 和 `-----END PRIVATE KEY-----`
- 在 Vercel 中，私鑰的換行符會自動處理，直接複製貼上即可

然後修改 API 代碼以使用這些分離的環境變數。

### 方法 2: 正確格式化 JSON 字串

如果堅持使用單一 JSON 環境變數，需要確保：

1. **移除所有實際的換行符**
2. **將私鑰中的換行符替換為 `\n`**
3. **確保整個 JSON 在一行中**

**正確的格式**:
```json
{"type":"service_account","project_id":"ride-platform-f1676","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n[私鑰內容，每個換行符替換為 \\n]\\n-----END PRIVATE KEY-----\\n","client_email":"firebase-adminsdk-fbsvc@ride-platform-f1676.iam.gserviceaccount.com",...}
```

**關鍵點**:
- 私鑰中的每個換行符都必須是 `\\n`（雙反斜線 + n）
- 整個 JSON 必須在一行中
- 不能有任何實際的換行符

---

## 診斷步驟

### 1. 檢查 Vercel 部署日誌

部署後，查看 Vercel 函數日誌：

1. 進入 Vercel Dashboard
2. 選擇專案 `relaygo-web-admin-ujnf`
3. 點擊 "Deployments"
4. 選擇最新的部署
5. 點擊 "Functions" 標籤
6. 查找 `/api/admin/bookings/[id]/locations` 函數的日誌

**應該看到的日誌**:
```
📍 獲取訂單位置資料: { bookingId: '...' }
🔑 環境變數長度: ...
🔑 環境變數前 100 字元: {"type":"service_account","project_id":"ride-platform-f1676",...
✅ Firebase Admin SDK 初始化成功
📍 查詢路徑: /bookings/.../location_history
📍 找到的位置記錄數量: ...
```

### 2. 檢查 Firestore 資料

使用 Firebase Console 檢查資料是否存在：

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 選擇專案 `ride-platform-f1676`
3. 進入 Firestore Database
4. 查看以下路徑：
   - `/bookings/{訂單ID}/location_history` - 應該有出發和到達記錄
   - `/driver_locations/{司機ID}` - 應該有即時定位

**預期資料結構**:
```
/bookings/{bookingId}/location_history/{docId}
{
  status: "driver_departed" | "driver_arrived",
  latitude: 25.0330,
  longitude: 121.5654,
  googleMapsUrl: "https://maps.google.com/?q=25.0330,121.5654",
  appleMapsUrl: "https://maps.apple.com/?q=25.0330,121.5654",
  timestamp: Timestamp
}
```

### 3. 測試 API 端點

使用瀏覽器或 Postman 測試 API：

```
GET https://admin.relaygo.pro/api/admin/bookings/{訂單ID}/locations
```

**預期回應**:
```json
{
  "success": true,
  "data": {
    "departureLocation": { ... },
    "arrivalLocation": { ... },
    "realtimeLocation": { ... }
  }
}
```

---

## 常見問題

### Q: 為什麼所有位置都顯示「尚無資料」？

**可能原因**:
1. Firebase Admin SDK 初始化失敗（環境變數問題）
2. Firestore 中沒有位置資料
3. 訂單 ID 不正確
4. 司機尚未執行「出發」或「到達」操作

### Q: 如何驗證司機是否已出發？

檢查以下位置：
1. Firebase Firestore: `/bookings/{訂單ID}/location_history`
2. 聊天室訊息：應該有「司機已出發」的系統訊息
3. 訂單狀態：應該是「進行中」

### Q: 環境變數設置後需要重新部署嗎？

是的，修改環境變數後必須重新部署專案才能生效。

---

## 下一步

1. **選擇方法 1（推薦）**: 修改 API 代碼以使用分離的環境變數
2. **或選擇方法 2**: 正確格式化 JSON 環境變數
3. **重新部署**: 推送代碼或在 Vercel 中手動觸發部署
4. **測試**: 查看訂單詳情頁面，確認位置資料顯示正常

---

**建立日期**: 2025-11-22  
**最後更新**: 2025-11-22


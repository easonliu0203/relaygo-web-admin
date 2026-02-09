# Web Admin 電子郵件/密碼登入功能

## 📋 功能概述

Web Admin 管理後台已整合 Firebase Authentication 的電子郵件/密碼登入功能，與 Google 登入並存。

---

## ✅ 已實作的功能

### 1. **登入頁面 UI**
- ✅ 電子郵件輸入框（含格式驗證）
- ✅ 密碼輸入框（含最小長度驗證）
- ✅ 「記住我」選項
- ✅ 登入按鈕（含載入狀態）
- ✅ Google 登入按鈕
- ✅ 測試帳號快速登入

### 2. **Firebase Authentication 整合**
- ✅ 使用 `FirebaseService.signInWithEmailAndPassword()` 進行認證
- ✅ 獲取 Firebase ID Token
- ✅ 後端 API 驗證
- ✅ Token 儲存（Cookie + LocalStorage）

### 3. **錯誤處理**
- ✅ 帳號不存在（`auth/user-not-found`）
- ✅ 密碼錯誤（`auth/wrong-password`）
- ✅ 電子郵件格式無效（`auth/invalid-email`）
- ✅ 帳號已被停用（`auth/user-disabled`）
- ✅ 登入嘗試次數過多（`auth/too-many-requests`）

### 4. **用戶體驗**
- ✅ 載入狀態顯示
- ✅ 錯誤訊息提示
- ✅ 成功後自動導航到儀表板
- ✅ 已登入用戶自動重定向

---

## 🔧 技術實作

### 認證流程

```
1. 用戶輸入電子郵件和密碼
   ↓
2. Firebase Authentication 驗證
   ↓
3. 獲取 Firebase ID Token
   ↓
4. 後端 API 驗證 ID Token
   ↓
5. 儲存 JWT Token
   ↓
6. 導航到儀表板
```

### 核心代碼

#### `authStore.ts` - 登入方法
```typescript
login: async (email: string, password: string) => {
  // 1. 使用 Firebase Authentication 登入
  const userCredential = await FirebaseService.signInWithEmailAndPassword(email, password);
  
  // 2. 獲取 Firebase ID Token
  const idToken = await userCredential.user.getIdToken();
  
  // 3. 後端 API 驗證
  const response = await ApiService.loginWithGoogle(idToken);
  
  // 4. 儲存 token 和用戶資料
  Cookies.set('admin_token', token, { expires: 7 });
  localStorage.setItem('admin_token', token);
}
```

#### `login/page.tsx` - 登入頁面
```typescript
const handleSubmit = async (values: LoginForm) => {
  await login(values.email, values.password);
  toast.success('登入成功！');
  router.push('/dashboard');
};
```

---

## 📍 使用方式

### 方式 1：使用 Firebase 帳號登入

1. 打開登入頁面：https://admin.relaygo.pro/login
2. 輸入 Firebase 帳號的電子郵件和密碼
3. 點擊「登入」按鈕
4. 登入成功後自動導航到儀表板

### 方式 2：使用 Google 帳號登入

1. 打開登入頁面：https://admin.relaygo.pro/login
2. 點擊「使用 Google 帳號登入」按鈕
3. 選擇 Google 帳號
4. 登入成功後自動導航到儀表板

### 方式 3：使用測試帳號登入（開發環境）

1. 打開登入頁面
2. 點擊「使用測試帳號登入」
3. 自動填入測試帳號資料
4. 點擊「登入」按鈕

---

## 🧪 測試帳號

### 測試帳號（開發環境）
- **電子郵件**：admin@example.com
- **密碼**：admin123456

### Firebase 帳號（生產環境）
- 需要在 Firebase Console 中創建帳號
- 或使用 Google 帳號登入

---

## 🔐 安全性

### 1. **Firebase Authentication**
- ✅ 使用 Firebase 的安全認證機制
- ✅ 密碼加密儲存
- ✅ ID Token 驗證

### 2. **Token 管理**
- ✅ JWT Token 儲存在 Cookie（7 天過期）
- ✅ JWT Token 備份在 LocalStorage
- ✅ 登出時清除所有 Token

### 3. **錯誤處理**
- ✅ 不洩露敏感資訊
- ✅ 友善的錯誤訊息
- ✅ 登入嘗試次數限制

---

## 📊 功能對比

| 功能 | 電子郵件/密碼登入 | Google 登入 | 狀態 |
|------|----------------|------------|------|
| Firebase Authentication | ✅ | ✅ | 已實作 |
| ID Token 驗證 | ✅ | ✅ | 已實作 |
| 錯誤處理 | ✅ | ✅ | 已實作 |
| 載入狀態 | ✅ | ✅ | 已實作 |
| 自動導航 | ✅ | ✅ | 已實作 |
| Token 儲存 | ✅ | ✅ | 已實作 |

---

## 🐛 常見問題

### Q1: 登入失敗，顯示「帳號不存在」？

**A**: 請確認：
1. 電子郵件是否正確
2. 帳號是否已在 Firebase Console 中創建
3. 是否使用正確的 Firebase 專案

### Q2: 登入失敗，顯示「密碼錯誤」？

**A**: 請確認：
1. 密碼是否正確
2. 密碼是否至少 6 個字符
3. 是否有大小寫錯誤

### Q3: 如何創建新的管理員帳號？

**A**: 
1. 前往 Firebase Console
2. 選擇「Authentication」
3. 點擊「Add user」
4. 輸入電子郵件和密碼
5. 點擊「Add user」

---

## 📝 相關檔案

- **登入頁面**：`web-admin/src/app/login/page.tsx`
- **認證 Store**：`web-admin/src/store/authStore.ts`
- **Firebase 服務**：`web-admin/src/lib/firebase.ts`
- **API 服務**：`web-admin/src/services/api.ts`

---

**最後更新**：2026-02-09


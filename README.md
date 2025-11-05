# 包車服務管理後台

包車/接送叫車服務的完整管理後台系統，基於 Next.js 14 和 Ant Design 構建。

## 🚀 快速開始

### 環境要求

- Node.js 18.0.0 或更高版本
- npm 8.0.0 或更高版本
- PostgreSQL 15+ (通過 Supabase)
- Firebase 專案

### 安裝步驟

1. **克隆專案**
```bash
git clone <repository-url>
cd web-admin
```

2. **安裝依賴**
```bash
npm install
```

3. **環境配置**
```bash
cp .env.local.example .env.local
```

編輯 `.env.local` 檔案，填入以下配置：

```env
# Next.js 應用配置
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-nextauth-secret-key-here

# API 後端配置
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000

# Supabase 配置 (主要資料庫)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Firebase 配置 (認證和即時功能)
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# 管理員預設帳號
ADMIN_DEFAULT_EMAIL=admin@example.com
ADMIN_DEFAULT_PASSWORD=admin123456
```

4. **啟動開發伺服器**
```bash
npm run dev
```

5. **訪問應用**
- 管理後台：http://localhost:3001
- 登入頁面：http://localhost:3001/login

## 🔐 登入資訊

### 封測階段測試帳號
- **帳號**：admin@example.com
- **密碼**：admin123456

## 📊 功能模組

### 1. 儀表板
- 系統總覽統計
- 營收趨勢圖表
- 最近訂單列表
- 關鍵指標監控

### 2. 訂單管理
- 所有訂單查看
- 訂單狀態追蹤
- 手動派單功能
- 自動派單設定

### 3. 司機管理
- 司機資料管理
- 司機審核功能
- 司機績效統計
- 可用性管理

### 4. 客戶管理
- 客戶資料查看
- 訂單歷史記錄
- 客戶統計分析

### 5. 支付管理
- 交易記錄查看
- 線下支付確認
- 退款處理
- 支付統計

### 6. 系統設定
- 價格配置
- 派單設定
- 通知模板
- 系統參數

### 7. 報表統計
- 營收分析
- 司機績效
- 客戶統計
- 資料匯出

## 🏗️ 技術架構

### 前端技術棧
- **Next.js 14**：React 框架，使用 App Router
- **Ant Design 5**：UI 組件庫
- **TypeScript**：類型安全
- **Tailwind CSS**：樣式框架
- **Zustand**：狀態管理
- **React Query**：資料獲取
- **Recharts**：圖表庫

### 資料庫架構
- **PostgreSQL (Supabase)**：主要業務資料
- **Firebase**：即時功能和認證

### 開發工具
- **ESLint**：程式碼檢查
- **Prettier**：程式碼格式化
- **TypeScript**：類型檢查

## 📁 專案結構

```
web-admin/
├── src/
│   ├── app/                 # Next.js App Router 頁面
│   │   ├── dashboard/       # 儀表板
│   │   ├── orders/          # 訂單管理
│   │   ├── drivers/         # 司機管理
│   │   ├── customers/       # 客戶管理
│   │   ├── payments/        # 支付管理
│   │   ├── reports/         # 報表統計
│   │   ├── settings/        # 系統設定
│   │   └── login/           # 登入頁面
│   ├── components/          # 共用組件
│   │   ├── layout/          # 佈局組件
│   │   ├── auth/            # 認證組件
│   │   └── ui/              # UI 組件
│   ├── lib/                 # 工具庫
│   │   ├── supabase.ts      # Supabase 配置
│   │   └── firebase.ts      # Firebase 配置
│   ├── services/            # API 服務
│   ├── store/               # 狀態管理
│   ├── types/               # TypeScript 類型
│   └── hooks/               # 自定義 Hooks
├── docs/                    # 文件
├── public/                  # 靜態資源
└── package.json
```

## 🔧 開發指令

```bash
# 開發模式
npm run dev

# 建置專案
npm run build

# 啟動生產版本
npm run start

# 程式碼檢查
npm run lint

# 程式碼格式化
npm run lint:fix

# 類型檢查
npm run type-check
```

## 🌐 API 整合

管理後台與後端 API 的整合：

### API 基礎配置
- **基礎 URL**：http://localhost:3000
- **認證方式**：JWT Bearer Token
- **請求格式**：JSON
- **回應格式**：JSON

### 主要 API 端點
- `GET /api/admin/dashboard/stats` - 儀表板統計
- `GET /api/admin/bookings` - 訂單列表
- `POST /api/booking-flow/admin/bookings/:id/assign` - 手動派單
- `GET /api/admin/drivers` - 司機列表
- `GET /api/admin/payments` - 支付記錄
- `PUT /api/admin/settings` - 系統設定

## 🔒 安全性

### 認證機制
- JWT Token 認證
- 自動 Token 刷新
- 角色權限控制

### 資料保護
- HTTPS 加密傳輸
- 敏感資料加密儲存
- CSRF 防護

## 📱 響應式設計

- 支援桌面、平板、手機
- 自適應佈局
- 觸控友好介面

## 🚀 部署

### 開發環境
```bash
npm run dev
```

### 生產環境
```bash
npm run build
npm run start
```

### Docker 部署
```bash
docker build -t ride-booking-admin .
docker run -p 3001:3001 ride-booking-admin
```

## 🐛 故障排除

### 常見問題

1. **無法連接到後端 API**
   - 檢查 `NEXT_PUBLIC_API_URL` 環境變數
   - 確認後端服務正在運行

2. **Supabase 連接失敗**
   - 檢查 Supabase 配置
   - 確認 API 金鑰正確

3. **Firebase 認證問題**
   - 檢查 Firebase 專案配置
   - 確認 API 金鑰和專案 ID

### 日誌查看
```bash
# 開發模式日誌
npm run dev

# 生產模式日誌
npm run start
```

## 📞 技術支援

如有技術問題，請聯繫開發團隊或查看以下資源：

- [Next.js 文件](https://nextjs.org/docs)
- [Ant Design 文件](https://ant.design/docs/react/introduce)
- [Supabase 文件](https://supabase.com/docs)
- [Firebase 文件](https://firebase.google.com/docs)

## 📄 授權

本專案採用 MIT 授權條款。

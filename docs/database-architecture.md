# 資料庫架構說明

## 概述

本系統採用混合資料庫架構，結合 PostgreSQL 和 Firebase 的優勢，以滿足不同類型資料的儲存需求。

## 資料庫分工

### PostgreSQL (主要資料庫) - 通過 Supabase 託管

**負責儲存：**
- 業務核心資料（訂單、支付、用戶資料）
- 結構化資料和複雜查詢
- 交易資料和財務記錄
- 系統設定和配置

**優勢：**
- ACID 交易保證
- 複雜 SQL 查詢支援
- PostGIS 地理位置擴展
- 強一致性保證

### Firebase (輔助資料庫)

**負責儲存：**
- 即時聊天訊息
- 推播通知 tokens
- 檔案和圖片儲存
- 即時位置追蹤資料

**優勢：**
- 即時同步功能
- 離線支援
- 自動擴展
- 內建認證系統

## PostgreSQL 資料表結構

### 1. 用戶相關表

#### users (用戶主表)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'driver', 'admin')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  avatar TEXT,
  -- 司機專用欄位
  license_number VARCHAR(50),
  vehicle_type VARCHAR(10) CHECK (vehicle_type IN ('A', 'B', 'C', 'D')),
  vehicle_number VARCHAR(20),
  rating DECIMAL(3,2) DEFAULT 0,
  total_trips INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  -- 銀行帳戶資訊
  bank_name VARCHAR(100),
  account_number VARCHAR(50),
  account_name VARCHAR(100),
  -- 時間戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### driver_documents (司機文件)
```sql
CREATE TABLE driver_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('license', 'vehicle_registration', 'insurance', 'id_card')),
  url TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id),
  notes TEXT
);
```

### 2. 訂單相關表

#### bookings (預約訂單)
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID REFERENCES users(id) NOT NULL,
  driver_id UUID REFERENCES users(id),
  vehicle_type VARCHAR(10) NOT NULL CHECK (vehicle_type IN ('A', 'B', 'C', 'D')),
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  -- 時間資訊
  start_date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration INTEGER NOT NULL, -- 小時數
  -- 地點資訊
  pickup_location TEXT NOT NULL,
  pickup_latitude DECIMAL(10, 8),
  pickup_longitude DECIMAL(11, 8),
  dropoff_location TEXT,
  dropoff_latitude DECIMAL(10, 8),
  dropoff_longitude DECIMAL(11, 8),
  special_requirements TEXT,
  -- 價格資訊
  base_price DECIMAL(10, 2) NOT NULL,
  hourly_rate DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  deposit_amount DECIMAL(10, 2) NOT NULL,
  balance_amount DECIMAL(10, 2) NOT NULL,
  overtime_fee DECIMAL(10, 2) DEFAULT 0,
  tip DECIMAL(10, 2) DEFAULT 0,
  platform_fee DECIMAL(10, 2) NOT NULL,
  driver_earning DECIMAL(10, 2) NOT NULL,
  -- 時間戳記
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE,
  assigned_at TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  departed_at TIMESTAMP WITH TIME ZONE,
  arrived_at TIMESTAMP WITH TIME ZONE,
  trip_started_at TIMESTAMP WITH TIME ZONE,
  trip_ended_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);
```

### 3. 支付相關表

#### payments (支付記錄)
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id VARCHAR(100) UNIQUE NOT NULL,
  booking_id UUID REFERENCES bookings(id) NOT NULL,
  customer_id UUID REFERENCES users(id) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'balance', 'refund')),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'TWD',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  payment_provider VARCHAR(50) NOT NULL,
  payment_method VARCHAR(50),
  is_test_mode BOOLEAN DEFAULT false,
  external_transaction_id VARCHAR(255),
  payment_url TEXT,
  instructions TEXT,
  confirmed_by UUID REFERENCES users(id),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);
```

### 4. 聊天相關表

#### chat_rooms (聊天室)
```sql
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) NOT NULL,
  customer_id UUID REFERENCES users(id) NOT NULL,
  driver_id UUID REFERENCES users(id) NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  last_message_at TIMESTAMP WITH TIME ZONE,
  customer_unread_count INTEGER DEFAULT 0,
  driver_unread_count INTEGER DEFAULT 0
);
```

#### chat_messages (聊天訊息)
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) NOT NULL,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('customer', 'driver', 'system')),
  type VARCHAR(20) DEFAULT 'text' CHECK (type IN ('text', 'image', 'location', 'system')),
  content TEXT NOT NULL,
  metadata JSONB,
  status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5. 系統設定表

#### system_settings (系統設定)
```sql
CREATE TABLE system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);
```

#### driver_locations (司機位置)
```sql
CREATE TABLE driver_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES users(id) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(8, 2),
  heading DECIMAL(5, 2),
  speed DECIMAL(8, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Firebase 資料結構

### 1. 即時聊天 (Firestore)
```
/chats/{chatRoomId}/messages/{messageId}
{
  senderId: string,
  senderType: 'customer' | 'driver' | 'system',
  type: 'text' | 'image' | 'location',
  content: string,
  timestamp: Timestamp,
  status: 'sent' | 'delivered' | 'read'
}
```

### 2. 即時位置 (Firestore)
```
/locations/{driverId}
{
  latitude: number,
  longitude: number,
  accuracy: number,
  heading: number,
  speed: number,
  timestamp: Timestamp,
  isOnline: boolean
}
```

### 3. 推播通知 Tokens (Firestore)
```
/fcm_tokens/{userId}
{
  tokens: string[],
  platform: 'ios' | 'android' | 'web',
  updatedAt: Timestamp
}
```

### 4. 檔案儲存 (Firebase Storage)
```
/driver_documents/{driverId}/{documentType}/{filename}
/user_avatars/{userId}/{filename}
/chat_images/{chatRoomId}/{messageId}/{filename}
```

## 連接配置

### Supabase 配置
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### Firebase 配置
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## 資料同步策略

1. **主要業務資料**：PostgreSQL 為主，Firebase 為輔助快取
2. **即時資料**：Firebase 即時同步，定期同步到 PostgreSQL
3. **檔案資料**：Firebase Storage 儲存，PostgreSQL 記錄 URL
4. **備份策略**：PostgreSQL 每日備份，Firebase 自動備份

## 效能優化

1. **索引策略**：為常用查詢欄位建立索引
2. **分頁查詢**：大量資料使用分頁載入
3. **快取機制**：使用 Redis 快取熱門資料
4. **連接池**：使用連接池管理資料庫連接

## 安全性

1. **Row Level Security (RLS)**：Supabase 啟用行級安全
2. **API 權限控制**：基於角色的存取控制
3. **資料加密**：敏感資料加密儲存
4. **審計日誌**：記錄重要操作日誌

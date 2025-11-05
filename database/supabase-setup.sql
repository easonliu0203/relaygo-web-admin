-- 包車服務管理系統 - Supabase 資料庫建立腳本
-- 執行此腳本來建立所有必要的資料表和索引

-- 啟用必要的擴展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 建立用戶主表
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 建立司機文件表
CREATE TABLE IF NOT EXISTS driver_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('license', 'vehicle_registration', 'insurance', 'id_card')),
  url TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id),
  notes TEXT
);

-- 建立預約訂單表
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID REFERENCES users(id) NOT NULL,
  driver_id UUID REFERENCES users(id),
  vehicle_type VARCHAR(10) NOT NULL CHECK (vehicle_type IN ('A', 'B', 'C', 'D')),
  status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_payment', 'paid_deposit', 'assigned', 'driver_confirmed',
    'driver_departed', 'driver_arrived', 'trip_started', 'trip_ended',
    'pending_balance', 'completed', 'cancelled', 'refunded'
  )),
  
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

-- 建立支付記錄表
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id VARCHAR(100) UNIQUE NOT NULL,
  booking_id UUID REFERENCES bookings(id) NOT NULL,
  customer_id UUID REFERENCES users(id) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'balance', 'refund')),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'TWD',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed', 'cancelled', 'expired', 'refunded'
  )),
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

-- 建立聊天室表
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 建立聊天訊息表
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 建立系統設定表
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- 建立司機位置表
CREATE TABLE IF NOT EXISTS driver_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID REFERENCES users(id) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(8, 2),
  heading DECIMAL(5, 2),
  speed DECIMAL(8, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_driver_id ON bookings(driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_start_date ON bookings(start_date);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_booking_id ON chat_rooms(booking_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_room_id ON chat_messages(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_created_at ON driver_locations(created_at);

-- 建立更新時間觸發器函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 為需要的表建立更新時間觸發器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_messages_updated_at BEFORE UPDATE ON chat_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入預設管理員帳號
INSERT INTO users (email, name, role, status)
VALUES ('admin@example.com', '系統管理員', 'admin', 'active')
ON CONFLICT (email) DO NOTHING;

-- 插入預設系統設定
INSERT INTO system_settings (key, value, description) VALUES
('pricing_config', '{
  "vehicleTypes": {
    "A": {"name": "A型車(4人座)", "basePrice": 1500, "hourlyRate": 500, "description": "一般轎車"},
    "B": {"name": "B型車(7人座)", "basePrice": 2000, "hourlyRate": 600, "description": "休旅車/商務車"},
    "C": {"name": "C型車(9人座)", "basePrice": 2500, "hourlyRate": 700, "description": "小巴士"},
    "D": {"name": "D型車(20人座)", "basePrice": 3500, "hourlyRate": 1000, "description": "中型巴士"}
  },
  "depositRate": 0.3,
  "platformFeeRate": 0.1,
  "overtimeRate": 1.5
}', '價格配置'),
('dispatch_config', '{
  "autoDispatchEnabled": true,
  "maxRadius": 10,
  "maxRetryAttempts": 3,
  "retryDelayMs": 30000,
  "priorityFactors": {
    "distance": 0.4,
    "rating": 0.3,
    "experience": 0.3
  }
}', '派單配置'),
('payment_config', '{
  "provider": "mock",
  "testMode": true,
  "supportedMethods": ["mock", "offline"],
  "autoConfirmOfflinePayments": false
}', '支付配置'),
('notification_config', '{
  "emailEnabled": true,
  "smsEnabled": false,
  "pushEnabled": true,
  "templates": {
    "booking_confirmed": {
      "title": "預約確認",
      "content": "您的預約已確認，訂單編號：{bookingNumber}",
      "enabled": true
    },
    "driver_assigned": {
      "title": "司機派遣",
      "content": "司機已派遣，司機：{driverName}，車牌：{vehicleNumber}",
      "enabled": true
    }
  }
}', '通知配置')
ON CONFLICT (key) DO NOTHING;

-- 建立 RLS (Row Level Security) 政策
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 管理員可以存取所有資料
CREATE POLICY "管理員全權限" ON users FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "管理員全權限" ON bookings FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "管理員全權限" ON payments FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "管理員全權限" ON chat_rooms FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "管理員全權限" ON chat_messages FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- 用戶可以查看和更新自己的資料
CREATE POLICY "用戶自己的資料" ON users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "用戶更新自己的資料" ON users FOR UPDATE USING (auth.uid()::text = id::text);

-- 客戶可以查看自己的訂單
CREATE POLICY "客戶查看自己的訂單" ON bookings FOR SELECT USING (auth.uid()::text = customer_id::text);

-- 司機可以查看指派給自己的訂單
CREATE POLICY "司機查看指派的訂單" ON bookings FOR SELECT USING (auth.uid()::text = driver_id::text);

COMMENT ON TABLE users IS '用戶主表，包含客戶、司機和管理員';
COMMENT ON TABLE bookings IS '預約訂單表';
COMMENT ON TABLE payments IS '支付記錄表';
COMMENT ON TABLE chat_rooms IS '聊天室表';
COMMENT ON TABLE chat_messages IS '聊天訊息表';
COMMENT ON TABLE system_settings IS '系統設定表';
COMMENT ON TABLE driver_locations IS '司機位置記錄表';

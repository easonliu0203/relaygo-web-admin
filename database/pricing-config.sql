-- 價格配置和封測階段自動支付功能
-- 執行日期: 2025-09-28

-- 1. 插入價格配置到系統設定表
INSERT INTO system_settings (key, value, description, updated_at) VALUES 
(
  'pricing_config',
  '{
    "vehicle_types": {
      "large": {
        "name": "8-9人座車型",
        "code": ["A", "B"],
        "packages": {
          "8_hours": {
            "duration": 8,
            "original_price": 85,
            "discount_price": 75,
            "overtime_rate": 8
          },
          "6_hours": {
            "duration": 6,
            "original_price": 70,
            "discount_price": 60,
            "overtime_rate": 8
          }
        }
      },
      "small": {
        "name": "3-4人座車型",
        "code": ["C", "D"],
        "packages": {
          "8_hours": {
            "duration": 8,
            "original_price": 60,
            "discount_price": 50,
            "overtime_rate": 5
          },
          "6_hours": {
            "duration": 6,
            "original_price": 50,
            "discount_price": 40,
            "overtime_rate": 5
          }
        }
      }
    },
    "currency": "USD",
    "updated_at": "2025-09-28T02:30:00Z"
  }'::jsonb,
  '包車服務價格配置表',
  NOW()
),
(
  'beta_testing_config',
  '{
    "auto_payment_enabled": true,
    "auto_payment_delay_seconds": 5,
    "auto_payment_description": "封測階段自動支付",
    "enabled_until": "2025-12-31T23:59:59Z",
    "notification_enabled": true
  }'::jsonb,
  '封測階段自動支付配置',
  NOW()
),
(
  'vehicle_type_mapping',
  '{
    "A": {
      "name": "豪華9人座",
      "capacity": 9,
      "category": "large",
      "description": "豪華商務車，適合商務接待"
    },
    "B": {
      "name": "標準8人座",
      "capacity": 8,
      "category": "large", 
      "description": "標準8人座車型，適合團體出行"
    },
    "C": {
      "name": "舒適4人座",
      "capacity": 4,
      "category": "small",
      "description": "舒適轎車，適合小家庭"
    },
    "D": {
      "name": "經濟3人座",
      "capacity": 3,
      "category": "small",
      "description": "經濟型車輛，適合個人或情侶"
    }
  }'::jsonb,
  '車型對應表',
  NOW()
),
(
  'payment_settings',
  '{
    "deposit_percentage": 0.3,
    "payment_timeout_hours": 24,
    "refund_policy": {
      "cancellation_before_24h": 0.9,
      "cancellation_before_12h": 0.5,
      "cancellation_before_2h": 0.1,
      "no_show": 0.0
    },
    "supported_currencies": ["USD", "TWD"],
    "default_currency": "USD"
  }'::jsonb,
  '支付相關設定',
  NOW()
);

-- 2. 建立價格計算函數
CREATE OR REPLACE FUNCTION calculate_booking_price(
  p_vehicle_type VARCHAR(10),
  p_duration INTEGER,
  p_use_discount BOOLEAN DEFAULT FALSE
) RETURNS JSONB AS $$
DECLARE
  pricing_config JSONB;
  vehicle_category TEXT;
  package_key TEXT;
  base_price DECIMAL(10,2);
  overtime_hours INTEGER;
  overtime_cost DECIMAL(10,2);
  total_price DECIMAL(10,2);
  deposit_amount DECIMAL(10,2);
  result JSONB;
BEGIN
  -- 獲取價格配置
  SELECT value INTO pricing_config 
  FROM system_settings 
  WHERE key = 'pricing_config';
  
  -- 確定車型類別
  IF p_vehicle_type IN ('A', 'B') THEN
    vehicle_category := 'large';
  ELSIF p_vehicle_type IN ('C', 'D') THEN
    vehicle_category := 'small';
  ELSE
    RAISE EXCEPTION '無效的車型: %', p_vehicle_type;
  END IF;
  
  -- 確定套餐類型
  IF p_duration <= 6 THEN
    package_key := '6_hours';
  ELSE
    package_key := '8_hours';
  END IF;
  
  -- 計算基礎價格
  IF p_use_discount THEN
    base_price := (pricing_config->'vehicle_types'->vehicle_category->'packages'->package_key->>'discount_price')::DECIMAL;
  ELSE
    base_price := (pricing_config->'vehicle_types'->vehicle_category->'packages'->package_key->>'original_price')::DECIMAL;
  END IF;
  
  -- 計算超時費用
  overtime_hours := GREATEST(0, p_duration - (pricing_config->'vehicle_types'->vehicle_category->'packages'->package_key->>'duration')::INTEGER);
  overtime_cost := overtime_hours * (pricing_config->'vehicle_types'->vehicle_category->'packages'->package_key->>'overtime_rate')::DECIMAL;
  
  -- 計算總價
  total_price := base_price + overtime_cost;
  
  -- 計算訂金（30%）
  deposit_amount := ROUND(total_price * 0.3, 2);
  
  -- 組裝結果
  result := jsonb_build_object(
    'base_price', base_price,
    'overtime_hours', overtime_hours,
    'overtime_cost', overtime_cost,
    'total_price', total_price,
    'deposit_amount', deposit_amount,
    'balance_amount', total_price - deposit_amount,
    'vehicle_category', vehicle_category,
    'package_type', package_key,
    'discount_applied', p_use_discount
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 3. 建立自動支付觸發器函數
CREATE OR REPLACE FUNCTION auto_payment_for_beta_testing() 
RETURNS TRIGGER AS $$
DECLARE
  beta_config JSONB;
  auto_payment_enabled BOOLEAN;
  delay_seconds INTEGER;
BEGIN
  -- 只處理新插入的訂單且狀態為 pending_payment
  IF TG_OP = 'INSERT' AND NEW.status = 'pending_payment' THEN
    
    -- 獲取封測配置
    SELECT value INTO beta_config 
    FROM system_settings 
    WHERE key = 'beta_testing_config';
    
    auto_payment_enabled := (beta_config->>'auto_payment_enabled')::BOOLEAN;
    delay_seconds := (beta_config->>'auto_payment_delay_seconds')::INTEGER;
    
    -- 如果啟用自動支付
    IF auto_payment_enabled THEN
      -- 使用 pg_sleep 模擬支付處理時間
      PERFORM pg_sleep(delay_seconds);
      
      -- 更新訂單狀態為已支付訂金
      UPDATE bookings 
      SET 
        status = 'paid_deposit',
        updated_at = NOW()
      WHERE id = NEW.id;
      
      -- 插入支付記錄
      INSERT INTO payments (
        booking_id,
        amount,
        payment_type,
        payment_method,
        status,
        transaction_id,
        payment_gateway,
        notes,
        created_at
      ) VALUES (
        NEW.id,
        NEW.deposit_amount,
        'deposit',
        'auto_beta',
        'completed',
        'BETA_' || NEW.booking_number || '_' || EXTRACT(EPOCH FROM NOW())::TEXT,
        'beta_testing',
        '封測階段自動支付 - 訂金',
        NOW()
      );
      
      -- 記錄日誌
      INSERT INTO system_logs (
        level,
        message,
        context,
        created_at
      ) VALUES (
        'INFO',
        '封測階段自動支付完成',
        jsonb_build_object(
          'booking_id', NEW.id,
          'booking_number', NEW.booking_number,
          'amount', NEW.deposit_amount,
          'auto_payment', true
        ),
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 建立觸發器（僅在封測階段啟用）
DROP TRIGGER IF EXISTS trigger_auto_payment_beta ON bookings;
CREATE TRIGGER trigger_auto_payment_beta
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_payment_for_beta_testing();

-- 5. 建立系統日誌表（如果不存在）
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level VARCHAR(10) NOT NULL CHECK (level IN ('DEBUG', 'INFO', 'WARN', 'ERROR')),
  message TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 建立索引
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- 7. 更新現有訂單的價格資訊（可選）
-- 這個部分可以根據需要執行，用於更新現有的測試資料

COMMENT ON FUNCTION calculate_booking_price IS '計算包車服務價格，支援不同車型和時長';
COMMENT ON FUNCTION auto_payment_for_beta_testing IS '封測階段自動支付功能，僅用於測試環境';
COMMENT ON TRIGGER trigger_auto_payment_beta ON bookings IS '封測階段自動支付觸發器';

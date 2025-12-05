-- =====================================================
-- Migration: 新增訂單促成費設定
-- Description: 在 system_settings 表新增訂單促成費配置
-- Date: 2025-12-05
-- =====================================================

-- 1. 新增訂單促成費設定到 system_settings 表
INSERT INTO system_settings (key, value, description) 
VALUES (
  'order_acquisition_fee',
  '{"amount": 500, "currency": "TWD", "enabled": true, "updated_at": "2025-12-05T00:00:00Z"}',
  '訂單促成費設定（Order Acquisition Fee / Referral Fee）'
)
ON CONFLICT (key) DO UPDATE 
SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 2. 在 bookings 表新增欄位以記錄每筆訂單的促成費快照
-- 這確保已成交訂單的金額不會因設定變更而改變
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS acquisition_fee_snapshot DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS acquisition_fee_applied BOOLEAN DEFAULT false;

-- 3. 為新欄位添加註解
COMMENT ON COLUMN bookings.acquisition_fee_snapshot IS '訂單促成費快照（建立訂單時的金額，不受後續設定變更影響）';
COMMENT ON COLUMN bookings.acquisition_fee_applied IS '是否已套用訂單促成費';

-- 4. 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_bookings_acquisition_fee_applied 
ON bookings(acquisition_fee_applied);

-- 5. 建立 View 用於統計訂單促成費
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

COMMENT ON VIEW order_acquisition_fee_stats IS '訂單促成費統計視圖';

-- =====================================================
-- 回滾腳本（如需要）
-- =====================================================
-- DELETE FROM system_settings WHERE key = 'order_acquisition_fee';
-- ALTER TABLE bookings DROP COLUMN IF EXISTS acquisition_fee_snapshot;
-- ALTER TABLE bookings DROP COLUMN IF EXISTS acquisition_fee_applied;
-- DROP INDEX IF EXISTS idx_bookings_acquisition_fee_applied;
-- DROP VIEW IF EXISTS order_acquisition_fee_stats;


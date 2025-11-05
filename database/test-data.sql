-- 包車服務管理系統 - 測試資料腳本
-- 此腳本會插入一些測試資料供封測階段使用

-- 插入測試客戶
INSERT INTO users (email, name, phone, role, status) VALUES
('customer1@example.com', '王小明', '0912345678', 'customer', 'active'),
('customer2@example.com', '李小華', '0923456789', 'customer', 'active'),
('customer3@example.com', '陳小美', '0934567890', 'customer', 'active'),
('customer4@example.com', '張小強', '0945678901', 'customer', 'active'),
('customer5@example.com', '林小芳', '0956789012', 'customer', 'active')
ON CONFLICT (email) DO NOTHING;

-- 插入測試司機
INSERT INTO users (
  email, name, phone, role, status, 
  license_number, vehicle_type, vehicle_number, rating, total_trips, is_available,
  bank_name, account_number, account_name
) VALUES
('driver1@example.com', '司機張三', '0967890123', 'driver', 'active', 
 'DL001234567', 'A', 'ABC-1234', 4.8, 156, true,
 '台灣銀行', '123456789012', '張三'),
('driver2@example.com', '司機李四', '0978901234', 'driver', 'active',
 'DL002345678', 'B', 'DEF-5678', 4.6, 89, true,
 '中國信託', '234567890123', '李四'),
('driver3@example.com', '司機王五', '0989012345', 'driver', 'active',
 'DL003456789', 'C', 'GHI-9012', 4.9, 234, false,
 '國泰世華', '345678901234', '王五'),
('driver4@example.com', '司機趙六', '0990123456', 'driver', 'active',
 'DL004567890', 'A', 'JKL-3456', 4.7, 67, true,
 '玉山銀行', '456789012345', '趙六'),
('driver5@example.com', '司機錢七', '0901234567', 'driver', 'pending',
 'DL005678901', 'D', 'MNO-7890', 0.0, 0, false,
 '富邦銀行', '567890123456', '錢七')
ON CONFLICT (email) DO NOTHING;

-- 插入測試訂單
INSERT INTO bookings (
  booking_number, customer_id, driver_id, vehicle_type, status,
  start_date, start_time, duration,
  pickup_location, pickup_latitude, pickup_longitude,
  dropoff_location, dropoff_latitude, dropoff_longitude,
  special_requirements,
  base_price, hourly_rate, total_amount, deposit_amount, balance_amount,
  platform_fee, driver_earning,
  created_at, paid_at, assigned_at, confirmed_at
) VALUES
-- 已完成的訂單
('BK202401001', 
 (SELECT id FROM users WHERE email = 'customer1@example.com'),
 (SELECT id FROM users WHERE email = 'driver1@example.com'),
 'A', 'completed',
 '2024-01-15', '09:00:00', 8,
 '台北車站', 25.0478, 121.5170,
 '桃園機場', 25.0797, 121.2342,
 '需要兒童安全座椅',
 1500, 500, 5500, 1650, 3850, 550, 4950,
 '2024-01-10 10:00:00', '2024-01-10 10:05:00', '2024-01-12 14:00:00', '2024-01-12 14:30:00'),

('BK202401002',
 (SELECT id FROM users WHERE email = 'customer2@example.com'),
 (SELECT id FROM users WHERE email = 'driver2@example.com'),
 'B', 'completed',
 '2024-01-20', '14:00:00', 6,
 '台中火車站', 24.1369, 120.6839,
 '日月潭', 23.8561, 120.9155,
 '需要 WiFi',
 2000, 600, 5600, 1680, 3920, 560, 5040,
 '2024-01-18 16:00:00', '2024-01-18 16:10:00', '2024-01-19 09:00:00', '2024-01-19 09:15:00'),

-- 進行中的訂單
('BK202401003',
 (SELECT id FROM users WHERE email = 'customer3@example.com'),
 (SELECT id FROM users WHERE email = 'driver1@example.com'),
 'A', 'driver_departed',
 CURRENT_DATE, '10:00:00', 4,
 '高雄車站', 22.6391, 120.3022,
 '墾丁', 22.0081, 120.7364,
 '',
 1500, 500, 3500, 1050, 2450, 350, 3150,
 NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 50 minutes', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '20 minutes'),

-- 待處理的訂單
('BK202401004',
 (SELECT id FROM users WHERE email = 'customer4@example.com'),
 NULL,
 'C', 'paid_deposit',
 CURRENT_DATE + INTERVAL '1 day', '08:00:00', 10,
 '台南車站', 22.9971, 120.2133,
 '阿里山', 23.5112, 120.8056,
 '需要導遊服務',
 2500, 700, 9500, 2850, 6650, 950, 8550,
 NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '25 minutes', NULL, NULL),

('BK202401005',
 (SELECT id FROM users WHERE email = 'customer5@example.com'),
 NULL,
 'B', 'pending_payment',
 CURRENT_DATE + INTERVAL '2 days', '15:00:00', 5,
 '花蓮車站', 23.9937, 121.6010,
 '太魯閣', 24.1947, 121.4919,
 '',
 2000, 600, 5000, 1500, 3500, 500, 4500,
 NOW() - INTERVAL '10 minutes', NULL, NULL, NULL)
ON CONFLICT (booking_number) DO NOTHING;

-- 插入測試支付記錄
INSERT INTO payments (
  transaction_id, booking_id, customer_id, type, amount, status,
  payment_provider, payment_method, is_test_mode,
  instructions, created_at
) VALUES
-- 已完成訂單的支付記錄
('PAY202401001_DEP', 
 (SELECT id FROM bookings WHERE booking_number = 'BK202401001'),
 (SELECT id FROM users WHERE email = 'customer1@example.com'),
 'deposit', 1650, 'completed', 'mock', 'mock_payment', true,
 '模擬支付 - 自動完成', '2024-01-10 10:05:00'),

('PAY202401001_BAL',
 (SELECT id FROM bookings WHERE booking_number = 'BK202401001'),
 (SELECT id FROM users WHERE email = 'customer1@example.com'),
 'balance', 3850, 'completed', 'offline', 'cash', true,
 '現金支付 - 已確認收款', '2024-01-15 17:30:00'),

('PAY202401002_DEP',
 (SELECT id FROM bookings WHERE booking_number = 'BK202401002'),
 (SELECT id FROM users WHERE email = 'customer2@example.com'),
 'deposit', 1680, 'completed', 'mock', 'mock_payment', true,
 '模擬支付 - 自動完成', '2024-01-18 16:10:00'),

('PAY202401002_BAL',
 (SELECT id FROM bookings WHERE booking_number = 'BK202401002'),
 (SELECT id FROM users WHERE email = 'customer2@example.com'),
 'balance', 3920, 'completed', 'mock', 'mock_payment', true,
 '模擬支付 - 自動完成', '2024-01-20 20:15:00'),

-- 進行中訂單的支付記錄
('PAY202401003_DEP',
 (SELECT id FROM bookings WHERE booking_number = 'BK202401003'),
 (SELECT id FROM users WHERE email = 'customer3@example.com'),
 'deposit', 1050, 'completed', 'mock', 'mock_payment', true,
 '模擬支付 - 自動完成', NOW() - INTERVAL '1 hour 50 minutes'),

-- 待處理訂單的支付記錄
('PAY202401004_DEP',
 (SELECT id FROM bookings WHERE booking_number = 'BK202401004'),
 (SELECT id FROM users WHERE email = 'customer4@example.com'),
 'deposit', 2850, 'completed', 'offline', 'bank_transfer', true,
 '銀行轉帳 - 待確認', NOW() - INTERVAL '25 minutes'),

('PAY202401005_DEP',
 (SELECT id FROM bookings WHERE booking_number = 'BK202401005'),
 (SELECT id FROM users WHERE email = 'customer5@example.com'),
 'deposit', 1500, 'pending', 'mock', 'mock_payment', true,
 '模擬支付 - 等待付款', NOW() - INTERVAL '10 minutes')
ON CONFLICT (transaction_id) DO NOTHING;

-- 插入測試聊天室
INSERT INTO chat_rooms (
  booking_id, customer_id, driver_id, status, created_at, last_message_at
) VALUES
((SELECT id FROM bookings WHERE booking_number = 'BK202401001'),
 (SELECT id FROM users WHERE email = 'customer1@example.com'),
 (SELECT id FROM users WHERE email = 'driver1@example.com'),
 'closed', '2024-01-12 14:30:00', '2024-01-15 17:45:00'),

((SELECT id FROM bookings WHERE booking_number = 'BK202401003'),
 (SELECT id FROM users WHERE email = 'customer3@example.com'),
 (SELECT id FROM users WHERE email = 'driver1@example.com'),
 'active', NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '5 minutes')
ON CONFLICT DO NOTHING;

-- 插入測試聊天訊息
INSERT INTO chat_messages (
  chat_room_id, sender_id, sender_type, type, content, status, created_at
) VALUES
-- 已完成訂單的聊天記錄
((SELECT id FROM chat_rooms WHERE booking_id = (SELECT id FROM bookings WHERE booking_number = 'BK202401001')),
 (SELECT id FROM users WHERE email = 'driver1@example.com'), 'driver', 'text',
 '您好，我是您的司機張三，已經在路上了', 'read', '2024-01-15 08:45:00'),

((SELECT id FROM chat_rooms WHERE booking_id = (SELECT id FROM bookings WHERE booking_number = 'BK202401001')),
 (SELECT id FROM users WHERE email = 'customer1@example.com'), 'customer', 'text',
 '好的，謝謝！大概多久會到？', 'read', '2024-01-15 08:46:00'),

-- 進行中訂單的聊天記錄
((SELECT id FROM chat_rooms WHERE booking_id = (SELECT id FROM bookings WHERE booking_number = 'BK202401003')),
 (SELECT id FROM users WHERE email = 'driver1@example.com'), 'driver', 'text',
 '我已經出發了，預計 15 分鐘後到達', 'read', NOW() - INTERVAL '15 minutes'),

((SELECT id FROM chat_rooms WHERE booking_id = (SELECT id FROM bookings WHERE booking_number = 'BK202401003')),
 (SELECT id FROM users WHERE email = 'customer3@example.com'), 'customer', 'text',
 '收到，我在車站大廳等您', 'read', NOW() - INTERVAL '10 minutes'),

((SELECT id FROM chat_rooms WHERE booking_id = (SELECT id FROM bookings WHERE booking_number = 'BK202401003')),
 (SELECT id FROM users WHERE email = 'driver1@example.com'), 'driver', 'text',
 '我快到了，請問您穿什麼顏色的衣服？', 'delivered', NOW() - INTERVAL '5 minutes')
ON CONFLICT DO NOTHING;

-- 插入司機位置記錄
INSERT INTO driver_locations (driver_id, latitude, longitude, accuracy, created_at) VALUES
((SELECT id FROM users WHERE email = 'driver1@example.com'), 22.6500, 120.3100, 10.0, NOW() - INTERVAL '5 minutes'),
((SELECT id FROM users WHERE email = 'driver1@example.com'), 22.6520, 120.3120, 8.0, NOW() - INTERVAL '3 minutes'),
((SELECT id FROM users WHERE email = 'driver1@example.com'), 22.6540, 120.3140, 12.0, NOW() - INTERVAL '1 minute'),
((SELECT id FROM users WHERE email = 'driver2@example.com'), 24.1400, 120.6900, 15.0, NOW() - INTERVAL '10 minutes'),
((SELECT id FROM users WHERE email = 'driver4@example.com'), 25.0500, 121.5200, 5.0, NOW() - INTERVAL '2 minutes')
ON CONFLICT DO NOTHING;

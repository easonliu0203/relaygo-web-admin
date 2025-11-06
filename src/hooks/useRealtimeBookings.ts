/**
 * Supabase Realtime Hook for Bookings
 *
 * 用於公司端後台即時監聽訂單變更
 * 解決 2-5 分鐘延遲問題
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface RealtimeBooking {
  id: string;
  booking_number: string;
  status: string;
  deposit_paid: boolean;
  customer_id: string;
  driver_id: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

/**
 * 將 Supabase 的 snake_case 數據轉換為前端的 camelCase 格式
 * 只轉換變更的字段，保留現有的關聯數據
 */
function convertBookingData(rawBooking: any, existingBooking?: any): any {
  return {
    id: rawBooking.id,
    bookingNumber: rawBooking.booking_number,
    status: rawBooking.status,
    depositPaid: rawBooking.deposit_paid,

    // 保留現有的關聯數據（customer, driver）
    customer: existingBooking?.customer,
    driver: existingBooking?.driver,

    // 訂單詳情
    vehicleType: rawBooking.vehicle_type,
    pickupLocation: rawBooking.pickup_location,
    dropoffLocation: rawBooking.destination,
    scheduledDate: rawBooking.start_date,
    scheduledTime: rawBooking.start_time,
    durationHours: rawBooking.duration_hours,

    // 價格資訊
    pricing: {
      basePrice: rawBooking.base_price,
      totalAmount: rawBooking.total_amount,
      depositAmount: rawBooking.deposit_amount,
    },

    // 時間戳
    createdAt: rawBooking.created_at,
    updatedAt: rawBooking.updated_at,

    // 其他資訊
    specialRequirements: rawBooking.special_requirements,
    requiresForeignLanguage: rawBooking.requires_foreign_language,
  };
}

export function useRealtimeBookings(initialBookings: RealtimeBooking[] = []) {
  const [bookings, setBookings] = useState<RealtimeBooking[]>(initialBookings);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    console.log('🔄 開始監聽 Supabase Realtime 訂單變更...');

    // 創建 Realtime 頻道
    const channel = supabase
      .channel('bookings_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // 監聽所有事件：INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'bookings',
        },
        (payload: any) => {
          console.log('📡 Realtime 收到訂單變更:', payload);

          if (payload.eventType === 'INSERT') {
            // 新增訂單
            const rawBooking = payload.new as RealtimeBooking;
            const newBooking = convertBookingData(rawBooking);
            console.log('✅ 新增訂單:', newBooking.id);
            setBookings((prev) => [newBooking, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            // 更新訂單
            const rawBooking = payload.new as RealtimeBooking;
            console.log('✅ 更新訂單:', rawBooking.id, {
              status: rawBooking.status,
              deposit_paid: rawBooking.deposit_paid,
            });

            // 合併更新：保留現有的關聯數據（customer, driver），只更新變更的字段
            setBookings((prev) =>
              prev.map((booking) => {
                if (booking.id === rawBooking.id) {
                  // 轉換數據格式並保留現有的關聯數據
                  const updatedBooking = convertBookingData(rawBooking, booking);
                  return updatedBooking;
                }
                return booking;
              })
            );
          } else if (payload.eventType === 'DELETE') {
            // 刪除訂單
            const deletedBooking = payload.old as RealtimeBooking;
            console.log('✅ 刪除訂單:', deletedBooking.id);
            setBookings((prev) =>
              prev.filter((booking) => booking.id !== deletedBooking.id)
            );
          }
        }
      )
      .subscribe((status: any) => {
        console.log('📡 Realtime 連接狀態:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    // 清理函數
    return () => {
      console.log('🔌 關閉 Supabase Realtime 連接');
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    bookings,
    setBookings,
    isConnected,
  };
}


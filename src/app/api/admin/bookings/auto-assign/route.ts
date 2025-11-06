import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase';

/**
 * POST /api/admin/bookings/auto-assign
 * 自動分配司機給未分配的訂單
 * 
 * 請求體（可選）:
 * - bookingIds: 訂單 ID 陣列（如果不提供，則分配所有未分配的訂單）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { bookingIds } = body;

    console.log('📋 自動分配司機:', {
      bookingIds: bookingIds || '所有未分配訂單'
    });

    const db = new DatabaseService();

    // 1. 獲取未分配司機的訂單
    let bookingsQuery = db.supabase
      .from('bookings')
      .select('*')
      .is('driver_id', null)
      .in('status', ['pending_payment', 'paid_deposit']);

    if (bookingIds && Array.isArray(bookingIds) && bookingIds.length > 0) {
      bookingsQuery = bookingsQuery.in('id', bookingIds);
    }

    const { data: bookings, error: bookingsError } = await bookingsQuery;

    if (bookingsError) {
      console.error('❌ 獲取訂單失敗:', bookingsError);
      return NextResponse.json(
        { 
          success: false,
          error: '獲取訂單失敗', 
          details: bookingsError.message 
        },
        { status: 500 }
      );
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({
        success: true,
        message: '沒有需要分配的訂單',
        assigned: 0,
        failed: 0,
        total: 0,
      });
    }

    console.log(`📋 找到 ${bookings.length} 筆未分配訂單`);

    // 2. 獲取所有可用司機
    const { data: drivers, error: driversError } = await db.supabase
      .from('users')
      .select(`
        id,
        drivers!user_id (
          id,
          vehicle_type,
          is_available
        )
      `)
      .eq('role', 'driver');

    if (driversError) {
      console.error('❌ 獲取司機失敗:', driversError);
      return NextResponse.json(
        { 
          success: false,
          error: '獲取司機失敗', 
          details: driversError.message 
        },
        { status: 500 }
      );
    }

    // 過濾可用司機
    const availableDrivers = (drivers || []).filter((driver: any) => {
      const driverInfo = driver.drivers?.[0] || driver.drivers;
      return driverInfo && driverInfo.is_available;
    });

    if (availableDrivers.length === 0) {
      return NextResponse.json({
        success: false,
        error: '沒有可用司機',
        assigned: 0,
        failed: bookings.length,
        total: bookings.length,
      });
    }

    console.log(`👨‍✈️ 找到 ${availableDrivers.length} 位可用司機`);

    // 3. 獲取所有司機的現有訂單（用於負載平衡和衝突檢查）
    const { data: existingBookings, error: existingError } = await db.supabase
      .from('bookings')
      .select('driver_id, start_date, start_time, duration_hours')
      .not('driver_id', 'is', null)
      .in('status', ['matched', 'inProgress', 'completed']);

    if (existingError) {
      console.error('❌ 獲取現有訂單失敗:', existingError);
    }

    // 統計每個司機的訂單數量
    const driverBookingCounts = new Map<string, number>();
    const driverBookingsByDate = new Map<string, any[]>();

    (existingBookings || []).forEach((booking: any) => {
      if (booking.driver_id) {
        // 統計總數
        driverBookingCounts.set(
          booking.driver_id,
          (driverBookingCounts.get(booking.driver_id) || 0) + 1
        );

        // 按日期分組
        const key = `${booking.driver_id}_${booking.start_date}`;
        if (!driverBookingsByDate.has(key)) {
          driverBookingsByDate.set(key, []);
        }
        driverBookingsByDate.get(key)!.push(booking);
      }
    });

    // 4. 自動分配邏輯
    const results = {
      assigned: 0,
      failed: 0,
      total: bookings.length,
      details: [] as any[],
    };

    for (const booking of bookings) {
      try {
        // 找到符合車型的司機
        const matchingDrivers = availableDrivers.filter((driver: any) => {
          const driverInfo = driver.drivers?.[0] || driver.drivers;
          return driverInfo && driverInfo.vehicle_type === booking.vehicle_type;
        });

        if (matchingDrivers.length === 0) {
          console.log(`⚠️ 訂單 ${booking.id} 找不到符合車型 ${booking.vehicle_type} 的司機`);
          results.failed++;
          results.details.push({
            bookingId: booking.id,
            success: false,
            reason: `找不到符合車型 ${booking.vehicle_type} 的司機`,
          });
          continue;
        }

        // 檢查時間衝突並選擇最佳司機
        const [hours, minutes] = booking.start_time.split(':').map(Number);
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + (booking.duration_hours * 60);

        let selectedDriver = null;
        let minBookings = Infinity;

        for (const driver of matchingDrivers) {
          // 檢查該司機在該日期是否有衝突
          const key = `${driver.id}_${booking.start_date}`;
          const driverDayBookings = driverBookingsByDate.get(key) || [];

          const hasConflict = driverDayBookings.some(existingBooking => {
            const [existingHours, existingMinutes] = existingBooking.start_time.split(':').map(Number);
            const existingStartMinutes = existingHours * 60 + existingMinutes;
            const existingEndMinutes = existingStartMinutes + (existingBooking.duration_hours * 60);

            // 檢查時間段是否重疊
            return (startMinutes < existingEndMinutes) && (endMinutes > existingStartMinutes);
          });

          if (!hasConflict) {
            // 選擇訂單數量最少的司機（負載平衡）
            const bookingCount = driverBookingCounts.get(driver.id) || 0;
            if (bookingCount < minBookings) {
              minBookings = bookingCount;
              selectedDriver = driver;
            }
          }
        }

        if (!selectedDriver) {
          console.log(`⚠️ 訂單 ${booking.id} 所有司機都有時間衝突`);
          results.failed++;
          results.details.push({
            bookingId: booking.id,
            success: false,
            reason: '所有司機都有時間衝突',
          });
          continue;
        }

        // 分配司機
        const { error: updateError } = await db.supabase
          .from('bookings')
          .update({
            driver_id: selectedDriver.id,
            status: 'matched',  // 使用 'matched' 而不是 'assigned'，與 Flutter 應用的狀態定義一致
            updated_at: new Date().toISOString(),
          })
          .eq('id', booking.id);

        if (updateError) {
          console.error(`❌ 分配訂單 ${booking.id} 失敗:`, updateError);
          results.failed++;
          results.details.push({
            bookingId: booking.id,
            success: false,
            reason: updateError.message,
          });
        } else {
          console.log(`✅ 成功分配訂單 ${booking.id} 給司機 ${selectedDriver.id}`);
          results.assigned++;
          results.details.push({
            bookingId: booking.id,
            driverId: selectedDriver.id,
            success: true,
          });

          // 更新司機訂單計數
          driverBookingCounts.set(
            selectedDriver.id,
            (driverBookingCounts.get(selectedDriver.id) || 0) + 1
          );

          // 更新司機日期訂單列表
          const key = `${selectedDriver.id}_${booking.start_date}`;
          if (!driverBookingsByDate.has(key)) {
            driverBookingsByDate.set(key, []);
          }
          driverBookingsByDate.get(key)!.push({
            driver_id: selectedDriver.id,
            start_date: booking.start_date,
            start_time: booking.start_time,
            duration_hours: booking.duration_hours,
          });
        }
      } catch (error) {
        console.error(`❌ 處理訂單 ${booking.id} 時發生錯誤:`, error);
        results.failed++;
        results.details.push({
          bookingId: booking.id,
          success: false,
          reason: error instanceof Error ? error.message : '未知錯誤',
        });
      }
    }

    console.log('✅ 自動分配完成:', results);

    return NextResponse.json({
      success: true,
      message: `成功分配 ${results.assigned} 筆訂單，失敗 ${results.failed} 筆`,
      ...results,
    });

  } catch (error) {
    console.error('❌ API 錯誤:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '內部伺服器錯誤', 
        details: error instanceof Error ? error.message : '未知錯誤' 
      },
      { status: 500 }
    );
  }
}


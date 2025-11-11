import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase';

/**
 * POST /api/admin/auto-dispatch/process
 * 24/7 全自動派單背景任務
 * 
 * 此 API 會被 Vercel Cron Job 或外部服務定期調用
 * 
 * 執行邏輯:
 * 1. 檢查開關是否開啟
 * 2. 查詢符合條件的訂單 (status = 'paid_deposit' AND driver_id IS NULL)
 * 3. 查詢可用司機 (is_available = true AND status = 'active')
 * 4. 執行平均分配算法
 * 5. 更新訂單的 driver_id 和 status
 * 6. 記錄派單日誌
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('🤖 [24/7 自動派單] 開始執行...');

    const db = new DatabaseService(true); // 使用 service_role key

    // 1. 檢查開關是否開啟
    const { data: settingsData, error: settingsError } = await db.supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'auto_dispatch_24_7')
      .single();

    if (settingsError) {
      console.error('❌ [24/7 自動派單] 獲取配置失敗:', settingsError);
      return NextResponse.json(
        {
          success: false,
          error: '獲取配置失敗',
          details: settingsError.message
        },
        { status: 500 }
      );
    }

    const settings = settingsData?.value || { enabled: false };

    if (!settings.enabled) {
      console.log('⏸️  [24/7 自動派單] 功能已關閉，跳過執行');
      return NextResponse.json({
        success: true,
        message: '24/7 自動派單功能已關閉',
        skipped: true
      });
    }

    console.log('✅ [24/7 自動派單] 功能已開啟，開始處理訂單...');

    // 2. 獲取批次大小
    const batchSize = settings.batch_size || 10;

    // 3. 查詢符合條件的訂單 (只針對已付訂金的訂單)
    const { data: bookings, error: bookingsError } = await db.supabase
      .from('bookings')
      .select('*')
      .is('driver_id', null)
      .eq('status', 'paid_deposit')
      .order('created_at', { ascending: true })
      .limit(batchSize);

    if (bookingsError) {
      console.error('❌ [24/7 自動派單] 獲取訂單失敗:', bookingsError);
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
      console.log('📋 [24/7 自動派單] 沒有需要分配的訂單');
      
      // 更新最後執行時間
      await updateLastRunTime(db, settings, 0, 0, 0);
      
      return NextResponse.json({
        success: true,
        message: '沒有需要分配的訂單',
        processed: 0,
        assigned: 0,
        failed: 0,
        duration_ms: Date.now() - startTime
      });
    }

    console.log(`📋 [24/7 自動派單] 找到 ${bookings.length} 筆待分配訂單`);

    // 4. 獲取所有可用司機
    const { data: users, error: usersError } = await db.supabase
      .from('users')
      .select('id, firebase_uid, email, phone, role, status')
      .eq('role', 'driver')
      .eq('status', 'active');

    if (usersError) {
      console.error('❌ [24/7 自動派單] 獲取司機用戶失敗:', usersError);
      return NextResponse.json(
        {
          success: false,
          error: '獲取司機用戶失敗',
          details: usersError.message
        },
        { status: 500 }
      );
    }

    // 5. 獲取司機詳細資訊
    const driverIds = users?.map((u: any) => u.id) || [];
    
    const { data: driverInfos } = await db.supabase
      .from('drivers')
      .select('*')
      .in('user_id', driverIds);

    // 6. 合併司機資料並過濾可用司機
    const driverInfoMap = new Map(driverInfos?.map((d: any) => [d.user_id, d]) || []);

    const availableDrivers = users?.filter((user: any) => {
      const driverInfo: any = driverInfoMap.get(user.id);
      return driverInfo && driverInfo.is_available;
    }).map((user: any) => ({
      ...user,
      drivers: driverInfoMap.get(user.id)
    })) || [];

    if (availableDrivers.length === 0) {
      console.log('⚠️ [24/7 自動派單] 沒有可用司機');
      
      // 更新最後執行時間
      await updateLastRunTime(db, settings, bookings.length, 0, bookings.length);
      
      return NextResponse.json({
        success: true,
        message: '沒有可用司機',
        processed: bookings.length,
        assigned: 0,
        failed: bookings.length,
        duration_ms: Date.now() - startTime
      });
    }

    console.log(`👨‍✈️ [24/7 自動派單] 找到 ${availableDrivers.length} 位可用司機`);

    // 7. 獲取所有司機的現有訂單（用於負載平衡和衝突檢查）
    const { data: existingBookings } = await db.supabase
      .from('bookings')
      .select('driver_id, start_date, start_time, duration_hours')
      .not('driver_id', 'is', null)
      .in('status', ['matched', 'confirmed', 'in_progress', 'driver_confirmed', 'driver_departed', 'driver_arrived', 'trip_started']);

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

    // 8. 自動分配邏輯
    const results = {
      processed: bookings.length,
      assigned: 0,
      failed: 0,
      details: [] as any[],
    };

    for (const booking of bookings) {
      try {
        // 找到符合車型的司機
        const matchingDrivers = availableDrivers.filter((driver: any) => {
          const driverInfo = driver.drivers;
          
          // 車型映射：A/B -> large, C/D -> small
          const vehicleTypeMap: Record<string, string> = {
            'A': 'large',
            'B': 'large',
            'C': 'small',
            'D': 'small',
            'large': 'large',
            'small': 'small'
          };
          
          const mappedVehicleType = vehicleTypeMap[booking.vehicle_type] || booking.vehicle_type;
          
          return driverInfo && driverInfo.vehicle_type === mappedVehicleType;
        });

        if (matchingDrivers.length === 0) {
          console.log(`⚠️ [24/7 自動派單] 訂單 ${booking.id} 找不到符合車型 ${booking.vehicle_type} 的司機`);
          results.failed++;
          results.details.push({
            bookingId: booking.id,
            success: false,
            reason: `找不到符合車型 ${booking.vehicle_type} 的司機`,
          });
          continue;
        }

        // 檢查時間衝突並選擇最佳司機
        const [hours, minutes] = (booking.start_time || '00:00').split(':').map(Number);
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + ((booking.duration_hours || 8) * 60);

        let selectedDriver = null;
        let minBookings = Infinity;

        for (const driver of matchingDrivers) {
          // 檢查該司機在該日期是否有衝突
          const key = `${driver.id}_${booking.start_date}`;
          const driverDayBookings = driverBookingsByDate.get(key) || [];

          const hasConflict = driverDayBookings.some((existingBooking: any) => {
            const [existingHours, existingMinutes] = (existingBooking.start_time || '00:00').split(':').map(Number);
            const existingStartMinutes = existingHours * 60 + existingMinutes;
            const existingEndMinutes = existingStartMinutes + ((existingBooking.duration_hours || 8) * 60);

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
          console.log(`⚠️ [24/7 自動派單] 訂單 ${booking.id} 所有司機都有時間衝突`);
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
            status: 'matched',
            updated_at: new Date().toISOString(),
          })
          .eq('id', booking.id);

        if (updateError) {
          console.error(`❌ [24/7 自動派單] 分配訂單 ${booking.id} 失敗:`, updateError);
          results.failed++;
          results.details.push({
            bookingId: booking.id,
            success: false,
            reason: updateError.message,
          });
        } else {
          console.log(`✅ [24/7 自動派單] 成功分配訂單 ${booking.id} 給司機 ${selectedDriver.id}`);
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
        console.error(`❌ [24/7 自動派單] 處理訂單 ${booking.id} 時發生錯誤:`, error);
        results.failed++;
        results.details.push({
          bookingId: booking.id,
          success: false,
          reason: error instanceof Error ? (error as any).message : '未知錯誤',
        });
      }
    }

    const duration = Date.now() - startTime;

    console.log(`✅ [24/7 自動派單] 執行完成: 處理 ${results.processed} 筆，成功 ${results.assigned} 筆，失敗 ${results.failed} 筆，耗時 ${duration}ms`);

    // 更新最後執行時間和統計資料
    await updateLastRunTime(db, settings, results.processed, results.assigned, results.failed);

    return NextResponse.json({
      success: true,
      message: `成功分配 ${results.assigned} 筆訂單，失敗 ${results.failed} 筆`,
      ...results,
      duration_ms: duration
    });

  } catch (error) {
    console.error('❌ [24/7 自動派單] API 錯誤:', error);
    return NextResponse.json(
      {
        success: false,
        error: '內部伺服器錯誤',
        details: error instanceof Error ? error.message : '未知錯誤',
        duration_ms: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}

/**
 * 更新最後執行時間和統計資料
 */
async function updateLastRunTime(
  db: DatabaseService,
  currentSettings: any,
  processed: number,
  assigned: number,
  failed: number
) {
  try {
    const updatedValue = {
      ...currentSettings,
      last_run_at: new Date().toISOString(),
      total_processed: (currentSettings.total_processed || 0) + processed,
      total_assigned: (currentSettings.total_assigned || 0) + assigned,
      total_failed: (currentSettings.total_failed || 0) + failed,
    };

    await db.supabase
      .from('system_settings')
      .update({ value: updatedValue })
      .eq('key', 'auto_dispatch_24_7');

    console.log('✅ [24/7 自動派單] 已更新執行統計');
  } catch (error) {
    console.error('❌ [24/7 自動派單] 更新執行統計失敗:', error);
  }
}


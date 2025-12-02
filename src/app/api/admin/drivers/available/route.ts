import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase';

/**
 * GET /api/admin/drivers/available
 * 獲取可用司機列表
 * 
 * 查詢參數:
 * - vehicleType: 車型 (A/B/C/D)
 * - date: 訂單日期 (YYYY-MM-DD)
 * - time: 訂單開始時間 (HH:mm)
 * - duration: 訂單時長（小時）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vehicleType = searchParams.get('vehicleType');
    const date = searchParams.get('date');
    const time = searchParams.get('time');
    const duration = parseInt(searchParams.get('duration') || '0');

    console.log('📋 查詢可用司機:', {
      vehicleType,
      date,
      time,
      duration
    });

    const db = new DatabaseService(true); // 使用 service_role key

    // 1. 獲取所有司機用戶
    const { data: drivers, error: driversError } = await db.supabase
      .from('users')
      .select('id, firebase_uid, email, phone, role, status')  // ✅ 添加 phone 欄位
      .contains('roles', ['driver']) // ✅ 修復：檢查 roles 陣列是否包含 'driver'，支援一個帳號同時登入客戶端與司機端
      .eq('status', 'active');

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

    console.log(`📋 找到 ${drivers?.length || 0} 位司機用戶`);  // ✅ 添加日誌

    // 2. 獲取所有司機的 ID
    const driverIds = drivers?.map((d: any) => d.id) || [];

    // 3. 分別查詢 profiles 和 drivers 資料
    const { data: profiles } = await db.supabase
      .from('user_profiles')
      .select('*')
      .in('user_id', driverIds);

    const { data: driverInfos } = await db.supabase
      .from('drivers')
      .select('*')
      .in('user_id', driverIds);

    // 4. 創建映射
    const profileMap = new Map();
    profiles?.forEach((p: any) => profileMap.set(p.user_id, p));

    const driverInfoMap = new Map();
    driverInfos?.forEach((d: any) => driverInfoMap.set(d.user_id, d));

    // 5. 合併資料
    const driversWithInfo = drivers?.map((driver: any) => ({
      ...driver,
      user_profiles: profileMap.get(driver.id),
      drivers: driverInfoMap.get(driver.id)
    })) || [];

    // 6. 過濾可用司機
    const availableDrivers = driversWithInfo.filter((driver: any) => {
      const driverInfo = driver.drivers;

      // 檢查司機資料是否存在
      if (!driverInfo) {
        console.log(`⚠️ 司機 ${driver.email} 沒有 drivers 記錄`);  // ✅ 添加日誌
        return false;
      }

      // 檢查是否可用
      if (!driverInfo.is_available) {
        console.log(`⚠️ 司機 ${driver.email} 不可用 (is_available = ${driverInfo.is_available})`);  // ✅ 添加日誌
        return false;
      }

      // 如果指定了車型，檢查車型是否匹配
      if (vehicleType && driverInfo.vehicle_type !== vehicleType) {
        console.log(`⚠️ 司機 ${driver.email} 車型不匹配 (需要: ${vehicleType}, 實際: ${driverInfo.vehicle_type})`);  // ✅ 添加日誌
        return false;
      }

      console.log(`✅ 司機 ${driver.email} 可用`);  // ✅ 添加日誌
      return true;
    });

    console.log(`📋 過濾後找到 ${availableDrivers.length} 位可用司機`);  // ✅ 添加日誌

    // 3. 如果提供了日期和時間，檢查時間衝突
    let driversWithConflicts = [];
    
    if (date && time) {
      // 計算訂單結束時間
      const [hours, minutes] = time.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + (duration * 60);
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

      console.log(`⏰ 檢查時間衝突: ${date} ${time} - ${endTime}`);

      // 獲取所有司機在該日期的訂單
      const { data: existingBookings, error: bookingsError } = await db.supabase
        .from('bookings')
        .select('driver_id, start_date, start_time, duration_hours')
        .eq('start_date', date)
        .in('status', ['assigned', 'driver_confirmed', 'driver_departed', 'driver_arrived', 'trip_started']);

      if (bookingsError) {
        console.error('❌ 獲取訂單失敗:', bookingsError);
      } else {
        // 檢查每個司機的衝突
        driversWithConflicts = availableDrivers.map((driver: any) => {
          const driverBookings = (existingBookings || []).filter(
            (booking: any) => booking.driver_id === driver.id
          );

          // 檢查是否有時間衝突
          const hasConflict = driverBookings.some((booking: any) => {
            const [bookingHours, bookingMinutes] = booking.start_time.split(':').map(Number);
            const bookingStartMinutes = bookingHours * 60 + bookingMinutes;
            const bookingEndMinutes = bookingStartMinutes + (booking.duration_hours * 60);

            // 檢查時間段是否重疊
            // 重疊條件: (A.start < B.end) AND (A.end > B.start)
            const overlap = (startMinutes < bookingEndMinutes) && (endMinutes > bookingStartMinutes);

            if (overlap) {
              console.log(`⚠️ 司機 ${driver.id} 有時間衝突:`, {
                newBooking: `${time} - ${endTime}`,
                existingBooking: `${booking.start_time} - ${bookingEndMinutes / 60}:${bookingEndMinutes % 60}`
              });
            }

            return overlap;
          });

          const driverInfo = driver.drivers;
          const profile = driver.user_profiles;

          return {
            id: driver.id,
            name: profile
              ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || '未知司機'
              : '未知司機',
            phone: driver.phone || '無電話',  // ✅ 修復：從 driver.phone 讀取，不是 profile.phone
            email: driver.email,
            vehicleType: driverInfo?.vehicle_type,
            vehiclePlate: driverInfo?.vehicle_plate,
            vehicleModel: driverInfo?.vehicle_model,
            isAvailable: driverInfo?.is_available,
            rating: driverInfo?.rating || 0,
            totalTrips: driverInfo?.total_trips || 0,
            currentBookings: driverBookings.length,
            hasConflict,
          };
        });
      }
    } else {
      // 沒有提供日期時間，不檢查衝突
      driversWithConflicts = availableDrivers.map((driver: any) => {
        const driverInfo = driver.drivers;
        const profile = driver.user_profiles;

        return {
          id: driver.id,
          name: profile
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || '未知司機'
            : '未知司機',
          phone: driver.phone || '無電話',  // ✅ 修復：從 driver.phone 讀取，不是 profile.phone
          email: driver.email,
          vehicleType: driverInfo?.vehicle_type,
          vehiclePlate: driverInfo?.vehicle_plate,
          vehicleModel: driverInfo?.vehicle_model,
          isAvailable: driverInfo?.is_available,
          rating: driverInfo?.rating || 0,
          totalTrips: driverInfo?.total_trips || 0,
          currentBookings: 0,
          hasConflict: false,
        };
      });
    }

    // 4. 排序：無衝突的在前，按當前訂單數量排序
    driversWithConflicts.sort((a: any, b: any) => {
      if (a.hasConflict !== b.hasConflict) {
        return a.hasConflict ? 1 : -1; // 無衝突的在前
      }
      return a.currentBookings - b.currentBookings; // 訂單少的在前
    });

    console.log(`✅ 找到 ${driversWithConflicts.length} 位可用司機 (${driversWithConflicts.filter((d: any) => !d.hasConflict).length} 位無衝突)`);

    return NextResponse.json({
      success: true,
      data: driversWithConflicts,
      total: driversWithConflicts.length,
      availableCount: driversWithConflicts.filter((d: any) => !d.hasConflict).length,
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


import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase';

/**
 * POST /api/admin/bookings/[id]/assign-driver
 * 手動分配司機給訂單
 * 
 * 請求體:
 * - driverId: 司機 ID
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;
    const body = await request.json();
    const { driverId } = body;

    console.log('📋 手動分配司機:', {
      bookingId,
      driverId
    });

    if (!driverId) {
      return NextResponse.json(
        { 
          success: false,
          error: '缺少司機 ID' 
        },
        { status: 400 }
      );
    }

    const db = new DatabaseService();

    // 1. 獲取訂單資訊
    const { data: booking, error: bookingError } = await db.supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('❌ 獲取訂單失敗:', bookingError);
      return NextResponse.json(
        { 
          success: false,
          error: '訂單不存在', 
          details: bookingError?.message 
        },
        { status: 404 }
      );
    }

    // 2. 檢查訂單是否已分配司機
    if (booking.driver_id) {
      console.log('⚠️ 訂單已分配司機:', booking.driver_id);
      // 允許重新分配，但記錄警告
    }

    // 3. 獲取司機資訊
    const { data: driver, error: driverError } = await db.supabase
      .from('users')
      .select(`
        id,
        role,
        drivers!user_id (
          id,
          vehicle_type,
          is_available
        )
      `)
      .eq('id', driverId)
      .eq('role', 'driver')
      .single();

    if (driverError || !driver) {
      console.error('❌ 獲取司機失敗:', driverError);
      return NextResponse.json(
        { 
          success: false,
          error: '司機不存在', 
          details: driverError?.message 
        },
        { status: 404 }
      );
    }

    const driverInfo = driver.drivers?.[0] || driver.drivers;

    if (!driverInfo) {
      return NextResponse.json(
        { 
          success: false,
          error: '司機資料不完整' 
        },
        { status: 400 }
      );
    }

    // 4. 檢查司機是否可用
    if (!driverInfo.is_available) {
      return NextResponse.json(
        { 
          success: false,
          error: '司機目前不可用' 
        },
        { status: 400 }
      );
    }

    // 5. 檢查車型是否匹配
    if (driverInfo.vehicle_type !== booking.vehicle_type) {
      console.log('⚠️ 車型不匹配:', {
        required: booking.vehicle_type,
        driver: driverInfo.vehicle_type
      });
      // 允許分配，但記錄警告
    }

    // 6. 檢查時間衝突
    const [hours, minutes] = booking.start_time.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + (booking.duration_hours * 60);

    const { data: existingBookings, error: conflictError } = await db.supabase
      .from('bookings')
      .select('id, start_time, duration_hours')
      .eq('driver_id', driverId)
      .eq('start_date', booking.start_date)
      .in('status', ['assigned', 'driver_confirmed', 'driver_departed', 'driver_arrived', 'trip_started'])
      .neq('id', bookingId); // 排除當前訂單

    if (conflictError) {
      console.error('❌ 檢查衝突失敗:', conflictError);
    } else if (existingBookings && existingBookings.length > 0) {
      // 檢查時間衝突
      const hasConflict = existingBookings.some((existingBooking: any) => {
        const [existingHours, existingMinutes] = existingBooking.start_time.split(':').map(Number);
        const existingStartMinutes = existingHours * 60 + existingMinutes;
        const existingEndMinutes = existingStartMinutes + (existingBooking.duration_hours * 60);

        // 檢查時間段是否重疊
        const overlap = (startMinutes < existingEndMinutes) && (endMinutes > existingStartMinutes);

        return overlap;
      });

      if (hasConflict) {
        return NextResponse.json(
          { 
            success: false,
            error: '司機在該時間段已有其他訂單' 
          },
          { status: 400 }
        );
      }
    }

    // 7. 更新訂單
    const { data: updatedBooking, error: updateError } = await db.supabase
      .from('bookings')
      .update({
        driver_id: driverId,
        status: 'matched',  // 使用 'matched' 而不是 'assigned'，與 Flutter 應用的狀態定義一致
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ 更新訂單失敗:', updateError);
      return NextResponse.json(
        { 
          success: false,
          error: '分配司機失敗', 
          details: updateError.message 
        },
        { status: 500 }
      );
    }

    console.log('✅ 成功分配司機:', {
      bookingId,
      driverId,
      status: 'matched'
    });

    return NextResponse.json({
      success: true,
      data: updatedBooking,
      message: '成功分配司機',
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


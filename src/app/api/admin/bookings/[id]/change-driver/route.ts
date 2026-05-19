import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase';

/**
 * PUT /api/admin/bookings/[id]/change-driver
 * 更改訂單的司機
 * 
 * 請求體:
 * - newDriverId: 新司機 ID
 * - reason: 更改原因（必填，至少 5 字，用於審計回溯）
 * - changedBy: 操作人識別（公司端帳號 email/name/id，可選）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;
    const body = await request.json();
    const { newDriverId, reason, changedBy } = body;

    console.log('📋 更改訂單司機:', {
      bookingId,
      newDriverId,
      reason,
      changedBy
    });

    if (!newDriverId) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少新司機 ID'
        },
        { status: 400 }
      );
    }

    const trimmedReason = typeof reason === 'string' ? reason.trim() : '';
    if (trimmedReason.length < 5) {
      return NextResponse.json(
        {
          success: false,
          error: '請輸入更改原因（至少 5 個字），以利後續回溯'
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

    // 2. 檢查訂單狀態是否允許更改司機
    // matched: 公司端已配對司機但司機尚未接受（突發狀況常見：司機沒回應、臨時取消等）
    const allowedStatuses = [
      'matched',
      'assigned',
      'driver_confirmed',
      'driver_departed',
      'driver_arrived'
    ];

    if (!allowedStatuses.includes(booking.status)) {
      return NextResponse.json(
        { 
          success: false,
          error: `訂單狀態 ${booking.status} 不允許更改司機` 
        },
        { status: 400 }
      );
    }

    // 3. 檢查是否已有司機
    if (!booking.driver_id) {
      return NextResponse.json(
        { 
          success: false,
          error: '訂單尚未分配司機，請使用派單功能' 
        },
        { status: 400 }
      );
    }

    // 4. 檢查新司機是否與舊司機相同
    if (booking.driver_id === newDriverId) {
      return NextResponse.json(
        { 
          success: false,
          error: '新司機與當前司機相同' 
        },
        { status: 400 }
      );
    }

    // 5. 獲取新司機資訊
    const { data: newDriver, error: newDriverError } = await db.supabase
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
      .eq('id', newDriverId)
      .eq('role', 'driver')
      .single();

    if (newDriverError || !newDriver) {
      console.error('❌ 獲取新司機失敗:', newDriverError);
      return NextResponse.json(
        { 
          success: false,
          error: '新司機不存在', 
          details: newDriverError?.message 
        },
        { status: 404 }
      );
    }

    const newDriverInfo = newDriver.drivers?.[0] || newDriver.drivers;

    if (!newDriverInfo) {
      return NextResponse.json(
        { 
          success: false,
          error: '新司機資料不完整' 
        },
        { status: 400 }
      );
    }

    // 6. 檢查新司機是否可用
    if (!newDriverInfo.is_available) {
      return NextResponse.json(
        { 
          success: false,
          error: '新司機目前不可用' 
        },
        { status: 400 }
      );
    }

    // 7. 檢查車型是否匹配
    if (newDriverInfo.vehicle_type !== booking.vehicle_type) {
      console.log('⚠️ 車型不匹配:', {
        required: booking.vehicle_type,
        driver: newDriverInfo.vehicle_type
      });
      // 允許更改，但記錄警告
    }

    // 8. 檢查新司機的時間衝突
    const [hours, minutes] = booking.start_time.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + (booking.duration_hours * 60);

    const { data: existingBookings, error: conflictError } = await db.supabase
      .from('bookings')
      .select('id, start_time, duration_hours')
      .eq('driver_id', newDriverId)
      .eq('start_date', booking.start_date)
      .in('status', ['assigned', 'driver_confirmed', 'driver_departed', 'driver_arrived', 'trip_started'])
      .neq('id', bookingId);

    if (conflictError) {
      console.error('❌ 檢查衝突失敗:', conflictError);
    } else if (existingBookings && existingBookings.length > 0) {
      // 檢查時間衝突
      const hasConflict = existingBookings.some((existingBooking: any) => {
        const [existingHours, existingMinutes] = existingBooking.start_time.split(':').map(Number);
        const existingStartMinutes = existingHours * 60 + existingMinutes;
        const existingEndMinutes = existingStartMinutes + (existingBooking.duration_hours * 60);

        const overlap = (startMinutes < existingEndMinutes) && (endMinutes > existingStartMinutes);
        return overlap;
      });

      if (hasConflict) {
        return NextResponse.json(
          { 
            success: false,
            error: '新司機在該時間段已有其他訂單' 
          },
          { status: 400 }
        );
      }
    }

    // 9. 更新訂單
    const previousDriverId = booking.driver_id;

    const { data: updatedBooking, error: updateError } = await db.supabase
      .from('bookings')
      .update({
        driver_id: newDriverId,
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
          error: '更改司機失敗', 
          details: updateError.message 
        },
        { status: 500 }
      );
    }

    console.log('✅ 成功更改司機:', {
      bookingId,
      previousDriverId,
      newDriverId,
      reason: trimmedReason
    });

    // 10. 寫入審計歷史表（失敗不擋主流程，但要留 log 讓人工補登）
    const { error: auditError } = await db.supabase
      .from('booking_driver_changes')
      .insert({
        booking_id: bookingId,
        previous_driver_id: previousDriverId,
        new_driver_id: newDriverId,
        reason: trimmedReason,
        previous_status: booking.status,
        changed_by: typeof changedBy === 'string' && changedBy.trim() ? changedBy.trim() : null,
      });

    if (auditError) {
      console.error('⚠️ 司機變更已套用，但審計記錄寫入失敗:', {
        bookingId,
        previousDriverId,
        newDriverId,
        reason: trimmedReason,
        error: auditError.message,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...updatedBooking,
        previous_driver_id: previousDriverId
      },
      message: '成功更改司機',
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


import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

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

    // 用 service role 才能讀 user_profiles（PII，有 RLS）
    const db = new DatabaseService(true);

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
    // trip_started: 行程進行中（車禍、車輛故障等突發狀況需要派新車）
    const allowedStatuses = [
      'matched',
      'assigned',
      'driver_confirmed',
      'driver_departed',
      'driver_arrived',
      'trip_started'
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

    // 5. 獲取新司機資訊（含 firebase_uid 與姓名，用於後續同步聊天室）
    const { data: newDriver, error: newDriverError } = await db.supabase
      .from('users')
      .select(`
        id,
        role,
        firebase_uid,
        email,
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
    // 換司機一律把狀態重置回 matched，讓新司機重新走 確認接單 → 出發 → 抵達 流程
    // 避免新司機接到「已出發」「已到達」這種繼承自舊司機的假進度
    // matched → driver_confirmed 時前端會自動為新司機建立新的聊天室
    const previousDriverId = booking.driver_id;

    const { data: updatedBooking, error: updateError } = await db.supabase
      .from('bookings')
      .update({
        driver_id: newDriverId,
        status: 'matched',
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

    // 11. 同步 Firestore 聊天室（若存在）
    // 聊天室僅在 driver_confirmed 之後才會建立；matched 階段換司機通常還沒有聊天室
    // 失敗只 log 不擋主流程
    try {
      const newDriverFirebaseUid = (newDriver as any).firebase_uid;
      if (!newDriverFirebaseUid) {
        console.warn('⚠️ 新司機沒有 firebase_uid，跳過聊天室同步:', newDriverId);
      } else {
        // 查新司機顯示姓名（user_profiles）
        const { data: profile } = await db.supabase
          .from('user_profiles')
          .select('first_name, last_name')
          .eq('user_id', newDriverId)
          .single();

        const last = profile?.last_name?.trim() || '';
        const first = profile?.first_name?.trim() || '';
        const newDriverName = (last + first).trim() || (newDriver as any).email?.split('@')[0] || '司機';

        const firestore = getAdminFirestore();
        const chatRoomRef = firestore.collection('chat_rooms').doc(bookingId);
        const chatRoomSnap = await chatRoomRef.get();

        if (chatRoomSnap.exists) {
          const now = Timestamp.now();
          const switchMessage = `本訂單司機已更換為「${newDriverName}」，請與新司機聯絡。`;

          // 11a. 更新聊天室 driverId / driverName 並把最新訊息更新
          await chatRoomRef.update({
            driverId: newDriverFirebaseUid,
            driverName: newDriverName,
            lastMessage: switchMessage,
            lastMessageTime: now,
            updatedAt: now,
          });

          // 11b. 加一則系統訊息，雙方都看得到變更
          await chatRoomRef.collection('messages').add({
            senderId: 'system',
            receiverId: 'all',
            senderName: '系統',
            receiverName: '所有人',
            messageText: switchMessage,
            translatedText: null,
            createdAt: now,
            readAt: null,
          });

          console.log('✅ 聊天室已同步為新司機:', { bookingId, newDriverFirebaseUid, newDriverName });
        } else {
          console.log('ℹ️ 聊天室尚未建立（多為 matched 換 matched 的情境），跳過同步');
        }
      }
    } catch (firestoreError) {
      console.error('⚠️ 同步聊天室失敗（不影響主流程）:', firestoreError);
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


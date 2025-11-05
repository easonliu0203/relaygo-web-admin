import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase';

/**
 * 取消訂單請求介面
 */
interface CancelBookingRequest {
  customerUid: string;
  reason: string;
}

/**
 * POST /api/bookings/:id/cancel
 * 取消訂單
 * 
 * 功能：
 * 1. 驗證用戶權限（只能取消自己的訂單）
 * 2. 檢查訂單狀態（只能取消 pending 或 matched 狀態）
 * 3. 更新 Supabase bookings 表
 * 4. Trigger 自動寫入 outbox 表
 * 5. Edge Function 自動同步到 Firestore
 * 
 * CQRS 架構：
 * - 所有寫入操作都通過 Supabase API
 * - Firestore 只作為 Read Model
 * - 客戶端不直接寫入 Firestore
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;
    const body: CancelBookingRequest = await request.json();

    console.log('🚫 收到取消訂單請求:', {
      bookingId,
      customerUid: body.customerUid,
      reason: body.reason
    });

    // 驗證必要欄位
    if (!body.customerUid || !body.reason) {
      console.error('❌ 缺少必要欄位');
      return NextResponse.json(
        { 
          success: false,
          error: '缺少必要欄位: customerUid 或 reason' 
        },
        { status: 400 }
      );
    }

    // 驗證取消原因長度
    if (body.reason.length < 5) {
      console.error('❌ 取消原因太短');
      return NextResponse.json(
        { 
          success: false,
          error: '取消原因至少需要 5 個字元' 
        },
        { status: 400 }
      );
    }

    if (body.reason.length > 200) {
      console.error('❌ 取消原因太長');
      return NextResponse.json(
        { 
          success: false,
          error: '取消原因不能超過 200 個字元' 
        },
        { status: 400 }
      );
    }

    const db = new DatabaseService();

    // 1. 查詢訂單
    const { data: booking, error: bookingError } = await db.supabase
      .from('bookings')
      .select(`
        id,
        status,
        customer:customer_id (
          id,
          firebase_uid
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('❌ 訂單不存在:', bookingError);
      return NextResponse.json(
        { 
          success: false,
          error: '訂單不存在' 
        },
        { status: 404 }
      );
    }

    console.log('📋 找到訂單:', {
      id: booking.id,
      status: booking.status,
      customerUid: booking.customer?.firebase_uid
    });

    // 2. 驗證用戶權限（只能取消自己的訂單）
    if (booking.customer?.firebase_uid !== body.customerUid) {
      console.error('❌ 權限不足:', {
        requestUid: body.customerUid,
        bookingUid: booking.customer?.firebase_uid
      });
      return NextResponse.json(
        { 
          success: false,
          error: '您沒有權限取消此訂單' 
        },
        { status: 403 }
      );
    }

    // 3. 檢查訂單狀態（只能取消 pending 或 matched 狀態）
    const cancellableStatuses = ['pending', 'matched'];
    if (!cancellableStatuses.includes(booking.status)) {
      console.error('❌ 訂單狀態不允許取消:', booking.status);
      return NextResponse.json(
        { 
          success: false,
          error: `訂單狀態為 ${booking.status}，無法取消。只能取消待配對或已配對的訂單。` 
        },
        { status: 400 }
      );
    }

    // 4. 更新訂單狀態為 cancelled
    const { data: updatedBooking, error: updateError } = await db.supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancellation_reason: body.reason,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError || !updatedBooking) {
      console.error('❌ 更新訂單失敗:', updateError);
      return NextResponse.json(
        { 
          success: false,
          error: '取消訂單失敗，請稍後再試' 
        },
        { status: 500 }
      );
    }

    console.log('✅ 訂單已取消:', {
      id: updatedBooking.id,
      status: updatedBooking.status,
      cancelledAt: updatedBooking.cancelled_at
    });

    // 5. 返回成功結果
    // 注意：資料將由 Supabase Trigger 自動鏡像到 Firestore
    // 不需要從客戶端直接寫入 Firebase
    return NextResponse.json({
      success: true,
      message: '訂單已成功取消',
      data: {
        id: updatedBooking.id,
        status: updatedBooking.status,
        cancelledAt: updatedBooking.cancelled_at,
        cancellationReason: updatedBooking.cancellation_reason
      }
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


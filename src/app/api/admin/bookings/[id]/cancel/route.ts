import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase';

/**
 * POST /api/admin/bookings/[id]/cancel
 * 取消訂單
 *
 * 請求體:
 * - reason: 取消原因（必填）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;
    const body = await request.json();
    const { reason } = body;

    console.log('📋 取消訂單:', {
      bookingId,
      reason
    });

    if (!reason || reason.trim() === '') {
      return NextResponse.json(
        { 
          success: false,
          error: '請提供取消原因' 
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

    // 2. 檢查訂單是否已取消
    if (booking.status === 'cancelled') {
      return NextResponse.json(
        { 
          success: false,
          error: '訂單已經被取消' 
        },
        { status: 400 }
      );
    }

    // 3. 檢查訂單是否已完成
    if (booking.status === 'completed') {
      return NextResponse.json(
        { 
          success: false,
          error: '已完成的訂單無法取消' 
        },
        { status: 400 }
      );
    }

    // 4. 檢查訂單是否正在進行中
    const inProgressStatuses = ['trip_started'];
    if (inProgressStatuses.includes(booking.status)) {
      return NextResponse.json(
        { 
          success: false,
          error: '行程已開始，無法取消訂單' 
        },
        { status: 400 }
      );
    }

    // 5. 更新訂單狀態
    const updateData = {
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason.trim(),
      updated_at: new Date().toISOString(),
    };

    const { data: updatedBooking, error: updateError } = await db.supabase
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ 更新訂單失敗:', updateError);
      return NextResponse.json(
        { 
          success: false,
          error: '取消訂單失敗', 
          details: updateError.message 
        },
        { status: 500 }
      );
    }

    console.log('✅ 成功取消訂單:', {
      bookingId,
      previousStatus: booking.status,
      hadDriver: !!booking.driver_id,
      reason
    });

    // 6. 如果訂單已分配司機，記錄日誌（司機會自動釋放，因為訂單狀態變為 cancelled）
    if (booking.driver_id) {
      console.log('📝 訂單已分配司機，司機將被釋放:', booking.driver_id);
      // 注意：司機的 is_available 狀態由司機端應用管理
      // 這裡只是記錄日誌，不直接修改司機狀態
    }

    return NextResponse.json({
      success: true,
      data: updatedBooking,
      message: '訂單已取消',
      hadDriver: !!booking.driver_id
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


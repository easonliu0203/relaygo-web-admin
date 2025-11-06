/**
 * API 端點：標記訊息為已讀
 * PUT /api/chat/mark-read/:bookingId?userId={firebaseUid}
 * 
 * 功能：
 * 1. 標記指定訂單中用戶接收的所有未讀訊息為已讀
 * 2. 驗證用戶權限
 */

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase';

export async function PUT(
  req: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const { bookingId } = params;

    // 1. 獲取查詢參數
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId'); // Firebase UID

    // 2. 驗證必填參數
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必填參數',
          details: 'userId 是必填的',
        },
        { status: 400 }
      );
    }

    // 3. 創建資料庫服務
    const db = new DatabaseService(true);

    // 4. 查詢用戶資訊
    const { data: user, error: userError } = await db.supabase
      .from('users')
      .select('id')
      .eq('firebase_uid', userId)
      .single();

    if (userError || !user) {
      console.error('❌ 查詢用戶失敗:', userError);
      return NextResponse.json(
        {
          success: false,
          error: '用戶不存在',
          details: userError?.message,
        },
        { status: 404 }
      );
    }

    // 5. 查詢訂單資訊
    const { data: booking, error: bookingError } = await db.supabase
      .from('bookings')
      .select('id, customer_id, driver_id')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('❌ 查詢訂單失敗:', bookingError);
      return NextResponse.json(
        {
          success: false,
          error: '訂單不存在',
          details: bookingError?.message,
        },
        { status: 404 }
      );
    }

    // 6. 驗證用戶是否為訂單的客戶或司機
    const isCustomer = booking.customer_id === user.id;
    const isDriver = booking.driver_id === user.id;

    if (!isCustomer && !isDriver) {
      return NextResponse.json(
        {
          success: false,
          error: '無權限標記訊息',
          details: '您不是此訂單的客戶或司機',
        },
        { status: 403 }
      );
    }

    // 7. 標記所有未讀訊息為已讀
    const { data: updatedMessages, error: updateError } = await db.supabase
      .from('chat_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('booking_id', bookingId)
      .eq('receiver_id', user.id)
      .is('read_at', null)
      .select();

    if (updateError) {
      console.error('❌ 標記訊息失敗:', updateError);
      return NextResponse.json(
        {
          success: false,
          error: '標記訊息失敗',
          details: updateError.message,
        },
        { status: 500 }
      );
    }

    console.log(`✅ 標記 ${updatedMessages?.length || 0} 則訊息為已讀`);

    // 8. 返回成功響應
    return NextResponse.json({
      success: true,
      data: {
        markedCount: updatedMessages?.length || 0,
      },
      message: '訊息已標記為已讀',
    });
  } catch (error: any) {
    console.error('❌ 標記訊息異常:', error);
    return NextResponse.json(
      {
        success: false,
        error: '伺服器錯誤',
        details: error.message,
      },
      { status: 500 }
    );
  }
}


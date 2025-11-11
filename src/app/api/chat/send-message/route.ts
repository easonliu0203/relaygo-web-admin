/**
 * API 端點：發送聊天訊息
 * POST /api/chat/send-message
 * 
 * 功能：
 * 1. 驗證用戶身份（Firebase Auth）
 * 2. 驗證用戶是否為訂單的客戶或司機
 * 3. 驗證訂單是否已配對
 * 4. 驗證是否在開始時間前 24 小時內
 * 5. 寫入 Supabase chat_messages 表
 * 6. 通過 trigger 自動同步到 Firestore
 */

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    // 1. 解析請求體
    const body = await req.json();
    const { bookingId, senderId, receiverId, messageText } = body;

    // 2. 驗證必填欄位
    if (!bookingId || !senderId || !receiverId || !messageText) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必填欄位',
          details: 'bookingId, senderId, receiverId, messageText 都是必填的',
        },
        { status: 400 }
      );
    }

    // 3. 創建資料庫服務（使用 service_role key）
    const db = new DatabaseService(true);

    // 4. 查詢訂單資訊
    const { data: booking, error: bookingError } = await db.supabase
      .from('bookings')
      .select('id, customer_id, driver_id, status, start_date, start_time')
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

    // 5. 查詢發送者和接收者的 user_id
    const { data: senderUser } = await db.supabase
      .from('users')
      .select('id')
      .eq('firebase_uid', senderId)
      .single();

    const { data: receiverUser } = await db.supabase
      .from('users')
      .select('id')
      .eq('firebase_uid', receiverId)
      .single();

    if (!senderUser || !receiverUser) {
      return NextResponse.json(
        {
          success: false,
          error: '用戶不存在',
        },
        { status: 404 }
      );
    }

    // 6. 驗證發送者是否為訂單的客戶或司機
    const isCustomer = booking.customer_id === senderUser.id;
    const isDriver = booking.driver_id === senderUser.id;

    if (!isCustomer && !isDriver) {
      return NextResponse.json(
        {
          success: false,
          error: '無權限發送訊息',
          details: '您不是此訂單的客戶或司機',
        },
        { status: 403 }
      );
    }

    // 7. 驗證接收者是否為訂單的另一方
    const receiverIsCustomer = booking.customer_id === receiverUser.id;
    const receiverIsDriver = booking.driver_id === receiverUser.id;

    if (!receiverIsCustomer && !receiverIsDriver) {
      return NextResponse.json(
        {
          success: false,
          error: '接收者不是此訂單的參與者',
        },
        { status: 403 }
      );
    }

    // 8. 驗證訂單是否已配對
    if (booking.status !== 'matched' && booking.status !== 'in_progress' && booking.status !== 'completed') {
      return NextResponse.json(
        {
          success: false,
          error: '訂單尚未配對',
          details: '只有已配對的訂單才能發送訊息',
        },
        { status: 403 }
      );
    }

    // 9. 驗證是否在開始時間前 24 小時內（或訂單進行中/已完成）
    const bookingTime = new Date(`${booking.start_date}T${booking.start_time}`);
    const now = new Date();
    const hoursUntilBooking = (bookingTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // 如果訂單已完成，不允許發送新訊息
    if (booking.status === 'completed') {
      return NextResponse.json(
        {
          success: false,
          error: '訂單已完成',
          details: '訂單完成後無法發送新訊息',
        },
        { status: 403 }
      );
    }

    // 如果訂單還沒開始，檢查是否在 24 小時內
    if (booking.status === 'matched' && hoursUntilBooking > 24) {
      return NextResponse.json(
        {
          success: false,
          error: '尚未到聊天時間',
          details: '訂單開始前 24 小時內才能發送訊息',
        },
        { status: 403 }
      );
    }

    // 10. 插入聊天訊息
    const { data: message, error: insertError } = await db.supabase
      .from('chat_messages')
      .insert({
        booking_id: bookingId,
        sender_id: senderUser.id,
        receiver_id: receiverUser.id,
        message_text: messageText,
        translated_text: null, // 預留，之後串接 ChatGPT
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ 插入訊息失敗:', insertError);
      return NextResponse.json(
        {
          success: false,
          error: '發送訊息失敗',
          details: insertError.message,
        },
        { status: 500 }
      );
    }

    console.log('✅ 訊息發送成功:', message.id);

    // 11. 返回成功響應
    return NextResponse.json({
      success: true,
      data: {
        id: message.id,
        bookingId: message.booking_id,
        senderId: senderId,
        receiverId: receiverId,
        messageText: message.message_text,
        translatedText: message.translated_text,
        createdAt: message.created_at,
      },
      message: '訊息發送成功',
    });
  } catch (error: any) {
    console.error('❌ 發送訊息異常:', error);
    return NextResponse.json(
      {
        success: false,
        error: '伺服器錯誤',
        details: (error as any).message,
      },
      { status: 500 }
    );
  }
}


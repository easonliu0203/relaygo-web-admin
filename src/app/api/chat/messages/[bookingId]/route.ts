/**
 * API 端點：獲取聊天訊息
 * GET /api/chat/messages/:bookingId?userId={firebaseUid}&limit=50&before={timestamp}
 * 
 * 功能：
 * 1. 獲取指定訂單的聊天訊息
 * 2. 支持分頁載入（使用 limit 和 before 參數）
 * 3. 驗證用戶權限
 */

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const { bookingId } = params;

    // 1. 獲取查詢參數
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId'); // Firebase UID
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before'); // ISO timestamp

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
          error: '無權限查看訊息',
          details: '您不是此訂單的客戶或司機',
        },
        { status: 403 }
      );
    }

    // 7. 查詢聊天訊息
    let messagesQuery = db.supabase
      .from('chat_messages')
      .select('id, sender_id, receiver_id, message_text, translated_text, created_at, read_at')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // 如果提供了 before 參數，只查詢該時間之前的訊息
    if (before) {
      messagesQuery = messagesQuery.lt('created_at', before);
    }

    const { data: messages, error: messagesError } = await messagesQuery;

    if (messagesError) {
      console.error('❌ 查詢訊息失敗:', messagesError);
      return NextResponse.json(
        {
          success: false,
          error: '查詢訊息失敗',
          details: messagesError.message,
        },
        { status: 500 }
      );
    }

    // 8. 獲取發送者和接收者的資訊
    const userIds = new Set<string>();
    messages?.forEach((msg: any) => {
      userIds.add(msg.sender_id);
      userIds.add(msg.receiver_id);
    });

    const { data: users } = await db.supabase
      .from('users')
      .select('id, firebase_uid')
      .in('id', Array.from(userIds));

    const { data: profiles } = await db.supabase
      .from('user_profiles')
      .select('user_id, first_name, last_name')
      .in('user_id', Array.from(userIds));

    // 9. 創建用戶映射
    const userMap = new Map();
    users?.forEach((u: any) => userMap.set(u.id, u));

    const profileMap = new Map();
    profiles?.forEach((p: any) => profileMap.set(p.user_id, p));

    // 10. 轉換訊息格式
    const formattedMessages = messages?.map((msg: any) => {
      const sender = userMap.get(msg.sender_id);
      const senderProfile = profileMap.get(msg.sender_id);
      const senderName = senderProfile
        ? `${senderProfile.first_name || ''} ${senderProfile.last_name || ''}`.trim()
        : '未知用戶';

      return {
        id: msg.id,
        senderId: sender?.firebase_uid,
        senderName,
        receiverId: userMap.get(msg.receiver_id)?.firebase_uid,
        messageText: msg.message_text,
        translatedText: msg.translated_text,
        createdAt: msg.created_at,
        readAt: msg.read_at,
        isMine: msg.sender_id === user.id,
      };
    }).reverse(); // 反轉順序，使最舊的訊息在前

    // 11. 返回成功響應
    return NextResponse.json({
      success: true,
      data: formattedMessages || [],
      total: formattedMessages?.length || 0,
      hasMore: (messages?.length || 0) === limit,
    });
  } catch (error: any) {
    console.error('❌ 獲取聊天訊息異常:', error);
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


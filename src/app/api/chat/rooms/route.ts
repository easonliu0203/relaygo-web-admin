/**
 * API 端點：獲取聊天室列表
 * GET /api/chat/rooms?userId={firebaseUid}
 * 
 * 功能：
 * 1. 獲取用戶的所有已配對訂單
 * 2. 為每個訂單創建聊天室資訊
 * 3. 包含最後一則訊息和未讀訊息數量
 */

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

export async function GET(req: NextRequest) {
  try {
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
      .select('id, role')
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

    // 5. 根據用戶角色查詢訂單
    let bookingsQuery = db.supabase
      .from('bookings')
      .select('id, customer_id, driver_id, status, pickup_location, start_date, start_time')
      .in('status', ['matched', 'in_progress', 'completed']);

    if (user.role === 'customer') {
      bookingsQuery = bookingsQuery.eq('customer_id', user.id);
    } else if (user.role === 'driver') {
      bookingsQuery = bookingsQuery.eq('driver_id', user.id);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: '無效的用戶角色',
          details: '只有客戶和司機可以查看聊天室',
        },
        { status: 403 }
      );
    }

    const { data: bookings, error: bookingsError } = await bookingsQuery;

    if (bookingsError) {
      console.error('❌ 查詢訂單失敗:', bookingsError);
      return NextResponse.json(
        {
          success: false,
          error: '查詢訂單失敗',
          details: bookingsError.message,
        },
        { status: 500 }
      );
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        total: 0,
        message: '沒有聊天室',
      });
    }

    // 6. 獲取所有相關用戶的 ID
    const userIds = new Set<string>();
    bookings.forEach(booking => {
      userIds.add(booking.customer_id);
      if (booking.driver_id) {
        userIds.add(booking.driver_id);
      }
    });

    // 7. 查詢用戶資訊
    const { data: users } = await db.supabase
      .from('users')
      .select('id, firebase_uid')
      .in('id', Array.from(userIds));

    const { data: profiles } = await db.supabase
      .from('user_profiles')
      .select('user_id, first_name, last_name, avatar_url')
      .in('user_id', Array.from(userIds));

    // 8. 創建用戶映射
    const userMap = new Map();
    users?.forEach(u => userMap.set(u.id, u));

    const profileMap = new Map();
    profiles?.forEach(p => profileMap.set(p.user_id, p));

    // 9. 為每個訂單獲取最後一則訊息和未讀數量
    const chatRooms = await Promise.all(
      bookings.map(async (booking) => {
        // 獲取最後一則訊息
        const { data: lastMessage } = await db.supabase
          .from('chat_messages')
          .select('message_text, created_at')
          .eq('booking_id', booking.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // 獲取未讀訊息數量
        const { count: unreadCount } = await db.supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('booking_id', booking.id)
          .eq('receiver_id', user.id)
          .is('read_at', null);

        // 確定對方是誰
        const otherUserId = user.role === 'customer' ? booking.driver_id : booking.customer_id;
        const otherUser = userMap.get(otherUserId);
        const otherProfile = profileMap.get(otherUserId);

        const otherUserName = otherProfile
          ? `${otherProfile.first_name || ''} ${otherProfile.last_name || ''}`.trim()
          : '未知用戶';

        return {
          bookingId: booking.id,
          otherUserId: otherUser?.firebase_uid,
          otherUserName,
          otherUserAvatar: otherProfile?.avatar_url,
          pickupAddress: booking.pickup_location,
          bookingTime: `${booking.start_date}T${booking.start_time}`,
          lastMessage: lastMessage?.message_text || '',
          lastMessageTime: lastMessage?.created_at || null,
          unreadCount: unreadCount || 0,
          status: booking.status,
        };
      })
    );

    // 10. 按最後訊息時間排序
    chatRooms.sort((a, b) => {
      if (!a.lastMessageTime) return 1;
      if (!b.lastMessageTime) return -1;
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
    });

    // 11. 返回成功響應
    return NextResponse.json({
      success: true,
      data: chatRooms,
      total: chatRooms.length,
    });
  } catch (error: any) {
    console.error('❌ 獲取聊天室列表異常:', error);
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


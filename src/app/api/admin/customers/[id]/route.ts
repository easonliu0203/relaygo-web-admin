import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase';

/**
 * GET /api/admin/customers/[id]
 * 獲取客戶詳情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customerId = params.id;

    console.log('📋 獲取客戶詳情:', { customerId });

    const db = new DatabaseService(true); // 使用 service_role key

    // 獲取客戶基本資訊
    const { data: user, error: userError } = await db.supabase
      .from('users')
      .select('*')
      .eq('id', customerId)
      .eq('role', 'customer')
      .single();

    if (userError || !user) {
      console.error('❌ 獲取客戶失敗:', userError);
      return NextResponse.json(
        { 
          success: false,
          error: '客戶不存在', 
          details: userError?.message 
        },
        { status: 404 }
      );
    }

    // 獲取客戶個人資料
    const { data: profile, error: profileError } = await db.supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', customerId)
      .single();

    if (profileError) {
      console.warn('⚠️ 獲取客戶個人資料失敗:', profileError);
    }

    // 獲取客戶的訂單統計
    const { data: bookings, error: bookingsError } = await db.supabase
      .from('bookings')
      .select('id, status, total_amount, created_at, pickup_location, dropoff_location')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (bookingsError) {
      console.warn('⚠️ 獲取客戶訂單統計失敗:', bookingsError);
    }

    // 計算統計資料
    const totalOrders = bookings?.length || 0;
    const completedOrders = bookings?.filter(b => b.status === 'completed').length || 0;
    const cancelledOrders = bookings?.filter(b => b.status === 'cancelled').length || 0;
    const totalSpent = bookings
      ?.filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;

    // 最後訂單日期
    const lastOrderDate = bookings && bookings.length > 0 ? bookings[0].created_at : null;

    // VIP 等級判斷（根據消費金額）
    let vipLevel = 'bronze';
    if (totalSpent >= 100000) {
      vipLevel = 'diamond';
    } else if (totalSpent >= 50000) {
      vipLevel = 'platinum';
    } else if (totalSpent >= 20000) {
      vipLevel = 'gold';
    } else if (totalSpent >= 5000) {
      vipLevel = 'silver';
    }

    // 格式化客戶詳情
    const formattedCustomer = {
      // 基本資訊
      id: user.id,
      firebaseUid: user.firebase_uid,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      createdAt: user.created_at,
      updatedAt: user.updated_at,

      // 個人資料
      firstName: profile?.first_name || '',
      lastName: profile?.last_name || '',
      name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || '未設定' : '未設定',
      avatar: profile?.avatar_url || null,
      dateOfBirth: profile?.date_of_birth || null,
      gender: profile?.gender || null,
      address: profile?.address || null,
      emergencyContactName: profile?.emergency_contact_name || null,
      emergencyContactPhone: profile?.emergency_contact_phone || null,

      // 統計資料
      totalOrders: totalOrders,
      completedOrders: completedOrders,
      cancelledOrders: cancelledOrders,
      totalSpent: totalSpent,
      lastOrderDate: lastOrderDate,
      vipLevel: vipLevel,
      joinedDate: user.created_at,

      // 最近訂單
      recentBookings: bookings?.slice(0, 5).map(b => ({
        id: b.id,
        status: b.status,
        amount: b.total_amount,
        pickupLocation: b.pickup_location,
        dropoffLocation: b.dropoff_location,
        createdAt: b.created_at,
      })) || [],
    };

    console.log('✅ 成功獲取客戶詳情:', { customerId, name: formattedCustomer.name });

    return NextResponse.json({
      success: true,
      data: formattedCustomer,
      message: '成功獲取客戶詳情',
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

/**
 * PUT /api/admin/customers/[id]
 * 更新客戶資訊
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customerId = params.id;
    const body = await request.json();

    console.log('📋 更新客戶資訊:', { customerId, body });

    const db = new DatabaseService(true); // 使用 service_role key

    // 更新用戶基本資訊
    if (body.email || body.phone || body.status) {
      const userUpdates: any = {};
      if (body.email) userUpdates.email = body.email;
      if (body.phone) userUpdates.phone = body.phone;
      if (body.status) userUpdates.status = body.status;

      const { error: userError } = await db.supabase
        .from('users')
        .update(userUpdates)
        .eq('id', customerId);

      if (userError) {
        console.error('❌ 更新用戶資訊失敗:', userError);
        return NextResponse.json(
          { success: false, error: '更新用戶資訊失敗', details: userError.message },
          { status: 500 }
        );
      }
    }

    // 更新個人資料
    if (body.firstName || body.lastName || body.avatar || body.dateOfBirth || body.gender || body.address) {
      const profileUpdates: any = {};
      if (body.firstName !== undefined) profileUpdates.first_name = body.firstName;
      if (body.lastName !== undefined) profileUpdates.last_name = body.lastName;
      if (body.avatar !== undefined) profileUpdates.avatar_url = body.avatar;
      if (body.dateOfBirth !== undefined) profileUpdates.date_of_birth = body.dateOfBirth;
      if (body.gender !== undefined) profileUpdates.gender = body.gender;
      if (body.address !== undefined) profileUpdates.address = body.address;
      if (body.emergencyContactName !== undefined) profileUpdates.emergency_contact_name = body.emergencyContactName;
      if (body.emergencyContactPhone !== undefined) profileUpdates.emergency_contact_phone = body.emergencyContactPhone;

      const { error: profileError } = await db.supabase
        .from('user_profiles')
        .update(profileUpdates)
        .eq('user_id', customerId);

      if (profileError) {
        console.error('❌ 更新個人資料失敗:', profileError);
        return NextResponse.json(
          { success: false, error: '更新個人資料失敗', details: profileError.message },
          { status: 500 }
        );
      }
    }

    console.log('✅ 成功更新客戶資訊:', { customerId });

    return NextResponse.json({
      success: true,
      message: '成功更新客戶資訊',
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


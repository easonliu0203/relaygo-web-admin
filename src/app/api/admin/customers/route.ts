import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase';

/**
 * GET /api/admin/customers
 * 管理端獲取客戶列表
 * 
 * 查詢參數:
 * - status: 客戶狀態篩選 (active/inactive/blocked)
 * - search: 搜尋客戶姓名、電話、信箱
 * - limit: 每頁數量 (預設 100)
 * - offset: 偏移量 (預設 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('📋 管理端查詢客戶:', {
      status,
      search,
      limit,
      offset
    });

    const db = new DatabaseService(true); // 使用 service_role key

    // 先查詢用戶
    let userQuery = db.supabase
      .from('users')
      .select('*', { count: 'exact' })
      .eq('role', 'customer')
      .order('created_at', { ascending: false });

    // 狀態篩選
    if (status && status !== 'all') {
      userQuery = userQuery.eq('status', status);
    }

    // 分頁
    userQuery = userQuery.range(offset, offset + limit - 1);

    const { data: users, error: userError, count } = await userQuery;

    if (userError) {
      console.error('❌ 查詢用戶失敗:', userError);
      return NextResponse.json(
        {
          success: false,
          error: '查詢用戶失敗',
          details: userError.message
        },
        { status: 500 }
      );
    }

    // 獲取所有用戶的 ID
    const userIds = users?.map((u: any) => u.id) || [];

    // 查詢所有用戶的 profiles
    const { data: profiles, error: profileError } = await db.supabase
      .from('user_profiles')
      .select('*')
      .in('user_id', userIds);

    if (profileError) {
      console.error('❌ 查詢 profiles 失敗:', profileError);
    }

    console.log(`📋 查詢到 ${profiles?.length || 0} 個 profiles`);
    console.log('   User IDs:', userIds);
    console.log('   Profiles:', profiles);

    // 創建 profile 映射
    const profileMap = new Map();
    profiles?.forEach((p: any) => {
      profileMap.set(p.user_id, p);
    });

    // 合併數據
    const customers = users?.map((user: any) => ({
      ...user,
      user_profiles: profileMap.get(user.id) || null,
    })) || [];

    const error: any = null;

    if (error) {
      console.error('❌ 查詢客戶失敗:', error);
      return NextResponse.json(
        {
          success: false,
          error: '查詢客戶失敗',
          details: error.message
        },
        { status: 500 }
      );
    }

    // 如果有搜尋條件，在應用層過濾
    let filteredCustomers = customers || [];
    if (search) {
      const searchLower = search.toLowerCase();
      filteredCustomers = filteredCustomers.filter((customer: any) => {
        const profile = customer.user_profiles?.[0];
        const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.toLowerCase();
        const email = customer.email?.toLowerCase() || '';
        const phone = profile?.phone?.toLowerCase() || '';

        return fullName.includes(searchLower) ||
               email.includes(searchLower) ||
               phone.includes(searchLower);
      });
    }

    // 格式化客戶資料
    const formattedCustomers = filteredCustomers.map((customer: any) => {
      const profile = customer.user_profiles;

      return {
        id: customer.id,
        firebase_uid: customer.firebase_uid,
        email: customer.email,
        name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || '未設定' : '未設定',
        firstName: profile?.first_name || '',
        lastName: profile?.last_name || '',
        phone: profile?.phone || '',
        avatar: profile?.avatar_url || null,
        status: customer.status || 'active',
        role: customer.role,
        joinDate: customer.created_at,
        updatedAt: customer.updated_at,
        // 這些欄位需要從其他表查詢，暫時設為預設值
        totalOrders: 0,
        totalSpent: 0,
        lastOrderDate: null,
        vipLevel: 'bronze',
      };
    });

    console.log(`✅ 成功查詢 ${formattedCustomers.length} 位客戶`);

    return NextResponse.json({
      success: true,
      data: formattedCustomers,
      total: search ? formattedCustomers.length : (count || 0),
      message: '查詢客戶成功',
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


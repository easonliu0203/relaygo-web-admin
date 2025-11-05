import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase';

/**
 * GET /api/admin/drivers
 * 管理端獲取司機列表
 * 
 * 查詢參數:
 * - status: 司機狀態篩選 (active/inactive/pending/suspended)
 * - search: 搜尋司機姓名、電話、信箱
 * - vehicleType: 車型篩選 (A/B/C/D)
 * - limit: 每頁數量 (預設 100)
 * - offset: 偏移量 (預設 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const vehicleType = searchParams.get('vehicleType');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('📋 管理端查詢司機:', {
      status,
      search,
      vehicleType,
      limit,
      offset
    });

    const db = new DatabaseService(true); // 使用 service_role key

    // 先查詢用戶
    let userQuery = db.supabase
      .from('users')
      .select('*', { count: 'exact' })
      .eq('role', 'driver')
      .order('created_at', { ascending: false });

    // 狀態篩選（用戶狀態）
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
    const userIds = users?.map(u => u.id) || [];

    // 查詢所有用戶的 profiles
    const { data: profiles, error: profileError } = await db.supabase
      .from('user_profiles')
      .select('*')
      .in('user_id', userIds);

    if (profileError) {
      console.error('❌ 查詢 profiles 失敗:', profileError);
    }

    // 查詢所有司機資料
    const { data: driverInfos, error: driverError } = await db.supabase
      .from('drivers')
      .select('*')
      .in('user_id', userIds);

    if (driverError) {
      console.error('❌ 查詢 drivers 失敗:', driverError);
    }

    // 創建映射
    const profileMap = new Map();
    profiles?.forEach(p => {
      profileMap.set(p.user_id, p);
    });

    const driverMap = new Map();
    driverInfos?.forEach(d => {
      driverMap.set(d.user_id, d);
    });

    // 合併數據
    const drivers = users?.map(user => ({
      ...user,
      user_profiles: profileMap.get(user.id) || null,
      drivers: driverMap.get(user.id) || null,
    })) || [];

    const error = null;

    if (error) {
      console.error('❌ 查詢司機失敗:', error);
      return NextResponse.json(
        { 
          success: false,
          error: '查詢司機失敗', 
          details: error.message 
        },
        { status: 500 }
      );
    }

    // 過濾和格式化司機資料
    let filteredDrivers = drivers || [];

    // 車型篩選
    if (vehicleType && vehicleType !== 'all') {
      filteredDrivers = filteredDrivers.filter(driver => {
        const driverInfo = driver.drivers?.[0];
        return driverInfo?.vehicle_type === vehicleType;
      });
    }

    // 搜尋功能（姓名、電話、信箱、車牌）
    if (search) {
      const searchLower = search.toLowerCase();
      filteredDrivers = filteredDrivers.filter(driver => {
        const profile = driver.user_profiles?.[0];
        const driverInfo = driver.drivers?.[0];
        const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.toLowerCase();
        const email = driver.email?.toLowerCase() || '';
        const phone = profile?.phone?.toLowerCase() || '';
        const vehiclePlate = driverInfo?.vehicle_plate?.toLowerCase() || '';

        return fullName.includes(searchLower) ||
               email.includes(searchLower) ||
               phone.includes(searchLower) ||
               vehiclePlate.includes(searchLower);
      });
    }

    // 格式化司機資料
    const formattedDrivers = filteredDrivers.map(driver => {
      const profile = driver.user_profiles;
      const driverInfo = driver.drivers;

      // 使用 user_profiles 的資料
      const firstName = profile?.first_name || '';
      const lastName = profile?.last_name || '';
      const phone = profile?.phone || '';

      return {
        id: driver.id,
        firebase_uid: driver.firebase_uid,
        email: driver.email,
        name: `${firstName} ${lastName}`.trim() || '未設定',
        firstName,
        lastName,
        phone,
        avatar: profile?.avatar_url || null,
        status: driver.status || 'active',
        role: driver.role,
        joinDate: driver.created_at,
        updatedAt: driver.updated_at,
        // 司機特定資訊
        driverId: driverInfo?.id || null,
        licenseNumber: driverInfo?.license_number || '',
        vehicleType: driverInfo?.vehicle_type || '',
        vehiclePlate: driverInfo?.vehicle_plate || '',
        vehicleModel: driverInfo?.vehicle_model || '',
        vehicleYear: driverInfo?.vehicle_year || null,
        isAvailable: driverInfo?.is_available || false,
        driverStatus: driverInfo?.background_check_status || 'pending',
        rating: driverInfo?.rating || 0,
        totalTrips: driverInfo?.total_trips || 0,
        location: '', // 需要從其他表查詢
      };
    });

    console.log(`✅ 成功查詢 ${formattedDrivers.length} 位司機`);

    return NextResponse.json({
      success: true,
      data: formattedDrivers,
      total: search || vehicleType ? formattedDrivers.length : (count || 0),
      message: '查詢司機成功',
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


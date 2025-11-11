import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase';

/**
 * GET /api/admin/bookings
 * 管理端獲取訂單列表
 * 
 * 查詢參數:
 * - status: 訂單狀態篩選
 * - search: 搜尋訂單編號或客戶姓名
 * - limit: 每頁數量 (預設 20)
 * - offset: 偏移量 (預設 0)
 * - startDate: 開始日期
 * - endDate: 結束日期
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const statusesParam = searchParams.get('statuses');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100'); // 管理端預設顯示更多
    const offset = parseInt(searchParams.get('offset') || '0');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    console.log('📋 管理端查詢訂單:', {
      status,
      statuses: statusesParam,
      search,
      limit,
      offset,
      startDate,
      endDate
    });

    const db = new DatabaseService(true); // 使用 service_role key

    // 構建查詢 - 先獲取訂單基本資料
    let query = db.supabase
      .from('bookings')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // 狀態篩選（支援單個狀態或多個狀態）
    if (statusesParam) {
      // 支援多個狀態查詢（例如：statuses=pending_payment,paid_deposit）
      const statuses = statusesParam.split(',').map(s => s.trim());
      query = query.in('status', statuses);
      console.log('📋 使用多個狀態篩選:', statuses);
    } else if (status && status !== 'all') {
      // 單個狀態查詢（向後兼容）
      query = query.eq('status', status);
      console.log('📋 使用單個狀態篩選:', status);
    }

    // 日期範圍篩選
    if (startDate) {
      query = query.gte('start_date', startDate);
    }
    if (endDate) {
      query = query.lte('start_date', endDate);
    }

    // 搜尋功能 (訂單編號)
    if (search) {
      query = query.ilike('booking_number', `%${search}%`);
    }

    // 分頁
    query = query.range(offset, offset + limit - 1);

    const { data: bookings, error, count } = await query;

    if (error) {
      console.error('❌ 獲取訂單失敗:', error);
      return NextResponse.json(
        { 
          success: false,
          error: '獲取訂單失敗', 
          details: error.message 
        },
        { status: 500 }
      );
    }

    console.log(`✅ 成功獲取 ${bookings?.length || 0} 筆訂單 (總計: ${count})`);

    // 獲取所有相關的用戶 ID
    const customerIds = [...new Set(bookings?.map((b: any) => b.customer_id).filter(Boolean))];
    const driverIds = [...new Set(bookings?.map((b: any) => b.driver_id).filter(Boolean))];
    const allUserIds = [...new Set([...customerIds, ...driverIds])];

    // 查詢所有用戶的 profiles
    const { data: profiles } = await db.supabase
      .from('user_profiles')
      .select('*')
      .in('user_id', allUserIds);

    // 查詢所有司機的資訊
    const { data: driverInfos } = await db.supabase
      .from('drivers')
      .select('*')
      .in('user_id', driverIds);

    // 查詢所有用戶基本資訊
    const { data: users } = await db.supabase
      .from('users')
      .select('id, email, firebase_uid')
      .in('id', allUserIds);

    // 創建映射
    const profileMap = new Map();
    profiles?.forEach((p: any) => {
      profileMap.set(p.user_id, p);
    });

    const driverInfoMap = new Map();
    driverInfos?.forEach((d: any) => {
      driverInfoMap.set(d.user_id, d);
    });

    const userMap = new Map();
    users?.forEach((u: any) => {
      userMap.set(u.id, u);
    });

    // 格式化訂單資料
    const formattedBookings = (bookings || []).map((booking: any) => {
      // 獲取客戶資訊
      const customer = userMap.get(booking.customer_id);
      const customerProfile = profileMap.get(booking.customer_id);

      // 獲取司機資訊
      const driver = booking.driver_id ? userMap.get(booking.driver_id) : null;
      const driverProfile = booking.driver_id ? profileMap.get(booking.driver_id) : null;
      const driverInfo = booking.driver_id ? driverInfoMap.get(booking.driver_id) : null;

      return {
        id: booking.id,
        bookingNumber: booking.booking_number,
        status: booking.status,

        // 客戶資訊
        customer: {
          id: customer?.id,
          name: customerProfile
            ? `${customerProfile.first_name || ''} ${customerProfile.last_name || ''}`.trim() || '未知客戶'
            : '未知客戶',
          phone: customerProfile?.phone || '無電話',
          email: customer?.email,
        },

        // 司機資訊
        driver: driver ? {
          id: driver.id,
          name: driverProfile
            ? `${driverProfile.first_name || ''} ${driverProfile.last_name || ''}`.trim() || '未知司機'
            : '未知司機',
          phone: driverProfile?.phone || '無電話',
          email: driver.email,
          vehicleType: driverInfo?.vehicle_type,
          vehiclePlate: driverInfo?.vehicle_plate,
        } : null,
        
        // 訂單詳情
        vehicleType: booking.vehicle_type,
        pickupLocation: booking.pickup_location,
        dropoffLocation: booking.destination,
        scheduledDate: booking.start_date,
        scheduledTime: booking.start_time,
        durationHours: booking.duration_hours,
        
        // 價格資訊
        pricing: {
          basePrice: booking.base_price,
          totalAmount: booking.total_amount,
          depositAmount: booking.deposit_amount,
        },
        
        // 時間戳
        createdAt: booking.created_at,
        updatedAt: booking.updated_at,
        
        // 其他資訊
        specialRequirements: booking.special_requirements,
        requiresForeignLanguage: booking.requires_foreign_language,
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedBookings,
      total: count || 0,
      limit,
      offset,
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


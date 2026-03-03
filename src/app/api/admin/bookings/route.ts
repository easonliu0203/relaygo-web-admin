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
          details: (error as any).message
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

    // 批次查詢支付記錄（訂金 & 尾款）
    const bookingIds = (bookings || []).map((b: any) => b.id);
    const depositPaymentMap = new Map();
    const balancePaymentMap = new Map();
    const signatureMap = new Map();

    if (bookingIds.length > 0) {
      const { data: payments } = await db.supabase
        .from('payments')
        .select('id, booking_id, type, status, transaction_id, external_transaction_id, payment_method, amount, created_at')
        .in('booking_id', bookingIds)
        .eq('status', 'completed');

      payments?.forEach((p: any) => {
        if (p.type === 'deposit') depositPaymentMap.set(p.booking_id, p);
        if (p.type === 'balance') balancePaymentMap.set(p.booking_id, p);
      });

      // 批次查詢客戶數位簽名
      const { data: signatures } = await db.supabase
        .from('payment_signatures')
        .select('booking_id, signature_url, signature_base64, signed_at')
        .in('booking_id', bookingIds);

      signatures?.forEach((s: any) => {
        signatureMap.set(s.booking_id, s);
      });
    }

    // 格式化訂單資料
    const formattedBookings = (bookings || []).map((booking: any) => {
      // 獲取客戶資訊
      const customer = userMap.get(booking.customer_id);
      const customerProfile = profileMap.get(booking.customer_id);

      // 獲取司機資訊
      const driver = booking.driver_id ? userMap.get(booking.driver_id) : null;
      const driverProfile = booking.driver_id ? profileMap.get(booking.driver_id) : null;
      const driverInfo = booking.driver_id ? driverInfoMap.get(booking.driver_id) : null;

      // 支付記錄
      const depositPayment = depositPaymentMap.get(booking.id);
      const balancePayment = balancePaymentMap.get(booking.id);
      const signature = signatureMap.get(booking.id);

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
        passengerCount: booking.passenger_count,
        luggageCount: booking.luggage_count,
        specialRequirements: booking.special_requirements,
        requiresForeignLanguage: booking.requires_foreign_language,

        // 價格資訊（完整欄位）
        pricing: {
          basePrice: booking.base_price,
          originalPrice: booking.original_price,
          discountAmount: booking.discount_amount,
          finalPrice: booking.final_price,
          totalAmount: booking.total_amount,
          depositAmount: booking.deposit_amount,
          balanceAmount: booking.balance_amount,
          overtimeFee: booking.overtime_fee,
          tipAmount: booking.tip_amount,
          platformFee: booking.platform_fee,
          driverEarning: booking.driver_earning,
        },

        // 優惠碼 & 稅務
        promoCode: booking.promo_code,
        taxId: booking.tax_id,
        depositPaid: booking.deposit_paid,

        // 取消政策同意
        policyAgreed: booking.policy_agreed,
        policyAgreedAt: booking.policy_agreed_at,

        // 訂金支付資訊（優先用 GoMyPay 授權碼 external_transaction_id）
        depositTransactionId: depositPayment?.external_transaction_id || depositPayment?.transaction_id || null,
        depositPaymentMethod: depositPayment?.payment_method || null,
        depositPaidAt: depositPayment?.created_at || null,

        // 尾款支付資訊（優先用 GoMyPay 授權碼 external_transaction_id）
        balanceTransactionId: balancePayment?.external_transaction_id || balancePayment?.transaction_id || null,
        balancePaymentMethod: balancePayment?.payment_method || null,
        balancePaidAt: balancePayment?.created_at || null,

        // 客戶數位簽名
        signatureUrl: signature?.signature_url || null,
        signatureBase64: signature?.signature_base64 || null,
        signedAt: signature?.signed_at || null,

        // 時間戳
        createdAt: booking.created_at,
        updatedAt: booking.updated_at,
        cancelledAt: booking.cancelled_at,
        cancellationReason: booking.cancellation_reason,
        completedAt: booking.completed_at,
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


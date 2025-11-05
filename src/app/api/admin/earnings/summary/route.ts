import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase';

/**
 * GET /api/admin/earnings/summary
 * 獲取收入摘要（綜合統計）
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 解析查詢參數
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 3. 驗證必填參數
    if (!startDate || !endDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_PARAMS',
          message: '缺少必填參數',
          details: {
            startDate: !startDate ? '必須提供開始日期' : undefined,
            endDate: !endDate ? '必須提供結束日期' : undefined,
          },
        },
        { status: 400 }
      );
    }

    // 4. 驗證日期格式
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_PARAMS',
          message: '日期格式錯誤',
          details: {
            startDate: '必須是有效的日期格式 (YYYY-MM-DD)',
            endDate: '必須是有效的日期格式 (YYYY-MM-DD)',
          },
        },
        { status: 400 }
      );
    }

    if (endDateObj < startDateObj) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_PARAMS',
          message: '日期範圍錯誤',
          details: {
            endDate: '結束日期必須大於或等於開始日期',
          },
        },
        { status: 400 }
      );
    }

    // 4. 創建 Supabase 客戶端
    const db = new DatabaseService(true); // 使用 service_role key
    const supabase = db.supabase;

    // 5. 呼叫 Supabase RPC 獲取每日摘要
    const { data, error } = await supabase.rpc('get_daily_earnings_summary', {
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      console.error('❌ [API] Supabase RPC 錯誤:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'DATABASE_ERROR',
          message: '資料庫查詢失敗',
          details: error.message,
        },
        { status: 500 }
      );
    }

    // 7. 計算總計
    const dailySummary = (data as any[]) || [];
    const totalRevenue = dailySummary.reduce(
      (sum, day) => sum + (day.total_revenue || 0),
      0
    );
    const driverEarnings = dailySummary.reduce(
      (sum, day) => sum + (day.driver_earnings || 0),
      0
    );
    const platformFee = dailySummary.reduce(
      (sum, day) => sum + (day.platform_fee || 0),
      0
    );
    const totalOrders = dailySummary.reduce(
      (sum, day) => sum + (day.orders || 0),
      0
    );

    // 計算活躍司機數（去重）
    const activeDriversSet = new Set<string>();
    const { data: driversData } = await supabase
      .from('bookings')
      .select('driver_id')
      .eq('status', 'completed')
      .not('driver_id', 'is', null)
      .not('completed_at', 'is', null)
      .gte('completed_at', `${startDate}T00:00:00`)
      .lte('completed_at', `${endDate}T23:59:59`);

    if (driversData) {
      driversData.forEach((booking: any) => {
        if (booking.driver_id) {
          activeDriversSet.add(booking.driver_id);
        }
      });
    }

    const activeDrivers = activeDriversSet.size;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // 8. 格式化每日摘要
    const formattedDailySummary = dailySummary.map((day: any) => ({
      date: day.date,
      totalRevenue: day.total_revenue || 0,
      driverEarnings: day.driver_earnings || 0,
      platformFee: day.platform_fee || 0,
      orders: day.orders || 0,
      driversCount: day.drivers_count || 0,
    }));

    // 9. 返回結果
    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        driverEarnings,
        platformFee,
        totalOrders,
        activeDrivers,
        averageOrderValue,
        dailySummary: formattedDailySummary,
      },
    });
  } catch (error) {
    console.error('❌ [API] 未預期的錯誤:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: '伺服器內部錯誤',
        details: error instanceof Error ? error.message : '未知錯誤',
      },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase';

/**
 * GET /api/admin/earnings/drivers
 * 獲取司機收入統計
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 解析查詢參數
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const driverId = searchParams.get('driverId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const sortBy = searchParams.get('sortBy') || 'earnings';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // 2. 驗證必填參數
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

    // 3. 驗證日期格式
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

    // 5. 如果指定了 driverId，獲取單個司機的收入統計
    if (driverId) {
      const { data, error } = await supabase.rpc('get_driver_earnings', {
        p_driver_id: driverId,
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

      // 獲取司機資訊
      const { data: driverData } = await supabase
        .from('users')
        .select('id, display_name, email')
        .eq('id', driverId)
        .single();

      return NextResponse.json({
        success: true,
        data: {
          driver: {
            driverId: driverId,
            driverName: driverData?.display_name || '未知',
            driverEmail: driverData?.email || '',
            ...data,
          },
        },
      });
    }

    // 7. 獲取所有司機的收入統計（支援分頁）
    const { data, error } = await supabase.rpc('get_all_drivers_earnings', {
      p_start_date: startDate,
      p_end_date: endDate,
      p_page: page,
      p_limit: limit,
      p_sort_by: sortBy,
      p_sort_order: sortOrder,
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

    // 8. 計算總計
    const { data: summaryData, error: summaryError } = await supabase.rpc(
      'get_platform_earnings',
      {
        p_start_date: startDate,
        p_end_date: endDate,
      }
    );

    if (summaryError) {
      console.error('❌ [API] 獲取摘要資料失敗:', summaryError);
    }

    // 9. 返回結果
    return NextResponse.json({
      success: true,
      data: {
        drivers: data?.drivers || [],
        pagination: data?.pagination || {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
        summary: summaryData
          ? {
              totalEarnings: summaryData.totalRevenue - summaryData.totalPlatformFee,
              totalOrders: summaryData.totalOrders,
              averageEarnings:
                summaryData.totalOrders > 0
                  ? (summaryData.totalRevenue - summaryData.totalPlatformFee) /
                    summaryData.totalOrders
                  : 0,
              activeDrivers: data?.pagination?.total || 0,
            }
          : {
              totalEarnings: 0,
              totalOrders: 0,
              averageEarnings: 0,
              activeDrivers: 0,
            },
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


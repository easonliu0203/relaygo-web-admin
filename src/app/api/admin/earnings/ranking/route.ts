import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase';

/**
 * GET /api/admin/earnings/ranking
 * 獲取司機收入排行榜
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 解析查詢參數
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);

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

    // 5. 呼叫 Supabase RPC
    const { data, error } = await supabase.rpc('get_driver_earnings_ranking', {
      p_start_date: startDate,
      p_end_date: endDate,
      p_limit: limit,
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

    // 7. 返回結果
    return NextResponse.json({
      success: true,
      data: {
        ranking: data || [],
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


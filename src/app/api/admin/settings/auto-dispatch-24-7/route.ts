import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase';

/**
 * GET /api/admin/settings/auto-dispatch-24-7
 * 獲取 24/7 全自動派單開關狀態
 */
export async function GET(request: NextRequest) {
  try {
    const db = new DatabaseService(true); // 使用 service_role key

    // 查詢配置
    const { data, error } = await db.supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'auto_dispatch_24_7')
      .single();

    if (error) {
      console.error('❌ 獲取自動派單配置失敗:', error);
      return NextResponse.json(
        {
          success: false,
          error: '獲取配置失敗',
          details: (error as any).message
        },
        { status: 500 }
      );
    }

    if (!data) {
      // 如果配置不存在，返回預設值
      return NextResponse.json({
        success: true,
        data: {
          enabled: false,
          interval_seconds: 30,
          batch_size: 10,
          max_dispatch_days: 7, // ✅ 新增：預設 7 天
          last_run_at: null,
          total_processed: 0,
          total_assigned: 0,
          total_failed: 0
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: data.value
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
 * PUT /api/admin/settings/auto-dispatch-24-7
 * 更新 24/7 全自動派單開關狀態和最多派單日
 *
 * Body:
 * {
 *   "enabled": true/false,
 *   "max_dispatch_days": number (optional, 預設 7)
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { enabled, max_dispatch_days } = body;

    // 驗證 enabled 參數
    if (enabled !== undefined && typeof enabled !== 'boolean') {
      return NextResponse.json(
        {
          success: false,
          error: '參數錯誤：enabled 必須是布林值'
        },
        { status: 400 }
      );
    }

    // 驗證 max_dispatch_days 參數
    if (max_dispatch_days !== undefined) {
      if (typeof max_dispatch_days !== 'number' || max_dispatch_days < 1 || max_dispatch_days > 365) {
        return NextResponse.json(
          {
            success: false,
            error: '參數錯誤：max_dispatch_days 必須是 1-365 之間的數字'
          },
          { status: 400 }
        );
      }
    }

    const db = new DatabaseService(true); // 使用 service_role key

    // 先獲取當前配置
    const { data: currentData, error: fetchError } = await db.supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'auto_dispatch_24_7')
      .single();

    if (fetchError) {
      console.error('❌ 獲取當前配置失敗:', fetchError);
      return NextResponse.json(
        {
          success: false,
          error: '獲取當前配置失敗',
          details: fetchError.message
        },
        { status: 500 }
      );
    }

    // 更新配置
    const updatedValue = {
      ...(currentData?.value || {}),
      ...(enabled !== undefined && { enabled }),
      ...(max_dispatch_days !== undefined && { max_dispatch_days }),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await db.supabase
      .from('system_settings')
      .update({ value: updatedValue })
      .eq('key', 'auto_dispatch_24_7')
      .select('value')
      .single();

    if (error) {
      console.error('❌ 更新配置失敗:', error);
      return NextResponse.json(
        {
          success: false,
          error: '更新配置失敗',
          details: (error as any).message
        },
        { status: 500 }
      );
    }

    // 生成成功訊息
    let message = '';
    if (enabled !== undefined && max_dispatch_days !== undefined) {
      message = `24/7 自動派單已${enabled ? '開啟' : '關閉'}，最多派單日設為 ${max_dispatch_days} 天`;
    } else if (enabled !== undefined) {
      message = `24/7 自動派單已${enabled ? '開啟' : '關閉'}`;
    } else if (max_dispatch_days !== undefined) {
      message = `最多派單日已設為 ${max_dispatch_days} 天`;
    }

    console.log(`✅ ${message}`);

    return NextResponse.json({
      success: true,
      data: data.value,
      message
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


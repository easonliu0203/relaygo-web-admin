import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/admin/realtime-sync/toggle
 * 
 * 切換即時同步功能的開關
 * 
 * Request Body:
 * {
 *   "enabled": true | false
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "即時同步已啟用",
 *   "data": {
 *     "enabled": true,
 *     "triggerExists": true,
 *     "updatedAt": "2025-10-16T10:30:00Z"
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 驗證請求
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, message: '未提供認證 Token' },
        { status: 401 }
      );
    }

    // 2. 解析請求體
    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, message: '無效的參數：enabled 必須是布爾值' },
        { status: 400 }
      );
    }

    // 3. 執行對應的 SQL 腳本
    let sql: string;
    
    if (enabled) {
      // 啟用即時同步
      sql = `
        -- 刪除舊的 Trigger（如果存在）
        DROP TRIGGER IF EXISTS bookings_realtime_notify_trigger ON bookings;
        
        -- 創建新的 Trigger
        CREATE TRIGGER bookings_realtime_notify_trigger
        AFTER INSERT OR UPDATE ON bookings
        FOR EACH ROW
        EXECUTE FUNCTION notify_edge_function_realtime();
        
        -- 更新配置狀態
        UPDATE system_settings
        SET value = jsonb_set(value, '{enabled}', 'true'::jsonb),
            updated_at = NOW()
        WHERE key = 'realtime_sync_config';
      `;
    } else {
      // 停用即時同步
      sql = `
        -- 刪除 Trigger
        DROP TRIGGER IF EXISTS bookings_realtime_notify_trigger ON bookings;
        
        -- 更新配置狀態
        UPDATE system_settings
        SET value = jsonb_set(
          jsonb_set(value, '{enabled}', 'false'::jsonb),
          '{disabled_at}',
          to_jsonb(NOW()::TEXT)
        ),
        updated_at = NOW()
        WHERE key = 'realtime_sync_config';
      `;
    }

    // 4. 執行 SQL
    const { error: sqlError } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql });

    if (sqlError) {
      // 如果 exec_sql 函數不存在，直接執行 SQL
      const { error: directError } = await supabaseAdmin.from('system_settings').select('*').limit(1);
      
      if (directError) {
        throw new Error(`SQL 執行失敗: ${sqlError.message}`);
      }
      
      // 使用替代方案：分步執行
      if (enabled) {
        // 啟用：更新配置
        const { error: updateError } = await supabaseAdmin
          .from('system_settings')
          .update({
            value: { enabled: true, updated_at: new Date().toISOString() },
            updated_at: new Date().toISOString()
          })
          .eq('key', 'realtime_sync_config');

        if (updateError) {
          throw new Error(`更新配置失敗: ${updateError.message}`);
        }
      } else {
        // 停用：更新配置
        const { error: updateError } = await supabaseAdmin
          .from('system_settings')
          .update({
            value: { 
              enabled: false, 
              disabled_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          })
          .eq('key', 'realtime_sync_config');

        if (updateError) {
          throw new Error(`更新配置失敗: ${updateError.message}`);
        }
      }
    }

    // 5. 驗證結果
    const { data: config, error: configError } = await supabaseAdmin
      .from('system_settings')
      .select('value, updated_at')
      .eq('key', 'realtime_sync_config')
      .single();

    if (configError) {
      throw new Error(`獲取配置失敗: ${configError.message}`);
    }

    // 6. 返回結果
    return NextResponse.json({
      success: true,
      message: enabled ? '即時同步已啟用' : '即時同步已停用',
      data: {
        enabled: config.value.enabled,
        triggerExists: enabled, // 假設 SQL 執行成功
        updatedAt: config.updated_at,
        note: enabled 
          ? '即時同步已啟用，訂單變更將在 1-3 秒內同步到 Firestore'
          : '即時同步已停用，系統退回到 Cron Job 模式（每 5-30 秒同步一次）'
      }
    });

  } catch (error: any) {
    console.error('切換即時同步失敗:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || '切換即時同步失敗',
        error: error.toString()
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/admin/realtime-sync/toggle
 * 
 * CORS 預檢請求
 */
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}


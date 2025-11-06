import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/admin/realtime-sync/status
 * 
 * 獲取即時同步系統的狀態信息
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "realtimeEnabled": true,
 *     "cronEnabled": true,
 *     "triggerExists": true,
 *     "lastUpdated": "2025-10-16T10:30:00Z",
 *     "stats": {
 *       "todayRealtimeCount": 150,
 *       "todayCronCount": 5,
 *       "todayErrorCount": 0,
 *       "pendingEvents": 0,
 *       "avgDelaySeconds": 2.5
 *     }
 *   }
 * }
 */
export async function GET(request: NextRequest) {
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

    // 2. 獲取配置狀態
    const { data: config, error: configError } = await supabaseAdmin
      .from('system_settings')
      .select('value, updated_at')
      .eq('key', 'realtime_sync_config')
      .single();

    if (configError) {
      console.error('獲取配置失敗:', configError);
      // 如果配置不存在，返回默認值
      return NextResponse.json({
        success: true,
        data: {
          realtimeEnabled: false,
          cronEnabled: true,
          triggerExists: false,
          lastUpdated: null,
          stats: {
            todayRealtimeCount: 0,
            todayCronCount: 0,
            todayErrorCount: 0,
            pendingEvents: 0,
            avgDelaySeconds: 0
          },
          note: '配置尚未初始化，請執行 migration 腳本'
        }
      });
    }

    // 3. 獲取今日統計數據
    const today = new Date().toISOString().split('T')[0];
    
    // 今日 outbox 事件統計
    const { data: outboxStats, error: outboxError } = await supabaseAdmin
      .from('outbox')
      .select('*')
      .gte('created_at', today);

    let stats = {
      todayRealtimeCount: 0,
      todayCronCount: 0,
      todayErrorCount: 0,
      pendingEvents: 0,
      avgDelaySeconds: 0
    };

    if (!outboxError && outboxStats) {
      const totalEvents = outboxStats.length;
      const processedEvents = outboxStats.filter((e: any) => e.processed_at !== null);
      const errorEvents = outboxStats.filter((e: any) => e.error_message !== null);
      const pendingEvents = outboxStats.filter((e: any) => e.processed_at === null);

      // 計算平均延遲
      const delays = processedEvents
        .map((e: any) => {
          if (e.created_at && e.processed_at) {
            const created = new Date(e.created_at).getTime();
            const processed = new Date(e.processed_at).getTime();
            return (processed - created) / 1000; // 轉換為秒
          }
          return 0;
        })
        .filter((d: number) => d > 0);

      const avgDelay = delays.length > 0
        ? delays.reduce((a: number, b: number) => a + b, 0) / delays.length
        : 0;

      stats = {
        todayRealtimeCount: config.value.enabled ? processedEvents.length : 0,
        todayCronCount: config.value.enabled ? 0 : processedEvents.length,
        todayErrorCount: errorEvents.length,
        pendingEvents: pendingEvents.length,
        avgDelaySeconds: Math.round(avgDelay * 100) / 100
      };
    }

    // 4. 檢查 Cron Job 狀態（如果可以訪問 cron schema）
    let cronEnabled = true; // 默認假設啟用
    try {
      const { data: cronJobs } = await supabaseAdmin
        .rpc('get_cron_job_status', { job_name: 'sync-orders-to-firestore' });
      
      if (cronJobs && cronJobs.length > 0) {
        cronEnabled = cronJobs[0].active;
      }
    } catch (error) {
      // 如果無法訪問 cron schema，忽略錯誤
      console.warn('無法獲取 Cron Job 狀態:', error);
    }

    // 5. 返回結果
    return NextResponse.json({
      success: true,
      data: {
        realtimeEnabled: config.value.enabled || false,
        cronEnabled: cronEnabled,
        triggerExists: config.value.enabled || false,
        lastUpdated: config.updated_at,
        stats: stats,
        performance: {
          rating: stats.avgDelaySeconds <= 3 ? 'excellent' : 
                  stats.avgDelaySeconds <= 30 ? 'good' : 
                  stats.avgDelaySeconds <= 60 ? 'fair' : 'poor',
          description: stats.avgDelaySeconds <= 3 ? '優秀（即時同步）' :
                       stats.avgDelaySeconds <= 30 ? '良好（Cron 補償）' :
                       stats.avgDelaySeconds <= 60 ? '一般' : '需要優化'
        }
      }
    });

  } catch (error: any) {
    console.error('獲取即時同步狀態失敗:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || '獲取即時同步狀態失敗',
        error: error.toString()
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/admin/realtime-sync/status
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
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}


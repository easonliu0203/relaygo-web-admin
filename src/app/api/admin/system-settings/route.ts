import { NextRequest, NextResponse } from 'next/server';
import { MockAuthService } from '@/services/mockAuth';
import { DatabaseService } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // 簡單的認證檢查（開發模式下允許無 token）
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const isDevelopment = process.env.NODE_ENV === 'development';
    const useMockAuth = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true';

    if (!token && !isDevelopment && !useMockAuth) {
      return NextResponse.json(
        { success: false, message: '未提供認證 Token' },
        { status: 401 }
      );
    }

    // 獲取查詢參數
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    try {
      // 嘗試從 Supabase 獲取系統設定
      const db = new DatabaseService(true); // 使用 service_role key

      if (key) {
        // 獲取特定設定
        const { data, error } = await db.supabase
          .from('system_settings')
          .select('*')
          .eq('key', key)
          .single();

        if (error) {
          console.warn(`從 Supabase 獲取設定失敗 (key: ${key}):`, error);
          // 降級到模擬服務
          const result = await MockAuthService.getSystemSettings(key);
          return NextResponse.json(result, { status: 200 });
        }

        // 轉換數據格式（駝峰命名 -> 蛇形命名）
        let value = data.value;
        if (key === 'pricing_config' && value.vehicleTypes) {
          value = convertPricingConfigToSnakeCase(value);
        }

        return NextResponse.json({
          success: true,
          data: {
            key: data.key,
            value: value,
            updated_at: data.updated_at
          },
          message: '獲取系統設定成功',
        }, { status: 200 });
      } else {
        // 獲取所有設定
        const { data, error } = await db.supabase
          .from('system_settings')
          .select('*')
          .order('key');

        if (error) {
          console.warn('從 Supabase 獲取所有設定失敗:', error);
          // 降級到模擬服務
          const result = await MockAuthService.getSystemSettings();
          return NextResponse.json(result, { status: 200 });
        }

        return NextResponse.json({
          success: true,
          data: data,
          message: '獲取系統設定成功',
        }, { status: 200 });
      }
    } catch (dbError) {
      console.warn('Supabase 連接失敗，使用模擬服務:', dbError);
      // 降級到模擬服務
      const result = await MockAuthService.getSystemSettings(key || undefined);
      return NextResponse.json(result, { status: 200 });
    }
  } catch (error: any) {
    console.error('獲取系統設定錯誤:', error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || '獲取系統設定失敗'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // 簡單的認證檢查（開發模式下允許無 token）
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const isDevelopment = process.env.NODE_ENV === 'development';
    const useMockAuth = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true';

    if (!token && !isDevelopment && !useMockAuth) {
      return NextResponse.json(
        { success: false, message: '未提供認證 Token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { success: false, message: '請提供 key 和 value' },
        { status: 400 }
      );
    }

    console.log(`[系統設定] 更新設定: ${key}`, JSON.stringify(value).substring(0, 200));

    try {
      // 儲存到 Supabase
      const db = new DatabaseService(true); // 使用 service_role key

      // 轉換數據格式（蛇形命名 -> 駝峰命名）用於儲存到 Supabase
      let valueToStore = value;
      if (key === 'pricing_config' && value.vehicle_types) {
        valueToStore = convertPricingConfigToCamelCase(value);
      }

      // 使用 upsert 創建或更新設定
      const { data, error } = await db.supabase
        .from('system_settings')
        .upsert({
          key: key,
          value: valueToStore,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        })
        .select()
        .single();

      if (error) {
        console.error('儲存到 Supabase 失敗:', error);
        throw error;
      }

      console.log(`[系統設定] ✅ 成功儲存到 Supabase: ${key}`);

      // 如果是價格配置，同時更新 vehicle_pricing 表
      if (key === 'pricing_config') {
        await updateVehiclePricing(db, value);
      }

      return NextResponse.json({
        success: true,
        message: '系統設定已更新',
        data: { key, value, updated_at: data.updated_at }
      }, { status: 200 });
    } catch (dbError: any) {
      console.error('Supabase 操作失敗:', dbError);

      return NextResponse.json({
        success: false,
        message: `更新系統設定失敗: ${dbError.message || '未知錯誤'}`,
        error: dbError.message
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('更新系統設定錯誤:', error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || '更新系統設定失敗'
      },
      { status: 500 }
    );
  }
}

// 轉換價格配置格式：駝峰命名 -> 蛇形命名
function convertPricingConfigToSnakeCase(config: any): any {
  if (config.vehicleTypes) {
    return {
      vehicle_types: config.vehicleTypes,
      currency: config.currency || 'USD',
      updated_at: config.updated_at || new Date().toISOString()
    };
  }
  return config;
}

// 轉換價格配置格式：蛇形命名 -> 駝峰命名
function convertPricingConfigToCamelCase(config: any): any {
  if (config.vehicle_types) {
    return {
      vehicleTypes: config.vehicle_types,
      currency: config.currency || 'USD',
      updated_at: config.updated_at || new Date().toISOString()
    };
  }
  return config;
}

// 更新 vehicle_pricing 表
async function updateVehiclePricing(db: DatabaseService, pricingConfig: any) {
  try {
    console.log('[價格同步] 開始更新 vehicle_pricing 表...');

    const vehicleTypes = pricingConfig.vehicle_types;
    if (!vehicleTypes) {
      console.warn('[價格同步] pricing_config 中沒有 vehicle_types');
      return;
    }

    // 車型映射：前端車型 -> 資料庫車型
    const vehicleTypeMapping: Record<string, string[]> = {
      'large': ['C', 'D'], // 8-9人座 -> C, D
      'small': ['A', 'B'], // 3-4人座 -> A, B
    };

    const updates: any[] = [];

    // 遍歷每個車型類別
    for (const [category, config] of Object.entries(vehicleTypes) as [string, any][]) {
      const dbVehicleTypes = vehicleTypeMapping[category];
      if (!dbVehicleTypes) {
        console.warn(`[價格同步] 未知的車型類別: ${category}`);
        continue;
      }

      const packages = config.packages;
      if (!packages) {
        console.warn(`[價格同步] ${category} 沒有 packages`);
        continue;
      }

      // 遍歷每個套餐（6小時、8小時）
      for (const [packageKey, packageData] of Object.entries(packages) as [string, any][]) {
        const duration = packageData.duration;
        const discountPrice = packageData.discount_price;
        const overtimeRate = packageData.overtime_rate;

        // 為每個資料庫車型創建更新記錄
        for (const dbVehicleType of dbVehicleTypes) {
          updates.push({
            vehicle_type: dbVehicleType,
            duration_hours: duration,
            base_price: discountPrice, // 使用優惠價作為基礎價格
            overtime_rate: overtimeRate,
            is_active: true,
            effective_from: new Date().toISOString(),
            effective_until: null
          });
        }
      }
    }

    if (updates.length === 0) {
      console.warn('[價格同步] 沒有需要更新的價格數據');
      return;
    }

    console.log(`[價格同步] 準備更新 ${updates.length} 條價格記錄:`, updates);

    // 先將所有現有價格設為無效
    const { error: deactivateError } = await db.supabase
      .from('vehicle_pricing')
      .update({
        is_active: false,
        effective_until: new Date().toISOString()
      })
      .eq('is_active', true);

    if (deactivateError) {
      console.error('[價格同步] 停用舊價格失敗:', deactivateError);
    } else {
      console.log('[價格同步] ✅ 已停用所有舊價格');
    }

    // 插入新價格
    const { data, error: insertError } = await db.supabase
      .from('vehicle_pricing')
      .insert(updates)
      .select();

    if (insertError) {
      console.error('[價格同步] 插入新價格失敗:', insertError);
      throw insertError;
    }

    console.log(`[價格同步] ✅ 成功插入 ${data?.length || 0} 條新價格記錄`);
  } catch (error) {
    console.error('[價格同步] 更新 vehicle_pricing 表失敗:', error);
    // 不拋出錯誤，讓主流程繼續
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

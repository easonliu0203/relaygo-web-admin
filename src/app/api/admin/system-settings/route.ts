import { NextRequest, NextResponse } from 'next/server';
import { MockAuthService } from '@/services/mockAuth';
import { DatabaseService } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // 簡單的認證檢查
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, message: '未提供認證 Token' },
        { status: 401 }
      );
    }

    // 獲取查詢參數
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    // 嘗試從 Supabase 獲取系統設定
    try {
      const db = new DatabaseService();

      if (key) {
        // 獲取特定設定
        const { data, error } = await db.supabase
          .from('system_settings')
          .select('value')
          .eq('key', key)
          .single();

        if (error) {
          console.warn(`Supabase 查詢失敗，使用模擬資料: ${error.message}`);
          // 降級到模擬服務
          const result = await MockAuthService.getSystemSettings(key);
          return NextResponse.json(result, { status: 200 });
        }

        return NextResponse.json({
          success: true,
          data: { value: data?.value },
          message: '獲取系統設定成功',
        }, { status: 200 });
      } else {
        // 獲取所有設定
        const { data, error } = await db.supabase
          .from('system_settings')
          .select('key, value');

        if (error) {
          console.warn(`Supabase 查詢失敗，使用模擬資料: ${error.message}`);
          // 降級到模擬服務
          const result = await MockAuthService.getSystemSettings();
          return NextResponse.json(result, { status: 200 });
        }

        // 轉換為物件格式
        const settings: any = {};
        data?.forEach((item: any) => {
          settings[item.key] = item.value;
        });

        return NextResponse.json({
          success: true,
          data: settings,
          message: '獲取系統設定成功',
        }, { status: 200 });
      }
    } catch (dbError: any) {
      console.warn(`資料庫連接失敗，使用模擬資料: ${dbError.message}`);
      // 降級到模擬服務
      const result = await MockAuthService.getSystemSettings(key || undefined);
      return NextResponse.json(result, { status: 200 });
    }
  } catch (error: any) {
    console.error('獲取系統設定錯誤:', error);

    return NextResponse.json(
      {
        success: false,
        message: (error as any).message || '獲取系統設定失敗'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // 簡單的認證檢查
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
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

    // 嘗試更新到 Supabase
    try {
      const db = new DatabaseService();

      // 檢查設定是否已存在
      const { data: existing, error: checkError } = await db.supabase
        .from('system_settings')
        .select('id')
        .eq('key', key)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 是 "not found" 錯誤，其他錯誤需要處理
        throw checkError;
      }

      if (existing) {
        // 更新現有設定
        const { error: updateError } = await db.supabase
          .from('system_settings')
          .update({
            value,
            updated_at: new Date().toISOString()
          })
          .eq('key', key);

        if (updateError) {
          throw updateError;
        }
      } else {
        // 插入新設定
        const { error: insertError } = await db.supabase
          .from('system_settings')
          .insert({
            key,
            value,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          throw insertError;
        }
      }

      return NextResponse.json({
        success: true,
        message: '系統設定已更新',
      }, { status: 200 });

    } catch (dbError: any) {
      console.error('Supabase 更新失敗:', dbError);

      // 在開發環境降級到模擬服務（僅記錄日誌）
      if (process.env.NODE_ENV === 'development') {
        console.warn('開發環境：模擬更新成功（實際未儲存到資料庫）');
        return NextResponse.json({
          success: true,
          message: '系統設定已更新（開發模式）',
        }, { status: 200 });
      }

      // 生產環境返回錯誤
      throw dbError;
    }
  } catch (error: any) {
    console.error('更新系統設定錯誤:', error);

    return NextResponse.json(
      {
        success: false,
        message: (error as any).message || '更新系統設定失敗',
        details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
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

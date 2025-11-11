import { NextRequest, NextResponse } from 'next/server';
import { MockAuthService } from '@/services/mockAuth';

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

    // 使用模擬服務獲取系統設定
    const result = await MockAuthService.getSystemSettings(key || undefined);

    return NextResponse.json(result, { status: 200 });
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

    // 使用模擬服務更新系統設定
    const result = await MockAuthService.updateSystemSettings(key, value);

    return NextResponse.json(result, { status: 200 });
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

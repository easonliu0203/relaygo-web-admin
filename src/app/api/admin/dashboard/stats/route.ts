import { NextRequest, NextResponse } from 'next/server';
import { MockAuthService } from '@/services/mockAuth';

export async function GET(request: NextRequest) {
  try {
    // 簡單的認證檢查（實際應用中需要更嚴格的驗證）
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, message: '未提供認證 Token' },
        { status: 401 }
      );
    }

    // 使用模擬認證服務獲取統計資料
    const result = await MockAuthService.getDashboardStats();

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('獲取儀表板統計錯誤:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || '獲取統計資料失敗' 
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

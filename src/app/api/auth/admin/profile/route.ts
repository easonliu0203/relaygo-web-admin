import { NextRequest, NextResponse } from 'next/server';
import { MockAuthService } from '@/services/mockAuth';

export async function GET(request: NextRequest) {
  try {
    // 從 Authorization header 獲取 token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, message: '未提供認證 Token' },
        { status: 401 }
      );
    }

    // 使用模擬認證服務驗證 token
    const result = await MockAuthService.getProfile(token);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('獲取用戶資料錯誤:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || '獲取用戶資料失敗' 
      },
      { status: 401 }
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

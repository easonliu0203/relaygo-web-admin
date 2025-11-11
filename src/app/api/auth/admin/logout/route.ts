import { NextRequest, NextResponse } from 'next/server';
import { MockAuthService } from '@/services/mockAuth';

export async function POST(request: NextRequest) {
  try {
    // 使用模擬認證服務
    const result = await MockAuthService.logout();

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('登出錯誤:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: (error as any).message || '登出失敗' 
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

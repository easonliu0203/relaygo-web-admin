import { NextRequest, NextResponse } from 'next/server';
import { MockAuthService } from '@/services/mockAuth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // 驗證輸入
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: '請提供電子郵件和密碼' },
        { status: 400 }
      );
    }

    // 使用模擬認證服務
    const result = await MockAuthService.login(email, password);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('登入錯誤:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: (error as any).message || '登入失敗，請稍後再試' 
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

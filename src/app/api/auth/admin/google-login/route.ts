import { NextRequest, NextResponse } from 'next/server';
import { MockAuthService } from '@/services/mockAuth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken } = body;

    // 驗證輸入
    if (!idToken) {
      return NextResponse.json(
        { success: false, message: '請提供 Firebase ID Token' },
        { status: 400 }
      );
    }

    console.log('🔄 收到 Google 登入請求');

    // 使用模擬認證服務
    const result = await MockAuthService.loginWithGoogle(idToken);

    console.log('✅ Google 登入成功:', result.data.user.email);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('❌ Google 登入錯誤:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: (error as any).message || 'Google 登入失敗，請稍後再試' 
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


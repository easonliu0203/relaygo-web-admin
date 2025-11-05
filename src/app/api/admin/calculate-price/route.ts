import { NextRequest, NextResponse } from 'next/server';
import { MockAuthService } from '@/services/mockAuth';

export async function POST(request: NextRequest) {
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
    const { vehicle_type, duration, use_discount = false } = body;

    // 驗證輸入
    if (!vehicle_type || !duration) {
      return NextResponse.json(
        { success: false, message: '請提供車型和時長' },
        { status: 400 }
      );
    }

    if (!['A', 'B', 'C', 'D'].includes(vehicle_type)) {
      return NextResponse.json(
        { success: false, message: '無效的車型' },
        { status: 400 }
      );
    }

    if (duration <= 0 || duration > 24) {
      return NextResponse.json(
        { success: false, message: '時長必須在 1-24 小時之間' },
        { status: 400 }
      );
    }

    // 使用模擬服務計算價格
    const result = await MockAuthService.calculateBookingPrice(
      vehicle_type,
      duration,
      use_discount
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('價格計算錯誤:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || '價格計算失敗' 
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

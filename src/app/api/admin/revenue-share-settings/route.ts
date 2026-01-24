import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.relaygo.pro';

/**
 * GET /api/admin/revenue-share-settings
 * 獲取分潤設定
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: '未提供認證 Token' },
        { status: 401 }
      );
    }

    // 代理到 Railway Backend
    const response = await fetch(`${BACKEND_URL}/api/admin/revenue-share-settings`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('獲取分潤設定錯誤:', error);
    return NextResponse.json(
      {
        success: false,
        error: '獲取分潤設定失敗',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/revenue-share-settings
 * 更新分潤設定
 */
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: '未提供認證 Token' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // 代理到 Railway Backend
    const response = await fetch(`${BACKEND_URL}/api/admin/revenue-share-settings`, {
      method: 'PUT',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('更新分潤設定錯誤:', error);
    return NextResponse.json(
      {
        success: false,
        error: '更新分潤設定失敗',
        details: error.message
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


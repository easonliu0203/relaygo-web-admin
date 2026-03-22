import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, getAdminAuth } from '@/lib/firebaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, message: '未提供認證 Token' },
        { status: 401 }
      );
    }

    // 驗證 token + admin claim
    let decoded;
    try {
      decoded = await verifyAdminToken(token);
    } catch (error: any) {
      if (error.message === 'NOT_ADMIN') {
        return NextResponse.json(
          { success: false, message: '此帳號沒有管理員權限' },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { success: false, message: 'Token 無效或已過期' },
        { status: 401 }
      );
    }

    const auth = getAdminAuth();
    const userRecord = await auth.getUser(decoded.uid);

    return NextResponse.json({
      success: true,
      data: {
        id: decoded.uid,
        email: decoded.email || '',
        name: userRecord.displayName || decoded.email || '',
        role: 'admin',
        status: 'active',
        avatar: userRecord.photoURL || undefined,
        createdAt: userRecord.metadata.creationTime || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      message: '獲取用戶資料成功',
    });
  } catch (error: any) {
    console.error('獲取用戶資料錯誤:', error);
    return NextResponse.json(
      { success: false, message: error.message || '獲取用戶資料失敗' },
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

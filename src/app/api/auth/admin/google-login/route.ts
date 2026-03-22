import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, getAdminAuth } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json(
        { success: false, message: '請提供 Firebase ID Token' },
        { status: 400 }
      );
    }

    // 用 Firebase Admin SDK 驗證 token + 檢查 admin claim
    let decoded;
    try {
      decoded = await verifyAdminToken(idToken);
    } catch (error: any) {
      if (error.message === 'NOT_ADMIN') {
        console.warn(`⛔ 非管理員嘗試登入: ${error.email || 'unknown'}`);
        return NextResponse.json(
          { success: false, message: '此帳號沒有管理員權限' },
          { status: 403 }
        );
      }
      console.error('❌ Token 驗證失敗:', error.message);
      return NextResponse.json(
        { success: false, message: '驗證失敗，請重新登入' },
        { status: 401 }
      );
    }

    // 取得完整的使用者資料
    const auth = getAdminAuth();
    const userRecord = await auth.getUser(decoded.uid);

    const user = {
      id: decoded.uid,
      email: decoded.email || '',
      name: userRecord.displayName || decoded.email || '',
      role: 'admin' as const,
      status: 'active' as const,
      avatar: userRecord.photoURL || undefined,
      createdAt: userRecord.metadata.creationTime || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 用 Firebase ID Token 本身作為 session token（有效期 1 小時，前端會自動刷新）
    console.log(`✅ 管理員登入成功: ${user.email}`);

    return NextResponse.json({
      success: true,
      data: { user, token: idToken },
      message: '登入成功',
    });
  } catch (error: any) {
    console.error('❌ 登入錯誤:', error);
    return NextResponse.json(
      { success: false, message: error.message || '登入失敗' },
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
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

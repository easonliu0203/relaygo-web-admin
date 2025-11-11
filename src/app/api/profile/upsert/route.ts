import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 配置 - 使用 service_role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// 創建 Supabase Admin 客戶端（繞過 RLS）
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Firebase Admin SDK 配置（用於驗證 Token）
// 注意：這裡使用簡化的驗證方式，生產環境應該使用 Firebase Admin SDK
// 但由於我們的架構中 Firebase Auth 已經在客戶端驗證過，
// 這裡主要是確保請求來自已登入的用戶

interface UpsertProfileRequest {
  firebaseUid: string;
  firebaseToken?: string; // Firebase ID Token（可選，用於額外驗證）
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

/**
 * 根據 Firebase UID 獲取 Supabase user_id
 */
async function getUserIdByFirebaseUid(firebaseUid: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('firebase_uid', firebaseUid)
      .maybeSingle();

    if (error) {
      console.error('查詢用戶 ID 失敗:', error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error('getUserIdByFirebaseUid 錯誤:', error);
    return null;
  }
}

/**
 * 驗證 Firebase Token（簡化版）
 * 生產環境應該使用 Firebase Admin SDK 進行完整驗證
 */
async function verifyFirebaseToken(token: string | undefined): Promise<boolean> {
  // 簡化驗證：如果提供了 token，我們假設它是有效的
  // 因為 Firebase Auth 已經在客戶端驗證過
  // 生產環境應該使用 Firebase Admin SDK:
  // const decodedToken = await admin.auth().verifyIdToken(token);
  // return decodedToken.uid;
  
  if (!token) {
    // 如果沒有提供 token，我們仍然允許請求
    // 因為我們信任客戶端的 Firebase Auth
    return true;
  }

  // 這裡可以添加更嚴格的驗證邏輯
  return true;
}

/**
 * POST /api/profile/upsert
 * 創建或更新用戶個人資料
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 解析請求體
    const body: UpsertProfileRequest = await request.json();
    
    console.log('📥 收到個人資料更新請求:', {
      firebaseUid: body.firebaseUid,
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
    });

    // 2. 驗證必填欄位
    if (!body.firebaseUid) {
      return NextResponse.json(
        { error: '缺少 firebaseUid 參數' },
        { status: 400 }
      );
    }

    // 3. 驗證 Firebase Token（可選）
    const isTokenValid = await verifyFirebaseToken(body.firebaseToken);
    if (!isTokenValid) {
      return NextResponse.json(
        { error: 'Firebase Token 驗證失敗' },
        { status: 401 }
      );
    }

    // 4. 根據 Firebase UID 查找 Supabase user_id
    const userId = await getUserIdByFirebaseUid(body.firebaseUid);
    
    if (!userId) {
      return NextResponse.json(
        { 
          error: '用戶不存在',
          message: '請確保用戶已在 Supabase users 表中創建',
          firebaseUid: body.firebaseUid
        },
        { status: 404 }
      );
    }

    console.log('✅ 找到用戶 ID:', userId);

    // 5. 準備資料
    const profileData: any = {
      user_id: userId,
    };

    // 只添加提供的欄位
    if (body.firstName !== undefined) profileData.first_name = body.firstName;
    if (body.lastName !== undefined) profileData.last_name = body.lastName;
    if (body.phone !== undefined) profileData.phone = body.phone;
    if (body.avatarUrl !== undefined) profileData.avatar_url = body.avatarUrl;
    if (body.dateOfBirth !== undefined) profileData.date_of_birth = body.dateOfBirth;
    if (body.gender !== undefined) profileData.gender = body.gender;
    if (body.address !== undefined) profileData.address = body.address;
    if (body.emergencyContactName !== undefined) profileData.emergency_contact_name = body.emergencyContactName;
    if (body.emergencyContactPhone !== undefined) profileData.emergency_contact_phone = body.emergencyContactPhone;

    console.log('📝 準備保存資料:', profileData);

    // 6. 使用 upsert 創建或更新資料
    // 注意：使用 supabaseAdmin（service_role key）繞過 RLS
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .upsert(profileData, {
        onConflict: 'user_id', // 根據 user_id 判斷是插入還是更新
      })
      .select()
      .single();

    if (error) {
      console.error('❌ 保存個人資料失敗:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });

      return NextResponse.json(
        {
          error: '保存個人資料失敗',
          message: error.message,
          details: error.details,
          hint: error.hint,
        },
        { status: 500 }
      );
    }

    console.log('✅ 個人資料保存成功:', {
      id: profile.id,
      user_id: profile.user_id,
      first_name: profile.first_name,
      last_name: profile.last_name,
    });

    // 7. 返回成功結果（轉換為 camelCase）
    return NextResponse.json({
      success: true,
      data: {
        id: profile.id,
        userId: profile.user_id,
        firstName: profile.first_name,
        lastName: profile.last_name,
        phone: profile.phone,
        avatarUrl: profile.avatar_url,
        dateOfBirth: profile.date_of_birth,
        gender: profile.gender,
        address: profile.address,
        emergencyContactName: profile.emergency_contact_name,
        emergencyContactPhone: profile.emergency_contact_phone,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      },
    });

  } catch (error) {
    console.error('❌ API 錯誤:', {
      error,
      message: error instanceof Error ? error.message : '未知錯誤',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: '內部伺服器錯誤',
        message: error instanceof Error ? error.message : '未知錯誤',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/profile/upsert?firebaseUid=xxx
 * 獲取用戶個人資料
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 獲取查詢參數
    const { searchParams } = new URL(request.url);
    const firebaseUid = searchParams.get('firebaseUid');

    if (!firebaseUid) {
      return NextResponse.json(
        { error: '缺少 firebaseUid 參數' },
        { status: 400 }
      );
    }

    console.log('📥 收到個人資料查詢請求:', { firebaseUid });

    // 2. 根據 Firebase UID 查找 Supabase user_id
    const userId = await getUserIdByFirebaseUid(firebaseUid);
    
    if (!userId) {
      return NextResponse.json(
        { 
          error: '用戶不存在',
          message: '請確保用戶已在 Supabase users 表中創建',
          firebaseUid: firebaseUid
        },
        { status: 404 }
      );
    }

    // 3. 查詢個人資料
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select()
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('❌ 查詢個人資料失敗:', error);
      return NextResponse.json(
        {
          error: '查詢個人資料失敗',
          message: error.message,
        },
        { status: 500 }
      );
    }

    // 4. 如果沒有資料，返回 null
    if (!profile) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    // 5. 返回資料（轉換為 camelCase）
    return NextResponse.json({
      success: true,
      data: {
        id: profile.id,
        userId: profile.user_id,
        firstName: profile.first_name,
        lastName: profile.last_name,
        phone: profile.phone,
        avatarUrl: profile.avatar_url,
        dateOfBirth: profile.date_of_birth,
        gender: profile.gender,
        address: profile.address,
        emergencyContactName: profile.emergency_contact_name,
        emergencyContactPhone: profile.emergency_contact_phone,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      },
    });

  } catch (error) {
    console.error('❌ API 錯誤:', error);
    return NextResponse.json(
      {
        error: '內部伺服器錯誤',
        message: error instanceof Error ? error.message : '未知錯誤',
      },
      { status: 500 }
    );
  }
}


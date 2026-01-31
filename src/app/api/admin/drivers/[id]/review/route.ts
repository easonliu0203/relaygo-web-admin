import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase';

/**
 * POST /api/admin/drivers/[id]/review
 * 提交司機審核結果
 * 
 * Request Body:
 * - status: 'approved' | 'rejected' | 'missing_documents'
 * - notes: 審核備註（rejected 和 missing_documents 必填）
 * - reviewedBy: 審核人員的 Firebase UID
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const driverId = params.id;
    const body = await request.json();
    const { status, notes, reviewedBy } = body;

    console.log('📋 [Admin] 提交司機審核:', { driverId, status, notes, reviewedBy });

    // 驗證參數
    if (!driverId) {
      return NextResponse.json(
        { success: false, error: '缺少司機 ID' },
        { status: 400 }
      );
    }

    const validStatuses = ['approved', 'rejected', 'missing_documents'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: '無效的審核狀態', validStatuses },
        { status: 400 }
      );
    }

    // 如果是拒絕或需補件，必須填寫備註
    if ((status === 'rejected' || status === 'missing_documents') && !notes) {
      return NextResponse.json(
        { success: false, error: '請填寫審核備註說明原因' },
        { status: 400 }
      );
    }

    const db = new DatabaseService(true); // 使用 service_role key

    // 1. 檢查司機是否存在且狀態為 pending_review
    const { data: driver, error: driverError } = await db.supabase
      .from('drivers')
      .select('id, user_id, review_status')
      .eq('id', driverId)
      .single();

    if (driverError || !driver) {
      console.error('❌ 司機不存在:', driverError);
      return NextResponse.json(
        { success: false, error: '司機不存在' },
        { status: 404 }
      );
    }

    if (driver.review_status !== 'pending_review') {
      return NextResponse.json(
        { success: false, error: `司機目前狀態為 ${driver.review_status}，無法審核` },
        { status: 400 }
      );
    }

    // 2. 更新審核狀態
    const updateData: any = {
      review_status: status,
      review_notes: notes || null,
      reviewed_by: reviewedBy || null,
      review_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 如果審核通過，設置 is_available 為 true
    if (status === 'approved') {
      updateData.is_available = true;
    }

    const { error: updateError } = await db.supabase
      .from('drivers')
      .update(updateData)
      .eq('id', driverId);

    if (updateError) {
      console.error('❌ 更新審核狀態失敗:', updateError);
      return NextResponse.json(
        { success: false, error: '更新審核狀態失敗', details: updateError.message },
        { status: 500 }
      );
    }

    // 3. 記錄審核日誌（可選）
    const statusTextMap: Record<string, string> = {
      approved: '審核通過',
      rejected: '審核失敗',
      missing_documents: '需補件',
    };
    const statusText = statusTextMap[status] || status;

    console.log(`✅ 司機審核完成: ${driverId} -> ${statusText}`);

    return NextResponse.json({
      success: true,
      message: `司機${statusText}`,
      data: {
        driverId,
        status,
        notes,
        reviewedBy,
        reviewCompletedAt: updateData.review_completed_at,
      },
    });
  } catch (error: any) {
    console.error('❌ API 錯誤:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/drivers/[id]/review
 * 獲取司機的審核詳情（包含所有文件和照片）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const driverId = params.id;

    console.log('📋 [Admin] 獲取司機審核詳情:', { driverId });

    const db = new DatabaseService(true);

    // 獲取司機資料
    const { data: driver, error: driverError } = await db.supabase
      .from('drivers')
      .select('*')
      .eq('id', driverId)
      .single();

    if (driverError || !driver) {
      return NextResponse.json(
        { success: false, error: '司機不存在' },
        { status: 404 }
      );
    }

    // 獲取用戶資料
    const { data: user } = await db.supabase
      .from('users')
      .select('id, firebase_uid, email, phone')
      .eq('id', driver.user_id)
      .single();

    // 獲取用戶個人資料
    const { data: profile } = await db.supabase
      .from('user_profiles')
      .select('display_name, avatar_url')
      .eq('user_id', driver.user_id)
      .single();

    // 獲取司機文件
    const { data: documents } = await db.supabase
      .from('driver_documents')
      .select('type, url, status, uploaded_at')
      .eq('driver_id', user?.firebase_uid);

    // 獲取車輛照片
    const { data: vehiclePhotos } = await db.supabase
      .from('driver_vehicle_photos')
      .select('photo_type, url, uploaded_at')
      .eq('driver_id', driver.user_id);

    // 獲取推薦人資訊
    let referrer = null;
    if (user?.firebase_uid) {
      const { data: referral } = await db.supabase
        .from('driver_affiliate_referrals')
        .select('affiliate_id')
        .eq('driver_firebase_uid', user.firebase_uid)
        .single();

      if (referral) {
        const { data: affiliate } = await db.supabase
          .from('driver_affiliates')
          .select('name, promo_code')
          .eq('id', referral.affiliate_id)
          .single();
        referrer = affiliate;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: driver.id,
        userId: driver.user_id,
        firebaseUid: user?.firebase_uid,
        displayName: profile?.display_name || '未設定',
        email: user?.email,
        phone: user?.phone,
        avatarUrl: profile?.avatar_url,
        reviewStatus: driver.review_status,
        reviewSubmittedAt: driver.review_submitted_at,
        reviewCompletedAt: driver.review_completed_at,
        reviewNotes: driver.review_notes,
        reviewedBy: driver.reviewed_by,
        companyName: driver.company_name,
        companyTaxId: driver.company_tax_id,
        vehicleType: driver.vehicle_type,
        vehicleModel: driver.vehicle_model,
        vehiclePlate: driver.vehicle_plate,
        documents: documents || [],
        vehiclePhotos: vehiclePhotos || [],
        referrer,
        createdAt: driver.created_at,
      },
    });
  } catch (error: any) {
    console.error('❌ API 錯誤:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}


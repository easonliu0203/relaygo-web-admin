import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase';

// 類型定義
interface DriverRecord {
  id: string;
  user_id: string;
  review_status: string;
  review_submitted_at: string | null;
  review_notes: string | null;
  company_name: string | null;
  company_tax_id: string | null;
  vehicle_type: string | null;
  vehicle_model: string | null;
  vehicle_plate: string | null;
  created_at: string;
}

interface UserRecord {
  id: string;
  firebase_uid: string;
  email: string;
  phone: string;
  created_at: string;
}

interface ProfileRecord {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

interface DocumentRecord {
  driver_id: string;
  type: string;
  url: string;
  status: string;
  uploaded_at: string;
}

interface VehiclePhotoRecord {
  driver_id: string;
  photo_type: string;
  url: string;
  uploaded_at: string;
}

interface ReferralRecord {
  driver_firebase_uid: string;
  affiliate_id: string;
  created_at: string;
}

interface AffiliateRecord {
  id: string;
  name: string;
  promo_code: string;
}

/**
 * GET /api/admin/drivers/pending-review
 * 獲取待審核司機列表
 *
 * 返回所有 review_status = 'pending_review' 的司機
 * 包含司機基本資料、文件、車輛照片、靠行公司資訊、推薦人資訊
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📋 [Admin] 獲取待審核司機列表');

    const db = new DatabaseService(true); // 使用 service_role key

    // 1. 獲取所有待審核的司機
    const { data: drivers, error: driversError } = await db.supabase
      .from('drivers')
      .select(`
        id,
        user_id,
        review_status,
        review_submitted_at,
        review_notes,
        company_name,
        company_tax_id,
        vehicle_type,
        vehicle_model,
        vehicle_plate,
        created_at
      `)
      .eq('review_status', 'pending_review')
      .order('review_submitted_at', { ascending: true }) as { data: DriverRecord[] | null; error: any };

    if (driversError) {
      console.error('❌ 查詢待審核司機失敗:', driversError);
      return NextResponse.json(
        { success: false, error: '查詢失敗', details: driversError.message },
        { status: 500 }
      );
    }

    if (!drivers || drivers.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        total: 0,
      });
    }

    // 2. 獲取每個司機的用戶資料和文件
    const userIds = drivers.map((d: DriverRecord) => d.user_id);

    // 獲取用戶基本資料
    const { data: users, error: usersError } = await db.supabase
      .from('users')
      .select('id, firebase_uid, email, phone, created_at')
      .in('id', userIds) as { data: UserRecord[] | null; error: any };

    if (usersError) {
      console.error('❌ 查詢用戶資料失敗:', usersError);
    }

    // 獲取用戶個人資料
    const { data: profiles, error: profilesError } = await db.supabase
      .from('user_profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', userIds) as { data: ProfileRecord[] | null; error: any };

    if (profilesError) {
      console.error('❌ 查詢用戶個人資料失敗:', profilesError);
    }

    // 獲取 Firebase UIDs
    const firebaseUids = users?.map((u: UserRecord) => u.firebase_uid).filter(Boolean) || [];

    // 獲取司機文件
    const { data: documents, error: docsError } = await db.supabase
      .from('driver_documents')
      .select('driver_id, type, url, status, uploaded_at')
      .in('driver_id', firebaseUids) as { data: DocumentRecord[] | null; error: any };

    if (docsError) {
      console.error('❌ 查詢司機文件失敗:', docsError);
    }

    // 獲取車輛照片
    const { data: vehiclePhotos, error: photosError } = await db.supabase
      .from('driver_vehicle_photos')
      .select('driver_id, photo_type, url, uploaded_at')
      .in('driver_id', userIds) as { data: VehiclePhotoRecord[] | null; error: any };

    if (photosError) {
      console.error('❌ 查詢車輛照片失敗:', photosError);
    }

    // 獲取推薦人資訊
    const { data: referrals, error: referralsError } = await db.supabase
      .from('driver_affiliate_referrals')
      .select('driver_firebase_uid, affiliate_id, created_at')
      .in('driver_firebase_uid', firebaseUids) as { data: ReferralRecord[] | null; error: any };

    if (referralsError) {
      console.error('❌ 查詢推薦人資訊失敗:', referralsError);
    }

    // 如果有推薦人，獲取推薦人名稱
    let affiliates: AffiliateRecord[] = [];
    if (referrals && referrals.length > 0) {
      const affiliateIds = referrals.map((r: ReferralRecord) => r.affiliate_id);
      const { data: affiliateData } = await db.supabase
        .from('driver_affiliates')
        .select('id, name, promo_code')
        .in('id', affiliateIds) as { data: AffiliateRecord[] | null; error: any };
      affiliates = affiliateData || [];
    }

    // 3. 組合資料
    const result = drivers.map((driver: DriverRecord) => {
      const user = users?.find((u: UserRecord) => u.id === driver.user_id);
      const profile = profiles?.find((p: ProfileRecord) => p.user_id === driver.user_id);
      const driverDocs = documents?.filter((d: DocumentRecord) => d.driver_id === user?.firebase_uid) || [];
      const driverPhotos = vehiclePhotos?.filter((p: VehiclePhotoRecord) => p.driver_id === driver.user_id) || [];
      const referral = referrals?.find((r: ReferralRecord) => r.driver_firebase_uid === user?.firebase_uid);
      const affiliate = referral ? affiliates.find((a: AffiliateRecord) => a.id === referral.affiliate_id) : null;

      return {
        id: driver.id,
        userId: driver.user_id,
        firebaseUid: user?.firebase_uid,
        displayName: profile?.display_name || '未設定',
        email: user?.email,
        phone: user?.phone,
        avatarUrl: profile?.avatar_url,
        reviewStatus: driver.review_status,
        reviewSubmittedAt: driver.review_submitted_at,
        reviewNotes: driver.review_notes,
        companyName: driver.company_name,
        companyTaxId: driver.company_tax_id,
        vehicleType: driver.vehicle_type,
        vehicleModel: driver.vehicle_model,
        vehiclePlate: driver.vehicle_plate,
        documents: driverDocs,
        vehiclePhotos: driverPhotos,
        referrer: affiliate ? { name: affiliate.name, promoCode: affiliate.promo_code } : null,
        createdAt: driver.created_at,
      };
    });

    console.log(`✅ 找到 ${result.length} 位待審核司機`);

    return NextResponse.json({
      success: true,
      data: result,
      total: result.length,
    });
  } catch (error: any) {
    console.error('❌ API 錯誤:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}


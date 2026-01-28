import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase';

/**
 * GET /api/admin/drivers/[id]
 * 獲取司機詳情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const driverId = params.id;

    console.log('📋 獲取司機詳情:', { driverId });

    const db = new DatabaseService(true); // 使用 service_role key

    // 獲取司機基本資訊
    const { data: user, error: userError } = await db.supabase
      .from('users')
      .select('*')
      .eq('id', driverId)
      .contains('roles', ['driver']) // ✅ 修復：檢查 roles 陣列是否包含 'driver'，支援多角色用戶
      .single();

    if (userError || !user) {
      console.error('❌ 獲取司機失敗:', userError);
      return NextResponse.json(
        { 
          success: false,
          error: '司機不存在', 
          details: userError?.message 
        },
        { status: 404 }
      );
    }

    // 獲取司機個人資料
    const { data: profile, error: profileError } = await db.supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', driverId)
      .single();

    if (profileError) {
      console.warn('⚠️ 獲取司機個人資料失敗:', profileError);
    }

    // 獲取司機專屬資料
    const { data: driverInfo, error: driverError } = await db.supabase
      .from('drivers')
      .select('*')
      .eq('user_id', driverId)
      .single();

    if (driverError) {
      console.warn('⚠️ 獲取司機專屬資料失敗:', driverError);
    }

    // 獲取司機的訂單統計
    const { data: bookings, error: bookingsError } = await db.supabase
      .from('bookings')
      .select('id, status, total_amount, created_at')
      .eq('driver_id', driverId);

    if (bookingsError) {
      console.warn('⚠️ 獲取司機訂單統計失敗:', bookingsError);
    }

    // 計算統計資料
    const totalTrips = bookings?.length || 0;
    const completedTrips = bookings?.filter((b: any) => b.status === 'completed').length || 0;
    const totalRevenue = bookings
      ?.filter((b: any) => b.status === 'completed')
      .reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0) || 0;

    // 格式化司機詳情
    const formattedDriver = {
      // 基本資訊
      id: user.id,
      firebaseUid: user.firebase_uid,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      createdAt: user.created_at,
      updatedAt: user.updated_at,

      // 個人資料
      firstName: profile?.first_name || '',
      lastName: profile?.last_name || '',
      name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || '未設定' : '未設定',
      avatar: profile?.avatar_url || null,
      dateOfBirth: profile?.date_of_birth || null,
      gender: profile?.gender || null,
      address: profile?.address || null,
      emergencyContactName: profile?.emergency_contact_name || null,
      emergencyContactPhone: profile?.emergency_contact_phone || null,

      // 司機專屬資料
      licenseNumber: driverInfo?.license_number || '',
      vehicleType: driverInfo?.vehicle_type || '',
      vehiclePlate: driverInfo?.vehicle_plate || '',
      vehicleModel: driverInfo?.vehicle_model || '',
      vehicleYear: driverInfo?.vehicle_year || null,
      vehicleColor: driverInfo?.vehicle_color || '',
      vehicleCapacity: driverInfo?.vehicle_capacity || null,
      isAvailable: driverInfo?.is_available || false,
      serviceTypes: driverInfo?.service_types || ['charter', 'instant_ride'],
      backgroundCheckStatus: driverInfo?.background_check_status || 'pending',
      rating: driverInfo?.rating || 0,
      totalTrips: driverInfo?.total_trips || totalTrips,
      completedTrips: completedTrips,
      totalRevenue: totalRevenue,
      joinedDate: driverInfo?.created_at || user.created_at,

      // 最近訂單
      recentBookings: bookings?.slice(0, 5).map((b: any) => ({
        id: b.id,
        status: b.status,
        amount: b.total_amount,
        createdAt: b.created_at,
      })) || [],
    };

    console.log('✅ 成功獲取司機詳情:', { driverId, name: formattedDriver.name });

    return NextResponse.json({
      success: true,
      data: formattedDriver,
      message: '成功獲取司機詳情',
    });

  } catch (error) {
    console.error('❌ API 錯誤:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '內部伺服器錯誤', 
        details: error instanceof Error ? error.message : '未知錯誤' 
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/drivers/[id]
 * 更新司機資訊
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const driverId = params.id;
    const body = await request.json();

    console.log('📋 更新司機資訊:', { driverId, body });

    const db = new DatabaseService(true); // 使用 service_role key

    // 更新用戶基本資訊
    if (body.email || body.phone || body.status) {
      const userUpdates: any = {};
      if (body.email) userUpdates.email = body.email;
      if (body.phone) userUpdates.phone = body.phone;
      if (body.status) userUpdates.status = body.status;

      const { error: userError } = await db.supabase
        .from('users')
        .update(userUpdates)
        .eq('id', driverId);

      if (userError) {
        console.error('❌ 更新用戶資訊失敗:', userError);
        return NextResponse.json(
          { success: false, error: '更新用戶資訊失敗', details: userError.message },
          { status: 500 }
        );
      }
    }

    // 更新個人資料
    if (body.firstName || body.lastName || body.avatar || body.dateOfBirth || body.gender || body.address) {
      const profileUpdates: any = {};
      if (body.firstName !== undefined) profileUpdates.first_name = body.firstName;
      if (body.lastName !== undefined) profileUpdates.last_name = body.lastName;
      if (body.avatar !== undefined) profileUpdates.avatar_url = body.avatar;
      if (body.dateOfBirth !== undefined) profileUpdates.date_of_birth = body.dateOfBirth;
      if (body.gender !== undefined) profileUpdates.gender = body.gender;
      if (body.address !== undefined) profileUpdates.address = body.address;
      if (body.emergencyContactName !== undefined) profileUpdates.emergency_contact_name = body.emergencyContactName;
      if (body.emergencyContactPhone !== undefined) profileUpdates.emergency_contact_phone = body.emergencyContactPhone;

      const { error: profileError } = await db.supabase
        .from('user_profiles')
        .update(profileUpdates)
        .eq('user_id', driverId);

      if (profileError) {
        console.error('❌ 更新個人資料失敗:', profileError);
        return NextResponse.json(
          { success: false, error: '更新個人資料失敗', details: profileError.message },
          { status: 500 }
        );
      }
    }

    // 更新司機專屬資料
    if (body.licenseNumber || body.vehicleType || body.vehiclePlate || body.vehicleModel ||
        body.vehicleYear || body.vehicleColor || body.vehicleCapacity ||
        body.isAvailable !== undefined || body.backgroundCheckStatus ||
        body.serviceTypes !== undefined) {
      const driverUpdates: any = {};
      if (body.licenseNumber !== undefined) driverUpdates.license_number = body.licenseNumber;
      if (body.vehicleType !== undefined) driverUpdates.vehicle_type = body.vehicleType;
      if (body.vehiclePlate !== undefined) driverUpdates.vehicle_plate = body.vehiclePlate;
      if (body.vehicleModel !== undefined) driverUpdates.vehicle_model = body.vehicleModel;
      if (body.vehicleYear !== undefined) driverUpdates.vehicle_year = body.vehicleYear;
      if (body.vehicleColor !== undefined) driverUpdates.vehicle_color = body.vehicleColor;
      if (body.vehicleCapacity !== undefined) driverUpdates.vehicle_capacity = body.vehicleCapacity;
      if (body.isAvailable !== undefined) driverUpdates.is_available = body.isAvailable;
      if (body.backgroundCheckStatus !== undefined) driverUpdates.background_check_status = body.backgroundCheckStatus;
      if (body.serviceTypes !== undefined) driverUpdates.service_types = body.serviceTypes;

      const { error: driverError } = await db.supabase
        .from('drivers')
        .update(driverUpdates)
        .eq('user_id', driverId);

      if (driverError) {
        console.error('❌ 更新司機專屬資料失敗:', driverError);
        return NextResponse.json(
          { success: false, error: '更新司機專屬資料失敗', details: driverError.message },
          { status: 500 }
        );
      }
    }

    console.log('✅ 成功更新司機資訊:', { driverId });

    return NextResponse.json({
      success: true,
      message: '成功更新司機資訊',
    });

  } catch (error) {
    console.error('❌ API 錯誤:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '內部伺服器錯誤', 
        details: error instanceof Error ? error.message : '未知錯誤' 
      },
      { status: 500 }
    );
  }
}


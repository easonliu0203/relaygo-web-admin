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

    // 獲取司機的訂單統計（包含完整財務欄位作為快照，避免歷史資料被修改）
    const { data: bookings, error: bookingsError } = await db.supabase
      .from('bookings')
      .select(`
        id,
        status,
        total_amount,
        created_at,
        driver_earning,
        tip_amount,
        overtime_fee,
        customer_id
      `)
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false });

    if (bookingsError) {
      console.warn('⚠️ 獲取司機訂單統計失敗:', bookingsError);
    }

    // 獲取所有客戶 ID 並查詢客戶資料
    const customerIds = [...new Set(bookings?.map((b: any) => b.customer_id).filter(Boolean) || [])];
    let customerProfiles: Record<string, { first_name: string; last_name: string }> = {};

    if (customerIds.length > 0) {
      const { data: profiles } = await db.supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', customerIds);

      if (profiles) {
        customerProfiles = profiles.reduce((acc: any, p: any) => {
          acc[p.user_id] = { first_name: p.first_name, last_name: p.last_name };
          return acc;
        }, {});
      }
    }

    // 計算統計資料
    const totalTrips = bookings?.length || 0;
    const completedTrips = bookings?.filter((b: any) => b.status === 'completed').length || 0;

    // 計算總收入（服務收入 = driver_earning + tip_amount × 0.97）
    const totalRevenue = bookings
      ?.filter((b: any) => b.status === 'completed')
      .reduce((sum: number, b: any) => {
        const driverEarning = b.driver_earning || 0;
        const tipAmount = b.tip_amount || 0;
        const tipAfterFee = tipAmount * 0.97; // 小費扣除 3% 金流手續費
        const serviceIncome = driverEarning + tipAfterFee;
        return sum + serviceIncome;
      }, 0) || 0;

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

      // 最近訂單（快照：保留當時的財務資料，避免歷史資料被後臺調整影響）
      recentBookings: bookings?.slice(0, 10).map((b: any) => {
        const driverEarning = b.driver_earning || 0;
        const tipAmount = b.tip_amount || 0;
        const tipAfterFee = tipAmount * 0.97; // 小費扣除 3% 金流手續費
        const serviceIncome = driverEarning + tipAfterFee;

        // 從預先查詢的客戶資料中獲取客戶名稱
        const customerProfile = customerProfiles[b.customer_id];
        const customerName = customerProfile
          ? `${customerProfile.first_name || ''} ${customerProfile.last_name || ''}`.trim() || '未設定'
          : '未設定';

        return {
          id: b.id,
          status: b.status,
          amount: b.total_amount,
          createdAt: b.created_at,
          // 快照欄位
          customerName,
          overtimeFee: b.overtime_fee || 0,
          tipAmount: tipAmount,
          tipAfterFee: tipAfterFee,
          driverEarning: driverEarning,
          serviceIncome: serviceIncome,
        };
      }) || [],
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
    console.log('📋 serviceTypes 值:', body.serviceTypes, '類型:', typeof body.serviceTypes);

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
    const shouldUpdateDriver = body.licenseNumber || body.vehicleType || body.vehiclePlate || body.vehicleModel ||
        body.vehicleYear || body.vehicleColor || body.vehicleCapacity ||
        body.isAvailable !== undefined || body.backgroundCheckStatus ||
        body.serviceTypes !== undefined;

    console.log('📋 是否需要更新司機專屬資料:', shouldUpdateDriver);

    if (shouldUpdateDriver) {
      // 先檢查 drivers 表中是否有該司機的記錄
      const { data: existingDriver } = await db.supabase
        .from('drivers')
        .select('id')
        .eq('user_id', driverId)
        .maybeSingle(); // 使用 maybeSingle 避免 0 rows 錯誤

      // 構建更新內容（不包含 user_id，因為 update 不需要）
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

      console.log('📋 司機專屬資料更新內容:', JSON.stringify(driverUpdates));
      console.log('📋 現有司機記錄:', existingDriver ? '存在' : '不存在');

      let driverError;

      if (existingDriver) {
        // 如果記錄存在，使用 update（不包含 user_id）
        console.log('📋 更新現有司機記錄...');
        const result = await db.supabase
          .from('drivers')
          .update(driverUpdates)
          .eq('user_id', driverId);
        driverError = result.error;
        console.log('📋 更新結果:', result);
      } else {
        // 如果記錄不存在，使用 insert 創建新記錄（需要包含 user_id）
        console.log('📋 創建新的司機記錄...');
        const insertData = { ...driverUpdates, user_id: driverId };
        const result = await db.supabase
          .from('drivers')
          .insert(insertData);
        driverError = result.error;
        console.log('📋 插入結果:', result);
      }

      if (driverError) {
        console.error('❌ 更新司機專屬資料失敗:', driverError);
        return NextResponse.json(
          { success: false, error: '更新司機專屬資料失敗', details: driverError.message },
          { status: 500 }
        );
      }

      console.log('✅ 司機專屬資料更新成功');
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


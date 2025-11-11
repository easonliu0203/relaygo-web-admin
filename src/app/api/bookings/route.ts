import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase';

interface CreateBookingRequest {
  customerUid: string;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffAddress: string;
  dropoffLatitude: number;
  dropoffLongitude: number;
  bookingTime: string; // ISO string
  passengerCount: number;
  luggageCount?: number;
  notes?: string;
  packageId: string;
  packageName: string;
  estimatedFare: number;
}

// 生成訂單編號
function generateBookingNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `RG${year}${month}${day}${random}`;
}

// 車型映射：客戶端車型 -> 資料庫車型
const CLIENT_TO_DB_VEHICLE_TYPE = {
  'small': 'A', // 預設使用 A 類小型車
  'large': 'C', // 預設使用 C 類大型車
} as const;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerUid = searchParams.get('customerUid');
    const status = searchParams.get('status');
    const statusesParam = searchParams.get('statuses');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const db = new DatabaseService();

    let query = db.supabase
      .from('bookings')
      .select(`
        *,
        customer:customer_id (
          id,
          firebase_uid,
          email,
          user_profiles (first_name, last_name)
        ),
        driver:driver_id (
          id,
          firebase_uid,
          email,
          user_profiles (first_name, last_name),
          drivers (vehicle_type, vehicle_plate)
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // 根據客戶 UID 篩選
    if (customerUid) {
      // 先找到對應的用戶 ID
      const { data: userData, error: userError } = await db.supabase
        .from('users')
        .select('id')
        .eq('firebase_uid', customerUid)
        .single();

      if (userError || !userData) {
        return NextResponse.json({
          success: true,
          data: [],
          total: 0,
          message: '找不到對應的用戶'
        });
      }

      query = query.eq('customer_id', userData.id);
    }

    // 根據狀態篩選（支援單個狀態或多個狀態）
    if (statusesParam) {
      // 支援多個狀態查詢（例如：statuses=pending_payment,paid_deposit）
      const statuses = statusesParam.split(',').map(s => s.trim());
      query = query.in('status', statuses);
    } else if (status) {
      // 單個狀態查詢（向後兼容）
      query = query.eq('status', status);
    }

    const { data: bookings, error, count } = await query;

    if (error) {
      console.error('獲取訂單失敗:', error);
      return NextResponse.json(
        { error: '獲取訂單失敗', details: (error as any).message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: bookings || [],
      total: count || 0
    });

  } catch (error) {
    console.error('API 錯誤:', error);
    return NextResponse.json(
      { error: '內部伺服器錯誤', details: error instanceof Error ? error.message : '未知錯誤' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateBookingRequest = await request.json();
    console.log('📥 收到預約請求:', {
      customerUid: body.customerUid,
      pickup: body.pickupAddress,
      dropoff: body.dropoffAddress,
      bookingTime: body.bookingTime,
      estimatedFare: body.estimatedFare
    });

    const db = new DatabaseService();

    // 1. 查找或創建用戶
    let userId: string;

    // 先查找用戶是否存在
    const { data: existingUser, error: userFindError } = await db.supabase
      .from('users')
      .select('id')
      .eq('firebase_uid', body.customerUid)
      .single();

    if (existingUser) {
      userId = existingUser.id;
      console.log('✅ 找到現有用戶:', userId);
    } else {
      // 創建新用戶
      const { data: newUser, error: userCreateError } = await db.supabase
        .from('users')
        .insert({
          firebase_uid: body.customerUid,
          email: `${body.customerUid}@temp.com`, // 臨時 email
          role: 'customer'
        })
        .select('id')
        .single();

      if (userCreateError || !newUser) {
        console.error('❌ 創建用戶失敗:', userCreateError);
        return NextResponse.json(
          { error: '創建用戶失敗', details: userCreateError?.message },
          { status: 500 }
        );
      }

      userId = newUser.id;
      console.log('✅ 創建新用戶:', userId);
    }

    // 2. 創建訂單
    const bookingData = {
      customer_id: userId,
      booking_number: generateBookingNumber(),
      status: 'pending',
      start_date: body.bookingTime ? new Date(body.bookingTime).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      start_time: body.bookingTime ? new Date(body.bookingTime).toISOString().split('T')[1].substring(0, 8) : '09:00:00',
      duration_hours: 6, // 默認 6 小時
      vehicle_type: body.packageId || 'A',
      pickup_location: body.pickupAddress || '',
      pickup_latitude: body.pickupLatitude || null,
      pickup_longitude: body.pickupLongitude || null,
      destination: body.dropoffAddress || null,
      // Note: destination_latitude and destination_longitude are not in schema
      base_price: body.estimatedFare || 0,
      total_amount: body.estimatedFare || 0,
      deposit_amount: (body.estimatedFare || 0) * 0.3,
      special_requirements: body.notes || null,
    };

    console.log('📝 準備創建訂單:', {
      booking_number: bookingData.booking_number,
      customer_id: bookingData.customer_id,
      vehicle_type: bookingData.vehicle_type,
      start_date: bookingData.start_date,
      start_time: bookingData.start_time,
      total_amount: bookingData.total_amount
    });

    const { data: booking, error: bookingError } = await db.supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();

    if (bookingError || !booking) {
      console.error('❌ 創建訂單失敗:', {
        error: bookingError,
        message: bookingError?.message,
        details: bookingError?.details,
        hint: bookingError?.hint,
        code: bookingError?.code,
        bookingData: bookingData
      });
      return NextResponse.json(
        {
          error: '創建訂單失敗',
          details: bookingError?.message,
          hint: bookingError?.hint,
          code: bookingError?.code
        },
        { status: 500 }
      );
    }

    console.log('✅ 訂單創建成功:', {
      id: booking.id,
      booking_number: booking.booking_number,
      status: booking.status,
      total_amount: booking.total_amount
    });

    // 3. 返回訂單資料
    return NextResponse.json({
      success: true,
      data: {
        id: booking.id,
        bookingNumber: booking.booking_number,
        status: booking.status,
        totalAmount: booking.total_amount,
        depositAmount: booking.deposit_amount,
      }
    });

  } catch (error) {
    console.error('❌ API 錯誤:', {
      error: error,
      message: error instanceof Error ? error.message : '未知錯誤',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: '內部伺服器錯誤', details: error instanceof Error ? error.message : '未知錯誤' },
      { status: 500 }
    );
  }
}

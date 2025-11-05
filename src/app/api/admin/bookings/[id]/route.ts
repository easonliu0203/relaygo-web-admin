import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase';

/**
 * GET /api/admin/bookings/[id]
 * 獲取訂單詳情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;

    console.log('📋 獲取訂單詳情:', { bookingId });

    const db = new DatabaseService(true); // 使用 service_role key

    // 獲取訂單基本資訊
    const { data: booking, error: bookingError } = await db.supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('❌ 獲取訂單失敗:', bookingError);
      return NextResponse.json(
        {
          success: false,
          error: '訂單不存在',
          details: bookingError?.message
        },
        { status: 404 }
      );
    }

    // 獲取客戶資訊
    let formattedCustomer = null;
    if (booking.customer_id) {
      const { data: customer } = await db.supabase
        .from('users')
        .select('id, email, firebase_uid')
        .eq('id', booking.customer_id)
        .single();

      const { data: customerProfile } = await db.supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', booking.customer_id)
        .single();

      formattedCustomer = {
        id: customer?.id,
        email: customer?.email,
        name: customerProfile
          ? `${customerProfile.first_name || ''} ${customerProfile.last_name || ''}`.trim() || '未知客戶'
          : '未知客戶',
        phone: customerProfile?.phone || '無電話',
      };
    }

    // 獲取司機資訊
    let formattedDriver = null;
    if (booking.driver_id) {
      const { data: driver } = await db.supabase
        .from('users')
        .select('id, email, firebase_uid')
        .eq('id', booking.driver_id)
        .single();

      const { data: driverProfile } = await db.supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', booking.driver_id)
        .single();

      const { data: driverInfo } = await db.supabase
        .from('drivers')
        .select('*')
        .eq('user_id', booking.driver_id)
        .single();

      formattedDriver = {
        id: driver?.id,
        email: driver?.email,
        name: driverProfile
          ? `${driverProfile.first_name || ''} ${driverProfile.last_name || ''}`.trim() || '未知司機'
          : '未知司機',
        phone: driverProfile?.phone || '無電話',
        vehicleType: driverInfo?.vehicle_type || '-',
        vehiclePlate: driverInfo?.vehicle_plate || '-',
        rating: driverInfo?.rating || 0,
      };
    }

    // 格式化訂單資料
    const formattedBooking = {
      id: booking.id,
      bookingNumber: booking.booking_number,
      customerId: booking.customer_id,
      driverId: booking.driver_id,
      status: booking.status,
      vehicleType: booking.vehicle_type,
      pickupLocation: booking.pickup_location,
      dropoffLocation: booking.dropoff_location,
      scheduledDate: booking.start_date,
      scheduledTime: booking.start_time,
      durationHours: booking.duration_hours,
      estimatedDistance: booking.estimated_distance,
      passengerCount: booking.passenger_count,
      luggageCount: booking.luggage_count,
      specialRequirements: booking.special_requirements,
      notes: booking.notes,
      pricing: {
        totalAmount: booking.total_amount,
        depositAmount: booking.deposit_amount,
        basePrice: booking.base_price,
        extraCharges: booking.extra_charges,
      },
      paymentStatus: booking.payment_status,
      paymentMethod: booking.payment_method,
      createdAt: booking.created_at,
      updatedAt: booking.updated_at,
      cancelledAt: booking.cancelled_at,
      cancellationReason: booking.cancellation_reason,
      customer: formattedCustomer,
      driver: formattedDriver,
    };

    console.log('✅ 成功獲取訂單詳情:', { bookingId });

    return NextResponse.json({
      success: true,
      data: formattedBooking,
      message: '成功獲取訂單詳情',
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


import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * GET /api/admin/bookings/[id]/locations
 * 獲取訂單的司機位置追蹤資料
 * 
 * 返回資料：
 * - departureLocation: 出發定位（一次性記錄）
 * - arrivalLocation: 到達定位（一次性記錄）
 * - realtimeLocation: 即時定位（持續更新）
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;

    console.log('📍 獲取訂單位置資料:', { bookingId });

    // 初始化 Firebase Admin（如果尚未初始化）
    if (getApps().length === 0) {
      const serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
      );

      initializeApp({
        credential: cert(serviceAccount),
      });
    }

    const firestore = getFirestore();

    // 1. 獲取出發和到達定位記錄（從 location_history 集合）
    const locationHistoryRef = firestore
      .collection('bookings')
      .doc(bookingId)
      .collection('location_history');

    const locationHistorySnapshot = await locationHistoryRef
      .orderBy('timestamp', 'desc')
      .get();

    let departureLocation: any = null;
    let arrivalLocation: any = null;

    locationHistorySnapshot.forEach((doc) => {
      const data = doc.data();

      if (data.status === 'driver_departed' && !departureLocation) {
        departureLocation = {
          latitude: data.latitude,
          longitude: data.longitude,
          googleMapsUrl: data.googleMapsUrl,
          appleMapsUrl: data.appleMapsUrl,
          timestamp: data.timestamp?.toDate?.()?.toISOString() || null,
        };
      }

      if (data.status === 'driver_arrived' && !arrivalLocation) {
        arrivalLocation = {
          latitude: data.latitude,
          longitude: data.longitude,
          googleMapsUrl: data.googleMapsUrl,
          appleMapsUrl: data.appleMapsUrl,
          timestamp: data.timestamp?.toDate?.()?.toISOString() || null,
        };
      }
    });

    // 2. 獲取訂單資料以取得司機 ID
    const bookingRef = firestore.collection('orders_rt').doc(bookingId);
    const bookingDoc = await bookingRef.get();

    let realtimeLocation: any = null;
    
    if (bookingDoc.exists) {
      const bookingData = bookingDoc.data();
      const driverId = bookingData?.driverId;

      if (driverId) {
        // 3. 獲取司機即時定位（從 driver_locations 集合）
        const driverLocationRef = firestore
          .collection('driver_locations')
          .doc(driverId);

        const driverLocationDoc = await driverLocationRef.get();

        if (driverLocationDoc.exists) {
          const locationData = driverLocationDoc.data();
          
          realtimeLocation = {
            latitude: locationData?.latitude || null,
            longitude: locationData?.longitude || null,
            googleMapsUrl: locationData?.latitude && locationData?.longitude
              ? `https://maps.google.com/?q=${locationData.latitude},${locationData.longitude}`
              : null,
            appleMapsUrl: locationData?.latitude && locationData?.longitude
              ? `https://maps.apple.com/?q=${locationData.latitude},${locationData.longitude}`
              : null,
            timestamp: locationData?.timestamp?.toDate?.()?.toISOString() || null,
            isOnline: locationData?.isOnline || false,
          };
        }
      }
    }

    console.log('✅ 成功獲取位置資料:', {
      bookingId,
      hasDeparture: !!departureLocation,
      hasArrival: !!arrivalLocation,
      hasRealtime: !!realtimeLocation,
    });

    return NextResponse.json({
      success: true,
      data: {
        departureLocation,
        arrivalLocation,
        realtimeLocation,
      },
      message: '成功獲取位置資料',
    });

  } catch (error) {
    console.error('❌ 獲取位置資料失敗:', error);
    return NextResponse.json(
      {
        success: false,
        error: '獲取位置資料失敗',
        details: error instanceof Error ? error.message : '未知錯誤',
      },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { DatabaseService } from '@/lib/supabase';

/**
 * GET /api/admin/bookings/[id]/locations
 * 獲取訂單的司機位置追蹤資料
 *
 * 返回資料：
 * - departureLocation: 出發定位（從 Supabase bookings 表讀取）
 * - arrivalLocation: 到達定位（從 Supabase bookings 表讀取）
 * - realtimeLocation: 即時定位（從 Firestore driver_locations 讀取）
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
      try {
        // 方法 1: 使用分離的環境變數（推薦）
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY;

        if (projectId && clientEmail && privateKey) {
          console.log('🔑 使用分離的環境變數初始化 Firebase');

          initializeApp({
            credential: cert({
              projectId,
              clientEmail,
              privateKey: privateKey.replace(/\\n/g, '\n'), // 處理轉義的換行符
            }),
          });

          console.log('✅ Firebase Admin SDK 初始化成功（分離環境變數）');
        } else {
          // 方法 2: 使用單一 JSON 環境變數（備用）
          const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

          if (!serviceAccountKey) {
            throw new Error('Firebase 環境變數未設置。請設置 FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY 或 FIREBASE_SERVICE_ACCOUNT_KEY');
          }

          console.log('🔑 使用 JSON 環境變數初始化 Firebase');
          console.log('🔑 環境變數長度:', serviceAccountKey.length);
          console.log('🔑 環境變數前 100 字元:', serviceAccountKey.substring(0, 100));

          const serviceAccount = JSON.parse(serviceAccountKey);

          initializeApp({
            credential: cert(serviceAccount),
          });

          console.log('✅ Firebase Admin SDK 初始化成功（JSON 環境變數）');
        }
      } catch (error) {
        console.error('❌ Firebase Admin SDK 初始化失敗:', error);
        if (error instanceof SyntaxError) {
          console.error('JSON 解析錯誤，請檢查環境變數格式');
          console.error('建議使用分離的環境變數: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
        }
        throw new Error(`Firebase 初始化失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
      }
    }

    const firestore = getFirestore();

    // 1. 從 Supabase 獲取訂單資料（包含出發和到達位置）
    const db = new DatabaseService(true); // 使用 service_role key
    const { data: booking, error: bookingError } = await db.supabase
      .from('bookings')
      .select('driver_id, driver_depart_latitude, driver_depart_longitude, driver_arrive_latitude, driver_arrive_longitude, updated_at')
      .eq('id', bookingId)
      .single();

    if (bookingError) {
      console.error('❌ 從 Supabase 獲取訂單失敗:', bookingError);
    }

    console.log('📍 Supabase 訂單資料:', {
      hasDepart: !!(booking?.driver_depart_latitude && booking?.driver_depart_longitude),
      hasArrive: !!(booking?.driver_arrive_latitude && booking?.driver_arrive_longitude),
    });

    // 構建出發位置資料
    let departureLocation: any = null;
    if (booking?.driver_depart_latitude && booking?.driver_depart_longitude) {
      departureLocation = {
        latitude: booking.driver_depart_latitude,
        longitude: booking.driver_depart_longitude,
        googleMapsUrl: `https://maps.google.com/?q=${booking.driver_depart_latitude},${booking.driver_depart_longitude}`,
        appleMapsUrl: `https://maps.apple.com/?q=${booking.driver_depart_latitude},${booking.driver_depart_longitude}`,
        timestamp: booking.updated_at || null,
      };
    }

    // 構建到達位置資料
    let arrivalLocation: any = null;
    if (booking?.driver_arrive_latitude && booking?.driver_arrive_longitude) {
      arrivalLocation = {
        latitude: booking.driver_arrive_latitude,
        longitude: booking.driver_arrive_longitude,
        googleMapsUrl: `https://maps.google.com/?q=${booking.driver_arrive_latitude},${booking.driver_arrive_longitude}`,
        appleMapsUrl: `https://maps.apple.com/?q=${booking.driver_arrive_latitude},${booking.driver_arrive_longitude}`,
        timestamp: booking.updated_at || null,
      };
    }

    // 2. 從 Firestore 獲取訂單資料以取得司機 ID（用於即時定位）
    const bookingRef = firestore.collection('orders_rt').doc(bookingId);
    const bookingDoc = await bookingRef.get();

    let realtimeLocation: any = null;
    
    if (bookingDoc.exists) {
      const bookingData = bookingDoc.data();
      const driverId = bookingData?.driverId;

      if (driverId) {
        // 3. 獲取司機即時定位（從 driver_locations 集合）
        console.log('📍 查詢司機即時定位:', { driverId });

        const driverLocationRef = firestore
          .collection('driver_locations')
          .doc(driverId);

        const driverLocationDoc = await driverLocationRef.get();

        console.log('📍 司機定位文檔存在:', driverLocationDoc.exists);

        if (driverLocationDoc.exists) {
          const locationData = driverLocationDoc.data();
          console.log('📍 司機定位資料:', {
            latitude: locationData?.latitude,
            longitude: locationData?.longitude,
            isOnline: locationData?.isOnline,
            timestamp: locationData?.timestamp,
          });

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
        } else {
          console.log('⚠️  司機定位文檔不存在，可能司機尚未開始位置追蹤');
        }
      } else {
        console.log('⚠️  訂單資料中沒有司機 ID');
      }
    } else {
      console.log('⚠️  訂單文檔不存在:', bookingId);
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


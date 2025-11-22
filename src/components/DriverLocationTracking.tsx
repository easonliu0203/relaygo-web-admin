'use client';

import React, { useEffect, useState } from 'react';
import { Card, Descriptions, Empty, Spin, Button, message } from 'antd';
import { EnvironmentOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

interface LocationData {
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  appleMapsUrl: string | null;
  timestamp: string | null;
  isOnline?: boolean;
}

interface DriverLocationTrackingProps {
  bookingId: string;
  orderStatus: string;
}

export default function DriverLocationTracking({ bookingId, orderStatus }: DriverLocationTrackingProps) {
  const [loading, setLoading] = useState(true);
  const [departureLocation, setDepartureLocation] = useState<LocationData | null>(null);
  const [arrivalLocation, setArrivalLocation] = useState<LocationData | null>(null);
  const [realtimeLocation, setRealtimeLocation] = useState<LocationData | null>(null);

  // 載入位置資料
  const loadLocationData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/locations`);
      const data = await response.json();

      if (data.success) {
        setDepartureLocation(data.data.departureLocation);
        setArrivalLocation(data.data.arrivalLocation);
        setRealtimeLocation(data.data.realtimeLocation);
      } else {
        throw new Error(data.error || '載入位置資料失敗');
      }
    } catch (error: any) {
      console.error('❌ 載入位置資料失敗:', error);
      message.error(error.message || '載入位置資料失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocationData();

    // 如果訂單進行中，每 30 秒自動更新即時定位
    let interval: NodeJS.Timeout | null = null;
    if (orderStatus === 'inProgress' || orderStatus === 'matched') {
      interval = setInterval(() => {
        loadLocationData();
      }, 30000); // 30 秒
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [bookingId, orderStatus]);

  // 渲染位置資訊
  const renderLocationInfo = (location: LocationData | null, title: string) => {
    if (!location) {
      return <Empty description={`尚無${title}資料`} />;
    }

    return (
      <Descriptions bordered column={1} size="small">
        <Descriptions.Item label="📍 座標">
          {location.latitude && location.longitude
            ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
            : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="🕐 時間">
          {location.timestamp ? dayjs(location.timestamp).format('YYYY-MM-DD HH:mm:ss') : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="🗺️ 地圖連結">
          {location.googleMapsUrl && location.appleMapsUrl ? (
            <div className="space-x-2">
              <a
                href={location.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Google Maps
              </a>
              <span>|</span>
              <a
                href={location.appleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Apple Maps
              </a>
            </div>
          ) : '-'}
        </Descriptions.Item>
        {location.isOnline !== undefined && (
          <Descriptions.Item label="📡 狀態">
            <span className={location.isOnline ? 'text-green-600' : 'text-gray-500'}>
              {location.isOnline ? '線上' : '離線'}
            </span>
          </Descriptions.Item>
        )}
      </Descriptions>
    );
  };

  if (loading) {
    return (
      <Card title={<><EnvironmentOutlined /> 司機位置追蹤</>}>
        <div className="flex justify-center items-center py-8">
          <Spin tip="載入位置資料中..." />
        </div>
      </Card>
    );
  }

  const hasAnyLocation = departureLocation || arrivalLocation || realtimeLocation;

  return (
    <Card
      title={<><EnvironmentOutlined /> 司機位置追蹤</>}
      extra={
        <Button
          icon={<ReloadOutlined />}
          onClick={loadLocationData}
          loading={loading}
          size="small"
        >
          重新整理
        </Button>
      }
    >
      {!hasAnyLocation ? (
        <Empty description="尚無位置追蹤資料" />
      ) : (
        <div className="space-y-4">
          {/* 出發定位 */}
          <div>
            <h4 className="font-medium mb-2">🚗 出發定位</h4>
            {renderLocationInfo(departureLocation, '出發定位')}
          </div>

          {/* 到達定位 */}
          <div>
            <h4 className="font-medium mb-2">📍 到達定位</h4>
            {renderLocationInfo(arrivalLocation, '到達定位')}
          </div>

          {/* 即時定位 */}
          <div>
            <h4 className="font-medium mb-2">📡 即時定位</h4>
            {renderLocationInfo(realtimeLocation, '即時定位')}
            {realtimeLocation && (orderStatus === 'inProgress' || orderStatus === 'matched') && (
              <p className="text-sm text-gray-500 mt-2">
                * 即時定位每 30 秒自動更新
              </p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}


'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, Descriptions, Tag, Button, Space, Spin, message, Divider, Timeline, Empty } from 'antd';
import {
  ArrowLeftOutlined,
  UserOutlined,
  CarOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { ApiService } from '@/services/api';
import DriverLocationTracking from '@/components/DriverLocationTracking';

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);

  // 載入訂單詳情
  const loadOrderDetail = async () => {
    setLoading(true);
    try {
      const response = await ApiService.getBookingById(orderId);

      if (response.success) {
        setOrder(response.data);
      } else {
        throw new Error(response.message || '載入訂單失敗');
      }
    } catch (error: any) {
      console.error('❌ 載入訂單詳情失敗:', error);
      message.error(error.message || '載入訂單詳情失敗');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      loadOrderDetail();
    }
  }, [orderId]);

  // 訂單狀態配置
  const statusConfig: Record<string, { color: string; text: string }> = {
    pending: { color: 'orange', text: '待配對' },
    matched: { color: 'cyan', text: '已配對' },
    inProgress: { color: 'green', text: '進行中' },
    completed: { color: 'success', text: '已完成' },
    cancelled: { color: 'error', text: '已取消' },
  };

  // 獲取狀態標籤
  const getStatusTag = (status: string) => {
    const config = statusConfig[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 車型對應
  const vehicleTypeMap: Record<string, string> = {
    A: '豪華9人座',
    B: '標準8人座',
    C: '舒適4人座',
    D: '經濟3人座',
  };

  // 格式化日期時間
  const formatDateTime = (date: string, time?: string) => {
    if (!date) return '-';
    try {
      if (time) {
        return dayjs(`${date} ${time}`).format('YYYY-MM-DD HH:mm');
      }
      return dayjs(date).format('YYYY-MM-DD');
    } catch (error) {
      return '-';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" tip="載入中..." />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6">
        <Card>
          <Empty description="訂單不存在" />
          <div className="text-center mt-4">
            <Button type="primary" onClick={() => router.push('/orders')}>
              返回訂單列表
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
            返回
          </Button>
          <h1 className="text-2xl font-bold">訂單詳情</h1>
          {getStatusTag(order.status)}
        </div>
        <Space>
          <Button onClick={loadOrderDetail}>重新整理</Button>
        </Space>
      </div>

      {/* 訂單基本資訊 */}
      <Card title={<><InfoCircleOutlined /> 訂單基本資訊</>}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="訂單編號">{order.bookingNumber || '-'}</Descriptions.Item>
          <Descriptions.Item label="訂單狀態">{getStatusTag(order.status)}</Descriptions.Item>
          <Descriptions.Item label="訂單 ID">{order.id || '-'}</Descriptions.Item>
          <Descriptions.Item label="建立時間">
            {order.createdAt ? dayjs(order.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="更新時間">
            {order.updatedAt ? dayjs(order.updatedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="車型">
            {vehicleTypeMap[order.vehicleType] || order.vehicleType || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 客戶資訊 */}
      <Card title={<><UserOutlined /> 客戶資訊</>}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="客戶 UID">{order.customer?.id || order.customerId || '-'}</Descriptions.Item>
          <Descriptions.Item label="客戶姓名">{order.customer?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="客戶電話">{order.customer?.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="客戶 Email">{order.customer?.email || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 司機資訊 */}
      <Card title={<><CarOutlined /> 司機資訊</>}>
        {order.driver ? (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="司機 UID">{order.driver?.id || order.driverId || '-'}</Descriptions.Item>
            <Descriptions.Item label="司機姓名">{order.driver?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="司機電話">{order.driver?.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="車型">
              {vehicleTypeMap[order.driver?.vehicleType] || order.driver?.vehicleType || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="車牌號">{order.driver?.vehiclePlate || '-'}</Descriptions.Item>
            <Descriptions.Item label="司機評分">
              {order.driver?.rating ? `${order.driver.rating.toFixed(1)} ⭐` : '-'}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Empty description="尚未分配司機" />
        )}
      </Card>

      {/* 司機位置追蹤 */}
      {order.driver && (
        <DriverLocationTracking bookingId={orderId} orderStatus={order.status} />
      )}

      {/* 路線資訊 */}
      <Card title={<><EnvironmentOutlined /> 路線資訊</>}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="起點" span={2}>{order.pickupLocation || '-'}</Descriptions.Item>
          <Descriptions.Item label="終點" span={2}>{order.dropoffLocation || '-'}</Descriptions.Item>
          <Descriptions.Item label="預約日期">{order.scheduledDate || '-'}</Descriptions.Item>
          <Descriptions.Item label="預約時間">{order.scheduledTime || '-'}</Descriptions.Item>
          <Descriptions.Item label="預計時長">{order.durationHours ? `${order.durationHours} 小時` : '-'}</Descriptions.Item>
          <Descriptions.Item label="預計距離">{order.estimatedDistance ? `${order.estimatedDistance} 公里` : '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 價格資訊 */}
      <Card title={<><DollarOutlined /> 價格資訊</>}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="總金額">
            {order.pricing?.totalAmount ? `NT$ ${order.pricing.totalAmount.toLocaleString()}` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="訂金">
            {order.pricing?.depositAmount ? `NT$ ${order.pricing.depositAmount.toLocaleString()}` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="基本費用">
            {order.pricing?.basePrice ? `NT$ ${order.pricing.basePrice.toLocaleString()}` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="額外費用">
            {order.pricing?.extraCharges ? `NT$ ${order.pricing.extraCharges.toLocaleString()}` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="付款狀態">
            {order.paymentStatus ? (
              <Tag color={order.paymentStatus === 'paid' ? 'success' : 'warning'}>
                {order.paymentStatus === 'paid' ? '已付款' : '未付款'}
              </Tag>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="付款方式">{order.paymentMethod || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 其他資訊 */}
      <Card title={<><ClockCircleOutlined /> 其他資訊</>}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="乘客人數">{order.passengerCount || '-'}</Descriptions.Item>
          <Descriptions.Item label="行李數量">{order.luggageCount || '-'}</Descriptions.Item>
          <Descriptions.Item label="特殊需求" span={2}>{order.specialRequirements || '-'}</Descriptions.Item>
          <Descriptions.Item label="備註" span={2}>{order.notes || '-'}</Descriptions.Item>
          {order.status === 'cancelled' && (
            <>
              <Descriptions.Item label="取消時間">
                {order.cancelledAt ? dayjs(order.cancelledAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="取消原因" span={2}>{order.cancellationReason || '-'}</Descriptions.Item>
            </>
          )}
        </Descriptions>
      </Card>

      {/* 訂單時間軸 */}
      <Card title="訂單歷程">
        <Timeline
          items={[
            {
              color: 'blue',
              children: (
                <div>
                  <div className="font-medium">訂單建立</div>
                  <div className="text-gray-500 text-sm">
                    {order.createdAt ? dayjs(order.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
                  </div>
                </div>
              ),
            },
            ...(order.driver ? [{
              color: 'green',
              children: (
                <div>
                  <div className="font-medium">司機分配</div>
                  <div className="text-gray-500 text-sm">司機: {order.driver?.name || '-'}</div>
                </div>
              ),
            }] : []),
            ...(order.status === 'cancelled' ? [{
              color: 'red',
              children: (
                <div>
                  <div className="font-medium">訂單取消</div>
                  <div className="text-gray-500 text-sm">
                    {order.cancelledAt ? dayjs(order.cancelledAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
                  </div>
                  <div className="text-gray-500 text-sm">原因: {order.cancellationReason || '-'}</div>
                </div>
              ),
            }] : []),
            {
              color: 'gray',
              children: (
                <div>
                  <div className="font-medium">當前狀態</div>
                  <div className="text-gray-500 text-sm">{getStatusTag(order.status)}</div>
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}


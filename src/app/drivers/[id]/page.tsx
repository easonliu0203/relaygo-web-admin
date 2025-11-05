'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Card, 
  Descriptions, 
  Tag, 
  Button, 
  Space, 
  Spin, 
  message, 
  Divider, 
  Empty,
  Avatar,
  Statistic,
  Row,
  Col,
  Table,
} from 'antd';
import {
  ArrowLeftOutlined,
  UserOutlined,
  CarOutlined,
  PhoneOutlined,
  MailOutlined,
  IdcardOutlined,
  StarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { ApiService } from '@/services/api';

export default function DriverDetailPage() {
  const router = useRouter();
  const params = useParams();
  const driverId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [driver, setDriver] = useState<any>(null);

  // 載入司機詳情
  const loadDriverDetail = async () => {
    setLoading(true);
    try {
      const response = await ApiService.getDriverById(driverId);

      if (response.success) {
        setDriver(response.data);
      } else {
        throw new Error(response.message || '載入司機資料失敗');
      }
    } catch (error: any) {
      console.error('❌ 載入司機詳情失敗:', error);
      message.error(error.message || '載入司機詳情失敗');
      setDriver(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (driverId) {
      loadDriverDetail();
    }
  }, [driverId]);

  // 狀態配置
  const statusConfig: Record<string, { color: string; text: string }> = {
    active: { color: 'success', text: '啟用' },
    inactive: { color: 'default', text: '停用' },
    suspended: { color: 'error', text: '暫停' },
  };

  // 背景審核狀態配置
  const backgroundCheckConfig: Record<string, { color: string; text: string }> = {
    pending: { color: 'orange', text: '待審核' },
    approved: { color: 'success', text: '已通過' },
    rejected: { color: 'error', text: '未通過' },
  };

  // 車型對應
  const vehicleTypeMap: Record<string, string> = {
    A: '豪華9人座',
    B: '標準8人座',
    C: '舒適4人座',
    D: '經濟3人座',
  };

  // 格式化日期時間
  const formatDateTime = (date: string) => {
    if (!date) return '-';
    try {
      return dayjs(date).format('YYYY-MM-DD HH:mm');
    } catch (error) {
      return '-';
    }
  };

  // 最近訂單表格列
  const bookingColumns = [
    {
      title: '訂單 ID',
      dataIndex: 'id',
      key: 'id',
      render: (id: string) => id.substring(0, 8) + '...',
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config = statusConfig[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '金額',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `NT$ ${amount?.toLocaleString() || 0}`,
    },
    {
      title: '日期',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDateTime(date),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" tip="載入中..." />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="p-6">
        <Card>
          <Empty description="司機不存在" />
          <div className="text-center mt-4">
            <Button type="primary" icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
              返回列表
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 頁面標題 */}
      <div className="mb-6">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
            返回
          </Button>
          <h1 className="text-2xl font-bold m-0">司機詳情</h1>
        </Space>
      </div>

      {/* 統計卡片 */}
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="總行程數"
              value={driver.totalTrips}
              prefix={<CarOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="完成行程"
              value={driver.completedTrips}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="總收入"
              value={driver.totalRevenue}
              prefix="NT$"
              precision={0}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="評分"
              value={driver.rating}
              prefix={<StarOutlined />}
              suffix="/ 5"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 基本資訊 */}
      <Card title="基本資訊" className="mb-6">
        <div className="flex items-start mb-4">
          <Avatar size={80} icon={<UserOutlined />} src={driver.avatar} />
          <div className="ml-4">
            <h2 className="text-xl font-bold mb-2">{driver.name}</h2>
            <Space>
              <Tag color={statusConfig[driver.status]?.color || 'default'}>
                {statusConfig[driver.status]?.text || driver.status}
              </Tag>
              <Tag color={backgroundCheckConfig[driver.backgroundCheckStatus]?.color || 'default'}>
                {backgroundCheckConfig[driver.backgroundCheckStatus]?.text || driver.backgroundCheckStatus}
              </Tag>
              {driver.isAvailable ? (
                <Tag color="success">可接單</Tag>
              ) : (
                <Tag color="default">不可接單</Tag>
              )}
            </Space>
          </div>
        </div>

        <Descriptions column={2} bordered>
          <Descriptions.Item label="Email" span={1}>
            <Space>
              <MailOutlined />
              {driver.email}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="電話" span={1}>
            <Space>
              <PhoneOutlined />
              {driver.phone || '未設定'}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="姓名" span={1}>
            {driver.firstName} {driver.lastName}
          </Descriptions.Item>
          <Descriptions.Item label="性別" span={1}>
            {driver.gender === 'male' ? '男' : driver.gender === 'female' ? '女' : '未設定'}
          </Descriptions.Item>
          <Descriptions.Item label="出生日期" span={1}>
            {driver.dateOfBirth || '未設定'}
          </Descriptions.Item>
          <Descriptions.Item label="地址" span={1}>
            {driver.address || '未設定'}
          </Descriptions.Item>
          <Descriptions.Item label="緊急聯絡人" span={1}>
            {driver.emergencyContactName || '未設定'}
          </Descriptions.Item>
          <Descriptions.Item label="緊急聯絡電話" span={1}>
            {driver.emergencyContactPhone || '未設定'}
          </Descriptions.Item>
          <Descriptions.Item label="註冊日期" span={1}>
            {formatDateTime(driver.createdAt)}
          </Descriptions.Item>
          <Descriptions.Item label="加入日期" span={1}>
            {formatDateTime(driver.joinedDate)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 司機資訊 */}
      <Card title="司機資訊" className="mb-6">
        <Descriptions column={2} bordered>
          <Descriptions.Item label="駕照號碼" span={1}>
            <Space>
              <IdcardOutlined />
              {driver.licenseNumber || '未設定'}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="背景審核狀態" span={1}>
            <Tag color={backgroundCheckConfig[driver.backgroundCheckStatus]?.color || 'default'}>
              {backgroundCheckConfig[driver.backgroundCheckStatus]?.text || driver.backgroundCheckStatus}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="車型" span={1}>
            {vehicleTypeMap[driver.vehicleType] || driver.vehicleType || '未設定'}
          </Descriptions.Item>
          <Descriptions.Item label="車牌號碼" span={1}>
            {driver.vehiclePlate || '未設定'}
          </Descriptions.Item>
          <Descriptions.Item label="車輛型號" span={1}>
            {driver.vehicleModel || '未設定'}
          </Descriptions.Item>
          <Descriptions.Item label="車輛年份" span={1}>
            {driver.vehicleYear || '未設定'}
          </Descriptions.Item>
          <Descriptions.Item label="車輛顏色" span={1}>
            {driver.vehicleColor || '未設定'}
          </Descriptions.Item>
          <Descriptions.Item label="車輛載客量" span={1}>
            {driver.vehicleCapacity || '未設定'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 最近訂單 */}
      <Card title="最近訂單" className="mb-6">
        {driver.recentBookings && driver.recentBookings.length > 0 ? (
          <Table
            dataSource={driver.recentBookings}
            columns={bookingColumns}
            rowKey="id"
            pagination={false}
          />
        ) : (
          <Empty description="暫無訂單記錄" />
        )}
      </Card>
    </div>
  );
}


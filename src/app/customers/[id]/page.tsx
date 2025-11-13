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
  PhoneOutlined,
  MailOutlined,
  ShoppingOutlined,
  DollarOutlined,
  TrophyOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { ApiService } from '@/services/api';

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<any>(null);

  // 載入客戶詳情
  const loadCustomerDetail = async () => {
    setLoading(true);
    try {
      const response = await ApiService.getCustomerById(customerId);

      if (response.success) {
        setCustomer(response.data);
      } else {
        throw new Error(response.message || '載入客戶資料失敗');
      }
    } catch (error: any) {
      console.error('❌ 載入客戶詳情失敗:', error);
      message.error(error.message || '載入客戶詳情失敗');
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) {
      loadCustomerDetail();
    }
  }, [customerId]);

  // 狀態配置
  const statusConfig: Record<string, { color: string; text: string }> = {
    active: { color: 'success', text: '啟用' },
    inactive: { color: 'default', text: '停用' },
    suspended: { color: 'error', text: '暫停' },
  };

  // 訂單狀態配置
  // 訂單狀態配置（四階段分類）
  const bookingStatusConfig: Record<string, { color: string; text: string }> = {
    // === 階段 I: 付款與搜尋 ===
    PENDING_PAYMENT: { color: 'volcano', text: '待付訂金' },
    pending: { color: 'orange', text: '待配對' },
    awaitingDriver: { color: 'gold', text: '待司機確認' },

    // === 階段 II: 服務中 ===
    matched: { color: 'cyan', text: '已配對' },
    ON_THE_WAY: { color: 'blue', text: '正在路上' },
    inProgress: { color: 'green', text: '進行中' },

    // === 階段 III: 結算 ===
    awaitingBalance: { color: 'lime', text: '待付尾款' },

    // === 階段 IV: 最終 ===
    completed: { color: 'success', text: '已完成' },
    cancelled: { color: 'error', text: '已取消' },
  };

  // VIP 等級配置
  const vipLevelConfig: Record<string, { color: string; text: string; icon: string }> = {
    bronze: { color: '#cd7f32', text: '銅牌會員', icon: '🥉' },
    silver: { color: '#c0c0c0', text: '銀牌會員', icon: '🥈' },
    gold: { color: '#ffd700', text: '金牌會員', icon: '🥇' },
    platinum: { color: '#e5e4e2', text: '白金會員', icon: '💎' },
    diamond: { color: '#b9f2ff', text: '鑽石會員', icon: '💠' },
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
        const config = bookingStatusConfig[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '上車地點',
      dataIndex: 'pickupLocation',
      key: 'pickupLocation',
      render: (location: string) => location || '-',
    },
    {
      title: '下車地點',
      dataIndex: 'dropoffLocation',
      key: 'dropoffLocation',
      render: (location: string) => location || '-',
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

  if (!customer) {
    return (
      <div className="p-6">
        <Card>
          <Empty description="客戶不存在" />
          <div className="text-center mt-4">
            <Button type="primary" icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
              返回列表
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const vipConfig = vipLevelConfig[customer.vipLevel] || vipLevelConfig.bronze;

  return (
    <div className="p-6">
      {/* 頁面標題 */}
      <div className="mb-6">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
            返回
          </Button>
          <h1 className="text-2xl font-bold m-0">客戶詳情</h1>
        </Space>
      </div>

      {/* 統計卡片 */}
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="總訂單數"
              value={customer.totalOrders}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="完成訂單"
              value={customer.completedOrders}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="總消費"
              value={customer.totalSpent}
              prefix="NT$"
              precision={0}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="VIP 等級"
              value={vipConfig.text}
              prefix={vipConfig.icon}
              valueStyle={{ color: vipConfig.color }}
            />
          </Card>
        </Col>
      </Row>

      {/* 基本資訊 */}
      <Card title="基本資訊" className="mb-6">
        <div className="flex items-start mb-4">
          <Avatar size={80} icon={<UserOutlined />} src={customer.avatar} />
          <div className="ml-4">
            <h2 className="text-xl font-bold mb-2">{customer.name}</h2>
            <Space>
              <Tag color={statusConfig[customer.status]?.color || 'default'}>
                {statusConfig[customer.status]?.text || customer.status}
              </Tag>
              <Tag color={vipConfig.color}>
                {vipConfig.icon} {vipConfig.text}
              </Tag>
            </Space>
          </div>
        </div>

        <Descriptions column={2} bordered>
          <Descriptions.Item label="Email" span={1}>
            <Space>
              <MailOutlined />
              {customer.email}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="電話" span={1}>
            <Space>
              <PhoneOutlined />
              {customer.phone || '未設定'}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="姓名" span={1}>
            {customer.firstName} {customer.lastName}
          </Descriptions.Item>
          <Descriptions.Item label="性別" span={1}>
            {customer.gender === 'male' ? '男' : customer.gender === 'female' ? '女' : '未設定'}
          </Descriptions.Item>
          <Descriptions.Item label="出生日期" span={1}>
            {customer.dateOfBirth || '未設定'}
          </Descriptions.Item>
          <Descriptions.Item label="地址" span={1}>
            {customer.address || '未設定'}
          </Descriptions.Item>
          <Descriptions.Item label="緊急聯絡人" span={1}>
            {customer.emergencyContactName || '未設定'}
          </Descriptions.Item>
          <Descriptions.Item label="緊急聯絡電話" span={1}>
            {customer.emergencyContactPhone || '未設定'}
          </Descriptions.Item>
          <Descriptions.Item label="註冊日期" span={1}>
            {formatDateTime(customer.createdAt)}
          </Descriptions.Item>
          <Descriptions.Item label="最後訂單日期" span={1}>
            {customer.lastOrderDate ? formatDateTime(customer.lastOrderDate) : '無'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 消費統計 */}
      <Card title="消費統計" className="mb-6">
        <Descriptions column={2} bordered>
          <Descriptions.Item label="總訂單數" span={1}>
            {customer.totalOrders}
          </Descriptions.Item>
          <Descriptions.Item label="完成訂單數" span={1}>
            {customer.completedOrders}
          </Descriptions.Item>
          <Descriptions.Item label="取消訂單數" span={1}>
            {customer.cancelledOrders}
          </Descriptions.Item>
          <Descriptions.Item label="總消費金額" span={1}>
            NT$ {customer.totalSpent?.toLocaleString() || 0}
          </Descriptions.Item>
          <Descriptions.Item label="VIP 等級" span={2}>
            <Tag color={vipConfig.color}>
              {vipConfig.icon} {vipConfig.text}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 最近訂單 */}
      <Card title="最近訂單" className="mb-6">
        {customer.recentBookings && customer.recentBookings.length > 0 ? (
          <Table
            dataSource={customer.recentBookings}
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


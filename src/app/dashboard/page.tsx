'use client';

import { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Button, DatePicker, Select } from 'antd';
import {
  CarOutlined,
  UserOutlined,
  DollarOutlined,
  TeamOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useRouter } from 'next/navigation';
import { ApiService } from '@/services/api';
import { DashboardStats, Booking } from '@/types';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

// 模擬數據
const mockRevenueData = [
  { date: '2024-01-01', revenue: 12000, bookings: 45 },
  { date: '2024-01-02', revenue: 15000, bookings: 52 },
  { date: '2024-01-03', revenue: 18000, bookings: 61 },
  { date: '2024-01-04', revenue: 14000, bookings: 48 },
  { date: '2024-01-05', revenue: 22000, bookings: 73 },
  { date: '2024-01-06', revenue: 25000, bookings: 82 },
  { date: '2024-01-07', revenue: 20000, bookings: 67 },
];

const mockVehicleTypeData = [
  { type: 'A型車', bookings: 120, revenue: 180000 },
  { type: 'B型車', bookings: 85, revenue: 127500 },
  { type: 'C型車', bookings: 65, revenue: 97500 },
  { type: 'D型車', bookings: 45, revenue: 67500 },
];

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(7, 'day'),
    dayjs(),
  ]);

  // 載入儀表板數據
  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // 並行載入數據
      const [statsResponse, bookingsResponse] = await Promise.all([
        ApiService.getDashboardStats(),
        ApiService.getBookings({ limit: 10, status: 'recent' }),
      ]);

      if (statsResponse.success) {
        setStats(statsResponse.data);
      }

      if (bookingsResponse.success) {
        setRecentBookings(bookingsResponse.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // 使用模擬數據作為後備
      setStats({
        totalBookings: 315,
        totalRevenue: 472500,
        activeDrivers: 28,
        activeCustomers: 156,
        todayBookings: 12,
        todayRevenue: 18000,
        completionRate: 94.5,
        averageRating: 4.7,
      });
    } finally {
      setLoading(false);
    }
  };

  // 訂單狀態標籤
  const getStatusTag = (status: string) => {
    const statusConfig = {
      pending: { color: 'orange', text: '待配對' },
      matched: { color: 'cyan', text: '已配對' },
      inProgress: { color: 'green', text: '進行中' },
      completed: { color: 'success', text: '已完成' },
      cancelled: { color: 'error', text: '已取消' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 最近訂單表格欄位
  const bookingColumns = [
    {
      title: '訂單編號',
      dataIndex: 'bookingNumber',
      key: 'bookingNumber',
      render: (text: string) => (
        <Button type="link" size="small">
          {text}
        </Button>
      ),
    },
    {
      title: '客戶',
      dataIndex: ['customer', 'name'],
      key: 'customer',
    },
    {
      title: '司機',
      dataIndex: ['driver', 'name'],
      key: 'driver',
      render: (text: string) => text || '未分配',
    },
    {
      title: '車型',
      dataIndex: 'vehicleType',
      key: 'vehicleType',
      render: (type: string) => `${type}型車`,
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: getStatusTag,
    },
    {
      title: '金額',
      dataIndex: ['pricing', 'totalAmount'],
      key: 'amount',
      render: (amount: number) => `NT$ ${amount?.toLocaleString()}`,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Booking) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => router.push(`/orders/${record.id}`)}
        >
          查看
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">儀表板</h1>
          <p className="text-gray-600">總覽系統運營狀況</p>
        </div>
        <div className="flex items-center space-x-4">
          <RangePicker
            value={dateRange}
            onChange={(dates) => dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
            format="YYYY-MM-DD"
          />
          <Button type="primary" onClick={loadDashboardData} loading={loading}>
            重新整理
          </Button>
        </div>
      </div>

      {/* 統計卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="總訂單數"
              value={stats?.totalBookings || 0}
              prefix={<CarOutlined />}
              suffix={
                <span className="text-sm text-green-500">
                  <ArrowUpOutlined /> +12%
                </span>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="總營收"
              value={stats?.totalRevenue || 0}
              prefix={<DollarOutlined />}
              precision={0}
              formatter={(value) => `NT$ ${value?.toLocaleString()}`}
              suffix={
                <span className="text-sm text-green-500">
                  <ArrowUpOutlined /> +8.5%
                </span>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="活躍司機"
              value={stats?.activeDrivers || 0}
              prefix={<TeamOutlined />}
              suffix={
                <span className="text-sm text-red-500">
                  <ArrowDownOutlined /> -2
                </span>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="活躍客戶"
              value={stats?.activeCustomers || 0}
              prefix={<UserOutlined />}
              suffix={
                <span className="text-sm text-green-500">
                  <ArrowUpOutlined /> +15%
                </span>
              }
            />
          </Card>
        </Col>
      </Row>

      {/* 圖表區域 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="營收趨勢" extra={<Button type="link">查看詳細報表</Button>}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockRevenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#1890ff" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="車型分布">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockVehicleTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="bookings" fill="#52c41a" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* 最近訂單 */}
      <Card
        title="最近訂單"
        extra={
          <Button type="primary" onClick={() => router.push('/orders')}>
            查看所有訂單
          </Button>
        }
      >
        <Table
          columns={bookingColumns}
          dataSource={recentBookings}
          rowKey="id"
          pagination={false}
          loading={loading}
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
}

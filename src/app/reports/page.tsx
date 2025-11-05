'use client';

import { useState } from 'react';
import { Card, Row, Col, Statistic, Button, DatePicker, Select, Space } from 'antd';
import {
  BarChartOutlined,
  DollarOutlined,
  CarOutlined,
  UserOutlined,
  TeamOutlined,
  TrophyOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

// 模擬數據
const revenueData = [
  { date: '01/01', revenue: 12000, orders: 45 },
  { date: '01/02', revenue: 15000, orders: 52 },
  { date: '01/03', revenue: 18000, orders: 61 },
  { date: '01/04', revenue: 14000, orders: 48 },
  { date: '01/05', revenue: 22000, orders: 73 },
  { date: '01/06', revenue: 25000, orders: 82 },
  { date: '01/07', revenue: 20000, orders: 67 },
];

const vehicleTypeData = [
  { type: 'A型車', orders: 120, revenue: 180000 },
  { type: 'B型車', orders: 85, revenue: 127500 },
  { type: 'C型車', orders: 65, revenue: 97500 },
  { type: 'D型車', orders: 45, revenue: 67500 },
];

const driverPerformanceData = [
  { name: '李大明', orders: 45, revenue: 67500, rating: 4.8 },
  { name: '王小華', orders: 38, revenue: 57000, rating: 4.6 },
  { name: '陳志強', orders: 42, revenue: 63000, rating: 4.7 },
  { name: '劉美玲', orders: 35, revenue: 52500, rating: 4.9 },
];

const customerSegmentData = [
  { name: '新客戶', value: 30, color: '#8884d8' },
  { name: '回頭客', value: 45, color: '#82ca9d' },
  { name: 'VIP客戶', value: 25, color: '#ffc658' },
];

export default function ReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(7, 'day'),
    dayjs(),
  ]);
  const [reportType, setReportType] = useState('overview');

  // 重新載入數據
  const handleReload = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <BarChartOutlined className="mr-2" />
            報表統計
          </h1>
          <p className="text-gray-600">查看業務數據分析和統計報表</p>
        </div>
        <div className="flex items-center space-x-4">
          <RangePicker
            value={dateRange}
            onChange={(dates) => dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
            format="YYYY-MM-DD"
          />
          <Select
            value={reportType}
            onChange={setReportType}
            style={{ width: 120 }}
          >
            <Option value="overview">總覽</Option>
            <Option value="revenue">營收</Option>
            <Option value="drivers">司機</Option>
            <Option value="customers">客戶</Option>
          </Select>
          <Button icon={<ReloadOutlined />} onClick={handleReload} loading={loading}>
            重新整理
          </Button>
        </div>
      </div>

      {/* 關鍵指標 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="總營收"
              value={472500}
              prefix={<DollarOutlined />}
              formatter={(value) => `NT$ ${value?.toLocaleString()}`}
              suffix={
                <span className="text-sm text-green-500">
                  <ArrowUpOutlined /> +12.5%
                </span>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="總訂單數"
              value={315}
              prefix={<CarOutlined />}
              suffix={
                <span className="text-sm text-green-500">
                  <ArrowUpOutlined /> +8.3%
                </span>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="活躍司機"
              value={28}
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
              value={156}
              prefix={<UserOutlined />}
              suffix={
                <span className="text-sm text-green-500">
                  <ArrowUpOutlined /> +15.2%
                </span>
              }
            />
          </Card>
        </Col>
      </Row>

      {/* 圖表區域 */}
      <Row gutter={[16, 16]}>
        {/* 營收趨勢 */}
        <Col xs={24} lg={16}>
          <Card 
            title="營收趨勢" 
            extra={
              <Button type="link" onClick={() => router.push('/reports/revenue')}>
                查看詳細報表
              </Button>
            }
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'revenue' ? `NT$ ${value?.toLocaleString()}` : value,
                    name === 'revenue' ? '營收' : '訂單數'
                  ]}
                />
                <Line type="monotone" dataKey="revenue" stroke="#1890ff" strokeWidth={2} />
                <Line type="monotone" dataKey="orders" stroke="#52c41a" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* 客戶分布 */}
        <Col xs={24} lg={8}>
          <Card 
            title="客戶分布" 
            extra={
              <Button type="link" onClick={() => router.push('/reports/customers')}>
                查看詳細
              </Button>
            }
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={customerSegmentData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {customerSegmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* 車型分析 */}
        <Col xs={24} lg={12}>
          <Card title="車型訂單分析">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={vehicleTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="orders" fill="#52c41a" name="訂單數" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* 司機績效 */}
        <Col xs={24} lg={12}>
          <Card 
            title="司機績效排行" 
            extra={
              <Button type="link" onClick={() => router.push('/reports/drivers')}>
                查看完整排行
              </Button>
            }
          >
            <div className="space-y-4">
              {driverPerformanceData.map((driver, index) => (
                <div key={driver.name} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{driver.name}</div>
                      <div className="text-sm text-gray-500">
                        {driver.orders} 趟 • 評分 {driver.rating}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">NT$ {driver.revenue.toLocaleString()}</div>
                    <div className="text-sm text-gray-500">營收</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 快速操作 */}
      <Card title="快速操作">
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Button 
              type="primary" 
              block 
              icon={<DollarOutlined />}
              onClick={() => router.push('/reports/revenue')}
            >
              營收分析報表
            </Button>
          </Col>
          <Col xs={24} sm={8}>
            <Button 
              block 
              icon={<TeamOutlined />}
              onClick={() => router.push('/reports/drivers')}
            >
              司機績效報表
            </Button>
          </Col>
          <Col xs={24} sm={8}>
            <Button 
              block 
              icon={<UserOutlined />}
              onClick={() => router.push('/reports/customers')}
            >
              客戶統計報表
            </Button>
          </Col>
        </Row>
      </Card>
    </div>
  );
}

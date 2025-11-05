'use client';

import { useState, useEffect } from 'react';
import { Card, Button, DatePicker, Row, Col, Statistic, Spin, Alert, Table } from 'antd';
import {
  DollarOutlined,
  ReloadOutlined,
  RiseOutlined,
  ShoppingOutlined,
  TeamOutlined,
  PercentageOutlined,
} from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import dayjs, { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

interface DailySummary {
  date: string;
  totalRevenue: number;
  driverEarnings: number;
  platformFee: number;
  orders: number;
  driversCount: number;
}

interface SummaryData {
  totalRevenue: number;
  driverEarnings: number;
  platformFee: number;
  totalOrders: number;
  activeDrivers: number;
  averageOrderValue: number;
  dailySummary: DailySummary[];
}

export default function RevenueReportsPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ]);

  // 獲取收入摘要資料
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');

      const response = await fetch(
        `/api/admin/earnings/summary?startDate=${startDate}&endDate=${endDate}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '獲取資料失敗');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      console.error('❌ 獲取收入摘要失敗:', err);
      setError(err instanceof Error ? err.message : '未知錯誤');
    } finally {
      setLoading(false);
    }
  };

  // 初始載入
  useEffect(() => {
    fetchData();
  }, []);

  // 處理日期範圍變更
  const handleDateRangeChange = (dates: any) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange([dates[0], dates[1]]);
    }
  };

  // 格式化貨幣
  const formatCurrency = (value: number) => {
    return `NT$ ${value.toLocaleString('zh-TW', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // 準備圖表資料
  const chartData = data?.dailySummary.map((day) => ({
    date: dayjs(day.date).format('MM/DD'),
    總營收: day.totalRevenue,
    司機收入: day.driverEarnings,
    平台抽成: day.platformFee,
  })) || [];

  // 表格欄位
  const columns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '總營收',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      render: (value: number) => formatCurrency(value),
      sorter: (a: DailySummary, b: DailySummary) => a.totalRevenue - b.totalRevenue,
    },
    {
      title: '司機收入',
      dataIndex: 'driverEarnings',
      key: 'driverEarnings',
      render: (value: number) => formatCurrency(value),
      sorter: (a: DailySummary, b: DailySummary) => a.driverEarnings - b.driverEarnings,
    },
    {
      title: '平台抽成',
      dataIndex: 'platformFee',
      key: 'platformFee',
      render: (value: number) => formatCurrency(value),
      sorter: (a: DailySummary, b: DailySummary) => a.platformFee - b.platformFee,
    },
    {
      title: '訂單數',
      dataIndex: 'orders',
      key: 'orders',
      sorter: (a: DailySummary, b: DailySummary) => a.orders - b.orders,
    },
    {
      title: '活躍司機',
      dataIndex: 'driversCount',
      key: 'driversCount',
      sorter: (a: DailySummary, b: DailySummary) => a.driversCount - b.driversCount,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 標題列 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <DollarOutlined className="mr-2" />
            營收分析
          </h1>
          <p className="text-gray-600">詳細的營收數據分析</p>
        </div>
        <div className="flex gap-2">
          <RangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            format="YYYY-MM-DD"
            allowClear={false}
          />
          <Button icon={<ReloadOutlined />} loading={loading} onClick={fetchData}>
            重新整理
          </Button>
        </div>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <Alert
          message="載入失敗"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
        />
      )}

      {/* 載入中 */}
      {loading && !data && (
        <Card>
          <div className="text-center py-12">
            <Spin size="large" />
            <p className="mt-4 text-gray-500">載入中...</p>
          </div>
        </Card>
      )}

      {/* 統計卡片 */}
      {data && (
        <>
          <Row gutter={16}>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="總營收"
                  value={data.totalRevenue}
                  precision={0}
                  prefix={<DollarOutlined />}
                  suffix="NT$"
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="司機收入"
                  value={data.driverEarnings}
                  precision={0}
                  prefix={<TeamOutlined />}
                  suffix="NT$"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="平台抽成"
                  value={data.platformFee}
                  precision={0}
                  prefix={<PercentageOutlined />}
                  suffix="NT$"
                  valueStyle={{ color: '#cf1322' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="訂單數"
                  value={data.totalOrders}
                  prefix={<ShoppingOutlined />}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Card>
                <Statistic
                  title="活躍司機數"
                  value={data.activeDrivers}
                  prefix={<TeamOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card>
                <Statistic
                  title="平均訂單金額"
                  value={data.averageOrderValue}
                  precision={0}
                  prefix={<RiseOutlined />}
                  suffix="NT$"
                />
              </Card>
            </Col>
          </Row>

          {/* 收入趨勢圖 */}
          <Card title="收入趨勢" loading={loading}>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="總營收" stroke="#3f8600" strokeWidth={2} />
                <Line type="monotone" dataKey="司機收入" stroke="#1890ff" strokeWidth={2} />
                <Line type="monotone" dataKey="平台抽成" stroke="#cf1322" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* 每日明細表格 */}
          <Card title="每日明細" loading={loading}>
            <Table
              columns={columns}
              dataSource={data.dailySummary}
              rowKey="date"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  Button,
  DatePicker,
  Table,
  Spin,
  Alert,
  Select,
  Row,
  Col,
  Statistic,
  Tag,
} from 'antd';
import {
  DollarOutlined,
  ReloadOutlined,
  TrophyOutlined,
  TeamOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface DriverEarning {
  driverId: string;
  driverName: string;
  driverEmail: string;
  totalEarnings: number;
  totalOrders: number;
  averageEarnings: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Summary {
  totalEarnings: number;
  totalOrders: number;
  averageEarnings: number;
  activeDrivers: number;
}

interface DriversData {
  drivers: DriverEarning[];
  pagination: Pagination;
  summary: Summary;
}

export default function EarningsReportsPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DriversData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState('earnings');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 獲取司機收入資料
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');

      const response = await fetch(
        `/api/admin/earnings/drivers?startDate=${startDate}&endDate=${endDate}&page=${currentPage}&limit=${pageSize}&sortBy=${sortBy}&sortOrder=${sortOrder}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '獲取資料失敗');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      console.error('❌ 獲取司機收入失敗:', err);
      setError(err instanceof Error ? err.message : '未知錯誤');
    } finally {
      setLoading(false);
    }
  };

  // 初始載入
  useEffect(() => {
    fetchData();
  }, [currentPage, pageSize, sortBy, sortOrder]);

  // 處理日期範圍變更
  const handleDateRangeChange = (dates: any) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange([dates[0], dates[1]]);
    }
  };

  // 格式化貨幣
  const formatCurrency = (value: number) => {
    return `NT$ ${value.toLocaleString('zh-TW', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  // 表格欄位
  const columns = [
    {
      title: '排名',
      key: 'rank',
      width: 80,
      render: (_: any, __: any, index: number) => {
        const rank = (currentPage - 1) * pageSize + index + 1;
        if (rank === 1) return <Tag color="gold"><TrophyOutlined /> 第 1 名</Tag>;
        if (rank === 2) return <Tag color="silver"><TrophyOutlined /> 第 2 名</Tag>;
        if (rank === 3) return <Tag color="bronze"><TrophyOutlined /> 第 3 名</Tag>;
        return <span className="text-gray-500">第 {rank} 名</span>;
      },
    },
    {
      title: '司機姓名',
      dataIndex: 'driverName',
      key: 'driverName',
    },
    {
      title: 'Email',
      dataIndex: 'driverEmail',
      key: 'driverEmail',
    },
    {
      title: '總收入',
      dataIndex: 'totalEarnings',
      key: 'totalEarnings',
      render: (value: number) => (
        <span className="font-semibold text-green-600">{formatCurrency(value)}</span>
      ),
      sorter: true,
    },
    {
      title: '訂單數',
      dataIndex: 'totalOrders',
      key: 'totalOrders',
      sorter: true,
    },
    {
      title: '平均收入',
      dataIndex: 'averageEarnings',
      key: 'averageEarnings',
      render: (value: number) => formatCurrency(value),
      sorter: true,
    },
  ];

  // 處理表格變更
  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    if (pagination.current !== currentPage) {
      setCurrentPage(pagination.current);
    }
    if (pagination.pageSize !== pageSize) {
      setPageSize(pagination.pageSize);
      setCurrentPage(1);
    }
    if (sorter.field) {
      const fieldMap: Record<string, string> = {
        totalEarnings: 'earnings',
        totalOrders: 'orders',
        averageEarnings: 'average',
      };
      setSortBy(fieldMap[sorter.field] || 'earnings');
      setSortOrder(sorter.order === 'ascend' ? 'asc' : 'desc');
    }
  };

  return (
    <div className="space-y-6">
      {/* 標題列 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <TeamOutlined className="mr-2" />
            司機收入統計
          </h1>
          <p className="text-gray-600">查看所有司機的收入統計資料</p>
        </div>
        <div className="flex gap-2">
          <RangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            format="YYYY-MM-DD"
            allowClear={false}
          />
          <Button icon={<ReloadOutlined />} loading={loading} onClick={fetchData}>
            查詢
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

      {/* 統計摘要 */}
      {data && (
        <>
          <Row gutter={16}>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="總收入"
                  value={data.summary.totalEarnings}
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
                  title="總訂單數"
                  value={data.summary.totalOrders}
                  prefix={<RiseOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="平均收入"
                  value={data.summary.averageEarnings}
                  precision={0}
                  prefix={<DollarOutlined />}
                  suffix="NT$"
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="活躍司機數"
                  value={data.summary.activeDrivers}
                  prefix={<TeamOutlined />}
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Card>
            </Col>
          </Row>

          {/* 司機收入表格 */}
          <Card title="司機收入明細" loading={loading}>
            <Table
              columns={columns}
              dataSource={data.drivers}
              rowKey="driverId"
              pagination={{
                current: currentPage,
                pageSize: pageSize,
                total: data.pagination.total,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 位司機`,
              }}
              onChange={handleTableChange}
              loading={loading}
            />
          </Card>
        </>
      )}
    </div>
  );
}


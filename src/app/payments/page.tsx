'use client';

import { useState } from 'react';
import { Card, Table, Button, Tag, Input, Select, Row, Col, Statistic, Space, Tooltip, DatePicker } from 'antd';
import {
  CreditCardOutlined,
  SearchOutlined,
  EyeOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

// 模擬支付數據
const mockPayments = [
  {
    id: '1',
    transactionId: 'TXN20240101001',
    orderId: 'BK20240101001',
    customerName: '張先生',
    amount: 1200,
    type: 'deposit',
    method: 'credit_card',
    status: 'completed',
    createdAt: '2024-01-01 08:30',
    completedAt: '2024-01-01 08:31',
    description: '訂金支付',
  },
  {
    id: '2',
    transactionId: 'TXN20240101002',
    orderId: 'BK20240101002',
    customerName: '王小姐',
    amount: 2500,
    type: 'full_payment',
    method: 'bank_transfer',
    status: 'pending',
    createdAt: '2024-01-01 14:15',
    completedAt: null,
    description: '全額支付',
  },
  {
    id: '3',
    transactionId: 'TXN20240101003',
    orderId: 'BK20240101003',
    customerName: '陳先生',
    amount: 800,
    type: 'balance',
    method: 'cash',
    status: 'completed',
    createdAt: '2024-01-01 16:45',
    completedAt: '2024-01-01 16:45',
    description: '尾款支付',
  },
  {
    id: '4',
    transactionId: 'TXN20240101004',
    orderId: 'BK20240101004',
    customerName: '李小姐',
    amount: 500,
    type: 'refund',
    method: 'credit_card',
    status: 'failed',
    createdAt: '2024-01-01 18:20',
    completedAt: null,
    description: '退款處理',
  },
];

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState(mockPayments);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  // 支付狀態配置
  const statusConfig = {
    pending: { color: 'warning', text: '處理中', icon: <ClockCircleOutlined /> },
    completed: { color: 'success', text: '已完成', icon: <CheckCircleOutlined /> },
    failed: { color: 'error', text: '失敗', icon: <ExclamationCircleOutlined /> },
    cancelled: { color: 'default', text: '已取消', icon: <ExclamationCircleOutlined /> },
  };

  // 支付類型配置
  const typeConfig = {
    deposit: { color: 'blue', text: '訂金' },
    balance: { color: 'green', text: '尾款' },
    full_payment: { color: 'purple', text: '全額' },
    refund: { color: 'orange', text: '退款' },
  };

  // 支付方式配置
  const methodConfig = {
    credit_card: '信用卡',
    bank_transfer: '銀行轉帳',
    cash: '現金',
    digital_wallet: '數位錢包',
  };

  // 獲取狀態標籤
  const getStatusTag = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status, icon: null };
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  // 獲取類型標籤
  const getTypeTag = (type: string) => {
    const config = typeConfig[type as keyof typeof typeConfig] || { color: 'default', text: type };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 表格欄位
  const columns = [
    {
      title: '交易編號',
      dataIndex: 'transactionId',
      key: 'transactionId',
      render: (text: string, record: any) => (
        <Button type="link" onClick={() => router.push(`/payments/${record.id}`)}>
          {text}
        </Button>
      ),
    },
    {
      title: '訂單編號',
      dataIndex: 'orderId',
      key: 'orderId',
      render: (text: string) => (
        <Button type="link" onClick={() => router.push(`/orders/${text}`)}>
          {text}
        </Button>
      ),
    },
    {
      title: '客戶',
      dataIndex: 'customerName',
      key: 'customerName',
    },
    {
      title: '金額',
      key: 'amount',
      render: (_, record: any) => (
        <div className="font-medium">
          NT$ {record.amount.toLocaleString()}
        </div>
      ),
    },
    {
      title: '類型',
      dataIndex: 'type',
      key: 'type',
      render: getTypeTag,
    },
    {
      title: '支付方式',
      dataIndex: 'method',
      key: 'method',
      render: (method: string) => methodConfig[method as keyof typeof methodConfig] || method,
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: getStatusTag,
    },
    {
      title: '建立時間',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (time: string) => dayjs(time).format('MM/DD HH:mm'),
    },
    {
      title: '完成時間',
      dataIndex: 'completedAt',
      key: 'completedAt',
      render: (time: string | null) => time ? dayjs(time).format('MM/DD HH:mm') : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: any) => (
        <Space>
          <Tooltip title="查看詳情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => router.push(`/payments/${record.id}`)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 統計數據
  const stats = {
    total: payments.length,
    completed: payments.filter(p => p.status === 'completed').length,
    pending: payments.filter(p => p.status === 'pending').length,
    totalAmount: payments
      .filter(p => p.status === 'completed' && p.type !== 'refund')
      .reduce((sum, p) => sum + p.amount, 0),
  };

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
            <CreditCardOutlined className="mr-2" />
            支付管理
          </h1>
          <p className="text-gray-600">管理所有支付交易</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button icon={<ReloadOutlined />} onClick={handleReload} loading={loading}>
            重新整理
          </Button>
        </div>
      </div>

      {/* 統計卡片 */}
      <Row gutter={16}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic title="總交易數" value={stats.total} prefix={<CreditCardOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic title="已完成" value={stats.completed} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic title="處理中" value={stats.pending} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic 
              title="總收入" 
              value={stats.totalAmount} 
              formatter={(value) => `NT$ ${value?.toLocaleString()}`}
              valueStyle={{ color: '#1890ff' }} 
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 搜尋和篩選 */}
      <Card>
        <Row gutter={16} className="mb-4">
          <Col xs={24} sm={8}>
            <Search
              placeholder="搜尋交易編號、訂單編號、客戶"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={(value) => console.log('搜尋:', value)}
              enterButton={<SearchOutlined />}
            />
          </Col>
          <Col xs={24} sm={4}>
            <Select
              placeholder="支付狀態"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
            >
              <Option value="all">全部狀態</Option>
              <Option value="pending">處理中</Option>
              <Option value="completed">已完成</Option>
              <Option value="failed">失敗</Option>
              <Option value="cancelled">已取消</Option>
            </Select>
          </Col>
          <Col xs={24} sm={4}>
            <Select
              placeholder="支付類型"
              value={typeFilter}
              onChange={setTypeFilter}
              style={{ width: '100%' }}
            >
              <Option value="all">全部類型</Option>
              <Option value="deposit">訂金</Option>
              <Option value="balance">尾款</Option>
              <Option value="full_payment">全額</Option>
              <Option value="refund">退款</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8}>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder={['開始日期', '結束日期']}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>

        {/* 支付表格 */}
        <Table
          columns={columns}
          dataSource={payments}
          rowKey="id"
          loading={loading}
          pagination={{
            total: payments.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 項，共 ${total} 項`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
}

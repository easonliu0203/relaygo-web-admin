'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, Input, Select, Row, Col, Statistic, Space, Avatar, Tooltip, message } from 'antd';
import {
  UserOutlined,
  SearchOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  PhoneOutlined,
  MailOutlined,
  CalendarOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { ApiService } from '@/services/api';

const { Search } = Input;
const { Option } = Select;

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vipFilter, setVipFilter] = useState('all');

  // 載入客戶資料
  const loadCustomers = async () => {
    setLoading(true);
    try {
      const params: any = {
        limit: 100,
        offset: 0,
      };

      // 狀態篩選
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }

      // 搜尋
      if (searchText) {
        params.search = searchText;
      }

      console.log('📋 載入客戶，參數:', params);

      const response = await ApiService.getCustomers(params);

      if (response.success) {
        setCustomers(response.data || []);
        setTotal(response.total || 0);
        console.log(`✅ 成功載入 ${response.data?.length || 0} 位客戶`);
      } else {
        throw new Error(response.message || '載入客戶失敗');
      }
    } catch (error) {
      console.error('❌ 載入客戶失敗:', error);
      message.error('載入客戶失敗');
    } finally {
      setLoading(false);
    }
  };

  // 初始載入
  useEffect(() => {
    loadCustomers();
  }, []);

  // 當篩選條件改變時重新載入
  useEffect(() => {
    loadCustomers();
  }, [statusFilter]);

  // 客戶狀態配置
  const statusConfig = {
    active: { color: 'success', text: '活躍' },
    inactive: { color: 'default', text: '非活躍' },
    blocked: { color: 'error', text: '已封鎖' },
  };

  // VIP 等級配置
  const vipConfig = {
    bronze: { color: '#cd7f32', text: '銅牌' },
    silver: { color: '#c0c0c0', text: '銀牌' },
    gold: { color: '#ffd700', text: '金牌' },
    platinum: { color: '#e5e4e2', text: '白金' },
  };

  // 獲取狀態標籤
  const getStatusTag = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 獲取 VIP 標籤
  const getVipTag = (level: string) => {
    const config = vipConfig[level as keyof typeof vipConfig] || { color: 'default', text: level };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 表格欄位
  const columns = [
    {
      title: '客戶資訊',
      key: 'customer',
      render: (_: any, record: any) => (
        <div className="flex items-center space-x-3">
          <Avatar size={40} src={record.avatar}>
            {record.name.charAt(0)}
          </Avatar>
          <div>
            <div className="font-medium">{record.name}</div>
            <div className="text-gray-500 text-sm flex items-center">
              <PhoneOutlined className="mr-1" />
              {record.phone}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '聯絡方式',
      key: 'contact',
      render: (_: any, record: any) => (
        <div>
          <div className="flex items-center text-sm">
            <MailOutlined className="mr-1" />
            {record.email}
          </div>
        </div>
      ),
    },
    {
      title: 'VIP等級',
      dataIndex: 'vipLevel',
      key: 'vipLevel',
      render: getVipTag,
    },
    {
      title: '訂單統計',
      key: 'orders',
      render: (_: any, record: any) => (
        <div className="text-center">
          <div className="font-medium">{record.totalOrders}</div>
          <div className="text-gray-500 text-xs">筆訂單</div>
        </div>
      ),
    },
    {
      title: '消費金額',
      key: 'spent',
      render: (_: any, record: any) => (
        <div className="text-center">
          <div className="font-medium">NT$ {record.totalSpent.toLocaleString()}</div>
          <div className="text-gray-500 text-xs">總消費</div>
        </div>
      ),
    },
    {
      title: '最後訂單',
      dataIndex: 'lastOrderDate',
      key: 'lastOrderDate',
      render: (date: string) => (
        <div className="flex items-center text-sm">
          <CalendarOutlined className="mr-1" />
          {dayjs(date).format('YYYY/MM/DD')}
        </div>
      ),
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: getStatusTag,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title="查看詳情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => router.push(`/customers/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="編輯客戶">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => router.push(`/customers/${record.id}/edit`)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 過濾客戶（VIP 等級篩選在前端進行）
  const filteredCustomers = vipFilter === 'all'
    ? customers
    : customers.filter(c => c.vipLevel === vipFilter);

  // 統計數據
  const stats = {
    total: filteredCustomers.length,
    active: filteredCustomers.filter(c => c.status === 'active').length,
    inactive: filteredCustomers.filter(c => c.status === 'inactive').length,
    totalRevenue: filteredCustomers.reduce((sum, c) => sum + (c.totalSpent || 0), 0),
  };

  // 重新載入數據
  const handleReload = () => {
    loadCustomers();
  };

  // 處理搜尋
  const handleSearch = (value: string) => {
    setSearchText(value);
    loadCustomers();
  };

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <UserOutlined className="mr-2" />
            客戶管理
          </h1>
          <p className="text-gray-600">管理所有註冊客戶</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button icon={<ReloadOutlined />} onClick={handleReload} loading={loading}>
            重新整理
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/customers/create')}>
            新增客戶
          </Button>
        </div>
      </div>

      {/* 統計卡片 */}
      <Row gutter={16}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic title="總客戶數" value={stats.total} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic title="活躍客戶" value={stats.active} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic title="非活躍客戶" value={stats.inactive} valueStyle={{ color: '#8c8c8c' }} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic 
              title="總營收" 
              value={stats.totalRevenue} 
              formatter={(value) => `NT$ ${value?.toLocaleString()}`}
              valueStyle={{ color: '#1890ff' }} 
            />
          </Card>
        </Col>
      </Row>

      {/* 搜尋和篩選 */}
      <Card>
        <Row gutter={16} className="mb-4">
          <Col xs={24} sm={10}>
            <Search
              placeholder="搜尋客戶姓名、電話、信箱"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={handleSearch}
              enterButton={<SearchOutlined />}
            />
          </Col>
          <Col xs={24} sm={6}>
            <Select
              placeholder="客戶狀態"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
            >
              <Option value="all">全部狀態</Option>
              <Option value="active">活躍</Option>
              <Option value="inactive">非活躍</Option>
              <Option value="blocked">已封鎖</Option>
            </Select>
          </Col>
          <Col xs={24} sm={6}>
            <Select
              placeholder="VIP等級"
              value={vipFilter}
              onChange={setVipFilter}
              style={{ width: '100%' }}
            >
              <Option value="all">全部等級</Option>
              <Option value="bronze">銅牌</Option>
              <Option value="silver">銀牌</Option>
              <Option value="gold">金牌</Option>
              <Option value="platinum">白金</Option>
            </Select>
          </Col>
        </Row>

        {/* 客戶表格 */}
        <Table
          columns={columns}
          dataSource={filteredCustomers}
          rowKey="id"
          loading={loading}
          pagination={{
            total: filteredCustomers.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 項，共 ${total} 項`,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>
    </div>
  );
}

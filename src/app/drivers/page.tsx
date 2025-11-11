'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, Input, Select, Row, Col, Statistic, Space, Avatar, Tooltip, Rate, message } from 'antd';
import {
  TeamOutlined,
  SearchOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  PhoneOutlined,
  CarOutlined,
  StarOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { ApiService } from '@/services/api';

const { Search } = Input;
const { Option } = Select;

export default function DriversPage() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all');

  // 載入司機資料
  const loadDrivers = async () => {
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

      // 車型篩選
      if (vehicleTypeFilter && vehicleTypeFilter !== 'all') {
        params.vehicleType = vehicleTypeFilter;
      }

      // 搜尋
      if (searchText) {
        params.search = searchText;
      }

      console.log('📋 載入司機，參數:', params);

      const response = await ApiService.getDrivers(params);

      if (response.success) {
        setDrivers(response.data || []);
        setTotal(response.total || 0);
        console.log(`✅ 成功載入 ${response.data?.length || 0} 位司機`);
      } else {
        throw new Error(response.message || '載入司機失敗');
      }
    } catch (error) {
      console.error('❌ 載入司機失敗:', error);
      message.error('載入司機失敗');
    } finally {
      setLoading(false);
    }
  };

  // 初始載入
  useEffect(() => {
    loadDrivers();
  }, []);

  // 當篩選條件改變時重新載入
  useEffect(() => {
    loadDrivers();
  }, [statusFilter, vehicleTypeFilter]);

  // 司機狀態配置
  const statusConfig = {
    active: { color: 'success', text: '活躍' },
    inactive: { color: 'default', text: '離線' },
    pending: { color: 'warning', text: '待審核' },
    suspended: { color: 'error', text: '停權' },
  };

  // 獲取狀態標籤
  const getStatusTag = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 車型對應
  const vehicleTypeMap = {
    A: '豪華9人座',
    B: '標準8人座',
    C: '舒適4人座',
    D: '經濟3人座',
  };

  // 表格欄位
  const columns = [
    {
      title: '司機資訊',
      key: 'driver',
      render: (_, record: any) => (
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
      title: '駕照號碼',
      dataIndex: 'licenseNumber',
      key: 'licenseNumber',
    },
    {
      title: '車輛資訊',
      key: 'vehicle',
      render: (_, record: any) => (
        <div>
          <div className="flex items-center">
            <CarOutlined className="mr-1" />
            {vehicleTypeMap[record.vehicleType as keyof typeof vehicleTypeMap]}
          </div>
          <div className="text-gray-500 text-sm">{record.vehiclePlate}</div>
        </div>
      ),
    },
    {
      title: '評分',
      key: 'rating',
      render: (_, record: any) => (
        <div className="flex items-center space-x-2">
          <Rate disabled defaultValue={record.rating} allowHalf />
          <span className="text-sm text-gray-500">({record.rating})</span>
        </div>
      ),
    },
    {
      title: '完成趟次',
      dataIndex: 'totalTrips',
      key: 'totalTrips',
      render: (trips: number) => (
        <div className="text-center">
          <div className="font-medium">{trips}</div>
          <div className="text-gray-500 text-xs">趟</div>
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
      title: '所在地',
      dataIndex: 'location',
      key: 'location',
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
              onClick={() => router.push(`/drivers/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="編輯司機">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => router.push(`/drivers/${record.id}/edit`)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 統計數據
  const stats = {
    total: drivers.length,
    active: drivers.filter(d => d.status === 'active').length,
    pending: drivers.filter(d => d.driverStatus === 'pending').length,
    inactive: drivers.filter(d => d.status === 'inactive').length,
  };

  // 重新載入數據
  const handleReload = () => {
    loadDrivers();
  };

  // 處理搜尋
  const handleSearch = (value: string) => {
    setSearchText(value);
    loadDrivers();
  };

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <TeamOutlined className="mr-2" />
            司機管理
          </h1>
          <p className="text-gray-600">管理所有註冊司機</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button icon={<ReloadOutlined />} onClick={handleReload} loading={loading}>
            重新整理
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/drivers/create')}>
            新增司機
          </Button>
        </div>
      </div>

      {/* 統計卡片 */}
      <Row gutter={16}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic title="總司機數" value={stats.total} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic title="活躍司機" value={stats.active} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic title="待審核" value={stats.pending} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic title="離線司機" value={stats.inactive} valueStyle={{ color: '#8c8c8c' }} />
          </Card>
        </Col>
      </Row>

      {/* 搜尋和篩選 */}
      <Card>
        <Row gutter={16} className="mb-4">
          <Col xs={24} sm={12}>
            <Search
              placeholder="搜尋司機姓名、電話、車牌號碼"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={handleSearch}
              enterButton={<SearchOutlined />}
            />
          </Col>
          <Col xs={24} sm={6}>
            <Select
              placeholder="司機狀態"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
            >
              <Option value="all">全部狀態</Option>
              <Option value="active">活躍</Option>
              <Option value="pending">待審核</Option>
              <Option value="inactive">離線</Option>
              <Option value="suspended">停權</Option>
            </Select>
          </Col>
          <Col xs={24} sm={6}>
            <Select
              placeholder="車型篩選"
              value={vehicleTypeFilter}
              onChange={setVehicleTypeFilter}
              style={{ width: '100%' }}
            >
              <Option value="all">全部車型</Option>
              <Option value="A">豪華9人座</Option>
              <Option value="B">標準8人座</Option>
              <Option value="C">舒適4人座</Option>
              <Option value="D">經濟3人座</Option>
            </Select>
          </Col>
        </Row>

        {/* 司機表格 */}
        <Table
          columns={columns}
          dataSource={drivers}
          rowKey="id"
          loading={loading}
          pagination={{
            total: drivers.length,
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

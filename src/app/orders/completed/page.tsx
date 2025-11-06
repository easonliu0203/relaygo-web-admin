'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, Input, Row, Col, Statistic, Space, Tooltip, message } from 'antd';
import {
  CheckCircleOutlined,
  SearchOutlined,
  EyeOutlined,
  ReloadOutlined,
  WifiOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { ApiService } from '@/services/api';
import { useRealtimeBookings } from '@/hooks/useRealtimeBookings';

const { Search } = Input;

export default function CompletedOrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [searchText, setSearchText] = useState('');

  // 使用 Realtime Hook（即時監聽訂單變更）
  const { bookings: allBookings, setBookings: setAllBookings, isConnected } = useRealtimeBookings([]);

  // 過濾出已完成訂單
  const orders = allBookings.filter(booking => booking.status === 'completed');

  // 載入已完成訂單
  const loadOrders = async () => {
    setLoading(true);
    try {
      const params: any = {
        status: 'completed',
        limit: 100,
        offset: 0,
      };

      if (searchText) {
        params.search = searchText;
      }

      const response = await ApiService.getBookings(params);

      if (response.success) {
        setAllBookings(response.data || []); // 設置初始數據
        setTotal(response.total || 0);
      } else {
        throw new Error(response.message || '載入訂單失敗');
      }
    } catch (error: any) {
      console.error('❌ 載入已完成訂單失敗:', error);
      message.error(error.message || '載入訂單失敗');
      setAllBookings([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders(); // 只在頁面載入時執行一次，之後由 Realtime 自動更新
  }, []);

  const handleSearch = (value: string) => {
    setSearchText(value);
    loadOrders();
  };

  const vehicleTypeMap = {
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
        const dateTimeStr = `${date} ${time}`;
        return dayjs(dateTimeStr).format('YYYY-MM-DD HH:mm');
      }
      return dayjs(date).format('YYYY-MM-DD');
    } catch (error) {
      console.error('日期格式化錯誤:', error);
      return '-';
    }
  };

  const columns = [
    {
      title: '訂單編號',
      dataIndex: 'bookingNumber',
      key: 'bookingNumber',
      width: 140,
      render: (text: string, record: any) => (
        <Button type="link" onClick={() => router.push(`/orders/${record.id}`)}>
          {text}
        </Button>
      ),
    },
    {
      title: '客戶資訊',
      key: 'customer',
      width: 150,
      render: (_: any, record: any) => (
        <div>
          <div>{record.customer?.name || '未知客戶'}</div>
          <div className="text-gray-500 text-sm">{record.customer?.phone || '無電話'}</div>
        </div>
      ),
    },
    {
      title: '司機',
      key: 'driver',
      width: 150,
      render: (_: any, record: any) => (
        record.driver ? (
          <div>
            <div>{record.driver.name}</div>
            <div className="text-gray-500 text-sm">{record.driver.phone}</div>
          </div>
        ) : (
          <span className="text-gray-400">未分配</span>
        )
      ),
    },
    {
      title: '車型',
      dataIndex: 'vehicleType',
      key: 'vehicleType',
      width: 120,
      render: (type: string) => vehicleTypeMap[type as keyof typeof vehicleTypeMap] || type,
    },
    {
      title: '路線',
      key: 'route',
      width: 200,
      render: (_: any, record: any) => (
        <div className="text-sm">
          <div>起：{record.pickupLocation || '-'}</div>
          <div>迄：{record.dropoffLocation || '-'}</div>
        </div>
      ),
    },
    {
      title: '建立時間',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      sorter: (a: any, b: any) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
      render: (createdAt: string) => {
        if (!createdAt) return '-';
        try {
          return dayjs(createdAt).format('YYYY-MM-DD HH:mm');
        } catch (error) {
          console.error('建立時間格式化錯誤:', error);
          return '-';
        }
      },
    },
    {
      title: '預約時間',
      key: 'scheduledDateTime',
      width: 150,
      sorter: (a: any, b: any) => {
        const dateA = `${a.scheduledDate} ${a.scheduledTime || '00:00'}`;
        const dateB = `${b.scheduledDate} ${b.scheduledTime || '00:00'}`;
        return dayjs(dateA).unix() - dayjs(dateB).unix();
      },
      render: (_: any, record: any) => formatDateTime(record.scheduledDate, record.scheduledTime),
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: () => <Tag color="success">已完成</Tag>,
    },
    {
      title: '完成時間',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 150,
      sorter: (a: any, b: any) => dayjs(a.updatedAt).unix() - dayjs(b.updatedAt).unix(),
      render: (time: string) => {
        if (!time) return '-';
        try {
          return dayjs(time).format('YYYY-MM-DD HH:mm');
        } catch (error) {
          console.error('完成時間格式化錯誤:', error);
          return '-';
        }
      },
    },
    {
      title: '金額',
      key: 'amount',
      width: 120,
      render: (_: any, record: any) => `NT$ ${record.pricing?.totalAmount?.toLocaleString() || 0}`,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title="查看詳情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => router.push(`/orders/${record.id}`)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <CheckCircleOutlined className="mr-2" />
            已完成訂單
          </h1>
          <p className="text-gray-600">
            所有已完成的訂單記錄
            {isConnected && (
              <Tag color="green" className="ml-2">
                <WifiOutlined /> 即時連接已啟用
              </Tag>
            )}
            {!isConnected && (
              <Tag color="orange" className="ml-2">
                <WifiOutlined /> 連接中...
              </Tag>
            )}
          </p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={loadOrders} loading={loading}>
          重新整理
        </Button>
      </div>

      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic title="已完成訂單" value={total} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="總營收"
              value={orders.reduce((sum, o) => sum + (o.pricing?.totalAmount || 0), 0)}
              prefix="NT$"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Row gutter={16} className="mb-4">
          <Col xs={24} sm={12}>
            <Search
              placeholder="搜尋訂單編號"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={handleSearch}
              enterButton={<SearchOutlined />}
              allowClear
            />
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={orders}
          rowKey="id"
          loading={loading}
          pagination={{
            total: total,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 項，共 ${total} 項`,
          }}
          scroll={{ x: 1200 }}
          locale={{
            emptyText: loading ? '載入中...' : '暫無已完成訂單',
          }}
        />
      </Card>
    </div>
  );
}

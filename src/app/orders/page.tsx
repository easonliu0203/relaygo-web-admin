'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, Input, Select, DatePicker, Row, Col, Statistic, Space, Tooltip, message, Modal } from 'antd';
import {
  CarOutlined,
  SearchOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  FilterOutlined,
  ReloadOutlined,
  SwapOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { ApiService } from '@/services/api';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [total, setTotal] = useState(0);

  // 司機選擇對話框
  const [driverModalVisible, setDriverModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [assigningDriver, setAssigningDriver] = useState(false);
  const [isChangingDriver, setIsChangingDriver] = useState(false);

  // 取消訂單對話框
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellingOrder, setCancellingOrder] = useState(false);

  // 載入訂單資料
  const loadOrders = async () => {
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

      // 日期範圍
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }

      console.log('📋 載入訂單，參數:', params);

      const response = await ApiService.getBookings(params);

      if (response.success) {
        setOrders(response.data || []);
        setTotal(response.total || 0);
        console.log(`✅ 成功載入 ${response.data?.length || 0} 筆訂單`);
      } else {
        throw new Error(response.message || '載入訂單失敗');
      }
    } catch (error: any) {
      console.error('❌ 載入訂單失敗:', error);
      message.error(error.message || '載入訂單失敗，請稍後再試');
      setOrders([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // 初始載入
  useEffect(() => {
    loadOrders();
  }, []);

  // 當篩選條件改變時重新載入
  useEffect(() => {
    if (!loading) {
      loadOrders();
    }
  }, [statusFilter, dateRange]);

  // 更改司機 - 打開司機選擇對話框
  const handleChangeDriver = async (booking: any) => {
    setSelectedBooking(booking);
    setIsChangingDriver(true);
    setDriverModalVisible(true);
    setLoadingDrivers(true);

    try {
      // 獲取可用司機
      const response = await fetch(
        `/api/admin/drivers/available?vehicleType=${booking.vehicleType}&date=${booking.scheduledDate}&time=${booking.scheduledTime}&duration=${booking.durationHours}`
      );
      const data = await response.json();

      if (data.success) {
        setAvailableDrivers(data.data || []);
      } else {
        message.error(data.error || '獲取司機列表失敗');
        setAvailableDrivers([]);
      }
    } catch (error) {
      console.error('❌ 獲取司機列表失敗:', error);
      message.error('獲取司機列表失敗');
      setAvailableDrivers([]);
    } finally {
      setLoadingDrivers(false);
    }
  };

  // 確認更改司機
  const handleConfirmChangeDriver = async (newDriverId: string) => {
    if (!selectedBooking) return;

    // 檢查訂單狀態，如果司機已出發或已到達，顯示確認對話框
    const warningStatuses = ['driver_departed', 'driver_arrived'];
    if (warningStatuses.includes(selectedBooking.status)) {
      Modal.confirm({
        title: '確認更改司機',
        content: `此訂單司機已${selectedBooking.status === 'driver_departed' ? '出發' : '到達'}，確定要更改司機嗎？`,
        okText: '確認更改',
        cancelText: '取消',
        onOk: async () => {
          await executeChangeDriver(newDriverId);
        },
      });
    } else {
      await executeChangeDriver(newDriverId);
    }
  };

  // 執行更改司機
  const executeChangeDriver = async (newDriverId: string) => {
    setAssigningDriver(true);
    try {
      const response = await fetch(`/api/admin/bookings/${selectedBooking.id}/change-driver`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newDriverId }),
      });

      const data = await response.json();

      if (data.success) {
        message.success('成功更改司機');
        setDriverModalVisible(false);
        setSelectedBooking(null);
        setIsChangingDriver(false);
        loadOrders(); // 重新載入訂單列表
      } else {
        message.error(data.error || '更改司機失敗');
      }
    } catch (error) {
      console.error('❌ 更改司機失敗:', error);
      message.error('更改司機失敗');
    } finally {
      setAssigningDriver(false);
    }
  };

  // 取消訂單 - 打開取消對話框
  const handleCancelOrder = (booking: any) => {
    setSelectedBooking(booking);
    setCancelReason('');
    setCancelModalVisible(true);
  };

  // 確認取消訂單
  const handleConfirmCancel = async () => {
    if (!selectedBooking) return;

    if (!cancelReason || cancelReason.trim() === '') {
      message.error('請輸入取消原因');
      return;
    }

    setCancellingOrder(true);
    try {
      const response = await fetch(`/api/admin/bookings/${selectedBooking.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: cancelReason.trim()
        }),
      });

      const data = await response.json();

      if (data.success) {
        message.success('訂單已取消');
        setCancelModalVisible(false);
        setSelectedBooking(null);
        setCancelReason('');
        loadOrders(); // 重新載入訂單列表
      } else {
        message.error(data.error || '取消訂單失敗');
      }
    } catch (error) {
      console.error('❌ 取消訂單失敗:', error);
      message.error('取消訂單失敗');
    } finally {
      setCancellingOrder(false);
    }
  };

  // 訂單狀態配置
  const statusConfig = {
    pending: { color: 'orange', text: '待配對' },
    matched: { color: 'cyan', text: '已配對' },
    inProgress: { color: 'green', text: '進行中' },
    completed: { color: 'success', text: '已完成' },
    cancelled: { color: 'error', text: '已取消' },
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

  // 格式化日期時間
  const formatDateTime = (date: string, time?: string) => {
    if (!date) return '-';
    try {
      if (time) {
        // 組合日期和時間
        const dateTimeStr = `${date} ${time}`;
        return dayjs(dateTimeStr).format('YYYY-MM-DD HH:mm');
      }
      // 只有日期
      return dayjs(date).format('YYYY-MM-DD');
    } catch (error) {
      console.error('日期格式化錯誤:', error);
      return '-';
    }
  };

  // 表格欄位
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
      render: (_, record: any) => (
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
      render: (_, record: any) => (
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
      render: (_, record: any) => (
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
      render: (_, record: any) => formatDateTime(record.scheduledDate, record.scheduledTime),
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: getStatusTag,
    },
    {
      title: '金額',
      key: 'amount',
      width: 120,
      render: (_, record: any) => `NT$ ${record.pricing?.totalAmount?.toLocaleString() || 0}`,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_, record: any) => (
        <Space>
          <Tooltip title="查看詳情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => router.push(`/orders/${record.id}`)}
            />
          </Tooltip>
          {record.driver && (
            <Tooltip title="更改司機">
              <Button
                type="text"
                icon={<SwapOutlined />}
                onClick={() => handleChangeDriver(record)}
              />
            </Tooltip>
          )}
          <Tooltip title="取消訂單">
            <Button
              type="text"
              danger
              icon={<CloseOutlined />}
              onClick={() => handleCancelOrder(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 統計數據
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending' || o.status === 'pending_payment').length,
    confirmed: orders.filter(o => o.status === 'confirmed' || o.status === 'assigned').length,
    completed: orders.filter(o => o.status === 'completed').length,
  };

  // 重新載入數據
  const handleReload = () => {
    loadOrders();
  };

  // 搜尋處理
  const handleSearch = (value: string) => {
    setSearchText(value);
    loadOrders();
  };

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <CarOutlined className="mr-2" />
            訂單管理
          </h1>
          <p className="text-gray-600">管理所有包車訂單</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button icon={<ReloadOutlined />} onClick={handleReload} loading={loading}>
            重新整理
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/orders/create')}>
            新增訂單
          </Button>
        </div>
      </div>

      {/* 統計卡片 */}
      <Row gutter={16}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic title="總訂單" value={total} prefix={<CarOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic title="待處理" value={stats.pending} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic title="進行中" value={stats.confirmed} valueStyle={{ color: '#13c2c2' }} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic title="已完成" value={stats.completed} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
      </Row>

      {/* 搜尋和篩選 */}
      <Card>
        <Row gutter={16} className="mb-4">
          <Col xs={24} sm={8}>
            <Search
              placeholder="搜尋訂單編號"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={handleSearch}
              enterButton={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col xs={24} sm={6}>
            <Select
              placeholder="訂單狀態"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
            >
              <Option value="all">全部狀態</Option>
              <Option value="pending_payment">待付款</Option>
              <Option value="assigned">已派單</Option>
              <Option value="completed">已完成</Option>
              <Option value="cancelled">已取消</Option>
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
          <Col xs={24} sm={2}>
            <Button icon={<FilterOutlined />} onClick={loadOrders}>
              套用
            </Button>
          </Col>
        </Row>

        {/* 訂單表格 */}
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
            emptyText: loading ? '載入中...' : '暫無訂單資料',
          }}
        />
      </Card>

      {/* 司機選擇對話框 */}
      <Modal
        title={isChangingDriver ? '更改司機' : '選擇司機'}
        open={driverModalVisible}
        onCancel={() => {
          setDriverModalVisible(false);
          setSelectedBooking(null);
          setAvailableDrivers([]);
          setIsChangingDriver(false);
        }}
        footer={null}
        width={800}
      >
        {selectedBooking && (
          <div className="mb-4 p-4 bg-gray-50 rounded">
            <h3 className="font-medium mb-2">訂單資訊</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>訂單編號: {selectedBooking.bookingNumber}</div>
              <div>車型: {selectedBooking.vehicleType}</div>
              <div>預約時間: {formatDateTime(selectedBooking.scheduledDate, selectedBooking.scheduledTime)}</div>
              <div>時長: {selectedBooking.durationHours} 小時</div>
            </div>
          </div>
        )}

        <Table
          columns={[
            {
              title: '司機姓名',
              dataIndex: 'name',
              key: 'name',
            },
            {
              title: '電話',
              dataIndex: 'phone',
              key: 'phone',
            },
            {
              title: '車型',
              dataIndex: 'vehicleType',
              key: 'vehicleType',
            },
            {
              title: '車牌號',
              dataIndex: 'vehiclePlate',
              key: 'vehiclePlate',
            },
            {
              title: '評分',
              dataIndex: 'rating',
              key: 'rating',
              render: (rating: number) => `${rating.toFixed(1)} ⭐`,
            },
            {
              title: '當前訂單',
              dataIndex: 'currentBookings',
              key: 'currentBookings',
            },
            {
              title: '狀態',
              key: 'status',
              render: (_, record: any) => (
                record.hasConflict ? (
                  <Tag color="red">時間衝突</Tag>
                ) : (
                  <Tag color="green">可用</Tag>
                )
              ),
            },
            {
              title: '操作',
              key: 'action',
              render: (_, record: any) => (
                <Button
                  type="primary"
                  size="small"
                  disabled={record.hasConflict || assigningDriver}
                  loading={assigningDriver}
                  onClick={() => {
                    if (isChangingDriver) {
                      handleConfirmChangeDriver(record.id);
                    } else {
                      // 如果需要手動派單功能，可以在這裡添加
                      message.info('請使用待處理訂單頁面進行手動派單');
                    }
                  }}
                >
                  選擇
                </Button>
              ),
            },
          ]}
          dataSource={availableDrivers}
          rowKey="id"
          loading={loadingDrivers}
          pagination={false}
          scroll={{ y: 400 }}
          locale={{
            emptyText: loadingDrivers ? '載入中...' : '沒有可用司機',
          }}
        />
      </Modal>

      {/* 取消訂單對話框 */}
      <Modal
        title="確認取消訂單"
        open={cancelModalVisible}
        onOk={handleConfirmCancel}
        onCancel={() => {
          setCancelModalVisible(false);
          setSelectedBooking(null);
          setCancelReason('');
        }}
        okText="確認取消"
        cancelText="返回"
        confirmLoading={cancellingOrder}
        okButtonProps={{ danger: true }}
      >
        {selectedBooking && (
          <div className="mb-4">
            <div className="mb-2">
              <strong>訂單資訊：</strong>
            </div>
            <div className="text-sm space-y-1">
              <div>訂單編號: {selectedBooking.bookingNumber}</div>
              <div>客戶姓名: {selectedBooking.customer?.name || '未知客戶'}</div>
              <div>預約時間: {formatDateTime(selectedBooking.scheduledDate, selectedBooking.scheduledTime)}</div>
              {selectedBooking.driver && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="text-yellow-800">
                    ⚠️ 此訂單已配對司機，取消後將釋放司機
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <div className="mb-2">
            <strong className="text-red-500">* 取消原因：</strong>
          </div>
          <TextArea
            rows={4}
            placeholder="請輸入取消原因（必填）"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            maxLength={500}
            showCount
          />
        </div>
      </Modal>
    </div>
  );
}

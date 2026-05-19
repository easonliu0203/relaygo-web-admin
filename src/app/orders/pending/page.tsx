'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, Input, Row, Col, Statistic, Space, Tooltip, Alert, message, Modal, Switch, Popover, InputNumber } from 'antd';
import {
  ClockCircleOutlined,
  SearchOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  ReloadOutlined,
  UserAddOutlined,
  ThunderboltOutlined,
  SwapOutlined,
  WifiOutlined,
  RobotOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { ApiService } from '@/services/api';
import { useRealtimeBookings } from '@/hooks/useRealtimeBookings';

const { Search } = Input;
const { TextArea } = Input;

export default function PendingOrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [total, setTotal] = useState(0);

  // 使用 Realtime Hook（即時監聽訂單變更）
  const { bookings: allBookings, setBookings: setAllBookings, isConnected } = useRealtimeBookings([]);

  // 過濾出待處理訂單（pending_payment 和 paid_deposit）
  const orders = allBookings.filter(booking =>
    booking.status === 'pending_payment' || booking.status === 'paid_deposit'
  );

  // 司機選擇對話框
  const [driverModalVisible, setDriverModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [assigningDriver, setAssigningDriver] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [isChangingDriver, setIsChangingDriver] = useState(false); // 是否為更改司機模式

  // 24/7 自動派單開關
  const [autoDispatch24x7Enabled, setAutoDispatch24x7Enabled] = useState(false);
  const [loadingAutoDispatch24x7, setLoadingAutoDispatch24x7] = useState(false);

  // 最多派單日
  const [maxDispatchDays, setMaxDispatchDays] = useState(7);
  const [loadingMaxDispatchDays, setLoadingMaxDispatchDays] = useState(false);

  // 取消訂單對話框
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellingOrder, setCancellingOrder] = useState(false);

  // 更改司機原因對話框
  const [reasonModalVisible, setReasonModalVisible] = useState(false);
  const [changeReason, setChangeReason] = useState('');
  const [pendingNewDriverId, setPendingNewDriverId] = useState<string | null>(null);

  // 載入待處理訂單
  const loadOrders = async () => {
    setLoading(true);
    try {
      // 待處理訂單包含多個狀態：
      // - pending_payment: 待付訂金
      // - paid_deposit: 已付訂金，待分配司機
      const params: any = {
        statuses: ['pending_payment', 'paid_deposit'],
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
      console.error('❌ 載入待處理訂單失敗:', error);
      message.error(error.message || '載入訂單失敗');
      setAllBookings([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // 載入 24/7 自動派單開關狀態和最多派單日
  const loadAutoDispatch24x7Status = async () => {
    try {
      const response = await fetch('/api/admin/settings/auto-dispatch-24-7');
      const data = await response.json();

      if (data.success) {
        setAutoDispatch24x7Enabled(data.data?.enabled || false);
        setMaxDispatchDays(data.data?.max_dispatch_days || 7); // ✅ 載入最多派單日
      }
    } catch (error) {
      console.error('❌ 載入 24/7 自動派單狀態失敗:', error);
    }
  };

  // 更新 24/7 自動派單開關狀態
  const handleAutoDispatch24x7Toggle = async (checked: boolean) => {
    setLoadingAutoDispatch24x7(true);
    try {
      const response = await fetch('/api/admin/settings/auto-dispatch-24-7', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: checked }),
      });
      const data = await response.json();

      if (data.success) {
        setAutoDispatch24x7Enabled(checked);
        message.success(data.message || `24/7 自動派單已${checked ? '開啟' : '關閉'}`);
      } else {
        message.error(data.error || '更新失敗');
      }
    } catch (error) {
      console.error('❌ 更新 24/7 自動派單狀態失敗:', error);
      message.error('更新失敗');
    } finally {
      setLoadingAutoDispatch24x7(false);
    }
  };

  // 更新最多派單日
  const handleMaxDispatchDaysChange = async (value: number) => {
    if (!value || value < 1 || value > 365) {
      message.error('最多派單日必須在 1-365 之間');
      return;
    }

    setLoadingMaxDispatchDays(true);
    try {
      const response = await fetch('/api/admin/settings/auto-dispatch-24-7', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_dispatch_days: value }),
      });
      const data = await response.json();

      if (data.success) {
        setMaxDispatchDays(value);
        message.success(data.message || `最多派單日已設為 ${value} 天`);
      } else {
        message.error(data.error || '更新失敗');
      }
    } catch (error) {
      console.error('❌ 更新最多派單日失敗:', error);
      message.error('更新失敗');
    } finally {
      setLoadingMaxDispatchDays(false);
    }
  };

  useEffect(() => {
    loadOrders(); // 只在頁面載入時執行一次，之後由 Realtime 自動更新
    loadAutoDispatch24x7Status(); // 載入 24/7 自動派單開關狀態
  }, []);

  // 手動派單 - 打開司機選擇對話框
  const handleManualAssign = async (booking: any) => {
    setSelectedBooking(booking);
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

  // 確認分配司機
  const handleConfirmAssign = async (driverId: string) => {
    if (!selectedBooking) return;

    setAssigningDriver(true);
    try {
      const response = await fetch(`/api/admin/bookings/${selectedBooking.id}/assign-driver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId }),
      });

      const data = await response.json();

      if (data.success) {
        message.success('成功分配司機');
        setDriverModalVisible(false);
        setSelectedBooking(null);
        loadOrders(); // 重新載入訂單列表
      } else {
        message.error(data.error || '分配司機失敗');
      }
    } catch (error) {
      console.error('❌ 分配司機失敗:', error);
      message.error('分配司機失敗');
    } finally {
      setAssigningDriver(false);
    }
  };

  // 自動派單
  const handleAutoAssign = async () => {
    Modal.confirm({
      title: '確認自動派單',
      content: '是否要自動分配所有未分配司機的訂單？',
      okText: '確認',
      cancelText: '取消',
      onOk: async () => {
        setAutoAssigning(true);
        try {
          const response = await fetch('/api/admin/bookings/auto-assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          });

          const data = await response.json();

          if (data.success) {
            message.success(`成功分配 ${data.assigned} 筆訂單，失敗 ${data.failed} 筆`);
            loadOrders(); // 重新載入訂單列表
          } else {
            message.error(data.error || '自動派單失敗');
          }
        } catch (error) {
          console.error('❌ 自動派單失敗:', error);
          message.error('自動派單失敗');
        } finally {
          setAutoAssigning(false);
        }
      },
    });
  };

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

  // 司機選定後 → 先要求填寫更改原因（供後續審計回溯）
  const handleConfirmChangeDriver = (newDriverId: string) => {
    if (!selectedBooking) return;
    setPendingNewDriverId(newDriverId);
    setChangeReason('');
    setReasonModalVisible(true);
  };

  // 送出更改原因 → 視狀態決定是否再二次確認 → 執行
  const handleSubmitChangeReason = () => {
    if (!selectedBooking || !pendingNewDriverId) return;

    const trimmed = changeReason.trim();
    if (trimmed.length < 5) {
      message.error('請輸入更改原因（至少 5 個字），以利後續回溯');
      return;
    }

    const warningLabel: Record<string, string> = {
      driver_departed: '已出發',
      driver_arrived: '已到達',
      trip_started: '行程進行中',
    };
    const label = warningLabel[selectedBooking.status];
    if (label) {
      Modal.confirm({
        title: '確認更改司機',
        content: `此訂單目前為「${label}」狀態，更換司機後訂單會重置為「已配對」，新司機需重新走 確認接單 → 出發 → 抵達 流程。確定要繼續嗎？`,
        okText: '確認更改',
        cancelText: '取消',
        onOk: async () => {
          await executeChangeDriver(pendingNewDriverId, trimmed);
        },
      });
    } else {
      executeChangeDriver(pendingNewDriverId, trimmed);
    }
  };

  // 執行更改司機
  const executeChangeDriver = async (newDriverId: string, reason: string) => {
    setAssigningDriver(true);
    try {
      const response = await fetch(`/api/admin/bookings/${selectedBooking.id}/change-driver`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newDriverId, reason }),
      });

      const data = await response.json();

      if (data.success) {
        message.success('成功更改司機');
        setReasonModalVisible(false);
        setDriverModalVisible(false);
        setSelectedBooking(null);
        setIsChangingDriver(false);
        setPendingNewDriverId(null);
        setChangeReason('');
        loadOrders();
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
    pending_payment: { color: 'orange', text: '待付款' },
    pending_assignment: { color: 'blue', text: '待派單' },
    pending_confirmation: { color: 'purple', text: '待確認' },
    paid_deposit: { color: 'cyan', text: '已付訂金' },
    assigned: { color: 'cyan', text: '已派單' },
    driver_confirmed: { color: 'blue', text: '司機已確認' },
    driver_departed: { color: 'geekblue', text: '司機已出發' },
    driver_arrived: { color: 'purple', text: '司機已到達' },
  };

  // 緊急程度配置
  const urgencyConfig = {
    high: { color: 'red', text: '緊急' },
    medium: { color: 'orange', text: '一般' },
    low: { color: 'green', text: '不急' },
  };

  // 獲取狀態標籤
  const getStatusTag = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 獲取緊急程度標籤
  const getUrgencyTag = (urgency: string) => {
    const config = urgencyConfig[urgency as keyof typeof urgencyConfig] || { color: 'default', text: urgency };
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
        const dateTimeStr = `${date} ${time}`;
        return dayjs(dateTimeStr).format('YYYY-MM-DD HH:mm');
      }
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
      render: (_: any, record: any) => (
        <div>
          <div>{record.customer?.name || '未知客戶'}</div>
          <div className="text-gray-500 text-sm">{record.customer?.phone || '無電話'}</div>
        </div>
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
      render: getStatusTag,
    },
    {
      title: '緊急程度',
      dataIndex: 'urgency',
      key: 'urgency',
      width: 100,
      render: getUrgencyTag,
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
      width: 200,
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
          {!record.driver && (
            <Tooltip title="手動派單">
              <Button
                type="text"
                icon={<UserAddOutlined />}
                onClick={() => handleManualAssign(record)}
              />
            </Tooltip>
          )}
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
    payment: orders.filter((o: any) => o.status === 'pending' || o.status === 'pending_payment').length,
    confirmed: orders.filter((o: any) => o.status === 'confirmed').length,
    assignment: orders.filter((o: any) => o.status === 'paid_deposit' && !o.driver_id).length,
    urgent: orders.filter((o: any) => {
      const startDate = dayjs(o.start_date + ' ' + o.start_time);
      const hoursUntilStart = startDate.diff(dayjs(), 'hour');
      return hoursUntilStart <= 24 && hoursUntilStart >= 0;
    }).length,
  };

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
            <ClockCircleOutlined className="mr-2" />
            待處理訂單
          </h1>
          <p className="text-gray-600">
            需要立即處理的訂單
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
        <div className="flex items-center space-x-3">
          {/* 最多派單日 */}
          <div className="flex items-center space-x-2 px-3 py-1 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-sm font-medium">最多派單日:</span>
            <InputNumber
              min={1}
              max={365}
              value={maxDispatchDays}
              onChange={(value) => value && handleMaxDispatchDaysChange(value)}
              disabled={loadingMaxDispatchDays}
              controls={{
                upIcon: <span>▲</span>,
                downIcon: <span>▼</span>,
              }}
              style={{ width: 80 }}
            />
            <span className="text-sm font-medium">天</span>
          </div>

          {/* 24/7 自動派單開關 */}
          <div className="flex items-center space-x-2 px-3 py-1 bg-gray-50 rounded-lg border border-gray-200">
            <RobotOutlined className={autoDispatch24x7Enabled ? 'text-green-500' : 'text-gray-400'} />
            <span className="text-sm font-medium">24/7 自動派單:</span>
            <Switch
              checked={autoDispatch24x7Enabled}
              onChange={handleAutoDispatch24x7Toggle}
              loading={loadingAutoDispatch24x7}
              checkedChildren="運行中"
              unCheckedChildren="關閉"
            />
          </div>

          {/* 問號說明 */}
          <Popover
            content={
              <div style={{ maxWidth: 400 }}>
                <div className="mb-3">
                  <strong className="text-base">🤖 24/7 自動派單</strong>
                </div>
                <div className="space-y-2">
                  <p className="mb-2">
                    <strong>功能說明：</strong>
                    <br />
                    Railway 背景服務每 30 秒自動處理待派單訂單，無需人工介入。
                  </p>
                  <p className="mb-2">
                    <strong>智能匹配機制：</strong>
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>✅ 只處理已付訂金的訂單</li>
                    <li>✅ 智能匹配車型（訂單車型 = 司機車型）</li>
                    <li>✅ 無匹配訂單時跳過執行，節省成本</li>
                    <li>✅ 自動分配最優司機</li>
                  </ul>
                  <p className="mb-2 mt-3">
                    <strong>與手動派單的區別：</strong>
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>24/7 自動派單：</strong>背景服務持續運行，自動處理</li>
                    <li><strong>手動派單：</strong>立即執行一次，手動觸發</li>
                  </ul>
                  <p className="mt-3 text-gray-500 text-sm">
                    💡 建議：營業時間開啟 24/7 自動派單，非營業時間可關閉以節省成本。
                  </p>
                </div>
              </div>
            }
            title={null}
            trigger="hover"
            placement="bottomLeft"
          >
            <QuestionCircleOutlined
              className="text-gray-400 hover:text-blue-500 cursor-help text-lg"
              style={{ marginLeft: -4 }}
            />
          </Popover>

          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={handleAutoAssign}
            loading={autoAssigning}
          >
            自動派單
          </Button>
          <Button icon={<ReloadOutlined />} onClick={loadOrders} loading={loading}>
            重新整理
          </Button>
        </div>
      </div>

      {/* 待處理提醒 */}
      {stats.payment > 0 && (
        <Alert
          message={`您有 ${stats.payment} 筆待付款訂單需要處理`}
          description="請提醒客戶完成付款，以便進行後續派單作業"
          type="warning"
          showIcon
          closable
        />
      )}

      {/* 統計卡片 */}
      <Row gutter={16}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic title="待處理總數" value={stats.total} prefix={<ClockCircleOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic title="待付款" value={stats.payment} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic title="待派單" value={stats.assignment} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic title="緊急訂單" value={stats.urgent} valueStyle={{ color: '#f5222d' }} />
          </Card>
        </Col>
      </Row>

      {/* 搜尋和篩選 */}
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
            emptyText: loading ? '載入中...' : '暫無待處理訂單',
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
              render: (count: number) => `${count} 筆`,
            },
            {
              title: '狀態',
              key: 'status',
              render: (_: any, record: any) => (
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
              render: (_: any, record: any) => (
                <Button
                  type="primary"
                  size="small"
                  disabled={record.hasConflict || assigningDriver}
                  loading={assigningDriver}
                  onClick={() => {
                    if (isChangingDriver) {
                      handleConfirmChangeDriver(record.id);
                    } else {
                      handleConfirmAssign(record.id);
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

      {/* 更改司機原因對話框（突發狀況回溯用） */}
      <Modal
        title="更改司機 - 請填寫原因"
        open={reasonModalVisible}
        onOk={handleSubmitChangeReason}
        onCancel={() => {
          setReasonModalVisible(false);
          setPendingNewDriverId(null);
          setChangeReason('');
        }}
        okText="確認更改"
        cancelText="返回"
        confirmLoading={assigningDriver}
      >
        {selectedBooking && (
          <div className="mb-4">
            <div className="text-sm space-y-1 p-3 bg-gray-50 rounded">
              <div>訂單編號: {selectedBooking.bookingNumber}</div>
              <div>目前狀態: {getStatusTag(selectedBooking.status)}</div>
              <div>原司機: {selectedBooking.driver?.name || '未指派'}</div>
            </div>
          </div>
        )}
        <div>
          <div className="mb-2">
            <strong className="text-red-500">* 更改原因：</strong>
            <span className="text-xs text-gray-500 ml-2">至少 5 個字，將寫入審計記錄以利後續回溯</span>
          </div>
          <TextArea
            rows={4}
            placeholder="例如：原司機臨時車輛故障無法服務、原司機未回應派單通知、客戶要求更換司機⋯⋯"
            value={changeReason}
            onChange={(e) => setChangeReason(e.target.value)}
            maxLength={500}
            showCount
          />
        </div>
      </Modal>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  DatePicker,
  Row,
  Col,
  Statistic,
  Space,
  Divider,
  Descriptions,
  message,
  Typography,
  Tooltip,
  Badge,
} from 'antd';
import {
  DownloadOutlined,
  ReloadOutlined,
  FilterOutlined,
  FileTextOutlined,
  DollarOutlined,
  CalendarOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { ApiService } from '@/services/api';

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;

// 收據區塊 - 訂金收據
function DepositReceiptBlock({ order, hidePrivate }: { order: any; hidePrivate?: boolean }) {
  const pricing = order.pricing || {};
  const customer = order.customer || {};

  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
      <Title level={5} style={{ color: '#389e0d', marginBottom: 12 }}>
        訂金收據
      </Title>
      <Descriptions size="small" column={3} bordered>
        {/* 訂單資訊 */}
        <Descriptions.Item label="訂單編號">{order.bookingNumber || '-'}</Descriptions.Item>
        <Descriptions.Item label="預約日期">{order.scheduledDate || '-'}</Descriptions.Item>
        <Descriptions.Item label="預約時間">{order.scheduledTime || '-'}</Descriptions.Item>

        {/* 客戶資訊 */}
        <Descriptions.Item label="客戶姓名">{customer.name || '-'}</Descriptions.Item>
        {!hidePrivate && <Descriptions.Item label="客戶 Email">{customer.email || '-'}</Descriptions.Item>}
        {!hidePrivate && <Descriptions.Item label="客戶電話">{customer.phone || '-'}</Descriptions.Item>}

        {/* 服務詳情 */}
        <Descriptions.Item label="車型">{vehicleTypeLabel(order.vehicleType)}</Descriptions.Item>
        <Descriptions.Item label="時長">{order.durationHours ? `${order.durationHours} 小時` : '-'}</Descriptions.Item>
        <Descriptions.Item label="統一編號">{order.taxId || '-'}</Descriptions.Item>

        {/* 費用明細 */}
        <Descriptions.Item label="基本費用">
          {pricing.basePrice != null ? <Text strong>NT$ {Number(pricing.basePrice).toLocaleString()}</Text> : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="優惠碼折扣">
          {order.promoCode ? (
            <Space>
              <Tag color="green">{order.promoCode}</Tag>
              {pricing.discountAmount != null && (
                <Text type="danger">-NT$ {Number(pricing.discountAmount).toLocaleString()}</Text>
              )}
            </Space>
          ) : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="訂金金額 (25%)">
          {pricing.depositAmount != null ? (
            <Text strong style={{ color: '#1677ff' }}>
              NT$ {Number(pricing.depositAmount).toLocaleString()}
            </Text>
          ) : '-'}
        </Descriptions.Item>

        {/* 支付資訊 */}
        <Descriptions.Item label="交易編號" span={2}>
          <Text code>{order.depositTransactionId || '-'}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="支付方式">
          {order.depositPaymentMethod || '-'}
        </Descriptions.Item>

        <Descriptions.Item label="支付日期" span={3}>
          {order.depositPaidAt
            ? dayjs(order.depositPaidAt).format('YYYY-MM-DD HH:mm:ss')
            : '-'}
        </Descriptions.Item>
      </Descriptions>
    </div>
  );
}

// 收據區塊 - 完整收據
function FullReceiptBlock({ order, hidePrivate }: { order: any; hidePrivate?: boolean }) {
  const pricing = order.pricing || {};
  const customer = order.customer || {};
  const driver = order.driver || {};

  const balanceAmount = pricing.balanceAmount != null
    ? Number(pricing.balanceAmount)
    : (pricing.totalAmount != null && pricing.depositAmount != null
      ? Number(pricing.totalAmount) - Number(pricing.depositAmount)
      : null);

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
      <Title level={5} style={{ color: '#1677ff', marginBottom: 4 }}>
        完整收據
      </Title>

      {/* 訂單 / 客戶 / 服務 */}
      <Descriptions size="small" column={3} bordered>
        <Descriptions.Item label="訂單編號">{order.bookingNumber || '-'}</Descriptions.Item>
        <Descriptions.Item label="預約日期">{order.scheduledDate || '-'}</Descriptions.Item>
        <Descriptions.Item label="預約時間">{order.scheduledTime || '-'}</Descriptions.Item>

        <Descriptions.Item label="客戶姓名">{customer.name || '-'}</Descriptions.Item>
        {!hidePrivate && <Descriptions.Item label="客戶 Email">{customer.email || '-'}</Descriptions.Item>}
        {!hidePrivate && <Descriptions.Item label="客戶電話">{customer.phone || '-'}</Descriptions.Item>}

        <Descriptions.Item label="車型">{vehicleTypeLabel(order.vehicleType)}</Descriptions.Item>
        <Descriptions.Item label="時長">{order.durationHours ? `${order.durationHours} 小時` : '-'}</Descriptions.Item>
        <Descriptions.Item label="統一編號">{order.taxId || '-'}</Descriptions.Item>

        <Descriptions.Item label="訂單狀態" span={3}>{statusTag(order.status)}</Descriptions.Item>
        <Descriptions.Item label="上車地點" span={3}>{order.pickupLocation || '-'}</Descriptions.Item>
        <Descriptions.Item label="下車地點" span={3}>{order.dropoffLocation || '-'}</Descriptions.Item>

        {driver.name && !hidePrivate && (
          <>
            <Descriptions.Item label="司機姓名">{driver.name}</Descriptions.Item>
            <Descriptions.Item label="司機電話">{driver.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="車牌號碼">{driver.vehiclePlate || '-'}</Descriptions.Item>
          </>
        )}
      </Descriptions>

      {/* 費用明細 */}
      <Descriptions size="small" column={3} bordered title="費用明細">
        <Descriptions.Item label="基本費用">
          {pricing.basePrice != null ? `NT$ ${Number(pricing.basePrice).toLocaleString()}` : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="優惠碼折扣">
          {order.promoCode ? (
            <Space>
              <Tag color="green">{order.promoCode}</Tag>
              {pricing.discountAmount != null && (
                <Text type="danger">-NT$ {Number(pricing.discountAmount).toLocaleString()}</Text>
              )}
            </Space>
          ) : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="訂金">
          {pricing.depositAmount != null ? `NT$ ${Number(pricing.depositAmount).toLocaleString()}` : '-'}
        </Descriptions.Item>

        <Descriptions.Item label="尾款">
          {balanceAmount != null ? (
            <Text strong style={{ color: '#1677ff' }}>
              NT$ {balanceAmount.toLocaleString()}
            </Text>
          ) : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="超時費用">
          {pricing.overtimeFee && Number(pricing.overtimeFee) > 0
            ? <Text type="warning">NT$ {Number(pricing.overtimeFee).toLocaleString()}</Text>
            : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="小費">
          {pricing.tipAmount && Number(pricing.tipAmount) > 0
            ? `NT$ ${Number(pricing.tipAmount).toLocaleString()}`
            : '-'}
        </Descriptions.Item>

        <Descriptions.Item label="總金額" span={3}>
          <Text strong style={{ color: '#389e0d', fontSize: 15 }}>
            NT$ {Number(pricing.totalAmount || 0).toLocaleString()}
          </Text>
        </Descriptions.Item>
      </Descriptions>

      {/* 支付資訊 */}
      <Descriptions size="small" column={3} bordered title="支付資訊">
        <Descriptions.Item label="交易編號" span={2}>
          <Text code>{order.balanceTransactionId || '-'}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="支付方式">
          {order.balancePaymentMethod || '-'}
        </Descriptions.Item>

        <Descriptions.Item label="支付日期" span={3}>
          {order.balancePaidAt
            ? dayjs(order.balancePaidAt).format('YYYY-MM-DD HH:mm:ss')
            : '-'}
        </Descriptions.Item>

        {/* 取消政策同意 banner */}
        {order.policyAgreed && (
          <Descriptions.Item span={3} label="">
            <div style={{
              background: '#f0f8ff',
              border: '1px solid #91caff',
              borderLeft: '4px solid #1677ff',
              borderRadius: 4,
              padding: '8px 12px',
            }}>
              <Text style={{ color: '#1677ff', fontWeight: 600 }}>
                ✓ 您已同意《RelayGo 取消政策》
              </Text>
            </div>
          </Descriptions.Item>
        )}

        <Descriptions.Item label="授權時間" span={3}>
          {order.policyAgreedAt
            ? dayjs(order.policyAgreedAt).format('YYYY/MM/DD HH:mm')
            : '-'}
        </Descriptions.Item>
      </Descriptions>

      {/* 客戶數位簽名 */}
      {(order.signatureUrl || order.signatureBase64) && (
        <Descriptions size="small" column={1} bordered title="客戶數位簽名">
          <Descriptions.Item label="簽名圖像">
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <img
                src={order.signatureUrl || order.signatureBase64}
                alt="客戶簽名"
                style={{
                  maxHeight: 100,
                  maxWidth: '100%',
                  border: '1px solid #d9d9d9',
                  borderRadius: 4,
                  background: '#fff',
                  padding: 4,
                }}
              />
              {order.signedAt && (
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    簽名時間：{dayjs(order.signedAt).format('YYYY-MM-DD HH:mm:ss')}
                  </Text>
                </div>
              )}
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  此簽名用於確認支付尾款
                </Text>
              </div>
            </div>
          </Descriptions.Item>
        </Descriptions>
      )}
    </div>
  );
}

// 車型標籤
function vehicleTypeLabel(type: string) {
  const map: Record<string, string> = {
    A: '豪華9人座',
    B: '標準8人座',
    C: '舒適4人座',
    D: '經濟3人座',
  };
  return map[type] || type || '-';
}

// 訂單狀態標籤
function statusTag(status: string) {
  const map: Record<string, { color: string; text: string }> = {
    PENDING_PAYMENT: { color: 'volcano', text: '待付訂金' },
    pending: { color: 'orange', text: '待配對' },
    awaitingDriver: { color: 'gold', text: '待司機確認' },
    matched: { color: 'cyan', text: '已配對' },
    ON_THE_WAY: { color: 'blue', text: '正在路上' },
    inProgress: { color: 'green', text: '進行中' },
    awaitingBalance: { color: 'lime', text: '待付尾款' },
    completed: { color: 'success', text: '已完成' },
    cancelled: { color: 'error', text: '已取消' },
  };
  const cfg = map[status] || { color: 'default', text: status };
  return <Tag color={cfg.color}>{cfg.text}</Tag>;
}

// CSV 匯出
function exportCsv(orders: any[]) {
  const headers = [
    '訂單編號', '預約日期', '預約時間', '訂單狀態', '車型',
    '客戶姓名', '客戶Email', '客戶電話',
    '基本費用', '優惠碼', '折扣金額', '訂金(25%)', '尾款', '超時費用', '小費', '總金額',
    '訂金交易編號', '訂金支付日期', '尾款交易編號', '尾款支付日期', '支付方式', '統一編號',
    '司機姓名', '司機電話', '車牌號碼',
  ];

  const rows = orders.map((o) => {
    const p = o.pricing || {};
    const c = o.customer || {};
    const d = o.driver || {};
    const balance = p.balanceAmount != null
      ? Number(p.balanceAmount)
      : (p.totalAmount != null && p.depositAmount != null
        ? Number(p.totalAmount) - Number(p.depositAmount)
        : '');

    return [
      o.bookingNumber || '',
      o.scheduledDate || '',
      o.scheduledTime || '',
      o.status || '',
      vehicleTypeLabel(o.vehicleType),
      c.name || '',
      c.email || '',
      c.phone || '',
      p.basePrice != null ? Number(p.basePrice) : '',
      o.promoCode || '',
      p.discountAmount != null ? Number(p.discountAmount) : '',
      p.depositAmount != null ? Number(p.depositAmount) : '',
      balance,
      p.overtimeFee != null ? Number(p.overtimeFee) : '',
      p.tipAmount != null ? Number(p.tipAmount) : '',
      p.totalAmount != null ? Number(p.totalAmount) : '',
      o.depositTransactionId || '',
      o.depositPaidAt ? dayjs(o.depositPaidAt).format('YYYY-MM-DD HH:mm') : '',
      o.balanceTransactionId || '',
      o.balancePaidAt ? dayjs(o.balancePaidAt).format('YYYY-MM-DD HH:mm') : '',
      o.balancePaymentMethod || o.depositPaymentMethod || '',
      o.taxId || '',
      d.name || '',
      d.phone || '',
      d.vehiclePlate || '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `gomypay_billing_${dayjs().format('YYYYMMDD_HHmm')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// 展開列：含收據與「產生圖片」按鈕
function ExpandedReceiptRow({ record }: { record: any }) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [capturing, setCapturing] = useState(false);

  const handleDownloadImage = useCallback(async () => {
    if (!captureRef.current) return;
    setCapturing(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `receipt_${record.bookingNumber || record.id}_${dayjs().format('YYYYMMDD_HHmm')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      message.success('圖片已下載');
    } catch {
      message.error('圖片產生失敗，請稍後再試');
    } finally {
      setCapturing(false);
    }
  }, [record]);

  return (
    <div className="space-y-3 py-2">
      <div style={{ textAlign: 'right' }}>
        <Button
          icon={<PictureOutlined />}
          loading={capturing}
          onClick={handleDownloadImage}
        >
          產生圖片 (PNG)
        </Button>
      </div>

      {/* 頁面顯示版（含完整資訊） */}
      <div style={{ background: '#ffffff', padding: 16 }}>
        <DepositReceiptBlock order={record} />
        <div style={{ marginTop: 16 }}>
          <FullReceiptBlock order={record} />
        </div>
      </div>

      {/* 圖片擷取版（隱藏敏感欄位，固定寬度確保排版一致） */}
      <div
        ref={captureRef}
        style={{
          position: 'absolute',
          left: -99999,
          top: 0,
          width: 900,
          background: '#ffffff',
          padding: 24,
        }}
      >
        <DepositReceiptBlock order={record} hidePrivate />
        <div style={{ marginTop: 16 }}>
          <FullReceiptBlock order={record} hidePrivate />
        </div>
      </div>
    </div>
  );
}

// ─── 主頁面 ────────────────────────────────────────────────────────────────
export default function GomypayBillingPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 200, offset: 0 };
      if (dateRange?.[0] && dateRange?.[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }
      const response = await ApiService.getBookings(params);
      if (response.success) {
        setOrders(response.data || []);
      } else {
        throw new Error(response.message || '載入失敗');
      }
    } catch (err: any) {
      message.error(err.message || '載入訂單失敗');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // 統計
  const totalAmount = orders.reduce((sum, o) => sum + (Number(o.pricing?.totalAmount) || 0), 0);
  const totalDeposit = orders.reduce((sum, o) => sum + (Number(o.pricing?.depositAmount) || 0), 0);
  const totalBalance = orders.reduce((sum, o) => {
    const p = o.pricing || {};
    const bal = p.balanceAmount != null
      ? Number(p.balanceAmount)
      : (p.totalAmount != null && p.depositAmount != null
        ? Number(p.totalAmount) - Number(p.depositAmount)
        : 0);
    return sum + bal;
  }, 0);

  // 展開列（顯示收據詳情）
  const expandedRowRender = (record: any) => (
    <ExpandedReceiptRow record={record} />
  );

  // 表格欄位
  const columns = [
    {
      title: '訂單編號',
      dataIndex: 'bookingNumber',
      key: 'bookingNumber',
      width: 150,
      render: (text: string) => <Text strong>{text || '-'}</Text>,
    },
    {
      title: '預約日期',
      dataIndex: 'scheduledDate',
      key: 'scheduledDate',
      width: 120,
      sorter: (a: any, b: any) =>
        dayjs(`${a.scheduledDate} ${a.scheduledTime || '00:00'}`).unix() -
        dayjs(`${b.scheduledDate} ${b.scheduledTime || '00:00'}`).unix(),
      render: (v: string) => v || '-',
    },
    {
      title: '預約時間',
      dataIndex: 'scheduledTime',
      key: 'scheduledTime',
      width: 100,
      render: (v: string) => v || '-',
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: statusTag,
    },
    {
      title: '車型',
      dataIndex: 'vehicleType',
      key: 'vehicleType',
      width: 110,
      render: vehicleTypeLabel,
    },
    {
      title: '客戶',
      key: 'customer',
      width: 130,
      render: (_: any, r: any) => (
        <div>
          <div>{r.customer?.name || '-'}</div>
          <div className="text-xs text-gray-400">{r.customer?.phone || ''}</div>
        </div>
      ),
    },
    {
      title: '總金額',
      key: 'total',
      width: 120,
      sorter: (a: any, b: any) => (a.pricing?.totalAmount || 0) - (b.pricing?.totalAmount || 0),
      render: (_: any, r: any) => (
        <Text strong style={{ color: '#389e0d' }}>
          NT$ {Number(r.pricing?.totalAmount || 0).toLocaleString()}
        </Text>
      ),
    },
    {
      title: '訂金',
      key: 'deposit',
      width: 110,
      render: (_: any, r: any) => (
        r.pricing?.depositAmount != null
          ? `NT$ ${Number(r.pricing.depositAmount).toLocaleString()}`
          : '-'
      ),
    },
    {
      title: '尾款',
      key: 'balance',
      width: 110,
      render: (_: any, r: any) => {
        const p = r.pricing || {};
        const bal = p.balanceAmount != null
          ? Number(p.balanceAmount)
          : (p.totalAmount != null && p.depositAmount != null
            ? Number(p.totalAmount) - Number(p.depositAmount)
            : null);
        return bal != null ? `NT$ ${bal.toLocaleString()}` : '-';
      },
    },
    {
      title: '訂金付款',
      key: 'depositPaid',
      width: 100,
      render: (_: any, r: any) => (
        r.depositPaid
          ? <Badge status="success" text="已付" />
          : <Badge status="default" text="未付" />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 標題 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileTextOutlined />
            GOMYPAY 請款報表
          </h1>
          <p className="text-gray-500 mt-1">訂單收據資料彙整，供請款對帳使用</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadOrders} loading={loading}>
            重新整理
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => {
              if (orders.length === 0) {
                message.warning('沒有可匯出的資料');
                return;
              }
              exportCsv(orders);
              message.success(`已匯出 ${orders.length} 筆訂單`);
            }}
          >
            匯出 CSV
          </Button>
        </Space>
      </div>

      {/* 統計卡片 */}
      <Row gutter={16}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="訂單筆數"
              value={orders.length}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="訂單總金額"
              value={totalAmount}
              prefix="NT$"
              valueStyle={{ color: '#389e0d' }}
              formatter={(v) => Number(v).toLocaleString()}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="訂金合計"
              value={totalDeposit}
              prefix="NT$"
              valueStyle={{ color: '#1677ff' }}
              formatter={(v) => Number(v).toLocaleString()}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="尾款合計"
              value={totalBalance}
              prefix="NT$"
              valueStyle={{ color: '#fa8c16' }}
              formatter={(v) => Number(v).toLocaleString()}
            />
          </Card>
        </Col>
      </Row>

      {/* 篩選列 */}
      <Card>
        <Row gutter={16} align="middle">
          <Col>
            <Text strong>預約日期範圍：</Text>
          </Col>
          <Col>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
              placeholder={['開始日期', '結束日期']}
            />
          </Col>
          <Col>
            <Button icon={<FilterOutlined />} type="primary" onClick={loadOrders}>
              套用篩選
            </Button>
          </Col>
          {dateRange && (
            <Col>
              <Button
                onClick={() => {
                  setDateRange(null);
                  loadOrders();
                }}
              >
                清除
              </Button>
            </Col>
          )}
          <Col flex="auto" style={{ textAlign: 'right' }}>
            <Text type="secondary">
              共 {orders.length} 筆｜點擊列左側箭頭展開收據詳情
            </Text>
          </Col>
        </Row>
      </Card>

      {/* 訂單表格（可展開） */}
      <Card>
        <Table
          columns={columns}
          dataSource={orders}
          rowKey="id"
          loading={loading}
          expandable={{
            expandedRowRender,
            expandedRowKeys: expandedKeys,
            onExpand: (expanded, record) => {
              setExpandedKeys(
                expanded
                  ? [...expandedKeys, record.id]
                  : expandedKeys.filter((k) => k !== record.id)
              );
            },
            rowExpandable: () => true,
          }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 項，共 ${total} 項`,
          }}
          scroll={{ x: 1100 }}
          locale={{ emptyText: loading ? '載入中...' : '暫無資料' }}
        />
      </Card>
    </div>
  );
}

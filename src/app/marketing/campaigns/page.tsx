'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  DatePicker,
  message,
  Popconfirm,
  Typography,
  Alert,
  Descriptions,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';

const { Title, Paragraph, Text } = Typography;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.relaygo.pro';

const SERVICE_TYPES: Record<string, string> = {
  charter: '包車旅遊',
  airport_transfer: '機場接送',
  instant_ride: '即時派車',
};

const VEHICLE_TYPES: Record<string, string> = {
  S: 'S 五人座轎車',
  M: 'M 五人座休旅車',
  L: 'L 九人座',
  XL: 'XL Toyota Alphard',
};

interface Campaign {
  id: string;
  name: string;
  promo_code: string;
  is_active: boolean;
  discount_percentage_enabled: boolean;
  discount_percent_charter: number | null;
  discount_percent_instant_ride: number | null;
  discount_percent_airport_transfer: number | null;
  discount_amount_enabled: boolean;
  discount_amount: number | null;
  limit_vehicle_types: string[] | null;
  limit_service_types: string[] | null;
  discount_base: string | null;
  driver_payout_mode: string | null;
  driver_fixed_amount: number | null;
  valid_from: string | null;
  valid_until: string | null;
  per_user_limit: number | null;
  created_at: string;
}

interface Usage {
  total_bookings: number;
  active_bookings: number;
  cancelled_bookings: number;
  total_discount: number;
  total_amount: number;
  total_driver_earning: number;
  total_platform_fee: number;
}

/** 活動狀態：停用 / 未開始 / 進行中 / 已結束 */
function campaignState(c: Campaign): { text: string; color: string } {
  if (!c.is_active) return { text: '停用', color: 'default' };
  const now = dayjs();
  if (c.valid_from && now.isBefore(dayjs(c.valid_from))) return { text: '未開始', color: 'blue' };
  if (c.valid_until && now.isAfter(dayjs(c.valid_until))) return { text: '已結束', color: 'red' };
  return { text: '進行中', color: 'green' };
}

const money = (n: number) => `NT$ ${Math.round(n).toLocaleString()}`;

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const [usageVisible, setUsageVisible] = useState(false);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [usageTarget, setUsageTarget] = useState<Campaign | null>(null);

  /** 一般單的司機分潤％（活動單的附加費依此計算），取自「分成設定」頁 */
  const [driverPct, setDriverPct] = useState<number>(75);

  // 表單即時試算用
  const [payoutMode, setPayoutMode] = useState<string>('fixed');
  const [previewBase, setPreviewBase] = useState<number>(7300);
  const [previewSurcharge, setPreviewSurcharge] = useState<number>(0);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/campaigns`);
      const result = await res.json();
      if (result.success) {
        setCampaigns(result.data || []);
      } else {
        message.error(result.error || '載入活動失敗');
      }
    } catch (e) {
      message.error('載入活動失敗，請確認後端服務');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDriverPct = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/revenue-share-configs?country=TW&service_type=charter&has_promo_code=false`
      );
      const result = await res.json();
      const row = (result?.data || [])[0];
      if (row?.driver_percentage != null) setDriverPct(Number(row.driver_percentage));
    } catch {
      // 取不到就沿用預設 75，僅影響試算顯示
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
    fetchDriverPct();
  }, [fetchCampaigns, fetchDriverPct]);

  const openCreate = () => {
    setEditing(null);
    setPayoutMode('fixed');
    setPreviewBase(7300);
    setPreviewSurcharge(0);
    form.resetFields();
    form.setFieldsValue({
      is_active: false,
      discount_base: 'base_price',
      driver_payout_mode: 'fixed',
      driver_fixed_amount: 4000,
      per_user_limit: 1,
      limit_service_types: ['charter'],
      limit_vehicle_types: ['L'],
      discount_percent_charter: 30,
    });
    setModalVisible(true);
  };

  const openEdit = (c: Campaign) => {
    setEditing(c);
    setPayoutMode(c.driver_payout_mode || 'percent');
    setPreviewBase(7300);
    setPreviewSurcharge(0);
    form.setFieldsValue({
      name: c.name,
      promo_code: c.promo_code,
      is_active: c.is_active,
      discount_base: c.discount_base || 'total',
      discount_percent_charter: Number(c.discount_percent_charter || 0),
      discount_percent_airport_transfer: Number(c.discount_percent_airport_transfer || 0),
      discount_percent_instant_ride: Number(c.discount_percent_instant_ride || 0),
      limit_service_types: c.limit_service_types || [],
      limit_vehicle_types: c.limit_vehicle_types || [],
      driver_payout_mode: c.driver_payout_mode || 'percent',
      driver_fixed_amount: Number(c.driver_fixed_amount || 0),
      per_user_limit: c.per_user_limit ?? undefined,
      period:
        c.valid_from || c.valid_until
          ? [c.valid_from ? dayjs(c.valid_from) : null, c.valid_until ? dayjs(c.valid_until) : null]
          : undefined,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const period = values.period as [Dayjs | null, Dayjs | null] | undefined;
      const payload: Record<string, unknown> = {
        name: values.name,
        is_active: values.is_active ?? false,
        discount_base: values.discount_base,
        discount_percentage_enabled: true,
        discount_percent_charter: values.discount_percent_charter || 0,
        discount_percent_airport_transfer: values.discount_percent_airport_transfer || 0,
        discount_percent_instant_ride: values.discount_percent_instant_ride || 0,
        limit_service_types: values.limit_service_types || [],
        limit_vehicle_types: values.limit_vehicle_types || [],
        driver_payout_mode: values.driver_payout_mode,
        driver_fixed_amount: values.driver_payout_mode === 'fixed' ? values.driver_fixed_amount : 0,
        per_user_limit: values.per_user_limit ?? null,
        valid_from: period?.[0] ? period[0].toISOString() : null,
        valid_until: period?.[1] ? period[1].toISOString() : null,
      };
      if (!editing) payload.promo_code = values.promo_code;

      const url = editing
        ? `${API_BASE_URL}/api/admin/campaigns/${editing.id}`
        : `${API_BASE_URL}/api/admin/campaigns`;

      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (result.success) {
        message.success(editing ? '活動已更新' : '活動已建立');
        if (result.note) message.info(result.note, 6);
        setModalVisible(false);
        fetchCampaigns();
      } else {
        message.error(result.error || '儲存失敗');
      }
    } catch (e) {
      if ((e as { errorFields?: unknown }).errorFields) return; // 表單驗證錯誤，antd 已顯示
      message.error('儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (c: Campaign, active: boolean) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/campaigns/${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: active }),
      });
      const result = await res.json();
      if (result.success) {
        message.success(active ? '活動已啟用' : '活動已停用');
        fetchCampaigns();
      } else {
        message.error(result.error || '操作失敗');
      }
    } catch {
      message.error('操作失敗');
    }
  };

  const handleDelete = async (c: Campaign) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/campaigns/${c.id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        message.success('活動已刪除');
        fetchCampaigns();
      } else {
        message.error(result.error || '刪除失敗');
      }
    } catch {
      message.error('刪除失敗');
    }
  };

  const showUsage = async (c: Campaign) => {
    setUsageTarget(c);
    setUsage(null);
    setUsageVisible(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/campaigns/${c.id}/usage`);
      const result = await res.json();
      if (result.success) setUsage(result.data);
      else message.error(result.error || '載入使用狀況失敗');
    } catch {
      message.error('載入使用狀況失敗');
    }
  };

  /** 表單即時試算：讓設定者直接看到司機與平台各拿多少 */
  const preview = useMemo(() => {
    const values = form.getFieldsValue();
    const pct = Number(values.discount_percent_charter || 0);
    const base = Number(previewBase || 0);
    const surcharge = Number(previewSurcharge || 0);
    const discountBase = values.discount_base || 'base_price';

    const originalTotal = base + surcharge;
    const discountable = discountBase === 'base_price' ? base : originalTotal;
    const untouched = originalTotal - discountable;
    const finalPrice = Math.round(discountable * (1 - pct / 100)) + untouched;
    const discountedBase = discountBase === 'base_price' ? Math.round(base * (1 - pct / 100)) : finalPrice;

    let driver: number;
    if (values.driver_payout_mode === 'fixed') {
      const fixed = Number(values.driver_fixed_amount || 0);
      const surchargePart = Math.max(finalPrice - discountedBase, 0);
      driver = Math.round(fixed + (surchargePart * driverPct) / 100);
    } else {
      driver = Math.round((finalPrice * driverPct) / 100);
    }
    const platform = finalPrice - driver;

    return { originalTotal, finalPrice, discount: originalTotal - finalPrice, driver, platform };
    // form 的值透過 payoutMode / previewBase / previewSurcharge 觸發重算
  }, [form, payoutMode, previewBase, previewSurcharge, driverPct, modalVisible]);

  const columns: ColumnsType<Campaign> = [
    {
      title: '活動',
      key: 'name',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.name}</Text>
          <Text code>{r.promo_code}</Text>
        </Space>
      ),
    },
    {
      title: '狀態',
      key: 'state',
      width: 90,
      render: (_, r) => {
        const s = campaignState(r);
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: '折扣',
      key: 'discount',
      width: 190,
      render: (_, r) => {
        const parts: string[] = [];
        if (Number(r.discount_percent_charter)) parts.push(`包車 ${r.discount_percent_charter}%`);
        if (Number(r.discount_percent_airport_transfer)) parts.push(`機接 ${r.discount_percent_airport_transfer}%`);
        if (Number(r.discount_percent_instant_ride)) parts.push(`即時 ${r.discount_percent_instant_ride}%`);
        return (
          <Space direction="vertical" size={0}>
            <Text>{parts.join('、') || '—'}</Text>
            <Tag color={r.discount_base === 'base_price' ? 'purple' : 'default'}>
              {r.discount_base === 'base_price' ? '只折基本車資' : '折總額'}
            </Tag>
          </Space>
        );
      },
    },
    {
      title: '適用範圍',
      key: 'limits',
      width: 200,
      render: (_, r) => (
        <Space direction="vertical" size={2}>
          <span>
            {(r.limit_service_types || []).length > 0
              ? (r.limit_service_types || []).map((s) => <Tag key={s}>{SERVICE_TYPES[s] || s}</Tag>)
              : <Text type="secondary">服務不限</Text>}
          </span>
          <span>
            {(r.limit_vehicle_types || []).length > 0
              ? (r.limit_vehicle_types || []).map((v) => <Tag key={v} color="blue">{v}</Tag>)
              : <Text type="secondary">車型不限</Text>}
          </span>
        </Space>
      ),
    },
    {
      title: '司機給付',
      key: 'payout',
      width: 170,
      render: (_, r) =>
        r.driver_payout_mode === 'fixed' ? (
          <Space direction="vertical" size={0}>
            <Tag color="orange">固定 {money(Number(r.driver_fixed_amount || 0))}</Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>附加費另計 {driverPct}%</Text>
          </Space>
        ) : (
          <Tag>依分成設定</Tag>
        ),
    },
    {
      title: '活動期間',
      key: 'period',
      width: 190,
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 12 }}>
            {r.valid_from ? dayjs(r.valid_from).format('YYYY/MM/DD HH:mm') : '不限'}
          </Text>
          <Text style={{ fontSize: 12 }}>
            ~ {r.valid_until ? dayjs(r.valid_until).format('YYYY/MM/DD HH:mm') : '不限'}
          </Text>
        </Space>
      ),
    },
    {
      title: '每人限用',
      dataIndex: 'per_user_limit',
      key: 'per_user_limit',
      width: 90,
      render: (v: number | null) => (v ? `${v} 次` : '不限'),
    },
    {
      title: '操作',
      key: 'action',
      width: 230,
      fixed: 'right',
      render: (_, r) => (
        <Space size={4}>
          <Switch
            size="small"
            checked={r.is_active}
            onChange={(checked) => handleToggleActive(r, checked)}
          />
          <Button size="small" icon={<BarChartOutlined />} onClick={() => showUsage(r)}>
            使用
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>
            編輯
          </Button>
          <Popconfirm title="確定刪除此活動？" onConfirm={() => handleDelete(r)} okText="刪除" cancelText="取消">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Space direction="vertical" size={4} style={{ width: '100%', marginBottom: 16 }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Title level={4} style={{ margin: 0 }}>
              活動優惠
            </Title>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchCampaigns}>
                重新整理
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                新增活動
              </Button>
            </Space>
          </Space>
          <Paragraph type="secondary" style={{ margin: 0 }}>
            活動優惠碼直接折讓給消費者，不發放推廣人佣金。司機可設為固定給付，
            跨區費、超時費等附加費一律照原價收取，並依「分成設定」的一般單比例（司機 {driverPct}%）分潤。
          </Paragraph>
        </Space>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={campaigns}
          loading={loading}
          pagination={false}
          scroll={{ x: 1300 }}
        />
      </Card>

      <Modal
        title={editing ? `編輯活動：${editing.promo_code}` : '新增活動'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={saving}
        okText="儲存"
        cancelText="取消"
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onValuesChange={() => setPayoutMode(form.getFieldValue('driver_payout_mode'))}>
          <Form.Item name="name" label="活動名稱" rules={[{ required: true, message: '請輸入活動名稱' }]}>
            <Input placeholder="例如：九人座七折活動" />
          </Form.Item>

          <Form.Item
            name="promo_code"
            label="活動代碼"
            rules={[{ required: true, message: '請輸入活動代碼' }]}
            extra={editing ? '代碼建立後不可更改，避免與已成立的訂單對不上' : '客人輸入的優惠碼，不分大小寫'}
          >
            <Input placeholder="例如：RG202609" disabled={!!editing} />
          </Form.Item>

          <Form.Item name="is_active" label="啟用" valuePropName="checked">
            <Switch checkedChildren="啟用" unCheckedChildren="停用" />
          </Form.Item>

          <Form.Item name="period" label="活動期間" extra="留空表示不限；到期後自動失效，不需手動關閉">
            <DatePicker.RangePicker showTime style={{ width: '100%' }} />
          </Form.Item>

          <Divider orientation="left" plain>折扣設定</Divider>

          <Form.Item
            name="discount_base"
            label="折扣基準"
            rules={[{ required: true }]}
            extra="只折基本車資時，跨區費、超時費、加購接送機一律照原價，不參與折扣"
          >
            <Select
              options={[
                { value: 'base_price', label: '只折基本車資（活動慣例）' },
                { value: 'total', label: '折訂單總額' },
              ]}
            />
          </Form.Item>

          <Space size={12} style={{ display: 'flex' }}>
            <Form.Item name="discount_percent_charter" label="包車旅遊折扣 %">
              <InputNumber min={0} max={100} style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="discount_percent_airport_transfer" label="機場接送折扣 %">
              <InputNumber min={0} max={100} style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="discount_percent_instant_ride" label="即時派車折扣 %">
              <InputNumber min={0} max={100} style={{ width: 140 }} />
            </Form.Item>
          </Space>

          <Divider orientation="left" plain>適用限制</Divider>

          <Form.Item name="limit_service_types" label="限定服務類型" extra="留空表示不限">
            <Select
              mode="multiple"
              allowClear
              placeholder="不限"
              options={Object.entries(SERVICE_TYPES).map(([value, label]) => ({ value, label }))}
            />
          </Form.Item>

          <Form.Item name="limit_vehicle_types" label="限定車型" extra="留空表示不限">
            <Select
              mode="multiple"
              allowClear
              placeholder="不限"
              options={Object.entries(VEHICLE_TYPES).map(([value, label]) => ({ value, label }))}
            />
          </Form.Item>

          <Form.Item name="per_user_limit" label="每個帳號可使用次數" extra="留空表示不限。未付款的訂單也會佔用額度，需取消舊單才能釋放">
            <InputNumber min={1} placeholder="不限" style={{ width: 160 }} />
          </Form.Item>

          <Divider orientation="left" plain>司機給付</Divider>

          <Form.Item name="driver_payout_mode" label="給付模式" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'fixed', label: '固定給付（基本車資給固定金額）' },
                { value: 'percent', label: '依分成設定的比例' },
              ]}
            />
          </Form.Item>

          {payoutMode === 'fixed' && (
            <Form.Item
              name="driver_fixed_amount"
              label="司機固定給付額"
              rules={[{ required: true, message: '請輸入司機固定給付額' }]}
              extra={`只涵蓋基本車資。跨區費、超時費等附加費另外依一般單比例給司機 ${driverPct}%。修改後只影響之後建立的新訂單，已成立的訂單維持原本的金額。`}
            >
              <InputNumber min={1} step={100} style={{ width: 200 }} addonBefore="NT$" />
            </Form.Item>
          )}

          <Divider orientation="left" plain>試算</Divider>

          <Space size={12} style={{ display: 'flex' }}>
            <Form.Item label="基本車資">
              <InputNumber
                value={previewBase}
                onChange={(v) => setPreviewBase(Number(v || 0))}
                min={0}
                step={100}
                style={{ width: 150 }}
                addonBefore="NT$"
              />
            </Form.Item>
            <Form.Item label="附加費（跨區／超時）">
              <InputNumber
                value={previewSurcharge}
                onChange={(v) => setPreviewSurcharge(Number(v || 0))}
                min={0}
                step={100}
                style={{ width: 150 }}
                addonBefore="NT$"
              />
            </Form.Item>
          </Space>

          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="原價">{money(preview.originalTotal)}</Descriptions.Item>
            <Descriptions.Item label="折扣">-{money(preview.discount)}</Descriptions.Item>
            <Descriptions.Item label="客人付" span={2}>
              <Text strong>{money(preview.finalPrice)}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="司機">
              <Text strong>{money(preview.driver)}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="平台">
              <Text strong type={preview.platform < 0 ? 'danger' : undefined}>
                {money(preview.platform)}
              </Text>
            </Descriptions.Item>
          </Descriptions>

          {preview.platform < 0 && (
            <Alert
              type="error"
              showIcon
              style={{ marginTop: 12 }}
              message="平台留存為負數"
              description="司機固定給付額高於客人實付金額，這樣的訂單會被系統擋下，請調低固定給付額。"
            />
          )}
        </Form>
      </Modal>

      <Modal
        title={usageTarget ? `使用狀況：${usageTarget.name}` : '使用狀況'}
        open={usageVisible}
        onCancel={() => setUsageVisible(false)}
        footer={<Button onClick={() => setUsageVisible(false)}>關閉</Button>}
      >
        {usage ? (
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="有效訂單">{usage.active_bookings} 筆</Descriptions.Item>
            <Descriptions.Item label="已取消／退款">{usage.cancelled_bookings} 筆</Descriptions.Item>
            <Descriptions.Item label="折讓總額">{money(usage.total_discount)}</Descriptions.Item>
            <Descriptions.Item label="營收（客人實付）">{money(usage.total_amount)}</Descriptions.Item>
            <Descriptions.Item label="司機給付總額">{money(usage.total_driver_earning)}</Descriptions.Item>
            <Descriptions.Item label="平台留存總額">{money(usage.total_platform_fee)}</Descriptions.Item>
          </Descriptions>
        ) : (
          <Text type="secondary">載入中…</Text>
        )}
      </Modal>
    </div>
  );
}

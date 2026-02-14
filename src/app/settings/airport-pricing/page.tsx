'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Typography,
  Space,
  message,
  Switch,
  InputNumber,
  Input,
  Select,
  Popconfirm,
  Tag,
  Modal,
  Form,
  Row,
  Col,
  Statistic,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SaveOutlined,
  StopOutlined,
  CheckCircleOutlined,
  AimOutlined,
  SortAscendingOutlined,
  UndoOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { createClient } from '@supabase/supabase-js';

const { Title, Text } = Typography;
const { Option } = Select;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// ── 車型等級定義 ─────────────────────────────────────────────
// 支援讀取 "XS"/"Extra Small"/"extra small" 等格式
const VEHICLE_TYPES = [
  { code: 'XS', full: 'Extra Small', label: 'XS - Extra Small 特小型', order: 1 },
  { code: 'S',  full: 'Small',       label: 'S - Small 小型（五人座）',  order: 2 },
  { code: 'M',  full: 'Medium',      label: 'M - Medium 中型（七人座）', order: 3 },
  { code: 'L',  full: 'Large',       label: 'L - Large 大型',           order: 4 },
  { code: 'XL', full: 'Extra Large', label: 'XL - Extra Large 特大型',  order: 5 },
];

/** 將任意車型字串正規化為標準 code（XS/S/M/L/XL） */
const normalizeVehicleType = (raw: string): string => {
  const v = raw.trim().toLowerCase();
  for (const t of VEHICLE_TYPES) {
    if (v === t.code.toLowerCase() || v === t.full.toLowerCase()) return t.code;
  }
  return raw; // 無法識別時原樣回傳
};

/** 取得車型排序權重（用於排序比較） */
const vehicleOrder = (type: string): number => {
  const found = VEHICLE_TYPES.find(t => t.code === normalizeVehicleType(type));
  return found ? found.order : 99;
};

/** 取得車型顯示標籤 */
const vehicleLabel = (type: string): string => {
  const code = normalizeVehicleType(type);
  const found = VEHICLE_TYPES.find(t => t.code === code);
  return found ? found.label : type;
};

const VEHICLE_TYPE_OPTIONS = VEHICLE_TYPES.map(t => ({
  value: t.code,
  label: t.label,
}));

const AIRPORTS = [
  { key: 'tsa_price', label: '台北松山 (TSA)', color: '#1890ff' },
  { key: 'tpe_price', label: '桃園國際 (TPE)', color: '#52c41a' },
  { key: 'rmq_price', label: '台中清泉崗 (RMQ)', color: '#fa8c16' },
  { key: 'khh_price', label: '高雄小港 (KHH)', color: '#eb2f96' },
];

// ── 排序選項 ─────────────────────────────────────────────────
type SortField = 'vehicle_type' | 'tsa_price' | 'tpe_price' | 'rmq_price' | 'khh_price' | 'min_price' | 'max_price' | 'region' | null;
type SortDir = 'asc' | 'desc';

const SORT_FIELD_OPTIONS: { value: SortField; label: string }[] = [
  { value: null,           label: '不排序' },
  { value: 'vehicle_type', label: '車型等級' },
  { value: 'tsa_price',    label: '松山 (TSA) 價格' },
  { value: 'tpe_price',    label: '桃園 (TPE) 價格' },
  { value: 'rmq_price',    label: '清泉崗 (RMQ) 價格' },
  { value: 'khh_price',    label: '小港 (KHH) 價格' },
  { value: 'min_price',    label: '最低價' },
  { value: 'max_price',    label: '最高價' },
  { value: 'region',       label: '地區名稱' },
];

interface AirportPricing {
  id: string;
  country: string;
  price_list_name: string;
  vehicle_type: string;
  region: string;
  tsa_price: number | null;
  tpe_price: number | null;
  rmq_price: number | null;
  khh_price: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** 取得排序值 */
const getSortValue = (record: AirportPricing, field: SortField): number | string => {
  if (!field) return 0;
  if (field === 'vehicle_type') return vehicleOrder(record.vehicle_type);
  if (field === 'region') return record.region;
  if (field === 'min_price') {
    const prices = [record.tsa_price, record.tpe_price, record.rmq_price, record.khh_price].filter(p => p != null) as number[];
    return prices.length ? Math.min(...prices) : Infinity;
  }
  if (field === 'max_price') {
    const prices = [record.tsa_price, record.tpe_price, record.rmq_price, record.khh_price].filter(p => p != null) as number[];
    return prices.length ? Math.max(...prices) : -Infinity;
  }
  return (record as any)[field] ?? Infinity;
};

/** 排序標籤文字 */
const sortLabel = (field: SortField, dir: SortDir): string => {
  const f = SORT_FIELD_OPTIONS.find(o => o.value === field);
  if (!f || !f.value) return '';
  const dirText = field === 'vehicle_type'
    ? (dir === 'asc' ? 'XS→XL' : 'XL→XS')
    : (dir === 'asc' ? '低→高' : '高→低');
  return `${f.label}：${dirText}`;
};

export default function AirportPricingPage() {
  const [loading, setLoading] = useState(false);
  const [pricingList, setPricingList] = useState<AirportPricing[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AirportPricing | null>(null);
  const [filterVehicleType, setFilterVehicleType] = useState<string | null>(null);
  const [filterPriceList, setFilterPriceList] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [form] = Form.useForm();

  // ── 排序狀態 ───────────────────────────────────────────────
  const [primaryField, setPrimaryField]   = useState<SortField>(null);
  const [primaryDir, setPrimaryDir]       = useState<SortDir>('asc');
  const [secondaryField, setSecondaryField] = useState<SortField>(null);
  const [secondaryDir, setSecondaryDir]   = useState<SortDir>('asc');

  const hasSort = primaryField !== null;

  const resetSort = () => {
    setPrimaryField(null);
    setPrimaryDir('asc');
    setSecondaryField(null);
    setSecondaryDir('asc');
  };

  // ── 載入資料 ───────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    try {
      let q = supabase.from('airport_transfer_pricing').select('*').order('region');
      if (filterVehicleType) q = q.eq('vehicle_type', filterVehicleType);
      if (filterPriceList)   q = q.eq('price_list_name', filterPriceList);

      const { data, error } = await q;
      if (error) throw error;
      setPricingList(data || []);
    } catch (e: any) {
      message.error(`載入失敗: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [filterVehicleType, filterPriceList]);

  // ── 排序後的資料 ──────────────────────────────────────────
  const sortedList = useMemo(() => {
    if (!primaryField) return pricingList;

    return [...pricingList].sort((a, b) => {
      // 主要排序
      const av = getSortValue(a, primaryField);
      const bv = getSortValue(b, primaryField);
      let cmp = 0;
      if (typeof av === 'string' && typeof bv === 'string') {
        cmp = av.localeCompare(bv, 'zh-TW');
      } else {
        cmp = (av as number) - (bv as number);
      }
      if (primaryDir === 'desc') cmp = -cmp;
      if (cmp !== 0) return cmp;

      // 次要排序
      if (!secondaryField) return 0;
      const av2 = getSortValue(a, secondaryField);
      const bv2 = getSortValue(b, secondaryField);
      let cmp2 = 0;
      if (typeof av2 === 'string' && typeof bv2 === 'string') {
        cmp2 = av2.localeCompare(bv2, 'zh-TW');
      } else {
        cmp2 = (av2 as number) - (bv2 as number);
      }
      if (secondaryDir === 'desc') cmp2 = -cmp2;
      return cmp2;
    });
  }, [pricingList, primaryField, primaryDir, secondaryField, secondaryDir]);

  // ── 統計數字 ───────────────────────────────────────────────
  const totalCount  = pricingList.length;
  const activeCount = pricingList.filter(r => r.is_active).length;

  // ── 取得所有不重複的價目表名稱（從未篩選的完整資料中取） ──
  const priceListNames = Array.from(new Set(pricingList.map(r => r.price_list_name)));

  // ── 切換啟用狀態 ────────────────────────────────────────────
  const toggleActive = async (record: AirportPricing) => {
    try {
      const { error } = await supabase
        .from('airport_transfer_pricing')
        .update({ is_active: !record.is_active })
        .eq('id', record.id);
      if (error) throw error;
      message.success(record.is_active ? '已停用' : '已啟用');
      loadData();
    } catch (e: any) {
      message.error(`操作失敗: ${e.message}`);
    }
  };

  // ── 刪除單筆 ────────────────────────────────────────────────
  const deleteRecord = async (id: string) => {
    try {
      const { error } = await supabase
        .from('airport_transfer_pricing')
        .delete()
        .eq('id', id);
      if (error) throw error;
      message.success('已刪除');
      loadData();
    } catch (e: any) {
      message.error(`刪除失敗: ${e.message}`);
    }
  };

  // ── 批次操作 ────────────────────────────────────────────────
  const batchSetActive = async (active: boolean) => {
    if (!selectedRowKeys.length) return;
    setBatchLoading(true);
    try {
      const { error } = await supabase
        .from('airport_transfer_pricing')
        .update({ is_active: active })
        .in('id', selectedRowKeys as string[]);
      if (error) throw error;
      message.success(`已批次${active ? '啟用' : '停用'} ${selectedRowKeys.length} 筆`);
      setSelectedRowKeys([]);
      loadData();
    } catch (e: any) {
      message.error(`批次操作失敗: ${e.message}`);
    } finally {
      setBatchLoading(false);
    }
  };

  const batchDelete = async () => {
    if (!selectedRowKeys.length) return;
    setBatchLoading(true);
    try {
      const { error } = await supabase
        .from('airport_transfer_pricing')
        .delete()
        .in('id', selectedRowKeys as string[]);
      if (error) throw error;
      message.success(`已刪除 ${selectedRowKeys.length} 筆`);
      setSelectedRowKeys([]);
      loadData();
    } catch (e: any) {
      message.error(`批次刪除失敗: ${e.message}`);
    } finally {
      setBatchLoading(false);
    }
  };

  // ── 開啟新增/編輯 Modal ─────────────────────────────────────
  const showModal = (record?: AirportPricing) => {
    if (record) {
      setEditingRecord(record);
      form.setFieldsValue({
        country:         record.country,
        price_list_name: record.price_list_name,
        vehicle_type:    normalizeVehicleType(record.vehicle_type),
        region:          record.region,
        tsa_price:       record.tsa_price,
        tpe_price:       record.tpe_price,
        rmq_price:       record.rmq_price,
        khh_price:       record.khh_price,
        is_active:       record.is_active,
      });
    } else {
      setEditingRecord(null);
      form.resetFields();
      form.setFieldsValue({ country: 'TW', is_active: true });
    }
    setIsModalVisible(true);
  };

  // ── 儲存 ────────────────────────────────────────────────────
  const handleSave = async (values: any) => {
    try {
      const payload = {
        country:         values.country || 'TW',
        price_list_name: values.price_list_name,
        vehicle_type:    normalizeVehicleType(values.vehicle_type),
        region:          values.region,
        tsa_price:       values.tsa_price ?? null,
        tpe_price:       values.tpe_price ?? null,
        rmq_price:       values.rmq_price ?? null,
        khh_price:       values.khh_price ?? null,
        is_active:       values.is_active ?? true,
      };

      if (editingRecord) {
        const { error } = await supabase
          .from('airport_transfer_pricing')
          .update(payload)
          .eq('id', editingRecord.id);
        if (error) throw error;
        message.success('更新成功');
      } else {
        const { error } = await supabase
          .from('airport_transfer_pricing')
          .insert([payload]);
        if (error) throw error;
        message.success('新增成功');
      }

      setIsModalVisible(false);
      form.resetFields();
      loadData();
    } catch (e: any) {
      message.error(`儲存失敗: ${e.message}`);
    }
  };

  // ── 表格欄位 ────────────────────────────────────────────────
  const columns = [
    {
      title: '地區',
      dataIndex: 'region',
      key: 'region',
      width: 100,
      fixed: 'left' as const,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: '車型',
      dataIndex: 'vehicle_type',
      key: 'vehicle_type',
      width: 200,
      render: (v: string) => (
        <Tag color="purple">{vehicleLabel(v)}</Tag>
      ),
    },
    ...AIRPORTS.map(airport => ({
      title: airport.label,
      dataIndex: airport.key,
      key: airport.key,
      width: 150,
      render: (price: number | null) =>
        price != null ? (
          <Text strong style={{ color: airport.color }}>
            NT$ {price.toLocaleString()}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    })),
    {
      title: '價目表',
      dataIndex: 'price_list_name',
      key: 'price_list_name',
      width: 180,
      ellipsis: true,
      render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: '狀態',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (v: boolean, record: AirportPricing) => (
        <Switch
          checked={v}
          checkedChildren="啟用"
          unCheckedChildren="停用"
          onChange={() => toggleActive(record)}
          size="small"
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 130,
      fixed: 'right' as const,
      render: (_: any, record: AirportPricing) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => showModal(record)}
          >
            編輯
          </Button>
          <Popconfirm
            title="確定刪除這筆資料？"
            description="此操作無法復原。"
            onConfirm={() => deleteRecord(record.id)}
            okText="刪除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              刪除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      {/* 頁首 */}
      <div className="mb-6">
        <Title level={2}>
          <AimOutlined className="mr-2" />
          機場接送價格管理
        </Title>
        <Text type="secondary">管理各地區至各機場的接送定價，支援多車型與多價目表</Text>
      </div>

      {/* 統計卡片 */}
      <Row gutter={16} className="mb-6">
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="總筆數" value={totalCount} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="啟用中" value={activeCount} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="已停用" value={totalCount - activeCount} valueStyle={{ color: '#ff4d4f' }} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="已選取" value={selectedRowKeys.length} valueStyle={{ color: '#1890ff' }} /></Card>
        </Col>
      </Row>

      {/* 排序控制區 */}
      <Card size="small" className="mb-4" styles={{ body: { padding: '12px 16px' } }}>
        <Row gutter={[16, 8]} align="middle">
          <Col>
            <SortAscendingOutlined style={{ fontSize: 16, marginRight: 4 }} />
            <Text strong>排序</Text>
          </Col>

          {/* 主要排序 */}
          <Col>
            <Space size={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>主要：</Text>
              <Select
                value={primaryField}
                onChange={(v) => { setPrimaryField(v); if (!v) { setSecondaryField(null); } }}
                style={{ width: 160 }}
                size="small"
              >
                {SORT_FIELD_OPTIONS.map(o => (
                  <Option key={String(o.value)} value={o.value}>{o.label}</Option>
                ))}
              </Select>
              {primaryField && (
                <Button
                  size="small"
                  type="text"
                  icon={<SwapOutlined />}
                  onClick={() => setPrimaryDir(d => d === 'asc' ? 'desc' : 'asc')}
                >
                  {primaryField === 'vehicle_type'
                    ? (primaryDir === 'asc' ? 'XS→XL' : 'XL→XS')
                    : primaryField === 'region'
                      ? (primaryDir === 'asc' ? 'A→Z' : 'Z→A')
                      : (primaryDir === 'asc' ? '低→高' : '高→低')
                  }
                </Button>
              )}
            </Space>
          </Col>

          {/* 次要排序 */}
          {primaryField && (
            <Col>
              <Space size={4}>
                <Text type="secondary" style={{ fontSize: 12 }}>次要：</Text>
                <Select
                  value={secondaryField}
                  onChange={setSecondaryField}
                  style={{ width: 160 }}
                  size="small"
                >
                  {SORT_FIELD_OPTIONS
                    .filter(o => o.value !== primaryField)
                    .map(o => (
                      <Option key={String(o.value)} value={o.value}>{o.label}</Option>
                    ))}
                </Select>
                {secondaryField && (
                  <Button
                    size="small"
                    type="text"
                    icon={<SwapOutlined />}
                    onClick={() => setSecondaryDir(d => d === 'asc' ? 'desc' : 'asc')}
                  >
                    {secondaryField === 'vehicle_type'
                      ? (secondaryDir === 'asc' ? 'XS→XL' : 'XL→XS')
                      : secondaryField === 'region'
                        ? (secondaryDir === 'asc' ? 'A→Z' : 'Z→A')
                        : (secondaryDir === 'asc' ? '低→高' : '高→低')
                    }
                  </Button>
                )}
              </Space>
            </Col>
          )}

          {/* 重設 */}
          {hasSort && (
            <Col>
              <Button size="small" icon={<UndoOutlined />} onClick={resetSort}>重設排序</Button>
            </Col>
          )}

          {/* 目前排序狀態標籤 */}
          {hasSort && (
            <Col flex="auto" style={{ textAlign: 'right' }}>
              <Space size={4}>
                <Tag color="blue">{sortLabel(primaryField, primaryDir)}</Tag>
                {secondaryField && <Tag color="geekblue">{sortLabel(secondaryField, secondaryDir)}</Tag>}
              </Space>
            </Col>
          )}
        </Row>
      </Card>

      {/* 主要列表 */}
      <Card
        title="定價列表"
        extra={
          <Space wrap>
            <Select
              allowClear
              placeholder="篩選車型"
              style={{ width: 200 }}
              onChange={v => setFilterVehicleType(v || null)}
            >
              {VEHICLE_TYPE_OPTIONS.map(o => (
                <Option key={o.value} value={o.value}>{o.label}</Option>
              ))}
            </Select>
            <Select
              allowClear
              placeholder="篩選價目表"
              style={{ width: 200 }}
              onChange={v => setFilterPriceList(v || null)}
            >
              {priceListNames.map(name => (
                <Option key={name} value={name}>{name}</Option>
              ))}
            </Select>

            <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
              重新載入
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
              新增
            </Button>
          </Space>
        }
      >
        {/* 批次操作列 */}
        {selectedRowKeys.length > 0 && (
          <div
            className="mb-4 p-3 rounded"
            style={{ background: '#e6f4ff', border: '1px solid #91caff' }}
          >
            <Space>
              <Text strong>已選取 {selectedRowKeys.length} 筆</Text>
              <Button size="small" icon={<CheckCircleOutlined />} onClick={() => batchSetActive(true)} loading={batchLoading}>
                批次啟用
              </Button>
              <Button size="small" icon={<StopOutlined />} onClick={() => batchSetActive(false)} loading={batchLoading}>
                批次停用
              </Button>
              <Popconfirm
                title={`確定刪除這 ${selectedRowKeys.length} 筆資料？`}
                description="此操作無法復原。"
                onConfirm={batchDelete}
                okText="刪除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
              >
                <Button size="small" danger icon={<DeleteOutlined />} loading={batchLoading}>
                  批次刪除
                </Button>
              </Popconfirm>
              <Button size="small" onClick={() => setSelectedRowKeys([])}>取消選取</Button>
            </Space>
          </div>
        )}

        <Table
          dataSource={sortedList}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 50, showSizeChanger: true, showTotal: t => `共 ${t} 筆` }}
          scroll={{ x: 1200 }}
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          size="small"
        />
      </Card>

      {/* 新增/編輯 Modal */}
      <Modal
        title={editingRecord ? '編輯定價' : '新增定價'}
        open={isModalVisible}
        onCancel={() => { setIsModalVisible(false); form.resetFields(); }}
        footer={null}
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="車型" name="vehicle_type" rules={[{ required: true, message: '請選擇車型' }]}>
                <Select placeholder="請選擇車型">
                  {VEHICLE_TYPE_OPTIONS.map(o => (
                    <Option key={o.value} value={o.value}>{o.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="地區" name="region" rules={[{ required: true, message: '請輸入地區' }]}>
                <Input placeholder="例：雙北" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="價目表名稱" name="price_list_name" rules={[{ required: true, message: '請輸入價目表名稱' }]}>
            <Input placeholder="例：機場接送五人座轎車價目表" />
          </Form.Item>

          <Form.Item label="國家碼" name="country">
            <Input placeholder="TW" style={{ width: 100 }} />
          </Form.Item>

          <Row gutter={12}>
            {AIRPORTS.map(a => (
              <Col span={12} key={a.key}>
                <Form.Item label={a.label} name={a.key}>
                  <InputNumber min={0} style={{ width: '100%' }} addonBefore="NT$" placeholder="輸入價格" />
                </Form.Item>
              </Col>
            ))}
          </Row>

          <Form.Item label="狀態" name="is_active" valuePropName="checked">
            <Switch checkedChildren="啟用" unCheckedChildren="停用" />
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={() => { setIsModalVisible(false); form.resetFields(); }}>取消</Button>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>儲存</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

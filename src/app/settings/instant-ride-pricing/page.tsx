'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  message,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Space,
  Tag,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Divider,
  Tabs,
  Typography,
  DatePicker
} from 'antd';
import dayjs from 'dayjs';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CopyOutlined,
  CalculatorOutlined,
  CarOutlined,
  GlobalOutlined,
  EnvironmentOutlined,
  DollarOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Text, Title } = Typography;

// 常數定義
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.relaygo.pro';

const SUPPORTED_COUNTRIES: Record<string, string> = {
  TW: '台灣',
  JP: '日本',
  KR: '韓國',
  VN: '越南',
  TH: '泰國',
  MY: '馬來西亞',
  ID: '印尼'
};

const REGIONS_BY_COUNTRY: Record<string, Array<{ code: string; name: string }>> = {
  TW: [
    { code: 'taipei', name: '台北/新北/基隆' },
    { code: 'taoyuan', name: '桃園' },
    { code: 'taichung', name: '台中' },
    { code: 'tainan', name: '台南' },
    { code: 'kaohsiung', name: '高雄' }
  ],
  JP: [
    { code: 'tokyo', name: '東京' },
    { code: 'osaka', name: '大阪' },
    { code: 'kyoto', name: '京都' }
  ],
  KR: [
    { code: 'seoul', name: '首爾' },
    { code: 'busan', name: '釜山' }
  ],
  VN: [
    { code: 'hanoi', name: '河內' },
    { code: 'hochiminh', name: '胡志明市' }
  ],
  TH: [
    { code: 'bangkok', name: '曼谷' },
    { code: 'chiangmai', name: '清邁' }
  ],
  MY: [
    { code: 'kualalumpur', name: '吉隆坡' }
  ],
  ID: [
    { code: 'jakarta', name: '雅加達' },
    { code: 'bali', name: '峇里島' }
  ]
};

const VEHICLE_TYPES: Record<string, string> = {
  standard: '標準型',
  taxi: '小黃計程車',
  eco: '減碳環保',
  xl: '六人座'
};

interface InstantRidePricing {
  id: string;
  vehicle_type_code: string;
  display_name_i18n: Record<string, string>;
  description_i18n: Record<string, string>;
  seat_capacity: number;
  icon_name: string;
  icon_color: string;
  country: string;
  region: string;
  base_fare: number;
  base_distance_km: number;
  fare_per_km: number;
  fare_per_minute: number;
  night_surcharge_rate: number;
  night_start_hour: number;
  night_end_hour: number;
  surge_multiplier: number;
  min_fare: number;
  spring_festival_surcharge?: number;
  spring_festival_start_date?: string;
  spring_festival_end_date?: string;
  spring_festival_enabled?: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PreviewResult {
  estimated_price: number;
  breakdown: {
    base_fare: number;
    distance_fare: number;
    time_fare: number;
    night_surcharge: number;
    spring_festival_surcharge?: number;
    surge_multiplier: number;
  };
}

export default function InstantRidePricingPage() {
  const [form] = Form.useForm();
  const [copyForm] = Form.useForm();
  const [previewForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [configs, setConfigs] = useState<InstantRidePricing[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [copyModalVisible, setCopyModalVisible] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<InstantRidePricing | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>('TW');
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [previewConfigId, setPreviewConfigId] = useState<string | null>(null);

  // 篩選狀態
  const [filters, setFilters] = useState({
    country: undefined as string | undefined,
    region: undefined as string | undefined,
    vehicle_type_code: undefined as string | undefined,
    is_active: true as boolean | undefined
  });

  useEffect(() => {
    loadConfigs();
  }, [filters]);

  // 載入配置列表
  const loadConfigs = async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined'
        ? (document.cookie.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1] || localStorage.getItem('admin_token'))
        : null;

      const queryParams = new URLSearchParams();
      if (filters.country) queryParams.append('country', filters.country);
      if (filters.region) queryParams.append('region', filters.region);
      if (filters.vehicle_type_code) queryParams.append('vehicle_type_code', filters.vehicle_type_code);
      if (filters.is_active !== undefined) queryParams.append('is_active', String(filters.is_active));

      const response = await fetch(`${API_BASE_URL}/api/admin/instant-ride-pricing?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const result = await response.json();
      if (result.success) {
        setConfigs(result.data);
      } else {
        message.error(result.error || '載入配置失敗');
      }
    } catch (error: any) {
      console.error('載入配置錯誤:', error);
      message.error(error.message || '載入配置失敗');
    } finally {
      setLoading(false);
    }
  };

  // 打開新增/編輯 Modal
  const openModal = (config?: InstantRidePricing) => {
    if (config) {
      setEditingConfig(config);
      // 處理日期欄位轉換為 dayjs 物件
      const formValues = {
        ...config,
        spring_festival_start_date: config.spring_festival_start_date ? dayjs(config.spring_festival_start_date) : null,
        spring_festival_end_date: config.spring_festival_end_date ? dayjs(config.spring_festival_end_date) : null,
      };
      form.setFieldsValue(formValues);
      setSelectedCountry(config.country);
    } else {
      setEditingConfig(null);
      form.resetFields();
      form.setFieldsValue({
        country: 'TW',
        region: 'taipei',
        vehicle_type_code: 'standard',
        seat_capacity: 4,
        base_fare: 85,
        base_distance_km: 1.25,
        fare_per_km: 25,
        fare_per_minute: 5,
        night_surcharge_rate: 0.2,
        night_start_hour: 23,
        night_end_hour: 6,
        surge_multiplier: 1.0,
        min_fare: 0,
        display_order: 0,
        is_active: true,
        spring_festival_surcharge: 30,
        spring_festival_enabled: false
      });
      setSelectedCountry('TW');
    }
    setModalVisible(true);
  };

  // 儲存配置
  const saveConfig = async (values: any) => {
    try {
      const token = typeof window !== 'undefined'
        ? (document.cookie.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1] || localStorage.getItem('admin_token'))
        : null;

      const url = editingConfig
        ? `${API_BASE_URL}/api/admin/instant-ride-pricing/${editingConfig.id}`
        : `${API_BASE_URL}/api/admin/instant-ride-pricing`;

      const method = editingConfig ? 'PUT' : 'POST';

      // 處理日期欄位轉換為 YYYY-MM-DD 字串
      const payload = {
        ...values,
        spring_festival_start_date: values.spring_festival_start_date
          ? dayjs(values.spring_festival_start_date).format('YYYY-MM-DD')
          : null,
        spring_festival_end_date: values.spring_festival_end_date
          ? dayjs(values.spring_festival_end_date).format('YYYY-MM-DD')
          : null,
        updated_by: 'admin'
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) {
        message.success(editingConfig ? '更新成功' : '新增成功');
        setModalVisible(false);
        form.resetFields();
        loadConfigs();
      } else {
        message.error(result.error || '儲存失敗');
      }
    } catch (error: any) {
      console.error('儲存配置錯誤:', error);
      message.error(error.message || '儲存失敗');
    }
  };

  // 刪除配置 (軟刪除)
  const deleteConfig = async (id: string) => {
    try {
      const token = typeof window !== 'undefined'
        ? (document.cookie.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1] || localStorage.getItem('admin_token'))
        : null;

      const response = await fetch(`${API_BASE_URL}/api/admin/instant-ride-pricing/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ updated_by: 'admin' }),
      });

      const result = await response.json();
      if (result.success) {
        message.success('配置已停用');
        loadConfigs();
      } else {
        message.error(result.error || '刪除失敗');
      }
    } catch (error: any) {
      console.error('刪除配置錯誤:', error);
      message.error(error.message || '刪除失敗');
    }
  };

  // 複製配置
  const copyConfig = async (values: any) => {
    try {
      const token = typeof window !== 'undefined'
        ? (document.cookie.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1] || localStorage.getItem('admin_token'))
        : null;

      const response = await fetch(`${API_BASE_URL}/api/admin/instant-ride-pricing/copy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...values,
          created_by: 'admin'
        }),
      });

      const result = await response.json();
      if (result.success) {
        message.success(result.message || '複製成功');
        setCopyModalVisible(false);
        copyForm.resetFields();
        loadConfigs();
      } else {
        message.error(result.error || '複製失敗');
      }
    } catch (error: any) {
      console.error('複製配置錯誤:', error);
      message.error(error.message || '複製失敗');
    }
  };

  // 預覽價格計算
  const previewPrice = async (values: any) => {
    try {
      const token = typeof window !== 'undefined'
        ? (document.cookie.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1] || localStorage.getItem('admin_token'))
        : null;

      const response = await fetch(`${API_BASE_URL}/api/admin/instant-ride-pricing/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          config_id: previewConfigId,
          ...values
        }),
      });

      const result = await response.json();
      if (result.success) {
        setPreviewResult(result.data);
      } else {
        message.error(result.error || '預覽失敗');
      }
    } catch (error: any) {
      console.error('預覽價格錯誤:', error);
      message.error(error.message || '預覽失敗');
    }
  };

  // 打開預覽 Modal
  const openPreviewModal = (config: InstantRidePricing) => {
    setPreviewConfigId(config.id);
    setPreviewResult(null);
    previewForm.setFieldsValue({
      distance_km: 5,
      duration_minutes: 15,
      is_night_time: false
    });
    setPreviewModalVisible(true);
  };

  // 獲取顯示名稱
  const getDisplayName = (config: InstantRidePricing) => {
    if (config.display_name_i18n?.['zh-TW']) return config.display_name_i18n['zh-TW'];
    if (config.display_name_i18n?.['en']) return config.display_name_i18n['en'];
    return VEHICLE_TYPES[config.vehicle_type_code] || config.vehicle_type_code;
  };

  // 表格欄位定義
  const columns: ColumnsType<InstantRidePricing> = [
    {
      title: '國家',
      dataIndex: 'country',
      key: 'country',
      width: 80,
      render: (country: string) => SUPPORTED_COUNTRIES[country] || country,
      filters: Object.entries(SUPPORTED_COUNTRIES).map(([code, name]) => ({ text: name, value: code })),
      onFilter: (value, record) => record.country === value,
    },
    {
      title: '地區',
      dataIndex: 'region',
      key: 'region',
      width: 120,
      render: (region: string, record) => {
        const regions = REGIONS_BY_COUNTRY[record.country];
        const found = regions?.find(r => r.code === region);
        return found?.name || region;
      },
    },
    {
      title: '車型',
      dataIndex: 'vehicle_type_code',
      key: 'vehicle_type_code',
      width: 120,
      render: (_, record) => (
        <Space>
          <span style={{
            display: 'inline-block',
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: record.icon_color
          }} />
          {getDisplayName(record)}
        </Space>
      ),
    },
    {
      title: '座位',
      dataIndex: 'seat_capacity',
      key: 'seat_capacity',
      width: 60,
      align: 'center',
    },
    {
      title: '起跳價',
      dataIndex: 'base_fare',
      key: 'base_fare',
      width: 80,
      align: 'right',
      render: (val: number) => `$${val}`,
    },
    {
      title: '基本里程',
      dataIndex: 'base_distance_km',
      key: 'base_distance_km',
      width: 90,
      align: 'right',
      render: (val: number) => `${val} km`,
    },
    {
      title: '每公里',
      dataIndex: 'fare_per_km',
      key: 'fare_per_km',
      width: 80,
      align: 'right',
      render: (val: number) => `$${val}`,
    },
    {
      title: '夜間加成',
      dataIndex: 'night_surcharge_rate',
      key: 'night_surcharge_rate',
      width: 90,
      align: 'center',
      render: (val: number, record) => (
        <Tag color="purple">{Math.round(val * 100)}% ({record.night_start_hour}:00-{record.night_end_hour}:00)</Tag>
      ),
    },
    {
      title: '春節加成',
      dataIndex: 'spring_festival_enabled',
      key: 'spring_festival',
      width: 100,
      align: 'center',
      render: (enabled: boolean, record) => {
        if (!enabled) return <Tag color="default">未啟用</Tag>;
        return (
          <Tag color="red">
            +${record.spring_festival_surcharge || 30}
          </Tag>
        );
      },
    },
    {
      title: '尖峰倍數',
      dataIndex: 'surge_multiplier',
      key: 'surge_multiplier',
      width: 80,
      align: 'center',
      render: (val: number) => val > 1 ? <Tag color="red">{val}x</Tag> : <Tag>{val}x</Tag>,
    },
    {
      title: '狀態',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 70,
      align: 'center',
      render: (val: boolean) => val ? <Tag color="green">啟用</Tag> : <Tag color="default">停用</Tag>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<CalculatorOutlined />} onClick={() => openPreviewModal(record)} />
          <Button size="small" icon={<EditOutlined />} onClick={() => openModal(record)} />
          <Popconfirm title="確定要停用此配置嗎？" onConfirm={() => deleteConfig(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <Card>
        <div className="mb-6">
          <Title level={2}>
            <CarOutlined className="mr-2" />
            即時派車價格設定
          </Title>
          <Text type="secondary">
            管理不同國家、地區的即時派車計費參數
          </Text>
        </div>

        {/* 統計資訊 */}
        <Row gutter={16} className="mb-6">
          <Col span={6}>
            <Statistic title="總配置數" value={configs.length} prefix={<GlobalOutlined />} />
          </Col>
          <Col span={6}>
            <Statistic title="啟用配置" value={configs.filter(c => c.is_active).length} valueStyle={{ color: '#3f8600' }} />
          </Col>
          <Col span={6}>
            <Statistic title="國家數" value={new Set(configs.map(c => c.country)).size} />
          </Col>
          <Col span={6}>
            <Statistic title="地區數" value={new Set(configs.map(c => `${c.country}-${c.region}`)).size} />
          </Col>
        </Row>

        <Divider />

        {/* 篩選器和操作按鈕 */}
        <Row gutter={16} className="mb-4">
          <Col span={4}>
            <Select
              placeholder="選擇國家"
              allowClear
              style={{ width: '100%' }}
              value={filters.country}
              onChange={(value) => setFilters({ ...filters, country: value, region: undefined })}
            >
              {Object.entries(SUPPORTED_COUNTRIES).map(([code, name]) => (
                <Select.Option key={code} value={code}>{name}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="選擇地區"
              allowClear
              style={{ width: '100%' }}
              value={filters.region}
              onChange={(value) => setFilters({ ...filters, region: value })}
              disabled={!filters.country}
            >
              {(REGIONS_BY_COUNTRY[filters.country || ''] || []).map((region) => (
                <Select.Option key={region.code} value={region.code}>{region.name}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="選擇車型"
              allowClear
              style={{ width: '100%' }}
              value={filters.vehicle_type_code}
              onChange={(value) => setFilters({ ...filters, vehicle_type_code: value })}
            >
              {Object.entries(VEHICLE_TYPES).map(([code, name]) => (
                <Select.Option key={code} value={code}>{name}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col span={12} style={{ textAlign: 'right' }}>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={loadConfigs} loading={loading}>重新載入</Button>
              <Button icon={<CopyOutlined />} onClick={() => setCopyModalVisible(true)}>複製配置</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>新增配置</Button>
            </Space>
          </Col>
        </Row>

        {/* 配置列表表格 */}
        <Table
          columns={columns}
          dataSource={configs}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 條配置`
          }}
        />
      </Card>

      {/* 新增/編輯 Modal */}
      <Modal
        title={editingConfig ? '編輯價格配置' : '新增價格配置'}
        open={modalVisible}
        onCancel={() => { setModalVisible(false); form.resetFields(); }}
        onOk={() => form.submit()}
        width={800}
        okText="儲存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" onFinish={saveConfig}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="國家" name="country" rules={[{ required: true, message: '請選擇國家' }]}>
                <Select onChange={(value) => { setSelectedCountry(value); form.setFieldValue('region', undefined); }}>
                  {Object.entries(SUPPORTED_COUNTRIES).map(([code, name]) => (
                    <Select.Option key={code} value={code}>{name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="地區" name="region" rules={[{ required: true, message: '請選擇地區' }]}>
                <Select>
                  {(REGIONS_BY_COUNTRY[selectedCountry] || []).map((region) => (
                    <Select.Option key={region.code} value={region.code}>{region.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="車型代碼" name="vehicle_type_code" rules={[{ required: true, message: '請選擇車型' }]}>
                <Select>
                  {Object.entries(VEHICLE_TYPES).map(([code, name]) => (
                    <Select.Option key={code} value={code}>{name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item label="座位數" name="seat_capacity" rules={[{ required: true }]}>
                <InputNumber min={1} max={10} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="起跳價 (NT$)" name="base_fare" rules={[{ required: true }]}>
                <InputNumber min={0} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="基本里程 (km)" name="base_distance_km" rules={[{ required: true }]}>
                <InputNumber min={0} precision={2} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="每公里費率 (NT$)" name="fare_per_km" rules={[{ required: true }]}>
                <InputNumber min={0} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item label="每分鐘費率 (NT$)" name="fare_per_minute">
                <InputNumber min={0} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="夜間加成比例" name="night_surcharge_rate" tooltip="例如 0.2 表示加成 20%">
                <InputNumber min={0} max={1} precision={2} step={0.05} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="夜間開始 (時)" name="night_start_hour">
                <InputNumber min={0} max={23} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="夜間結束 (時)" name="night_end_hour">
                <InputNumber min={0} max={23} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item label="尖峰倍數" name="surge_multiplier" tooltip="例如 1.5 表示 1.5 倍">
                <InputNumber min={1} max={5} precision={1} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="最低車資 (NT$)" name="min_fare">
                <InputNumber min={0} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="顯示順序" name="display_order">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="啟用狀態" name="is_active" valuePropName="checked">
                <Switch checkedChildren="啟用" unCheckedChildren="停用" />
              </Form.Item>
            </Col>
          </Row>
          <Divider>春節加成設定</Divider>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item label="春節加成 (NT$)" name="spring_festival_surcharge" tooltip="每趟次加收固定金額（台北市規定 30 元）">
                <InputNumber min={0} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="開始日期" name="spring_festival_start_date" tooltip="春節假期起始日往前加 3 天">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="結束日期" name="spring_festival_end_date" tooltip="春節連假最後 1 日">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="啟用春節加成" name="spring_festival_enabled" valuePropName="checked">
                <Switch checkedChildren="啟用" unCheckedChildren="停用" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 複製配置 Modal */}
      <Modal
        title="複製價格配置"
        open={copyModalVisible}
        onCancel={() => { setCopyModalVisible(false); copyForm.resetFields(); }}
        onOk={() => copyForm.submit()}
        okText="複製"
        cancelText="取消"
      >
        <Form form={copyForm} layout="vertical" onFinish={copyConfig}>
          <Text type="secondary" className="mb-4 block">
            將來源地區的所有車型價格配置複製到目標地區
          </Text>
          <Divider>來源地區</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="來源國家" name="source_country" rules={[{ required: true }]}>
                <Select placeholder="選擇國家">
                  {Object.entries(SUPPORTED_COUNTRIES).map(([code, name]) => (
                    <Select.Option key={code} value={code}>{name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => prevValues.source_country !== currentValues.source_country}
              >
                {({ getFieldValue }) => (
                  <Form.Item label="來源地區" name="source_region" rules={[{ required: true }]}>
                    <Select placeholder="選擇地區">
                      {(REGIONS_BY_COUNTRY[getFieldValue('source_country')] || []).map((region) => (
                        <Select.Option key={region.code} value={region.code}>{region.name}</Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                )}
              </Form.Item>
            </Col>
          </Row>
          <Divider>目標地區</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="目標國家" name="target_country" rules={[{ required: true }]}>
                <Select placeholder="選擇國家">
                  {Object.entries(SUPPORTED_COUNTRIES).map(([code, name]) => (
                    <Select.Option key={code} value={code}>{name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => prevValues.target_country !== currentValues.target_country}
              >
                {({ getFieldValue }) => (
                  <Form.Item label="目標地區" name="target_region" rules={[{ required: true }]}>
                    <Select placeholder="選擇地區">
                      {(REGIONS_BY_COUNTRY[getFieldValue('target_country')] || []).map((region) => (
                        <Select.Option key={region.code} value={region.code}>{region.name}</Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                )}
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 預覽價格 Modal */}
      <Modal
        title="價格計算預覽"
        open={previewModalVisible}
        onCancel={() => { setPreviewModalVisible(false); setPreviewResult(null); }}
        footer={[
          <Button key="close" onClick={() => setPreviewModalVisible(false)}>關閉</Button>,
          <Button key="calc" type="primary" icon={<CalculatorOutlined />} onClick={() => previewForm.submit()}>
            計算價格
          </Button>
        ]}
      >
        <Form form={previewForm} layout="vertical" onFinish={previewPrice}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="距離 (km)" name="distance_km" rules={[{ required: true }]}>
                <InputNumber min={0} precision={1} step={0.5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="時間 (分鐘)" name="duration_minutes">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="夜間時段" name="is_night_time" valuePropName="checked">
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>
            </Col>
          </Row>
        </Form>

        {previewResult && (
          <>
            <Divider>計算結果</Divider>
            <div className="text-center mb-4">
              <Statistic
                title="預估價格"
                value={previewResult.estimated_price}
                prefix={<DollarOutlined />}
                suffix="NT$"
                valueStyle={{ color: '#1890ff', fontSize: 32 }}
              />
            </div>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic title="起跳價" value={previewResult.breakdown.base_fare} prefix="$" />
              </Col>
              <Col span={8}>
                <Statistic title="里程費" value={Math.round(previewResult.breakdown.distance_fare)} prefix="$" />
              </Col>
              <Col span={8}>
                <Statistic title="時間費" value={Math.round(previewResult.breakdown.time_fare)} prefix="$" />
              </Col>
            </Row>
            {previewResult.breakdown.night_surcharge > 0 && (
              <Row gutter={16} className="mt-4">
                <Col span={12}>
                  <Statistic title="夜間加成" value={Math.round(previewResult.breakdown.night_surcharge)} prefix="$" valueStyle={{ color: '#722ed1' }} />
                </Col>
                <Col span={12}>
                  <Statistic title="尖峰倍數" value={previewResult.breakdown.surge_multiplier} suffix="x" />
                </Col>
              </Row>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}

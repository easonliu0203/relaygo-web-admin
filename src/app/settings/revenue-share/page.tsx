'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  message,
  Spin,
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
  Divider
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SearchOutlined,
  GlobalOutlined,
  EnvironmentOutlined,
  CarOutlined,
  PercentageOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

// 常數定義
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.relaygo.pro';

const SERVICE_TYPES = {
  charter: '包車旅遊',
  airport_transfer: '機場接送',
  instant_ride: '即時派車'
};

const SUPPORTED_COUNTRIES = {
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
    { code: 'TPE', name: '台北市' },
    { code: 'NWT', name: '新北市' },
    { code: 'TAO', name: '桃園市' },
    { code: 'TXG', name: '台中市' },
    { code: 'TNN', name: '台南市' },
    { code: 'KHH', name: '高雄市' }
  ],
  JP: [
    { code: 'TYO', name: '東京' },
    { code: 'OSA', name: '大阪' },
    { code: 'KYO', name: '京都' },
    { code: 'FUK', name: '福岡' }
  ],
  KR: [
    { code: 'SEL', name: '首爾' },
    { code: 'PUS', name: '釜山' },
    { code: 'ICN', name: '仁川' }
  ],
  VN: [
    { code: 'HAN', name: '河內' },
    { code: 'SGN', name: '胡志明市' }
  ],
  TH: [
    { code: 'BKK', name: '曼谷' },
    { code: 'CNX', name: '清邁' }
  ],
  MY: [
    { code: 'KUL', name: '吉隆坡' }
  ],
  ID: [
    { code: 'JKT', name: '雅加達' },
    { code: 'DPS', name: '峇里島' }
  ]
};

interface RevenueShareConfig {
  id: string;
  country: string;
  region: string | null;
  service_type: string;
  has_promo_code: boolean;
  company_percentage: number;
  driver_percentage: number;
  company_base_percentage: number | null;
  description: string | null;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function RevenueShareConfigsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [configs, setConfigs] = useState<RevenueShareConfig[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<RevenueShareConfig | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>('TW');

  // 小費金流手續費率（平台不抽小費，此為金流商手續費）
  const [tipFeePercent, setTipFeePercent] = useState<number>(3);
  const [tipFeeSaving, setTipFeeSaving] = useState(false);

  // 篩選狀態
  const [filters, setFilters] = useState({
    country: undefined as string | undefined,
    service_type: undefined as string | undefined,
    has_promo_code: undefined as boolean | undefined,
    is_active: true as boolean | undefined
  });

  useEffect(() => {
    loadConfigs();
  }, [filters]);

  useEffect(() => {
    loadTipFee();
  }, []);

  // 載入配置列表
  const loadConfigs = async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined'
        ? (document.cookie.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1] || localStorage.getItem('admin_token'))
        : null;

      const queryParams = new URLSearchParams();
      if (filters.country) queryParams.append('country', filters.country);
      if (filters.service_type) queryParams.append('service_type', filters.service_type);
      if (filters.has_promo_code !== undefined) queryParams.append('has_promo_code', String(filters.has_promo_code));
      if (filters.is_active !== undefined) queryParams.append('is_active', String(filters.is_active));

      const response = await fetch(`${API_BASE_URL}/api/admin/revenue-share-configs?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
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
  const openModal = (config?: RevenueShareConfig) => {
    if (config) {
      setEditingConfig(config);
      form.setFieldsValue({
        ...config,
        region: config.region || undefined
      });
      setSelectedCountry(config.country);
    } else {
      setEditingConfig(null);
      form.resetFields();
      form.setFieldsValue({
        country: 'TW',
        service_type: 'charter',
        has_promo_code: false,
        is_active: true,
        priority: 0
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
        ? `${API_BASE_URL}/api/admin/revenue-share-configs/${editingConfig.id}`
        : `${API_BASE_URL}/api/admin/revenue-share-configs`;

      const method = editingConfig ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...values,
          created_by: 'admin', // TODO: 從認證系統獲取
          updated_by: 'admin'
        }),
      });

      const result = await response.json();
      if (result.success) {
        message.success(editingConfig ? '配置更新成功' : '配置創建成功');
        setModalVisible(false);
        form.resetFields();
        await loadConfigs();
      } else {
        message.error(result.error || '儲存失敗');
      }
    } catch (error: any) {
      console.error('儲存配置錯誤:', error);
      message.error(error.message || '儲存失敗');
    }
  };

  // 刪除配置
  const deleteConfig = async (id: string) => {
    try {
      const token = typeof window !== 'undefined'
        ? (document.cookie.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1] || localStorage.getItem('admin_token'))
        : null;

      const response = await fetch(`${API_BASE_URL}/api/admin/revenue-share-configs/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          updated_by: 'admin'
        }),
      });

      const result = await response.json();
      if (result.success) {
        message.success('配置已停用');
        await loadConfigs();
      } else {
        message.error(result.error || '刪除失敗');
      }
    } catch (error: any) {
      console.error('刪除配置錯誤:', error);
      message.error(error.message || '刪除失敗');
    }
  };

  // 表格欄位定義
  const columns: ColumnsType<RevenueShareConfig> = [
    {
      title: '國家',
      dataIndex: 'country',
      key: 'country',
      width: 100,
      render: (country: string) => (
        <Tag icon={<GlobalOutlined />} color="blue">
          {SUPPORTED_COUNTRIES[country as keyof typeof SUPPORTED_COUNTRIES] || country}
        </Tag>
      ),
      filters: Object.entries(SUPPORTED_COUNTRIES).map(([code, name]) => ({
        text: name,
        value: code
      })),
      onFilter: (value, record) => record.country === value
    },
    {
      title: '地區',
      dataIndex: 'region',
      key: 'region',
      width: 120,
      render: (region: string | null) => region ? (
        <Tag icon={<EnvironmentOutlined />} color="green">{region}</Tag>
      ) : (
        <Tag color="default">全國通用</Tag>
      )
    },
    {
      title: '服務類型',
      dataIndex: 'service_type',
      key: 'service_type',
      width: 120,
      render: (type: string) => (
        <Tag icon={<CarOutlined />} color="purple">
          {SERVICE_TYPES[type as keyof typeof SERVICE_TYPES] || type}
        </Tag>
      ),
      filters: Object.entries(SERVICE_TYPES).map(([code, name]) => ({
        text: name,
        value: code
      })),
      onFilter: (value, record) => record.service_type === value
    },
    {
      title: '優惠碼',
      dataIndex: 'has_promo_code',
      key: 'has_promo_code',
      width: 100,
      render: (hasPromo: boolean) => (
        <Tag color={hasPromo ? 'orange' : 'default'}>
          {hasPromo ? '使用' : '未使用'}
        </Tag>
      ),
      filters: [
        { text: '使用優惠碼', value: true },
        { text: '未使用優惠碼', value: false }
      ],
      onFilter: (value, record) => record.has_promo_code === value
    },
    {
      title: '公司抽成',
      dataIndex: 'company_percentage',
      key: 'company_percentage',
      width: 100,
      render: (percentage: number) => (
        <Tag icon={<PercentageOutlined />} color="red">
          {percentage}%
        </Tag>
      ),
      sorter: (a, b) => a.company_percentage - b.company_percentage
    },
    {
      title: '司機收入',
      dataIndex: 'driver_percentage',
      key: 'driver_percentage',
      width: 100,
      render: (percentage: number) => (
        <Tag icon={<PercentageOutlined />} color="cyan">
          {percentage}%
        </Tag>
      ),
      sorter: (a, b) => a.driver_percentage - b.driver_percentage
    },
    {
      title: '公司基準',
      dataIndex: 'company_base_percentage',
      key: 'company_base_percentage',
      width: 100,
      render: (percentage: number | null) => percentage ? (
        <Tag color="orange">{percentage}%</Tag>
      ) : (
        <Tag color="default">-</Tag>
      )
    },
    {
      title: '優先級',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      sorter: (a, b) => a.priority - b.priority
    },
    {
      title: '狀態',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? '啟用' : '停用'}
        </Tag>
      ),
      filters: [
        { text: '啟用', value: true },
        { text: '停用', value: false }
      ],
      onFilter: (value, record) => record.is_active === value
    },
    {
      title: '說明',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openModal(record)}
          >
            編輯
          </Button>
          <Popconfirm
            title="確定要停用此配置嗎？"
            onConfirm={() => deleteConfig(record.id)}
            okText="確定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              停用
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const loadTipFee = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/tip-payment-fee`);
      const result = await res.json();
      if (result.success) setTipFeePercent(Number(result.data.percent));
    } catch {
      // 取不到就沿用畫面預設值
    }
  };

  const saveTipFee = async () => {
    setTipFeeSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/tip-payment-fee`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ percent: tipFeePercent }),
      });
      const result = await res.json();
      if (result.success) {
        message.success(result.message || '小費手續費率已更新');
      } else {
        message.error(result.error || '更新失敗');
      }
    } catch {
      message.error('更新失敗');
    } finally {
      setTipFeeSaving(false);
    }
  };

  return (
    <div className="p-6">
      <Card>
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">分潤配置管理</h1>
          <p className="text-gray-600">
            管理基於國家、地區、服務類型、優惠碼狀態的細緻分潤配置
          </p>
        </div>

        {/* 統計資訊 */}
        <Row gutter={16} className="mb-6">
          <Col span={6}>
            <Statistic
              title="總配置數"
              value={configs.length}
              prefix={<GlobalOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="啟用配置"
              value={configs.filter(c => c.is_active).length}
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="國家數"
              value={new Set(configs.map(c => c.country)).size}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="服務類型"
              value={new Set(configs.map(c => c.service_type)).size}
            />
          </Col>
        </Row>

        <Divider />

        {/* 操作按鈕 */}
        <div className="mb-4 flex justify-between">
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openModal()}
            >
              新增配置
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadConfigs}
            >
              重新載入
            </Button>
          </Space>

          <Space>
            <Select
              placeholder="篩選國家"
              allowClear
              style={{ width: 150 }}
              onChange={(value) => setFilters({ ...filters, country: value })}
            >
              {Object.entries(SUPPORTED_COUNTRIES).map(([code, name]) => (
                <Select.Option key={code} value={code}>{name}</Select.Option>
              ))}
            </Select>
            <Select
              placeholder="篩選服務類型"
              allowClear
              style={{ width: 150 }}
              onChange={(value) => setFilters({ ...filters, service_type: value })}
            >
              {Object.entries(SERVICE_TYPES).map(([code, name]) => (
                <Select.Option key={code} value={code}>{name}</Select.Option>
              ))}
            </Select>
          </Space>
        </div>

        {/* 配置列表表格 */}
        <Table
          columns={columns}
          dataSource={configs}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1500 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 條配置`
          }}
        />
      </Card>

      {/* 小費設定：與分潤比例不同維度，另開區塊 */}
      <Card className="mt-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-2">小費設定</h2>
          <p className="text-gray-600">
            平台不從小費抽成。小費扣除金流商手續費後全額給司機，此處設定手續費率。
          </p>
        </div>

        <Space align="end" size={16}>
          <div>
            <div className="mb-1 text-gray-700">金流手續費率</div>
            <InputNumber
              min={0}
              max={100}
              step={0.5}
              value={tipFeePercent}
              onChange={(v) => setTipFeePercent(Number(v ?? 0))}
              addonAfter="%"
              style={{ width: 160 }}
            />
          </div>
          <Button type="primary" loading={tipFeeSaving} onClick={saveTipFee}>
            儲存
          </Button>
        </Space>

        <div className="mt-4 text-gray-500 text-sm leading-6">
          <div>· 客人給小費 NT$1,000 → 司機實得 NT$ {Math.round(1000 * (1 - tipFeePercent / 100)).toLocaleString()}，平台 NT$0</div>
          <div>· 費率會在記錄小費當下鎖進訂單快照，調整後<b>只影響之後的新小費</b>，已成立的訂單維持原費率</div>
          <div>· 現金小費不經公司金流，系統一律以 0% 計算，不受此設定影響</div>
        </div>
      </Card>

      {/* 新增/編輯 Modal */}
      <Modal
        title={editingConfig ? '編輯分潤配置' : '新增分潤配置'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={800}
        okText="儲存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={saveConfig}
          initialValues={{
            country: 'TW',
            service_type: 'charter',
            has_promo_code: false,
            is_active: true,
            priority: 0
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="國家"
                name="country"
                rules={[{ required: true, message: '請選擇國家' }]}
              >
                <Select
                  placeholder="選擇國家"
                  onChange={(value) => {
                    setSelectedCountry(value);
                    form.setFieldValue('region', undefined);
                  }}
                >
                  {Object.entries(SUPPORTED_COUNTRIES).map(([code, name]) => (
                    <Select.Option key={code} value={code}>{name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="地區/城市"
                name="region"
                tooltip="留空表示全國通用"
              >
                <Select
                  placeholder="選擇地區 (可選)"
                  allowClear
                >
                  {REGIONS_BY_COUNTRY[selectedCountry]?.map((region) => (
                    <Select.Option key={region.code} value={region.name}>
                      {region.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="服務類型"
                name="service_type"
                rules={[{ required: true, message: '請選擇服務類型' }]}
              >
                <Select placeholder="選擇服務類型">
                  {Object.entries(SERVICE_TYPES).map(([code, name]) => (
                    <Select.Option key={code} value={code}>{name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={
                  <span>
                    優惠碼狀態
                    <span style={{ color: '#999', fontSize: '12px', marginLeft: '8px' }}>
                      (影響推廣者佣金)
                    </span>
                  </span>
                }
                name="has_promo_code"
                valuePropName="checked"
                tooltip="開啟時，訂單使用優惠碼會產生推廣者佣金，從公司基準百分比中扣除"
              >
                <Switch
                  checkedChildren="使用優惠碼"
                  unCheckedChildren="未使用優惠碼"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={
                  <span>
                    公司抽成比例 (%)
                    <span style={{ color: '#999', fontSize: '12px', marginLeft: '8px' }}>
                      (平台服務費)
                    </span>
                  </span>
                }
                name="company_percentage"
                tooltip="公司從訂單中抽取的百分比，用於平台營運成本"
                rules={[
                  { required: true, message: '請輸入公司抽成比例' },
                  { type: 'number', min: 0, max: 100, message: '比例必須在 0-100 之間' }
                ]}
              >
                <InputNumber
                  min={0}
                  max={100}
                  precision={0}
                  style={{ width: '100%' }}
                  placeholder="例如: 25"
                  onChange={(value) => {
                    if (value !== null) {
                      form.setFieldValue('driver_percentage', 100 - value);
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={
                  <span>
                    司機收入比例 (%)
                    <span style={{ color: '#999', fontSize: '12px', marginLeft: '8px' }}>
                      (自動計算)
                    </span>
                  </span>
                }
                name="driver_percentage"
                tooltip="司機獲得的收入百分比，會自動計算為 100% - 公司抽成比例"
                rules={[
                  { required: true, message: '請輸入司機收入比例' },
                  { type: 'number', min: 0, max: 100, message: '比例必須在 0-100 之間' }
                ]}
              >
                <InputNumber
                  min={0}
                  max={100}
                  precision={0}
                  style={{ width: '100%' }}
                  disabled
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.has_promo_code !== currentValues.has_promo_code
            }
          >
            {({ getFieldValue }) =>
              getFieldValue('has_promo_code') ? (
                <Form.Item
                  label={
                    <span>
                      公司基準百分比 (%)
                      <span style={{ color: '#999', fontSize: '12px', marginLeft: '8px' }}>
                        (推廣者佣金會從此扣除)
                      </span>
                    </span>
                  }
                  name="company_base_percentage"
                  tooltip={{
                    title: (
                      <div>
                        <div><strong>使用場景：</strong>僅在有優惠碼時使用</div>
                        <div style={{ marginTop: '8px' }}><strong>計算邏輯：</strong></div>
                        <div>• 公司基準金額 = 訂單金額 × 公司基準百分比</div>
                        <div>• 推廣者佣金 = 訂單金額 × 推廣者佣金率 (通常 5%)</div>
                        <div>• 公司實際收入 = 公司基準金額 - 推廣者佣金</div>
                        <div style={{ marginTop: '8px' }}><strong>範例：</strong></div>
                        <div>訂單 1000 元，基準 30%，推廣者 5%</div>
                        <div>→ 公司基準 300 元，推廣者 50 元，公司實際 250 元</div>
                      </div>
                    ),
                    overlayStyle: { maxWidth: '400px' }
                  }}
                  rules={[
                    { required: true, message: '請輸入公司基準百分比' },
                    { type: 'number', min: 0, max: 100, message: '比例必須在 0-100 之間' }
                  ]}
                >
                  <InputNumber
                    min={0}
                    max={100}
                    precision={0}
                    style={{ width: '100%' }}
                    placeholder="例如: 30 (表示 30%)"
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={
                  <span>
                    優先級
                    <span style={{ color: '#999', fontSize: '12px', marginLeft: '8px' }}>
                      (數字越大優先級越高)
                    </span>
                  </span>
                }
                name="priority"
                tooltip={{
                  title: (
                    <div>
                      <div><strong>使用場景：</strong>當多個配置符合同一訂單時，選擇優先級最高的配置</div>
                      <div style={{ marginTop: '8px' }}><strong>建議值：</strong></div>
                      <div>• 全國通用配置：0 (預設)</div>
                      <div>• 特定地區配置：10</div>
                      <div>• 特殊活動配置：20</div>
                      <div style={{ marginTop: '8px' }}><strong>範例：</strong></div>
                      <div>台灣全國配置 (優先級 0) vs 台北市配置 (優先級 10)</div>
                      <div>→ 台北市的訂單會使用優先級 10 的配置</div>
                    </div>
                  ),
                  overlayStyle: { maxWidth: '400px' }
                }}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="預設: 0"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="狀態"
                name="is_active"
                valuePropName="checked"
              >
                <Switch
                  checkedChildren="啟用"
                  unCheckedChildren="停用"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="說明"
            name="description"
          >
            <Input.TextArea
              rows={3}
              placeholder="輸入配置說明 (可選)"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}


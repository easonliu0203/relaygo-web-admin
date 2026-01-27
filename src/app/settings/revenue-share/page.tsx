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
const SERVICE_TYPES = {
  charter: '包車旅遊',
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

      const response = await fetch(`/api/admin/revenue-share-configs?${queryParams}`, {
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
        ? `/api/admin/revenue-share-configs/${editingConfig.id}`
        : '/api/admin/revenue-share-configs';

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

      const response = await fetch(`/api/admin/revenue-share-configs/${id}`, {
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
                label="優惠碼狀態"
                name="has_promo_code"
                valuePropName="checked"
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
                label="公司抽成比例 (%)"
                name="company_percentage"
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
                label="司機收入比例 (%)"
                name="driver_percentage"
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
                  label="公司基準百分比 (%)"
                  name="company_base_percentage"
                  tooltip="使用優惠碼時的公司基準百分比，推廣者佣金從此扣除"
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
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="優先級"
                name="priority"
                tooltip="數字越大優先級越高，用於解決衝突"
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
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


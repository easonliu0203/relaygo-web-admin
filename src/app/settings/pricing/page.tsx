'use client';

import { useState, useEffect } from 'react';
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
} from 'antd';
import { 
  DollarOutlined, 
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { createClient } from '@supabase/supabase-js';

const { Title, Text } = Typography;
const { Option } = Select;

// Supabase 客戶端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface VehiclePricing {
  id: string;
  vehicle_type: string;
  vehicle_description: string;
  capacity_info: string;
  duration_hours: number;
  base_price: number;
  overtime_rate: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

const VEHICLE_TYPE_OPTIONS = [
  { value: 'XS', label: 'XS - Extra Small 特小型' },
  { value: 'S', label: 'S - Small 小型' },
  { value: 'M', label: 'M - Medium 中型' },
  { value: 'L', label: 'L - Large 大型' },
  { value: 'XL', label: 'XL - Extra Large 特大型' },
];

const DURATION_OPTIONS = [
  { value: 4, label: '4小時' },
  { value: 6, label: '6小時' },
  { value: 8, label: '8小時' },
];

export default function PricingSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [pricingList, setPricingList] = useState<VehiclePricing[]>([]);
  const [editingKey, setEditingKey] = useState<string>('');
  const [editingRecord, setEditingRecord] = useState<VehiclePricing | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  // 載入價格配置
  const loadPricingList = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehicle_pricing')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      setPricingList(data || []);
    } catch (error: any) {
      message.error(`載入失敗: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 切換啟用狀態
  const toggleActive = async (record: VehiclePricing) => {
    try {
      const { error } = await supabase
        .from('vehicle_pricing')
        .update({ is_active: !record.is_active })
        .eq('id', record.id);

      if (error) throw error;

      message.success(`已${!record.is_active ? '啟用' : '停用'}該方案`);
      loadPricingList();
    } catch (error: any) {
      message.error(`操作失敗: ${error.message}`);
    }
  };

  // 刪除方案
  const deletePricing = async (id: string) => {
    try {
      const { error } = await supabase
        .from('vehicle_pricing')
        .delete()
        .eq('id', id);

      if (error) throw error;

      message.success('刪除成功');
      loadPricingList();
    } catch (error: any) {
      message.error(`刪除失敗: ${error.message}`);
    }
  };

  // 開啟新增/編輯 Modal
  const showModal = (record?: VehiclePricing) => {
    if (record) {
      setEditingRecord(record);
      form.setFieldsValue(record);
    } else {
      setEditingRecord(null);
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  // 儲存方案
  const handleSave = async (values: any) => {
    try {
      if (editingRecord) {
        // 更新
        const { error } = await supabase
          .from('vehicle_pricing')
          .update(values)
          .eq('id', editingRecord.id);

        if (error) throw error;
        message.success('更新成功');
      } else {
        // 新增
        const { error } = await supabase
          .from('vehicle_pricing')
          .insert([values]);

        if (error) throw error;
        message.success('新增成功');
      }

      setIsModalVisible(false);
      form.resetFields();
      loadPricingList();
    } catch (error: any) {
      message.error(`儲存失敗: ${error.message}`);
    }
  };

  useEffect(() => {
    loadPricingList();
  }, []);

  // 表格欄位定義
  const columns = [
    {
      title: '顯示順序',
      dataIndex: 'display_order',
      key: 'display_order',
      width: 100,
      sorter: (a: VehiclePricing, b: VehiclePricing) => a.display_order - b.display_order,
      render: (order: number) => <Tag color="blue">{order}</Tag>,
    },
    {
      title: '狀態',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 120,
      render: (isActive: boolean, record: VehiclePricing) => (
        <Switch
          checked={isActive}
          checkedChildren="啟用"
          unCheckedChildren="停用"
          onChange={() => toggleActive(record)}
        />
      ),
    },
    {
      title: '車型等級',
      dataIndex: 'vehicle_type',
      key: 'vehicle_type',
      width: 120,
      render: (type: string) => {
        const option = VEHICLE_TYPE_OPTIONS.find(opt => opt.value === type);
        return <Tag color="purple">{option?.label || type}</Tag>;
      },
    },
    {
      title: '車型描述',
      dataIndex: 'vehicle_description',
      key: 'vehicle_description',
      width: 150,
    },
    {
      title: '內容描述',
      dataIndex: 'capacity_info',
      key: 'capacity_info',
      width: 150,
    },
    {
      title: '時長',
      dataIndex: 'duration_hours',
      key: 'duration_hours',
      width: 100,
      render: (hours: number) => `${hours}小時`,
    },
    {
      title: '價格',
      dataIndex: 'base_price',
      key: 'base_price',
      width: 120,
      render: (price: number) => (
        <Text strong style={{ color: '#1890ff' }}>
          NT${price.toLocaleString()}
        </Text>
      ),
    },
    {
      title: '超時費/小時',
      dataIndex: 'overtime_rate',
      key: 'overtime_rate',
      width: 120,
      render: (rate: number) => (
        <Tag color="orange">NT${rate}/小時</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: VehiclePricing) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => showModal(record)}
          >
            編輯
          </Button>
          <Popconfirm
            title="確定要刪除此方案嗎？"
            onConfirm={() => deletePricing(record.id)}
            okText="確定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              刪除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={2}>
          <DollarOutlined className="mr-2" />
          車型方案管理
        </Title>
        <Text type="secondary">
          管理包車服務的車型方案和價格設定
        </Text>
      </div>

      <Card
        title={`車型方案列表 (共 ${pricingList.length} 個)`}
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadPricingList}
              loading={loading}
            >
              重新載入
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => showModal()}
            >
              新增方案
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={pricingList}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 新增/編輯 Modal */}
      <Modal
        title={editingRecord ? '編輯車型方案' : '新增車型方案'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            is_active: true,
            display_order: pricingList.length + 1,
          }}
        >
          <Form.Item
            label="車型等級"
            name="vehicle_type"
            rules={[{ required: true, message: '請選擇車型等級' }]}
          >
            <Select placeholder="請選擇車型等級">
              {VEHICLE_TYPE_OPTIONS.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="車型描述"
            name="vehicle_description"
            rules={[{ required: true, message: '請輸入車型描述' }]}
          >
            <Input placeholder="例如：CAMRY 等車型" />
          </Form.Item>

          <Form.Item
            label="內容描述"
            name="capacity_info"
            rules={[{ required: true, message: '請輸入內容描述' }]}
          >
            <Input placeholder="例如：最多3人，2個行李" />
          </Form.Item>

          <Form.Item
            label="時長設定"
            name="duration_hours"
            rules={[{ required: true, message: '請選擇時長' }]}
          >
            <Select placeholder="請選擇時長">
              {DURATION_OPTIONS.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="價格設定 (新台幣)"
            name="base_price"
            rules={[{ required: true, message: '請輸入價格' }]}
          >
            <InputNumber
              min={0}
              precision={0}
              addonBefore="NT$"
              style={{ width: '100%' }}
              placeholder="例如：3800"
            />
          </Form.Item>

          <Form.Item
            label="超時費/小時 (新台幣)"
            name="overtime_rate"
            rules={[{ required: true, message: '請輸入超時費' }]}
          >
            <InputNumber
              min={0}
              precision={0}
              addonBefore="NT$"
              addonAfter="/小時"
              style={{ width: '100%' }}
              placeholder="例如：350"
            />
          </Form.Item>

          <Form.Item
            label="顯示順序"
            name="display_order"
            rules={[{ required: true, message: '請輸入顯示順序' }]}
          >
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              placeholder="數字越小越靠前"
            />
          </Form.Item>

          <Form.Item
            label="狀態"
            name="is_active"
            valuePropName="checked"
          >
            <Switch checkedChildren="啟用" unCheckedChildren="停用" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                儲存
              </Button>
              <Button onClick={() => {
                setIsModalVisible(false);
                form.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}



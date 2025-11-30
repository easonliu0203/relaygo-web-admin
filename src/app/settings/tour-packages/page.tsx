'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Typography, 
  Space, 
  message,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Tag,
  Popconfirm
} from 'antd';
import { 
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SaveOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface TourPackage {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export default function TourPackagesPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [packages, setPackages] = useState<TourPackage[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPackage, setEditingPackage] = useState<TourPackage | null>(null);

  // API Base URL
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.relaygo.pro';

  // 載入旅遊方案列表
  const loadPackages = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/tour-packages`);
      const result = await response.json();
      
      if (result.success) {
        setPackages(result.data || []);
        message.success(`成功載入 ${result.count} 個旅遊方案`);
      } else {
        message.error('載入旅遊方案失敗');
      }
    } catch (error) {
      console.error('載入旅遊方案錯誤:', error);
      message.error('載入旅遊方案失敗');
    } finally {
      setLoading(false);
    }
  };

  // 初始載入
  useEffect(() => {
    loadPackages();
  }, []);

  // 開啟新增/編輯對話框
  const openModal = (pkg?: TourPackage) => {
    if (pkg) {
      setEditingPackage(pkg);
      form.setFieldsValue(pkg);
    } else {
      setEditingPackage(null);
      form.resetFields();
      form.setFieldsValue({
        is_active: true,
        display_order: packages.length + 1
      });
    }
    setModalVisible(true);
  };

  // 關閉對話框
  const closeModal = () => {
    setModalVisible(false);
    setEditingPackage(null);
    form.resetFields();
  };

  // 儲存旅遊方案
  const savePackage = async (values: any) => {
    setSaving(true);
    try {
      const url = editingPackage 
        ? `${API_URL}/api/tour-packages/${editingPackage.id}`
        : `${API_URL}/api/tour-packages`;
      
      const method = editingPackage ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const result = await response.json();
      
      if (result.success) {
        message.success(editingPackage ? '旅遊方案已更新' : '旅遊方案已新增');
        closeModal();
        loadPackages();
      } else {
        message.error(result.error || '儲存失敗');
      }
    } catch (error) {
      console.error('儲存旅遊方案錯誤:', error);
      message.error('儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  // 刪除旅遊方案
  const deletePackage = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/tour-packages/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        message.success('旅遊方案已刪除');
        loadPackages();
      } else {
        message.error(result.error || '刪除失敗');
      }
    } catch (error) {
      console.error('刪除旅遊方案錯誤:', error);
      message.error('刪除失敗');
    }
  };

  // 切換啟用狀態
  const toggleActive = async (pkg: TourPackage) => {
    try {
      const response = await fetch(`${API_URL}/api/tour-packages/${pkg.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...pkg,
          is_active: !pkg.is_active,
        }),
      });

      const result = await response.json();

      if (result.success) {
        message.success(`已${!pkg.is_active ? '啟用' : '停用'}旅遊方案`);
        loadPackages();
      } else {
        message.error(result.error || '更新失敗');
      }
    } catch (error) {
      console.error('更新旅遊方案錯誤:', error);
      message.error('更新失敗');
    }
  };

  // 表格列定義
  const columns = [
    {
      title: '顯示順序',
      dataIndex: 'display_order',
      key: 'display_order',
      width: 100,
      sorter: (a: TourPackage, b: TourPackage) => a.display_order - b.display_order,
      render: (order: number) => (
        <Tag color="blue">{order}</Tag>
      ),
    },
    {
      title: '方案名稱',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <Space>
          <EnvironmentOutlined />
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: '方案描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '狀態',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 120,
      render: (isActive: boolean, record: TourPackage) => (
        <Switch
          checked={isActive}
          checkedChildren="啟用"
          unCheckedChildren="停用"
          onChange={() => toggleActive(record)}
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_: any, record: TourPackage) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => openModal(record)}
          >
            編輯
          </Button>
          <Popconfirm
            title="確定要刪除此旅遊方案嗎？"
            onConfirm={() => deletePackage(record.id)}
            okText="確定"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
            >
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
          <EnvironmentOutlined className="mr-2" />
          旅遊方案管理
        </Title>
        <Text type="secondary">
          管理客戶端訂單流程中的旅遊地點選擇方案
        </Text>
      </div>

      {/* 旅遊方案列表 */}
      <Card
        title="旅遊方案列表"
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadPackages}
              loading={loading}
            >
              重新載入
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openModal()}
            >
              新增方案
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={packages}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 個方案`,
          }}
        />
      </Card>

      {/* 新增/編輯對話框 */}
      <Modal
        title={editingPackage ? '編輯旅遊方案' : '新增旅遊方案'}
        open={modalVisible}
        onCancel={closeModal}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={savePackage}
        >
          <Form.Item
            label="方案名稱"
            name="name"
            rules={[{ required: true, message: '請輸入方案名稱' }]}
          >
            <Input placeholder="例如：台北一日遊" />
          </Form.Item>

          <Form.Item
            label="方案描述"
            name="description"
          >
            <TextArea
              rows={4}
              placeholder="請輸入方案的詳細描述，包含主要景點和特色"
            />
          </Form.Item>

          <Form.Item
            label="顯示順序"
            name="display_order"
            rules={[{ required: true, message: '請輸入顯示順序' }]}
          >
            <InputNumber
              min={1}
              style={{ width: '100%' }}
              placeholder="數字越小越靠前"
            />
          </Form.Item>

          <Form.Item
            label="啟用狀態"
            name="is_active"
            valuePropName="checked"
          >
            <Switch
              checkedChildren="啟用"
              unCheckedChildren="停用"
            />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={closeModal}>
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={saving}
              >
                儲存
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}


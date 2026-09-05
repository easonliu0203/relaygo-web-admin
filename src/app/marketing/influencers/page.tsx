'use client';

import { useState, useEffect } from 'react';
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
  Switch,
  message,
  Popconfirm,
  Tooltip,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  InstagramOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Paragraph, Text } = Typography;

interface Influencer {
  id: string;
  name: string;
  instagram_url: string | null;
  promo_code: string;
  discount_amount_enabled: boolean;
  discount_amount: number;
  discount_percentage_enabled: boolean;
  discount_percentage: number;
  commission_per_order: number;
  account_username: string;
  bank_name: string | null;
  bank_code: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export default function InfluencersPage() {
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingInfluencer, setEditingInfluencer] = useState<Influencer | null>(null);
  const [form] = Form.useForm();

  // API 基礎 URL
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

  // 載入網紅列表
  const loadInfluencers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/influencers`);
      const result = await response.json();

      if (result.success) {
        // ✅ 活動優惠碼（campaign）與推廣人共用同一張表，此頁只列真人推廣者，
        //    活動碼請至「行銷 → 活動優惠」管理
        const rows = (result.data || []).filter(
          (r: { affiliate_type?: string }) => r.affiliate_type !== 'campaign'
        );
        setInfluencers(rows);
        message.success(`成功載入 ${rows.length} 個網紅`);
      } else {
        message.error(result.error || '載入網紅列表失敗');
      }
    } catch (error) {
      console.error('載入網紅列表錯誤:', error);
      message.error('載入網紅列表失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInfluencers();
  }, []);

  // 開啟新增 Modal
  const handleAdd = () => {
    setEditingInfluencer(null);
    form.resetFields();
    form.setFieldsValue({
      commission_per_order: 0, // 預設推廣獎金為 0
    });
    setModalVisible(true);
  };

  // 開啟編輯 Modal
  const handleEdit = (record: Influencer) => {
    setEditingInfluencer(record);
    form.setFieldsValue({
      ...record,
      account_password: '', // 密碼欄位留空（編輯時選填）
    });
    setModalVisible(true);
  };

  // 刪除網紅
  const handleDelete = async (id: string, name: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/influencers/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        message.success(`成功刪除網紅「${name}」`);
        loadInfluencers();
      } else {
        message.error(result.error || '刪除失敗');
      }
    } catch (error) {
      console.error('刪除網紅錯誤:', error);
      message.error('刪除失敗');
    }
  };

  // 複製 ID
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('已複製到剪貼簿');
  };

  // 表格欄位定義
  const columns: ColumnsType<Influencer> = [
    {
      title: '網紅 ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id: string | null) => (
        id ? (
          <Tooltip title="點擊複製完整 ID">
            <Button
              type="link"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => copyToClipboard(id)}
            >
              {id.substring(0, 8)}...
            </Button>
          </Tooltip>
        ) : (
          <Text type="secondary">-</Text>
        )
      ),
    },
    {
      title: '網紅名稱',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: 'IG 連結',
      dataIndex: 'instagram_url',
      key: 'instagram_url',
      width: 150,
      render: (url: string | null) =>
        url ? (
          <a href={url} target="_blank" rel="noopener noreferrer">
            <InstagramOutlined /> 查看
          </a>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: '優惠代碼',
      dataIndex: 'promo_code',
      key: 'promo_code',
      width: 120,
      render: (code: string) => <Text strong>{code}</Text>,
    },
    {
      title: '固定折扣',
      dataIndex: 'discount_amount',
      key: 'discount_amount',
      width: 100,
      render: (_: number, record: Influencer) =>
        record.discount_amount_enabled && record.discount_amount > 0 ? (
          <Text>NT$ {record.discount_amount.toLocaleString()}</Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: '百分比折扣',
      dataIndex: 'discount_percentage',
      key: 'discount_percentage',
      width: 100,
      render: (_: number, record: Influencer) =>
        record.discount_percentage_enabled && record.discount_percentage > 0 ? (
          <Text>{100 - record.discount_percentage} 折</Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: '推廣獎金',
      dataIndex: 'commission_per_order',
      key: 'commission_per_order',
      width: 120,
      render: (amount: number) => (
        <Text>NT$ {amount?.toLocaleString() || 0}</Text>
      ),
    },
    {
      title: '帳號',
      dataIndex: 'account_username',
      key: 'account_username',
      width: 120,
    },
    {
      title: '狀態',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? '啟用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '建立時間',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_: any, record: Influencer) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => window.location.href = `/marketing/influencers/${record.id}`}
          >
            詳情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            編輯
          </Button>
          <Popconfirm
            title={`確定要刪除網紅「${record.name}」嗎？`}
            description="此操作無法復原"
            onConfirm={() => handleDelete(record.id, record.name)}
            okText="確定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              刪除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 儲存網紅（新增或編輯）
  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      const url = editingInfluencer
        ? `${API_BASE_URL}/api/admin/influencers/${editingInfluencer.id}`
        : `${API_BASE_URL}/api/admin/influencers`;

      const method = editingInfluencer ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (result.success) {
        message.success(result.message || '儲存成功');
        setModalVisible(false);
        form.resetFields();
        loadInfluencers();
      } else {
        message.error(result.error || '儲存失敗');
      }
    } catch (error) {
      console.error('儲存網紅錯誤:', error);
      message.error('儲存失敗');
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>網紅管理</Title>
      <Paragraph>
        管理合作網紅資料、優惠碼設定與推廣成效追蹤。
        每個網紅可設定專屬的推廣獎金，當客戶使用該網紅的優惠碼下單時，系統會從司機收入中扣除推廣獎金並支付給網紅。
      </Paragraph>

      {/* 功能按鈕 */}
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增網紅
        </Button>
        <Button icon={<ReloadOutlined />} onClick={loadInfluencers}>
          重新整理
        </Button>
      </Space>

      {/* 網紅列表表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={influencers}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 新增/編輯網紅 Modal */}
      <Modal
        title={editingInfluencer ? '編輯網紅' : '新增網紅'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        width={600}
        okText="儲存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="網紅名稱"
            name="name"
            rules={[
              { required: true, message: '請輸入網紅名稱' },
              { max: 50, message: '最多 50 字' },
            ]}
          >
            <Input placeholder="例如：小明" />
          </Form.Item>

          <Form.Item
            label="IG 連結"
            name="instagram_url"
            rules={[{ type: 'url', message: '請輸入有效的 URL' }]}
          >
            <Input placeholder="例如：https://instagram.com/ming" />
          </Form.Item>

          <Form.Item
            label="優惠代碼"
            name="promo_code"
            rules={[
              { required: true, message: '請輸入優惠代碼' },
              { max: 20, message: '最多 20 字' },
              { pattern: /^[A-Za-z0-9]+$/, message: '只能包含英數字' },
            ]}
          >
            <Input placeholder="例如：MING2024" />
          </Form.Item>

          <Form.Item label="固定折扣金額" style={{ marginBottom: 8 }}>
            <Space>
              <Form.Item
                name="discount_amount_enabled"
                valuePropName="checked"
                noStyle
              >
                <Switch />
              </Form.Item>
              <Form.Item
                name="discount_amount"
                noStyle
                rules={[{ type: 'number', min: 0, message: '必須 ≥ 0' }]}
              >
                <InputNumber
                  placeholder="0"
                  min={0}
                  style={{ width: 150 }}
                  addonBefore="NT$"
                />
              </Form.Item>
            </Space>
          </Form.Item>

          <Form.Item label="百分比折扣" style={{ marginBottom: 8 }}>
            <Space>
              <Form.Item
                name="discount_percentage_enabled"
                valuePropName="checked"
                noStyle
              >
                <Switch />
              </Form.Item>
              <Form.Item
                name="discount_percentage"
                noStyle
                rules={[
                  { type: 'number', min: 0, max: 100, message: '必須在 0-100 之間' },
                ]}
              >
                <InputNumber
                  placeholder="0"
                  min={0}
                  max={100}
                  style={{ width: 150 }}
                  addonAfter="%"
                />
              </Form.Item>
              <Text type="secondary">（例如：5 代表 95 折）</Text>
            </Space>
          </Form.Item>

          <Form.Item
            label="推廣獎金"
            name="commission_per_order"
            tooltip="每筆使用此優惠碼的訂單，網紅可獲得的固定獎金"
            rules={[
              { required: true, message: '請輸入推廣獎金' },
              { type: 'number', min: 0, message: '推廣獎金不可為負數' },
              { type: 'number', max: 10000, message: '推廣獎金不可超過 NT$ 10,000' },
            ]}
            extra={
              <Text type="secondary" style={{ fontSize: '12px' }}>
                此獎金會從司機收入中扣除。當客戶使用此優惠碼下單時，系統會支付此金額給網紅。
              </Text>
            }
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="例如：500"
              prefix="NT$"
              min={0}
              max={10000}
              precision={0}
            />
          </Form.Item>

          <Form.Item
            label="登入帳號"
            name="account_username"
            rules={[
              { required: true, message: '請輸入登入帳號' },
              { max: 50, message: '最多 50 字' },
              { pattern: /^[A-Za-z0-9]+$/, message: '只能包含英數字' },
            ]}
          >
            <Input placeholder="例如：ming123" />
          </Form.Item>

          <Form.Item
            label="登入密碼"
            name="account_password"
            rules={[
              {
                required: !editingInfluencer,
                message: '請輸入登入密碼',
              },
              { min: 6, message: '最少 6 字' },
            ]}
            extra={editingInfluencer ? '留空則不修改密碼' : ''}
          >
            <Input.Password placeholder="最少 6 字" />
          </Form.Item>

          <Form.Item label="銀行名稱" name="bank_name">
            <Input placeholder="例如：台灣銀行" />
          </Form.Item>

          <Form.Item
            label="銀行代號"
            name="bank_code"
            rules={[{ pattern: /^\d{3}$/, message: '必須為 3 碼數字' }]}
          >
            <Input placeholder="例如：004" maxLength={3} />
          </Form.Item>

          <Form.Item label="銀行帳號" name="bank_account_number">
            <Input placeholder="請輸入銀行帳號" />
          </Form.Item>

          <Form.Item label="銀行戶名" name="bank_account_name">
            <Input placeholder="請輸入銀行戶名" />
          </Form.Item>

          <Form.Item
            label="是否啟用"
            name="is_active"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}


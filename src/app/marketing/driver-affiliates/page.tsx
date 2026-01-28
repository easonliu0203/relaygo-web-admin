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
  Tooltip,
  Typography,
  Select,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  ReloadOutlined,
  EditOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  TeamOutlined,
  CarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface DriverAffiliate {
  id: string;
  driver_id: string;
  promo_code: string;
  affiliate_status: 'pending' | 'active' | 'suspended' | 'rejected';
  commission_fixed_enabled: boolean;
  commission_fixed: number;
  commission_percent_enabled: boolean;
  commission_percent: number;
  commission_percent_charter: number | null;
  commission_percent_instant_ride: number | null;
  total_referrals: number;
  total_earnings: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  users?: {
    display_name: string | null;
    email: string | null;
  };
}

export default function DriverAffiliatesPage() {
  const [affiliates, setAffiliates] = useState<DriverAffiliate[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<DriverAffiliate | null>(null);
  const [reviewForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

  const statusColorMap: Record<string, string> = {
    pending: 'orange',
    active: 'green',
    suspended: 'red',
    rejected: 'default',
  };

  const statusTextMap: Record<string, string> = {
    pending: '待審核',
    active: '已啟用',
    suspended: '已暫停',
    rejected: '已拒絕',
  };

  const loadAffiliates = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/api/driver-affiliates`;
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchText) params.append('search', searchText);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        setAffiliates(result.data);
      } else {
        message.error(result.error || '載入司機推廣人列表失敗');
      }
    } catch (error) {
      console.error('載入司機推廣人列表錯誤:', error);
      message.error('載入司機推廣人列表失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAffiliates();
  }, [statusFilter]);

  const handleReview = async (values: { status: string; review_notes: string }) => {
    if (!selectedAffiliate) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/driver-affiliates/${selectedAffiliate.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (result.success) {
        message.success(result.message);
        setReviewModalVisible(false);
        reviewForm.resetFields();
        loadAffiliates();
      } else {
        message.error(result.error || '審核失敗');
      }
    } catch (error) {
      console.error('審核錯誤:', error);
      message.error('審核失敗');
    }
  };

  const handleEdit = async (values: any) => {
    if (!selectedAffiliate) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/driver-affiliates/${selectedAffiliate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (result.success) {
        message.success('更新成功');
        setEditModalVisible(false);
        editForm.resetFields();
        loadAffiliates();
      } else {
        message.error(result.error || '更新失敗');
      }
    } catch (error) {
      console.error('更新錯誤:', error);
      message.error('更新失敗');
    }
  };

  // 表格欄位定義
  const columns: ColumnsType<DriverAffiliate> = [
    {
      title: '司機資訊',
      key: 'driver_info',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.users?.display_name || '未知'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.users?.email || '-'}</Text>
        </Space>
      ),
    },
    {
      title: '推薦碼',
      dataIndex: 'promo_code',
      key: 'promo_code',
      render: (code: string) => <Tag color="blue" style={{ fontFamily: 'monospace' }}>{code}</Tag>,
    },
    {
      title: '狀態',
      dataIndex: 'affiliate_status',
      key: 'affiliate_status',
      render: (status: string) => (
        <Tag color={statusColorMap[status] || 'default'}>{statusTextMap[status] || status}</Tag>
      ),
    },
    {
      title: '分潤設定',
      key: 'commission',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          {record.commission_fixed_enabled && <Text>固定: NT$ {record.commission_fixed}</Text>}
          {record.commission_percent_enabled && <Text>百分比: {record.commission_percent}%</Text>}
          {!record.commission_fixed_enabled && !record.commission_percent_enabled && (
            <Text type="secondary">未設定</Text>
          )}
        </Space>
      ),
    },
    {
      title: '推薦數',
      dataIndex: 'total_referrals',
      key: 'total_referrals',
      align: 'center',
      render: (count: number) => <Tag color="purple">{count} 人</Tag>,
    },
    {
      title: '累計收入',
      dataIndex: 'total_earnings',
      key: 'total_earnings',
      align: 'right',
      render: (earnings: number) => (
        <Text strong style={{ color: '#52c41a' }}>NT$ {earnings.toLocaleString()}</Text>
      ),
    },
    {
      title: '申請時間',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {record.affiliate_status === 'pending' && (
            <Tooltip title="審核">
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => {
                  setSelectedAffiliate(record);
                  reviewForm.resetFields();
                  setReviewModalVisible(true);
                }}
              />
            </Tooltip>
          )}
          <Tooltip title="編輯">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setSelectedAffiliate(record);
                editForm.setFieldsValue({
                  commission_fixed_enabled: record.commission_fixed_enabled,
                  commission_fixed: record.commission_fixed,
                  commission_percent_enabled: record.commission_percent_enabled,
                  commission_percent: record.commission_percent,
                  commission_percent_charter: record.commission_percent_charter,
                  commission_percent_instant_ride: record.commission_percent_instant_ride,
                  is_active: record.is_active,
                });
                setEditModalVisible(true);
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 計算統計數據
  const stats = {
    total: affiliates.length,
    pending: affiliates.filter(a => a.affiliate_status === 'pending').length,
    active: affiliates.filter(a => a.affiliate_status === 'active').length,
    totalEarnings: affiliates.reduce((sum, a) => sum + a.total_earnings, 0),
  };



  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>
        <CarOutlined style={{ marginRight: 8 }} />
        司機推廣人管理
      </Title>

      {/* 統計卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="總推廣人數" value={stats.total} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="待審核" value={stats.pending} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="已啟用" value={stats.active} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="累計發放分潤"
              value={stats.totalEarnings}
              prefix={<DollarOutlined />}
              precision={0}
            />
          </Card>
        </Col>
      </Row>

      {/* 篩選和操作 */}
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
            options={[
              { label: '全部狀態', value: 'all' },
              { label: '待審核', value: 'pending' },
              { label: '已啟用', value: 'active' },
              { label: '已暫停', value: 'suspended' },
              { label: '已拒絕', value: 'rejected' },
            ]}
          />
          <Input.Search
            placeholder="搜尋推薦碼"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={loadAffiliates}
            style={{ width: 200 }}
          />
          <Button icon={<ReloadOutlined />} onClick={loadAffiliates}>
            刷新
          </Button>
        </Space>
      </Card>

      {/* 表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={affiliates}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 審核 Modal */}
      <Modal
        title="審核司機推廣人申請"
        open={reviewModalVisible}
        onCancel={() => setReviewModalVisible(false)}
        footer={null}
      >
        <Form form={reviewForm} onFinish={handleReview} layout="vertical">
          <Form.Item
            name="status"
            label="審核結果"
            rules={[{ required: true, message: '請選擇審核結果' }]}
          >
            <Select
              options={[
                { label: '通過', value: 'active' },
                { label: '拒絕', value: 'rejected' },
              ]}
            />
          </Form.Item>
          <Form.Item name="review_notes" label="審核備註">
            <TextArea rows={3} placeholder="輸入審核備註（選填）" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                確認審核
              </Button>
              <Button onClick={() => setReviewModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>


      {/* 編輯 Modal */}
      <Modal
        title="編輯司機推廣人設定"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form form={editForm} onFinish={handleEdit} layout="vertical">
          <Form.Item
            name="commission_fixed_enabled"
            label="啟用固定金額分潤"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) => prev.commission_fixed_enabled !== cur.commission_fixed_enabled}
          >
            {({ getFieldValue }) =>
              getFieldValue('commission_fixed_enabled') && (
                <Form.Item
                  name="commission_fixed"
                  label="固定分潤金額 (NT$)"
                  rules={[{ required: true, message: '請輸入固定分潤金額' }]}
                >
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              )
            }
          </Form.Item>
          <Form.Item
            name="commission_percent_enabled"
            label="啟用百分比分潤"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) => prev.commission_percent_enabled !== cur.commission_percent_enabled}
          >
            {({ getFieldValue }) =>
              getFieldValue('commission_percent_enabled') && (
                <>
                  <Form.Item
                    name="commission_percent_charter"
                    label="包車旅遊分潤百分比 (%)"
                    rules={[{ required: true, message: '請輸入包車旅遊分潤百分比' }]}
                    extra="適用於 service_type = 'charter' 的訂單"
                  >
                    <InputNumber min={0} max={100} precision={2} style={{ width: '100%' }} placeholder="例如：1.5" />
                  </Form.Item>
                  <Form.Item
                    name="commission_percent_instant_ride"
                    label="即時派單 A→B 點分潤百分比 (%)"
                    rules={[{ required: true, message: '請輸入即時派單分潤百分比' }]}
                    extra="適用於 service_type = 'instant_ride' 的訂單"
                  >
                    <InputNumber min={0} max={100} precision={2} style={{ width: '100%' }} placeholder="例如：2.0" />
                  </Form.Item>
                </>
              )
            }
          </Form.Item>
          <Form.Item name="is_active" label="啟用狀態" valuePropName="checked">
            <Switch checkedChildren="啟用" unCheckedChildren="停用" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                儲存
              </Button>
              <Button onClick={() => setEditModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

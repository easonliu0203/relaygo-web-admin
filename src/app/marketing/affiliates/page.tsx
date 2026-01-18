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
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserAddOutlined,
  DollarOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

interface Affiliate {
  id: string;
  user_id: string;
  name: string;
  promo_code: string;
  affiliate_type: 'customer_affiliate';
  affiliate_status: 'pending' | 'active' | 'suspended' | 'rejected';
  discount_amount_enabled: boolean;
  discount_amount: number;
  discount_percentage_enabled: boolean;
  discount_percentage: number;
  commission_fixed: number;
  commission_percent: number;
  is_commission_fixed_active: boolean;
  is_commission_percent_active: boolean;
  total_referrals: number;
  total_earnings: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
}

export default function AffiliatesPage() {
  const router = useRouter();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [reviewForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  // API 基礎 URL
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

  // 載入推廣人列表
  const loadAffiliates = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/influencers?affiliate_type=customer_affiliate`);
      const result = await response.json();

      if (result.success) {
        setAffiliates(result.data);
        message.success(`成功載入 ${result.count} 個推廣人`);
      } else {
        message.error(result.error || '載入推廣人列表失敗');
      }
    } catch (error) {
      console.error('載入推廣人列表錯誤:', error);
      message.error('載入推廣人列表失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAffiliates();
  }, []);

  // 審核推廣人
  const handleReview = async (values: any) => {
    if (!selectedAffiliate) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/affiliates/${selectedAffiliate.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: values.status,
          reviewed_by: 'admin', // TODO: 從登入狀態獲取
          review_notes: values.review_notes,
        }),
      });

      const result = await response.json();

      if (result.success) {
        message.success('審核成功');
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

  // 更新推廣人設定
  const handleUpdate = async (values: any) => {
    if (!selectedAffiliate) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/influencers/${selectedAffiliate.id}`, {
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

  // 開啟審核 Modal
  const openReviewModal = (record: Affiliate) => {
    setSelectedAffiliate(record);
    reviewForm.setFieldsValue({
      status: 'active',
      review_notes: '',
    });
    setReviewModalVisible(true);
  };

  // 開啟編輯 Modal
  const openEditModal = (record: Affiliate) => {
    setSelectedAffiliate(record);
    editForm.setFieldsValue({
      discount_amount_enabled: record.discount_amount_enabled,
      discount_amount: record.discount_amount,
      discount_percentage_enabled: record.discount_percentage_enabled,
      discount_percentage: record.discount_percentage,
      commission_fixed: record.commission_fixed,
      commission_percent: record.commission_percent,
      is_commission_fixed_active: record.is_commission_fixed_active,
      is_commission_percent_active: record.is_commission_percent_active,
      is_active: record.is_active,
    });
    setEditModalVisible(true);
  };

  // 查看詳情
  const viewDetails = (record: Affiliate) => {
    router.push(`/marketing/affiliates/${record.id}`);
  };

  // 狀態標籤顏色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'active': return 'green';
      case 'suspended': return 'red';
      case 'rejected': return 'default';
      default: return 'default';
    }
  };

  // 狀態文字
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待審核';
      case 'active': return '已通過';
      case 'suspended': return '已暫停';
      case 'rejected': return '已拒絕';
      default: return status;
    }
  };

  // 表格欄位定義
  const columns: ColumnsType<Affiliate> = [
    {
      title: '推廣人姓名',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      width: 150,
    },
    {
      title: '推薦碼',
      dataIndex: 'promo_code',
      key: 'promo_code',
      width: 120,
      render: (code: string) => (
        <Tag color="blue">{code}</Tag>
      ),
    },
    {
      title: '審核狀態',
      dataIndex: 'affiliate_status',
      key: 'affiliate_status',
      width: 120,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
    },
    {
      title: '推薦人數',
      dataIndex: 'total_referrals',
      key: 'total_referrals',
      width: 100,
      align: 'center',
      render: (count: number) => <Text strong>{count}</Text>,
    },
    {
      title: '累積收益',
      dataIndex: 'total_earnings',
      key: 'total_earnings',
      width: 120,
      align: 'right',
      render: (earnings: number) => (
        <Text type="success" strong>NT$ {earnings.toLocaleString()}</Text>
      ),
    },
    {
      title: '折扣設定',
      key: 'discount',
      width: 150,
      render: (_, record) => (
        <Space direction="vertical" size="small">
          {record.discount_amount_enabled && (
            <Tag color="green">固定 NT$ {record.discount_amount}</Tag>
          )}
          {record.discount_percentage_enabled && (
            <Tag color="blue">{record.discount_percentage}% 折扣</Tag>
          )}
          {!record.discount_amount_enabled && !record.discount_percentage_enabled && (
            <Text type="secondary">無折扣</Text>
          )}
        </Space>
      ),
    },
    {
      title: '分潤設定',
      key: 'commission',
      width: 150,
      render: (_, record) => (
        <Space direction="vertical" size="small">
          {record.is_commission_fixed_active && (
            <Tag color="orange">固定 NT$ {record.commission_fixed}</Tag>
          )}
          {record.is_commission_percent_active && (
            <Tag color="purple">{record.commission_percent}% 分潤</Tag>
          )}
          {!record.is_commission_fixed_active && !record.is_commission_percent_active && (
            <Text type="secondary">無分潤</Text>
          )}
        </Space>
      ),
    },
    {
      title: '啟用狀態',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      align: 'center',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? '啟用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '申請時間',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看詳情">
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => viewDetails(record)}
            />
          </Tooltip>
          {record.affiliate_status === 'pending' && (
            <Tooltip title="審核">
              <Button
                type="link"
                icon={<CheckCircleOutlined />}
                onClick={() => openReviewModal(record)}
              />
            </Tooltip>
          )}
          <Tooltip title="編輯設定">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 篩選後的資料
  const filteredAffiliates = affiliates.filter(affiliate => {
    const matchesStatus = statusFilter === 'all' || affiliate.affiliate_status === statusFilter;
    const matchesSearch = !searchText ||
      affiliate.name.toLowerCase().includes(searchText.toLowerCase()) ||
      affiliate.promo_code.toLowerCase().includes(searchText.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // 統計數據
  const stats = {
    total: affiliates.length,
    pending: affiliates.filter(a => a.affiliate_status === 'pending').length,
    active: affiliates.filter(a => a.affiliate_status === 'active').length,
    totalReferrals: affiliates.reduce((sum, a) => sum + a.total_referrals, 0),
    totalEarnings: affiliates.reduce((sum, a) => sum + a.total_earnings, 0),
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <UserAddOutlined /> 客戶推廣人管理
      </Title>
      <Paragraph>
        管理客戶推廣人申請、審核、折扣與分潤設定。客戶推廣人可以推薦其他客戶使用服務，並獲得推薦獎勵。
      </Paragraph>

      {/* 統計卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="總推廣人數"
              value={stats.total}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待審核"
              value={stats.pending}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="累積推薦人數"
              value={stats.totalReferrals}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="累積支付收益"
              value={stats.totalEarnings}
              precision={0}
              prefix={<DollarOutlined />}
              suffix="NT$"
            />
          </Card>
        </Col>
      </Row>

      {/* 搜尋和篩選 */}
      <Card style={{ marginBottom: 16 }}>
        <Space size="middle" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Input.Search
              placeholder="搜尋姓名或推薦碼"
              allowClear
              style={{ width: 250 }}
              onSearch={setSearchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <Select
              style={{ width: 150 }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { label: '全部狀態', value: 'all' },
                { label: '待審核', value: 'pending' },
                { label: '已通過', value: 'active' },
                { label: '已暫停', value: 'suspended' },
                { label: '已拒絕', value: 'rejected' },
              ]}
            />
          </Space>
          <Button icon={<ReloadOutlined />} onClick={loadAffiliates} loading={loading}>
            重新整理
          </Button>
        </Space>
      </Card>

      {/* 推廣人列表表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredAffiliates}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1500 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 個推廣人`,
          }}
        />
      </Card>

      {/* 審核 Modal */}
      <Modal
        title={
          <Space>
            <CheckCircleOutlined />
            審核推廣人申請
          </Space>
        }
        open={reviewModalVisible}
        onOk={() => reviewForm.submit()}
        onCancel={() => {
          setReviewModalVisible(false);
          reviewForm.resetFields();
        }}
        width={600}
      >
        {selectedAffiliate && (
          <div style={{ marginBottom: 16 }}>
            <Text strong>推廣人：</Text> {selectedAffiliate.name}<br />
            <Text strong>推薦碼：</Text> <Tag color="blue">{selectedAffiliate.promo_code}</Tag><br />
            <Text strong>申請時間：</Text> {dayjs(selectedAffiliate.created_at).format('YYYY-MM-DD HH:mm')}
          </div>
        )}
        <Form
          form={reviewForm}
          layout="vertical"
          onFinish={handleReview}
        >
          <Form.Item
            name="status"
            label="審核結果"
            rules={[{ required: true, message: '請選擇審核結果' }]}
          >
            <Select
              options={[
                { label: '✅ 通過申請', value: 'active' },
                { label: '❌ 拒絕申請', value: 'rejected' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="review_notes"
            label="審核備註"
          >
            <TextArea rows={4} placeholder="請輸入審核備註（選填）" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 編輯設定 Modal */}
      <Modal
        title={
          <Space>
            <EditOutlined />
            編輯推廣人設定
          </Space>
        }
        open={editModalVisible}
        onOk={() => editForm.submit()}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
        }}
        width={700}
      >
        {selectedAffiliate && (
          <div style={{ marginBottom: 16 }}>
            <Text strong>推廣人：</Text> {selectedAffiliate.name}<br />
            <Text strong>推薦碼：</Text> <Tag color="blue">{selectedAffiliate.promo_code}</Tag>
          </div>
        )}
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdate}
        >
          <Title level={5}>折扣設定</Title>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="discount_amount_enabled"
                label="啟用固定金額折扣"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item
                name="discount_amount"
                label="固定折扣金額 (NT$)"
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="discount_percentage_enabled"
                label="啟用百分比折扣"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item
                name="discount_percentage"
                label="折扣百分比 (%)"
              >
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Title level={5} style={{ marginTop: 16 }}>分潤設定</Title>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="is_commission_fixed_active"
                label="啟用固定金額分潤"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item
                name="commission_fixed"
                label="固定分潤金額 (NT$)"
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="is_commission_percent_active"
                label="啟用百分比分潤"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item
                name="commission_percent"
                label="分潤百分比 (%)"
              >
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="is_active"
            label="啟用狀態"
            valuePropName="checked"
          >
            <Switch checkedChildren="啟用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  Descriptions,
  Table,
  Button,
  Space,
  Tag,
  Statistic,
  Row,
  Col,
  Typography,
  message,
  Spin,
  Empty,
} from 'antd';
import {
  ArrowLeftOutlined,
  DollarOutlined,
  TeamOutlined,
  ShoppingOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useRouter, useParams } from 'next/navigation';

const { Title, Text } = Typography;

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
  // ✅ 新增：服務類型維度分潤欄位
  commission_type: 'unified' | 'by_service_type';
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
}

interface Referral {
  id: string;
  referee_id: string;
  referee_name: string;
  first_booking_id: string | null;
  created_at: string;
}

interface CommissionRecord {
  id: string;
  booking_id: string | null;
  order_amount: number;
  commission_amount: number;
  commission_type: 'fixed' | 'percent';
  commission_rate: number | null;
  commission_status: 'pending' | 'paid' | 'cancelled';
  used_at: string;
}

export default function AffiliateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const affiliateId = params.id as string;

  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

  // 載入推廣人詳情
  const loadAffiliateDetail = async () => {
    setLoading(true);
    try {
      // 載入推廣人基本資料
      const affiliateResponse = await fetch(`${API_BASE_URL}/api/admin/influencers/${affiliateId}`);
      const affiliateResult = await affiliateResponse.json();

      if (affiliateResult.success) {
        setAffiliate(affiliateResult.data);
      } else {
        message.error('載入推廣人資料失敗');
      }

      // 載入推薦記錄
      const referralsResponse = await fetch(`${API_BASE_URL}/api/admin/influencers/${affiliateId}/referrals`);
      const referralsResult = await referralsResponse.json();

      if (referralsResult.success) {
        setReferrals(referralsResult.data || []);
      }

      // 載入分潤記錄
      const commissionsResponse = await fetch(`${API_BASE_URL}/api/admin/influencers/${affiliateId}/commissions`);
      const commissionsResult = await commissionsResponse.json();

      if (commissionsResult.success) {
        setCommissions(commissionsResult.data || []);
      }
    } catch (error) {
      console.error('載入推廣人詳情錯誤:', error);
      message.error('載入推廣人詳情失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (affiliateId) {
      loadAffiliateDetail();
    }
  }, [affiliateId]);

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

  // 分潤狀態顏色
  const getCommissionStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'paid': return 'green';
      case 'cancelled': return 'red';
      default: return 'default';
    }
  };

  // 分潤狀態文字
  const getCommissionStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待支付';
      case 'paid': return '已支付';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  // 推薦記錄表格欄位
  const referralColumns: ColumnsType<Referral> = [
    {
      title: '被推薦人',
      dataIndex: 'referee_name',
      key: 'referee_name',
    },
    {
      title: '首次訂單 ID',
      dataIndex: 'first_booking_id',
      key: 'first_booking_id',
      render: (id: string | null) => id ? <Text code>{id.substring(0, 8)}...</Text> : <Text type="secondary">-</Text>,
    },
    {
      title: '推薦時間',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
  ];

  // 分潤記錄表格欄位
  const commissionColumns: ColumnsType<CommissionRecord> = [
    {
      title: '訂單 ID',
      dataIndex: 'booking_id',
      key: 'booking_id',
      render: (id: string | null) => id ? <Text code>{id.substring(0, 8)}...</Text> : <Text type="secondary">-</Text>,
    },
    {
      title: '訂單金額',
      dataIndex: 'order_amount',
      key: 'order_amount',
      align: 'right',
      render: (amount: number) => `NT$ ${amount.toLocaleString()}`,
    },
    {
      title: '分潤類型',
      dataIndex: 'commission_type',
      key: 'commission_type',
      render: (type: string, record) => {
        if (type === 'fixed') {
          return <Tag color="orange">固定金額</Tag>;
        } else {
          return <Tag color="purple">{record.commission_rate}% 分潤</Tag>;
        }
      },
    },
    {
      title: '分潤金額',
      dataIndex: 'commission_amount',
      key: 'commission_amount',
      align: 'right',
      render: (amount: number) => (
        <Text type="success" strong>NT$ {amount.toLocaleString()}</Text>
      ),
    },
    {
      title: '狀態',
      dataIndex: 'commission_status',
      key: 'commission_status',
      render: (status: string) => (
        <Tag color={getCommissionStatusColor(status)}>
          {getCommissionStatusText(status)}
        </Tag>
      ),
    },
    {
      title: '使用時間',
      dataIndex: 'used_at',
      key: 'used_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!affiliate) {
    return (
      <div style={{ padding: '24px' }}>
        <Empty description="找不到推廣人資料" />
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button onClick={() => router.back()}>返回列表</Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 返回按鈕 */}
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => router.back()}
        style={{ marginBottom: 16 }}
      >
        返回列表
      </Button>

      <Title level={2}>推廣人詳情</Title>

      {/* 統計卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="推薦人數"
              value={affiliate.total_referrals}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="累積收益"
              value={affiliate.total_earnings}
              precision={0}
              prefix={<DollarOutlined />}
              suffix="NT$"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待支付分潤"
              value={commissions.filter(c => c.commission_status === 'pending').length}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="加入天數"
              value={dayjs().diff(dayjs(affiliate.created_at), 'day')}
              prefix={<CalendarOutlined />}
              suffix="天"
            />
          </Card>
        </Col>
      </Row>

      {/* 基本資料 */}
      <Card title="基本資料" style={{ marginBottom: 16 }}>
        <Descriptions column={2} bordered>
          <Descriptions.Item label="推廣人姓名">{affiliate.name}</Descriptions.Item>
          <Descriptions.Item label="推薦碼">
            <Tag color="blue" style={{ fontSize: 16 }}>{affiliate.promo_code}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="審核狀態">
            <Tag color={getStatusColor(affiliate.affiliate_status)}>
              {getStatusText(affiliate.affiliate_status)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="啟用狀態">
            <Tag color={affiliate.is_active ? 'success' : 'default'}>
              {affiliate.is_active ? '啟用' : '停用'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="申請時間">
            {dayjs(affiliate.created_at).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="更新時間">
            {dayjs(affiliate.updated_at).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          {affiliate.reviewed_at && (
            <>
              <Descriptions.Item label="審核時間">
                {dayjs(affiliate.reviewed_at).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="審核人">
                {affiliate.reviewed_by || '-'}
              </Descriptions.Item>
            </>
          )}
          {affiliate.review_notes && (
            <Descriptions.Item label="審核備註" span={2}>
              {affiliate.review_notes}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* 折扣設定 */}
      <Card title="折扣設定" style={{ marginBottom: 16 }}>
        <Descriptions column={2} bordered>
          <Descriptions.Item label="固定金額折扣">
            {affiliate.discount_amount_enabled ? (
              <Tag color="green">啟用 - NT$ {affiliate.discount_amount}</Tag>
            ) : (
              <Tag>未啟用</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="百分比折扣">
            {affiliate.discount_percentage_enabled ? (
              <Tag color="blue">啟用 - {affiliate.discount_percentage}%</Tag>
            ) : (
              <Tag>未啟用</Tag>
            )}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 分潤設定 */}
      <Card title="分潤設定" style={{ marginBottom: 16 }}>
        <Descriptions column={2} bordered>
          <Descriptions.Item label="固定金額分潤">
            {affiliate.is_commission_fixed_active ? (
              <Tag color="orange">啟用 - NT$ {affiliate.commission_fixed}</Tag>
            ) : (
              <Tag>未啟用</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="百分比分潤">
            {affiliate.is_commission_percent_active ? (
              <>
                {affiliate.commission_type === 'by_service_type' ? (
                  <>
                    <Tag color="blue" style={{ marginBottom: 4 }}>依服務類型</Tag><br />
                    <Tag color="purple">包車旅遊: {affiliate.commission_percent_charter ?? 0}%</Tag><br />
                    <Tag color="cyan">即時派車: {affiliate.commission_percent_instant_ride ?? 0}%</Tag>
                  </>
                ) : (
                  <>
                    <Tag color="blue" style={{ marginBottom: 4 }}>統一比例</Tag><br />
                    <Tag color="purple">{affiliate.commission_percent}%</Tag>
                  </>
                )}
              </>
            ) : (
              <Tag>未啟用</Tag>
            )}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 推薦記錄 */}
      <Card title={`推薦記錄 (${referrals.length})`} style={{ marginBottom: 16 }}>
        <Table
          columns={referralColumns}
          dataSource={referrals}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: '暫無推薦記錄' }}
        />
      </Card>

      {/* 分潤記錄 */}
      <Card title={`分潤記錄 (${commissions.length})`}>
        <Table
          columns={commissionColumns}
          dataSource={commissions}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: '暫無分潤記錄' }}
          summary={(pageData) => {
            const totalCommission = pageData.reduce((sum, record) => sum + record.commission_amount, 0);
            return (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3}>
                    <Text strong>本頁小計</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">
                    <Text type="success" strong>NT$ {totalCommission.toLocaleString()}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} colSpan={2} />
                </Table.Summary.Row>
              </Table.Summary>
            );
          }}
        />
      </Card>
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  Table,
  Button,
  Space,
  Statistic,
  Row,
  Col,
  Typography,
  Tag,
  Spin,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  InstagramOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text, Link } = Typography;

interface InfluencerPerformance {
  influencer: {
    id: string;
    name: string;
    instagram_url: string | null;
    promo_code: string;
    commission_per_order: number;
  };
  statistics: {
    total_usage_count: number;
    total_commission: number;
    current_month_usage_count: number;
    current_month_commission: number;
  };
  usage_history: Array<{
    id: string;
    booking_id: string;
    customer_name: string;
    customer_email: string;
    used_at: string;
    original_price: number;
    final_price: number;
    commission_amount: number;
    booking_status: string;
  }>;
}

export default function InfluencerPerformancePage() {
  const params = useParams();
  const router = useRouter();
  const influencerId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [performance, setPerformance] = useState<InfluencerPerformance | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

  // 載入網紅績效資料
  const loadPerformance = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/influencers/${influencerId}/performance`);
      const result = await response.json();

      if (result.success) {
        setPerformance(result.data);
      } else {
        message.error(result.error || '載入績效資料失敗');
      }
    } catch (error) {
      console.error('載入績效資料錯誤:', error);
      message.error('載入績效資料失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPerformance();
  }, [influencerId]);

  // 訂單狀態標籤
  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending_deposit: { color: 'orange', text: '待付訂金' },
      paid_deposit: { color: 'blue', text: '已付訂金' },
      assigned: { color: 'cyan', text: '已派單' },
      in_progress: { color: 'processing', text: '進行中' },
      completed: { color: 'success', text: '已完成' },
      cancelled: { color: 'error', text: '已取消' },
    };
    const statusInfo = statusMap[status] || { color: 'default', text: status };
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
  };

  // 使用記錄表格欄位
  const columns: ColumnsType<InfluencerPerformance['usage_history'][0]> = [
    {
      title: '訂單編號',
      dataIndex: 'booking_id',
      key: 'booking_id',
      width: 280,
      render: (id: string) => (
        <Text copyable={{ text: id }} style={{ fontSize: '12px' }}>
          {id.substring(0, 8)}...
        </Text>
      ),
    },
    {
      title: '客戶名稱',
      dataIndex: 'customer_name',
      key: 'customer_name',
      width: 120,
    },
    {
      title: '使用時間',
      dataIndex: 'used_at',
      key: 'used_at',
      width: 150,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '原價',
      dataIndex: 'original_price',
      key: 'original_price',
      width: 100,
      render: (price: number) => `NT$ ${price.toLocaleString()}`,
    },
    {
      title: '折扣後',
      dataIndex: 'final_price',
      key: 'final_price',
      width: 100,
      render: (price: number) => `NT$ ${price.toLocaleString()}`,
    },
    {
      title: '推廣獎金',
      dataIndex: 'commission_amount',
      key: 'commission_amount',
      width: 100,
      render: (amount: number) => (
        <Text strong style={{ color: '#52c41a' }}>
          NT$ {amount.toLocaleString()}
        </Text>
      ),
    },
    {
      title: '訂單狀態',
      dataIndex: 'booking_status',
      key: 'booking_status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
  ];

  if (loading && !performance) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!performance) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Text type="secondary">無法載入績效資料</Text>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 頁面標題 */}
      <Space style={{ marginBottom: 24 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push('/marketing/influencers')}
        >
          返回
        </Button>
        <Title level={2} style={{ margin: 0 }}>
          網紅推廣績效
        </Title>
      </Space>

      {/* 網紅基本資訊 */}
      <Card title="網紅資訊" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Text type="secondary">網紅名稱</Text>
            <div>
              <Text strong style={{ fontSize: 16 }}>
                {performance.influencer.name}
              </Text>
            </div>
          </Col>
          <Col span={6}>
            <Text type="secondary">優惠代碼</Text>
            <div>
              <Text strong style={{ fontSize: 16 }}>
                {performance.influencer.promo_code}
              </Text>
            </div>
          </Col>
          <Col span={6}>
            <Text type="secondary">當前推廣獎金</Text>
            <div>
              <Text strong style={{ fontSize: 16, color: '#52c41a' }}>
                NT$ {performance.influencer.commission_per_order.toLocaleString()}
              </Text>
            </div>
          </Col>
          <Col span={6}>
            {performance.influencer.instagram_url && (
              <>
                <Text type="secondary">Instagram</Text>
                <div>
                  <Link
                    href={performance.influencer.instagram_url}
                    target="_blank"
                  >
                    <InstagramOutlined /> 查看 IG
                  </Link>
                </div>
              </>
            )}
          </Col>
        </Row>
      </Card>

      {/* 推廣統計 */}
      <Card title="推廣統計" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="總使用次數"
              value={performance.statistics.total_usage_count}
              suffix="次"
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="總推廣獎金"
              value={performance.statistics.total_commission}
              prefix="NT$"
              precision={0}
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="本月使用次數"
              value={performance.statistics.current_month_usage_count}
              suffix="次"
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="本月推廣獎金"
              value={performance.statistics.current_month_commission}
              prefix="NT$"
              precision={0}
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
        </Row>
      </Card>

      {/* 使用記錄 */}
      <Card
        title="使用記錄"
        extra={
          <Button icon={<ReloadOutlined />} onClick={loadPerformance}>
            重新整理
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={performance.usage_history}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
          scroll={{ x: 1000 }}
        />
      </Card>
    </div>
  );
}



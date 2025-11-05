'use client';

import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Progress, Space, Spin, message } from 'antd';
import {
  StarOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ReviewStatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<any>(null);

  // 載入統計數據
  const loadStatistics = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/reviews/statistics');
      const data = await response.json();

      if (data.success) {
        setStatistics(data.data);
      } else {
        throw new Error(data.error || '載入統計數據失敗');
      }
    } catch (error: any) {
      console.error('❌ 載入統計數據失敗:', error);
      message.error(error.message || '載入統計數據失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!statistics) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <p>無法載入統計數據</p>
        </Card>
      </div>
    );
  }

  const { overview, ratingDistribution, ratingTrend, topDriversByReviewCount, topDriversByRating } = statistics;

  // Top 司機表格列
  const driverColumns = [
    {
      title: '排名',
      key: 'rank',
      width: 80,
      render: (_: any, __: any, index: number) => (
        <Space>
          {index < 3 && <TrophyOutlined style={{ color: ['#FFD700', '#C0C0C0', '#CD7F32'][index] }} />}
          <span>{index + 1}</span>
        </Space>
      ),
    },
    {
      title: '司機',
      dataIndex: 'driver_name',
      key: 'driver_name',
      render: (text: string) => text || '-',
    },
    {
      title: '評價數',
      dataIndex: 'review_count',
      key: 'review_count',
      sorter: (a: any, b: any) => a.review_count - b.review_count,
    },
    {
      title: '平均評分',
      dataIndex: 'average_rating',
      key: 'average_rating',
      render: (rating: number) => (
        <Space>
          <StarOutlined style={{ color: '#faad14' }} />
          <span>{rating?.toFixed(2) || '-'}</span>
        </Space>
      ),
      sorter: (a: any, b: any) => a.average_rating - b.average_rating,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ marginBottom: 24 }}>評價統計報表</h1>

      {/* 總體統計 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="總評價數"
              value={overview.totalReviews}
              prefix={<StarOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均評分"
              value={overview.averageRating}
              precision={2}
              prefix={<StarOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待審核"
              value={overview.pendingReviews}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#ff7a45' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已批准"
              value={overview.approvedReviews}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="已拒絕"
              value={overview.rejectedReviews}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已隱藏"
              value={overview.hiddenReviews}
              valueStyle={{ color: '#999' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均審核時間"
              value={overview.averageReviewTimeHours}
              precision={1}
              suffix="小時"
            />
          </Card>
        </Col>
      </Row>

      {/* 評分分布 */}
      <Card title="評分分布" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          {Object.entries(ratingDistribution)
            .reverse()
            .map(([rating, count]) => {
              const percentage = overview.totalReviews > 0 ? ((count as number) / overview.totalReviews) * 100 : 0;
              return (
                <Col span={24} key={rating} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: 80 }}>
                      <Space>
                        <StarOutlined style={{ color: '#faad14' }} />
                        <span>{rating} 星</span>
                      </Space>
                    </div>
                    <div style={{ flex: 1, marginLeft: 16 }}>
                      <Progress
                        percent={percentage}
                        format={() => `${count} (${percentage.toFixed(1)}%)`}
                        strokeColor={{
                          '0%': '#108ee9',
                          '100%': '#87d068',
                        }}
                      />
                    </div>
                  </div>
                </Col>
              );
            })}
        </Row>
      </Card>

      {/* 評價趨勢 */}
      {ratingTrend && ratingTrend.length > 0 && (
        <Card title="最近 30 天評價趨勢" style={{ marginBottom: 24 }}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={ratingTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#1890ff" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Top 司機排行榜 */}
      <Row gutter={16}>
        <Col span={12}>
          <Card title="評價數量 Top 10">
            <Table
              columns={driverColumns}
              dataSource={topDriversByReviewCount}
              rowKey="driver_id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="評分最高 Top 10">
            <Table
              columns={driverColumns}
              dataSource={topDriversByRating}
              rowKey="driver_id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}


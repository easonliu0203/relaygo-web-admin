'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, Input, Select, Row, Col, Statistic, Space, message, Modal } from 'antd';
import {
  StarOutlined,
  SearchOutlined,
  EyeOutlined,
  FilterOutlined,
  ReloadOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;

export default function ReviewsPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 統計數據
  const [statistics, setStatistics] = useState({
    totalReviews: 0,
    averageRating: 0,
    pendingReviews: 0,
    approvedReviews: 0,
    rejectedReviews: 0,
  });

  // 批量操作
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [batchActionLoading, setBatchActionLoading] = useState(false);

  // 載入評價資料
  const loadReviews = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (searchText) {
        params.append('search', searchText);
      }

      const response = await fetch(`/api/admin/reviews?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setReviews(data.data.reviews);
        setTotal(data.data.pagination.total);
      } else {
        throw new Error(data.error || '載入評價失敗');
      }
    } catch (error: any) {
      console.error('❌ 載入評價失敗:', error);
      message.error(error.message || '載入評價失敗');
    } finally {
      setLoading(false);
    }
  };

  // 載入統計數據
  const loadStatistics = async () => {
    try {
      const response = await fetch('/api/admin/reviews/statistics');
      const data = await response.json();

      if (data.success) {
        setStatistics({
          totalReviews: data.data.overview.totalReviews,
          averageRating: data.data.overview.averageRating,
          pendingReviews: data.data.overview.pendingReviews,
          approvedReviews: data.data.overview.approvedReviews,
          rejectedReviews: data.data.overview.rejectedReviews,
        });
      }
    } catch (error) {
      console.error('❌ 載入統計數據失敗:', error);
    }
  };

  useEffect(() => {
    loadReviews();
    loadStatistics();
  }, [currentPage, pageSize, statusFilter]);

  // 批量批准
  const handleBatchApprove = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('請選擇要批准的評價');
      return;
    }

    Modal.confirm({
      title: '批量批准評價',
      content: `確定要批准選中的 ${selectedRowKeys.length} 條評價嗎？`,
      onOk: async () => {
        setBatchActionLoading(true);
        try {
          const response = await fetch('/api/admin/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'approve',
              reviewIds: selectedRowKeys,
            }),
          });

          const data = await response.json();

          if (data.success) {
            message.success(`成功批准 ${data.data.successCount} 條評價`);
            setSelectedRowKeys([]);
            loadReviews();
            loadStatistics();
          } else {
            throw new Error(data.error || '批量批准失敗');
          }
        } catch (error: any) {
          message.error(error.message || '批量批准失敗');
        } finally {
          setBatchActionLoading(false);
        }
      },
    });
  };

  // 批量拒絕
  const handleBatchReject = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('請選擇要拒絕的評價');
      return;
    }

    Modal.confirm({
      title: '批量拒絕評價',
      content: `確定要拒絕選中的 ${selectedRowKeys.length} 條評價嗎？`,
      onOk: async () => {
        setBatchActionLoading(true);
        try {
          const response = await fetch('/api/admin/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'reject',
              reviewIds: selectedRowKeys,
            }),
          });

          const data = await response.json();

          if (data.success) {
            message.success(`成功拒絕 ${data.data.successCount} 條評價`);
            setSelectedRowKeys([]);
            loadReviews();
            loadStatistics();
          } else {
            throw new Error(data.error || '批量拒絕失敗');
          }
        } catch (error: any) {
          message.error(error.message || '批量拒絕失敗');
        } finally {
          setBatchActionLoading(false);
        }
      },
    });
  };

  // 表格列定義
  const columns = [
    {
      title: '訂單號',
      dataIndex: ['booking', 'booking_number'],
      key: 'booking_number',
      width: 150,
      render: (text: string) => text || '-',
    },
    {
      title: '評價者',
      dataIndex: ['reviewer', 'display_name'],
      key: 'reviewer',
      width: 120,
      render: (text: string, record: any) => {
        if (record.is_anonymous) {
          return <Tag color="default">匿名用戶</Tag>;
        }
        return text || record.reviewer?.email || '-';
      },
    },
    {
      title: '被評價者',
      dataIndex: ['reviewee', 'display_name'],
      key: 'reviewee',
      width: 120,
      render: (text: string, record: any) => text || record.reviewee?.email || '-',
    },
    {
      title: '評分',
      dataIndex: 'rating',
      key: 'rating',
      width: 100,
      render: (rating: number) => (
        <Space>
          <StarOutlined style={{ color: '#faad14' }} />
          <span style={{ fontWeight: 'bold' }}>{rating}</span>
        </Space>
      ),
    },
    {
      title: '評論',
      dataIndex: 'comment',
      key: 'comment',
      ellipsis: true,
      render: (text: string) => text || <span style={{ color: '#999' }}>無評論</span>,
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusConfig: Record<string, { color: string; text: string }> = {
          pending: { color: 'orange', text: '待審核' },
          approved: { color: 'green', text: '已批准' },
          rejected: { color: 'red', text: '已拒絕' },
          hidden: { color: 'default', text: '已隱藏' },
        };
        const config = statusConfig[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '評價時間',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => router.push(`/reviews/${record.id}`)}
        >
          查看
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* 統計卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="總評價數"
              value={statistics.totalReviews}
              prefix={<StarOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均評分"
              value={statistics.averageRating}
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
              value={statistics.pendingReviews}
              valueStyle={{ color: '#ff7a45' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已批准"
              value={statistics.approvedReviews}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 主要內容卡片 */}
      <Card
        title={
          <Space>
            <StarOutlined />
            <span>評價管理</span>
          </Space>
        }
        extra={
          <Button icon={<ReloadOutlined />} onClick={() => { loadReviews(); loadStatistics(); }}>
            重新整理
          </Button>
        }
      >
        {/* 篩選和搜索 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Search
              placeholder="搜索訂單號或評論內容"
              allowClear
              enterButton={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={loadReviews}
            />
          </Col>
          <Col span={4}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              suffixIcon={<FilterOutlined />}
            >
              <Option value="all">全部狀態</Option>
              <Option value="pending">待審核</Option>
              <Option value="approved">已批准</Option>
              <Option value="rejected">已拒絕</Option>
              <Option value="hidden">已隱藏</Option>
            </Select>
          </Col>
          <Col span={12} style={{ textAlign: 'right' }}>
            <Space>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={handleBatchApprove}
                disabled={selectedRowKeys.length === 0}
                loading={batchActionLoading}
              >
                批量批准
              </Button>
              <Button
                danger
                icon={<CloseOutlined />}
                onClick={handleBatchReject}
                disabled={selectedRowKeys.length === 0}
                loading={batchActionLoading}
              >
                批量拒絕
              </Button>
            </Space>
          </Col>
        </Row>

        {/* 評價列表表格 */}
        <Table
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          columns={columns}
          dataSource={reviews}
          rowKey="id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 條評價`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
          }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
}


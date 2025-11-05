'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Spin,
  message,
  Modal,
  Input,
  Rate,
  Divider,
  Alert,
} from 'antd';
import {
  ArrowLeftOutlined,
  UserOutlined,
  StarOutlined,
  CheckOutlined,
  CloseOutlined,
  EyeInvisibleOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { TextArea } = Input;

export default function ReviewDetailPage() {
  const router = useRouter();
  const params = useParams();
  const reviewId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // 審核對話框
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'hide'>('approve');
  const [adminNotes, setAdminNotes] = useState('');

  // 載入評價詳情
  const loadReviewDetail = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}/review`);
      const data = await response.json();

      if (data.success) {
        setReview(data.data);
      } else {
        throw new Error(data.error || '載入評價失敗');
      }
    } catch (error: any) {
      console.error('❌ 載入評價詳情失敗:', error);
      message.error(error.message || '載入評價詳情失敗');
      setReview(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reviewId) {
      loadReviewDetail();
    }
  }, [reviewId]);

  // 審核評價
  const handleReviewAction = async () => {
    setActionLoading(true);
    try {
      const statusMap = {
        approve: 'approved',
        reject: 'rejected',
        hide: 'hidden',
      };

      const response = await fetch(`/api/admin/reviews/${reviewId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: statusMap[reviewAction],
          adminNotes: adminNotes.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        message.success('操作成功');
        setReviewModalVisible(false);
        setAdminNotes('');
        loadReviewDetail();
      } else {
        throw new Error(data.error || '操作失敗');
      }
    } catch (error: any) {
      message.error(error.message || '操作失敗');
    } finally {
      setActionLoading(false);
    }
  };

  // 刪除評價
  const handleDelete = () => {
    Modal.confirm({
      title: '刪除評價',
      content: '確定要刪除這條評價嗎？此操作不可恢復。',
      okText: '確定',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await fetch(`/api/admin/reviews/${reviewId}/review`, {
            method: 'DELETE',
          });

          const data = await response.json();

          if (data.success) {
            message.success('評價已刪除');
            router.push('/reviews');
          } else {
            throw new Error(data.error || '刪除失敗');
          }
        } catch (error: any) {
          message.error(error.message || '刪除失敗');
        }
      },
    });
  };

  // 打開審核對話框
  const openReviewModal = (action: 'approve' | 'reject' | 'hide') => {
    setReviewAction(action);
    setReviewModalVisible(true);
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!review) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="評價不存在"
          description="找不到該評價，可能已被刪除。"
          type="error"
          showIcon
        />
      </div>
    );
  }

  const statusConfig: Record<string, { color: string; text: string }> = {
    pending: { color: 'orange', text: '待審核' },
    approved: { color: 'green', text: '已批准' },
    rejected: { color: 'red', text: '已拒絕' },
    hidden: { color: 'default', text: '已隱藏' },
  };

  const currentStatus = statusConfig[review.status] || { color: 'default', text: review.status };

  return (
    <div style={{ padding: '24px' }}>
      {/* 頁面標題 */}
      <div style={{ marginBottom: 24 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push('/reviews')}
          style={{ marginBottom: 16 }}
        >
          返回列表
        </Button>
        <h1 style={{ margin: 0 }}>評價詳情</h1>
      </div>

      {/* 評價資訊卡片 */}
      <Card
        title={
          <Space>
            <StarOutlined />
            <span>評價資訊</span>
            <Tag color={currentStatus.color}>{currentStatus.text}</Tag>
          </Space>
        }
        extra={
          <Space>
            {review.status === 'pending' && (
              <>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => openReviewModal('approve')}
                >
                  批准
                </Button>
                <Button
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => openReviewModal('reject')}
                >
                  拒絕
                </Button>
              </>
            )}
            {review.status === 'approved' && (
              <Button
                icon={<EyeInvisibleOutlined />}
                onClick={() => openReviewModal('hide')}
              >
                隱藏
              </Button>
            )}
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={handleDelete}
            >
              刪除
            </Button>
          </Space>
        }
      >
        <Descriptions bordered column={2}>
          <Descriptions.Item label="評分">
            <Rate disabled value={review.rating} />
            <span style={{ marginLeft: 8, fontWeight: 'bold' }}>{review.rating} / 5</span>
          </Descriptions.Item>
          <Descriptions.Item label="評價時間">
            {dayjs(review.created_at).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="評價者">
            {review.is_anonymous ? (
              <Tag color="default">匿名用戶</Tag>
            ) : (
              <Space>
                <UserOutlined />
                {review.reviewer?.display_name || review.reviewer?.email || '-'}
              </Space>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="被評價者（司機）">
            <Space>
              <UserOutlined />
              {review.reviewee?.display_name || review.reviewee?.email || '-'}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="訂單號" span={2}>
            {review.booking?.booking_number || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="評論內容" span={2}>
            {review.comment ? (
              <div style={{ whiteSpace: 'pre-wrap' }}>{review.comment}</div>
            ) : (
              <span style={{ color: '#999' }}>無評論</span>
            )}
          </Descriptions.Item>
        </Descriptions>

        {/* 審核資訊 */}
        {(review.reviewed_at || review.admin_notes) && (
          <>
            <Divider />
            <Descriptions bordered column={2} title="審核資訊">
              {review.reviewed_at && (
                <Descriptions.Item label="審核時間" span={2}>
                  {dayjs(review.reviewed_at).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
              )}
              {review.admin_notes && (
                <Descriptions.Item label="管理員備註" span={2}>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{review.admin_notes}</div>
                </Descriptions.Item>
              )}
            </Descriptions>
          </>
        )}

        {/* 訂單詳情 */}
        {review.booking && (
          <>
            <Divider />
            <Descriptions bordered column={2} title="訂單詳情">
              <Descriptions.Item label="訂單狀態">
                {review.booking.status || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="行程日期">
                {review.booking.start_date
                  ? dayjs(review.booking.start_date).format('YYYY-MM-DD')
                  : '-'}
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Card>

      {/* 審核對話框 */}
      <Modal
        title={
          reviewAction === 'approve'
            ? '批准評價'
            : reviewAction === 'reject'
            ? '拒絕評價'
            : '隱藏評價'
        }
        open={reviewModalVisible}
        onOk={handleReviewAction}
        onCancel={() => {
          setReviewModalVisible(false);
          setAdminNotes('');
        }}
        confirmLoading={actionLoading}
        okText="確定"
        cancelText="取消"
      >
        <div style={{ marginBottom: 16 }}>
          <p>
            {reviewAction === 'approve' && '批准後，此評價將對司機可見。'}
            {reviewAction === 'reject' && '拒絕後，此評價將不會顯示。'}
            {reviewAction === 'hide' && '隱藏後，此評價將不再對司機可見。'}
          </p>
        </div>
        <TextArea
          rows={4}
          placeholder="管理員備註（選填）"
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          maxLength={500}
          showCount
        />
      </Modal>
    </div>
  );
}


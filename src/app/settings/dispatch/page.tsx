'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  Switch, 
  Button, 
  Typography, 
  Space, 
  Divider, 
  Alert, 
  Row,
  Col,
  Statistic,
  Tag,
  message,
  Spin
} from 'antd';
import { 
  CarOutlined, 
  ThunderboltOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  SyncOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface RealtimeSyncStatus {
  realtimeEnabled: boolean;
  cronEnabled: boolean;
  triggerExists: boolean;
  lastUpdated: string | null;
  stats: {
    todayRealtimeCount: number;
    todayCronCount: number;
    todayErrorCount: number;
    pendingEvents: number;
    avgDelaySeconds: number;
  };
  performance?: {
    rating: string;
    description: string;
  };
}

export default function DispatchSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<RealtimeSyncStatus | null>(null);
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);

  // 載入狀態
  const loadStatus = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token') || 'mock_token';
      const response = await fetch('/api/admin/realtime-sync/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      
      if (result.success) {
        setStatus(result.data);
        setRealtimeEnabled(result.data.realtimeEnabled);
      } else {
        message.error(result.message || '獲取狀態失敗');
      }
    } catch (error: any) {
      console.error('載入狀態失敗:', error);
      message.error('載入狀態失敗');
    } finally {
      setLoading(false);
    }
  };

  // 切換即時同步
  const toggleRealtimeSync = async (enabled: boolean) => {
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token') || 'mock_token';
      const response = await fetch('/api/admin/realtime-sync/toggle', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      });

      const result = await response.json();
      
      if (result.success) {
        message.success(result.message);
        setRealtimeEnabled(enabled);
        // 重新載入狀態
        await loadStatus();
      } else {
        message.error(result.message || '操作失敗');
        // 恢復開關狀態
        setRealtimeEnabled(!enabled);
      }
    } catch (error: any) {
      console.error('切換失敗:', error);
      message.error('操作失敗');
      // 恢復開關狀態
      setRealtimeEnabled(!enabled);
    } finally {
      setSaving(false);
    }
  };

  // 初始載入
  useEffect(() => {
    loadStatus();
  }, []);

  // 性能評級顏色
  const getPerformanceColor = (rating: string) => {
    switch (rating) {
      case 'excellent': return 'success';
      case 'good': return 'processing';
      case 'fair': return 'warning';
      case 'poor': return 'error';
      default: return 'default';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={2}>
          <CarOutlined className="mr-2" />
          派單設定
        </Title>
        <Text type="secondary">
          配置訂單同步和派單相關設定
        </Text>
      </div>

      {/* 即時同步設定 */}
      <Row gutter={24}>
        <Col xs={24} lg={14}>
          <Card 
            title={
              <Space>
                <ThunderboltOutlined />
                即時同步設定
              </Space>
            }
            loading={loading}
            extra={
              <Button 
                icon={<ReloadOutlined />} 
                onClick={loadStatus}
                loading={loading}
              >
                重新整理
              </Button>
            }
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {/* 開關控制 */}
              <div>
                <Row justify="space-between" align="middle">
                  <Col>
                    <Space direction="vertical" size={0}>
                      <Text strong>即時通知功能</Text>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        啟用後，訂單變更將在 1-3 秒內同步到 Firestore
                      </Text>
                    </Space>
                  </Col>
                  <Col>
                    <Switch
                      checked={realtimeEnabled}
                      onChange={toggleRealtimeSync}
                      loading={saving}
                      checkedChildren="啟用"
                      unCheckedChildren="停用"
                    />
                  </Col>
                </Row>
              </div>

              <Divider />

              {/* 狀態指示 */}
              <div>
                <Text strong>系統狀態</Text>
                <div className="mt-2">
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Row justify="space-between">
                      <Text>即時同步：</Text>
                      <Tag 
                        icon={realtimeEnabled ? <CheckCircleOutlined /> : <WarningOutlined />}
                        color={realtimeEnabled ? 'success' : 'default'}
                      >
                        {realtimeEnabled ? '已啟用' : '已停用'}
                      </Tag>
                    </Row>
                    <Row justify="space-between">
                      <Text>Cron 補償：</Text>
                      <Tag 
                        icon={status?.cronEnabled ? <CheckCircleOutlined /> : <WarningOutlined />}
                        color={status?.cronEnabled ? 'success' : 'warning'}
                      >
                        {status?.cronEnabled ? '正常運行' : '未啟用'}
                      </Tag>
                    </Row>
                    {status?.lastUpdated && (
                      <Row justify="space-between">
                        <Text>最後更新：</Text>
                        <Text type="secondary">
                          {new Date(status.lastUpdated).toLocaleString('zh-TW')}
                        </Text>
                      </Row>
                    )}
                  </Space>
                </div>
              </div>

              <Divider />

              {/* 說明文字 */}
              <Alert
                message="雙保險機制說明"
                description={
                  <div>
                    <Paragraph style={{ marginBottom: 8 }}>
                      <strong>即時通知（Trigger + pg_net）：</strong>
                      <br />
                      訂單變更時立即發送 HTTP 請求到 Edge Function，延遲 1-3 秒。
                    </Paragraph>
                    <Paragraph style={{ marginBottom: 0 }}>
                      <strong>Cron 補償機制：</strong>
                      <br />
                      每 5-30 秒執行一次，處理所有未同步的事件，確保數據不丟失。
                    </Paragraph>
                  </div>
                }
                type="info"
                showIcon
              />
            </Space>
          </Card>
        </Col>

        {/* 統計資訊 */}
        <Col xs={24} lg={10}>
          <Card 
            title={
              <Space>
                <SyncOutlined />
                今日統計
              </Space>
            }
            loading={loading}
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="即時通知次數"
                    value={status?.stats.todayRealtimeCount || 0}
                    prefix={<ThunderboltOutlined />}
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Cron 補償次數"
                    value={status?.stats.todayCronCount || 0}
                    prefix={<ClockCircleOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="待處理事件"
                    value={status?.stats.pendingEvents || 0}
                    prefix={<SyncOutlined />}
                    valueStyle={{ 
                      color: (status?.stats.pendingEvents || 0) > 10 ? '#cf1322' : '#666' 
                    }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="錯誤次數"
                    value={status?.stats.todayErrorCount || 0}
                    prefix={<WarningOutlined />}
                    valueStyle={{ 
                      color: (status?.stats.todayErrorCount || 0) > 0 ? '#cf1322' : '#666' 
                    }}
                  />
                </Col>
              </Row>

              <Divider />

              {/* 性能指標 */}
              <div>
                <Text strong>性能指標</Text>
                <div className="mt-2">
                  <Row justify="space-between" align="middle">
                    <Text>平均延遲：</Text>
                    <Text strong style={{ fontSize: '18px' }}>
                      {status?.stats.avgDelaySeconds?.toFixed(2) || 0} 秒
                    </Text>
                  </Row>
                  {status?.performance && (
                    <Row justify="space-between" align="middle" className="mt-2">
                      <Text>性能評級：</Text>
                      <Tag color={getPerformanceColor(status.performance.rating)}>
                        {status.performance.description}
                      </Tag>
                    </Row>
                  )}
                </div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}


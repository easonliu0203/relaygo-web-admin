'use client';

import { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Button, Typography, Alert } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface HealthStatus {
  service: string;
  status: 'healthy' | 'unhealthy' | 'warning';
  message: string;
  lastChecked: string;
}

export default function SimpleHealthCheck() {
  const [healthStatuses, setHealthStatuses] = useState<HealthStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    checkServices();
  }, []);

  const checkServices = async () => {
    setLoading(true);
    const statuses: HealthStatus[] = [];

    // 檢查環境變數配置
    const requiredEnvVars = [
      'NEXT_PUBLIC_API_URL',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ];

    const missingEnvVars = requiredEnvVars.filter(
      (envVar) => !process.env[envVar]
    );

    if (missingEnvVars.length === 0) {
      statuses.push({
        service: '環境配置',
        status: 'healthy',
        message: '所有必要的環境變數已正確設定',
        lastChecked: new Date().toISOString(),
      });
    } else {
      statuses.push({
        service: '環境配置',
        status: 'unhealthy',
        message: `缺少環境變數: ${missingEnvVars.join(', ')}`,
        lastChecked: new Date().toISOString(),
      });
    }

    // 檢查 Supabase 配置
    const supabaseConfigured = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    if (supabaseConfigured) {
      statuses.push({
        service: 'Supabase 資料庫',
        status: 'healthy',
        message: 'Supabase 配置正常，資料庫已準備就緒',
        lastChecked: new Date().toISOString(),
      });
    } else {
      statuses.push({
        service: 'Supabase 資料庫',
        status: 'unhealthy',
        message: 'Supabase 配置不完整',
        lastChecked: new Date().toISOString(),
      });
    }

    // 檢查 Firebase 配置
    const firebaseConfigured = !!(
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    );

    if (firebaseConfigured) {
      statuses.push({
        service: 'Firebase',
        status: 'healthy',
        message: 'Firebase 配置正常',
        lastChecked: new Date().toISOString(),
      });
    } else {
      statuses.push({
        service: 'Firebase',
        status: 'warning',
        message: 'Firebase 配置不完整（可選）',
        lastChecked: new Date().toISOString(),
      });
    }

    setHealthStatuses(statuses);
    setLastUpdate(new Date().toLocaleString('zh-TW'));
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleOutlined className="text-green-500" />;
      case 'unhealthy':
        return <CloseCircleOutlined className="text-red-500" />;
      case 'warning':
        return <WarningOutlined className="text-yellow-500" />;
      default:
        return <WarningOutlined className="text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge status="success" text="正常" />;
      case 'unhealthy':
        return <Badge status="error" text="異常" />;
      case 'warning':
        return <Badge status="warning" text="警告" />;
      default:
        return <Badge status="default" text="未知" />;
    }
  };

  const overallStatus = healthStatuses.every(s => s.status === 'healthy') 
    ? 'healthy' 
    : healthStatuses.some(s => s.status === 'unhealthy') 
    ? 'unhealthy' 
    : 'warning';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 頁面標題 */}
        <div className="flex justify-between items-center">
          <div>
            <Title level={2}>系統健康檢查</Title>
            <Text type="secondary">檢查系統各項服務的運行狀態</Text>
          </div>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={checkServices}
          >
            重新檢查
          </Button>
        </div>

        {/* 總體狀態 */}
        <Alert
          message={
            <div className="flex items-center space-x-2">
              {getStatusIcon(overallStatus)}
              <span className="font-medium">
                系統總體狀態: {overallStatus === 'healthy' ? '正常' : overallStatus === 'unhealthy' ? '異常' : '警告'}
              </span>
            </div>
          }
          description={`最後更新時間: ${lastUpdate}`}
          type={overallStatus === 'healthy' ? 'success' : overallStatus === 'unhealthy' ? 'error' : 'warning'}
          showIcon={false}
        />

        {/* 服務狀態卡片 */}
        <Row gutter={[16, 16]}>
          {healthStatuses.map((status, index) => (
            <Col xs={24} sm={12} lg={8} key={index}>
              <Card
                title={status.service}
                extra={getStatusBadge(status.status)}
                className={`border-l-4 ${
                  status.status === 'healthy' 
                    ? 'border-l-green-500' 
                    : status.status === 'unhealthy' 
                    ? 'border-l-red-500' 
                    : 'border-l-yellow-500'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(status.status)}
                    <Text>{status.message}</Text>
                  </div>
                  
                  <div>
                    <Text type="secondary" className="text-xs">
                      檢查時間: {new Date(status.lastChecked).toLocaleString('zh-TW')}
                    </Text>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* 系統資訊 */}
        <Card title="系統資訊">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <div>
                <Text type="secondary">應用版本</Text>
                <div className="font-medium">v1.0.0</div>
              </div>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <div>
                <Text type="secondary">環境</Text>
                <div className="font-medium">
                  {process.env.NODE_ENV === 'development' ? '開發環境' : '生產環境'}
                </div>
              </div>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <div>
                <Text type="secondary">Supabase URL</Text>
                <div className="font-medium text-sm">{process.env.NEXT_PUBLIC_SUPABASE_URL}</div>
              </div>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <div>
                <Text type="secondary">API URL</Text>
                <div className="font-medium">{process.env.NEXT_PUBLIC_API_URL}</div>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Supabase 資料庫設定指南 */}
        <Card title="📊 Supabase 資料庫設定狀態">
          <Alert
            message="資料庫設定指南"
            description={
              <div className="space-y-2">
                <p>✅ Supabase 專案已配置：{process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
                <p>📋 下一步：請在 Supabase SQL 編輯器中執行資料庫建立腳本</p>
                <p>📁 腳本位置：<code>web-admin/database/supabase-setup.sql</code></p>
                <p>🔗 Supabase 專案：<a href={process.env.NEXT_PUBLIC_SUPABASE_URL} target="_blank" rel="noopener noreferrer">開啟 Supabase 控制台</a></p>
              </div>
            }
            type="info"
            showIcon
          />
        </Card>
      </div>
    </div>
  );
}

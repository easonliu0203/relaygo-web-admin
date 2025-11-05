'use client';

import { useState } from 'react';
import { Card, Row, Col, Button, List, Avatar, Tag, Space, Divider } from 'antd';
import {
  SettingOutlined,
  DollarOutlined,
  BellOutlined,
  CarOutlined,
  UserOutlined,
  SafetyOutlined,
  DatabaseOutlined,
  ApiOutlined,
  RightOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';

// 設定項目配置
const settingCategories = [
  {
    title: '價格設定',
    description: '管理包車服務的價格配置',
    icon: <DollarOutlined />,
    color: '#1890ff',
    path: '/settings/pricing',
    status: 'configured',
    items: [
      '車型價格配置',
      '優惠價格設定',
      '超時費用設定',
      '封測自動支付',
    ],
  },
  {
    title: '派單設定',
    description: '配置司機派單規則和邏輯',
    icon: <CarOutlined />,
    color: '#52c41a',
    path: '/settings/dispatch',
    status: 'pending',
    items: [
      '自動派單規則',
      '司機接單時限',
      '派單優先級',
      '區域派單設定',
    ],
  },
  {
    title: '通知設定',
    description: '管理系統通知和訊息推送',
    icon: <BellOutlined />,
    color: '#fa8c16',
    path: '/settings/notifications',
    status: 'pending',
    items: [
      'SMS 通知設定',
      'Email 通知模板',
      '推播通知配置',
      '通知時機設定',
    ],
  },
  {
    title: '用戶管理',
    description: '用戶權限和角色管理',
    icon: <UserOutlined />,
    color: '#722ed1',
    path: '/settings/users',
    status: 'pending',
    items: [
      '管理員權限',
      '角色配置',
      '登入設定',
      '密碼政策',
    ],
  },
  {
    title: '安全設定',
    description: '系統安全和資料保護設定',
    icon: <SafetyOutlined />,
    color: '#f5222d',
    path: '/settings/security',
    status: 'pending',
    items: [
      'API 金鑰管理',
      '資料加密設定',
      '存取日誌',
      '安全政策',
    ],
  },
  {
    title: '系統配置',
    description: '基礎系統參數和環境配置',
    icon: <DatabaseOutlined />,
    color: '#13c2c2',
    path: '/settings/system',
    status: 'pending',
    items: [
      '資料庫配置',
      '快取設定',
      '檔案儲存',
      '系統維護',
    ],
  },
];

// 快速操作項目
const quickActions = [
  {
    title: '備份系統資料',
    description: '建立完整的系統資料備份',
    icon: <DatabaseOutlined />,
    action: 'backup',
  },
  {
    title: '清理系統快取',
    description: '清理系統快取以提升效能',
    icon: <ApiOutlined />,
    action: 'clear_cache',
  },
  {
    title: '檢查系統狀態',
    description: '檢查各項系統服務運行狀態',
    icon: <SafetyOutlined />,
    action: 'health_check',
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  // 獲取狀態標籤
  const getStatusTag = (status: string) => {
    const statusConfig = {
      configured: { color: 'success', text: '已配置', icon: <CheckCircleOutlined /> },
      pending: { color: 'warning', text: '待配置', icon: <ExclamationCircleOutlined /> },
      error: { color: 'error', text: '配置錯誤', icon: <ExclamationCircleOutlined /> },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  // 處理快速操作
  const handleQuickAction = async (action: string) => {
    setLoading(action);
    // 模擬操作
    setTimeout(() => {
      setLoading(null);
      console.log(`執行操作: ${action}`);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <SettingOutlined className="mr-2" />
            系統設定
          </h1>
          <p className="text-gray-600">管理系統配置和參數設定</p>
        </div>
      </div>

      {/* 設定分類 */}
      <Row gutter={[16, 16]}>
        {settingCategories.map((category) => (
          <Col xs={24} lg={12} key={category.path}>
            <Card
              hoverable
              className="h-full cursor-pointer transition-all duration-200 hover:shadow-lg"
              onClick={() => router.push(category.path)}
            >
              <div className="flex items-start space-x-4">
                <div 
                  className="flex items-center justify-center w-12 h-12 rounded-lg text-white text-xl"
                  style={{ backgroundColor: category.color }}
                >
                  {category.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">{category.title}</h3>
                    <div className="flex items-center space-x-2">
                      {getStatusTag(category.status)}
                      <RightOutlined className="text-gray-400" />
                    </div>
                  </div>
                  <p className="text-gray-600 mb-3">{category.description}</p>
                  <div className="space-y-1">
                    {category.items.map((item, index) => (
                      <div key={index} className="text-sm text-gray-500 flex items-center">
                        <div className="w-1 h-1 bg-gray-400 rounded-full mr-2"></div>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 快速操作 */}
      <Card title="快速操作">
        <List
          itemLayout="horizontal"
          dataSource={quickActions}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button
                  key="action"
                  type="primary"
                  loading={loading === item.action}
                  onClick={() => handleQuickAction(item.action)}
                >
                  執行
                </Button>
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Avatar 
                    size={40} 
                    icon={item.icon} 
                    style={{ backgroundColor: '#1890ff' }}
                  />
                }
                title={item.title}
                description={item.description}
              />
            </List.Item>
          )}
        />
      </Card>

      {/* 系統資訊 */}
      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <Card title="系統資訊">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">系統版本</span>
                <span className="font-medium">v1.0.0</span>
              </div>
              <Divider className="my-2" />
              <div className="flex justify-between">
                <span className="text-gray-600">資料庫版本</span>
                <span className="font-medium">PostgreSQL 15.0</span>
              </div>
              <Divider className="my-2" />
              <div className="flex justify-between">
                <span className="text-gray-600">最後更新</span>
                <span className="font-medium">2024-01-01 12:00</span>
              </div>
              <Divider className="my-2" />
              <div className="flex justify-between">
                <span className="text-gray-600">運行時間</span>
                <span className="font-medium">7 天 12 小時</span>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="系統狀態">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">資料庫連線</span>
                <Tag color="success" icon={<CheckCircleOutlined />}>正常</Tag>
              </div>
              <Divider className="my-2" />
              <div className="flex justify-between items-center">
                <span className="text-gray-600">快取服務</span>
                <Tag color="success" icon={<CheckCircleOutlined />}>正常</Tag>
              </div>
              <Divider className="my-2" />
              <div className="flex justify-between items-center">
                <span className="text-gray-600">檔案儲存</span>
                <Tag color="success" icon={<CheckCircleOutlined />}>正常</Tag>
              </div>
              <Divider className="my-2" />
              <div className="flex justify-between items-center">
                <span className="text-gray-600">外部 API</span>
                <Tag color="warning" icon={<ExclamationCircleOutlined />}>部分異常</Tag>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

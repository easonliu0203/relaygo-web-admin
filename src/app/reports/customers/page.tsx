'use client';

import { useState } from 'react';
import { Card, Button } from 'antd';
import { UserOutlined, ReloadOutlined } from '@ant-design/icons';

export default function CustomerReportsPage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <UserOutlined className="mr-2" />
            客戶統計
          </h1>
          <p className="text-gray-600">客戶行為和消費統計</p>
        </div>
        <Button icon={<ReloadOutlined />} loading={loading}>重新整理</Button>
      </div>
      <Card>
        <div className="text-center py-12">
          <UserOutlined className="text-6xl text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">客戶統計</h3>
          <p className="text-gray-500 mb-4">此頁面將顯示客戶統計分析</p>
          <p className="text-sm text-gray-400">功能開發中，敬請期待</p>
        </div>
      </Card>
    </div>
  );
}

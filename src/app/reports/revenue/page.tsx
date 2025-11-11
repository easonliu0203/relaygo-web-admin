'use client';

import { useState } from 'react';
import { Card, Button } from 'antd';
import { DollarOutlined, ReloadOutlined } from '@ant-design/icons';

export default function RevenueReportsPage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <DollarOutlined className="mr-2" />
            營收分析
          </h1>
          <p className="text-gray-600">詳細的營收數據分析</p>
        </div>
        <Button icon={<ReloadOutlined />} loading={loading}>重新整理</Button>
      </div>
      <Card>
        <div className="text-center py-12">
          <DollarOutlined className="text-6xl text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">營收分析</h3>
          <p className="text-gray-500 mb-4">此頁面將顯示詳細的營收分析報表</p>
          <p className="text-sm text-gray-400">功能開發中，敬請期待</p>
        </div>
      </Card>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Card, Button } from 'antd';
import { RollbackOutlined, ReloadOutlined } from '@ant-design/icons';

export default function RefundsPage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <RollbackOutlined className="mr-2" />
            退款管理
          </h1>
          <p className="text-gray-600">處理客戶退款申請</p>
        </div>
        <Button icon={<ReloadOutlined />} loading={loading}>重新整理</Button>
      </div>
      <Card>
        <div className="text-center py-12">
          <RollbackOutlined className="text-6xl text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">退款管理</h3>
          <p className="text-gray-500 mb-4">此頁面將顯示所有退款申請</p>
          <p className="text-sm text-gray-400">功能開發中，敬請期待</p>
        </div>
      </Card>
    </div>
  );
}

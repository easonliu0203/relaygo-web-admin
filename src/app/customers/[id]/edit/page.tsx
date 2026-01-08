'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Card, 
  Form, 
  Input, 
  Select, 
  Button, 
  Space, 
  Spin, 
  message, 
  Divider,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { ApiService } from '@/services/api';

const { Option } = Select;

export default function CustomerEditPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customer, setCustomer] = useState<any>(null);

  // 載入客戶詳情
  const loadCustomerDetail = async () => {
    setLoading(true);
    try {
      const response = await ApiService.getCustomerById(customerId);

      if (response.success) {
        setCustomer(response.data);
        // 設定表單初始值
        form.setFieldsValue({
          status: response.data.status,
          email: response.data.email,
          phone: response.data.phone,
          firstName: response.data.firstName,
          lastName: response.data.lastName,
        });
      } else {
        throw new Error(response.message || '載入客戶資料失敗');
      }
    } catch (error: any) {
      console.error('❌ 載入客戶詳情失敗:', error);
      message.error(error.message || '載入客戶詳情失敗');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) {
      loadCustomerDetail();
    }
  }, [customerId]);

  // 儲存變更
  const handleSave = async (values: any) => {
    setSaving(true);
    try {
      console.log('💾 儲存客戶資訊:', values);

      const response = await ApiService.updateCustomer(customerId, values);

      if (response.success) {
        message.success('客戶資訊更新成功');
        router.push(`/customers/${customerId}`);
      } else {
        throw new Error(response.message || '更新客戶資訊失敗');
      }
    } catch (error: any) {
      console.error('❌ 更新客戶資訊失敗:', error);
      message.error(error.message || '更新客戶資訊失敗');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" tip="載入中..." />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 頁面標題 */}
      <div className="mb-6">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
            返回
          </Button>
          <h1 className="text-2xl font-bold m-0 flex items-center">
            <UserOutlined className="mr-2" />
            編輯客戶資訊
          </h1>
        </Space>
      </div>

      {/* 編輯表單 */}
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Divider orientation="left">帳號狀態</Divider>
          
          <Form.Item
            label="帳號狀態"
            name="status"
            rules={[{ required: true, message: '請選擇帳號狀態' }]}
            extra="修改帳號狀態可以恢復已刪除的帳號或暫停違規帳號"
          >
            <Select placeholder="請選擇帳號狀態">
              <Option value="active">啟用 (Active)</Option>
              <Option value="inactive">停用 (Inactive)</Option>
              <Option value="deleted">已刪除 (Deleted)</Option>
              <Option value="suspended">暫停 (Suspended)</Option>
            </Select>
          </Form.Item>

          <Divider orientation="left">基本資訊</Divider>

          <Form.Item
            label="Email"
            name="email"
          >
            <Input disabled placeholder="Email" />
          </Form.Item>

          <Form.Item
            label="電話"
            name="phone"
          >
            <Input disabled placeholder="電話" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
                儲存變更
              </Button>
              <Button onClick={() => router.back()}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* 說明卡片 */}
      <Card className="mt-6" title="💡 功能說明">
        <div className="space-y-2">
          <p><strong>帳號狀態說明：</strong></p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li><strong>啟用 (Active)</strong>：正常使用中的帳號</li>
            <li><strong>停用 (Inactive)</strong>：暫時停用的帳號</li>
            <li><strong>已刪除 (Deleted)</strong>：用戶主動刪除的帳號</li>
            <li><strong>暫停 (Suspended)</strong>：因違規被暫停的帳號</li>
          </ul>
          <Divider />
          <p><strong>恢復已刪除帳號：</strong></p>
          <p className="text-gray-600">
            如果用戶要求恢復帳號，請將狀態從「已刪除 (Deleted)」改回「啟用 (Active)」
          </p>
        </div>
      </Card>
    </div>
  );
}



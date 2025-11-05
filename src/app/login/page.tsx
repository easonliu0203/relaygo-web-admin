'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Input, Button, Card, Typography, Alert, Checkbox } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'react-hot-toast';

const { Title, Text } = Typography;

interface LoginForm {
  email: string;
  password: string;
  remember?: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, error, clearError } = useAuthStore();
  const [form] = Form.useForm();

  // 如果已經登入，重定向到儀表板
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  // 清除錯誤訊息
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const handleSubmit = async (values: LoginForm) => {
    try {
      await login(values.email, values.password);
      toast.success('登入成功！');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      // 錯誤已經在 store 中處理，這裡不需要額外處理
    }
  };

  const handleDemoLogin = () => {
    form.setFieldsValue({
      email: 'admin@example.com',
      password: 'admin123456',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-0">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <LoginOutlined className="text-white text-2xl" />
            </div>
            <Title level={2} className="mb-2">
              管理後台登入
            </Title>
            <Text type="secondary">
              包車服務管理系統
            </Text>
          </div>

          {error && (
            <Alert
              message="登入失敗"
              description={error}
              type="error"
              showIcon
              closable
              onClose={clearError}
              className="mb-6"
            />
          )}

          <Form
            form={form}
            name="login"
            onFinish={handleSubmit}
            autoComplete="off"
            size="large"
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: '請輸入電子郵件' },
                { type: 'email', message: '請輸入有效的電子郵件格式' },
              ]}
            >
              <Input
                prefix={<UserOutlined className="text-gray-400" />}
                placeholder="電子郵件"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: '請輸入密碼' },
                { min: 6, message: '密碼至少需要 6 個字符' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder="密碼"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item name="remember" valuePropName="checked">
              <Checkbox>記住我</Checkbox>
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={isLoading}
                block
                className="h-12 text-base font-medium"
              >
                {isLoading ? '登入中...' : '登入'}
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <Text type="secondary" className="text-sm">
                封測階段測試帳號
              </Text>
              <div className="mt-2">
                <Button
                  type="link"
                  size="small"
                  onClick={handleDemoLogin}
                  className="text-blue-500 hover:text-blue-600"
                >
                  使用測試帳號登入
                </Button>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                <div>帳號: admin@example.com</div>
                <div>密碼: admin123456</div>
              </div>
            </div>
          </div>
        </Card>

        <div className="text-center mt-6">
          <Text type="secondary" className="text-sm">
            © 2024 包車服務管理系統. 版權所有.
          </Text>
        </div>
      </div>
    </div>
  );
}

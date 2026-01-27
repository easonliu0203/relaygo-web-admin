'use client';

import { useState, useEffect } from 'react';
import { Card, Form, InputNumber, Button, message, Spin, Alert, Divider, Typography, Row, Col, Statistic } from 'antd';
import { PercentageOutlined, SaveOutlined, ReloadOutlined, DollarOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface RevenueShareSettings {
  revenue_share_no_promo?: {
    company_percentage: number;
    driver_percentage: number;
    updated_at?: string;
    updated_by?: string;
  };
  revenue_share_with_promo?: {
    company_base_percentage: number;
    driver_percentage: number;
    updated_at?: string;
    updated_by?: string;
  };
}

export default function RevenueShareSettingsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<RevenueShareSettings>({});

  // 載入設定
  const loadSettings = async () => {
    setLoading(true);
    try {
      // 使用 admin_token（與其他頁面一致）
      const token = typeof window !== 'undefined'
        ? (document.cookie.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1] || localStorage.getItem('admin_token'))
        : null;

      const response = await fetch('/api/admin/revenue-share-settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('載入設定失敗');
      }

      const result = await response.json();
      if (result.success) {
        setSettings(result.data);
        
        // 設定表單初始值
        form.setFieldsValue({
          no_promo_company: result.data.revenue_share_no_promo?.company_percentage || 25,
          no_promo_driver: result.data.revenue_share_no_promo?.driver_percentage || 75,
          with_promo_company: result.data.revenue_share_with_promo?.company_base_percentage || 30,
          with_promo_driver: result.data.revenue_share_with_promo?.driver_percentage || 70,
        });
      } else {
        message.error(result.message || '載入設定失敗');
      }
    } catch (error: any) {
      console.error('載入設定錯誤:', error);
      message.error(error.message || '載入設定失敗');
    } finally {
      setLoading(false);
    }
  };

  // 儲存場景 1 設定
  const saveScenario1 = async (values: any) => {
    setSaving(true);
    try {
      // 使用 admin_token（與其他頁面一致）
      const token = typeof window !== 'undefined'
        ? (document.cookie.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1] || localStorage.getItem('admin_token'))
        : null;

      const response = await fetch('/api/admin/revenue-share-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          scenario: 'no_promo',
          company_percentage: values.no_promo_company,
          driver_percentage: values.no_promo_driver,
        }),
      });

      const result = await response.json();
      if (result.success) {
        message.success('場景 1 設定已更新');
        await loadSettings();
      } else {
        message.error(result.error || '更新失敗');
      }
    } catch (error: any) {
      console.error('儲存設定錯誤:', error);
      message.error(error.message || '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  // 儲存場景 2 設定
  const saveScenario2 = async (values: any) => {
    setSaving(true);
    try {
      // 使用 admin_token（與其他頁面一致）
      const token = typeof window !== 'undefined'
        ? (document.cookie.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1] || localStorage.getItem('admin_token'))
        : null;

      const response = await fetch('/api/admin/revenue-share-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          scenario: 'with_promo',
          company_base_percentage: values.with_promo_company,
          driver_percentage: values.with_promo_driver,
        }),
      });

      const result = await response.json();
      if (result.success) {
        message.success('場景 2 設定已更新');
        await loadSettings();
      } else {
        message.error(result.error || '更新失敗');
      }
    } catch (error: any) {
      console.error('儲存設定錯誤:', error);
      message.error(error.message || '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <PercentageOutlined className="mr-2" />
            分成設定
          </h1>
          <p className="text-gray-600">管理訂單分潤比例設定</p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={loadSettings} loading={loading}>
          重新整理
        </Button>
      </div>

      <Alert
        message="重要提示"
        description="修改分潤設定後，僅對未來新產生的訂單生效。已存在的訂單將維持原有的分潤計算。"
        type="info"
        showIcon
        closable
      />

      <Spin spinning={loading}>
        <Form form={form} layout="vertical">
          {/* 場景 1：未使用優惠碼 */}
          <Card title="場景 1：未使用優惠碼" className="mb-6">
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item
                  label="公司抽成比例"
                  name="no_promo_company"
                  rules={[
                    { required: true, message: '請輸入公司抽成比例' },
                    { type: 'number', min: 0, max: 100, message: '比例必須在 0-100 之間' },
                  ]}
                >
                  <InputNumber
                    min={0}
                    max={100}
                    precision={0}
                    addonAfter="%"
                    style={{ width: '100%' }}
                    onChange={(value) => {
                      if (value !== null) {
                        form.setFieldValue('no_promo_driver', 100 - value);
                      }
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="司機收入比例"
                  name="no_promo_driver"
                  rules={[
                    { required: true, message: '請輸入司機收入比例' },
                    { type: 'number', min: 0, max: 100, message: '比例必須在 0-100 之間' },
                  ]}
                >
                  <InputNumber
                    min={0}
                    max={100}
                    precision={0}
                    addonAfter="%"
                    style={{ width: '100%' }}
                    onChange={(value) => {
                      if (value !== null) {
                        form.setFieldValue('no_promo_company', 100 - value);
                      }
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => saveScenario1(form.getFieldsValue())}
              loading={saving}
            >
              儲存場景 1 設定
            </Button>
          </Card>

          {/* 場景 2：使用優惠碼 */}
          <Card title="場景 2：使用優惠碼">
            <Alert
              message="推廣者佣金將從公司基準比例中扣除，司機收入不受影響"
              type="warning"
              showIcon
              className="mb-4"
            />
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item
                  label="公司基準比例"
                  name="with_promo_company"
                  rules={[
                    { required: true, message: '請輸入公司基準比例' },
                    { type: 'number', min: 0, max: 100, message: '比例必須在 0-100 之間' },
                  ]}
                >
                  <InputNumber
                    min={0}
                    max={100}
                    precision={0}
                    addonAfter="%"
                    style={{ width: '100%' }}
                    onChange={(value) => {
                      if (value !== null) {
                        form.setFieldValue('with_promo_driver', 100 - value);
                      }
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="司機收入比例"
                  name="with_promo_driver"
                  rules={[
                    { required: true, message: '請輸入司機收入比例' },
                    { type: 'number', min: 0, max: 100, message: '比例必須在 0-100 之間' },
                  ]}
                >
                  <InputNumber
                    min={0}
                    max={100}
                    precision={0}
                    addonAfter="%"
                    style={{ width: '100%' }}
                    onChange={(value) => {
                      if (value !== null) {
                        form.setFieldValue('with_promo_company', 100 - value);
                      }
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => saveScenario2(form.getFieldsValue())}
              loading={saving}
            >
              儲存場景 2 設定
            </Button>
          </Card>
        </Form>
      </Spin>
    </div>
  );
}


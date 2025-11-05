'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  InputNumber, 
  Button, 
  Typography, 
  Space, 
  Divider, 
  Alert, 
  Switch,
  Row,
  Col,
  Table,
  Tag,
  message
} from 'antd';
import { 
  DollarOutlined, 
  CarOutlined, 
  ClockCircleOutlined,
  SaveOutlined,
  ReloadOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { PricingService, PricingConfig, BetaTestingConfig } from '@/services/pricingService';

const { Title, Text } = Typography;

export default function PricingSettingsPage() {
  const [form] = Form.useForm();
  const [betaForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null);
  const [betaConfig, setBetaConfig] = useState<BetaTestingConfig | null>(null);

  // 載入配置
  const loadConfigs = async () => {
    setLoading(true);
    try {
      const [pricing, beta] = await Promise.all([
        PricingService.getPricingConfig(),
        PricingService.getBetaTestingConfig()
      ]);
      
      setPricingConfig(pricing);
      setBetaConfig(beta);
      
      // 設定表單初始值
      form.setFieldsValue({
        large_6h_original: pricing.vehicle_types.large.packages['6_hours'].original_price,
        large_6h_discount: pricing.vehicle_types.large.packages['6_hours'].discount_price,
        large_6h_overtime: pricing.vehicle_types.large.packages['6_hours'].overtime_rate,
        large_8h_original: pricing.vehicle_types.large.packages['8_hours'].original_price,
        large_8h_discount: pricing.vehicle_types.large.packages['8_hours'].discount_price,
        large_8h_overtime: pricing.vehicle_types.large.packages['8_hours'].overtime_rate,
        small_6h_original: pricing.vehicle_types.small.packages['6_hours'].original_price,
        small_6h_discount: pricing.vehicle_types.small.packages['6_hours'].discount_price,
        small_6h_overtime: pricing.vehicle_types.small.packages['6_hours'].overtime_rate,
        small_8h_original: pricing.vehicle_types.small.packages['8_hours'].original_price,
        small_8h_discount: pricing.vehicle_types.small.packages['8_hours'].discount_price,
        small_8h_overtime: pricing.vehicle_types.small.packages['8_hours'].overtime_rate,
      });
      
      betaForm.setFieldsValue({
        auto_payment_enabled: beta.auto_payment_enabled,
        auto_payment_delay_seconds: beta.auto_payment_delay_seconds,
        notification_enabled: beta.notification_enabled,
      });
      
    } catch (error: any) {
      message.error(`載入配置失敗: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 儲存價格配置
  const savePricingConfig = async (values: any) => {
    setSaving(true);
    try {
      const newConfig: PricingConfig = {
        vehicle_types: {
          large: {
            name: "8-9人座車型",
            code: ["A", "B"],
            packages: {
              "6_hours": {
                duration: 6,
                original_price: values.large_6h_original,
                discount_price: values.large_6h_discount,
                overtime_rate: values.large_6h_overtime
              },
              "8_hours": {
                duration: 8,
                original_price: values.large_8h_original,
                discount_price: values.large_8h_discount,
                overtime_rate: values.large_8h_overtime
              }
            }
          },
          small: {
            name: "3-4人座車型",
            code: ["C", "D"],
            packages: {
              "6_hours": {
                duration: 6,
                original_price: values.small_6h_original,
                discount_price: values.small_6h_discount,
                overtime_rate: values.small_6h_overtime
              },
              "8_hours": {
                duration: 8,
                original_price: values.small_8h_original,
                discount_price: values.small_8h_discount,
                overtime_rate: values.small_8h_overtime
              }
            }
          }
        },
        currency: "USD",
        updated_at: new Date().toISOString()
      };

      // 驗證配置
      const errors = PricingService.validatePricingConfig(newConfig);
      if (errors.length > 0) {
        message.error(`配置驗證失敗: ${errors.join(', ')}`);
        return;
      }

      await PricingService.updatePricingConfig(newConfig);
      setPricingConfig(newConfig);
      message.success('價格配置已更新');
      
    } catch (error: any) {
      message.error(`儲存失敗: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // 儲存封測配置
  const saveBetaConfig = async (values: any) => {
    setSaving(true);
    try {
      const newConfig: BetaTestingConfig = {
        ...betaConfig!,
        auto_payment_enabled: values.auto_payment_enabled,
        auto_payment_delay_seconds: values.auto_payment_delay_seconds,
        notification_enabled: values.notification_enabled,
      };

      await PricingService.updateBetaTestingConfig(newConfig);
      setBetaConfig(newConfig);
      message.success('封測配置已更新');
      
    } catch (error: any) {
      message.error(`儲存失敗: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  // 價格表格資料
  const priceTableData = pricingConfig ? [
    {
      key: 'large_6h',
      vehicleType: '8-9人座',
      duration: '6小時',
      originalPrice: pricingConfig.vehicle_types.large.packages['6_hours'].original_price,
      discountPrice: pricingConfig.vehicle_types.large.packages['6_hours'].discount_price,
      overtimeRate: pricingConfig.vehicle_types.large.packages['6_hours'].overtime_rate,
    },
    {
      key: 'large_8h',
      vehicleType: '8-9人座',
      duration: '8小時',
      originalPrice: pricingConfig.vehicle_types.large.packages['8_hours'].original_price,
      discountPrice: pricingConfig.vehicle_types.large.packages['8_hours'].discount_price,
      overtimeRate: pricingConfig.vehicle_types.large.packages['8_hours'].overtime_rate,
    },
    {
      key: 'small_6h',
      vehicleType: '3-4人座',
      duration: '6小時',
      originalPrice: pricingConfig.vehicle_types.small.packages['6_hours'].original_price,
      discountPrice: pricingConfig.vehicle_types.small.packages['6_hours'].discount_price,
      overtimeRate: pricingConfig.vehicle_types.small.packages['6_hours'].overtime_rate,
    },
    {
      key: 'small_8h',
      vehicleType: '3-4人座',
      duration: '8小時',
      originalPrice: pricingConfig.vehicle_types.small.packages['8_hours'].original_price,
      discountPrice: pricingConfig.vehicle_types.small.packages['8_hours'].discount_price,
      overtimeRate: pricingConfig.vehicle_types.small.packages['8_hours'].overtime_rate,
    },
  ] : [];

  const priceTableColumns = [
    {
      title: '車型',
      dataIndex: 'vehicleType',
      key: 'vehicleType',
      render: (text: string) => (
        <Space>
          <CarOutlined />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: '時長',
      dataIndex: 'duration',
      key: 'duration',
      render: (text: string) => (
        <Space>
          <ClockCircleOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: '原價',
      dataIndex: 'originalPrice',
      key: 'originalPrice',
      render: (price: number) => (
        <Text strong style={{ color: '#1890ff' }}>
          {PricingService.formatPrice(price)}
        </Text>
      ),
    },
    {
      title: '優惠價',
      dataIndex: 'discountPrice',
      key: 'discountPrice',
      render: (price: number) => (
        <Text strong style={{ color: '#52c41a' }}>
          {PricingService.formatPrice(price)}
        </Text>
      ),
    },
    {
      title: '超時費率',
      dataIndex: 'overtimeRate',
      key: 'overtimeRate',
      render: (rate: number) => (
        <Tag color="orange">
          {PricingService.formatPrice(rate)}/小時
        </Tag>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={2}>
          <DollarOutlined className="mr-2" />
          價格配置管理
        </Title>
        <Text type="secondary">
          管理包車服務的價格設定和封測階段配置
        </Text>
      </div>

      {/* 當前價格表 */}
      <Card 
        title="當前價格表" 
        className="mb-6"
        extra={
          <Button 
            icon={<ReloadOutlined />} 
            onClick={loadConfigs}
            loading={loading}
          >
            重新載入
          </Button>
        }
      >
        <Table
          dataSource={priceTableData}
          columns={priceTableColumns}
          pagination={false}
          loading={loading}
          size="middle"
        />
      </Card>

      <Row gutter={24}>
        {/* 價格設定 */}
        <Col xs={24} lg={14}>
          <Card title="價格設定" loading={loading}>
            <Form
              form={form}
              layout="vertical"
              onFinish={savePricingConfig}
            >
              <Title level={4}>8-9人座車型</Title>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    label="6小時原價"
                    name="large_6h_original"
                    rules={[{ required: true, message: '請輸入價格' }]}
                  >
                    <InputNumber
                      min={0}
                      precision={2}
                      addonBefore="$"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="6小時優惠價"
                    name="large_6h_discount"
                    rules={[{ required: true, message: '請輸入價格' }]}
                  >
                    <InputNumber
                      min={0}
                      precision={2}
                      addonBefore="$"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="超時費率"
                    name="large_6h_overtime"
                    rules={[{ required: true, message: '請輸入費率' }]}
                  >
                    <InputNumber
                      min={0}
                      precision={2}
                      addonBefore="$"
                      addonAfter="/小時"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    label="8小時原價"
                    name="large_8h_original"
                    rules={[{ required: true, message: '請輸入價格' }]}
                  >
                    <InputNumber
                      min={0}
                      precision={2}
                      addonBefore="$"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="8小時優惠價"
                    name="large_8h_discount"
                    rules={[{ required: true, message: '請輸入價格' }]}
                  >
                    <InputNumber
                      min={0}
                      precision={2}
                      addonBefore="$"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="超時費率"
                    name="large_8h_overtime"
                    rules={[{ required: true, message: '請輸入費率' }]}
                  >
                    <InputNumber
                      min={0}
                      precision={2}
                      addonBefore="$"
                      addonAfter="/小時"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider />

              <Title level={4}>3-4人座車型</Title>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    label="6小時原價"
                    name="small_6h_original"
                    rules={[{ required: true, message: '請輸入價格' }]}
                  >
                    <InputNumber
                      min={0}
                      precision={2}
                      addonBefore="$"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="6小時優惠價"
                    name="small_6h_discount"
                    rules={[{ required: true, message: '請輸入價格' }]}
                  >
                    <InputNumber
                      min={0}
                      precision={2}
                      addonBefore="$"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="超時費率"
                    name="small_6h_overtime"
                    rules={[{ required: true, message: '請輸入費率' }]}
                  >
                    <InputNumber
                      min={0}
                      precision={2}
                      addonBefore="$"
                      addonAfter="/小時"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    label="8小時原價"
                    name="small_8h_original"
                    rules={[{ required: true, message: '請輸入價格' }]}
                  >
                    <InputNumber
                      min={0}
                      precision={2}
                      addonBefore="$"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="8小時優惠價"
                    name="small_8h_discount"
                    rules={[{ required: true, message: '請輸入價格' }]}
                  >
                    <InputNumber
                      min={0}
                      precision={2}
                      addonBefore="$"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="超時費率"
                    name="small_8h_overtime"
                    rules={[{ required: true, message: '請輸入費率' }]}
                  >
                    <InputNumber
                      min={0}
                      precision={2}
                      addonBefore="$"
                      addonAfter="/小時"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={saving}
                  size="large"
                >
                  儲存價格配置
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* 封測設定 */}
        <Col xs={24} lg={10}>
          <Card 
            title={
              <Space>
                <SettingOutlined />
                封測階段設定
              </Space>
            }
            loading={loading}
          >
            <Alert
              message="封測階段功能"
              description="啟用後，新訂單將自動從「待支付」轉為「已支付」狀態，僅用於測試環境。"
              type="warning"
              showIcon
              className="mb-4"
            />

            <Form
              form={betaForm}
              layout="vertical"
              onFinish={saveBetaConfig}
            >
              <Form.Item
                label="自動支付功能"
                name="auto_payment_enabled"
                valuePropName="checked"
              >
                <Switch 
                  checkedChildren="啟用" 
                  unCheckedChildren="停用"
                />
              </Form.Item>

              <Form.Item
                label="支付延遲時間（秒）"
                name="auto_payment_delay_seconds"
                rules={[{ required: true, message: '請輸入延遲時間' }]}
              >
                <InputNumber
                  min={1}
                  max={60}
                  addonAfter="秒"
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item
                label="通知功能"
                name="notification_enabled"
                valuePropName="checked"
              >
                <Switch 
                  checkedChildren="啟用" 
                  unCheckedChildren="停用"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={saving}
                  block
                >
                  儲存封測設定
                </Button>
              </Form.Item>
            </Form>

            {betaConfig && (
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <Text type="secondary" className="text-sm">
                  <strong>當前狀態:</strong><br />
                  自動支付: {betaConfig.auto_payment_enabled ? '✅ 啟用' : '❌ 停用'}<br />
                  延遲時間: {betaConfig.auto_payment_delay_seconds}秒<br />
                  有效期至: {new Date(betaConfig.enabled_until).toLocaleDateString()}
                </Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

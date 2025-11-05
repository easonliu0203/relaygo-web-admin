'use client';

import { useState } from 'react';
import { 
  Card, 
  Form, 
  Select, 
  InputNumber, 
  Button, 
  Typography, 
  Space, 
  Alert, 
  Row,
  Col,
  Divider,
  message,
  Steps,
  Tag
} from 'antd';
import { 
  CarOutlined, 
  ClockCircleOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { PricingService, PriceCalculation } from '@/services/pricingService';

const { Title, Text } = Typography;
const { Option } = Select;

interface TestOrder {
  vehicle_type: string;
  duration: number;
  use_discount: boolean;
  pricing: PriceCalculation | null;
}

export default function CreateTestOrderPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [testOrder, setTestOrder] = useState<TestOrder>({
    vehicle_type: '',
    duration: 6,
    use_discount: false,
    pricing: null
  });

  // 計算價格
  const calculatePrice = async (values: any) => {
    setCalculating(true);
    try {
      const pricing = await PricingService.calculatePrice(
        values.vehicle_type,
        values.duration,
        values.use_discount || false
      );
      
      setTestOrder({
        ...values,
        pricing
      });
      
      message.success('價格計算完成');
      setCurrentStep(1);
    } catch (error: any) {
      message.error(`價格計算失敗: ${error.message}`);
    } finally {
      setCalculating(false);
    }
  };

  // 建立測試訂單
  const createTestOrder = async () => {
    setLoading(true);
    try {
      // 模擬建立訂單
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      message.success('測試訂單已建立');
      setCurrentStep(2);
      
      // 模擬自動支付過程
      setTimeout(() => {
        message.info('封測階段自動支付啟動...');
        setCurrentStep(3);
        
        setTimeout(() => {
          message.success('自動支付完成！訂單狀態已更新為「已支付」');
          setCurrentStep(4);
        }, 3000);
      }, 2000);
      
    } catch (error: any) {
      message.error(`建立訂單失敗: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 重置測試
  const resetTest = () => {
    setCurrentStep(0);
    setTestOrder({
      vehicle_type: '',
      duration: 6,
      use_discount: false,
      pricing: null
    });
    form.resetFields();
  };

  const steps = [
    {
      title: '選擇車型和時長',
      icon: <CarOutlined />,
    },
    {
      title: '確認價格',
      icon: <DollarOutlined />,
    },
    {
      title: '建立訂單',
      icon: <ClockCircleOutlined />,
    },
    {
      title: '自動支付中',
      icon: <LoadingOutlined />,
    },
    {
      title: '完成',
      icon: <CheckCircleOutlined />,
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={2}>
          <CarOutlined className="mr-2" />
          封測階段自動支付測試
        </Title>
        <Text type="secondary">
          測試價格計算和自動支付功能
        </Text>
      </div>

      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <Card>
            <Steps current={currentStep} items={steps} className="mb-6" />
            
            {currentStep === 0 && (
              <div>
                <Title level={4}>步驟 1: 選擇車型和時長</Title>
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={calculatePrice}
                  initialValues={{
                    duration: 6,
                    use_discount: false
                  }}
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        label="車型"
                        name="vehicle_type"
                        rules={[{ required: true, message: '請選擇車型' }]}
                      >
                        <Select placeholder="請選擇車型" size="large">
                          <Option value="A">
                            <Space>
                              <CarOutlined />
                              豪華9人座 (A)
                            </Space>
                          </Option>
                          <Option value="B">
                            <Space>
                              <CarOutlined />
                              標準8人座 (B)
                            </Space>
                          </Option>
                          <Option value="C">
                            <Space>
                              <CarOutlined />
                              舒適4人座 (C)
                            </Space>
                          </Option>
                          <Option value="D">
                            <Space>
                              <CarOutlined />
                              經濟3人座 (D)
                            </Space>
                          </Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label="包車時長"
                        name="duration"
                        rules={[{ required: true, message: '請輸入時長' }]}
                      >
                        <InputNumber
                          min={1}
                          max={24}
                          addonAfter="小時"
                          size="large"
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    label="優惠選項"
                    name="use_discount"
                    valuePropName="checked"
                  >
                    <Select defaultValue={false} size="large">
                      <Option value={false}>使用原價</Option>
                      <Option value={true}>使用優惠價（需優惠碼）</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={calculating}
                      size="large"
                      block
                    >
                      {calculating ? '計算中...' : '計算價格'}
                    </Button>
                  </Form.Item>
                </Form>
              </div>
            )}

            {currentStep === 1 && testOrder.pricing && (
              <div>
                <Title level={4}>步驟 2: 確認價格</Title>
                <Alert
                  message="價格計算完成"
                  description="請確認以下價格資訊，然後建立測試訂單"
                  type="success"
                  showIcon
                  className="mb-4"
                />
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Card size="small" title="基本資訊">
                      <p><strong>車型:</strong> {PricingService.getVehicleTypeName(testOrder.vehicle_type)}</p>
                      <p><strong>時長:</strong> {testOrder.duration} 小時</p>
                      <p><strong>套餐:</strong> {testOrder.pricing.package_type === '6_hours' ? '6小時套餐' : '8小時套餐'}</p>
                      <p><strong>優惠:</strong> {testOrder.pricing.discount_applied ? '✅ 已套用' : '❌ 未套用'}</p>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" title="價格明細">
                      <p><strong>基礎價格:</strong> {PricingService.formatPrice(testOrder.pricing.base_price)}</p>
                      {testOrder.pricing.overtime_hours > 0 && (
                        <p><strong>超時費用:</strong> {PricingService.formatPrice(testOrder.pricing.overtime_cost)} ({testOrder.pricing.overtime_hours}小時)</p>
                      )}
                      <Divider style={{ margin: '8px 0' }} />
                      <p><strong>總價:</strong> <Text strong style={{ color: '#1890ff', fontSize: '18px' }}>{PricingService.formatPrice(testOrder.pricing.total_price)}</Text></p>
                      <p><strong>訂金 (30%):</strong> <Text strong style={{ color: '#52c41a' }}>{PricingService.formatPrice(testOrder.pricing.deposit_amount)}</Text></p>
                      <p><strong>尾款:</strong> {PricingService.formatPrice(testOrder.pricing.balance_amount)}</p>
                    </Card>
                  </Col>
                </Row>

                <div className="mt-4">
                  <Space>
                    <Button onClick={() => setCurrentStep(0)}>
                      返回修改
                    </Button>
                    <Button
                      type="primary"
                      onClick={createTestOrder}
                      loading={loading}
                      size="large"
                    >
                      建立測試訂單
                    </Button>
                  </Space>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="text-center">
                <Title level={4}>步驟 3: 建立訂單中...</Title>
                <LoadingOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                <p className="mt-4">正在建立測試訂單，請稍候...</p>
              </div>
            )}

            {currentStep === 3 && (
              <div className="text-center">
                <Title level={4}>步驟 4: 自動支付處理中</Title>
                <LoadingOutlined style={{ fontSize: 48, color: '#52c41a' }} />
                <p className="mt-4">封測階段自動支付功能啟動中...</p>
                <Alert
                  message="自動支付說明"
                  description="在封測階段，系統會自動將新訂單從「待支付」狀態轉換為「已支付」狀態，無需真實支付。"
                  type="info"
                  showIcon
                  className="mt-4"
                />
              </div>
            )}

            {currentStep === 4 && (
              <div className="text-center">
                <Title level={4}>✅ 測試完成！</Title>
                <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a' }} />
                <div className="mt-4">
                  <Alert
                    message="自動支付成功"
                    description="測試訂單已成功建立並自動完成支付，狀態已更新為「已支付」。"
                    type="success"
                    showIcon
                    className="mb-4"
                  />
                  
                  <Space>
                    <Button type="primary" onClick={resetTest} size="large">
                      重新測試
                    </Button>
                    <Button onClick={() => window.location.href = '/orders'}>
                      查看訂單列表
                    </Button>
                  </Space>
                </div>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="封測功能說明" size="small">
            <Alert
              message="自動支付功能"
              description="此功能僅在封測階段啟用，正式上線前會移除。"
              type="warning"
              showIcon
              className="mb-4"
            />
            
            <div className="space-y-2">
              <div>
                <Tag color="blue">功能特色</Tag>
                <ul className="mt-2 text-sm">
                  <li>• 自動價格計算</li>
                  <li>• 支援多種車型</li>
                  <li>• 超時費用計算</li>
                  <li>• 優惠價格支援</li>
                  <li>• 自動支付處理</li>
                </ul>
              </div>
              
              <Divider />
              
              <div>
                <Tag color="green">測試流程</Tag>
                <ul className="mt-2 text-sm">
                  <li>1. 選擇車型和時長</li>
                  <li>2. 系統自動計算價格</li>
                  <li>3. 建立測試訂單</li>
                  <li>4. 自動支付處理</li>
                  <li>5. 訂單狀態更新</li>
                </ul>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

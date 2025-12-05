'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  InputNumber, 
  Button, 
  Space, 
  message, 
  Statistic,
  Row,
  Col,
  Alert,
  Divider,
  Typography,
  Switch,
  Spin,
} from 'antd';
import { 
  DollarOutlined, 
  SaveOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import { createClient } from '@supabase/supabase-js';

const { Title, Text, Paragraph } = Typography;

// Supabase 客戶端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface OrderAcquisitionFeeConfig {
  amount: number;
  currency: string;
  enabled: boolean;
  updated_at: string;
}

export default function MarketingSettingsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [currentConfig, setCurrentConfig] = useState<OrderAcquisitionFeeConfig | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // 載入當前設定
  const loadSettings = async () => {
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'order_acquisition_fee')
        .single();

      if (error) {
        console.error('載入設定失敗:', error);
        message.error('載入設定失敗');
        return;
      }

      if (data?.value) {
        const config = data.value as OrderAcquisitionFeeConfig;
        setCurrentConfig(config);
        form.setFieldsValue({
          amount: config.amount,
          enabled: config.enabled,
        });
      }
    } catch (error: any) {
      console.error('載入設定錯誤:', error);
      message.error(`載入失敗: ${error.message}`);
    } finally {
      setFetching(false);
    }
  };

  // 儲存設定
  const handleSave = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();

      setLoading(true);

      const newConfig: OrderAcquisitionFeeConfig = {
        amount: values.amount,
        currency: 'TWD',
        enabled: values.enabled,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('system_settings')
        .update({ 
          value: newConfig,
          updated_at: new Date().toISOString(),
        })
        .eq('key', 'order_acquisition_fee');

      if (error) {
        throw error;
      }

      setCurrentConfig(newConfig);
      setHasChanges(false);
      message.success('設定已儲存！新金額將套用於後續建立的訂單');
    } catch (error: any) {
      console.error('儲存失敗:', error);
      message.error(`儲存失敗: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 重置表單
  const handleReset = () => {
    if (currentConfig) {
      form.setFieldsValue({
        amount: currentConfig.amount,
        enabled: currentConfig.enabled,
      });
      setHasChanges(false);
    }
  };

  // 監聽表單變更
  const handleFormChange = () => {
    setHasChanges(true);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  if (fetching) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" tip="載入設定中..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex justify-between items-center">
        <div>
          <Title level={2} className="!mb-2 flex items-center">
            <RiseOutlined className="mr-2" />
            廣告與行銷設定
          </Title>
          <Text type="secondary">管理行銷推廣相關的費用設定</Text>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={loadSettings}
          loading={fetching}
        >
          重新整理
        </Button>
      </div>

      {/* 重要提示 */}
      <Alert
        message="重要提示"
        description={
          <div>
            <Paragraph className="!mb-2">
              <InfoCircleOutlined className="mr-2" />
              修改「訂單促成費」金額後，<strong>僅適用於新建立的訂單</strong>。
            </Paragraph>
            <Paragraph className="!mb-0">
              已成交的訂單金額不會回溯修改，以確保財務報表的準確性。
            </Paragraph>
          </div>
        }
        type="info"
        showIcon
      />

      {/* 當前設定統計 */}
      {currentConfig && (
        <Row gutter={16}>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="當前訂單促成費"
                value={currentConfig.amount}
                prefix="NT$"
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="啟用狀態"
                value={currentConfig.enabled ? '已啟用' : '已停用'}
                valueStyle={{ color: currentConfig.enabled ? '#3f8600' : '#cf1322' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="最後更新時間"
                value={new Date(currentConfig.updated_at).toLocaleString('zh-TW')}
                valueStyle={{ fontSize: '16px' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 設定表單 */}
      <Card title={<><DollarOutlined className="mr-2" />訂單促成費設定</>}>
        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleFormChange}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="訂單促成費金額"
                name="amount"
                rules={[
                  { required: true, message: '請輸入金額' },
                  { type: 'number', min: 0, message: '金額不能為負數' },
                ]}
                extra="每筆訂單的推廣促成費用（新台幣）"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={10000}
                  step={100}
                  prefix="NT$"
                  placeholder="請輸入金額"
                  size="large"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label="啟用狀態"
                name="enabled"
                valuePropName="checked"
                extra="關閉後，新訂單將不會套用促成費"
              >
                <Switch
                  checkedChildren="已啟用"
                  unCheckedChildren="已停用"
                  size="default"
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Form.Item className="!mb-0">
            <Space>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={loading}
                disabled={!hasChanges}
              >
                儲存設定
              </Button>
              <Button
                onClick={handleReset}
                disabled={!hasChanges}
              >
                取消變更
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* 說明文件 */}
      <Card title="功能說明">
        <div className="space-y-4">
          <div>
            <Title level={5}>什麼是訂單促成費？</Title>
            <Paragraph>
              訂單促成費（Order Acquisition Fee / Referral Fee）是指透過行銷推廣活動（如網紅推薦、廣告投放等）
              成功促成訂單時，需要支付給推廣方的費用。
            </Paragraph>
          </div>

          <div>
            <Title level={5}>如何運作？</Title>
            <Paragraph>
              1. 在此設定訂單促成費金額（例如：NT$500）<br />
              2. 當客戶透過推廣連結或優惠碼下單時，系統會記錄當時的促成費金額<br />
              3. 訂單完成後，可在報表中查看需支付的推廣費用<br />
              4. 修改金額只影響新訂單，不會改變已成交訂單的費用
            </Paragraph>
          </div>

          <div>
            <Title level={5}>注意事項</Title>
            <Paragraph>
              • 每筆訂單會記錄建立時的促成費金額（快照機制）<br />
              • 已成交的訂單金額不會因設定變更而改變<br />
              • 關閉啟用狀態後，新訂單將不會套用促成費<br />
              • 建議定期檢視推廣效益，適時調整費用設定
            </Paragraph>
          </div>
        </div>
      </Card>
    </div>
  );
}


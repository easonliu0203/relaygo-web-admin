'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Checkbox,
  Button,
  Space,
  Spin,
  message,
  Divider,
} from 'antd';

// 服務類型常數
const SERVICE_TYPES = {
  CHARTER: 'charter',           // 包車旅遊
  INSTANT_RIDE: 'instant_ride'  // 即時派車
} as const;
import {
  ArrowLeftOutlined,
  SaveOutlined,
  CarOutlined,
} from '@ant-design/icons';
import { ApiService } from '@/services/api';

const { Option } = Select;

export default function DriverEditPage() {
  const router = useRouter();
  const params = useParams();
  const driverId = params.id as string;

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [driver, setDriver] = useState<any>(null);

  // 載入司機詳情
  const loadDriverDetail = async () => {
    setLoading(true);
    try {
      const response = await ApiService.getDriverById(driverId);

      if (response.success) {
        setDriver(response.data);
        console.log('📋 載入司機資料:', response.data);
        console.log('📋 serviceTypes:', response.data.serviceTypes);
        // 設定表單初始值
        form.setFieldsValue({
          status: response.data.status,
          isAvailable: response.data.isAvailable,
          serviceTypes: response.data.serviceTypes || [SERVICE_TYPES.CHARTER, SERVICE_TYPES.INSTANT_RIDE],
          backgroundCheckStatus: response.data.backgroundCheckStatus || 'pending',
          vehicleType: response.data.vehicleType || '',
          // 駕照與車輛欄位
          licenseNumber: response.data.licenseNumber || '',
          vehiclePlate: response.data.vehiclePlate || '',
          vehicleModel: response.data.vehicleModel || '',
          vehicleYear: response.data.vehicleYear || null,
          vehicleColor: response.data.vehicleColor || '',
          vehicleCapacity: response.data.vehicleCapacity || null,
          // 基本資訊
          email: response.data.email,
          phone: response.data.phone,
          firstName: response.data.firstName,
          lastName: response.data.lastName,
        });
      } else {
        throw new Error(response.message || '載入司機資料失敗');
      }
    } catch (error: any) {
      console.error('❌ 載入司機詳情失敗:', error);
      message.error(error.message || '載入司機詳情失敗');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (driverId) {
      loadDriverDetail();
    }
  }, [driverId]);

  // 儲存變更
  const handleSave = async (values: any) => {
    setSaving(true);
    try {
      console.log('💾 儲存司機資訊:', values);

      const response = await ApiService.updateDriver(driverId, values);

      if (response.success) {
        message.success('司機資訊更新成功');
        router.push(`/drivers/${driverId}`);
      } else {
        throw new Error(response.message || '更新司機資訊失敗');
      }
    } catch (error: any) {
      console.error('❌ 更新司機資訊失敗:', error);
      message.error(error.message || '更新司機資訊失敗');
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
            <CarOutlined className="mr-2" />
            編輯司機資訊
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

          <Form.Item
            label="接單狀態"
            name="isAvailable"
            valuePropName="checked"
            extra="關閉後司機將無法接收新訂單，適用於違規處理"
          >
            <Switch
              checkedChildren="可接單"
              unCheckedChildren="不可接單"
            />
          </Form.Item>

          <Form.Item
            label="此司機可接受的服務類型"
            name="serviceTypes"
            rules={[
              { required: true, message: '請至少選擇一種服務類型' },
              {
                validator: (_, value) => {
                  if (!value || value.length === 0) {
                    return Promise.reject('請至少選擇一種服務類型');
                  }
                  return Promise.resolve();
                }
              }
            ]}
            extra="選擇此司機可以接受的訂單類型，至少選擇一種"
          >
            <Checkbox.Group>
              <Space direction="vertical">
                <Checkbox value={SERVICE_TYPES.CHARTER}>
                  包車旅遊 (Charter Service)
                </Checkbox>
                <Checkbox value={SERVICE_TYPES.INSTANT_RIDE}>
                  即時派單 A→B 點 (Instant Ride)
                </Checkbox>
              </Space>
            </Checkbox.Group>
          </Form.Item>

          <Form.Item
            label="審核狀態"
            name="backgroundCheckStatus"
            extra="司機的背景審查狀態"
          >
            <Select placeholder="請選擇審核狀態">
              <Option value="pending">待審核 (Pending)</Option>
              <Option value="approved">已通過 (Approved)</Option>
              <Option value="rejected">已拒絕 (Rejected)</Option>
            </Select>
          </Form.Item>

          <Divider orientation="left">車輛資訊</Divider>

          <Form.Item
            label="車型分類"
            name="vehicleType"
            extra="選擇司機的車輛類型"
          >
            <Select placeholder="請選擇車型分類" allowClear>
              <Option value="XS">XS — Extra Small</Option>
              <Option value="S">S — Small</Option>
              <Option value="M">M — Medium</Option>
              <Option value="L">L — Large</Option>
              <Option value="XL">XL — Extra Large</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="車牌號碼"
            name="vehiclePlate"
            extra="例如：ABC-1234"
          >
            <Input placeholder="請輸入車牌號碼" allowClear />
          </Form.Item>

          <Form.Item
            label="車輛型號"
            name="vehicleModel"
            extra="例如：Toyota Alphard、Honda Odyssey"
          >
            <Input placeholder="請輸入車輛型號" allowClear />
          </Form.Item>

          <Form.Item
            label="車輛年份"
            name="vehicleYear"
            rules={[
              {
                validator: (_, value) => {
                  if (value === undefined || value === null || value === '') return Promise.resolve();
                  const currentYear = new Date().getFullYear();
                  if (typeof value !== 'number' || value < 1990 || value > currentYear + 1) {
                    return Promise.reject(`請輸入 1990 - ${currentYear + 1} 之間的年份`);
                  }
                  return Promise.resolve();
                },
              },
            ]}
            extra="出廠年份（西元）"
          >
            <InputNumber
              placeholder="例如：2022"
              min={1990}
              max={new Date().getFullYear() + 1}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            label="車輛顏色"
            name="vehicleColor"
            extra="例如：黑色、白色、銀色"
          >
            <Input placeholder="請輸入車輛顏色" allowClear />
          </Form.Item>

          <Form.Item
            label="車輛載客量"
            name="vehicleCapacity"
            rules={[
              {
                validator: (_, value) => {
                  if (value === undefined || value === null || value === '') return Promise.resolve();
                  if (typeof value !== 'number' || value < 1 || value > 50) {
                    return Promise.reject('載客量應為 1 - 50 人之間');
                  }
                  return Promise.resolve();
                },
              },
            ]}
            extra="不含駕駛的乘客座位數"
          >
            <InputNumber
              placeholder="例如：4"
              min={1}
              max={50}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Divider orientation="left">證照</Divider>

          <Form.Item
            label="駕照號碼"
            name="licenseNumber"
            extra="司機的駕照證件號碼"
          >
            <Input placeholder="請輸入駕照號碼" allowClear />
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
          <p><strong>接單狀態說明：</strong></p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li><strong>可接單 (TRUE)</strong>：司機可以接收新訂單</li>
            <li><strong>不可接單 (FALSE)</strong>：司機無法接收新訂單</li>
          </ul>
          <Divider />
          <p><strong>服務類型說明：</strong></p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li><strong>包車旅遊 (Charter)</strong>：司機可接受包車旅遊訂單</li>
            <li><strong>即時派單 (Instant Ride)</strong>：司機可接受 A→B 點即時派單</li>
          </ul>
          <p className="text-gray-600 mt-2">
            司機可以同時接受兩種服務類型，但必須至少選擇一種。
          </p>
          <Divider />
          <p><strong>恢復已刪除帳號：</strong></p>
          <p className="text-gray-600">
            如果司機要求恢復帳號，請將狀態從「已刪除 (Deleted)」改回「啟用 (Active)」
          </p>
          <Divider />
          <p><strong>處理違規司機：</strong></p>
          <p className="text-gray-600">
            如果司機有違規行為，可以將「接單狀態」設為「不可接單」，暫停其接單功能
          </p>
        </div>
      </Card>
    </div>
  );
}



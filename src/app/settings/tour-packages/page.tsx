'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Typography,
  Space,
  message,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Tag,
  Popconfirm,
  Tabs,
  Badge,
  Divider,
  Alert,
  Select
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SaveOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  CheckCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;

// 支援的語言列表
const SUPPORTED_LANGUAGES = [
  { code: 'zh-TW', name: '繁體中文', flag: '🇹🇼' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
];

// 支援的國家列表
const SUPPORTED_COUNTRIES = [
  { code: 'TW', name: '台灣', name_en: 'Taiwan' },
  { code: 'JP', name: '日本', name_en: 'Japan' },
  { code: 'KR', name: '韓國', name_en: 'South Korea' },
  { code: 'VN', name: '越南', name_en: 'Vietnam' },
  { code: 'TH', name: '泰國', name_en: 'Thailand' },
  { code: 'MY', name: '馬來西亞', name_en: 'Malaysia' },
  { code: 'ID', name: '印尼', name_en: 'Indonesia' },
];

interface TourPackage {
  id: string;
  name: string;
  description: string;
  name_i18n?: Record<string, string>;
  description_i18n?: Record<string, string>;
  country?: string;
  region?: string;
  country_i18n?: Record<string, string>;
  region_i18n?: Record<string, string>;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export default function TourPackagesPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [packages, setPackages] = useState<TourPackage[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPackage, setEditingPackage] = useState<TourPackage | null>(null);
  const [activeTab, setActiveTab] = useState('zh-TW');

  // API Base URL
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.relaygo.pro';

  // 計算翻譯完成度
  const getTranslationCompleteness = (pkg: TourPackage) => {
    const nameCount = Object.keys(pkg.name_i18n || {}).length;
    const descCount = Object.keys(pkg.description_i18n || {}).length;
    const total = SUPPORTED_LANGUAGES.length;
    const completed = Math.min(nameCount, descCount);
    return { completed, total, percentage: Math.round((completed / total) * 100) };
  };

  // 獲取翻譯狀態
  const getTranslationStatus = (pkg: TourPackage, lang: string) => {
    const hasName = !!(pkg.name_i18n && pkg.name_i18n[lang]);
    const hasDesc = !!(pkg.description_i18n && pkg.description_i18n[lang]);

    if (hasName && hasDesc) return 'complete';
    if (hasName || hasDesc) return 'partial';
    return 'empty';
  };

  // 載入旅遊方案列表
  const loadPackages = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/tour-packages`);
      const result = await response.json();
      
      if (result.success) {
        setPackages(result.data || []);
        message.success(`成功載入 ${result.count} 個旅遊方案`);
      } else {
        message.error('載入旅遊方案失敗');
      }
    } catch (error) {
      console.error('載入旅遊方案錯誤:', error);
      message.error('載入旅遊方案失敗');
    } finally {
      setLoading(false);
    }
  };

  // 初始載入
  useEffect(() => {
    loadPackages();
  }, []);

  // 開啟新增/編輯對話框
  const openModal = (pkg?: TourPackage) => {
    setActiveTab('zh-TW'); // 重置到繁體中文標籤

    if (pkg) {
      setEditingPackage(pkg);
      // 設置基本欄位（包含國家和地區）
      form.setFieldsValue({
        is_active: pkg.is_active,
        display_order: pkg.display_order,
        country: pkg.country || 'TW',
        region: pkg.region || 'taipei',
      });

      // 設置多語言欄位
      SUPPORTED_LANGUAGES.forEach(lang => {
        form.setFieldValue(['name_i18n', lang.code], pkg.name_i18n?.[lang.code] || '');
        form.setFieldValue(['description_i18n', lang.code], pkg.description_i18n?.[lang.code] || '');
        form.setFieldValue(['country_i18n', lang.code], pkg.country_i18n?.[lang.code] || '');
        form.setFieldValue(['region_i18n', lang.code], pkg.region_i18n?.[lang.code] || '');
      });
    } else {
      setEditingPackage(null);
      form.resetFields();
      form.setFieldsValue({
        is_active: true,
        display_order: packages.length + 1,
        country: 'TW',
        region: 'taipei',
      });
    }
    setModalVisible(true);
  };

  // 關閉對話框
  const closeModal = () => {
    setModalVisible(false);
    setEditingPackage(null);
    form.resetFields();
  };

  // 儲存旅遊方案
  const savePackage = async (values: any) => {
    setSaving(true);
    try {
      // 構建多語言資料
      const name_i18n: Record<string, string> = {};
      const description_i18n: Record<string, string> = {};
      const country_i18n: Record<string, string> = {};
      const region_i18n: Record<string, string> = {};

      SUPPORTED_LANGUAGES.forEach(lang => {
        if (values.name_i18n?.[lang.code]) {
          name_i18n[lang.code] = values.name_i18n[lang.code];
        }
        if (values.description_i18n?.[lang.code]) {
          description_i18n[lang.code] = values.description_i18n[lang.code];
        }
        if (values.country_i18n?.[lang.code]) {
          country_i18n[lang.code] = values.country_i18n[lang.code];
        }
        if (values.region_i18n?.[lang.code]) {
          region_i18n[lang.code] = values.region_i18n[lang.code];
        }
      });

      // 使用繁體中文作為預設 name 和 description
      const defaultName = name_i18n['zh-TW'] || '';
      const defaultDescription = description_i18n['zh-TW'] || '';

      const payload = {
        name: defaultName,
        description: defaultDescription,
        name_i18n,
        description_i18n,
        country: values.country || 'TW',
        region: values.region || 'taipei',
        country_i18n,
        region_i18n,
        is_active: values.is_active,
        display_order: values.display_order,
      };

      const url = editingPackage
        ? `${API_URL}/api/tour-packages/${editingPackage.id}`
        : `${API_URL}/api/tour-packages`;

      const method = editingPackage ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        message.success(editingPackage ? '旅遊方案已更新' : '旅遊方案已新增');
        closeModal();
        loadPackages();
      } else {
        message.error(result.error || '儲存失敗');
      }
    } catch (error) {
      console.error('儲存旅遊方案錯誤:', error);
      message.error('儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  // 刪除旅遊方案
  const deletePackage = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/tour-packages/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        message.success('旅遊方案已刪除');
        loadPackages();
      } else {
        message.error(result.error || '刪除失敗');
      }
    } catch (error) {
      console.error('刪除旅遊方案錯誤:', error);
      message.error('刪除失敗');
    }
  };

  // 切換啟用狀態
  const toggleActive = async (pkg: TourPackage) => {
    try {
      const response = await fetch(`${API_URL}/api/tour-packages/${pkg.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...pkg,
          is_active: !pkg.is_active,
        }),
      });

      const result = await response.json();

      if (result.success) {
        message.success(`已${!pkg.is_active ? '啟用' : '停用'}旅遊方案`);
        loadPackages();
      } else {
        message.error(result.error || '更新失敗');
      }
    } catch (error) {
      console.error('更新旅遊方案錯誤:', error);
      message.error('更新失敗');
    }
  };

  // 表格列定義
  const columns = [
    {
      title: '顯示順序',
      dataIndex: 'display_order',
      key: 'display_order',
      width: 100,
      sorter: (a: TourPackage, b: TourPackage) => a.display_order - b.display_order,
      render: (order: number) => (
        <Tag color="blue">{order}</Tag>
      ),
    },
    {
      title: '方案名稱',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: TourPackage) => (
        <Space>
          <EnvironmentOutlined />
          <Text strong>{record.name_i18n?.['zh-TW'] || name}</Text>
        </Space>
      ),
    },
    {
      title: '方案描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (description: string, record: TourPackage) => (
        <Text ellipsis>{record.description_i18n?.['zh-TW'] || description}</Text>
      ),
    },
    {
      title: '翻譯完成度',
      key: 'translation',
      width: 150,
      render: (_: any, record: TourPackage) => {
        const { completed, total, percentage } = getTranslationCompleteness(record);
        const isComplete = completed === total;

        return (
          <Space>
            <Text>{completed}/{total}</Text>
            {isComplete ? (
              <Tag color="success" icon={<CheckCircleOutlined />}>完成</Tag>
            ) : (
              <Tag color="warning" icon={<WarningOutlined />}>{percentage}%</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: '狀態',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 120,
      render: (isActive: boolean, record: TourPackage) => (
        <Switch
          checked={isActive}
          checkedChildren="啟用"
          unCheckedChildren="停用"
          onChange={() => toggleActive(record)}
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_: any, record: TourPackage) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => openModal(record)}
          >
            編輯
          </Button>
          <Popconfirm
            title="確定要刪除此旅遊方案嗎？"
            onConfirm={() => deletePackage(record.id)}
            okText="確定"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
            >
              刪除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={2}>
          <EnvironmentOutlined className="mr-2" />
          旅遊方案管理
        </Title>
        <Text type="secondary">
          管理客戶端訂單流程中的旅遊地點選擇方案
        </Text>
      </div>

      {/* 旅遊方案列表 */}
      <Card
        title="旅遊方案列表"
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadPackages}
              loading={loading}
            >
              重新載入
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openModal()}
            >
              新增方案
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={packages}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 個方案`,
          }}
        />
      </Card>

      {/* 新增/編輯對話框 */}
      <Modal
        title={
          <Space>
            <GlobalOutlined />
            {editingPackage ? '編輯旅遊方案' : '新增旅遊方案'}
          </Space>
        }
        open={modalVisible}
        onCancel={closeModal}
        footer={null}
        width={800}
        style={{ top: 20 }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={savePackage}
        >
          {/* 基本設定區塊 */}
          <Card size="small" title="基本設定" className="mb-4">
            <div className="grid grid-cols-2 gap-4">
              <Form.Item
                label="顯示順序"
                name="display_order"
                rules={[{ required: true, message: '請輸入顯示順序' }]}
              >
                <InputNumber
                  min={1}
                  style={{ width: '100%' }}
                  placeholder="數字越小越靠前"
                />
              </Form.Item>

              <Form.Item
                label="啟用狀態"
                name="is_active"
                valuePropName="checked"
              >
                <Switch
                  checkedChildren="啟用"
                  unCheckedChildren="停用"
                />
              </Form.Item>

              <Form.Item
                label="國家"
                name="country"
                rules={[{ required: true, message: '請選擇國家' }]}
              >
                <Select placeholder="請選擇國家">
                  {SUPPORTED_COUNTRIES.map(c => (
                    <Select.Option key={c.code} value={c.code}>
                      {c.name} ({c.name_en})
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                label="地區代碼"
                name="region"
                rules={[{ required: true, message: '請輸入地區代碼' }]}
                tooltip="例如：taipei, taichung, kaohsiung, jiufen, sunmoonlake"
              >
                <Input placeholder="例如：taipei, taichung" />
              </Form.Item>
            </div>
          </Card>

          {/* 多語言內容區塊 */}
          <Card size="small" title={<Space><GlobalOutlined />多語言內容</Space>} className="mb-4">
            <Alert
              message="提示"
              description="請至少填寫繁體中文的方案名稱和描述。其他語言為選填，可稍後補充。"
              type="info"
              showIcon
              className="mb-4"
            />

            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={SUPPORTED_LANGUAGES.map(lang => {
                const status = editingPackage ? getTranslationStatus(editingPackage, lang.code) : 'empty';

                return {
                  key: lang.code,
                  label: (
                    <Space>
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                      {status === 'complete' && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                      {status === 'partial' && <WarningOutlined style={{ color: '#faad14' }} />}
                    </Space>
                  ),
                  children: (
                    <div className="py-4">
                      <Form.Item
                        label={`方案名稱 (${lang.name})`}
                        name={['name_i18n', lang.code]}
                        rules={lang.code === 'zh-TW' ? [{ required: true, message: '請輸入繁體中文方案名稱' }] : []}
                      >
                        <Input
                          placeholder={`請輸入${lang.name}方案名稱`}
                          prefix={<EnvironmentOutlined />}
                        />
                      </Form.Item>

                      <Form.Item
                        label={`方案描述 (${lang.name})`}
                        name={['description_i18n', lang.code]}
                        rules={lang.code === 'zh-TW' ? [{ required: true, message: '請輸入繁體中文方案描述' }] : []}
                      >
                        <TextArea
                          rows={4}
                          placeholder={`請輸入${lang.name}方案的詳細描述，包含主要景點和特色`}
                        />
                      </Form.Item>

                      <Divider orientation="left" plain>地區翻譯</Divider>

                      <div className="grid grid-cols-2 gap-4">
                        <Form.Item
                          label={`國家名稱 (${lang.name})`}
                          name={['country_i18n', lang.code]}
                        >
                          <Input placeholder={`請輸入${lang.name}國家名稱`} />
                        </Form.Item>

                        <Form.Item
                          label={`地區名稱 (${lang.name})`}
                          name={['region_i18n', lang.code]}
                        >
                          <Input placeholder={`請輸入${lang.name}地區名稱`} />
                        </Form.Item>
                      </div>

                      {/* 翻譯狀態提示 */}
                      <div className="text-sm text-gray-500">
                        {status === 'complete' && (
                          <Tag color="success" icon={<CheckCircleOutlined />}>
                            翻譯完成
                          </Tag>
                        )}
                        {status === 'partial' && (
                          <Tag color="warning" icon={<WarningOutlined />}>
                            部分完成
                          </Tag>
                        )}
                        {status === 'empty' && (
                          <Tag color="default">
                            尚未翻譯
                          </Tag>
                        )}
                      </div>
                    </div>
                  ),
                };
              })}
            />
          </Card>

          {/* 操作按鈕 */}
          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={closeModal}>
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={saving}
              >
                儲存
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}


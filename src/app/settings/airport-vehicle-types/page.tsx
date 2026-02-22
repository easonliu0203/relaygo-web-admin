'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Typography,
  Space,
  message,
  Switch,
  InputNumber,
  Input,
  Select,
  Popconfirm,
  Tag,
  Modal,
  Form,
  Tabs,
  Badge,
  Alert,
  Tooltip,
} from 'antd';
import {
  CarOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SaveOutlined,
  GlobalOutlined,
  TeamOutlined,
  TranslationOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { createClient } from '@supabase/supabase-js';
import { FirebaseService } from '@/lib/firebase';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// 翻譯 API 端點
const TRANSLATE_API_URL = 'https://asia-east1-ride-platform-f1676.cloudfunctions.net/translate';

// Supabase 客戶端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

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

const VEHICLE_TYPE_OPTIONS = [
  { value: 'XS', label: 'XS - Extra Small 特小型' },
  { value: 'S', label: 'S - Small 小型' },
  { value: 'M', label: 'M - Medium 中型' },
  { value: 'L', label: 'L - Large 大型' },
  { value: 'XL', label: 'XL - Extra Large 特大型' },
];

interface AirportVehicleType {
  id: string;
  country: string;
  vehicle_type: string;
  price_list_name: string;
  price_list_name_i18n?: Record<string, string>;
  capacity_info: string;
  capacity_info_i18n?: Record<string, string>;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AirportVehicleTypesPage() {
  const [loading, setLoading] = useState(false);
  const [dataList, setDataList] = useState<AirportVehicleType[]>([]);
  const [editingRecord, setEditingRecord] = useState<AirportVehicleType | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('zh-TW');
  const [translating, setTranslating] = useState<Record<string, boolean>>({});
  const [form] = Form.useForm();

  // ── 翻譯 ──

  const translateField = async (text: string, targetLang: string): Promise<string> => {
    try {
      const user = await FirebaseService.getCurrentUser() as any;
      let authToken = '';
      if (user && typeof user.getIdToken === 'function') {
        authToken = await user.getIdToken();
      }

      const response = await fetch(TRANSLATE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
        },
        body: JSON.stringify({ text, targetLang }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '翻譯失敗');
      }

      const result = await response.json();
      return result.translatedText || '';
    } catch (error: any) {
      console.error('翻譯錯誤:', error);
      throw error;
    }
  };

  const translateAllFields = async (targetLang: string) => {
    const langKey = `translate_${targetLang}`;
    try {
      const zhTWName = form.getFieldValue(['price_list_name_i18n', 'zh-TW']);
      const zhTWCapacity = form.getFieldValue(['capacity_info_i18n', 'zh-TW']);

      if (!zhTWName && !zhTWCapacity) {
        message.warning('請先填寫繁體中文的方案名稱或容量描述');
        return;
      }

      const existingName = form.getFieldValue(['price_list_name_i18n', targetLang]);
      const existingCapacity = form.getFieldValue(['capacity_info_i18n', targetLang]);

      if (existingName || existingCapacity) {
        const confirmed = await new Promise<boolean>((resolve) => {
          Modal.confirm({
            title: '確認覆蓋',
            content: '目標語言已有內容，是否要覆蓋？',
            okText: '確定',
            cancelText: '取消',
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
          });
        });
        if (!confirmed) return;
      }

      setTranslating(prev => ({ ...prev, [langKey]: true }));
      message.loading({ content: '正在翻譯...', key: langKey, duration: 0 });

      if (zhTWName) {
        try {
          const translated = await translateField(zhTWName, targetLang);
          form.setFieldValue(['price_list_name_i18n', targetLang], translated);
        } catch (error) {
          console.error('翻譯方案名稱失敗:', error);
        }
      }

      if (zhTWCapacity) {
        try {
          const translated = await translateField(zhTWCapacity, targetLang);
          form.setFieldValue(['capacity_info_i18n', targetLang], translated);
        } catch (error) {
          console.error('翻譯容量描述失敗:', error);
        }
      }

      message.success({ content: '翻譯完成！', key: langKey });
    } catch (error: any) {
      message.error({ content: `翻譯失敗: ${error.message}`, key: langKey });
    } finally {
      setTranslating(prev => ({ ...prev, [langKey]: false }));
    }
  };

  // ── 翻譯狀態 ──

  const getTranslationCompleteness = (record: AirportVehicleType) => {
    const nameCount = Object.keys(record.price_list_name_i18n || {}).length;
    const capacityCount = Object.keys(record.capacity_info_i18n || {}).length;
    const total = SUPPORTED_LANGUAGES.length;
    const completed = Math.min(nameCount, capacityCount);
    return { completed, total, percentage: Math.round((completed / total) * 100) };
  };

  const getTranslationStatus = (record: AirportVehicleType, lang: string) => {
    const hasName = !!(record.price_list_name_i18n && record.price_list_name_i18n[lang]);
    const hasCapacity = !!(record.capacity_info_i18n && record.capacity_info_i18n[lang]);
    if (hasName && hasCapacity) return 'complete';
    if (hasName || hasCapacity) return 'partial';
    return 'empty';
  };

  // ── CRUD ──

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('airport_transfer_vehicle_types')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setDataList(data || []);
    } catch (error: any) {
      message.error(`載入失敗: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (record: AirportVehicleType) => {
    try {
      const { error } = await supabase
        .from('airport_transfer_vehicle_types')
        .update({ is_active: !record.is_active })
        .eq('id', record.id);

      if (error) throw error;
      message.success(`已${!record.is_active ? '啟用' : '停用'}該車型`);
      loadData();
    } catch (error: any) {
      message.error(`操作失敗: ${error.message}`);
    }
  };

  const deleteRecord = async (id: string) => {
    try {
      const { error } = await supabase
        .from('airport_transfer_vehicle_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
      message.success('刪除成功');
      loadData();
    } catch (error: any) {
      message.error(`刪除失敗: ${error.message}`);
    }
  };

  const showModal = (record?: AirportVehicleType) => {
    setActiveTab('zh-TW');

    if (record) {
      setEditingRecord(record);
      form.setFieldsValue({
        vehicle_type: record.vehicle_type,
        display_order: record.display_order,
        is_active: record.is_active,
      });

      SUPPORTED_LANGUAGES.forEach(lang => {
        form.setFieldValue(['price_list_name_i18n', lang.code], record.price_list_name_i18n?.[lang.code] || '');
        form.setFieldValue(['capacity_info_i18n', lang.code], record.capacity_info_i18n?.[lang.code] || '');
      });
    } else {
      setEditingRecord(null);
      form.resetFields();
      form.setFieldsValue({
        is_active: true,
        display_order: dataList.length + 1,
      });
    }
    setIsModalVisible(true);
  };

  const handleSave = async (values: any) => {
    try {
      const price_list_name_i18n: Record<string, string> = {};
      const capacity_info_i18n: Record<string, string> = {};

      SUPPORTED_LANGUAGES.forEach(lang => {
        if (values.price_list_name_i18n?.[lang.code]) {
          price_list_name_i18n[lang.code] = values.price_list_name_i18n[lang.code];
        }
        if (values.capacity_info_i18n?.[lang.code]) {
          capacity_info_i18n[lang.code] = values.capacity_info_i18n[lang.code];
        }
      });

      const defaultName = price_list_name_i18n['zh-TW'] || '';
      const defaultCapacity = capacity_info_i18n['zh-TW'] || '';

      const payload = {
        country: 'TW',
        vehicle_type: values.vehicle_type,
        price_list_name: defaultName,
        price_list_name_i18n,
        capacity_info: defaultCapacity,
        capacity_info_i18n,
        display_order: values.display_order,
        is_active: values.is_active,
      };

      if (editingRecord) {
        const { error } = await supabase
          .from('airport_transfer_vehicle_types')
          .update(payload)
          .eq('id', editingRecord.id);

        if (error) throw error;
        message.success('更新成功');
      } else {
        const { error } = await supabase
          .from('airport_transfer_vehicle_types')
          .insert([payload]);

        if (error) throw error;
        message.success('新增成功');
      }

      setIsModalVisible(false);
      form.resetFields();
      loadData();
    } catch (error: any) {
      message.error(`儲存失敗: ${error.message}`);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ── 表格欄位 ──

  const columns = [
    {
      title: '顯示順序',
      dataIndex: 'display_order',
      key: 'display_order',
      width: 100,
      sorter: (a: AirportVehicleType, b: AirportVehicleType) => a.display_order - b.display_order,
      render: (order: number) => <Tag color="blue">{order}</Tag>,
    },
    {
      title: '狀態',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 120,
      render: (isActive: boolean, record: AirportVehicleType) => (
        <Switch
          checked={isActive}
          checkedChildren="啟用"
          unCheckedChildren="停用"
          onChange={() => toggleActive(record)}
        />
      ),
    },
    {
      title: '車型',
      dataIndex: 'vehicle_type',
      key: 'vehicle_type',
      width: 120,
      render: (type: string) => {
        const option = VEHICLE_TYPE_OPTIONS.find(opt => opt.value === type);
        return <Tag color="purple">{option?.label || type}</Tag>;
      },
    },
    {
      title: '方案名稱',
      dataIndex: 'price_list_name',
      key: 'price_list_name',
      width: 200,
      render: (name: string, record: AirportVehicleType) => (
        <Space>
          <CarOutlined />
          <Text>{record.price_list_name_i18n?.['zh-TW'] || name}</Text>
        </Space>
      ),
    },
    {
      title: '容量描述',
      dataIndex: 'capacity_info',
      key: 'capacity_info',
      width: 180,
      render: (capacity: string, record: AirportVehicleType) => (
        <Space>
          <TeamOutlined />
          <Text>{record.capacity_info_i18n?.['zh-TW'] || capacity || '—'}</Text>
        </Space>
      ),
    },
    {
      title: '翻譯完成度',
      key: 'translation',
      width: 150,
      render: (_: any, record: AirportVehicleType) => {
        const { completed, total, percentage } = getTranslationCompleteness(record);
        let color = 'default';
        if (percentage === 100) color = 'success';
        else if (percentage >= 50) color = 'processing';
        else if (percentage > 0) color = 'warning';

        return (
          <Space>
            <Badge
              count={`${completed}/${total}`}
              style={{
                backgroundColor: color === 'success' ? '#52c41a' : color === 'processing' ? '#1890ff' : color === 'warning' ? '#faad14' : '#d9d9d9'
              }}
            />
            <Text type="secondary">{percentage}%</Text>
          </Space>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: AirportVehicleType) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => showModal(record)}
          >
            編輯
          </Button>
          <Popconfirm
            title="確定要刪除此車型嗎？"
            onConfirm={() => deleteRecord(record.id)}
            okText="確定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
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
          <CarOutlined className="mr-2" />
          機場接送車型管理
        </Title>
        <Text type="secondary">
          管理機場接送服務的車型方案（名稱、容量描述、多語系翻譯）
        </Text>
      </div>

      <Card
        title={`車型方案列表 (共 ${dataList.length} 個)`}
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadData}
              loading={loading}
            >
              重新載入
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => showModal()}
            >
              新增車型
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={dataList}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* 新增/編輯 Modal */}
      <Modal
        title={editingRecord ? '編輯機場接送車型' : '新增機場接送車型'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            is_active: true,
            display_order: dataList.length + 1,
          }}
        >
          {/* 基本設定 */}
          <Card size="small" title="基本設定" className="mb-4">
            <Form.Item
              label="車型等級"
              name="vehicle_type"
              rules={[{ required: true, message: '請選擇車型等級' }]}
            >
              <Select placeholder="請選擇車型等級">
                {VEHICLE_TYPE_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="顯示順序"
              name="display_order"
              rules={[{ required: true, message: '請輸入顯示順序' }]}
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                placeholder="數字越小越靠前"
              />
            </Form.Item>

            <Form.Item
              label="狀態"
              name="is_active"
              valuePropName="checked"
            >
              <Switch checkedChildren="啟用" unCheckedChildren="停用" />
            </Form.Item>
          </Card>

          {/* 多語言內容 */}
          <Card size="small" title={<Space><GlobalOutlined />多語言內容</Space>} className="mb-4">
            <Alert
              message="提示"
              description="請至少填寫繁體中文的方案名稱和容量描述。其他語言為選填，可稍後補充。"
              type="info"
              showIcon
              className="mb-4"
            />

            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={SUPPORTED_LANGUAGES.map(lang => {
                const status = editingRecord ? getTranslationStatus(editingRecord, lang.code) : 'empty';

                return {
                  key: lang.code,
                  label: (
                    <Space>
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                      {status === 'complete' && <Badge status="success" />}
                      {status === 'partial' && <Badge status="warning" />}
                    </Space>
                  ),
                  children: (
                    <div className="py-4">
                      {lang.code !== 'zh-TW' && (
                        <div className="mb-4">
                          <Tooltip title="自動將繁體中文內容翻譯成此語言">
                            <Button
                              type="dashed"
                              icon={translating[`translate_${lang.code}`] ? <LoadingOutlined /> : <TranslationOutlined />}
                              onClick={() => translateAllFields(lang.code)}
                              loading={translating[`translate_${lang.code}`]}
                              block
                            >
                              {translating[`translate_${lang.code}`] ? '翻譯中...' : '🌐 自動翻譯全部欄位'}
                            </Button>
                          </Tooltip>
                        </div>
                      )}

                      <Form.Item
                        label={`方案名稱 (${lang.name})`}
                        name={['price_list_name_i18n', lang.code]}
                        rules={lang.code === 'zh-TW' ? [{ required: true, message: '請輸入繁體中文方案名稱' }] : []}
                      >
                        <Input
                          placeholder={`請輸入${lang.name}方案名稱，例如：五人座轎車`}
                          prefix={<CarOutlined />}
                        />
                      </Form.Item>

                      <Form.Item
                        label={`容量描述 (${lang.name})`}
                        name={['capacity_info_i18n', lang.code]}
                        rules={lang.code === 'zh-TW' ? [{ required: true, message: '請輸入繁體中文容量描述' }] : []}
                      >
                        <TextArea
                          rows={3}
                          placeholder={`請輸入${lang.name}容量描述，例如：最多3人，行李2件`}
                        />
                      </Form.Item>
                    </div>
                  ),
                };
              })}
            />
          </Card>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                儲存
              </Button>
              <Button onClick={() => {
                setIsModalVisible(false);
                form.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
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
  Spin,
  Tooltip,
} from 'antd';
import {
  DollarOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SaveOutlined,
  GlobalOutlined,
  CarOutlined,
  TeamOutlined,
  TranslationOutlined,
  LoadingOutlined,
  HolderOutlined,
} from '@ant-design/icons';
import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

interface VehiclePricing {
  id: string;
  vehicle_type: string;
  vehicle_description: string;
  vehicle_description_i18n?: Record<string, string>;
  capacity_info: string;
  capacity_info_i18n?: Record<string, string>;
  duration_hours: number;
  base_price: number;
  overtime_rate: number;
  is_active: boolean;
  display_order: number;
  country: string;
  region: string;
  created_at: string;
  updated_at: string;
}

const REGION_OPTIONS = [
  { value: 'default', label: '全國預設 (default)' },
  { value: 'north',   label: '北部 (north) — 台北、新北、基隆、桃園、新竹、宜蘭' },
  { value: 'central', label: '中部 (central) — 台中、苗栗、彰化、南投、雲林' },
  { value: 'south',   label: '南部 (south) — 高雄、台南、嘉義、屏東' },
  { value: 'east',    label: '東部 (east) — 花蓮、台東' },
];

const VEHICLE_TYPE_OPTIONS = [
  { value: 'XS', label: 'XS - Extra Small 特小型' },
  { value: 'S', label: 'S - Small 小型' },
  { value: 'M', label: 'M - Medium 中型' },
  { value: 'L', label: 'L - Large 大型' },
  { value: 'XL', label: 'XL - Extra Large 特大型' },
];

const DURATION_OPTIONS = [
  { value: 4, label: '4小時' },
  { value: 6, label: '6小時' },
  { value: 8, label: '8小時' },
];

// Drag-sortable table row
interface RowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  'data-row-key': string;
}

function SortableRow(props: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props['data-row-key'],
  });

  const style: React.CSSProperties = {
    ...props.style,
    transform: CSS.Translate.toString(transform),
    transition,
    ...(isDragging ? { position: 'relative', zIndex: 9999, background: '#fafafa' } : {}),
  };

  return <tr {...props} ref={setNodeRef} style={style} {...attributes} {...listeners} />;
}

export default function PricingSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [pricingList, setPricingList] = useState<VehiclePricing[]>([]);
  const [editingKey, setEditingKey] = useState<string>('');
  const [editingRecord, setEditingRecord] = useState<VehiclePricing | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('zh-TW');
  const [translating, setTranslating] = useState<Record<string, boolean>>({});
  const [form] = Form.useForm();

  // 翻譯單個欄位
  const translateField = async (text: string, targetLang: string): Promise<string> => {
    try {
      // 獲取 Firebase Auth Token
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
        body: JSON.stringify({
          text,
          targetLang,
        }),
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

  // 翻譯所有欄位
  const translateAllFields = async (targetLang: string) => {
    const langKey = `translate_${targetLang}`;

    try {
      // 獲取繁體中文內容
      const zhTWVehicleDescription = form.getFieldValue(['vehicle_description_i18n', 'zh-TW']);
      const zhTWCapacityInfo = form.getFieldValue(['capacity_info_i18n', 'zh-TW']);

      // 檢查是否有繁體中文內容
      if (!zhTWVehicleDescription && !zhTWCapacityInfo) {
        message.warning('請先填寫繁體中文的車型描述或內容描述');
        return;
      }

      // 檢查目標語言是否已有內容
      const existingVehicleDescription = form.getFieldValue(['vehicle_description_i18n', targetLang]);
      const existingCapacityInfo = form.getFieldValue(['capacity_info_i18n', targetLang]);

      if (existingVehicleDescription || existingCapacityInfo) {
        const confirmed = await new Promise<boolean>((resolve) => {
          Modal.confirm({
            title: '確認覆蓋',
            content: `目標語言已有內容，是否要覆蓋？`,
            okText: '確定',
            cancelText: '取消',
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
          });
        });

        if (!confirmed) return;
      }

      // 開始翻譯
      setTranslating(prev => ({ ...prev, [langKey]: true }));
      message.loading({ content: '正在翻譯...', key: langKey, duration: 0 });

      const translations: Record<string, string> = {};

      // 翻譯車型描述
      if (zhTWVehicleDescription) {
        try {
          translations.vehicleDescription = await translateField(zhTWVehicleDescription, targetLang);
        } catch (error) {
          console.error('翻譯車型描述失敗:', error);
        }
      }

      // 翻譯內容描述
      if (zhTWCapacityInfo) {
        try {
          translations.capacityInfo = await translateField(zhTWCapacityInfo, targetLang);
        } catch (error) {
          console.error('翻譯內容描述失敗:', error);
        }
      }

      // 更新表單欄位
      if (translations.vehicleDescription) {
        form.setFieldValue(['vehicle_description_i18n', targetLang], translations.vehicleDescription);
      }
      if (translations.capacityInfo) {
        form.setFieldValue(['capacity_info_i18n', targetLang], translations.capacityInfo);
      }

      message.success({ content: '翻譯完成！', key: langKey });
    } catch (error: any) {
      message.error({ content: `翻譯失敗: ${error.message}`, key: langKey });
    } finally {
      setTranslating(prev => ({ ...prev, [langKey]: false }));
    }
  };

  // 計算翻譯完成度
  const getTranslationCompleteness = (pricing: VehiclePricing) => {
    const descCount = Object.keys(pricing.vehicle_description_i18n || {}).length;
    const capacityCount = Object.keys(pricing.capacity_info_i18n || {}).length;
    const total = SUPPORTED_LANGUAGES.length;
    const completed = Math.min(descCount, capacityCount);
    return { completed, total, percentage: Math.round((completed / total) * 100) };
  };

  // 獲取翻譯狀態
  const getTranslationStatus = (pricing: VehiclePricing, lang: string) => {
    const hasDesc = !!(pricing.vehicle_description_i18n && pricing.vehicle_description_i18n[lang]);
    const hasCapacity = !!(pricing.capacity_info_i18n && pricing.capacity_info_i18n[lang]);

    if (hasDesc && hasCapacity) return 'complete';
    if (hasDesc || hasCapacity) return 'partial';
    return 'empty';
  };

  // 載入價格配置
  const loadPricingList = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehicle_pricing')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      setPricingList(data || []);
    } catch (error: any) {
      message.error(`載入失敗: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 切換啟用狀態
  const toggleActive = async (record: VehiclePricing) => {
    try {
      const { error } = await supabase
        .from('vehicle_pricing')
        .update({ is_active: !record.is_active })
        .eq('id', record.id);

      if (error) throw error;

      message.success(`已${!record.is_active ? '啟用' : '停用'}該方案`);
      loadPricingList();
    } catch (error: any) {
      message.error(`操作失敗: ${error.message}`);
    }
  };

  // 刪除方案
  const deletePricing = async (id: string) => {
    try {
      const { error } = await supabase
        .from('vehicle_pricing')
        .delete()
        .eq('id', id);

      if (error) throw error;

      message.success('刪除成功');
      loadPricingList();
    } catch (error: any) {
      message.error(`刪除失敗: ${error.message}`);
    }
  };

  // 開啟新增/編輯 Modal
  const showModal = (record?: VehiclePricing) => {
    setActiveTab('zh-TW'); // 重置到繁體中文標籤

    if (record) {
      setEditingRecord(record);
      form.setFieldsValue({
        vehicle_type: record.vehicle_type,
        duration_hours: record.duration_hours,
        base_price: record.base_price,
        overtime_rate: record.overtime_rate,
        display_order: record.display_order,
        is_active: record.is_active,
        country: record.country || 'TW',
        region: record.region || 'default',
      });

      // 設置多語言欄位
      SUPPORTED_LANGUAGES.forEach(lang => {
        form.setFieldValue(['vehicle_description_i18n', lang.code], record.vehicle_description_i18n?.[lang.code] || '');
        form.setFieldValue(['capacity_info_i18n', lang.code], record.capacity_info_i18n?.[lang.code] || '');
      });
    } else {
      setEditingRecord(null);
      form.resetFields();
      form.setFieldsValue({
        is_active: true,
        display_order: pricingList.length + 1,
        country: 'TW',
        region: 'default',
      });
    }
    setIsModalVisible(true);
  };

  // 儲存方案
  const handleSave = async (values: any) => {
    try {
      // 以 DB 現有翻譯為底，再用表單非空值覆蓋
      // 避免未訪問的語言 Tab 未掛載回傳空值，把既有翻譯清空
      const vehicle_description_i18n: Record<string, string> = { ...(editingRecord?.vehicle_description_i18n || {}) };
      const capacity_info_i18n: Record<string, string> = { ...(editingRecord?.capacity_info_i18n || {}) };

      SUPPORTED_LANGUAGES.forEach(lang => {
        if (values.vehicle_description_i18n?.[lang.code]) vehicle_description_i18n[lang.code] = values.vehicle_description_i18n[lang.code];
        if (values.capacity_info_i18n?.[lang.code]) capacity_info_i18n[lang.code] = values.capacity_info_i18n[lang.code];
      });

      // 使用繁體中文作為預設 vehicle_description 和 capacity_info
      const defaultVehicleDescription = vehicle_description_i18n['zh-TW'] || '';
      const defaultCapacityInfo = capacity_info_i18n['zh-TW'] || '';

      const payload = {
        vehicle_type: values.vehicle_type,
        vehicle_description: defaultVehicleDescription,
        vehicle_description_i18n,
        capacity_info: defaultCapacityInfo,
        capacity_info_i18n,
        duration_hours: values.duration_hours,
        base_price: values.base_price,
        overtime_rate: values.overtime_rate,
        display_order: values.display_order,
        is_active: values.is_active,
        country: values.country || 'TW',
        region: values.region || 'default',
      };

      if (editingRecord) {
        // 更新
        const { error } = await supabase
          .from('vehicle_pricing')
          .update(payload)
          .eq('id', editingRecord.id);

        if (error) throw error;
        message.success('更新成功');
      } else {
        // 新增
        const { error } = await supabase
          .from('vehicle_pricing')
          .insert([payload]);

        if (error) throw error;
        message.success('新增成功');
      }

      setIsModalVisible(false);
      form.resetFields();
      loadPricingList();
    } catch (error: any) {
      message.error(`儲存失敗: ${error.message}`);
    }
  };

  useEffect(() => {
    loadPricingList();
  }, []);

  // Drag sensor
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Handle drag end — reorder and save to Supabase
  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    const oldIndex = pricingList.findIndex((p) => p.id === active.id);
    const newIndex = pricingList.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(pricingList, oldIndex, newIndex);
    const withOrder = reordered.map((item, i) => ({ ...item, display_order: i + 1 }));
    setPricingList(withOrder);

    // Batch update to Supabase
    try {
      const updates = withOrder.map((item) =>
        supabase
          .from('vehicle_pricing')
          .update({ display_order: item.display_order })
          .eq('id', item.id)
      );
      const results = await Promise.all(updates);
      const failed = results.filter((r) => r.error);

      if (failed.length > 0) {
        message.error('部分排序更新失敗');
        loadPricingList();
      } else {
        message.success('排序已更新');
      }
    } catch {
      message.error('排序更新失敗');
      loadPricingList();
    }
  };

  // 表格欄位定義
  const columns = [
    {
      title: '排序',
      dataIndex: 'display_order',
      key: 'display_order',
      width: 80,
      render: (order: number) => (
        <Space>
          <HolderOutlined style={{ cursor: 'grab', color: '#999' }} />
          <Tag color="blue">{order}</Tag>
        </Space>
      ),
    },
    {
      title: '狀態',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 120,
      render: (isActive: boolean, record: VehiclePricing) => (
        <Switch
          checked={isActive}
          checkedChildren="啟用"
          unCheckedChildren="停用"
          onChange={() => toggleActive(record)}
        />
      ),
    },
    {
      title: '車型等級',
      dataIndex: 'vehicle_type',
      key: 'vehicle_type',
      width: 120,
      render: (type: string) => {
        const option = VEHICLE_TYPE_OPTIONS.find(opt => opt.value === type);
        return <Tag color="purple">{option?.label || type}</Tag>;
      },
    },
    {
      title: '車型描述',
      dataIndex: 'vehicle_description',
      key: 'vehicle_description',
      width: 150,
      render: (description: string, record: VehiclePricing) => (
        <Space>
          <CarOutlined />
          <Text>{record.vehicle_description_i18n?.['zh-TW'] || description}</Text>
        </Space>
      ),
    },
    {
      title: '內容描述',
      dataIndex: 'capacity_info',
      key: 'capacity_info',
      width: 150,
      render: (capacity: string, record: VehiclePricing) => (
        <Space>
          <TeamOutlined />
          <Text>{record.capacity_info_i18n?.['zh-TW'] || capacity}</Text>
        </Space>
      ),
    },
    {
      title: '翻譯完成度',
      key: 'translation',
      width: 150,
      render: (_: any, record: VehiclePricing) => {
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
      title: '定價地區',
      dataIndex: 'region',
      key: 'region',
      width: 120,
      render: (region: string) => {
        const opt = REGION_OPTIONS.find(o => o.value === region);
        const short = opt?.label.split(' ')[0] || region;
        const color = region === 'default' ? 'default' : 'geekblue';
        return <Tag color={color}>{short}</Tag>;
      },
      filters: REGION_OPTIONS.map(o => ({ text: o.label.split(' ')[0], value: o.value })),
      onFilter: (value: any, record: VehiclePricing) => record.region === value,
    },
    {
      title: '時長',
      dataIndex: 'duration_hours',
      key: 'duration_hours',
      width: 100,
      render: (hours: number) => `${hours}小時`,
    },
    {
      title: '價格',
      dataIndex: 'base_price',
      key: 'base_price',
      width: 120,
      render: (price: number) => (
        <Text strong style={{ color: '#1890ff' }}>
          NT${price.toLocaleString()}
        </Text>
      ),
    },
    {
      title: '超時費/小時',
      dataIndex: 'overtime_rate',
      key: 'overtime_rate',
      width: 120,
      render: (rate: number) => (
        <Tag color="orange">NT${rate}/小時</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: VehiclePricing) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => showModal(record)}
          >
            編輯
          </Button>
          <Popconfirm
            title="確定要刪除此方案嗎？"
            onConfirm={() => deletePricing(record.id)}
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
          <DollarOutlined className="mr-2" />
          車型方案管理
        </Title>
        <Text type="secondary">
          管理包車服務的車型方案和價格設定
        </Text>
      </div>

      <Card
        title={`車型方案列表 (共 ${pricingList.length} 個)`}
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadPricingList}
              loading={loading}
            >
              重新載入
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => showModal()}
            >
              新增方案
            </Button>
          </Space>
        }
      >
        <DndContext sensors={sensors} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
          <SortableContext items={pricingList.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <Table
              dataSource={pricingList}
              columns={columns}
              rowKey="id"
              loading={loading}
              components={{ body: { row: SortableRow } }}
              pagination={false}
              scroll={{ x: 1200 }}
            />
          </SortableContext>
        </DndContext>
      </Card>

      {/* 新增/編輯 Modal */}
      <Modal
        title={editingRecord ? '編輯車型方案' : '新增車型方案'}
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
            display_order: pricingList.length + 1,
          }}
        >
          {/* 基本設定區塊 */}
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
              label="定價地區"
              name="region"
              rules={[{ required: true, message: '請選擇定價地區' }]}
              tooltip="選擇此方案適用的地區；若無特殊分區請選「全國預設」"
            >
              <Select>
                {REGION_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="時長設定"
              name="duration_hours"
              rules={[{ required: true, message: '請選擇時長' }]}
            >
              <Select placeholder="請選擇時長">
                {DURATION_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="價格設定 (新台幣)"
              name="base_price"
              rules={[{ required: true, message: '請輸入價格' }]}
            >
              <InputNumber
                min={0}
                precision={0}
                addonBefore="NT$"
                style={{ width: '100%' }}
                placeholder="例如：3800"
              />
            </Form.Item>

            <Form.Item
              label="超時費/小時 (新台幣)"
              name="overtime_rate"
              rules={[{ required: true, message: '請輸入超時費' }]}
            >
              <InputNumber
                min={0}
                precision={0}
                addonBefore="NT$"
                addonAfter="/小時"
                style={{ width: '100%' }}
                placeholder="例如：350"
              />
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

          {/* 多語言內容區塊 */}
          <Card size="small" title={<Space><GlobalOutlined />多語言內容</Space>} className="mb-4">
            <Alert
              message="提示"
              description="請至少填寫繁體中文的車型描述和內容描述。其他語言為選填，可稍後補充。"
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
                      {/* 翻譯按鈕 - 只在非繁體中文標籤頁顯示 */}
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
                              {translating[`translate_${lang.code}`] ? '翻譯中...' : `🌐 自動翻譯全部欄位`}
                            </Button>
                          </Tooltip>
                        </div>
                      )}

                      <Form.Item
                        label={`車型描述 (${lang.name})`}
                        name={['vehicle_description_i18n', lang.code]}
                        rules={lang.code === 'zh-TW' ? [{ required: true, message: '請輸入繁體中文車型描述' }] : []}
                      >
                        <Input
                          placeholder={`請輸入${lang.name}車型描述，例如：CAMRY 等車型`}
                          prefix={<CarOutlined />}
                        />
                      </Form.Item>

                      <Form.Item
                        label={`內容描述 (${lang.name})`}
                        name={['capacity_info_i18n', lang.code]}
                        rules={lang.code === 'zh-TW' ? [{ required: true, message: '請輸入繁體中文內容描述' }] : []}
                      >
                        <TextArea
                          rows={3}
                          placeholder={`請輸入${lang.name}內容描述，例如：最多3人，2個行李`}
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



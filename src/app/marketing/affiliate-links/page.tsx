'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  Tag,
  Space,
  Tooltip,
  Popconfirm,
  Tabs,
  message,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LinkOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { supabaseAdmin } from '@/lib/supabase';

const { TextArea } = Input;

// ============================================
// 常數定義
// ============================================

const CATEGORY_OPTIONS = [
  { value: 'flight', label: '✈️ 機票', color: 'blue' },
  { value: 'hotel', label: '🏨 飯店', color: 'green' },
  { value: 'ticket', label: '🎫 門票', color: 'orange' },
  { value: 'activity', label: '🎯 活動', color: 'purple' },
  { value: 'car_rental', label: '🚗 租車', color: 'cyan' },
  { value: 'train', label: '🚄 火車', color: 'geekblue' },
  { value: 'bus', label: '🚌 巴士', color: 'lime' },
  { value: 'insurance', label: '🛡️ 保險', color: 'gold' },
  { value: 'other', label: '📎 其他', color: 'default' },
];

const LANGUAGE_OPTIONS = [
  { value: 'zh-TW', label: '🇹🇼 繁體中文' },
  { value: 'en', label: '🇺🇸 English' },
  { value: 'ja', label: '🇯🇵 日本語' },
  { value: 'ko', label: '🇰🇷 한국어' },
  { value: 'zh-CN', label: '🇨🇳 简体中文' },
  { value: 'vi', label: '🇻🇳 Tiếng Việt' },
  { value: 'th', label: '🇹🇭 ไทย' },
];

const I18N_LANGUAGES = [
  { key: 'zh-TW', label: '繁中' },
  { key: 'en', label: 'EN' },
  { key: 'ja', label: '日文' },
  { key: 'ko', label: '韓文' },
];

const REGION_OPTIONS = [
  'ALL', 'TW', 'JP', 'KR', 'TH', 'VN', 'MY', 'SG', 'ID', 'PH', 'US', 'EU',
];

// ============================================
// 型別定義
// ============================================

interface AffiliateLink {
  id: string;
  provider: string;
  provider_name: string;
  category: string;
  name: string;
  name_i18n: Record<string, string>;
  url_template: string;
  site_language: string;
  description: string | null;
  regions: string[];
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// 主頁面元件
// ============================================

export default function AffiliateLinkPage() {
  const [data, setData] = useState<AffiliateLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AffiliateLink | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // 篩選狀態
  const [filterProvider, setFilterProvider] = useState<string | undefined>();
  const [filterCategory, setFilterCategory] = useState<string | undefined>();
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [searchText, setSearchText] = useState('');

  // ============================================
  // 資料載入
  // ============================================

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: records, error } = await supabaseAdmin
        .from('affiliate_links')
        .select('*')
        .order('category')
        .order('priority', { ascending: false });

      if (error) throw error;
      setData(records || []);
    } catch (err: any) {
      message.error('載入失敗：' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ============================================
  // 篩選邏輯
  // ============================================

  const providerOptions = useMemo(() => {
    const providers = [...new Set(data.map(d => d.provider_name))];
    return providers.map(p => ({ value: p, label: p }));
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (filterProvider && item.provider_name !== filterProvider) return false;
      if (filterCategory && item.category !== filterCategory) return false;
      if (filterStatus === 'active' && !item.is_active) return false;
      if (filterStatus === 'inactive' && item.is_active) return false;
      if (searchText) {
        const s = searchText.toLowerCase();
        return (
          item.name.toLowerCase().includes(s) ||
          item.url_template.toLowerCase().includes(s) ||
          (item.description || '').toLowerCase().includes(s) ||
          item.provider_name.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [data, filterProvider, filterCategory, filterStatus, searchText]);

  // ============================================
  // CRUD 操作
  // ============================================

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      site_language: 'zh-TW',
      regions: ['ALL'],
      priority: 0,
      is_active: true,
      name_i18n: {},
    });
    setModalOpen(true);
  };

  const handleEdit = (record: AffiliateLink) => {
    setEditingRecord(record);
    const i18nValues: Record<string, string> = {};
    if (record.name_i18n) {
      for (const lang of I18N_LANGUAGES) {
        if (record.name_i18n[lang.key]) {
          i18nValues[`name_i18n_${lang.key}`] = record.name_i18n[lang.key];
        }
      }
    }
    form.setFieldsValue({
      ...record,
      ...i18nValues,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      // 組裝 name_i18n
      const name_i18n: Record<string, string> = {};
      for (const lang of I18N_LANGUAGES) {
        const val = values[`name_i18n_${lang.key}`];
        if (val && val.trim()) {
          name_i18n[lang.key] = val.trim();
        }
      }

      const payload = {
        provider: values.provider,
        provider_name: values.provider_name,
        category: values.category,
        name: values.name,
        name_i18n,
        url_template: values.url_template,
        site_language: values.site_language,
        description: values.description || null,
        regions: values.regions || ['ALL'],
        priority: values.priority || 0,
        is_active: values.is_active !== false,
      };

      if (editingRecord) {
        const { error } = await supabaseAdmin
          .from('affiliate_links')
          .update(payload)
          .eq('id', editingRecord.id);
        if (error) throw error;
        message.success('更新成功');
      } else {
        const { error } = await supabaseAdmin
          .from('affiliate_links')
          .insert([payload]);
        if (error) throw error;
        message.success('新增成功');
      }

      setModalOpen(false);
      loadData();
    } catch (err: any) {
      if (err.errorFields) return; // form validation error
      message.error('儲存失敗：' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabaseAdmin
        .from('affiliate_links')
        .delete()
        .eq('id', id);
      if (error) throw error;
      message.success('已刪除');
      loadData();
    } catch (err: any) {
      message.error('刪除失敗：' + err.message);
    }
  };

  const handleToggleActive = async (record: AffiliateLink) => {
    try {
      const { error } = await supabaseAdmin
        .from('affiliate_links')
        .update({ is_active: !record.is_active })
        .eq('id', record.id);
      if (error) throw error;
      message.success(record.is_active ? '已停用' : '已啟用');
      loadData();
    } catch (err: any) {
      message.error('操作失敗：' + err.message);
    }
  };

  // ============================================
  // 表格欄位定義
  // ============================================

  const columns = [
    {
      title: '供應商',
      dataIndex: 'provider_name',
      key: 'provider_name',
      width: 120,
    },
    {
      title: '類別',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (val: string) => {
        const opt = CATEGORY_OPTIONS.find(o => o.value === val);
        return opt ? <Tag color={opt.color}>{opt.label}</Tag> : val;
      },
    },
    {
      title: '名稱',
      dataIndex: 'name',
      key: 'name',
      width: 160,
    },
    {
      title: '網站語言',
      dataIndex: 'site_language',
      key: 'site_language',
      width: 90,
      render: (val: string) => {
        const opt = LANGUAGE_OPTIONS.find(o => o.value === val);
        return <Tag>{opt ? opt.label : val}</Tag>;
      },
    },
    {
      title: 'URL',
      dataIndex: 'url_template',
      key: 'url_template',
      width: 220,
      ellipsis: true,
      render: (val: string) => (
        <Tooltip title={val}>
          <a href={val} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>
            {val.length > 40 ? val.substring(0, 40) + '...' : val}
          </a>
        </Tooltip>
      ),
    },
    {
      title: '地區',
      dataIndex: 'regions',
      key: 'regions',
      width: 120,
      render: (val: string[]) =>
        (val || []).map(r => (
          <Tag key={r} style={{ marginBottom: 2 }}>
            {r}
          </Tag>
        )),
    },
    {
      title: '優先級',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      sorter: (a: AffiliateLink, b: AffiliateLink) => a.priority - b.priority,
    },
    {
      title: '啟用',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (_: boolean, record: AffiliateLink) => (
        <Switch
          checked={record.is_active}
          onChange={() => handleToggleActive(record)}
          size="small"
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_: any, record: AffiliateLink) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="確定要刪除此連結？"
            onConfirm={() => handleDelete(record.id)}
            okText="刪除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ============================================
  // 渲染
  // ============================================

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <LinkOutlined />
            <span>聯盟推廣連結管理</span>
          </Space>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增連結
          </Button>
        }
      >
        {/* 篩選列 */}
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="篩選供應商"
              allowClear
              style={{ width: '100%' }}
              value={filterProvider}
              onChange={setFilterProvider}
              options={providerOptions}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="篩選類別"
              allowClear
              style={{ width: '100%' }}
              value={filterCategory}
              onChange={setFilterCategory}
              options={CATEGORY_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="狀態"
              allowClear
              style={{ width: '100%' }}
              value={filterStatus}
              onChange={setFilterStatus}
              options={[
                { value: 'active', label: '啟用' },
                { value: 'inactive', label: '停用' },
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="搜尋名稱、URL、描述..."
              prefix={<SearchOutlined />}
              allowClear
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
          </Col>
        </Row>

        {/* 資料表格 */}
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1100 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 筆`,
          }}
        />
      </Card>

      {/* 新增/編輯 Modal */}
      <Modal
        title={editingRecord ? '編輯聯盟連結' : '新增聯盟連結'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        width={720}
        okText="儲存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="provider"
                label="供應商代碼"
                rules={[{ required: true, message: '請輸入供應商代碼' }]}
                tooltip="例如：trip_com、klook、kkday"
              >
                <Input placeholder="trip_com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="provider_name"
                label="供應商名稱"
                rules={[{ required: true, message: '請輸入供應商名稱' }]}
              >
                <Input placeholder="Trip.com" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category"
                label="類別"
                rules={[{ required: true, message: '請選擇類別' }]}
              >
                <Select
                  placeholder="選擇類別"
                  options={CATEGORY_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="site_language"
                label="網站語言"
                rules={[{ required: true, message: '請選擇語言' }]}
                tooltip="該連結網頁的語言版本"
              >
                <Select
                  placeholder="選擇語言"
                  options={LANGUAGE_OPTIONS}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="name"
            label="連結名稱（預設）"
            rules={[{ required: true, message: '請輸入名稱' }]}
          >
            <Input placeholder="機票搜尋" />
          </Form.Item>

          {/* 多語名稱 */}
          <Form.Item label="多語名稱（選填）">
            <Tabs
              size="small"
              items={I18N_LANGUAGES.map(lang => ({
                key: lang.key,
                label: lang.label,
                children: (
                  <Form.Item name={`name_i18n_${lang.key}`} noStyle>
                    <Input placeholder={`${lang.label} 名稱`} />
                  </Form.Item>
                ),
              }))}
            />
          </Form.Item>

          <Form.Item
            name="url_template"
            label="連結 URL"
            rules={[{ required: true, message: '請輸入 URL' }]}
            tooltip="可含變數 {city}, {checkin}, {checkout}, {lang}, {from}, {to}, {date}"
          >
            <TextArea
              rows={2}
              placeholder="https://www.trip.com/flights/?locale=zh-TW&curr=TWD"
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="AI 用描述"
            tooltip="告訴 AI 何時該推薦此連結"
          >
            <TextArea
              rows={2}
              placeholder="當用戶詢問機票或需要訂機票時推薦"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="regions"
                label="適用地區"
                tooltip="ALL 表示全球適用"
              >
                <Select
                  mode="tags"
                  placeholder="輸入或選擇地區代碼"
                  options={REGION_OPTIONS.map(r => ({ value: r, label: r }))}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="priority" label="優先級">
                <InputNumber style={{ width: '100%' }} min={0} max={999} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="is_active" label="啟用" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}

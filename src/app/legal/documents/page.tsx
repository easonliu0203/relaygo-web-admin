'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
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
  Row,
  Col,
  Statistic,
  Tabs,
  Badge,
  Alert,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SaveOutlined,
  StopOutlined,
  CheckCircleOutlined,
  GlobalOutlined,
  TranslationOutlined,
  LoadingOutlined,
  FileProtectOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { createClient } from '@supabase/supabase-js';
import { FirebaseService } from '@/lib/firebase';

// React Quill 需要動態載入（SSR 不支援）
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });
import 'react-quill-new/dist/quill.snow.css';

const { Title, Text } = Typography;
const { Option } = Select;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// 翻譯 API 端點
const TRANSLATE_API_URL = 'https://asia-east1-ride-platform-f1676.cloudfunctions.net/translate';

// 支援的語言列表
const SUPPORTED_LANGUAGES = [
  { code: 'zh-TW', name: '繁體中文', flag: '🇹🇼' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
];

const ROLE_OPTIONS = [
  { value: 'customer', label: '客戶', color: 'blue' },
  { value: 'driver', label: '司機', color: 'green' },
  { value: 'all', label: '全部', color: 'purple' },
];

// Quill 工具列設定
const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, 4, false] }],
    [{ size: ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ align: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    ['link', 'image'],
    ['blockquote', 'code-block'],
    ['clean'],
  ],
};

const QUILL_FORMATS = [
  'header', 'size',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'align',
  'list', 'indent',
  'link', 'image',
  'blockquote', 'code-block',
];

interface LegalDocument {
  id: string;
  role: string;
  doc_key: string;
  title: string;
  title_i18n: Record<string, string>;
  content: string;
  content_i18n: Record<string, string>;
  is_active: boolean;
  version: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export default function LegalDocumentsPage() {
  const [loading, setLoading] = useState(false);
  const [dataList, setDataList] = useState<LegalDocument[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<LegalDocument | null>(null);
  const [filterRole, setFilterRole] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('zh-TW');
  const [translating, setTranslating] = useState<Record<string, boolean>>({});
  const [form] = Form.useForm();

  // 富文本內容狀態（因為 React Quill 不適合用 Form 直接控制）
  const [contentByLang, setContentByLang] = useState<Record<string, string>>({});

  // ── 翻譯 ────────────────────────────────────────────────────

  const translateField = async (text: string, targetLang: string): Promise<string> => {
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
  };

  const translateToLanguage = async (targetLang: string) => {
    const langKey = `translate_${targetLang}`;
    try {
      const zhTWTitle = form.getFieldValue(['title_i18n', 'zh-TW']);
      const zhTWContent = contentByLang['zh-TW'];

      if (!zhTWTitle && !zhTWContent) {
        message.warning('請先填寫繁體中文的標題或內容');
        return;
      }

      setTranslating(prev => ({ ...prev, [langKey]: true }));
      message.loading({ content: `正在翻譯為 ${targetLang}...`, key: langKey, duration: 0 });

      if (zhTWTitle) {
        try {
          const translated = await translateField(zhTWTitle, targetLang);
          form.setFieldValue(['title_i18n', targetLang], translated);
        } catch (e) {
          console.error(`翻譯標題 ${targetLang} 失敗:`, e);
        }
      }

      if (zhTWContent) {
        try {
          // 移除 HTML 標籤翻譯純文字，再包回去（避免翻譯破壞 HTML 結構）
          const plainText = zhTWContent.replace(/<[^>]+>/g, '');
          if (plainText.trim()) {
            const translated = await translateField(plainText, targetLang);
            // 用簡單的 HTML 包裝翻譯結果
            setContentByLang(prev => ({ ...prev, [targetLang]: `<p>${translated}</p>` }));
          }
        } catch (e) {
          console.error(`翻譯內容 ${targetLang} 失敗:`, e);
        }
      }

      message.success({ content: '翻譯完成！', key: langKey });
    } catch (error: any) {
      message.error({ content: `翻譯失敗: ${error.message}`, key: langKey });
    } finally {
      setTranslating(prev => ({ ...prev, [langKey]: false }));
    }
  };

  const translateAll = async () => {
    const zhTWTitle = form.getFieldValue(['title_i18n', 'zh-TW']);
    const zhTWContent = contentByLang['zh-TW'];

    if (!zhTWTitle && !zhTWContent) {
      message.warning('請先填寫繁體中文的標題或內容');
      return;
    }

    const targets = SUPPORTED_LANGUAGES.filter(l => l.code !== 'zh-TW');
    setTranslating(prev => {
      const next = { ...prev };
      targets.forEach(l => { next[`translate_${l.code}`] = true; });
      return next;
    });
    message.loading({ content: '正在翻譯全部語言...', key: 'translate_all', duration: 0 });

    let successCount = 0;
    for (const lang of targets) {
      try {
        if (zhTWTitle) {
          const translatedTitle = await translateField(zhTWTitle, lang.code);
          form.setFieldValue(['title_i18n', lang.code], translatedTitle);
        }

        if (zhTWContent) {
          const plainText = zhTWContent.replace(/<[^>]+>/g, '');
          if (plainText.trim()) {
            const translatedContent = await translateField(plainText, lang.code);
            setContentByLang(prev => ({ ...prev, [lang.code]: `<p>${translatedContent}</p>` }));
          }
        }

        successCount++;
      } catch (error) {
        console.error(`翻譯 ${lang.code} 失敗:`, error);
      } finally {
        setTranslating(prev => ({ ...prev, [`translate_${lang.code}`]: false }));
      }
    }

    message.success({ content: `翻譯完成！成功 ${successCount}/${targets.length} 種語言`, key: 'translate_all' });
  };

  // ── 翻譯完成度 ──────────────────────────────────────────────

  const getTranslationCompleteness = (record: LegalDocument) => {
    const titleI18n = record.title_i18n || {};
    const contentI18n = record.content_i18n || {};
    const completed = SUPPORTED_LANGUAGES.filter(
      l => !!(titleI18n[l.code] && contentI18n[l.code])
    ).length;
    const total = SUPPORTED_LANGUAGES.length;
    return { completed, total, percentage: Math.round((completed / total) * 100) };
  };

  // ── 載入資料 ────────────────────────────────────────────────

  const loadData = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('legal_documents')
        .select('*')
        .order('sort_order')
        .order('created_at');

      if (filterRole) q = q.eq('role', filterRole);
      if (filterStatus === 'active') q = q.eq('is_active', true);
      if (filterStatus === 'inactive') q = q.eq('is_active', false);

      const { data, error } = await q;
      if (error) throw error;
      setDataList(data || []);
    } catch (e: any) {
      message.error(`載入失敗: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [filterRole, filterStatus]);

  // ── 統計 ────────────────────────────────────────────────────

  const totalCount = dataList.length;
  const activeCount = dataList.filter(r => r.is_active).length;
  const customerCount = dataList.filter(r => r.role === 'customer' || r.role === 'all').length;
  const driverCount = dataList.filter(r => r.role === 'driver' || r.role === 'all').length;

  // ── 切換啟用 ────────────────────────────────────────────────

  const toggleActive = async (record: LegalDocument) => {
    try {
      const { error } = await supabase
        .from('legal_documents')
        .update({ is_active: !record.is_active })
        .eq('id', record.id);
      if (error) throw error;
      message.success(record.is_active ? '已停用' : '已啟用');
      loadData();
    } catch (e: any) {
      message.error(`操作失敗: ${e.message}`);
    }
  };

  // ── 刪除 ────────────────────────────────────────────────────

  const deleteRecord = async (id: string) => {
    try {
      const { error } = await supabase
        .from('legal_documents')
        .delete()
        .eq('id', id);
      if (error) throw error;
      message.success('已刪除');
      loadData();
    } catch (e: any) {
      message.error(`刪除失敗: ${e.message}`);
    }
  };

  // ── 批次操作 ────────────────────────────────────────────────

  const batchSetActive = async (active: boolean) => {
    if (!selectedRowKeys.length) return;
    setBatchLoading(true);
    try {
      const { error } = await supabase
        .from('legal_documents')
        .update({ is_active: active })
        .in('id', selectedRowKeys as string[]);
      if (error) throw error;
      message.success(`已批次${active ? '啟用' : '停用'} ${selectedRowKeys.length} 筆`);
      setSelectedRowKeys([]);
      loadData();
    } catch (e: any) {
      message.error(`批次操作失敗: ${e.message}`);
    } finally {
      setBatchLoading(false);
    }
  };

  const batchDelete = async () => {
    if (!selectedRowKeys.length) return;
    setBatchLoading(true);
    try {
      const { error } = await supabase
        .from('legal_documents')
        .delete()
        .in('id', selectedRowKeys as string[]);
      if (error) throw error;
      message.success(`已刪除 ${selectedRowKeys.length} 筆`);
      setSelectedRowKeys([]);
      loadData();
    } catch (e: any) {
      message.error(`批次刪除失敗: ${e.message}`);
    } finally {
      setBatchLoading(false);
    }
  };

  // ── 開啟 Modal ──────────────────────────────────────────────

  const showModal = (record?: LegalDocument) => {
    setActiveTab('zh-TW');

    if (record) {
      setEditingRecord(record);
      form.setFieldsValue({
        role: record.role,
        doc_key: record.doc_key,
        sort_order: record.sort_order,
        is_active: record.is_active,
      });

      // 設定標題 i18n
      SUPPORTED_LANGUAGES.forEach(lang => {
        form.setFieldValue(['title_i18n', lang.code], record.title_i18n?.[lang.code] || '');
      });

      // 設定內容 i18n
      const newContentByLang: Record<string, string> = {};
      SUPPORTED_LANGUAGES.forEach(lang => {
        newContentByLang[lang.code] = record.content_i18n?.[lang.code] || '';
      });
      // 若 zh-TW 沒有 i18n 內容，fallback 到 content 欄位
      if (!newContentByLang['zh-TW'] && record.content) {
        newContentByLang['zh-TW'] = record.content;
      }
      setContentByLang(newContentByLang);
    } else {
      setEditingRecord(null);
      form.resetFields();
      form.setFieldsValue({ role: 'customer', sort_order: 0, is_active: true });
      setContentByLang({});
    }
    setIsModalVisible(true);
  };

  // ── 儲存 ────────────────────────────────────────────────────

  const handleSave = async (values: any) => {
    try {
      const title_i18n: Record<string, string> = {};
      const content_i18n: Record<string, string> = {};

      SUPPORTED_LANGUAGES.forEach(lang => {
        const titleVal = values.title_i18n?.[lang.code];
        if (titleVal) title_i18n[lang.code] = titleVal;

        const contentVal = contentByLang[lang.code];
        if (contentVal) content_i18n[lang.code] = contentVal;
      });

      const defaultTitle = title_i18n['zh-TW'] || '';
      const defaultContent = content_i18n['zh-TW'] || '';

      const payload = {
        role: values.role,
        doc_key: values.doc_key,
        title: defaultTitle,
        title_i18n,
        content: defaultContent,
        content_i18n,
        sort_order: values.sort_order ?? 0,
        is_active: values.is_active ?? true,
      };

      if (editingRecord) {
        const { error } = await supabase
          .from('legal_documents')
          .update(payload)
          .eq('id', editingRecord.id);
        if (error) throw error;
        message.success('更新成功');
      } else {
        const { error } = await supabase
          .from('legal_documents')
          .insert([payload]);
        if (error) throw error;
        message.success('新增成功');
      }

      setIsModalVisible(false);
      form.resetFields();
      setContentByLang({});
      loadData();
    } catch (e: any) {
      message.error(`儲存失敗: ${e.message}`);
    }
  };

  // ── 預覽 ────────────────────────────────────────────────────

  const previewDocument = (record: LegalDocument) => {
    const lang = 'zh-TW';
    const title = record.title_i18n?.[lang] || record.title;
    const content = record.content_i18n?.[lang] || record.content;

    const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; color: #333; line-height: 1.8; }
    h1 { color: #1a1a1a; border-bottom: 2px solid #1890ff; padding-bottom: 12px; }
    h2, h3, h4 { color: #333; }
    p { margin: 8px 0; }
    a { color: #1890ff; }
    ul, ol { padding-left: 24px; }
    blockquote { border-left: 4px solid #1890ff; margin: 16px 0; padding: 8px 16px; background: #f5f5f5; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${content}
  <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;">
  <p style="color: #999; font-size: 12px;">版本 v${record.version} · 最後更新 ${new Date(record.updated_at).toLocaleString('zh-TW')}</p>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  // ── 富文本內容變更 ──────────────────────────────────────────

  const handleContentChange = useCallback((lang: string, value: string) => {
    setContentByLang(prev => ({ ...prev, [lang]: value }));
  }, []);

  // ── 表格欄位 ────────────────────────────────────────────────

  const columns = [
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 80,
      render: (v: string) => {
        const opt = ROLE_OPTIONS.find(o => o.value === v);
        return <Tag color={opt?.color || 'default'}>{opt?.label || v}</Tag>;
      },
    },
    {
      title: '文件 Key',
      dataIndex: 'doc_key',
      key: 'doc_key',
      width: 220,
      render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: '標題',
      key: 'title',
      width: 200,
      render: (_: any, record: LegalDocument) => (
        <Text strong>{record.title_i18n?.['zh-TW'] || record.title}</Text>
      ),
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 70,
      render: (v: number) => <Tag>v{v}</Tag>,
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 70,
      sorter: (a: LegalDocument, b: LegalDocument) => a.sort_order - b.sort_order,
      render: (v: number) => <Text type="secondary">{v}</Text>,
    },
    {
      title: '翻譯',
      key: 'translation',
      width: 100,
      render: (_: any, record: LegalDocument) => {
        const { completed, total, percentage } = getTranslationCompleteness(record);
        let bgColor = '#d9d9d9';
        if (percentage === 100) bgColor = '#52c41a';
        else if (percentage >= 50) bgColor = '#1890ff';
        else if (percentage > 0) bgColor = '#faad14';

        return <Badge count={`${completed}/${total}`} style={{ backgroundColor: bgColor }} />;
      },
    },
    {
      title: '狀態',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (v: boolean, record: LegalDocument) => (
        <Switch
          checked={v}
          checkedChildren="啟用"
          unCheckedChildren="停用"
          onChange={() => toggleActive(record)}
          size="small"
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: LegalDocument) => (
        <Space size="small">
          <Tooltip title="預覽">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => previewDocument(record)}
            />
          </Tooltip>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => showModal(record)}
          >
            編輯
          </Button>
          <Popconfirm
            title="確定刪除這筆資料？"
            description="此操作無法復原。"
            onConfirm={() => deleteRecord(record.id)}
            okText="刪除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              刪除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      {/* 頁首 */}
      <div className="mb-6">
        <Title level={2}>
          <FileProtectOutlined className="mr-2" />
          條約文件管理
        </Title>
        <Text type="secondary">
          管理隱私權政策、合作條約、推廣夥伴協議等法律文件，支援富文本編輯與多語言翻譯
        </Text>
      </div>

      {/* 統計卡片 */}
      <Row gutter={16} className="mb-6">
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="總文件數" value={totalCount} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="啟用中" value={activeCount} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="客戶端文件" value={customerCount} valueStyle={{ color: '#1890ff' }} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="司機端文件" value={driverCount} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
      </Row>

      {/* 主要列表 */}
      <Card
        title="文件列表"
        extra={
          <Space wrap>
            <Select
              allowClear
              placeholder="篩選角色"
              style={{ width: 130 }}
              onChange={(v: string) => setFilterRole(v || null)}
            >
              {ROLE_OPTIONS.map(o => (
                <Option key={o.value} value={o.value}>{o.label}</Option>
              ))}
            </Select>
            <Select
              allowClear
              placeholder="篩選狀態"
              style={{ width: 130 }}
              onChange={(v: string) => setFilterStatus(v || null)}
            >
              <Option value="active">啟用中</Option>
              <Option value="inactive">已停用</Option>
            </Select>
            <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
              重新載入
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
              新增文件
            </Button>
          </Space>
        }
      >
        {/* 批次操作列 */}
        {selectedRowKeys.length > 0 && (
          <div
            className="mb-4 p-3 rounded"
            style={{ background: '#e6f4ff', border: '1px solid #91caff' }}
          >
            <Space>
              <Text strong>已選取 {selectedRowKeys.length} 筆</Text>
              <Button size="small" icon={<CheckCircleOutlined />} onClick={() => batchSetActive(true)} loading={batchLoading}>
                批次啟用
              </Button>
              <Button size="small" icon={<StopOutlined />} onClick={() => batchSetActive(false)} loading={batchLoading}>
                批次停用
              </Button>
              <Popconfirm
                title={`確定刪除這 ${selectedRowKeys.length} 筆資料？`}
                description="此操作無法復原。"
                onConfirm={batchDelete}
                okText="刪除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
              >
                <Button size="small" danger icon={<DeleteOutlined />} loading={batchLoading}>
                  批次刪除
                </Button>
              </Popconfirm>
              <Button size="small" onClick={() => setSelectedRowKeys([])}>取消選取</Button>
            </Space>
          </div>
        )}

        <Table
          dataSource={dataList}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: t => `共 ${t} 筆` }}
          scroll={{ x: 1100 }}
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          size="small"
        />
      </Card>

      {/* 新增/編輯 Modal */}
      <Modal
        title={editingRecord ? '編輯條約文件' : '新增條約文件'}
        open={isModalVisible}
        onCancel={() => { setIsModalVisible(false); form.resetFields(); setContentByLang({}); }}
        footer={null}
        width={960}
        destroyOnClose
        styles={{ body: { maxHeight: '75vh', overflowY: 'auto' } }}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          {/* 基本設定 */}
          <Card size="small" title="基本設定" className="mb-4">
            <Row gutter={12}>
              <Col span={8}>
                <Form.Item label="適用角色" name="role" rules={[{ required: true, message: '請選擇角色' }]}>
                  <Select placeholder="請選擇">
                    {ROLE_OPTIONS.map(o => (
                      <Option key={o.value} value={o.value}>{o.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  label="文件 Key"
                  name="doc_key"
                  rules={[{ required: true, message: '請輸入文件 Key' }]}
                  tooltip="唯一識別碼，例如 privacy_policy_customer"
                >
                  <Input placeholder="例：privacy_policy_customer" />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item label="排序" name="sort_order">
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item label="狀態" name="is_active" valuePropName="checked">
                  <Switch checkedChildren="啟用" unCheckedChildren="停用" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* 多語言內容 */}
          <Card
            size="small"
            title={<Space><GlobalOutlined />標題與內容 — 多語言</Space>}
            className="mb-4"
            extra={
              <Button
                type="dashed"
                icon={<TranslationOutlined />}
                onClick={translateAll}
                loading={Object.values(translating).some(v => v)}
                size="small"
              >
                一鍵翻譯全部語言
              </Button>
            }
          >
            <Alert
              message="提示"
              description="請至少填寫繁體中文的標題和內容。使用下方的富文本編輯器可調整字體大小、顏色、粗體等格式。"
              type="info"
              showIcon
              className="mb-4"
            />

            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={SUPPORTED_LANGUAGES.map(lang => {
                const hasTitle = editingRecord
                  ? !!(editingRecord.title_i18n?.[lang.code])
                  : false;
                const hasContent = editingRecord
                  ? !!(editingRecord.content_i18n?.[lang.code])
                  : false;
                const status = hasTitle && hasContent ? 'success' : (hasTitle || hasContent) ? 'warning' : undefined;

                return {
                  key: lang.code,
                  label: (
                    <Space>
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                      {status && <Badge status={status} />}
                    </Space>
                  ),
                  children: (
                    <div className="py-2">
                      {lang.code !== 'zh-TW' && (
                        <div className="mb-3">
                          <Tooltip title="自動將繁體中文標題與內容翻譯成此語言">
                            <Button
                              type="dashed"
                              size="small"
                              icon={translating[`translate_${lang.code}`] ? <LoadingOutlined /> : <TranslationOutlined />}
                              onClick={() => translateToLanguage(lang.code)}
                              loading={translating[`translate_${lang.code}`]}
                            >
                              {translating[`translate_${lang.code}`] ? '翻譯中...' : `自動翻譯為${lang.name}`}
                            </Button>
                          </Tooltip>
                        </div>
                      )}

                      <Form.Item
                        label={`標題 (${lang.name})`}
                        name={['title_i18n', lang.code]}
                        rules={lang.code === 'zh-TW' ? [{ required: true, message: '請輸入繁體中文標題' }] : []}
                      >
                        <Input placeholder={`請輸入${lang.name}標題`} />
                      </Form.Item>

                      <div className="mb-2">
                        <Text strong>內容 ({lang.name})</Text>
                        {lang.code === 'zh-TW' && <Text type="danger"> *</Text>}
                      </div>
                      <div style={{ minHeight: 300 }}>
                        <ReactQuill
                          theme="snow"
                          value={contentByLang[lang.code] || ''}
                          onChange={(value: string) => handleContentChange(lang.code, value)}
                          modules={QUILL_MODULES}
                          formats={QUILL_FORMATS}
                          style={{ height: 250 }}
                          placeholder={`請輸入${lang.name}內容...`}
                        />
                      </div>
                    </div>
                  ),
                };
              })}
            />
          </Card>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={() => { setIsModalVisible(false); form.resetFields(); setContentByLang({}); }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                儲存
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

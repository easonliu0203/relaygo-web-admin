'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Upload,
  Image,
  Alert,
  Tooltip,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  UploadOutlined,
  PictureOutlined,
  EyeOutlined,
  TranslationOutlined,
  LoadingOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import { supabaseAdmin } from '@/lib/supabase';
import { watermarkAndResize } from '@/lib/watermarkImage';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const BUCKET = 'service-cases';
const TABLE = 'service_cases';
const TRANSLATE_API_URL = 'https://asia-east1-ride-platform-f1676.cloudfunctions.net/translate';
const REVALIDATE_URL = 'https://relaygo.pro/api/revalidate-cases';

// Fire-and-forget: tells the public site to drop its cache so changes
// show up within seconds instead of waiting for the 60s ISR window.
async function triggerSiteRevalidate() {
  try {
    await fetch(REVALIDATE_URL, { method: 'POST', cache: 'no-store', keepalive: true });
  } catch (e) {
    // Cache will still expire within 60s anyway; don't block the user.
    console.warn('revalidate ping failed (will still refresh within 60s):', e);
  }
}

const SUPPORTED_LANGUAGES = [
  { code: 'zh-TW', name: '繁體中文', flag: '🇹🇼' },
  { code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'fil', name: 'Filipino', flag: '🇵🇭' },
];

const TOTAL_LOCALES = SUPPORTED_LANGUAGES.length;

interface ServiceCase {
  id: string;
  photo_url: string;
  captions: Record<string, string>;
  alt_text: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export default function ServiceCasesPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cases, setCases] = useState<ServiceCase[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCase, setEditingCase] = useState<ServiceCase | null>(null);
  const [activeTab, setActiveTab] = useState('zh-TW');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewSrc, setPreviewSrc] = useState('');

  const loadCases = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseAdmin
        .from(TABLE)
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCases(data || []);
    } catch (err: any) {
      console.error('載入案例失敗:', err);
      message.error(`載入失敗：${err.message || err}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  const openModal = (item?: ServiceCase) => {
    setActiveTab('zh-TW');
    if (item) {
      setEditingCase(item);
      setPhotoUrl(item.photo_url);
      const captionFields: Record<string, string> = {};
      SUPPORTED_LANGUAGES.forEach((l) => {
        captionFields[l.code] = item.captions?.[l.code] || '';
      });
      form.setFieldsValue({
        captions: captionFields,
        alt_text: item.alt_text || '',
        sort_order: item.sort_order,
        is_published: item.is_published,
      });
    } else {
      setEditingCase(null);
      setPhotoUrl('');
      form.resetFields();
      form.setFieldsValue({
        is_published: true,
        sort_order: (cases[cases.length - 1]?.sort_order || 0) + 10,
        captions: {},
      });
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingCase(null);
    setPhotoUrl('');
    form.resetFields();
  };

  const handleUpload = async (file: File): Promise<boolean> => {
    if (!file.type.startsWith('image/')) {
      message.error('只能上傳圖片檔案');
      return false;
    }
    if (file.size > 20 * 1024 * 1024) {
      message.error('原始檔案不可超過 20MB');
      return false;
    }

    setUploading(true);
    try {
      // 1. Resize to max 1600px wide + burn in RelayGo watermark (client-side Canvas)
      const processed = await watermarkAndResize(file);

      // 2. Upload the processed (watermarked + resized) JPEG to Storage
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(filename, processed.blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(filename);
      const url = publicData.publicUrl;

      setPhotoUrl(url);
      const sizeKB = Math.round(processed.outputSize / 1024);
      message.success(
        `照片已加浮水印並上傳成功（${processed.width}×${processed.height}px, ${sizeKB} KB）`
      );
      return true;
    } catch (err: any) {
      console.error('上傳失敗:', err);
      message.error(`上傳失敗：${err.message || err}`);
      return false;
    } finally {
      setUploading(false);
    }
  };

  const handleAutoTranslate = async () => {
    const zhTW = form.getFieldValue(['captions', 'zh-TW']);
    if (!zhTW || !zhTW.trim()) {
      message.warning('請先填寫繁體中文文案');
      return;
    }

    setTranslating(true);
    try {
      const targets = SUPPORTED_LANGUAGES.filter((l) => l.code !== 'zh-TW');
      await Promise.all(
        targets.map(async (lang) => {
          try {
            const res = await fetch(TRANSLATE_API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: zhTW, target: lang.code, source: 'zh-TW' }),
            });
            const data = await res.json();
            const translated = data.translatedText || data.translation || data.text;
            if (translated) {
              form.setFieldValue(['captions', lang.code], translated);
            }
          } catch (e) {
            console.warn(`翻譯 ${lang.code} 失敗:`, e);
          }
        })
      );
      message.success('翻譯完成（請檢查並調整）');
    } catch (err: any) {
      message.error(`翻譯失敗：${err.message || err}`);
    } finally {
      setTranslating(false);
    }
  };

  const saveCase = async (values: any) => {
    if (!photoUrl) {
      message.error('請先上傳照片');
      return;
    }
    if (!values.captions?.['zh-TW']?.trim()) {
      message.error('繁體中文文案為必填');
      setActiveTab('zh-TW');
      return;
    }

    setSaving(true);
    try {
      const captions: Record<string, string> = {};
      SUPPORTED_LANGUAGES.forEach((l) => {
        const val = values.captions?.[l.code]?.trim();
        if (val) captions[l.code] = val;
      });

      const payload = {
        photo_url: photoUrl,
        captions,
        alt_text: values.alt_text?.trim() || null,
        sort_order: values.sort_order ?? 0,
        is_published: values.is_published ?? true,
        updated_at: new Date().toISOString(),
      };

      if (editingCase) {
        const { error } = await supabaseAdmin
          .from(TABLE)
          .update(payload)
          .eq('id', editingCase.id);
        if (error) throw error;
        message.success('案例已更新');
      } else {
        const { error } = await supabaseAdmin.from(TABLE).insert(payload);
        if (error) throw error;
        message.success('案例已新增');
      }

      triggerSiteRevalidate();
      closeModal();
      loadCases();
    } catch (err: any) {
      console.error('儲存失敗:', err);
      message.error(`儲存失敗：${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteCase = async (item: ServiceCase) => {
    try {
      // Try to remove the photo from Storage (best-effort)
      try {
        const url = new URL(item.photo_url);
        const idx = url.pathname.indexOf(`/${BUCKET}/`);
        if (idx >= 0) {
          const filePath = url.pathname.slice(idx + BUCKET.length + 2);
          await supabaseAdmin.storage.from(BUCKET).remove([filePath]);
        }
      } catch (e) {
        console.warn('刪除 Storage 檔案失敗（非本地檔，忽略）:', e);
      }

      const { error } = await supabaseAdmin.from(TABLE).delete().eq('id', item.id);
      if (error) throw error;
      message.success('案例已刪除');
      triggerSiteRevalidate();
      loadCases();
    } catch (err: any) {
      console.error('刪除失敗:', err);
      message.error(`刪除失敗：${err.message || err}`);
    }
  };

  const togglePublished = async (item: ServiceCase, checked: boolean) => {
    try {
      const { error } = await supabaseAdmin
        .from(TABLE)
        .update({ is_published: checked, updated_at: new Date().toISOString() })
        .eq('id', item.id);
      if (error) throw error;
      setCases((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, is_published: checked } : c))
      );
      triggerSiteRevalidate();
      message.success(checked ? '已上架' : '已下架');
    } catch (err: any) {
      message.error(`更新失敗：${err.message || err}`);
    }
  };

  const localeCount = (item: ServiceCase) => Object.keys(item.captions || {}).filter((k) => item.captions[k]?.trim()).length;

  const columns: ColumnsType<ServiceCase> = [
    {
      title: '照片',
      dataIndex: 'photo_url',
      width: 120,
      render: (url: string, record) => (
        <div
          style={{ width: 96, height: 72, borderRadius: 6, overflow: 'hidden', cursor: 'pointer', background: '#f5f5f5' }}
          onClick={() => {
            setPreviewSrc(url);
            setPreviewVisible(true);
          }}
        >
          {url ? (
            <img
              src={url}
              alt={record.alt_text || ''}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb' }}>
              <PictureOutlined style={{ fontSize: 24 }} />
            </div>
          )}
        </div>
      ),
    },
    {
      title: '主要文案（繁中）',
      dataIndex: 'captions',
      render: (captions: Record<string, string>) => (
        <Tooltip title={captions?.['zh-TW']}>
          <div style={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {captions?.['zh-TW'] || <Text type="secondary">（未填寫）</Text>}
          </div>
        </Tooltip>
      ),
    },
    {
      title: '翻譯',
      key: 'translation_coverage',
      width: 130,
      align: 'center',
      render: (_, record) => {
        const cnt = localeCount(record);
        const color = cnt === TOTAL_LOCALES ? 'green' : cnt >= TOTAL_LOCALES / 2 ? 'orange' : 'red';
        return (
          <Tooltip title={`已翻譯 ${cnt} / ${TOTAL_LOCALES} 語言`}>
            <Tag color={color} icon={<GlobalOutlined />}>
              {cnt}/{TOTAL_LOCALES}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      width: 80,
      align: 'center',
      sorter: (a, b) => a.sort_order - b.sort_order,
    },
    {
      title: '上架中',
      dataIndex: 'is_published',
      width: 90,
      align: 'center',
      render: (val: boolean, record) => (
        <Switch checked={val} onChange={(checked) => togglePublished(record, checked)} />
      ),
    },
    {
      title: '建立時間',
      dataIndex: 'created_at',
      width: 160,
      render: (val: string) => (val ? new Date(val).toLocaleString('zh-TW') : '-'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" icon={<EditOutlined />} onClick={() => openModal(record)}>
            編輯
          </Button>
          <Popconfirm
            title="確定刪除？"
            description="此案例及照片將永久刪除，無法復原。"
            okText="刪除"
            okType="danger"
            cancelText="取消"
            onConfirm={() => deleteCase(record)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              刪除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tabItems = SUPPORTED_LANGUAGES.map((lang) => ({
    key: lang.code,
    label: (
      <span>
        {lang.flag} {lang.name}{' '}
        {lang.code === 'zh-TW' && <Tag color="red">必填</Tag>}
      </span>
    ),
    forceRender: true,
    children: (
      <Form.Item
        name={['captions', lang.code]}
        label={`${lang.name}文案`}
        rules={lang.code === 'zh-TW' ? [{ required: true, message: '請填寫繁體中文文案' }] : []}
        extra={lang.code === 'zh-TW' ? '此為必填欄位，會顯示在官網作為主要文案；填完可按「自動翻譯」一次產生其他語言。' : ''}
      >
        <TextArea
          rows={3}
          maxLength={200}
          showCount
          placeholder={`例如：${lang.code === 'zh-TW' ? '日本旅客 4 人・桃園機場 → 九份十分一日遊' : ''}`}
        />
      </Form.Item>
    ),
  }));

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              <PictureOutlined /> 真實案例管理
            </Title>
            <Text type="secondary">管理官網「實際案例」區塊與 /cases 頁面的展示內容</Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadCases} loading={loading}>
              重新載入
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
              新增案例
            </Button>
          </Space>
        </div>

        <Alert
          message="隱私與版權保護"
          description="① 上傳前請確認：所有人臉（含背景路人）已完整馬賽克、車牌已遮蔽。② 系統會自動為每張照片燒上 RelayGo 浮水印並縮至 max 1600px，無法事後關閉。"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Table
          rowKey="id"
          columns={columns}
          dataSource={cases}
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <Modal
        title={editingCase ? '編輯案例' : '新增案例'}
        open={modalVisible}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={saving}
        okText="儲存"
        cancelText="取消"
        width={780}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={saveCase} preserve={false}>
          <Form.Item
            label="案例照片"
            required
            tooltip="上傳後系統會自動加上 RelayGo 浮水印並縮為最大 1600px。請上傳已馬賽克的照片。"
            extra="JPG / PNG / WebP / HEIC，原檔最大 20MB；上傳後會自動加浮水印並縮至 ≤1600px、轉為 JPEG。"
          >
            <Upload
              accept="image/*"
              maxCount={1}
              showUploadList={false}
              beforeUpload={(file) => {
                handleUpload(file);
                return false; // prevent default upload
              }}
            >
              <Button icon={uploading ? <LoadingOutlined /> : <UploadOutlined />} loading={uploading}>
                {photoUrl ? '更換照片' : '選擇照片上傳'}
              </Button>
            </Upload>
            {photoUrl && (
              <div style={{ marginTop: 12 }}>
                <img
                  src={photoUrl}
                  alt="preview"
                  style={{ maxWidth: 320, maxHeight: 220, borderRadius: 8, border: '1px solid #eee', display: 'block' }}
                />
                <Text type="secondary" copyable={{ text: photoUrl }} style={{ fontSize: 12, marginTop: 6, display: 'block', wordBreak: 'break-all' }}>
                  {photoUrl}
                </Text>
              </div>
            )}
          </Form.Item>

          <Form.Item label="多國語言文案">
            <div style={{ marginBottom: 8 }}>
              <Button
                icon={translating ? <LoadingOutlined /> : <TranslationOutlined />}
                loading={translating}
                onClick={handleAutoTranslate}
                size="small"
              >
                以繁中為基礎自動翻譯所有語言
              </Button>
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                只翻譯有填繁中時才生效，會覆蓋其他語言欄位
              </Text>
            </div>
            <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} type="card" size="small" />
          </Form.Item>

          <Form.Item
            name="alt_text"
            label="圖片替代文字（選填）"
            tooltip="無障礙與 SEO 用，未填則使用繁中文案"
          >
            <Input maxLength={120} placeholder="例：客戶於九份老街合影" />
          </Form.Item>

          <div style={{ display: 'flex', gap: 24 }}>
            <Form.Item name="sort_order" label="排序（數字越小越前面）" initialValue={10} style={{ flex: 1 }}>
              <InputNumber min={0} max={9999} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="is_published" label="是否上架" valuePropName="checked" initialValue={true} style={{ flex: 1 }}>
              <Switch checkedChildren="上架" unCheckedChildren="下架" />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal
        open={previewVisible}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width={720}
        centered
      >
        {previewSrc && (
          <img src={previewSrc} alt="preview" style={{ width: '100%', display: 'block' }} />
        )}
      </Modal>
    </div>
  );
}

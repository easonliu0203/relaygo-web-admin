'use client';

import { useState, useEffect, useMemo } from 'react';
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
  EnvironmentOutlined,
} from '@ant-design/icons';
import { createClient } from '@supabase/supabase-js';
import { FirebaseService } from '@/lib/firebase';

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

interface RegionDefinition {
  id: string;
  country: string;
  region_key: string;
  region_name_i18n: Record<string, string>;
  min_lat: number;
  max_lat: number;
  min_lng: number;
  max_lng: number;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AirportRegionDefinitionsPage() {
  const [loading, setLoading] = useState(false);
  const [dataList, setDataList] = useState<RegionDefinition[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RegionDefinition | null>(null);
  const [filterCountry, setFilterCountry] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('zh-TW');
  const [translating, setTranslating] = useState<Record<string, boolean>>({});
  const [form] = Form.useForm();

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
      const zhTWName = form.getFieldValue(['region_name_i18n', 'zh-TW']);

      if (!zhTWName) {
        message.warning('請先填寫繁體中文的地區名稱');
        return;
      }

      const existingName = form.getFieldValue(['region_name_i18n', targetLang]);
      if (existingName) {
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

      const translated = await translateField(zhTWName, targetLang);
      form.setFieldValue(['region_name_i18n', targetLang], translated);

      message.success({ content: '翻譯完成！', key: langKey });
    } catch (error: any) {
      message.error({ content: `翻譯失敗: ${error.message}`, key: langKey });
    } finally {
      setTranslating(prev => ({ ...prev, [langKey]: false }));
    }
  };

  const translateAll = async () => {
    const zhTWName = form.getFieldValue(['region_name_i18n', 'zh-TW']);
    if (!zhTWName) {
      message.warning('請先填寫繁體中文的地區名稱');
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
        const translated = await translateField(zhTWName, lang.code);
        form.setFieldValue(['region_name_i18n', lang.code], translated);
        successCount++;
      } catch (error) {
        console.error(`翻譯 ${lang.code} 失敗:`, error);
      } finally {
        setTranslating(prev => ({ ...prev, [`translate_${lang.code}`]: false }));
      }
    }

    message.success({ content: `翻譯完成！成功 ${successCount}/${targets.length} 種語言`, key: 'translate_all' });
  };

  // ── 翻譯狀態 ────────────────────────────────────────────────

  const getTranslationCompleteness = (record: RegionDefinition) => {
    const i18n = record.region_name_i18n || {};
    const completed = SUPPORTED_LANGUAGES.filter(l => !!i18n[l.code]).length;
    const total = SUPPORTED_LANGUAGES.length;
    return { completed, total, percentage: Math.round((completed / total) * 100) };
  };

  // ── 載入資料 ────────────────────────────────────────────────

  const loadData = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('region_definitions')
        .select('*')
        .order('priority', { ascending: false })
        .order('region_key');

      if (filterCountry) q = q.eq('country', filterCountry);
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

  useEffect(() => { loadData(); }, [filterCountry, filterStatus]);

  // ── 統計 ────────────────────────────────────────────────────

  const totalCount = dataList.length;
  const activeCount = dataList.filter(r => r.is_active).length;
  const countrySet = new Set(dataList.map(r => r.country));
  const countryList = Array.from(countrySet).sort();

  // ── 切換啟用 ────────────────────────────────────────────────

  const toggleActive = async (record: RegionDefinition) => {
    try {
      const { error } = await supabase
        .from('region_definitions')
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
        .from('region_definitions')
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
        .from('region_definitions')
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
        .from('region_definitions')
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

  const showModal = (record?: RegionDefinition) => {
    setActiveTab('zh-TW');

    if (record) {
      setEditingRecord(record);
      form.setFieldsValue({
        country: record.country,
        region_key: record.region_key,
        min_lat: record.min_lat,
        max_lat: record.max_lat,
        min_lng: record.min_lng,
        max_lng: record.max_lng,
        priority: record.priority,
        is_active: record.is_active,
      });

      SUPPORTED_LANGUAGES.forEach(lang => {
        form.setFieldValue(
          ['region_name_i18n', lang.code],
          record.region_name_i18n?.[lang.code] || ''
        );
      });
    } else {
      setEditingRecord(null);
      form.resetFields();
      form.setFieldsValue({ country: 'TW', priority: 1, is_active: true });
    }
    setIsModalVisible(true);
  };

  // ── 儲存 ────────────────────────────────────────────────────

  const handleSave = async (values: any) => {
    try {
      const region_name_i18n: Record<string, string> = {};
      SUPPORTED_LANGUAGES.forEach(lang => {
        const val = values.region_name_i18n?.[lang.code];
        if (val) region_name_i18n[lang.code] = val;
      });

      const payload = {
        country: values.country || 'TW',
        region_key: values.region_key,
        region_name_i18n,
        min_lat: values.min_lat,
        max_lat: values.max_lat,
        min_lng: values.min_lng,
        max_lng: values.max_lng,
        priority: values.priority ?? 0,
        is_active: values.is_active ?? true,
      };

      if (editingRecord) {
        const { error } = await supabase
          .from('region_definitions')
          .update(payload)
          .eq('id', editingRecord.id);
        if (error) throw error;
        message.success('更新成功');
      } else {
        const { error } = await supabase
          .from('region_definitions')
          .insert([payload]);
        if (error) throw error;
        message.success('新增成功');
      }

      setIsModalVisible(false);
      form.resetFields();
      loadData();
    } catch (e: any) {
      message.error(`儲存失敗: ${e.message}`);
    }
  };

  // ── 表格欄位 ────────────────────────────────────────────────

  const columns = [
    {
      title: '國家',
      dataIndex: 'country',
      key: 'country',
      width: 70,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: '地區 Key',
      dataIndex: 'region_key',
      key: 'region_key',
      width: 100,
      fixed: 'left' as const,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: '地區名稱 (zh-TW)',
      key: 'region_name',
      width: 130,
      render: (_: any, record: RegionDefinition) => (
        <Text>{record.region_name_i18n?.['zh-TW'] || record.region_key}</Text>
      ),
    },
    {
      title: '緯度範圍',
      key: 'lat_range',
      width: 180,
      render: (_: any, record: RegionDefinition) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {record.min_lat} ~ {record.max_lat}
        </Text>
      ),
    },
    {
      title: '經度範圍',
      key: 'lng_range',
      width: 180,
      render: (_: any, record: RegionDefinition) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {record.min_lng} ~ {record.max_lng}
        </Text>
      ),
    },
    {
      title: '優先度',
      dataIndex: 'priority',
      key: 'priority',
      width: 90,
      sorter: (a: RegionDefinition, b: RegionDefinition) => a.priority - b.priority,
      render: (v: number) => (
        <Tag color={v >= 10 ? 'red' : v >= 5 ? 'orange' : v >= 1 ? 'blue' : 'default'}>
          {v}
        </Tag>
      ),
    },
    {
      title: '翻譯',
      key: 'translation',
      width: 100,
      render: (_: any, record: RegionDefinition) => {
        const { completed, total, percentage } = getTranslationCompleteness(record);
        let bgColor = '#d9d9d9';
        if (percentage === 100) bgColor = '#52c41a';
        else if (percentage >= 50) bgColor = '#1890ff';
        else if (percentage > 0) bgColor = '#faad14';

        return (
          <Space>
            <Badge count={`${completed}/${total}`} style={{ backgroundColor: bgColor }} />
          </Space>
        );
      },
    },
    {
      title: '狀態',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (v: boolean, record: RegionDefinition) => (
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
      width: 130,
      fixed: 'right' as const,
      render: (_: any, record: RegionDefinition) => (
        <Space size="small">
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
          <EnvironmentOutlined className="mr-2" />
          機場接送地區識別
        </Title>
        <Text type="secondary">
          管理機場接送定價的地區定義，以座標 Bounding Box 判定地區，取代純文字比對
        </Text>
      </div>

      {/* 統計卡片 */}
      <Row gutter={16} className="mb-6">
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="總筆數" value={totalCount} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="啟用中" value={activeCount} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="已停用" value={totalCount - activeCount} valueStyle={{ color: '#ff4d4f' }} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="國家數" value={countrySet.size} valueStyle={{ color: '#1890ff' }} /></Card>
        </Col>
      </Row>

      {/* 主要列表 */}
      <Card
        title="地區定義列表"
        extra={
          <Space wrap>
            <Select
              allowClear
              placeholder="篩選國家"
              style={{ width: 140 }}
              onChange={(v: string) => setFilterCountry(v || null)}
            >
              {countryList.map(c => (
                <Option key={c} value={c}>{c}</Option>
              ))}
            </Select>
            <Select
              allowClear
              placeholder="篩選狀態"
              style={{ width: 140 }}
              onChange={(v: string) => setFilterStatus(v || null)}
            >
              <Option value="active">啟用中</Option>
              <Option value="inactive">已停用</Option>
            </Select>
            <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
              重新載入
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
              新增
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
          pagination={{ pageSize: 50, showSizeChanger: true, showTotal: t => `共 ${t} 筆` }}
          scroll={{ x: 1200 }}
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          size="small"
        />
      </Card>

      {/* 新增/編輯 Modal */}
      <Modal
        title={editingRecord ? '編輯地區定義' : '新增地區定義'}
        open={isModalVisible}
        onCancel={() => { setIsModalVisible(false); form.resetFields(); }}
        footer={null}
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          {/* 基本設定 */}
          <Card size="small" title="基本設定" className="mb-4">
            <Row gutter={12}>
              <Col span={8}>
                <Form.Item label="國家碼" name="country" rules={[{ required: true, message: '請輸入國家碼' }]}>
                  <Input placeholder="TW" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="地區 Key" name="region_key" rules={[{ required: true, message: '請輸入地區 Key' }]}>
                  <Input placeholder="例：台北" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="優先度" name="priority" rules={[{ required: true, message: '請輸入優先度' }]}>
                  <InputNumber min={0} style={{ width: '100%' }} placeholder="數字越大越優先" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item label="最小緯度 (min_lat)" name="min_lat" rules={[{ required: true, message: '必填' }]}>
                  <InputNumber step={0.001} style={{ width: '100%' }} placeholder="例：24.960000" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="最大緯度 (max_lat)" name="max_lat" rules={[{ required: true, message: '必填' }]}>
                  <InputNumber step={0.001} style={{ width: '100%' }} placeholder="例：25.210000" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item label="最小經度 (min_lng)" name="min_lng" rules={[{ required: true, message: '必填' }]}>
                  <InputNumber step={0.001} style={{ width: '100%' }} placeholder="例：121.430000" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="最大經度 (max_lng)" name="max_lng" rules={[{ required: true, message: '必填' }]}>
                  <InputNumber step={0.001} style={{ width: '100%' }} placeholder="例：121.670000" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="狀態" name="is_active" valuePropName="checked">
              <Switch checkedChildren="啟用" unCheckedChildren="停用" />
            </Form.Item>
          </Card>

          {/* 多語言內容 */}
          <Card size="small" title={<Space><GlobalOutlined />地區名稱 — 多語言</Space>} className="mb-4">
            <Alert
              message="提示"
              description="請至少填寫繁體中文名稱。其他語言可手動填寫或使用自動翻譯。"
              type="info"
              showIcon
              className="mb-4"
            />

            <div className="mb-3">
              <Button
                type="dashed"
                icon={<TranslationOutlined />}
                onClick={translateAll}
                loading={Object.values(translating).some(v => v)}
              >
                一鍵翻譯全部語言
              </Button>
            </div>

            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={SUPPORTED_LANGUAGES.map(lang => {
                const hasValue = editingRecord
                  ? !!(editingRecord.region_name_i18n?.[lang.code])
                  : false;

                return {
                  key: lang.code,
                  label: (
                    <Space>
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                      {hasValue && <Badge status="success" />}
                    </Space>
                  ),
                  children: (
                    <div className="py-2">
                      {lang.code !== 'zh-TW' && (
                        <div className="mb-3">
                          <Tooltip title="自動將繁體中文內容翻譯成此語言">
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
                        label={`地區名稱 (${lang.name})`}
                        name={['region_name_i18n', lang.code]}
                        rules={lang.code === 'zh-TW' ? [{ required: true, message: '請輸入繁體中文地區名稱' }] : []}
                      >
                        <Input
                          placeholder={`請輸入${lang.name}地區名稱`}
                          prefix={<EnvironmentOutlined />}
                        />
                      </Form.Item>
                    </div>
                  ),
                };
              })}
            />
          </Card>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={() => { setIsModalVisible(false); form.resetFields(); }}>取消</Button>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>儲存</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

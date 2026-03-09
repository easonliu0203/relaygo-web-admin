'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Typography,
  Space,
  message,
  InputNumber,
  Tag,
  Tooltip,
  Alert,
} from 'antd';
import {
  ReloadOutlined,
  SaveOutlined,
  GlobalOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { createClient } from '@supabase/supabase-js';

const { Title, Text } = Typography;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface CrossRegionRate {
  id: string;
  country: string;
  vehicle_type: string;
  rate_per_km: number;
  free_km: number;
  is_active: boolean;
  updated_at: string;
}

const VEHICLE_LABELS: Record<string, string> = {
  S:  'S — 小型轎車',
  M:  'M — 中型商務車',
  L:  'L — 大型廂型車',
  XL: 'XL — 豪華大型車',
};

const COUNTRY_LABELS: Record<string, string> = {
  TW: '🇹🇼 台灣',
  JP: '🇯🇵 日本',
  KR: '🇰🇷 韓國',
};

export default function CrossRegionRatesPage() {
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState<Record<string, boolean>>({});
  const [rates, setRates]       = useState<CrossRegionRate[]>([]);
  // 暫存編輯值 { [id]: { rate_per_km, free_km } }
  const [edits, setEdits]       = useState<Record<string, Partial<CrossRegionRate>>>({});

  const loadRates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cross_region_km_rates')
        .select('*')
        .order('country')
        .order('vehicle_type');

      if (error) throw error;
      setRates(data || []);
      setEdits({});
    } catch (err: any) {
      message.error(`載入失敗: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const saveRate = async (id: string) => {
    const patch = edits[id];
    if (!patch || Object.keys(patch).length === 0) return;

    setSaving(prev => ({ ...prev, [id]: true }));
    try {
      const { error } = await supabase
        .from('cross_region_km_rates')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      message.success('已儲存');
      setEdits(prev => { const n = { ...prev }; delete n[id]; return n; });
      loadRates();
    } catch (err: any) {
      message.error(`儲存失敗: ${err.message}`);
    } finally {
      setSaving(prev => ({ ...prev, [id]: false }));
    }
  };

  const setEdit = (id: string, field: keyof CrossRegionRate, value: number) => {
    setEdits(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value },
    }));
  };

  useEffect(() => { loadRates(); }, []);

  const columns = [
    {
      title: '國家',
      dataIndex: 'country',
      key: 'country',
      width: 100,
      render: (c: string) => COUNTRY_LABELS[c] || c,
    },
    {
      title: '車型',
      dataIndex: 'vehicle_type',
      key: 'vehicle_type',
      width: 180,
      render: (v: string) => (
        <Tag color="purple">{VEHICLE_LABELS[v] || v}</Tag>
      ),
    },
    {
      title: (
        <Space>
          跨區費率（元/公里）
          <Tooltip title="上車地→目的城市 + 目的城市→下車地，全程計費">
            <InfoCircleOutlined style={{ color: '#1890ff' }} />
          </Tooltip>
        </Space>
      ),
      dataIndex: 'rate_per_km',
      key: 'rate_per_km',
      width: 200,
      render: (val: number, record: CrossRegionRate) => (
        <InputNumber
          min={0}
          value={edits[record.id]?.rate_per_km ?? val}
          onChange={v => v !== null && setEdit(record.id, 'rate_per_km', v)}
          addonAfter="元/公里"
          style={{ width: 160 }}
        />
      ),
    },
    {
      title: (
        <Space>
          免費門檻（公里）
          <Tooltip title="上車→城市+城市→下車的總距離低於此值時，不收跨區費">
            <InfoCircleOutlined style={{ color: '#1890ff' }} />
          </Tooltip>
        </Space>
      ),
      dataIndex: 'free_km',
      key: 'free_km',
      width: 200,
      render: (val: number, record: CrossRegionRate) => (
        <InputNumber
          min={0}
          value={edits[record.id]?.free_km ?? val}
          onChange={v => v !== null && setEdit(record.id, 'free_km', v)}
          addonAfter="公里"
          style={{ width: 140 }}
        />
      ),
    },
    {
      title: '狀態',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (active: boolean) => (
        <Tag color={active ? 'success' : 'default'}>{active ? '啟用' : '停用'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: CrossRegionRate) => {
        const isDirty = !!edits[record.id] && Object.keys(edits[record.id]).length > 0;
        return (
          <Button
            type="primary"
            size="small"
            icon={<SaveOutlined />}
            disabled={!isDirty}
            loading={saving[record.id]}
            onClick={() => saveRate(record.id)}
          >
            儲存
          </Button>
        );
      },
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={2}>
          <GlobalOutlined className="mr-2" />
          跨區費率設定
        </Title>
        <Text type="secondary">
          設定包車旅遊的跨區接送費率（依車型 × 國家）
        </Text>
      </div>

      <Alert
        className="mb-4"
        type="info"
        showIcon
        message="計費說明"
        description={
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>距離 = 上車地 → 目的城市中心 + 目的城市中心 → 下車地（全程計費）</li>
            <li>跨區費 = 總距離（公里）× 費率（元/公里）</li>
            <li>若總距離 &lt; 免費門檻，則免收跨區費</li>
            <li>城市中心座標目前為後端靜態維護；如需新增城市請聯繫開發人員</li>
          </ul>
        }
      />

      <Card
        title={`跨區費率 (共 ${rates.length} 筆)`}
        extra={
          <Button icon={<ReloadOutlined />} onClick={loadRates} loading={loading}>
            重新載入
          </Button>
        }
      >
        <Table
          dataSource={rates}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          rowClassName={(record) =>
            edits[record.id] && Object.keys(edits[record.id]).length > 0
              ? 'bg-yellow-50'
              : ''
          }
        />
      </Card>
    </div>
  );
}
